-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql
-- Scope: M3.1 Atomic PL/pgSQL RPCs for B2B Dynamic Tiered Pricing, AR Credit
--        Ledger (FIFO Debt Settlement) & 2-Phase Internal Stock Transfer
--        (REQUESTED -> IN_TRANSIT -> RECONCILED) with Cost-Hiding at Stores.
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: RPC 1 - ATOMIC B2B ORDER CREATION (TIERED PRICE + CREDIT CHECK + FIFO)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m3_create_b2b_order(
  p_actor_id UUID,
  p_warehouse_store_id UUID,
  p_customer_id UUID,
  p_order_code TEXT,
  p_payment_method public.payment_method_enum,
  p_paid_amount_vnd BIGINT DEFAULT 0,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_customer public.b2b_customers%ROWTYPE;
  v_order public.b2b_orders%ROWTYPE;
  v_item_input JSONB;
  v_item_id UUID;
  v_qty_base NUMERIC(12,2);
  v_inv_item RECORD;
  v_qty_kg NUMERIC(12,4);
  v_unit_price_vnd BIGINT;
  v_line_total_vnd BIGINT;
  v_total_amount_vnd BIGINT := 0;
  v_total_cogs_vnd BIGINT := 0;
  v_debt_added_vnd BIGINT;
  v_projected_debt_vnd BIGINT;
  v_payment_status public.payment_status_enum;
  v_due_date DATE;
  v_lot RECORD;
  v_remaining_to_take NUMERIC(12,2);
  v_take_qty NUMERIC(12,2);
  v_lot_after_qty NUMERIC(12,2);
  v_lot_after_status public.lot_status_enum;
  v_slice_line_total BIGINT;
  v_slice_cogs BIGINT;
  v_created_items JSONB := '[]'::jsonb;
  v_order_item public.b2b_order_items%ROWTYPE;
BEGIN
  v_actor_role := public._m2_assert_warehouse_actor(p_actor_id, p_warehouse_store_id);

  IF p_paid_amount_vnd IS NULL OR p_paid_amount_vnd < 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: paid_amount_vnd must be a non-negative integer';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: B2B order must contain at least 1 item';
  END IF;

  -- Lock B2B customer row FOR UPDATE to prevent concurrent credit limit race conditions
  SELECT *
    INTO v_customer
  FROM public.b2b_customers
  WHERE id = p_customer_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Active B2B customer % not found', p_customer_id;
  END IF;

  v_due_date := (CURRENT_DATE + v_customer.payment_term_days);

  -- Insert shell order first (totals updated atomically before COMMIT)
  INSERT INTO public.b2b_orders (
    order_code,
    warehouse_store_id,
    customer_id,
    created_by,
    payment_method,
    payment_status,
    total_amount_vnd,
    paid_amount_vnd,
    cogs_amount_vnd,
    due_date,
    notes
  )
  VALUES (
    TRIM(p_order_code),
    p_warehouse_store_id,
    p_customer_id,
    p_actor_id,
    p_payment_method,
    'PENDING',
    0,
    0,
    0,
    v_due_date,
    p_notes
  )
  RETURNING * INTO v_order;

  -- Process each item: resolve tiered unit price + allocate Central Warehouse stock via FIFO
  FOR v_item_input IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item_input->>'item_id')::UUID;
    v_qty_base := (v_item_input->>'quantity_base_unit')::NUMERIC(12,2);

    IF v_qty_base IS NULL OR v_qty_base <= 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: quantity_base_unit must be strictly positive';
    END IF;

    SELECT id, sku, base_unit, retail_price_vnd, internal_transfer_price_vnd
      INTO v_inv_item
    FROM public.inventory_items
    WHERE id = v_item_id
      AND is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Active inventory item % not found', v_item_id;
    END IF;

    v_qty_kg := CASE
      WHEN v_inv_item.base_unit = 'g' THEN v_qty_base / 1000.0
      ELSE v_qty_base
    END;

    -- Resolve lowest (most favorable) unit_price_vnd matching customer tier OR volume threshold
    SELECT bpt.unit_price_vnd
      INTO v_unit_price_vnd
    FROM public.b2b_price_tiers bpt
    WHERE bpt.item_id = v_item_id
      AND (bpt.price_tier = v_customer.price_tier OR bpt.min_qty_kg <= v_qty_kg)
    ORDER BY bpt.unit_price_vnd ASC
    LIMIT 1;

    IF v_unit_price_vnd IS NULL THEN
      v_unit_price_vnd := CASE
        WHEN v_inv_item.retail_price_vnd > 0 THEN v_inv_item.retail_price_vnd
        ELSE v_inv_item.internal_transfer_price_vnd
      END;
    END IF;

    v_line_total_vnd := ROUND(v_qty_kg * v_unit_price_vnd::NUMERIC)::BIGINT;
    v_total_amount_vnd := v_total_amount_vnd + v_line_total_vnd;

    -- Deduct from Central Warehouse lots in strict 4-key FIFO order
    v_remaining_to_take := v_qty_base;

    FOR v_lot IN
      SELECT wl.*
      FROM public.warehouse_lots wl
      WHERE wl.store_id = p_warehouse_store_id
        AND wl.item_id = v_item_id
        AND wl.status = 'AVAILABLE'
        AND wl.remaining_qty > 0
      ORDER BY
        COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::DATE) ASC,
        wl.received_at ASC,
        wl.lot_code ASC,
        wl.id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining_to_take <= 0;

      v_take_qty := LEAST(v_lot.remaining_qty, v_remaining_to_take);
      v_lot_after_qty := v_lot.remaining_qty - v_take_qty;
      v_lot_after_status := CASE
        WHEN v_lot_after_qty = 0 THEN 'DEPLETED'::public.lot_status_enum
        ELSE 'AVAILABLE'::public.lot_status_enum
      END;

      UPDATE public.warehouse_lots
      SET remaining_qty = v_lot_after_qty,
          status = v_lot_after_status
      WHERE id = v_lot.id;

      v_slice_line_total := ROUND(
        (CASE WHEN v_inv_item.base_unit = 'g' THEN v_take_qty / 1000.0 ELSE v_take_qty END)
        * v_unit_price_vnd::NUMERIC
      )::BIGINT;

      v_slice_cogs := ROUND(
        (CASE WHEN v_inv_item.base_unit = 'g' THEN v_take_qty / 1000.0 ELSE v_take_qty END)
        * v_lot.unit_cost_vnd::NUMERIC
      )::BIGINT;
      v_total_cogs_vnd := v_total_cogs_vnd + v_slice_cogs;

      INSERT INTO public.b2b_order_items (
        b2b_order_id,
        item_id,
        lot_id,
        quantity_base_unit,
        unit_price_vnd,
        unit_cost_vnd,
        line_total_vnd
      )
      VALUES (
        v_order.id,
        v_item_id,
        v_lot.id,
        v_take_qty,
        v_unit_price_vnd,
        v_lot.unit_cost_vnd,
        v_slice_line_total
      )
      RETURNING * INTO v_order_item;

      v_created_items := v_created_items || jsonb_build_array(to_jsonb(v_order_item));
      v_remaining_to_take := v_remaining_to_take - v_take_qty;
    END LOOP;

    IF v_remaining_to_take > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_FIFO_STOCK: Missing % base units for SKU % in warehouse %',
        v_remaining_to_take, v_inv_item.sku, p_warehouse_store_id;
    END IF;
  END LOOP;

  IF p_paid_amount_vnd > v_total_amount_vnd THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: paid_amount_vnd (%) cannot exceed total_amount_vnd (%)',
      p_paid_amount_vnd, v_total_amount_vnd;
  END IF;

  v_debt_added_vnd := v_total_amount_vnd - p_paid_amount_vnd;
  v_projected_debt_vnd := v_customer.current_debt_vnd + v_debt_added_vnd;

  IF v_projected_debt_vnd > v_customer.credit_limit_vnd THEN
    RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED: Projected debt (%) exceeds customer credit limit (%)',
      v_projected_debt_vnd, v_customer.credit_limit_vnd;
  END IF;

  v_payment_status := CASE
    WHEN p_paid_amount_vnd = v_total_amount_vnd THEN 'PAID'::public.payment_status_enum
    ELSE 'PENDING'::public.payment_status_enum
  END;

  UPDATE public.b2b_orders
  SET total_amount_vnd = v_total_amount_vnd,
      paid_amount_vnd = p_paid_amount_vnd,
      cogs_amount_vnd = v_total_cogs_vnd,
      payment_status = v_payment_status
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  IF v_debt_added_vnd > 0 THEN
    UPDATE public.b2b_customers
    SET current_debt_vnd = v_projected_debt_vnd
    WHERE id = v_customer.id;

    INSERT INTO public.b2b_debt_ledger (
      customer_id,
      b2b_order_id,
      entry_type,
      amount_vnd,
      balance_after_vnd,
      recorded_by,
      reference_note
    )
    VALUES (
      v_customer.id,
      v_order.id,
      'DEBIT_INVOICE',
      v_debt_added_vnd,
      v_projected_debt_vnd,
      p_actor_id,
      COALESCE(p_notes, 'Ghi nợ đơn bán sỉ ' || v_order.order_code)
    );
  END IF;

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
    'M3_B2B_ORDER_CREATED',
    'b2b_orders',
    v_order.id,
    COALESCE(p_notes, 'B2B wholesale order created with tiered pricing & FIFO'),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'order_code', v_order.order_code,
      'customer_code', v_customer.code,
      'total_amount_vnd', v_total_amount_vnd,
      'paid_amount_vnd', p_paid_amount_vnd,
      'debt_added_vnd', v_debt_added_vnd,
      'projected_debt_vnd', v_projected_debt_vnd,
      'cogs_amount_vnd', v_total_cogs_vnd
    )
  );

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_created_items,
    'debt_added_vnd', v_debt_added_vnd,
    'projected_debt_vnd', v_projected_debt_vnd,
    'remaining_credit_vnd', GREATEST(0, v_customer.credit_limit_vnd - v_projected_debt_vnd)
  );
