-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0001_m1_core_3nf_schema.sql
-- Scope: 12 PostgreSQL ENUMs, updated_at Trigger Function, 25 3NF Tables,
--        Domain Check Constraints, and FIFO / Multi-Tenant Indexes.
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SECTION 1: 12 POSTGRESQL ENUMS
-- ============================================================================

CREATE TYPE public.user_role_enum AS ENUM (
  'SUPER_ADMIN',
  'WAREHOUSE_MANAGER',
  'STORE_MANAGER',
  'CASHIER_STAFF',
  'BARISTA_KDS'
);

CREATE TYPE public.store_type_enum AS ENUM (
  'CENTRAL_WAREHOUSE',
  'RETAIL_STORE',
  'FRANCHISE_STORE'
);

CREATE TYPE public.employment_type_enum AS ENUM (
  'FULL_TIME',
  'PART_TIME'
);

CREATE TYPE public.inventory_category_enum AS ENUM (
  'GREEN_BEAN',
  'ROASTED_COFFEE',
  'INGREDIENT',
  'PACKAGING'
);

CREATE TYPE public.base_unit_enum AS ENUM (
  'g',
  'ml',
  'pcs'
);

CREATE TYPE public.lot_status_enum AS ENUM (
  'AVAILABLE',
  'DEPLETED',
  'EXPIRED'
);

CREATE TYPE public.transfer_status_enum AS ENUM (
  'REQUESTED',
  'IN_TRANSIT',
  'RECONCILED',
  'CANCELLED'
);

CREATE TYPE public.b2b_price_tier_enum AS ENUM (
  'TIER_1',
  'TIER_2',
  'TIER_3'
);

CREATE TYPE public.shift_status_enum AS ENUM (
  'OPEN',
  'CLOSED'
);

CREATE TYPE public.payment_method_enum AS ENUM (
  'CASH',
  'VIETQR'
);

CREATE TYPE public.payment_status_enum AS ENUM (
  'PENDING',
  'PAID',
  'VOIDED'
);

CREATE TYPE public.kds_status_enum AS ENUM (
  'QUEUED',
  'PREPARING',
  'COMPLETED'
);

-- ============================================================================
-- SECTION 2: UPDATED_AT TIMESTAMP TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: GROUP 1 - CORE & RBAC (4 TABLES)
-- ============================================================================

-- 1. organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tax_code TEXT,
  base_currency TEXT NOT NULL DEFAULT 'VND',
  franchise_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_organizations_base_currency CHECK (base_currency = 'VND')
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 2. stores
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type public.store_type_enum NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  price_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stores_price_multiplier CHECK (price_multiplier > 0)
);

CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. user_profiles
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role public.user_role_enum NOT NULL,
  assigned_store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
  manager_pin_hash TEXT,
  hourly_rate_vnd BIGINT NOT NULL DEFAULT 0,
  employment_type public.employment_type_enum NOT NULL DEFAULT 'FULL_TIME',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_profiles_hourly_rate CHECK (hourly_rate_vnd >= 0),
  CONSTRAINT chk_user_role_store_assignment CHECK (
    (role = 'SUPER_ADMIN' AND assigned_store_id IS NULL)
    OR (role <> 'SUPER_ADMIN' AND assigned_store_id IS NOT NULL)
  )
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 4. audit_logs (Append-only; immutability enforced in 0002)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  store_id UUID REFERENCES public.stores(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  reason TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: GROUP 2 - WMS & SUPPLY CHAIN (5 TABLES)
-- ============================================================================

-- 5. inventory_items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.inventory_category_enum NOT NULL,
  base_unit public.base_unit_enum NOT NULL,
  min_stock_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
  moving_avg_cost_vnd BIGINT NOT NULL DEFAULT 0,
  internal_transfer_price_vnd BIGINT NOT NULL DEFAULT 0,
  retail_price_vnd BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_inv_items_min_stock CHECK (min_stock_threshold >= 0),
  CONSTRAINT chk_inv_items_mac CHECK (moving_avg_cost_vnd >= 0),
  CONSTRAINT chk_inv_items_internal_price CHECK (internal_transfer_price_vnd >= 0),
  CONSTRAINT chk_inv_items_retail_price CHECK (retail_price_vnd >= 0)
);

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 6. warehouse_lots
CREATE TABLE public.warehouse_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  lot_code TEXT NOT NULL,
  supplier_name TEXT,
  moisture_pct NUMERIC(5,2),
  roast_date DATE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date DATE,
  initial_qty NUMERIC(12,2) NOT NULL,
  remaining_qty NUMERIC(12,2) NOT NULL,
  unit_cost_vnd BIGINT NOT NULL DEFAULT 0,
  shipping_cost_vnd BIGINT NOT NULL DEFAULT 0,
  status public.lot_status_enum NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_warehouse_lots_store_lot_code UNIQUE (store_id, lot_code),
  CONSTRAINT chk_warehouse_lots_moisture CHECK (moisture_pct IS NULL OR (moisture_pct >= 0 AND moisture_pct <= 100)),
  CONSTRAINT chk_warehouse_lots_initial_qty CHECK (initial_qty > 0),
  CONSTRAINT chk_warehouse_lots_remaining_qty CHECK (remaining_qty >= 0 AND remaining_qty <= initial_qty),
  CONSTRAINT chk_warehouse_lots_unit_cost CHECK (unit_cost_vnd >= 0),
  CONSTRAINT chk_warehouse_lots_shipping_cost CHECK (shipping_cost_vnd >= 0),
  CONSTRAINT chk_warehouse_lots_expiry CHECK (expiry_date IS NULL OR roast_date IS NULL OR expiry_date >= roast_date)
);

CREATE TRIGGER trg_warehouse_lots_updated_at
  BEFORE UPDATE ON public.warehouse_lots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 7. roast_batches
CREATE TABLE public.roast_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  batch_code TEXT NOT NULL UNIQUE,
  source_green_lot_id UUID NOT NULL REFERENCES public.warehouse_lots(id) ON DELETE RESTRICT,
  output_lot_id UUID UNIQUE REFERENCES public.warehouse_lots(id) ON DELETE RESTRICT,
  green_input_weight_g NUMERIC(12,2) NOT NULL,
  roasted_output_weight_g NUMERIC(12,2) NOT NULL,
  weight_loss_pct NUMERIC(5,2) NOT NULL,
  roast_profile TEXT,
  roasted_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  roasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_roast_batches_green_input CHECK (green_input_weight_g > 0),
  CONSTRAINT chk_roast_batches_roasted_output CHECK (roasted_output_weight_g > 0 AND roasted_output_weight_g <= green_input_weight_g),
  CONSTRAINT chk_roast_batches_weight_loss CHECK (weight_loss_pct >= 0 AND weight_loss_pct < 100)
);

CREATE TRIGGER trg_roast_batches_updated_at
  BEFORE UPDATE ON public.roast_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 8. internal_transfers (2-Phase Transfer: REQUESTED -> IN_TRANSIT -> RECONCILED)
CREATE TABLE public.internal_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code TEXT NOT NULL UNIQUE,
  from_warehouse_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  to_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  status public.transfer_status_enum NOT NULL DEFAULT 'REQUESTED',
  total_internal_value_vnd BIGINT NOT NULL DEFAULT 0,
  requested_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  dispatched_by UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  received_by UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_internal_transfer_diff_stores CHECK (from_warehouse_id <> to_store_id),
  CONSTRAINT chk_internal_transfer_total_value CHECK (total_internal_value_vnd >= 0),
  CONSTRAINT chk_internal_transfer_dispatch_state CHECK (
    status <> 'IN_TRANSIT' OR (dispatched_by IS NOT NULL AND dispatched_at IS NOT NULL)
  ),
  CONSTRAINT chk_internal_transfer_reconcile_state CHECK (
    status <> 'RECONCILED' OR (
      dispatched_by IS NOT NULL
      AND dispatched_at IS NOT NULL
      AND received_by IS NOT NULL
      AND received_at IS NOT NULL
    )
  )
);

