-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql
-- Scope: M4.1 Atomic PL/pgSQL RPCs for Store POS Catalog (with Regional Price
--        Multiplier), POS Order Creation (Modifier Matrix + Multi-level BOM
--        COGS + Idempotent client_order_code), and Offline Batch Sync Engine.
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INTERNAL RBAC & MULTI-TENANT GUARD FOR STORE POS OPERATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public._m4_assert_store_pos_actor(
  p_actor_id UUID,
  p_store_id UUID,
  p_allow_barista BOOLEAN DEFAULT FALSE
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
    RAISE EXCEPTION 'SECURITY_VIOLATION: actor_id is required for store POS operations';
  END IF;

  SELECT up.role, up.assigned_store_id
    INTO v_role, v_assigned_store_id
  FROM public.user_profiles up
  WHERE up.id = p_actor_id
    AND up.is_active = TRUE;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Active user profile % not found', p_actor_id;
  END IF;

  IF v_role = 'WAREHOUSE_MANAGER' THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: WAREHOUSE_MANAGER cannot access retail store POS';
  END IF;

  IF v_role = 'BARISTA_KDS' AND NOT COALESCE(p_allow_barista, FALSE) THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: BARISTA_KDS cannot create or sync POS orders';
  END IF;

  SELECT s.type
    INTO v_store_type
  FROM public.stores s
  WHERE s.id = p_store_id
    AND s.is_active = TRUE;

  IF v_store_type IS NULL OR v_store_type = 'CENTRAL_WAREHOUSE' THEN
    RAISE EXCEPTION 'DOMAIN_VIOLATION: Store % must be an active retail or franchise store', p_store_id;
  END IF;

  IF v_role <> 'SUPER_ADMIN' AND v_assigned_store_id <> p_store_id THEN
    RAISE EXCEPTION 'FORBIDDEN_CROSS_TENANT_ACCESS: Actor % is restricted to store %, cannot operate on store %',
      p_actor_id, v_assigned_store_id, p_store_id;
  END IF;

  RETURN v_role;
END;
$$;

-- ============================================================================
-- SECTION 2: RPC 1 - GET STORE POS CATALOG WITH REGIONAL PRICE MULTIPLIER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m4_get_store_pos_catalog(
  p_actor_id UUID,
  p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_categories JSONB;
  v_products JSONB;
  v_modifiers JSONB;
  v_bom_recipes JSONB;
BEGIN
  PERFORM public._m4_assert_store_pos_actor(p_actor_id, p_store_id, TRUE);

  SELECT id, organization_id, code, name, type, price_multiplier
    INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', mc.id,
        'code', mc.code,
        'name', mc.name,
        'sort_order', mc.sort_order
      )
      ORDER BY mc.sort_order ASC, mc.name ASC
    ),
    '[]'::jsonb
  )
    INTO v_categories
  FROM public.menu_categories mc
  WHERE mc.organization_id = v_store.organization_id
    AND mc.is_active = TRUE;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', mp.id,
        'category_id', mp.category_id,
        'code', mp.code,
        'name', mp.name,
        'base_price_vnd', mp.base_price_vnd,
        'effective_base_price_vnd', ROUND(mp.base_price_vnd::NUMERIC * v_store.price_multiplier)::BIGINT,
        'variants', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', mv.id,
                'product_id', mv.product_id,
                'size_code', mv.size_code,
                'name', mv.name,
                'price_delta_vnd', mv.price_delta_vnd,
                'is_default', mv.is_default,
                'is_active', mv.is_active
              )
              ORDER BY mv.price_delta_vnd ASC, mv.size_code ASC
            ),
            '[]'::jsonb
          )
          FROM public.menu_variants mv
          WHERE mv.product_id = mp.id
            AND mv.is_active = TRUE
        )
      )
      ORDER BY mp.code ASC
    ),
    '[]'::jsonb
  )
    INTO v_products
  FROM public.menu_products mp
  WHERE mp.organization_id = v_store.organization_id
    AND mp.is_active = TRUE;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', mm.id,
        'organization_id', mm.organization_id,
        'code', mm.code,
        'modifier_group', mm.modifier_group,
        'name', mm.name,
        'price_delta_vnd', mm.price_delta_vnd,
        'inventory_item_id', mm.inventory_item_id,
        'bom_qty_base_unit', mm.bom_qty_base_unit,
        'is_active', mm.is_active
      )
      ORDER BY mm.modifier_group ASC, mm.code ASC
    ),
    '[]'::jsonb
  )
    INTO v_modifiers
  FROM public.menu_modifiers mm
  WHERE mm.organization_id = v_store.organization_id
    AND mm.is_active = TRUE;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', br.id,
        'product_id', br.product_id,
        'variant_id', br.variant_id,
        'version', br.version,
        'items', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'inventory_item_id', bri.inventory_item_id,
                'sku', ii.sku,
                'name', ii.name,
                'base_unit', ii.base_unit,
                'quantity_per_cup_base_unit', bri.quantity_per_cup_base_unit,
                'wastage_allowance_pct', bri.wastage_allowance_pct,
                'internal_transfer_price_vnd', ii.internal_transfer_price_vnd
              )
            ),
            '[]'::jsonb
          )
          FROM public.bom_recipe_items bri
          INNER JOIN public.inventory_items ii ON ii.id = bri.inventory_item_id
          WHERE bri.recipe_id = br.id
        )
      )
    ),
    '[]'::jsonb
  )
    INTO v_bom_recipes
  FROM public.bom_recipes br
  WHERE br.is_active = TRUE;

  RETURN jsonb_build_object(
    'store', jsonb_build_object(
      'id', v_store.id,
      'code', v_store.code,
      'name', v_store.name,
      'price_multiplier', v_store.price_multiplier
    ),
    'categories', v_categories,
    'products', v_products,
    'modifiers', v_modifiers,
    'bom_recipes', v_bom_recipes
  );