END;
$$;

-- ============================================================================
-- SECTION 2: RPC 2 - ATOMIC B2B DEBT PAYMENT (FIFO INVOICE SETTLEMENT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m3_record_b2b_debt_payment(
  p_actor_id UUID,
  p_warehouse_store_id UUID,
  p_customer_id UUID,
  p_payment_amount_vnd BIGINT,
  p_reference_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_customer public.b2b_customers%ROWTYPE;
  v_previous_debt_vnd BIGINT;
  v_new_debt_vnd BIGINT;
  v_remaining_payment BIGINT;
  v_ord RECORD;
  v_apply_vnd BIGINT;
  v_new_paid BIGINT;
  v_new_status public.payment_status_enum;
  v_settled_orders JSONB := '[]'::jsonb;
  v_ledger_entry public.b2b_debt_ledger%ROWTYPE;
BEGIN
  v_actor_role := public._m2_assert_warehouse_actor(p_actor_id, p_warehouse_store_id);

  IF p_payment_amount_vnd IS NULL OR p_payment_amount_vnd <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: payment_amount_vnd must be a positive integer';
  END IF;

  SELECT *
    INTO v_customer
  FROM public.b2b_customers
  WHERE id = p_customer_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Active B2B customer % not found', p_customer_id;
  END IF;

  v_previous_debt_vnd := v_customer.current_debt_vnd;

  IF p_payment_amount_vnd > v_previous_debt_vnd THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_CURRENT_DEBT: Payment (%) exceeds current debt (%)',
      p_payment_amount_vnd, v_previous_debt_vnd;
  END IF;

  v_remaining_payment := p_payment_amount_vnd;

  -- Settle oldest pending invoices first (FIFO Debt Settlement)
  FOR v_ord IN
    SELECT bo.*
    FROM public.b2b_orders bo
    WHERE bo.customer_id = p_customer_id
      AND bo.payment_status = 'PENDING'
      AND bo.paid_amount_vnd < bo.total_amount_vnd
    ORDER BY bo.created_at ASC, bo.order_code ASC, bo.id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_payment <= 0;

    v_apply_vnd := LEAST(v_remaining_payment, v_ord.total_amount_vnd - v_ord.paid_amount_vnd);
    v_new_paid := v_ord.paid_amount_vnd + v_apply_vnd;
    v_new_status := CASE
      WHEN v_new_paid = v_ord.total_amount_vnd THEN 'PAID'::public.payment_status_enum
      ELSE 'PENDING'::public.payment_status_enum
    END;

    UPDATE public.b2b_orders
    SET paid_amount_vnd = v_new_paid,
        payment_status = v_new_status
    WHERE id = v_ord.id;

    v_settled_orders := v_settled_orders || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_ord.id,
        'order_code', v_ord.order_code,
        'applied_vnd', v_apply_vnd,
        'new_paid_amount_vnd', v_new_paid,
        'new_payment_status', v_new_status
      )
    );

    v_remaining_payment := v_remaining_payment - v_apply_vnd;
  END LOOP;

  v_new_debt_vnd := v_previous_debt_vnd - p_payment_amount_vnd;

  UPDATE public.b2b_customers
  SET current_debt_vnd = v_new_debt_vnd
  WHERE id = p_customer_id;

  INSERT INTO public.b2b_debt_ledger (
    customer_id,
    b2b_order_id,
    entry_type,
    amount_vnd,
    balance_after_vnd,
    recorded_by,
    reference_note
  )
  VALUES (
    p_customer_id,
    NULL,
    'CREDIT_PAYMENT',
    p_payment_amount_vnd,
    v_new_debt_vnd,
    p_actor_id,
    COALESCE(p_reference_note, 'Thu nợ khách sỉ FIFO')
  )
  RETURNING * INTO v_ledger_entry;

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
    'M3_B2B_DEBT_PAYMENT_RECORDED',
    'b2b_debt_ledger',
    v_ledger_entry.id,
    COALESCE(p_reference_note, 'B2B debt payment settled FIFO'),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'customer_code', v_customer.code,
      'payment_amount_vnd', p_payment_amount_vnd,
      'previous_debt_vnd', v_previous_debt_vnd,
      'new_debt_vnd', v_new_debt_vnd,
      'settled_orders', v_settled_orders
    )
  );

  RETURN jsonb_build_object(
    'customer_id', p_customer_id,
    'payment_amount_vnd', p_payment_amount_vnd,
    'previous_debt_vnd', v_previous_debt_vnd,
    'new_debt_vnd', v_new_debt_vnd,
    'ledger_entry', to_jsonb(v_ledger_entry),
    'settled_orders', v_settled_orders
  );