CREATE TRIGGER trg_internal_transfers_updated_at
  BEFORE UPDATE ON public.internal_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 9. internal_transfer_items
CREATE TABLE public.internal_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.internal_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  source_lot_id UUID REFERENCES public.warehouse_lots(id) ON DELETE RESTRICT,
  destination_lot_id UUID REFERENCES public.warehouse_lots(id) ON DELETE RESTRICT,
  requested_qty NUMERIC(12,2) NOT NULL,
  dispatched_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  internal_unit_price_vnd BIGINT NOT NULL DEFAULT 0,
  line_total_vnd BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_transfer_items_requested_qty CHECK (requested_qty > 0),
  CONSTRAINT chk_transfer_items_dispatched_qty CHECK (dispatched_qty >= 0),
  CONSTRAINT chk_transfer_items_received_qty CHECK (received_qty >= 0),
  CONSTRAINT chk_transfer_items_unit_price CHECK (internal_unit_price_vnd >= 0),
  CONSTRAINT chk_transfer_items_line_total CHECK (line_total_vnd >= 0)
);

CREATE TRIGGER trg_internal_transfer_items_updated_at
  BEFORE UPDATE ON public.internal_transfer_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ============================================================================
-- SECTION 5: GROUP 3 - B2B & AR LEDGER (5 TABLES)
-- ============================================================================

-- 10. b2b_customers
CREATE TABLE public.b2b_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  price_tier public.b2b_price_tier_enum NOT NULL DEFAULT 'TIER_1',
  credit_limit_vnd BIGINT NOT NULL DEFAULT 0,
  current_debt_vnd BIGINT NOT NULL DEFAULT 0,
  payment_term_days INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_b2b_customers_credit_limit CHECK (credit_limit_vnd >= 0),
  CONSTRAINT chk_b2b_customers_current_debt CHECK (current_debt_vnd >= 0),
  CONSTRAINT chk_b2b_customers_payment_term CHECK (payment_term_days >= 0)
);

CREATE TRIGGER trg_b2b_customers_updated_at
  BEFORE UPDATE ON public.b2b_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 11. b2b_price_tiers
CREATE TABLE public.b2b_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  price_tier public.b2b_price_tier_enum NOT NULL,
  min_qty_kg NUMERIC(12,2) NOT NULL,
  unit_price_vnd BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_b2b_price_tiers_item_tier_qty UNIQUE (item_id, price_tier, min_qty_kg),
  CONSTRAINT chk_b2b_price_tiers_min_qty CHECK (min_qty_kg >= 0),
  CONSTRAINT chk_b2b_price_tiers_unit_price CHECK (unit_price_vnd >= 0)
);

CREATE TRIGGER trg_b2b_price_tiers_updated_at
  BEFORE UPDATE ON public.b2b_price_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 12. b2b_orders
CREATE TABLE public.b2b_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE,
  warehouse_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.b2b_customers(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  payment_method public.payment_method_enum NOT NULL DEFAULT 'VIETQR',
  payment_status public.payment_status_enum NOT NULL DEFAULT 'PENDING',
  total_amount_vnd BIGINT NOT NULL DEFAULT 0,
  paid_amount_vnd BIGINT NOT NULL DEFAULT 0,
  cogs_amount_vnd BIGINT NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_b2b_orders_total CHECK (total_amount_vnd >= 0),
  CONSTRAINT chk_b2b_orders_paid CHECK (paid_amount_vnd >= 0 AND paid_amount_vnd <= total_amount_vnd),
  CONSTRAINT chk_b2b_orders_cogs CHECK (cogs_amount_vnd >= 0)
);

CREATE TRIGGER trg_b2b_orders_updated_at
  BEFORE UPDATE ON public.b2b_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 13. b2b_order_items