END;
$$;

-- ============================================================================
-- SECTION 3: RPC 2 - ATOMIC POS ORDER CREATION (IDEMPOTENT + MODIFIER MATRIX + BOM COGS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m4_create_pos_order(
  p_actor_id UUID,
  p_store_id UUID,
  p_shift_id UUID,
  p_payment_method public.payment_method_enum,
  p_items JSONB,
  p_customer_phone TEXT DEFAULT NULL,
  p_client_order_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role public.user_role_enum;
  v_store RECORD;
  v_shift public.pos_shifts%ROWTYPE;
  v_existing_order public.pos_orders%ROWTYPE;
  v_existing_items JSONB;
  v_order_code TEXT;
  v_order_id UUID;
  v_vietqr_ref TEXT;
  v_payment_status public.payment_status_enum;
  v_order public.pos_orders%ROWTYPE;
  v_item_input JSONB;
  v_product RECORD;
  v_variant RECORD;
  v_qty INTEGER;
  v_mod_ids UUID[];
  v_sugar_count INTEGER;
  v_ice_count INTEGER;
  v_mod_price_sum BIGINT;
  v_mod_json JSONB;
  v_eff_base_price BIGINT;
  v_unit_price BIGINT;
  v_line_total BIGINT;
  v_total_amount_vnd BIGINT := 0;
  v_total_cogs_vnd BIGINT := 0;
  v_bom_row RECORD;
  v_mod_row RECORD;
  v_req_qty NUMERIC(12,2);
  v_billing_qty NUMERIC(12,4);
  v_created_items JSONB := '[]'::jsonb;
  v_created_item public.pos_order_items%ROWTYPE;
BEGIN
  v_actor_role := public._m4_assert_store_pos_actor(p_actor_id, p_store_id, FALSE);

  SELECT id, code, name, price_multiplier
    INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  -- Idempotency check for offline-first replay by client_order_code
  IF p_client_order_code IS NOT NULL AND LENGTH(TRIM(p_client_order_code)) > 0 THEN
    SELECT *
      INTO v_existing_order
    FROM public.pos_orders
    WHERE order_code = TRIM(p_client_order_code)
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing_order.store_id <> p_store_id THEN
        RAISE EXCEPTION 'FORBIDDEN_CROSS_TENANT_ACCESS: client_order_code % belongs to another store', p_client_order_code;
      END IF;

      SELECT COALESCE(jsonb_agg(to_jsonb(poi) ORDER BY poi.created_at ASC), '[]'::jsonb)
        INTO v_existing_items
      FROM public.pos_order_items poi
      WHERE poi.order_id = v_existing_order.id;

      RETURN jsonb_build_object(
        'sync_status', 'IDEMPOTENT_EXISTING',
        'order', to_jsonb(v_existing_order),
        'items', v_existing_items
      );
    END IF;
  END IF;

  -- Verify active OPEN shift for this store
  SELECT *
    INTO v_shift
  FROM public.pos_shifts
  WHERE id = p_shift_id
    AND store_id = p_store_id
    AND status = 'OPEN'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHIFT_NOT_OPEN: Shift % is not OPEN for store %', p_shift_id, p_store_id;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: POS order must contain at least 1 item';
  END IF;

  v_order_id := gen_random_uuid();
  v_order_code := COALESCE(
    NULLIF(TRIM(p_client_order_code), ''),
    'POS-' || REPLACE(v_store.code, '-', '') || '-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS') || '-' || UPPER(SUBSTRING(v_order_id::TEXT, 1, 4))
  );

  v_payment_status := CASE
    WHEN p_payment_method = 'CASH' THEN 'PAID'::public.payment_status_enum
    ELSE 'PENDING'::public.payment_status_enum
  END;

  v_vietqr_ref := CASE
    WHEN p_payment_method = 'VIETQR'
    THEN 'CF19' || REPLACE(v_store.code, '-', '') || UPPER(SUBSTRING(REPLACE(v_order_id::TEXT, '-', ''), 1, 8))
    ELSE NULL
  END;

  INSERT INTO public.pos_orders (
    id,
    order_code,
    store_id,
    shift_id,
    cashier_id,
    customer_phone,
    payment_method,
    payment_status,
    kds_status,
    vietqr_ref_code,
    total_amount_vnd,
    cogs_amount_vnd
  )
  VALUES (
    v_order_id,
    v_order_code,
    p_store_id,
    p_shift_id,
    p_actor_id,
    NULLIF(TRIM(COALESCE(p_customer_phone, '')), ''),
    p_payment_method,
    v_payment_status,
    'QUEUED',
    v_vietqr_ref,
    0,
    0
  )
  RETURNING * INTO v_order;

  FOR v_item_input IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item_input->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Item quantity must be a positive integer';
    END IF;

    SELECT id, base_price_vnd
      INTO v_product
    FROM public.menu_products
    WHERE id = (v_item_input->>'product_id')::UUID
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Active menu product % not found', v_item_input->>'product_id';
    END IF;

    SELECT id, price_delta_vnd
      INTO v_variant
    FROM public.menu_variants
    WHERE id = (v_item_input->>'variant_id')::UUID
      AND product_id = v_product.id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Active menu variant % not found for product', v_item_input->>'variant_id';
    END IF;

    SELECT COALESCE(ARRAY_AGG(val::UUID), ARRAY[]::UUID[])
      INTO v_mod_ids
    FROM jsonb_array_elements_text(COALESCE(v_item_input->'modifier_ids', '[]'::jsonb)) AS val;

    -- Validate Modifier Matrix: max 1 SUGAR, max 1 ICE
    SELECT
      COUNT(*) FILTER (WHERE modifier_group = 'SUGAR'),
      COUNT(*) FILTER (WHERE modifier_group = 'ICE'),
      COALESCE(SUM(price_delta_vnd), 0),
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'price_delta_vnd', price_delta_vnd
          )
        ),
        '[]'::jsonb
      )
      INTO v_sugar_count, v_ice_count, v_mod_price_sum, v_mod_json
    FROM public.menu_modifiers
    WHERE id = ANY(v_mod_ids)
      AND is_active = TRUE;

    IF v_sugar_count > 1 THEN
      RAISE EXCEPTION 'MODIFIER_MATRIX_VIOLATION: Maximum 1 SUGAR modifier allowed per drink line';
    END IF;
    IF v_ice_count > 1 THEN
      RAISE EXCEPTION 'MODIFIER_MATRIX_VIOLATION: Maximum 1 ICE modifier allowed per drink line';
    END IF;

    v_eff_base_price := ROUND(v_product.base_price_vnd::NUMERIC * v_store.price_multiplier)::BIGINT;
    v_unit_price := v_eff_base_price + v_variant.price_delta_vnd + v_mod_price_sum;
    v_line_total := v_unit_price * v_qty;
    v_total_amount_vnd := v_total_amount_vnd + v_line_total;

    -- Tier 1 BOM COGS (Recipe items + wastage allowance)
    FOR v_bom_row IN
      SELECT
        bri.quantity_per_cup_base_unit,
        bri.wastage_allowance_pct,
        ii.base_unit,
        ii.internal_transfer_price_vnd
      FROM public.bom_recipes br
      INNER JOIN public.bom_recipe_items bri ON bri.recipe_id = br.id
      INNER JOIN public.inventory_items ii ON ii.id = bri.inventory_item_id
      WHERE br.product_id = v_product.id
        AND br.variant_id = v_variant.id
        AND br.is_active = TRUE
    LOOP
      v_req_qty := ROUND(
        v_qty::NUMERIC * v_bom_row.quantity_per_cup_base_unit * (1.0 + v_bom_row.wastage_allowance_pct / 100.0),
        2
      );
      v_billing_qty := CASE WHEN v_bom_row.base_unit = 'g' THEN v_req_qty / 1000.0 ELSE v_req_qty END;
      v_total_cogs_vnd := v_total_cogs_vnd + ROUND(v_billing_qty * v_bom_row.internal_transfer_price_vnd::NUMERIC)::BIGINT;
    END LOOP;

    -- Tier 2 BOM COGS (Modifier linked inventory items)
    FOR v_mod_row IN
      SELECT
        mm.bom_qty_base_unit,
        ii.base_unit,
        ii.internal_transfer_price_vnd
      FROM public.menu_modifiers mm
      INNER JOIN public.inventory_items ii ON ii.id = mm.inventory_item_id
      WHERE mm.id = ANY(v_mod_ids)
        AND mm.is_active = TRUE
        AND mm.inventory_item_id IS NOT NULL
        AND mm.bom_qty_base_unit > 0
    LOOP
      v_req_qty := ROUND(v_qty::NUMERIC * v_mod_row.bom_qty_base_unit, 2);
      v_billing_qty := CASE WHEN v_mod_row.base_unit = 'g' THEN v_req_qty / 1000.0 ELSE v_req_qty END;
      v_total_cogs_vnd := v_total_cogs_vnd + ROUND(v_billing_qty * v_mod_row.internal_transfer_price_vnd::NUMERIC)::BIGINT;
    END LOOP;

    INSERT INTO public.pos_order_items (
      order_id,
      store_id,
      product_id,
      variant_id,
      modifiers_json,
      quantity,
      unit_price_vnd,
      line_total_vnd,
      notes
    )
    VALUES (
      v_order_id,
      p_store_id,
      v_product.id,
      v_variant.id,
      v_mod_json,
      v_qty,
      v_unit_price,
      v_line_total,
      NULLIF(TRIM(COALESCE(v_item_input->>'notes', '')), '')
    )
    RETURNING * INTO v_created_item;

    v_created_items := v_created_items || jsonb_build_array(to_jsonb(v_created_item));
  END LOOP;

  UPDATE public.pos_orders
  SET total_amount_vnd = v_total_amount_vnd,
      cogs_amount_vnd = v_total_cogs_vnd
  WHERE id = v_order_id
  RETURNING * INTO v_order;

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
    'M4_POS_ORDER_CREATED',
    'pos_orders',
    v_order_id,
    'POS order created via atomic M4 RPC',
    jsonb_build_object(
      'actor_role', v_actor_role,
      'order_code', v_order.order_code,
      'payment_method', p_payment_method,
      'payment_status', v_order.payment_status,
      'total_amount_vnd', v_total_amount_vnd,
      'cogs_amount_vnd', v_total_cogs_vnd
    )
  );

  RETURN jsonb_build_object(
    'sync_status', 'SYNCED_NEW',
    'order', to_jsonb(v_order),
    'items', v_created_items
  );