END;
$$;

-- ============================================================================
-- SECTION 3: RPC 3 - PHASE 0 INTERNAL TRANSFER REQUEST (REQUESTED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m3_request_internal_transfer(
  p_actor_id UUID,
  p_transfer_code TEXT,
  p_from_warehouse_id UUID,
  p_to_store_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_from_type public.store_type_enum;
  v_to_type public.store_type_enum;
  v_transfer public.internal_transfers%ROWTYPE;
  v_item_input JSONB;
  v_item_id UUID;
  v_requested_qty NUMERIC(12,2);
  v_inv_item RECORD;
  v_line_total BIGINT;
  v_total_internal_vnd BIGINT := 0;
  v_created_item public.internal_transfer_items%ROWTYPE;
  v_created_items JSONB := '[]'::jsonb;
BEGIN
  SELECT id, role, assigned_store_id
    INTO v_actor
  FROM public.user_profiles
  WHERE id = p_actor_id
    AND is_active = TRUE;

  IF NOT FOUND OR (
    v_actor.role <> 'SUPER_ADMIN'
    AND NOT (v_actor.role = 'STORE_MANAGER' AND v_actor.assigned_store_id = p_to_store_id)
  ) THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Actor % is not allowed to request transfers for store %',
      p_actor_id, p_to_store_id;
  END IF;

  SELECT type INTO v_from_type FROM public.stores WHERE id = p_from_warehouse_id AND is_active = TRUE;
  SELECT type INTO v_to_type FROM public.stores WHERE id = p_to_store_id AND is_active = TRUE;

  IF v_from_type IS NULL OR v_from_type <> 'CENTRAL_WAREHOUSE' THEN
    RAISE EXCEPTION 'DOMAIN_VIOLATION: from_warehouse_id % must be an active CENTRAL_WAREHOUSE', p_from_warehouse_id;
  END IF;

  IF v_to_type IS NULL OR v_to_type = 'CENTRAL_WAREHOUSE' OR p_from_warehouse_id = p_to_store_id THEN
    RAISE EXCEPTION 'DOMAIN_VIOLATION: to_store_id % must be an active retail/franchise store distinct from warehouse', p_to_store_id;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Internal transfer must include at least 1 item';
  END IF;

  INSERT INTO public.internal_transfers (
    transfer_code,
    from_warehouse_id,
    to_store_id,
    status,
    total_internal_value_vnd,
    requested_by,
    notes
  )
  VALUES (
    TRIM(p_transfer_code),
    p_from_warehouse_id,
    p_to_store_id,
    'REQUESTED',
    0,
    p_actor_id,
    p_notes
  )
  RETURNING * INTO v_transfer;

  FOR v_item_input IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item_input->>'item_id')::UUID;
    v_requested_qty := (v_item_input->>'requested_qty')::NUMERIC(12,2);

    IF v_requested_qty IS NULL OR v_requested_qty <= 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: requested_qty must be strictly positive';
    END IF;

    SELECT id, base_unit, internal_transfer_price_vnd
      INTO v_inv_item
    FROM public.inventory_items
    WHERE id = v_item_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Active inventory item % not found', v_item_id;
    END IF;

    v_line_total := ROUND(
      (CASE WHEN v_inv_item.base_unit = 'g' THEN v_requested_qty / 1000.0 ELSE v_requested_qty END)
      * v_inv_item.internal_transfer_price_vnd::NUMERIC
    )::BIGINT;
    v_total_internal_vnd := v_total_internal_vnd + v_line_total;

    INSERT INTO public.internal_transfer_items (
      transfer_id,
      item_id,
      requested_qty,
      dispatched_qty,
      received_qty,
      internal_unit_price_vnd,
      line_total_vnd
    )
    VALUES (
      v_transfer.id,
      v_item_id,
      v_requested_qty,
      0,
      0,
      v_inv_item.internal_transfer_price_vnd,
      v_line_total
    )
    RETURNING * INTO v_created_item;

    v_created_items := v_created_items || jsonb_build_array(to_jsonb(v_created_item));
  END LOOP;

  UPDATE public.internal_transfers
  SET total_internal_value_vnd = v_total_internal_vnd
  WHERE id = v_transfer.id
  RETURNING * INTO v_transfer;

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
    p_to_store_id,
    'M3_INTERNAL_TRANSFER_REQUESTED',
    'internal_transfers',
    v_transfer.id,
    COALESCE(p_notes, 'Store requested internal replenishment'),
    jsonb_build_object(
      'transfer_code', v_transfer.transfer_code,
      'from_warehouse_id', p_from_warehouse_id,
      'to_store_id', p_to_store_id,
      'total_internal_value_vnd', v_total_internal_vnd
    )
  );

  RETURN jsonb_build_object(
    'transfer', to_jsonb(v_transfer),
    'items', v_created_items
  );