CREATE TABLE public.b2b_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id UUID NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES public.warehouse_lots(id) ON DELETE RESTRICT,
  quantity_base_unit NUMERIC(12,2) NOT NULL,
  unit_price_vnd BIGINT NOT NULL,
  unit_cost_vnd BIGINT NOT NULL DEFAULT 0,
  line_total_vnd BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_b2b_order_items_qty CHECK (quantity_base_unit > 0),
  CONSTRAINT chk_b2b_order_items_price CHECK (unit_price_vnd >= 0),
  CONSTRAINT chk_b2b_order_items_cost CHECK (unit_cost_vnd >= 0),
  CONSTRAINT chk_b2b_order_items_total CHECK (line_total_vnd >= 0)
);

-- 14. b2b_debt_ledger
CREATE TABLE public.b2b_debt_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.b2b_customers(id) ON DELETE RESTRICT,
  b2b_order_id UUID REFERENCES public.b2b_orders(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL,
  amount_vnd BIGINT NOT NULL,
  balance_after_vnd BIGINT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  reference_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_b2b_ledger_entry_type CHECK (entry_type IN ('DEBIT_INVOICE', 'CREDIT_PAYMENT', 'ADJUSTMENT')),
  CONSTRAINT chk_b2b_ledger_amount CHECK (amount_vnd > 0),
  CONSTRAINT chk_b2b_ledger_balance CHECK (balance_after_vnd >= 0)
);

-- ============================================================================
-- SECTION 6: GROUP 4 - STORE OPS: MENU, BOM, POS, SHIFTS & STOCKTAKES (11 TABLES)
-- ============================================================================

-- 15. menu_categories
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 16. menu_products
CREATE TABLE public.menu_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_price_vnd BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_menu_products_base_price CHECK (base_price_vnd >= 0)
);

CREATE TRIGGER trg_menu_products_updated_at
  BEFORE UPDATE ON public.menu_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 17. menu_variants
CREATE TABLE public.menu_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  size_code TEXT NOT NULL,
  name TEXT NOT NULL,
  price_delta_vnd BIGINT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_menu_variants_product_size UNIQUE (product_id, size_code),
  CONSTRAINT chk_menu_variants_size_code CHECK (size_code IN ('S', 'M', 'L'))
);

CREATE TRIGGER trg_menu_variants_updated_at
  BEFORE UPDATE ON public.menu_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 18. menu_modifiers
CREATE TABLE public.menu_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  modifier_group TEXT NOT NULL,
  name TEXT NOT NULL,
  price_delta_vnd BIGINT NOT NULL DEFAULT 0,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  bom_qty_base_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_menu_modifiers_group CHECK (modifier_group IN ('SUGAR', 'ICE', 'TOPPING')),
  CONSTRAINT chk_menu_modifiers_price_delta CHECK (price_delta_vnd >= 0),
  CONSTRAINT chk_menu_modifiers_bom_qty CHECK (bom_qty_base_unit >= 0)
);

CREATE TRIGGER trg_menu_modifiers_updated_at
  BEFORE UPDATE ON public.menu_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 19. bom_recipes
CREATE TABLE public.bom_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.menu_products(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.menu_variants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bom_recipes_product_variant UNIQUE (product_id, variant_id),
  CONSTRAINT chk_bom_recipes_version CHECK (version >= 1)
);

CREATE TRIGGER trg_bom_recipes_updated_at
  BEFORE UPDATE ON public.bom_recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 20. bom_recipe_items
CREATE TABLE public.bom_recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.bom_recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  quantity_per_cup_base_unit NUMERIC(12,2) NOT NULL,
  wastage_allowance_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bom_recipe_items_recipe_item UNIQUE (recipe_id, inventory_item_id),
  CONSTRAINT chk_bom_recipe_items_qty CHECK (quantity_per_cup_base_unit > 0),
  CONSTRAINT chk_bom_recipe_items_wastage CHECK (wastage_allowance_pct >= 0 AND wastage_allowance_pct <= 50)
);

