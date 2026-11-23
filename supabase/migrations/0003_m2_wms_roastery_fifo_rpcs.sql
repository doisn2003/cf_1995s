-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0003_m2_wms_roastery_fifo_rpcs.sql
-- Scope: M2.1 WMS Core Engine, Roastery Batch/Lot Lifecycle & Multi-Lot FIFO
--        Atomic PL/pgSQL RPCs with Strict RBAC Guard & Immutable Audit Trail.
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INTERNAL RBAC GUARD FOR CENTRAL WAREHOUSE OPERATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public._m2_assert_warehouse_actor(
  p_actor_id UUID,
  p_warehouse_store_id UUID DEFAULT NULL
)
RETURNS public.user_role_enum
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role_enum;
  v_assigned_store_id UUID;
  v_store_type public.store_type_enum;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: actor_id is required for WMS operations';
  END IF;

  SELECT up.role, up.assigned_store_id
    INTO v_role, v_assigned_store_id
  FROM public.user_profiles up
  WHERE up.id = p_actor_id
    AND up.is_active = TRUE;

  IF v_role IS NULL OR v_role NOT IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER') THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Actor % (role=%) is not authorized for Central Warehouse WMS operations',
      p_actor_id, COALESCE(v_role::TEXT, 'UNKNOWN');
  END IF;

  IF p_warehouse_store_id IS NOT NULL THEN
    SELECT s.type
      INTO v_store_type
    FROM public.stores s
    WHERE s.id = p_warehouse_store_id
      AND s.is_active = TRUE;

    IF v_store_type IS NULL OR v_store_type <> 'CENTRAL_WAREHOUSE' THEN
      RAISE EXCEPTION 'DOMAIN_VIOLATION: Store % is not an active CENTRAL_WAREHOUSE', p_warehouse_store_id;
    END IF;

    IF v_role = 'WAREHOUSE_MANAGER' AND v_assigned_store_id <> p_warehouse_store_id THEN
      RAISE EXCEPTION 'SECURITY_VIOLATION: WAREHOUSE_MANAGER % is not assigned to warehouse %',
        p_actor_id, p_warehouse_store_id;
    END IF;
  END IF;

  RETURN v_role;
END;
$$;