END;
$$;

-- ============================================================================
-- SECTION 4: RPC 4 - PHASE 1 INTERNAL TRANSFER DISPATCH (REQUESTED -> IN_TRANSIT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m3_dispatch_internal_transfer_fifo(
  p_actor_id UUID,
  p_transfer_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_transfer public.internal_transfers%ROWTYPE;
  v_titem RECORD;
  v_inv_item RECORD;
  v_lot RECORD;
  v_remaining_to_dispatch NUMERIC(12,2);
  v_take_qty NUMERIC(12,2);
  v_lot_after_qty NUMERIC(12,2);
  v_lot_after_status public.lot_status_enum;
  v_is_first_slice BOOLEAN;
  v_slice_line_total BIGINT;
  v_total_internal_vnd BIGINT := 0;
  v_dispatched_items JSONB := '[]'::jsonb;
  v_updated_item public.internal_transfer_items%ROWTYPE;
BEGIN
  SELECT *
    INTO v_transfer
  FROM public.internal_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Internal transfer % not found', p_transfer_id;
  END IF;

  v_actor_role := public._m2_assert_warehouse_actor(p_actor_id, v_transfer.from_warehouse_id);

  IF v_transfer.status <> 'REQUESTED' THEN
    RAISE EXCEPTION 'INVALID_TRANSFER_STATE: Transfer % has status %, expected REQUESTED',
      v_transfer.transfer_code, v_transfer.status;
  END IF;

  FOR v_titem IN
    SELECT *
    FROM public.internal_transfer_items
    WHERE transfer_id = p_transfer_id
    ORDER BY created_at ASC, id ASC
    FOR UPDATE
  LOOP
    SELECT id, sku, base_unit
      INTO v_inv_item
    FROM public.inventory_items
    WHERE id = v_titem.item_id
    FOR UPDATE;

    v_remaining_to_dispatch := v_titem.requested_qty;
    v_is_first_slice := TRUE;

    FOR v_lot IN
      SELECT wl.*
      FROM public.warehouse_lots wl
      WHERE wl.store_id = v_transfer.from_warehouse_id
        AND wl.item_id = v_titem.item_id
        AND wl.status = 'AVAILABLE'
        AND wl.remaining_qty > 0
      ORDER BY
        COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::DATE) ASC,
        wl.received_at ASC,
        wl.lot_code ASC,
        wl.id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining_to_dispatch <= 0;

      v_take_qty := LEAST(v_lot.remaining_qty, v_remaining_to_dispatch);
      v_lot_after_qty := v_lot.remaining_qty - v_take_qty;
      v_lot_after_status := CASE
        WHEN v_lot_after_qty = 0 THEN 'DEPLETED'::public.lot_status_enum
        ELSE 'AVAILABLE'::public.lot_status_enum
      END;

      UPDATE public.warehouse_lots
      SET remaining_qty = v_lot_after_qty,
          status = v_lot_after_status
      WHERE id = v_lot.id;

      v_slice_line_total := ROUND(
        (CASE WHEN v_inv_item.base_unit = 'g' THEN v_take_qty / 1000.0 ELSE v_take_qty END)
        * v_titem.internal_unit_price_vnd::NUMERIC
      )::BIGINT;
      v_total_internal_vnd := v_total_internal_vnd + v_slice_line_total;

      IF v_is_first_slice THEN
        UPDATE public.internal_transfer_items
        SET source_lot_id = v_lot.id,
            dispatched_qty = v_take_qty,
            line_total_vnd = v_slice_line_total
        WHERE id = v_titem.id
        RETURNING * INTO v_updated_item;
        v_is_first_slice := FALSE;
      ELSE
        INSERT INTO public.internal_transfer_items (
          transfer_id,
          item_id,
          source_lot_id,
          requested_qty,
          dispatched_qty,
          received_qty,
          internal_unit_price_vnd,
          line_total_vnd
        )
        VALUES (
          p_transfer_id,
          v_titem.item_id,
          v_lot.id,
          v_take_qty,
          v_take_qty,
          0,
          v_titem.internal_unit_price_vnd,
          v_slice_line_total
        )
        RETURNING * INTO v_updated_item;
      END IF;

      v_dispatched_items := v_dispatched_items || jsonb_build_array(to_jsonb(v_updated_item));
      v_remaining_to_dispatch := v_remaining_to_dispatch - v_take_qty;
    END LOOP;

    IF v_remaining_to_dispatch > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_FIFO_STOCK: Warehouse % lacks % base units of SKU %',
        v_transfer.from_warehouse_id, v_remaining_to_dispatch, v_inv_item.sku;
    END IF;
  END LOOP;

  UPDATE public.internal_transfers
  SET status = 'IN_TRANSIT',
      total_internal_value_vnd = v_total_internal_vnd,
      dispatched_by = p_actor_id,
      dispatched_at = NOW(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_transfer_id
  RETURNING * INTO v_transfer;

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
    v_transfer.from_warehouse_id,
    'M3_INTERNAL_TRANSFER_DISPATCHED',
    'internal_transfers',
    v_transfer.id,
    COALESCE(p_notes, 'Phase 1 FIFO dispatch from Central Warehouse to Store'),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'transfer_code', v_transfer.transfer_code,
      'to_store_id', v_transfer.to_store_id,
      'total_internal_value_vnd', v_total_internal_vnd,
      'dispatched_items', v_dispatched_items
    )
  );

  RETURN jsonb_build_object(
    'transfer', to_jsonb(v_transfer),
    'items', v_dispatched_items
  );