CREATE TRIGGER trg_bom_recipe_items_updated_at
  BEFORE UPDATE ON public.bom_recipe_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 21. pos_shifts (Enforces Blind Shift Close at DB Constraint level)
CREATE TABLE public.pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_cash_vnd BIGINT NOT NULL DEFAULT 0,
  blind_counted_cash_vnd BIGINT,
  system_expected_cash_vnd BIGINT,
  variance_cash_vnd BIGINT,
  status public.shift_status_enum NOT NULL DEFAULT 'OPEN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pos_shifts_opening_cash CHECK (opening_cash_vnd >= 0),
  CONSTRAINT chk_pos_shifts_blind_cash CHECK (blind_counted_cash_vnd IS NULL OR blind_counted_cash_vnd >= 0),
  CONSTRAINT chk_pos_shifts_expected_cash CHECK (system_expected_cash_vnd IS NULL OR system_expected_cash_vnd >= 0),
  CONSTRAINT chk_blind_shift_open_nulls CHECK (
    status <> 'OPEN' OR (
      closed_at IS NULL
      AND blind_counted_cash_vnd IS NULL
      AND system_expected_cash_vnd IS NULL
      AND variance_cash_vnd IS NULL
    )
  ),
  CONSTRAINT chk_blind_shift_closed_vals CHECK (
    status <> 'CLOSED' OR (
      closed_at IS NOT NULL
      AND blind_counted_cash_vnd IS NOT NULL
      AND system_expected_cash_vnd IS NOT NULL
      AND variance_cash_vnd = (blind_counted_cash_vnd - system_expected_cash_vnd)
    )
  )
);

CREATE TRIGGER trg_pos_shifts_updated_at
  BEFORE UPDATE ON public.pos_shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 22. pos_orders (Enforces Void requires Manager Approval + Reason)
CREATE TABLE public.pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  shift_id UUID NOT NULL REFERENCES public.pos_shifts(id) ON DELETE RESTRICT,
  cashier_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  customer_phone TEXT,
  payment_method public.payment_method_enum NOT NULL,
  payment_status public.payment_status_enum NOT NULL DEFAULT 'PENDING',
  kds_status public.kds_status_enum NOT NULL DEFAULT 'QUEUED',
  vietqr_ref_code TEXT UNIQUE,
  total_amount_vnd BIGINT NOT NULL,
  cogs_amount_vnd BIGINT NOT NULL DEFAULT 0,
  bom_deducted_at TIMESTAMPTZ,
  void_approved_by_manager_id UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pos_orders_total CHECK (total_amount_vnd >= 0),
  CONSTRAINT chk_pos_orders_cogs CHECK (cogs_amount_vnd >= 0),
  CONSTRAINT chk_pos_order_void_requires_manager CHECK (
    (payment_status <> 'VOIDED' AND void_approved_by_manager_id IS NULL AND void_reason IS NULL)
    OR (
      payment_status = 'VOIDED'
      AND void_approved_by_manager_id IS NOT NULL
      AND void_reason IS NOT NULL
      AND LENGTH(TRIM(void_reason)) >= 3
    )
  )
);

CREATE TRIGGER trg_pos_orders_updated_at
  BEFORE UPDATE ON public.pos_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 23. pos_order_items
CREATE TABLE public.pos_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.menu_products(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES public.menu_variants(id) ON DELETE RESTRICT,
  modifiers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity INTEGER NOT NULL,
  unit_price_vnd BIGINT NOT NULL,
  line_total_vnd BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pos_order_items_qty CHECK (quantity > 0),
  CONSTRAINT chk_pos_order_items_unit_price CHECK (unit_price_vnd >= 0),
  CONSTRAINT chk_pos_order_items_line_total CHECK (line_total_vnd >= 0)
);