-- ============================================================================
-- SECTION 2: RPC 1 - ATOMIC WAREHOUSE LOT INGESTION & MAC RECALCULATION
-- Formula:
--   effective_unit_cost_vnd = unit_cost_vnd + ROUND(shipping_cost_vnd / initial_qty)
--   new_mac_vnd = ROUND((Q_old * C_old + Q_new * effective_unit_cost_vnd) / (Q_old + Q_new))
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m2_ingest_warehouse_lot(
  p_actor_id UUID,
  p_warehouse_store_id UUID,
  p_item_id UUID,
  p_lot_code TEXT,
  p_initial_qty NUMERIC(12,2),
  p_unit_cost_vnd BIGINT,
  p_shipping_cost_vnd BIGINT DEFAULT 0,
  p_supplier_name TEXT DEFAULT NULL,
  p_moisture_pct NUMERIC(5,2) DEFAULT NULL,
  p_roast_date DATE DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_received_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_item RECORD;
  v_old_qty NUMERIC(12,2);
  v_old_mac_vnd BIGINT;
  v_effective_unit_cost_vnd BIGINT;
  v_new_mac_vnd BIGINT;
  v_new_lot public.warehouse_lots%ROWTYPE;
BEGIN
  v_actor_role := public._m2_assert_warehouse_actor(p_actor_id, p_warehouse_store_id);

  IF p_initial_qty IS NULL OR p_initial_qty <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: initial_qty must be strictly positive';
  END IF;

  IF p_unit_cost_vnd IS NULL OR p_unit_cost_vnd < 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: unit_cost_vnd must be a non-negative integer';
  END IF;

  IF p_shipping_cost_vnd IS NULL OR p_shipping_cost_vnd < 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: shipping_cost_vnd must be a non-negative integer';
  END IF;

  IF p_expiry_date IS NOT NULL AND p_roast_date IS NOT NULL AND p_expiry_date < p_roast_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: expiry_date (%) cannot precede roast_date (%)', p_expiry_date, p_roast_date;
  END IF;

  -- Lock inventory_items row to serialize concurrent MAC updates for this SKU
  SELECT id, sku, name, moving_avg_cost_vnd
    INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Active inventory item % does not exist', p_item_id;
  END IF;

  v_old_mac_vnd := v_item.moving_avg_cost_vnd;

  SELECT COALESCE(SUM(wl.remaining_qty), 0)
    INTO v_old_qty
  FROM public.warehouse_lots wl
  WHERE wl.store_id = p_warehouse_store_id
    AND wl.item_id = p_item_id
    AND wl.status = 'AVAILABLE'
    AND wl.remaining_qty > 0;

  v_effective_unit_cost_vnd :=
    p_unit_cost_vnd + ROUND(p_shipping_cost_vnd::NUMERIC / p_initial_qty)::BIGINT;

  IF (v_old_qty + p_initial_qty) <= 0 THEN
    v_new_mac_vnd := v_effective_unit_cost_vnd;
  ELSE
    v_new_mac_vnd := ROUND(
      ((v_old_qty * v_old_mac_vnd::NUMERIC) + (p_initial_qty * v_effective_unit_cost_vnd::NUMERIC))
      / (v_old_qty + p_initial_qty)
    )::BIGINT;
  END IF;

  INSERT INTO public.warehouse_lots (
    store_id,
    item_id,
    lot_code,
    supplier_name,
    moisture_pct,
    roast_date,
    received_at,
    expiry_date,
    initial_qty,
    remaining_qty,
    unit_cost_vnd,
    shipping_cost_vnd,
    status
  )
  VALUES (
    p_warehouse_store_id,
    p_item_id,
    TRIM(p_lot_code),
    p_supplier_name,
    p_moisture_pct,
    p_roast_date,
    COALESCE(p_received_at, NOW()),
    p_expiry_date,
    p_initial_qty,
    p_initial_qty,
    v_effective_unit_cost_vnd,
    p_shipping_cost_vnd,
    'AVAILABLE'
  )
  RETURNING * INTO v_new_lot;

  UPDATE public.inventory_items
  SET moving_avg_cost_vnd = v_new_mac_vnd
  WHERE id = p_item_id;

  INSERT INTO public.audit_logs (
    actor_id,
    store_id,
    action,
    target_table,
    target_id,
    reason,
    payload_json
  )
  VALUES (
    p_actor_id,
    p_warehouse_store_id,
    'M2_WAREHOUSE_LOT_INGESTED',
    'warehouse_lots',
    v_new_lot.id,
    'Central Warehouse lot ingestion with MAC recalculation',
    jsonb_build_object(
      'actor_role', v_actor_role,
      'sku', v_item.sku,
      'lot_code', v_new_lot.lot_code,
      'initial_qty', p_initial_qty,
      'raw_unit_cost_vnd', p_unit_cost_vnd,
      'shipping_cost_vnd', p_shipping_cost_vnd,
      'effective_unit_cost_vnd', v_effective_unit_cost_vnd,
      'previous_qty', v_old_qty,
      'previous_mac_vnd', v_old_mac_vnd,
      'new_mac_vnd', v_new_mac_vnd
    )
  );

  RETURN jsonb_build_object(
    'lot', to_jsonb(v_new_lot),
    'item_id', p_item_id,
    'previous_qty', v_old_qty,
    'previous_mac_vnd', v_old_mac_vnd,
    'effective_unit_cost_vnd', v_effective_unit_cost_vnd,
    'new_mac_vnd', v_new_mac_vnd
  );
END;
$$;

-- ============================================================================
-- SECTION 3: RPC 2 - ATOMIC ROAST BATCH COMPLETION (FIFO + YIELD LOSS + COST TRANSFER)
-- Formulas:
--   weight_loss_pct = ROUND(((green_input - roasted_output) / green_input) * 100, 2)
--   is_abnormal_yield_loss = (weight_loss_pct < 12.00 OR weight_loss_pct > 20.00)
--   output_unit_cost_vnd = ROUND((green_input * source_green_lot.unit_cost_vnd) / roasted_output)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m2_complete_roast_batch(
  p_actor_id UUID,
  p_warehouse_store_id UUID,
  p_batch_code TEXT,
  p_source_green_lot_id UUID,
  p_output_item_id UUID,
  p_output_lot_code TEXT,
  p_green_input_weight_g NUMERIC(12,2),
  p_roasted_output_weight_g NUMERIC(12,2),
  p_roast_date DATE DEFAULT CURRENT_DATE,
  p_expiry_date DATE DEFAULT NULL,
  p_roast_profile TEXT DEFAULT NULL,
  p_moisture_pct NUMERIC(5,2) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_enforce_fifo BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_source_lot public.warehouse_lots%ROWTYPE;
  v_source_item RECORD;
  v_output_item RECORD;
  v_older_lot_code TEXT;
  v_weight_loss_pct NUMERIC(5,2);
  v_is_abnormal_loss BOOLEAN;
  v_output_unit_cost_vnd BIGINT;
  v_source_remaining_after NUMERIC(12,2);
  v_source_status_after public.lot_status_enum;
  v_old_output_qty NUMERIC(12,2);
  v_new_output_mac_vnd BIGINT;
  v_effective_roast_date DATE;
  v_effective_expiry_date DATE;
  v_output_lot public.warehouse_lots%ROWTYPE;
  v_batch public.roast_batches%ROWTYPE;
BEGIN
  v_actor_role := public._m2_assert_warehouse_actor(p_actor_id, p_warehouse_store_id);

  IF p_green_input_weight_g IS NULL OR p_green_input_weight_g <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: green_input_weight_g must be strictly positive';
  END IF;

  IF p_roasted_output_weight_g IS NULL
     OR p_roasted_output_weight_g <= 0
     OR p_roasted_output_weight_g > p_green_input_weight_g THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: roasted_output_weight_g (%) must satisfy 0 < output <= green_input (%)',
      p_roasted_output_weight_g, p_green_input_weight_g;
  END IF;

  v_effective_roast_date := COALESCE(p_roast_date, CURRENT_DATE);
  v_effective_expiry_date := COALESCE(p_expiry_date, (v_effective_roast_date + INTERVAL '90 days')::DATE);

  IF v_effective_expiry_date < v_effective_roast_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: expiry_date (%) cannot precede roast_date (%)',
      v_effective_expiry_date, v_effective_roast_date;
  END IF;

  -- Lock source green lot FOR UPDATE
  SELECT *
    INTO v_source_lot
  FROM public.warehouse_lots wl
  WHERE wl.id = p_source_green_lot_id
    AND wl.store_id = p_warehouse_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Source green lot % not found in warehouse %',
      p_source_green_lot_id, p_warehouse_store_id;
  END IF;

  IF v_source_lot.status <> 'AVAILABLE' OR v_source_lot.remaining_qty < p_green_input_weight_g THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Source green lot % has status=% and remaining_qty=%, requested=%',
      v_source_lot.lot_code, v_source_lot.status, v_source_lot.remaining_qty, p_green_input_weight_g;
  END IF;

  SELECT id, sku, category
    INTO v_source_item
  FROM public.inventory_items
  WHERE id = v_source_lot.item_id
  FOR UPDATE;

  IF v_source_item.category <> 'GREEN_BEAN' THEN
    RAISE EXCEPTION 'DOMAIN_VIOLATION: Source lot % must belong to a GREEN_BEAN item (got %)',
      v_source_lot.lot_code, v_source_item.category;
  END IF;

  SELECT id, sku, category, moving_avg_cost_vnd
    INTO v_output_item
  FROM public.inventory_items
  WHERE id = p_output_item_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND OR v_output_item.category <> 'ROASTED_COFFEE' THEN
    RAISE EXCEPTION 'DOMAIN_VIOLATION: Output item % must be an active ROASTED_COFFEE item', p_output_item_id;
  END IF;

  -- Strict FIFO guard: reject roasting a newer green-bean lot while an older lot has stock
  IF COALESCE(p_enforce_fifo, TRUE) THEN
    SELECT wl.lot_code
      INTO v_older_lot_code
    FROM public.warehouse_lots wl
    WHERE wl.store_id = p_warehouse_store_id
      AND wl.item_id = v_source_lot.item_id
      AND wl.status = 'AVAILABLE'
      AND wl.remaining_qty > 0
      AND wl.id <> v_source_lot.id
      AND (
        COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::DATE),
        wl.received_at,
        wl.lot_code,
        wl.id
      ) < (
        COALESCE(v_source_lot.roast_date, (v_source_lot.received_at AT TIME ZONE 'UTC')::DATE),
        v_source_lot.received_at,
        v_source_lot.lot_code,
        v_source_lot.id
      )
    ORDER BY
      COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::DATE) ASC,
      wl.received_at ASC,
      wl.lot_code ASC,
      wl.id ASC
    LIMIT 1;

    IF v_older_lot_code IS NOT NULL THEN
      RAISE EXCEPTION 'FIFO_VIOLATION: Older green bean lot % must be consumed before lot %',
        v_older_lot_code, v_source_lot.lot_code;
    END IF;
  END IF;

  -- Compute yield loss % and cost transfer
  v_weight_loss_pct := ROUND(
    ((p_green_input_weight_g - p_roasted_output_weight_g) / p_green_input_weight_g) * 100.0,
    2
  );
  v_is_abnormal_loss := (v_weight_loss_pct < 12.00 OR v_weight_loss_pct > 20.00);
  v_output_unit_cost_vnd := ROUND(
    (p_green_input_weight_g * v_source_lot.unit_cost_vnd::NUMERIC) / p_roasted_output_weight_g
  )::BIGINT;

  -- Deduct green bean lot
  v_source_remaining_after := v_source_lot.remaining_qty - p_green_input_weight_g;
  v_source_status_after := CASE
    WHEN v_source_remaining_after = 0 THEN 'DEPLETED'::public.lot_status_enum
    ELSE 'AVAILABLE'::public.lot_status_enum
  END;

  UPDATE public.warehouse_lots
  SET remaining_qty = v_source_remaining_after,
      status = v_source_status_after
  WHERE id = v_source_lot.id;

  -- Calculate new MAC for roasted coffee output item before inserting output lot
  SELECT COALESCE(SUM(wl.remaining_qty), 0)
    INTO v_old_output_qty
  FROM public.warehouse_lots wl
  WHERE wl.store_id = p_warehouse_store_id
    AND wl.item_id = p_output_item_id
    AND wl.status = 'AVAILABLE'
    AND wl.remaining_qty > 0;

  IF (v_old_output_qty + p_roasted_output_weight_g) <= 0 THEN
    v_new_output_mac_vnd := v_output_unit_cost_vnd;
  ELSE
    v_new_output_mac_vnd := ROUND(
      ((v_old_output_qty * v_output_item.moving_avg_cost_vnd::NUMERIC)
        + (p_roasted_output_weight_g * v_output_unit_cost_vnd::NUMERIC))
      / (v_old_output_qty + p_roasted_output_weight_g)
    )::BIGINT;
  END IF;

  INSERT INTO public.warehouse_lots (
    store_id,
    item_id,
    lot_code,
    supplier_name,
    moisture_pct,
    roast_date,
    received_at,
    expiry_date,
    initial_qty,
    remaining_qty,
    unit_cost_vnd,
    shipping_cost_vnd,
    status
  )
  VALUES (
    p_warehouse_store_id,
    p_output_item_id,
    TRIM(p_output_lot_code),
    'Xưởng Rang Nội Bộ CF19',
    p_moisture_pct,
    v_effective_roast_date,
    NOW(),
    v_effective_expiry_date,
    p_roasted_output_weight_g,
    p_roasted_output_weight_g,
    v_output_unit_cost_vnd,
    0,
    'AVAILABLE'
  )
  RETURNING * INTO v_output_lot;

  UPDATE public.inventory_items
  SET moving_avg_cost_vnd = v_new_output_mac_vnd
  WHERE id = p_output_item_id;

  INSERT INTO public.roast_batches (
    warehouse_store_id,
    batch_code,
    source_green_lot_id,
    output_lot_id,
    green_input_weight_g,
    roasted_output_weight_g,
    weight_loss_pct,
    roast_profile,
    roasted_by,
    roasted_at,
    notes
  )
  VALUES (
    p_warehouse_store_id,
    TRIM(p_batch_code),
    v_source_lot.id,
    v_output_lot.id,
    p_green_input_weight_g,
    p_roasted_output_weight_g,
    v_weight_loss_pct,
    p_roast_profile,
    p_actor_id,
    NOW(),
    p_notes
  )
  RETURNING * INTO v_batch;

  INSERT INTO public.audit_logs (
    actor_id,
    store_id,
    action,
    target_table,
    target_id,
    reason,
    payload_json
  )
  VALUES (
    p_actor_id,
    p_warehouse_store_id,
    CASE WHEN v_is_abnormal_loss THEN 'M2_ROAST_BATCH_ABNORMAL_LOSS' ELSE 'M2_ROAST_BATCH_COMPLETED' END,
    'roast_batches',
    v_batch.id,
    COALESCE(p_notes, 'Roast batch completion with FIFO lock & cost transfer'),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'batch_code', v_batch.batch_code,
      'source_green_lot_code', v_source_lot.lot_code,
      'output_lot_code', v_output_lot.lot_code,
      'green_input_weight_g', p_green_input_weight_g,
      'roasted_output_weight_g', p_roasted_output_weight_g,
      'weight_loss_pct', v_weight_loss_pct,
      'is_abnormal_yield_loss', v_is_abnormal_loss,
      'output_unit_cost_vnd', v_output_unit_cost_vnd,
      'new_output_item_mac_vnd', v_new_output_mac_vnd
    )
  );

  RETURN jsonb_build_object(
    'roast_batch', to_jsonb(v_batch),
    'output_lot', to_jsonb(v_output_lot),
    'source_lot_id', v_source_lot.id,
    'source_lot_remaining_qty', v_source_remaining_after,
    'source_lot_status', v_source_status_after,
    'weight_loss_pct', v_weight_loss_pct,
    'is_abnormal_yield_loss', v_is_abnormal_loss,
    'output_unit_cost_vnd', v_output_unit_cost_vnd,
    'new_output_item_mac_vnd', v_new_output_mac_vnd
  );