END;
$$;

-- ============================================================================
-- SECTION 5: RPC 5 - PHASE 2 INTERNAL TRANSFER RECONCILE (IN_TRANSIT -> RECONCILED)
-- Creates Store Lots with unit_cost_vnd = internal_unit_price_vnd (ZERO MAC leak!)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m3_reconcile_internal_transfer(
  p_actor_id UUID,
  p_transfer_id UUID,
  p_received_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor RECORD;
  v_transfer public.internal_transfers%ROWTYPE;
  v_to_store_code TEXT;
  v_rec_input JSONB;
  v_transfer_item_id UUID;
  v_received_qty NUMERIC(12,2);
  v_titem public.internal_transfer_items%ROWTYPE;
  v_inv_item RECORD;
  v_source_lot public.warehouse_lots%ROWTYPE;
  v_dest_lot public.warehouse_lots%ROWTYPE;
  v_dest_lot_code TEXT;
  v_reconciled_line_total BIGINT;
  v_total_reconciled_vnd BIGINT := 0;
  v_reconciled_items JSONB := '[]'::jsonb;
  v_created_lots JSONB := '[]'::jsonb;
BEGIN
  SELECT *
    INTO v_transfer
  FROM public.internal_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Internal transfer % not found', p_transfer_id;
  END IF;

  SELECT id, role, assigned_store_id
    INTO v_actor
  FROM public.user_profiles
  WHERE id = p_actor_id
    AND is_active = TRUE;

  IF NOT FOUND OR (
    v_actor.role <> 'SUPER_ADMIN'
    AND NOT (v_actor.role = 'STORE_MANAGER' AND v_actor.assigned_store_id = v_transfer.to_store_id)
  ) THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Actor % is not allowed to reconcile transfer for store %',
      p_actor_id, v_transfer.to_store_id;
  END IF;

  IF v_transfer.status <> 'IN_TRANSIT' THEN
    RAISE EXCEPTION 'INVALID_TRANSFER_STATE: Transfer % has status %, expected IN_TRANSIT',
      v_transfer.transfer_code, v_transfer.status;
  END IF;

  IF p_received_items IS NULL OR jsonb_typeof(p_received_items) <> 'array' OR jsonb_array_length(p_received_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Reconcile payload must confirm at least 1 transfer item';
  END IF;

  SELECT code INTO v_to_store_code FROM public.stores WHERE id = v_transfer.to_store_id;

  FOR v_rec_input IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    v_transfer_item_id := (v_rec_input->>'transfer_item_id')::UUID;
    v_received_qty := (v_rec_input->>'received_qty')::NUMERIC(12,2);

    SELECT *
      INTO v_titem
    FROM public.internal_transfer_items
    WHERE id = v_transfer_item_id
      AND transfer_id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Transfer item % not found in transfer %', v_transfer_item_id, p_transfer_id;
    END IF;

    IF v_received_qty IS NULL OR v_received_qty < 0 OR v_received_qty > v_titem.dispatched_qty THEN
      RAISE EXCEPTION 'INVALID_RECEIVED_QTY: received_qty (%) must be between 0 and dispatched_qty (%)',
        v_received_qty, v_titem.dispatched_qty;
    END IF;

    SELECT id, base_unit INTO v_inv_item FROM public.inventory_items WHERE id = v_titem.item_id;
    SELECT * INTO v_source_lot FROM public.warehouse_lots WHERE id = v_titem.source_lot_id;

    v_reconciled_line_total := ROUND(
      (CASE WHEN v_inv_item.base_unit = 'g' THEN v_received_qty / 1000.0 ELSE v_received_qty END)
      * v_titem.internal_unit_price_vnd::NUMERIC
    )::BIGINT;
    v_total_reconciled_vnd := v_total_reconciled_vnd + v_reconciled_line_total;

    IF v_received_qty > 0 THEN
      v_dest_lot_code := v_to_store_code || '-' || v_transfer.transfer_code || '-' || SUBSTRING(v_titem.id::TEXT, 1, 6);

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
        v_transfer.to_store_id,
        v_titem.item_id,
        v_dest_lot_code,
        'Kho Tổng CF19 (Chuyển Nội Bộ)',
        v_source_lot.moisture_pct,
        v_source_lot.roast_date,
        NOW(),
        v_source_lot.expiry_date,
        v_received_qty,
        v_received_qty,
        v_titem.internal_unit_price_vnd, -- Strictly internal transfer price; origin MAC hidden!
        0,
        'AVAILABLE'
      )
      RETURNING * INTO v_dest_lot;

      UPDATE public.internal_transfer_items
      SET received_qty = v_received_qty,
          destination_lot_id = v_dest_lot.id,
          line_total_vnd = v_reconciled_line_total
      WHERE id = v_titem.id
      RETURNING * INTO v_titem;

      v_created_lots := v_created_lots || jsonb_build_array(to_jsonb(v_dest_lot));
    ELSE
      UPDATE public.internal_transfer_items
      SET received_qty = 0,
          line_total_vnd = 0
      WHERE id = v_titem.id
      RETURNING * INTO v_titem;
    END IF;

    v_reconciled_items := v_reconciled_items || jsonb_build_array(to_jsonb(v_titem));
  END LOOP;

  UPDATE public.internal_transfers
  SET status = 'RECONCILED',
      total_internal_value_vnd = v_total_reconciled_vnd,
      received_by = p_actor_id,
      received_at = NOW(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_transfer_id
  RETURNING * INTO v_transfer;

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
    v_transfer.to_store_id,
    'M3_INTERNAL_TRANSFER_RECONCILED',
    'internal_transfers',
    v_transfer.id,
    COALESCE(p_notes, 'Phase 2 store reconciliation completed'),
    jsonb_build_object(
      'transfer_code', v_transfer.transfer_code,
      'to_store_id', v_transfer.to_store_id,
      'total_internal_value_vnd', v_total_reconciled_vnd,
      'created_lot_count', jsonb_array_length(v_created_lots)
    )
  );

  RETURN jsonb_build_object(
    'transfer', to_jsonb(v_transfer),
    'items', v_reconciled_items,
    'created_store_lots', v_created_lots
  );
END;
$$;
