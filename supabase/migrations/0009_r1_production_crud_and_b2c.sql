-- ============================================================================
-- CF_19 PRODUCTION REBUILD MIGRATION (R1)
-- Migration: 0009_r1_production_crud_and_b2c.sql
-- Scope:
--   1. Create persistent public.barista_low_stock_alerts table + RLS + index
--   2. Enable B2C Retail Coffee Sales at Central Warehouse on public.b2b_orders
--   3. Fix gram/kg unit conversion in rpc_m2_ingest_warehouse_lot
-- ============================================================================

-- 1. Persistent Barista Low-Stock Alerts table
CREATE TABLE IF NOT EXISTS public.barista_low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  reported_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'OUT_OF_STOCK')),
  note TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barista_alerts_store_created
  ON public.barista_low_stock_alerts (store_id, resolved, created_at DESC);

DROP TRIGGER IF EXISTS trg_barista_alerts_updated_at ON public.barista_low_stock_alerts;
CREATE TRIGGER trg_barista_alerts_updated_at
  BEFORE UPDATE ON public.barista_low_stock_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.barista_low_stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barista_alerts_select_policy ON public.barista_low_stock_alerts;
CREATE POLICY barista_alerts_select_policy ON public.barista_low_stock_alerts
  FOR SELECT
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')
      AND store_id = public.current_user_store_id()
    )
  );

DROP POLICY IF EXISTS barista_alerts_insert_policy ON public.barista_low_stock_alerts;
CREATE POLICY barista_alerts_insert_policy ON public.barista_low_stock_alerts
  FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() IN ('STORE_MANAGER', 'BARISTA_KDS')
      AND store_id = public.current_user_store_id()
    )
  );

DROP POLICY IF EXISTS barista_alerts_update_policy ON public.barista_low_stock_alerts;
CREATE POLICY barista_alerts_update_policy ON public.barista_low_stock_alerts
  FOR UPDATE
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'STORE_MANAGER'
      AND store_id = public.current_user_store_id()
    )
  );

-- 2. Enable B2C Retail Coffee Sales at Central Warehouse on public.b2b_orders
ALTER TABLE public.b2b_orders
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.b2b_orders
  ADD COLUMN IF NOT EXISTS sale_channel TEXT NOT NULL DEFAULT 'B2B_WHOLESALE',
  ADD COLUMN IF NOT EXISTS retail_customer_name TEXT,
  ADD COLUMN IF NOT EXISTS retail_customer_phone TEXT;

ALTER TABLE public.b2b_orders
  DROP CONSTRAINT IF EXISTS chk_b2b_orders_sale_channel;

ALTER TABLE public.b2b_orders
  ADD CONSTRAINT chk_b2b_orders_sale_channel CHECK (
    (sale_channel = 'B2B_WHOLESALE' AND customer_id IS NOT NULL)
    OR (sale_channel = 'B2C_RETAIL' AND paid_amount_vnd = total_amount_vnd)
  );

-- 3. Fix gram -> kg billing unit conversion when amortizing shipping cost in M2 RPC
CREATE OR REPLACE FUNCTION public.rpc_m2_ingest_warehouse_lot(
  p_warehouse_store_id UUID,
  p_item_id UUID,
  p_lot_code TEXT,
  p_initial_qty NUMERIC,
  p_unit_cost_vnd BIGINT,
  p_shipping_cost_vnd BIGINT DEFAULT 0,
  p_supplier_name TEXT DEFAULT NULL,
  p_moisture_pct NUMERIC DEFAULT NULL,
  p_roast_date DATE DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_item RECORD;
  v_prev_qty NUMERIC(12,2);
  v_prev_mac BIGINT;
  v_billing_qty NUMERIC;
  v_effective_unit_cost BIGINT;
  v_new_mac BIGINT;
  v_lot public.warehouse_lots%ROWTYPE;
BEGIN
  v_actor_id := public._m2_assert_warehouse_actor(p_warehouse_store_id);

  IF p_initial_qty IS NULL OR p_initial_qty <= 0 THEN
    RAISE EXCEPTION 'INVALID_QTY: initial_qty must be strictly positive';
  END IF;
  IF p_unit_cost_vnd IS NULL OR p_unit_cost_vnd < 0 THEN
    RAISE EXCEPTION 'INVALID_UNIT_COST: unit_cost_vnd must be non-negative';
  END IF;
  IF p_shipping_cost_vnd IS NULL OR p_shipping_cost_vnd < 0 THEN
    RAISE EXCEPTION 'INVALID_SHIPPING_COST: shipping_cost_vnd must be non-negative';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_ITEM_NOT_FOUND: item % not found or inactive', p_item_id;
  END IF;

  SELECT COALESCE(SUM(remaining_qty), 0)::NUMERIC(12,2)
  INTO v_prev_qty
  FROM public.warehouse_lots
  WHERE store_id = p_warehouse_store_id
    AND item_id = p_item_id
    AND status = 'AVAILABLE'
    AND remaining_qty > 0;

  v_prev_mac := v_item.moving_avg_cost_vnd;
  v_billing_qty := CASE WHEN v_item.base_unit = 'g' THEN p_initial_qty / 1000.0 ELSE p_initial_qty END;
  v_effective_unit_cost := p_unit_cost_vnd + ROUND(p_shipping_cost_vnd::NUMERIC / v_billing_qty)::BIGINT;

  IF (v_prev_qty + p_initial_qty) > 0 THEN
    v_new_mac := ROUND(
      (v_prev_qty * v_prev_mac + p_initial_qty * v_effective_unit_cost)
      / (v_prev_qty + p_initial_qty)
    )::BIGINT;
  ELSE
    v_new_mac := v_effective_unit_cost;
  END IF;

  INSERT INTO public.warehouse_lots (
    store_id, item_id, lot_code, supplier_name, moisture_pct,
    roast_date, expiry_date, initial_qty, remaining_qty,
    unit_cost_vnd, shipping_cost_vnd, status
  )
  VALUES (
    p_warehouse_store_id, p_item_id, UPPER(TRIM(p_lot_code)), p_supplier_name, p_moisture_pct,
    p_roast_date, p_expiry_date, p_initial_qty, p_initial_qty,
    v_effective_unit_cost, p_shipping_cost_vnd, 'AVAILABLE'
  )
  RETURNING * INTO v_lot;

  UPDATE public.inventory_items
  SET moving_avg_cost_vnd = v_new_mac
  WHERE id = p_item_id;

  INSERT INTO public.audit_logs (
    actor_id, store_id, action, target_table, target_id, reason, payload_json
  )
  VALUES (
    v_actor_id, p_warehouse_store_id, 'WAREHOUSE_LOT_INGESTED', 'warehouse_lots', v_lot.id,
    'Ingested Central Warehouse lot and recalculated MAC',
    jsonb_build_object(
      'lot_code', v_lot.lot_code,
      'item_id', p_item_id,
      'initial_qty', p_initial_qty,
      'previous_mac_vnd', v_prev_mac,
      'effective_unit_cost_vnd', v_effective_unit_cost,
      'new_mac_vnd', v_new_mac
    )
  );

  RETURN jsonb_build_object(
    'lot', to_jsonb(v_lot),
    'item_id', p_item_id,
    'previous_qty', v_prev_qty,
    'previous_mac_vnd', v_prev_mac,
    'effective_unit_cost_vnd', v_effective_unit_cost,
    'new_mac_vnd', v_new_mac
  );
END;
$$;