END;
$$;

-- ============================================================================
-- SECTION 4: RPC 3 - ATOMIC MULTI-LOT FIFO STOCK ALLOCATION
-- Priority Order:
--   1. COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::DATE) ASC
--   2. received_at ASC
--   3. lot_code ASC, id ASC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m2_allocate_fifo_stock(
  p_actor_id UUID,
  p_warehouse_store_id UUID,
  p_item_id UUID,
  p_requested_qty NUMERIC(12,2),
  p_reference_code TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'Multi-lot FIFO stock allocation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_lot RECORD;
  v_remaining_to_allocate NUMERIC(12,2);
  v_take_qty NUMERIC(12,2);
  v_lot_after_qty NUMERIC(12,2);
  v_lot_after_status public.lot_status_enum;
  v_slice_cogs_vnd BIGINT;
  v_total_cogs_vnd BIGINT := 0;
  v_weighted_unit_cost_vnd BIGINT;
  v_allocations JSONB := '[]'::jsonb;
BEGIN
  v_actor_role := public._m2_assert_warehouse_actor(p_actor_id, p_warehouse_store_id);

  IF p_requested_qty IS NULL OR p_requested_qty <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: requested_qty must be strictly positive';
  END IF;

  -- Lock parent inventory item row to serialize allocations for this SKU
  PERFORM 1
  FROM public.inventory_items
  WHERE id = p_item_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Active inventory item % does not exist', p_item_id;
  END IF;

  v_remaining_to_allocate := p_requested_qty;

  FOR v_lot IN
    SELECT wl.*
    FROM public.warehouse_lots wl
    WHERE wl.store_id = p_warehouse_store_id
      AND wl.item_id = p_item_id
      AND wl.status = 'AVAILABLE'
      AND wl.remaining_qty > 0
    ORDER BY
      COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::DATE) ASC,
      wl.received_at ASC,
      wl.lot_code ASC,
      wl.id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_allocate <= 0;

    v_take_qty := LEAST(v_lot.remaining_qty, v_remaining_to_allocate);
    v_lot_after_qty := v_lot.remaining_qty - v_take_qty;
    v_lot_after_status := CASE
      WHEN v_lot_after_qty = 0 THEN 'DEPLETED'::public.lot_status_enum
      ELSE 'AVAILABLE'::public.lot_status_enum
    END;

    UPDATE public.warehouse_lots
    SET remaining_qty = v_lot_after_qty,
        status = v_lot_after_status
    WHERE id = v_lot.id;

    v_slice_cogs_vnd := ROUND(v_take_qty * v_lot.unit_cost_vnd::NUMERIC)::BIGINT;
    v_total_cogs_vnd := v_total_cogs_vnd + v_slice_cogs_vnd;

    v_allocations := v_allocations || jsonb_build_array(
      jsonb_build_object(
        'lot_id', v_lot.id,
        'lot_code', v_lot.lot_code,
        'roast_date', v_lot.roast_date,
        'received_at', v_lot.received_at,
        'allocated_qty', v_take_qty,
        'remaining_after_qty', v_lot_after_qty,
        'lot_status_after', v_lot_after_status,
        'unit_cost_vnd', v_lot.unit_cost_vnd,
        'slice_cogs_vnd', v_slice_cogs_vnd
      )
    );

    v_remaining_to_allocate := v_remaining_to_allocate - v_take_qty;
  END LOOP;

  IF v_remaining_to_allocate > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Requested %, shortage % for item % in warehouse %',
      p_requested_qty, v_remaining_to_allocate, p_item_id, p_warehouse_store_id;
  END IF;

  v_weighted_unit_cost_vnd := ROUND(v_total_cogs_vnd::NUMERIC / p_requested_qty)::BIGINT;

  INSERT INTO public.audit_logs (
    actor_id,
    store_id,
    action,
    target_table,
    target_id,
    reason,
    payload_json
  )
  VALUES (
    p_actor_id,
    p_warehouse_store_id,
    'M2_FIFO_STOCK_ALLOCATED',
    'warehouse_lots',
    p_item_id,
    COALESCE(p_reason, 'Multi-lot FIFO stock allocation'),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'reference_code', p_reference_code,
      'requested_qty', p_requested_qty,
      'total_cogs_vnd', v_total_cogs_vnd,
      'weighted_unit_cost_vnd', v_weighted_unit_cost_vnd,
      'allocations', v_allocations
    )
  );

  RETURN jsonb_build_object(
    'warehouse_store_id', p_warehouse_store_id,
    'item_id', p_item_id,
    'requested_qty', p_requested_qty,
    'total_allocated_qty', p_requested_qty,
    'total_cogs_vnd', v_total_cogs_vnd,
    'weighted_unit_cost_vnd', v_weighted_unit_cost_vnd,
    'reference_code', p_reference_code,
    'allocations', v_allocations
  );
END;
$$;
