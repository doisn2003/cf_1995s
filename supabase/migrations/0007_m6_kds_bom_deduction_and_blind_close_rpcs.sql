-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0007_m6_kds_bom_deduction_and_blind_close_rpcs.sql
-- Scope: M6.1 Atomic PL/pgSQL RPCs for:
--        1. KDS Order Status Advancement (QUEUED -> PREPARING -> COMPLETED)
--        2. Idempotent Multi-Level BOM Atomic FIFO Store Inventory Deduction
--        3. Blind Shift Cash Close Reconciliation (chk_blind_shift_closed_vals)
--        4. End-of-Day Store Daily Stocktake vs BOM Variance Engine
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: RPC 1 - COMPLETE KDS ORDER WITH ATOMIC 2-TIER BOM FIFO DEDUCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m6_complete_kds_order_bom_deduction(
  p_store_id UUID,
  p_order_id UUID,
  p_actor_id UUID,
  p_allow_partial_on_shortage BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role_enum;
  v_order RECORD;
  v_req RECORD;
  v_lot RECORD;
  v_remaining_needed NUMERIC(12,2);
  v_take_qty NUMERIC(12,2);
  v_lot_remaining_after NUMERIC(12,2);
  v_lot_depleted BOOLEAN;
  v_item_deducted NUMERIC(12,2);
  v_item_shortage NUMERIC(12,2);
  v_lot_slices JSONB;
  v_deductions JSONB := '[]'::jsonb;
  v_has_shortage BOOLEAN := FALSE;
  v_completed_at TIMESTAMPTZ;
BEGIN
  -- RBAC: Allow SUPER_ADMIN, same-store STORE_MANAGER, and same-store BARISTA_KDS
  v_role := public._m4_assert_store_pos_actor(p_actor_id, p_store_id, TRUE);
  IF v_role = 'CASHIER_STAFF' THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: CASHIER_STAFF cannot complete KDS tickets or trigger BOM deduction';
  END IF;

  SELECT
    o.id,
    o.order_code,
    o.store_id,
    o.payment_status,
    o.kds_status,
    o.bom_deducted_at
  INTO v_order
  FROM public.pos_orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: POS order % not found', p_order_id;
  END IF;

  IF v_order.store_id <> p_store_id THEN
    RAISE EXCEPTION 'FORBIDDEN_CROSS_TENANT_ACCESS: Order % does not belong to store %',
      p_order_id, p_store_id;
  END IF;

  IF v_order.payment_status = 'VOIDED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_VOIDED: Cannot complete KDS or deduct BOM for voided order %',
      v_order.order_code;
  END IF;

  -- Strictly Idempotent Guard: Never deduct BOM twice for the same POS order
  IF v_order.bom_deducted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'order_id', v_order.id,
      'order_code', v_order.order_code,
      'store_id', v_order.store_id,
      'kds_status', v_order.kds_status,
      'bom_deducted_at', v_order.bom_deducted_at,
      'already_deducted', TRUE,
      'has_shortage', FALSE,
      'deductions', '[]'::jsonb
    );
  END IF;

  -- Aggregate 2-Tier BOM material requirements (Tier 1 Recipe + Wastage, Tier 2 Modifier Linked Items)
  FOR v_req IN
    WITH tier1_recipe AS (
      SELECT
        bri.inventory_item_id,
        ROUND(
          SUM(
            poi.quantity::NUMERIC
            * bri.quantity_per_cup_base_unit
            * (1 + bri.wastage_allowance_pct / 100.0)
          ),
          2
        ) AS req_qty
      FROM public.pos_order_items poi
      JOIN public.bom_recipes br
        ON br.product_id = poi.product_id
       AND br.variant_id = poi.variant_id
       AND br.is_active = TRUE
      JOIN public.bom_recipe_items bri
        ON bri.recipe_id = br.id
      WHERE poi.order_id = v_order.id
      GROUP BY bri.inventory_item_id
    ),
    tier2_modifiers AS (
      SELECT
        mm.inventory_item_id,
        ROUND(SUM(poi.quantity::NUMERIC * mm.bom_qty_base_unit), 2) AS req_qty
      FROM public.pos_order_items poi
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(poi.modifiers_json, '[]'::jsonb)) AS mod_elem
      JOIN public.menu_modifiers mm
        ON mm.id = (mod_elem->>'id')::UUID
       AND mm.inventory_item_id IS NOT NULL
       AND mm.bom_qty_base_unit > 0
      WHERE poi.order_id = v_order.id
      GROUP BY mm.inventory_item_id
    ),
    combined AS (
      SELECT inventory_item_id, req_qty FROM tier1_recipe
      UNION ALL
      SELECT inventory_item_id, req_qty FROM tier2_modifiers
    )
    SELECT
      c.inventory_item_id,
      ii.sku,
      ii.name AS item_name,
      ii.base_unit,
      ROUND(SUM(c.req_qty), 2) AS total_required_qty
    FROM combined c
    JOIN public.inventory_items ii ON ii.id = c.inventory_item_id
    GROUP BY c.inventory_item_id, ii.sku, ii.name, ii.base_unit
    HAVING SUM(c.req_qty) > 0
    ORDER BY c.inventory_item_id ASC
  LOOP
    v_remaining_needed := v_req.total_required_qty;
    v_item_deducted := 0;
    v_lot_slices := '[]'::jsonb;

    -- Lock and deplete AVAILABLE lots at this store strictly in 4-key FIFO order
    FOR v_lot IN
      SELECT
        wl.id,
        wl.lot_code,
        wl.roast_date,
        wl.remaining_qty
      FROM public.warehouse_lots wl
      WHERE wl.store_id = p_store_id
        AND wl.item_id = v_req.inventory_item_id
        AND wl.status = 'AVAILABLE'
        AND wl.remaining_qty > 0
      ORDER BY
        COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::DATE) ASC,
        wl.received_at ASC,
        wl.lot_code ASC,
        wl.id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining_needed <= 0;

      v_take_qty := ROUND(LEAST(v_lot.remaining_qty, v_remaining_needed), 2);
      v_lot_remaining_after := ROUND(v_lot.remaining_qty - v_take_qty, 2);
      v_lot_depleted := (v_lot_remaining_after <= 0);

      UPDATE public.warehouse_lots
      SET
        remaining_qty = v_lot_remaining_after,
        status = CASE
          WHEN v_lot_depleted THEN 'DEPLETED'::public.lot_status_enum
          ELSE 'AVAILABLE'::public.lot_status_enum
        END,
        updated_at = NOW()
      WHERE id = v_lot.id;

      v_item_deducted := ROUND(v_item_deducted + v_take_qty, 2);
      v_remaining_needed := ROUND(v_remaining_needed - v_take_qty, 2);

      v_lot_slices := v_lot_slices || jsonb_build_array(
        jsonb_build_object(
          'lot_id', v_lot.id,
          'lot_code', v_lot.lot_code,
          'roast_date', v_lot.roast_date,
          'deducted_qty', v_take_qty,
          'remaining_after_qty', v_lot_remaining_after,
          'depleted', v_lot_depleted
        )
      );
    END LOOP;

    v_item_shortage := GREATEST(0, v_remaining_needed);

    IF v_item_shortage > 0 THEN
      IF NOT COALESCE(p_allow_partial_on_shortage, FALSE) THEN
        RAISE EXCEPTION 'INSUFFICIENT_STORE_BOM_STOCK: Store % lacks % % of % (%) for order %',
          p_store_id, v_item_shortage, v_req.base_unit, v_req.sku, v_req.item_name, v_order.order_code;
      END IF;
      v_has_shortage := TRUE;
    END IF;

    v_deductions := v_deductions || jsonb_build_array(
      jsonb_build_object(
        'inventory_item_id', v_req.inventory_item_id,
        'sku', v_req.sku,
        'name', v_req.item_name,
        'base_unit', v_req.base_unit,
        'required_qty', v_req.total_required_qty,
        'deducted_qty', v_item_deducted,
        'shortage_qty', v_item_shortage,
        'lot_slices', v_lot_slices
      )
    );
  END LOOP;

  v_completed_at := NOW();

  UPDATE public.pos_orders
  SET
    kds_status = 'COMPLETED',
    bom_deducted_at = v_completed_at,
    updated_at = v_completed_at
  WHERE id = v_order.id;

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
    p_store_id,
    'KDS_ORDER_BOM_DEDUCTED',
    'pos_orders',
    v_order.id,
    'Completed KDS order ' || v_order.order_code || ' with atomic FIFO BOM deduction',
    jsonb_build_object(
      'order_code', v_order.order_code,
      'has_shortage', v_has_shortage,
      'allow_partial_on_shortage', COALESCE(p_allow_partial_on_shortage, FALSE),
      'deductions', v_deductions
    )
  );

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_code', v_order.order_code,
    'store_id', v_order.store_id,
    'kds_status', 'COMPLETED',
    'bom_deducted_at', v_completed_at,
    'already_deducted', FALSE,
    'has_shortage', v_has_shortage,
    'deductions', v_deductions
  );
