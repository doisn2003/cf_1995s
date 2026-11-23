-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0008_m7_olap_pnl_and_franchise_cloning.sql
-- Scope: M7.1 Super-Admin Exclusive OLAP P&L Consolidation (Separating Central
--        Warehouse vs. Retail/Franchise Store Nodes with Intercompany Transfer
--        Elimination) & 1-Click Atomic Franchise Store Cloning RPC.
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: STRICT SUPER_ADMIN-ONLY RBAC GUARD
-- ============================================================================

CREATE OR REPLACE FUNCTION public._m7_assert_super_admin(
  p_actor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role_enum;
  v_org_id UUID;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: actor_id is required for Executive OLAP and Franchise operations';
  END IF;

  SELECT up.role, up.organization_id
    INTO v_role, v_org_id
  FROM public.user_profiles up
  WHERE up.id = p_actor_id
    AND up.is_active = TRUE;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Active user profile % not found', p_actor_id;
  END IF;

  IF v_role <> 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'FORBIDDEN_ROLE: Only SUPER_ADMIN may access Consolidated Executive P&L or Franchise Store Cloning (actor role=%)',
      v_role;
  END IF;

  RETURN v_org_id;
END;
$$;

-- ============================================================================
-- SECTION 2: RPC 1 - EXECUTIVE OLAP P&L CONSOLIDATION (WAREHOUSE VS STORES)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m7_get_executive_pnl_consolidation(
  p_actor_id UUID,
  p_period_from DATE DEFAULT NULL,
  p_period_to DATE DEFAULT NULL,
  p_warehouse_operating_expense_vnd BIGINT DEFAULT 0,
  p_franchise_royalty_pct NUMERIC(5,2) DEFAULT 5.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_wh RECORD;
  v_b2b_external_revenue BIGINT := 0;
  v_b2b_raw_cogs BIGINT := 0;
  v_b2b_orders_count INTEGER := 0;
  v_internal_transfer_revenue BIGINT := 0;
  v_internal_transfer_raw_cogs BIGINT := 0;
  v_reconciled_transfers_count INTEGER := 0;
  v_b2b_gross_profit BIGINT := 0;
  v_internal_markup_profit BIGINT := 0;
  v_wh_total_revenue BIGINT := 0;
  v_wh_total_raw_cogs BIGINT := 0;
  v_wh_total_gross_profit BIGINT := 0;
  v_wh_opex BIGINT := GREATEST(0, COALESCE(p_warehouse_operating_expense_vnd, 0));
  v_wh_net_profit BIGINT := 0;
  v_wh_gross_margin NUMERIC(8,2) := 0;
  v_wh_net_margin NUMERIC(8,2) := 0;
  v_warehouse_json JSONB;

  v_store RECORD;
  v_cash_rev BIGINT;
  v_vietqr_rev BIGINT;
  v_paid_orders_cnt INTEGER;
  v_bom_cogs BIGINT;
  v_cash_shortage BIGINT;
  v_shrinkage_loss BIGINT;
  v_labor_cost BIGINT;
  v_pos_gross_rev BIGINT;
  v_store_gross_profit BIGINT;
  v_royalty_fee BIGINT;
  v_store_net_profit BIGINT;
  v_store_gross_margin NUMERIC(8,2);
  v_store_net_margin NUMERIC(8,2);
  v_stores_json JSONB := '[]'::jsonb;
  v_ranked_stores_json JSONB := '[]'::jsonb;

  v_total_store_pos_rev BIGINT := 0;
  v_total_store_net_profit BIGINT := 0;
  v_total_royalty_income BIGINT := 0;
  v_total_cash_shortage BIGINT := 0;
  v_total_shrinkage BIGINT := 0;
  v_consolidated_ext_rev BIGINT := 0;
  v_consolidated_net_profit BIGINT := 0;
  v_consolidated_net_margin NUMERIC(8,2) := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_org_id := public._m7_assert_super_admin(p_actor_id);

  IF p_period_from IS NOT NULL AND p_period_to IS NOT NULL AND p_period_to < p_period_from THEN
    RAISE EXCEPTION 'INVALID_PERIOD_RANGE: period_to (%) must be on or after period_from (%)',
      p_period_to, p_period_from;
  END IF;

  -- Locate Central Warehouse node
  SELECT s.id, s.code, s.name
    INTO v_wh
  FROM public.stores s
  WHERE s.organization_id = v_org_id
    AND s.type = 'CENTRAL_WAREHOUSE'
    AND s.is_active = TRUE
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF v_wh.id IS NULL THEN
    RAISE EXCEPTION 'WAREHOUSE_NOT_FOUND: No active CENTRAL_WAREHOUSE configured for organization %', v_org_id;
  END IF;

  -- 1A. Central Warehouse External B2B Revenue & Raw Origin COGS
  SELECT
    COALESCE(SUM(bo.total_amount_vnd), 0),
    COALESCE(SUM(bo.cogs_amount_vnd), 0),
    COUNT(*)
  INTO
    v_b2b_external_revenue,
    v_b2b_raw_cogs,
    v_b2b_orders_count
  FROM public.b2b_orders bo
  WHERE bo.warehouse_store_id = v_wh.id
    AND bo.payment_status <> 'VOIDED'
    AND (p_period_from IS NULL OR bo.created_at::DATE >= p_period_from)
    AND (p_period_to IS NULL OR bo.created_at::DATE <= p_period_to);

  -- 1B. Central Warehouse Reconciled Internal Transfers (Intercompany Revenue vs Raw Origin COGS)
  SELECT
    COALESCE(SUM(it.total_internal_value_vnd), 0),
    COUNT(*)
  INTO
    v_internal_transfer_revenue,
    v_reconciled_transfers_count
  FROM public.internal_transfers it
  WHERE it.from_warehouse_id = v_wh.id
    AND it.status = 'RECONCILED'
    AND (p_period_from IS NULL OR COALESCE(it.received_at, it.requested_at)::DATE >= p_period_from)
    AND (p_period_to IS NULL OR COALESCE(it.received_at, it.requested_at)::DATE <= p_period_to);

  SELECT
    COALESCE(
      SUM(
        ROUND(
          CASE
            WHEN ii.base_unit = 'g'
              THEN (iti.received_qty / 1000.0) * COALESCE(wl.unit_cost_vnd, ii.moving_avg_cost_vnd)
            ELSE iti.received_qty * COALESCE(wl.unit_cost_vnd, ii.moving_avg_cost_vnd)
          END
        )
      ),
      0
    )::BIGINT
  INTO v_internal_transfer_raw_cogs
  FROM public.internal_transfers it
  JOIN public.internal_transfer_items iti ON iti.transfer_id = it.id
  JOIN public.inventory_items ii ON ii.id = iti.item_id
  LEFT JOIN public.warehouse_lots wl ON wl.id = iti.source_lot_id
  WHERE it.from_warehouse_id = v_wh.id
    AND it.status = 'RECONCILED'
    AND (p_period_from IS NULL OR COALESCE(it.received_at, it.requested_at)::DATE >= p_period_from)
    AND (p_period_to IS NULL OR COALESCE(it.received_at, it.requested_at)::DATE <= p_period_to);

  v_b2b_gross_profit := v_b2b_external_revenue - v_b2b_raw_cogs;
  v_internal_markup_profit := v_internal_transfer_revenue - v_internal_transfer_raw_cogs;
  v_wh_total_revenue := v_b2b_external_revenue + v_internal_transfer_revenue;
  v_wh_total_raw_cogs := v_b2b_raw_cogs + v_internal_transfer_raw_cogs;
  v_wh_total_gross_profit := v_b2b_gross_profit + v_internal_markup_profit;
  v_wh_net_profit := v_wh_total_gross_profit - v_wh_opex;

  IF v_wh_total_revenue > 0 THEN
    v_wh_gross_margin := ROUND((v_wh_total_gross_profit::NUMERIC / v_wh_total_revenue::NUMERIC) * 100.0, 2);
    v_wh_net_margin := ROUND((v_wh_net_profit::NUMERIC / v_wh_total_revenue::NUMERIC) * 100.0, 2);
  END IF;

  v_warehouse_json := jsonb_build_object(
    'warehouse_store_id', v_wh.id,
    'warehouse_code', v_wh.code,
    'warehouse_name', v_wh.name,
    'b2b_orders_count', v_b2b_orders_count,
    'reconciled_transfers_count', v_reconciled_transfers_count,
    'b2b_external_revenue_vnd', v_b2b_external_revenue,
    'b2b_raw_cogs_vnd', v_b2b_raw_cogs,
    'b2b_external_gross_profit_vnd', v_b2b_gross_profit,
    'internal_transfer_revenue_vnd', v_internal_transfer_revenue,
    'internal_transfer_raw_cogs_vnd', v_internal_transfer_raw_cogs,
    'internal_markup_profit_vnd', v_internal_markup_profit,
    'warehouse_total_revenue_vnd', v_wh_total_revenue,
    'warehouse_total_raw_cogs_vnd', v_wh_total_raw_cogs,
    'warehouse_total_gross_profit_vnd', v_wh_total_gross_profit,
    'warehouse_operating_expense_vnd', v_wh_opex,
    'warehouse_net_profit_vnd', v_wh_net_profit,
    'warehouse_gross_margin_pct', v_wh_gross_margin,
    'warehouse_net_margin_pct', v_wh_net_margin
  );

  -- 2. Iterate every RETAIL_STORE & FRANCHISE_STORE Node
  FOR v_store IN
    SELECT s.id, s.code, s.name, s.type, s.price_multiplier
    FROM public.stores s
    WHERE s.organization_id = v_org_id
      AND s.type IN ('RETAIL_STORE', 'FRANCHISE_STORE')
      AND s.is_active = TRUE
    ORDER BY s.code ASC
  LOOP
    SELECT
      COALESCE(SUM(po.total_amount_vnd) FILTER (WHERE po.payment_method = 'CASH'), 0),
      COALESCE(SUM(po.total_amount_vnd) FILTER (WHERE po.payment_method = 'VIETQR'), 0),
      COALESCE(SUM(po.cogs_amount_vnd), 0),
      COUNT(*)
    INTO
      v_cash_rev,
      v_vietqr_rev,
      v_bom_cogs,
      v_paid_orders_cnt
    FROM public.pos_orders po
    WHERE po.store_id = v_store.id
      AND po.payment_status = 'PAID'
      AND (p_period_from IS NULL OR po.created_at::DATE >= p_period_from)
      AND (p_period_to IS NULL OR po.created_at::DATE <= p_period_to);

    -- Blind shift cash shortage losses (negative variance_cash_vnd)
    SELECT COALESCE(SUM(ABS(ps.variance_cash_vnd)), 0)::BIGINT
      INTO v_cash_shortage
    FROM public.pos_shifts ps
    WHERE ps.store_id = v_store.id
      AND ps.status = 'CLOSED'
      AND ps.variance_cash_vnd < 0
      AND (p_period_from IS NULL OR ps.closed_at::DATE >= p_period_from)
      AND (p_period_to IS NULL OR ps.closed_at::DATE <= p_period_to);

    -- EOD Stocktake shrinkage losses (negative variance_qty * internal transfer price)
    SELECT
      COALESCE(
        SUM(
          ROUND(
            CASE
              WHEN ii.base_unit = 'g'
                THEN (ABS(st.variance_qty) / 1000.0) * ii.internal_transfer_price_vnd
              ELSE ABS(st.variance_qty) * ii.internal_transfer_price_vnd
            END
          )
        ),
        0
      )::BIGINT
    INTO v_shrinkage_loss
    FROM public.store_daily_stocktakes st
    JOIN public.inventory_items ii ON ii.id = st.inventory_item_id
    WHERE st.store_id = v_store.id
      AND st.variance_qty < 0
      AND (p_period_from IS NULL OR st.stocktake_date >= p_period_from)
      AND (p_period_to IS NULL OR st.stocktake_date <= p_period_to);

    -- Estimated shift labor cost based on staff hourly_rate_vnd * shift duration hours
    SELECT
      COALESCE(
        SUM(
          ROUND(
            GREATEST(
              1.0,
              EXTRACT(EPOCH FROM (COALESCE(ps.closed_at, v_now) - ps.opened_at)) / 3600.0
            ) * up.hourly_rate_vnd
          )
        ),
        0
      )::BIGINT
    INTO v_labor_cost
    FROM public.pos_shifts ps
    JOIN public.user_profiles up ON up.id = ps.cashier_id
    WHERE ps.store_id = v_store.id
      AND (p_period_from IS NULL OR ps.opened_at::DATE >= p_period_from)
      AND (p_period_to IS NULL OR ps.opened_at::DATE <= p_period_to);

    v_pos_gross_rev := v_cash_rev + v_vietqr_rev;
    v_store_gross_profit := v_pos_gross_rev - v_bom_cogs;

    IF v_store.type = 'FRANCHISE_STORE' THEN
      v_royalty_fee := ROUND((v_pos_gross_rev::NUMERIC * COALESCE(p_franchise_royalty_pct, 5.0)) / 100.0)::BIGINT;
    ELSE
      v_royalty_fee := 0;
    END IF;

    v_store_net_profit :=
      v_store_gross_profit
      - v_labor_cost
      - v_cash_shortage
      - v_shrinkage_loss
      - v_royalty_fee;

    IF v_pos_gross_rev > 0 THEN
      v_store_gross_margin := ROUND((v_store_gross_profit::NUMERIC / v_pos_gross_rev::NUMERIC) * 100.0, 2);
      v_store_net_margin := ROUND((v_store_net_profit::NUMERIC / v_pos_gross_rev::NUMERIC) * 100.0, 2);
    ELSE
      v_store_gross_margin := 0;
      v_store_net_margin := 0;
    END IF;

    v_total_store_pos_rev := v_total_store_pos_rev + v_pos_gross_rev;
    v_total_store_net_profit := v_total_store_net_profit + v_store_net_profit;
    v_total_royalty_income := v_total_royalty_income + v_royalty_fee;
    v_total_cash_shortage := v_total_cash_shortage + v_cash_shortage;
    v_total_shrinkage := v_total_shrinkage + v_shrinkage_loss;

    v_stores_json := v_stores_json || jsonb_build_array(
      jsonb_build_object(
        'store_id', v_store.id,
        'store_code', v_store.code,
        'store_name', v_store.name,
        'store_type', v_store.type,
        'price_multiplier', v_store.price_multiplier,
        'paid_orders_count', v_paid_orders_cnt,
        'cash_revenue_vnd', v_cash_rev,
        'vietqr_revenue_vnd', v_vietqr_rev,
        'pos_gross_revenue_vnd', v_pos_gross_rev,
        'store_internal_bom_cogs_vnd', v_bom_cogs,
        'store_gross_profit_vnd', v_store_gross_profit,
        'labor_cost_vnd', v_labor_cost,
        'cash_shortage_loss_vnd', v_cash_shortage,
        'stocktake_shrinkage_loss_vnd', v_shrinkage_loss,
        'franchise_royalty_fee_vnd', v_royalty_fee,
        'store_net_profit_vnd', v_store_net_profit,
        'gross_margin_pct', v_store_gross_margin,
        'net_margin_pct', v_store_net_margin
      )
    );
  END LOOP;

  -- Sort stores by store_net_profit_vnd DESC for Executive Leaderboard
  SELECT COALESCE(
    jsonb_agg(
      elem || jsonb_build_object('rank', rn)
      ORDER BY rn ASC
    ),
    '[]'::jsonb
  )
  INTO v_ranked_stores_json
  FROM (
    SELECT
      elem,
      ROW_NUMBER() OVER (
        ORDER BY
          (elem->>'store_net_profit_vnd')::BIGINT DESC,
          (elem->>'pos_gross_revenue_vnd')::BIGINT DESC,
          (elem->>'store_code') ASC
      ) AS rn
    FROM jsonb_array_elements(v_stores_json) AS elem
  ) ranked;

  v_consolidated_ext_rev := v_b2b_external_revenue + v_total_store_pos_rev;
  v_consolidated_net_profit := v_wh_net_profit + v_total_store_net_profit + v_total_royalty_income;

  IF v_consolidated_ext_rev > 0 THEN
    v_consolidated_net_margin := ROUND(
      (v_consolidated_net_profit::NUMERIC / v_consolidated_ext_rev::NUMERIC) * 100.0,
      2
    );
  END IF;

  RETURN jsonb_build_object(
    'period_from', p_period_from,
    'period_to', p_period_to,
    'generated_at', v_now,
    'warehouse', v_warehouse_json,
    'stores', v_ranked_stores_json,
    'total_store_pos_revenue_vnd', v_total_store_pos_rev,
    'total_store_net_profit_vnd', v_total_store_net_profit,
    'total_franchise_royalty_income_vnd', v_total_royalty_income,
    'total_cash_shortage_loss_vnd', v_total_cash_shortage,
    'total_stocktake_shrinkage_loss_vnd', v_total_shrinkage,
    'consolidated_external_revenue_vnd', v_consolidated_ext_rev,
    'intercompany_eliminated_revenue_vnd', v_internal_transfer_revenue,
    'consolidated_net_profit_vnd', v_consolidated_net_profit,
    'consolidated_net_margin_pct', v_consolidated_net_margin
  );
END;
$$;

-- ============================================================================
-- SECTION 3: RPC 2 - 1-CLICK ATOMIC FRANCHISE STORE CLONING ENGINE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m7_clone_franchise_store(
  p_actor_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_store_type public.store_type_enum,
  p_address TEXT,
  p_phone TEXT DEFAULT NULL,
  p_price_multiplier NUMERIC(5,2) DEFAULT 1.00,
  p_opening_cash_vnd BIGINT DEFAULT 2000000,
  p_create_starter_transfer BOOLEAN DEFAULT TRUE,
  p_starter_coffee_qty_g NUMERIC(12,2) DEFAULT 10000,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_clean_code TEXT;
  v_new_store_id UUID;
  v_new_shift_id UUID;
  v_wh_id UUID;
  v_coffee_item RECORD;
  v_transfer_id UUID := NULL;
  v_transfer_code TEXT := NULL;
  v_transfer_value BIGINT := 0;
  v_menu_preview JSONB := '[]'::jsonb;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_org_id := public._m7_assert_super_admin(p_actor_id);

  IF p_store_type NOT IN ('RETAIL_STORE', 'FRANCHISE_STORE') THEN
    RAISE EXCEPTION 'INVALID_STORE_TYPE: Cloned branch must be RETAIL_STORE or FRANCHISE_STORE';
  END IF;

  IF p_price_multiplier IS NULL OR p_price_multiplier < 0.50 OR p_price_multiplier > 3.00 THEN
    RAISE EXCEPTION 'INVALID_PRICE_MULTIPLIER: price_multiplier must be between 0.50 and 3.00';
  END IF;

  v_clean_code := UPPER(TRIM(COALESCE(p_code, '')));
  IF v_clean_code !~ '^[A-Z0-9_-]{3,32}$' THEN
    RAISE EXCEPTION 'INVALID_STORE_CODE: Store code must be 3-32 uppercase alphanumeric/hyphen/underscore characters';
  END IF;

  IF EXISTS (SELECT 1 FROM public.stores WHERE code = v_clean_code) THEN
    RAISE EXCEPTION 'STORE_CODE_ALREADY_EXISTS: Store code % already exists', v_clean_code;
  END IF;

  -- Step 1: Create New Store Branch
  INSERT INTO public.stores (
    organization_id,
    code,
    name,
    type,
    address,
    phone,
    price_multiplier,
    is_active
  )
  VALUES (
    v_org_id,
    v_clean_code,
    TRIM(p_name),
    p_store_type,
    TRIM(p_address),
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    p_price_multiplier,
    TRUE
  )
  RETURNING id INTO v_new_store_id;

  -- Step 2: Open Inaugural POS Shift (satisfies chk_blind_shift_open_nulls)
  INSERT INTO public.pos_shifts (
    store_id,
    cashier_id,
    opening_cash_vnd,
    status,
    notes
  )
  VALUES (
    v_new_store_id,
    p_actor_id,
    GREATEST(0, COALESCE(p_opening_cash_vnd, 2000000)),
    'OPEN',
    COALESCE(NULLIF(TRIM(p_notes), ''), 'Ca khai trương khởi tạo tự động (1-Click Franchise Clone)')
  )
  RETURNING id INTO v_new_shift_id;

  -- Step 3: Optionally Create Starter Replenishment Transfer Request from Central Warehouse
  IF COALESCE(p_create_starter_transfer, TRUE) THEN
    SELECT s.id INTO v_wh_id
    FROM public.stores s
    WHERE s.organization_id = v_org_id
      AND s.type = 'CENTRAL_WAREHOUSE'
      AND s.is_active = TRUE
    ORDER BY s.created_at ASC
    LIMIT 1;

    SELECT ii.id, ii.internal_transfer_price_vnd
      INTO v_coffee_item
    FROM public.inventory_items ii
    WHERE ii.organization_id = v_org_id
      AND ii.category = 'ROASTED_COFFEE'
      AND ii.is_active = TRUE
    ORDER BY ii.sku ASC
    LIMIT 1;

    IF v_wh_id IS NOT NULL AND v_coffee_item.id IS NOT NULL AND COALESCE(p_starter_coffee_qty_g, 10000) > 0 THEN
      v_transfer_code := 'TRF-INIT-' || v_clean_code || '-' || TO_CHAR(v_now, 'YYYYMMDD');
      v_transfer_value := ROUND((p_starter_coffee_qty_g / 1000.0) * v_coffee_item.internal_transfer_price_vnd)::BIGINT;

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
        v_transfer_code,
        v_wh_id,
        v_new_store_id,
        'REQUESTED',
        v_transfer_value,
        p_actor_id,
        'Phiếu xin cấp hàng khai trương tự động cho chi nhánh ' || v_clean_code
      )
      RETURNING id INTO v_transfer_id;

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
        v_transfer_id,
        v_coffee_item.id,
        p_starter_coffee_qty_g,
        0,
        0,
        v_coffee_item.internal_transfer_price_vnd,
        v_transfer_value
      );
    END IF;
  END IF;

  -- Step 4: Build Cloned Master Menu Price Preview Table with Estimated BOM Gross Margin
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_id', mp.id,
        'product_code', mp.code,
        'product_name', mp.name,
        'master_base_price_vnd', mp.base_price_vnd,
        'cloned_base_price_vnd', ROUND(mp.base_price_vnd * p_price_multiplier)::BIGINT,
        'price_diff_vnd', ROUND(mp.base_price_vnd * p_price_multiplier)::BIGINT - mp.base_price_vnd,
        'default_variant_bom_cogs_vnd', COALESCE(bom_cost.cogs_vnd, 0),
        'estimated_gross_profit_vnd',
          ROUND(mp.base_price_vnd * p_price_multiplier)::BIGINT - COALESCE(bom_cost.cogs_vnd, 0),
        'estimated_gross_margin_pct',
          CASE
            WHEN ROUND(mp.base_price_vnd * p_price_multiplier) <= 0 THEN 0
            ELSE ROUND(
              (
                (ROUND(mp.base_price_vnd * p_price_multiplier) - COALESCE(bom_cost.cogs_vnd, 0))::NUMERIC
                / ROUND(mp.base_price_vnd * p_price_multiplier)::NUMERIC
              ) * 100.0,
              2
            )
          END
      )
      ORDER BY mp.code ASC
    ),
    '[]'::jsonb
  )
  INTO v_menu_preview
  FROM public.menu_products mp
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
        SUM(
          ROUND(
            CASE
              WHEN ii.base_unit = 'g'
                THEN ((bri.quantity_per_cup_base_unit * (1 + bri.wastage_allowance_pct / 100.0)) / 1000.0) * ii.internal_transfer_price_vnd
              ELSE (bri.quantity_per_cup_base_unit * (1 + bri.wastage_allowance_pct / 100.0)) * ii.internal_transfer_price_vnd
            END
          )
        ),
        0
      )::BIGINT AS cogs_vnd
    FROM public.menu_variants mv
    JOIN public.bom_recipes br
      ON br.product_id = mp.id
     AND br.variant_id = mv.id
     AND br.is_active = TRUE
    JOIN public.bom_recipe_items bri ON bri.recipe_id = br.id
    JOIN public.inventory_items ii ON ii.id = bri.inventory_item_id
    WHERE mv.product_id = mp.id
      AND mv.is_default = TRUE
  ) bom_cost ON TRUE
  WHERE mp.organization_id = v_org_id
    AND mp.is_active = TRUE;

  -- Step 5: Write Immutable Audit Log
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
    v_new_store_id,
    'FRANCHISE_STORE_CLONED',
    'stores',
    v_new_store_id,
    'Cloned store ' || v_clean_code || ' (' || p_store_type::TEXT || ') with price_multiplier=' || p_price_multiplier::TEXT,
    jsonb_build_object(
      'store_code', v_clean_code,
      'store_type', p_store_type,
      'price_multiplier', p_price_multiplier,
      'opening_shift_id', v_new_shift_id,
      'starter_transfer_id', v_transfer_id,
      'starter_transfer_code', v_transfer_code
    )
  );

  RETURN jsonb_build_object(
    'store', jsonb_build_object(
      'id', v_new_store_id,
      'organization_id', v_org_id,
      'code', v_clean_code,
      'name', TRIM(p_name),
      'type', p_store_type,
      'address', TRIM(p_address),
      'phone', NULLIF(TRIM(COALESCE(p_phone, '')), ''),
      'price_multiplier', p_price_multiplier,
      'is_active', TRUE,
      'created_at', v_now,
      'updated_at', v_now
    ),
    'opening_shift_id', v_new_shift_id,
    'starter_transfer', CASE
      WHEN v_transfer_id IS NOT NULL THEN jsonb_build_object(
        'transfer_id', v_transfer_id,
        'transfer_code', v_transfer_code,
        'status', 'REQUESTED',
        'total_internal_value_vnd', v_transfer_value
      )
      ELSE NULL
    END,
    'cloned_menu_preview', v_menu_preview,
    'cloned_at', v_now
  );
END;
$$;