END;
$$;

-- ============================================================================
-- SECTION 4: RPC 3 - IDEMPOTENT OFFLINE-FIRST POS BATCH SYNC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m4_sync_offline_pos_orders(
  p_actor_id UUID,
  p_store_id UUID,
  p_shift_id UUID,
  p_orders JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_entry JSONB;
  v_single_result JSONB;
  v_results JSONB := '[]'::jsonb;
  v_synced_new_count INTEGER := 0;
  v_existing_count INTEGER := 0;
BEGIN
  PERFORM public._m4_assert_store_pos_actor(p_actor_id, p_store_id, FALSE);

  IF p_orders IS NULL OR jsonb_typeof(p_orders) <> 'array' OR jsonb_array_length(p_orders) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Offline batch sync requires at least 1 order';
  END IF;

  FOR v_order_entry IN SELECT * FROM jsonb_array_elements(p_orders)
  LOOP
    v_single_result := public.rpc_m4_create_pos_order(
      p_actor_id => p_actor_id,
      p_store_id => p_store_id,
      p_shift_id => p_shift_id,
      p_payment_method => (v_order_entry->>'payment_method')::public.payment_method_enum,
      p_items => v_order_entry->'items',
      p_customer_phone => v_order_entry->>'customer_phone',
      p_client_order_code => v_order_entry->>'client_order_code'
    );

    IF v_single_result->>'sync_status' = 'SYNCED_NEW' THEN
      v_synced_new_count := v_synced_new_count + 1;
    ELSE
      v_existing_count := v_existing_count + 1;
    END IF;

    v_results := v_results || jsonb_build_array(v_single_result);
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
    'M4_OFFLINE_POS_BATCH_SYNCED',
    'pos_orders',
    p_shift_id,
    'Idempotent offline-first POS batch sync completed',
    jsonb_build_object(
      'total_received', jsonb_array_length(p_orders),
      'synced_new_count', v_synced_new_count,
      'idempotent_existing_count', v_existing_count
    )
  );

  RETURN jsonb_build_object(
    'total_received', jsonb_array_length(p_orders),
    'synced_new_count', v_synced_new_count,
    'idempotent_existing_count', v_existing_count,
    'results', v_results
  );
END;
$$;