END;
$$;

-- ============================================================================
-- SECTION 2: RPC 2 - ADVANCE KDS TICKET STATUS (QUEUED -> PREPARING / COMPLETED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m6_advance_kds_order_status(
  p_store_id UUID,
  p_order_id UUID,
  p_target_status public.kds_status_enum,
  p_actor_id UUID,
  p_allow_partial_on_shortage BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role_enum;
  v_order RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_target_status = 'COMPLETED' THEN
    RETURN public.rpc_m6_complete_kds_order_bom_deduction(
      p_store_id,
      p_order_id,
      p_actor_id,
      p_allow_partial_on_shortage
    );
  END IF;

  v_role := public._m4_assert_store_pos_actor(p_actor_id, p_store_id, TRUE);
  IF v_role = 'CASHIER_STAFF' THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: CASHIER_STAFF cannot advance KDS preparation tickets';
  END IF;

  SELECT
    o.id,
    o.order_code,
    o.store_id,
    o.payment_status,
    o.kds_status
  INTO v_order
  FROM public.pos_orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: POS order % not found', p_order_id;
  END IF;

  IF v_order.store_id <> p_store_id THEN
    RAISE EXCEPTION 'FORBIDDEN_CROSS_TENANT_ACCESS: Order % does not belong to store %',
      p_order_id, p_store_id;
  END IF;

  IF v_order.payment_status = 'VOIDED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_VOIDED: Cannot advance KDS status for voided order %',
      v_order.order_code;
  END IF;

  IF v_order.kds_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'KDS_INVALID_TRANSITION: Completed order % cannot revert to %',
      v_order.order_code, p_target_status;
  END IF;

  UPDATE public.pos_orders
  SET
    kds_status = p_target_status,
    updated_at = v_now
  WHERE id = v_order.id;

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
    p_store_id,
    'KDS_STATUS_ADVANCED',
    'pos_orders',
    v_order.id,
    'KDS status changed from ' || v_order.kds_status::TEXT || ' to ' || p_target_status::TEXT,
    jsonb_build_object(
      'order_code', v_order.order_code,
      'previous_status', v_order.kds_status,
      'kds_status', p_target_status
    )
  );

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_code', v_order.order_code,
    'store_id', v_order.store_id,
    'previous_status', v_order.kds_status,
    'kds_status', p_target_status,
    'updated_at', v_now
  );