-- 24. payment_webhook_logs (Idempotent Banking IPN Consumer Log)
CREATE TABLE public.payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE RESTRICT,
  amount_vnd BIGINT NOT NULL,
  bank_tx_id TEXT NOT NULL UNIQUE,
  raw_payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_webhook_amount CHECK (amount_vnd > 0)
);

-- 25. store_daily_stocktakes (EOD Physical vs BOM Theoretical Variance)
CREATE TABLE public.store_daily_stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  stocktake_date DATE NOT NULL,
  opening_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_in_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  bom_consumed_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  theoretical_closing_qty NUMERIC(12,2) NOT NULL,
  actual_counted_qty NUMERIC(12,2) NOT NULL,
  variance_qty NUMERIC(12,2) NOT NULL,
  counted_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_store_daily_stocktakes_store_item_date UNIQUE (store_id, inventory_item_id, stocktake_date),
  CONSTRAINT chk_stocktake_opening_qty CHECK (opening_qty >= 0),
  CONSTRAINT chk_stocktake_received_qty CHECK (received_in_qty >= 0),
  CONSTRAINT chk_stocktake_bom_consumed CHECK (bom_consumed_qty >= 0),
  CONSTRAINT chk_stocktake_actual_qty CHECK (actual_counted_qty >= 0),
  CONSTRAINT chk_stocktake_variance_formula CHECK (variance_qty = (actual_counted_qty - theoretical_closing_qty))
);

CREATE TRIGGER trg_store_daily_stocktakes_updated_at
  BEFORE UPDATE ON public.store_daily_stocktakes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ============================================================================
-- SECTION 7: FIFO & MULTI-TENANT PERFORMANCE INDEXES
-- ============================================================================

-- Primary FIFO Lot Selection Index (Oldest roast_date / received_at first)
CREATE INDEX idx_warehouse_lots_fifo
  ON public.warehouse_lots (store_id, item_id, roast_date ASC NULLS LAST, received_at ASC, id ASC)
  WHERE status = 'AVAILABLE' AND remaining_qty > 0;

CREATE INDEX idx_stores_org_type
  ON public.stores (organization_id, type);

CREATE INDEX idx_user_profiles_role_store
  ON public.user_profiles (role, assigned_store_id);

CREATE INDEX idx_audit_logs_store_created
  ON public.audit_logs (store_id, created_at DESC);

CREATE INDEX idx_audit_logs_actor_created
  ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX idx_inventory_items_org_category
  ON public.inventory_items (organization_id, category);

CREATE INDEX idx_roast_batches_warehouse_date
  ON public.roast_batches (warehouse_store_id, roasted_at DESC);

CREATE INDEX idx_internal_transfers_from_status
  ON public.internal_transfers (from_warehouse_id, status);

CREATE INDEX idx_internal_transfers_to_status
  ON public.internal_transfers (to_store_id, status);

CREATE INDEX idx_internal_transfer_items_transfer
  ON public.internal_transfer_items (transfer_id);

CREATE INDEX idx_b2b_orders_customer_status
  ON public.b2b_orders (customer_id, payment_status);

CREATE INDEX idx_b2b_debt_ledger_customer_created
  ON public.b2b_debt_ledger (customer_id, created_at DESC);

CREATE INDEX idx_pos_shifts_store_status
  ON public.pos_shifts (store_id, status);

CREATE INDEX idx_pos_orders_store_created
  ON public.pos_orders (store_id, created_at DESC);

CREATE INDEX idx_pos_orders_store_kds
  ON public.pos_orders (store_id, kds_status)
  WHERE payment_status <> 'VOIDED';

CREATE INDEX idx_pos_order_items_order
  ON public.pos_order_items (order_id);

CREATE INDEX idx_pos_order_items_store
  ON public.pos_order_items (store_id);

CREATE INDEX idx_payment_webhook_logs_store_processed
  ON public.payment_webhook_logs (store_id, processed_at DESC);

CREATE INDEX idx_store_daily_stocktakes_store_date
  ON public.store_daily_stocktakes (store_id, stocktake_date DESC);