END;
$$;

-- ============================================================================
-- SECTION 3: RPC 3 - BLIND SHIFT CASH CLOSE RECONCILIATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m6_blind_close_pos_shift(
  p_store_id UUID,
  p_shift_id UUID,
  p_blind_counted_cash_vnd BIGINT,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift RECORD;
  v_cash_sales_vnd BIGINT := 0;
  v_vietqr_sales_vnd BIGINT := 0;
  v_paid_cash_orders_count INTEGER := 0;
  v_voided_orders_count INTEGER := 0;
  v_expected_cash_vnd BIGINT;
  v_variance_cash_vnd BIGINT;
  v_variance_status TEXT;
  v_closed_at TIMESTAMPTZ := NOW();
BEGIN
  -- RBAC: SUPER_ADMIN, same-store STORE_MANAGER, same-store CASHIER_STAFF
  -- Strictly blocks WAREHOUSE_MANAGER and BARISTA_KDS
  PERFORM public._m4_assert_store_pos_actor(p_actor_id, p_store_id, FALSE);

  IF p_blind_counted_cash_vnd IS NULL OR p_blind_counted_cash_vnd < 0 THEN
    RAISE EXCEPTION 'INVALID_BLIND_CASH_AMOUNT: blind_counted_cash_vnd must be a non-negative integer';
  END IF;

  SELECT
    s.id,
    s.store_id,
    s.cashier_id,
    s.opened_at,
    s.opening_cash_vnd,
    s.status,
    s.notes
  INTO v_shift
  FROM public.pos_shifts s
  WHERE s.id = p_shift_id
  FOR UPDATE;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'SHIFT_NOT_FOUND: POS shift % not found', p_shift_id;
  END IF;

  IF v_shift.store_id <> p_store_id THEN
    RAISE EXCEPTION 'FORBIDDEN_CROSS_TENANT_ACCESS: Shift % does not belong to store %',
      p_shift_id, p_store_id;
  END IF;

  IF v_shift.status = 'CLOSED' THEN
    RAISE EXCEPTION 'SHIFT_ALREADY_CLOSED: Shift % is already closed', p_shift_id;
  END IF;

  -- Sum ONLY PAID CASH orders into expected drawer cash (strictly exclude VIETQR, PENDING, VOIDED)
  SELECT
    COALESCE(SUM(o.total_amount_vnd) FILTER (WHERE o.payment_method = 'CASH' AND o.payment_status = 'PAID'), 0),
    COALESCE(SUM(o.total_amount_vnd) FILTER (WHERE o.payment_method = 'VIETQR' AND o.payment_status = 'PAID'), 0),
    COUNT(*) FILTER (WHERE o.payment_method = 'CASH' AND o.payment_status = 'PAID'),
    COUNT(*) FILTER (WHERE o.payment_status = 'VOIDED')
  INTO
    v_cash_sales_vnd,
    v_vietqr_sales_vnd,
    v_paid_cash_orders_count,
    v_voided_orders_count
  FROM public.pos_orders o
  WHERE o.shift_id = v_shift.id
    AND o.store_id = p_store_id;

  v_expected_cash_vnd := v_shift.opening_cash_vnd + v_cash_sales_vnd;
  v_variance_cash_vnd := p_blind_counted_cash_vnd - v_expected_cash_vnd;

  IF v_variance_cash_vnd = 0 THEN
    v_variance_status := 'BALANCED';
  ELSIF v_variance_cash_vnd > 0 THEN
    v_variance_status := 'SURPLUS';
  ELSE
    v_variance_status := 'SHORTAGE';
  END IF;

  -- Satisfies chk_blind_shift_closed_vals constraint in 0001_m1_core_3nf_schema.sql
  UPDATE public.pos_shifts
  SET
    status = 'CLOSED',
    closed_at = v_closed_at,
    blind_counted_cash_vnd = p_blind_counted_cash_vnd,
    system_expected_cash_vnd = v_expected_cash_vnd,
    variance_cash_vnd = v_variance_cash_vnd,
    notes = COALESCE(NULLIF(TRIM(p_notes), ''), notes),
    updated_at = v_closed_at
  WHERE id = v_shift.id;

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
    p_store_id,
    'POS_SHIFT_BLIND_CLOSED',
    'pos_shifts',
    v_shift.id,
    'Blind shift close reconciled with status ' || v_variance_status,
    jsonb_build_object(
      'opening_cash_vnd', v_shift.opening_cash_vnd,
      'cash_sales_vnd', v_cash_sales_vnd,
      'vietqr_sales_vnd', v_vietqr_sales_vnd,
      'system_expected_cash_vnd', v_expected_cash_vnd,
      'blind_counted_cash_vnd', p_blind_counted_cash_vnd,
      'variance_cash_vnd', v_variance_cash_vnd,
      'variance_status', v_variance_status,
      'paid_cash_orders_count', v_paid_cash_orders_count,
      'voided_orders_count', v_voided_orders_count
    )
  );

  RETURN jsonb_build_object(
    'shift_id', v_shift.id,
    'store_id', v_shift.store_id,
    'cashier_id', v_shift.cashier_id,
    'status', 'CLOSED',
    'opened_at', v_shift.opened_at,
    'closed_at', v_closed_at,
    'opening_cash_vnd', v_shift.opening_cash_vnd,
    'cash_sales_vnd', v_cash_sales_vnd,
    'vietqr_sales_vnd', v_vietqr_sales_vnd,
    'paid_cash_orders_count', v_paid_cash_orders_count,
    'voided_orders_count', v_voided_orders_count,
    'system_expected_cash_vnd', v_expected_cash_vnd,
    'blind_counted_cash_vnd', p_blind_counted_cash_vnd,
    'variance_cash_vnd', v_variance_cash_vnd,
    'variance_status', v_variance_status,
    'notes', COALESCE(NULLIF(TRIM(p_notes), ''), v_shift.notes)
  );
END;
$$;

-- ============================================================================
-- SECTION 4: RPC 4 - END-OF-DAY STORE DAILY STOCKTAKE VS BOM VARIANCE ENGINE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m6_submit_store_daily_stocktake(
  p_store_id UUID,
  p_stocktake_date DATE,
  p_items JSONB,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role_enum;
  v_entry JSONB;
  v_item RECORD;
  v_opening_qty NUMERIC(12,2);
  v_received_qty NUMERIC(12,2);
  v_bom_consumed_qty NUMERIC(12,2);
  v_actual_qty NUMERIC(12,2);
  v_theoretical_qty NUMERIC(12,2);
  v_variance_qty NUMERIC(12,2);
  v_variance_pct NUMERIC(8,2);
  v_is_abnormal BOOLEAN;
  v_entry_notes TEXT;
  v_upserted_id UUID;
  v_updated_at TIMESTAMPTZ;
  v_results JSONB := '[]'::jsonb;
  v_total_count INTEGER := 0;
  v_abnormal_count INTEGER := 0;
BEGIN
  -- Matches Table 25 RLS in 0002: strictly SUPER_ADMIN or same-store STORE_MANAGER
  v_role := public._m4_assert_store_pos_actor(p_actor_id, p_store_id, FALSE);
  IF v_role NOT IN ('SUPER_ADMIN', 'STORE_MANAGER') THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Only SUPER_ADMIN or STORE_MANAGER may submit daily store stocktakes';
  END IF;

  IF p_stocktake_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_STOCKTAKE_DATE: stocktake_date is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_STOCKTAKE_ITEMS: At least 1 inventory item is required for daily stocktake';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, sku, name, base_unit
      INTO v_item
    FROM public.inventory_items
    WHERE id = (v_entry->>'inventory_item_id')::UUID
      AND is_active = TRUE;

    IF v_item.id IS NULL THEN
      RAISE EXCEPTION 'INVENTORY_ITEM_NOT_FOUND: Inventory item % not found or inactive',
        (v_entry->>'inventory_item_id');
    END IF;

    v_opening_qty := ROUND(COALESCE((v_entry->>'opening_qty')::NUMERIC, 0), 2);
    v_received_qty := ROUND(COALESCE((v_entry->>'received_in_qty')::NUMERIC, 0), 2);
    v_bom_consumed_qty := ROUND(COALESCE((v_entry->>'bom_consumed_qty')::NUMERIC, 0), 2);
    v_actual_qty := ROUND((v_entry->>'actual_counted_qty')::NUMERIC, 2);
    v_entry_notes := COALESCE(NULLIF(TRIM(v_entry->>'notes'), ''), NULLIF(TRIM(p_notes), ''));

    IF v_opening_qty < 0 OR v_received_qty < 0 OR v_bom_consumed_qty < 0 OR v_actual_qty < 0 THEN
      RAISE EXCEPTION 'INVALID_STOCKTAKE_QTY: Stocktake quantities must be non-negative for item %',
        v_item.sku;
    END IF;

    v_theoretical_qty := ROUND(v_opening_qty + v_received_qty - v_bom_consumed_qty, 2);
    v_variance_qty := ROUND(v_actual_qty - v_theoretical_qty, 2);

    IF v_theoretical_qty <= 0 THEN
      v_variance_pct := 0;
    ELSE
      v_variance_pct := ROUND((v_variance_qty / v_theoretical_qty) * 100.0, 2);
    END IF;

    v_is_abnormal := (v_variance_qty < 0 AND ABS(v_variance_pct) > 3.0);

    -- Upsert satisfies uq_store_daily_stocktakes_store_item_date & chk_stocktake_variance_formula
    INSERT INTO public.store_daily_stocktakes (
      store_id,
      inventory_item_id,
      stocktake_date,
      opening_qty,
      received_in_qty,
      bom_consumed_qty,
      theoretical_closing_qty,
      actual_counted_qty,
      variance_qty,
      counted_by,
      notes
    )
    VALUES (
      p_store_id,
      v_item.id,
      p_stocktake_date,
      v_opening_qty,
      v_received_qty,
      v_bom_consumed_qty,
      v_theoretical_qty,
      v_actual_qty,
      v_variance_qty,
      p_actor_id,
      v_entry_notes
    )
    ON CONFLICT (store_id, inventory_item_id, stocktake_date)
    DO UPDATE SET
      opening_qty = EXCLUDED.opening_qty,
      received_in_qty = EXCLUDED.received_in_qty,
      bom_consumed_qty = EXCLUDED.bom_consumed_qty,
      theoretical_closing_qty = EXCLUDED.theoretical_closing_qty,
      actual_counted_qty = EXCLUDED.actual_counted_qty,
      variance_qty = EXCLUDED.variance_qty,
      counted_by = EXCLUDED.counted_by,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, updated_at
      INTO v_upserted_id, v_updated_at;

    v_total_count := v_total_count + 1;
    IF v_is_abnormal THEN
      v_abnormal_count := v_abnormal_count + 1;
    END IF;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'id', v_upserted_id,
        'store_id', p_store_id,
        'inventory_item_id', v_item.id,
        'sku', v_item.sku,
        'item_name', v_item.name,
        'base_unit', v_item.base_unit,
        'stocktake_date', p_stocktake_date,
        'opening_qty', v_opening_qty,
        'received_in_qty', v_received_qty,
        'bom_consumed_qty', v_bom_consumed_qty,
        'theoretical_closing_qty', v_theoretical_qty,
        'actual_counted_qty', v_actual_qty,
        'variance_qty', v_variance_qty,
        'variance_pct', v_variance_pct,
        'is_abnormal_shrinkage', v_is_abnormal,
        'counted_by', p_actor_id,
        'notes', v_entry_notes,
        'updated_at', v_updated_at
      )
    );
  END LOOP;

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
    p_store_id,
    'STORE_DAILY_STOCKTAKE_SUBMITTED',
    'store_daily_stocktakes',
    NULL,
    'Submitted daily stocktake for ' || p_stocktake_date::TEXT || ' (' || v_total_count || ' items, ' || v_abnormal_count || ' abnormal shrinkage)',
    jsonb_build_object(
      'stocktake_date', p_stocktake_date,
      'total_items_counted', v_total_count,
      'abnormal_shrinkage_count', v_abnormal_count
    )
  );

  RETURN jsonb_build_object(
    'store_id', p_store_id,
    'stocktake_date', p_stocktake_date,
    'total_items_counted', v_total_count,
    'abnormal_shrinkage_count', v_abnormal_count,
    'items', v_results
  );
END;
$$;
