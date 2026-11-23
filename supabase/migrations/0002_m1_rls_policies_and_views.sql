-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0002_m1_rls_policies_and_views.sql
-- Scope: 3 Integrity Triggers, 2 RLS Helper Functions, RLS Enabled on 25 Tables,
--        55 Strict 5-Role Multi-Tenant RLS Policies, and 5 Security Barrier Views.
-- Author: Queen Neon (Gemini 4 Neon High - Principal Security Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: 3 DOMAIN INTEGRITY TRIGGERS
-- ============================================================================

-- Trigger 1: Prevent UPDATE or DELETE on audit_logs (Immutable Audit Trail)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY_VIOLATION: public.audit_logs is strictly append-only and immutable (% blocked)', TG_OP;
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Trigger 2: Enforce POS Order VOID approval by SUPER_ADMIN or same-store STORE_MANAGER
CREATE OR REPLACE FUNCTION public.enforce_pos_order_void_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_valid BOOLEAN;
BEGIN
  IF NEW.payment_status = 'VOIDED' THEN
    IF NEW.void_approved_by_manager_id IS NULL THEN
      RAISE EXCEPTION 'SECURITY_VIOLATION: Voiding a POS order requires void_approved_by_manager_id';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = NEW.void_approved_by_manager_id
        AND up.is_active = TRUE
        AND (
          up.role = 'SUPER_ADMIN'
          OR (up.role = 'STORE_MANAGER' AND up.assigned_store_id = NEW.store_id)
        )
    ) INTO v_approver_valid;

    IF NOT COALESCE(v_approver_valid, FALSE) THEN
      RAISE EXCEPTION 'SECURITY_VIOLATION: Void approver % must be an active SUPER_ADMIN or STORE_MANAGER of store %',
        NEW.void_approved_by_manager_id, NEW.store_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pos_orders_void_manager
  BEFORE INSERT OR UPDATE ON public.pos_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pos_order_void_manager();

-- Trigger 3: Enforce pos_order_items.store_id strictly matches parent pos_orders.store_id
CREATE OR REPLACE FUNCTION public.enforce_pos_order_item_store_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_store_id UUID;
BEGIN
  SELECT po.store_id
    INTO v_order_store_id
  FROM public.pos_orders po
  WHERE po.id = NEW.order_id;

  IF v_order_store_id IS NULL THEN
    RAISE EXCEPTION 'INTEGRITY_VIOLATION: Parent pos_order % does not exist', NEW.order_id;
  END IF;

  IF NEW.store_id <> v_order_store_id THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: pos_order_items.store_id (%) does not match parent pos_orders.store_id (%)',
      NEW.store_id, v_order_store_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pos_order_items_store_match
  BEFORE INSERT OR UPDATE ON public.pos_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pos_order_item_store_match();

-- ============================================================================
-- SECTION 2: 2 RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.role
  FROM public.user_profiles up
  WHERE up.id = auth.uid()
    AND up.is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.assigned_store_id
  FROM public.user_profiles up
  WHERE up.id = auth.uid()
    AND up.is_active = TRUE
  LIMIT 1;
$$;

-- ============================================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY ON ALL 25 TABLES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roast_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_debt_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_daily_stocktakes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: 55 STRICT 5-ROLE MULTI-TENANT RLS POLICIES
-- ============================================================================

-- ---- Table 1: organizations (2 Policies) ----

-- [01/55]
CREATE POLICY org_super_admin_all
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [02/55]
CREATE POLICY org_authenticated_select
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT up.organization_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_active = TRUE
      LIMIT 1
    )
  );

-- ---- Table 2: stores (2 Policies) ----

-- [03/55]
CREATE POLICY stores_super_admin_all
  ON public.stores
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [04/55]
CREATE POLICY stores_scoped_select
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'WAREHOUSE_MANAGER'
    OR (
      public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')
      AND id = public.current_user_store_id()
    )
  );

-- ---- Table 3: user_profiles (2 Policies) ----

-- [05/55]
CREATE POLICY profiles_super_admin_all
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [06/55]
CREATE POLICY profiles_scoped_select
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.current_user_role() = 'STORE_MANAGER'
      AND assigned_store_id = public.current_user_store_id()
    )
  );

-- ---- Table 4: audit_logs (2 Policies; Append-Only) ----

-- [07/55]
CREATE POLICY audit_scoped_select
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() IN ('WAREHOUSE_MANAGER', 'STORE_MANAGER')
      AND store_id = public.current_user_store_id()
    )
  );

-- [08/55]
CREATE POLICY audit_authenticated_insert
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      public.current_user_role() = 'SUPER_ADMIN'
      OR store_id IS NULL
      OR store_id = public.current_user_store_id()
    )
  );

-- ---- Table 5: inventory_items (2 Policies) ----

-- [09/55]
CREATE POLICY inv_items_admin_warehouse_all
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'));

-- [10/55]
CREATE POLICY inv_items_store_roles_select
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'));

-- ---- Table 6: warehouse_lots (2 Policies) ----

-- [11/55]
CREATE POLICY lots_admin_warehouse_all
  ON public.warehouse_lots
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND store_id = public.current_user_store_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND store_id = public.current_user_store_id()
    )
  );

-- [12/55]
CREATE POLICY lots_store_staff_select
  ON public.warehouse_lots
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')
    AND store_id = public.current_user_store_id()
  );

-- ---- Table 7: roast_batches (1 Policy; Warehouse & Admin Only) ----

-- [13/55]
CREATE POLICY roast_admin_warehouse_all
  ON public.roast_batches
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND warehouse_store_id = public.current_user_store_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND warehouse_store_id = public.current_user_store_id()
    )
  );

-- ---- Table 8: internal_transfers (4 Policies) ----

-- [14/55]
CREATE POLICY transfers_admin_warehouse_all
  ON public.internal_transfers
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND from_warehouse_id = public.current_user_store_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND from_warehouse_id = public.current_user_store_id()
    )
  );

-- [15/55]
CREATE POLICY transfers_store_manager_select
  ON public.internal_transfers
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND to_store_id = public.current_user_store_id()
  );

-- [16/55]
CREATE POLICY transfers_store_manager_insert
  ON public.internal_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'STORE_MANAGER'
    AND to_store_id = public.current_user_store_id()
    AND requested_by = auth.uid()
    AND status = 'REQUESTED'
  );

-- [17/55]
CREATE POLICY transfers_store_manager_reconcile_update
  ON public.internal_transfers
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND to_store_id = public.current_user_store_id()
    AND status = 'IN_TRANSIT'
  )
  WITH CHECK (
    public.current_user_role() = 'STORE_MANAGER'
    AND to_store_id = public.current_user_store_id()
    AND status = 'RECONCILED'
    AND received_by = auth.uid()
  );

-- ---- Table 9: internal_transfer_items (3 Policies) ----

-- [18/55]
CREATE POLICY transfer_items_admin_warehouse_all
  ON public.internal_transfer_items
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND EXISTS (
        SELECT 1 FROM public.internal_transfers it
        WHERE it.id = transfer_id AND it.from_warehouse_id = public.current_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND EXISTS (
        SELECT 1 FROM public.internal_transfers it
        WHERE it.id = transfer_id AND it.from_warehouse_id = public.current_user_store_id()
      )
    )
  );

-- [19/55]
CREATE POLICY transfer_items_store_manager_select
  ON public.internal_transfer_items
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND EXISTS (
      SELECT 1 FROM public.internal_transfers it
      WHERE it.id = transfer_id AND it.to_store_id = public.current_user_store_id()
    )
  );

-- [20/55]
CREATE POLICY transfer_items_store_manager_insert
  ON public.internal_transfer_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'STORE_MANAGER'
    AND EXISTS (
      SELECT 1 FROM public.internal_transfers it
      WHERE it.id = transfer_id
        AND it.to_store_id = public.current_user_store_id()
        AND it.status = 'REQUESTED'
    )
  );

-- ---- Table 10: b2b_customers (1 Policy; Admin & Warehouse Only) ----

-- [21/55]
CREATE POLICY b2b_customers_admin_warehouse_all
  ON public.b2b_customers
  FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'));

-- ---- Table 11: b2b_price_tiers (1 Policy; Admin & Warehouse Only) ----

-- [22/55]
CREATE POLICY b2b_tiers_admin_warehouse_all
  ON public.b2b_price_tiers
  FOR ALL
  TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'));

-- ---- Table 12: b2b_orders (1 Policy; Admin & Warehouse Only) ----

-- [23/55]
CREATE POLICY b2b_orders_admin_warehouse_all
  ON public.b2b_orders
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND warehouse_store_id = public.current_user_store_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND warehouse_store_id = public.current_user_store_id()
    )
  );

-- ---- Table 13: b2b_order_items (1 Policy; Admin & Warehouse Only) ----

-- [24/55]
CREATE POLICY b2b_order_items_admin_warehouse_all
  ON public.b2b_order_items
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND EXISTS (
        SELECT 1 FROM public.b2b_orders bo
        WHERE bo.id = b2b_order_id AND bo.warehouse_store_id = public.current_user_store_id()
      )
    )
  )
  WITH CHECK (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (
      public.current_user_role() = 'WAREHOUSE_MANAGER'
      AND EXISTS (
        SELECT 1 FROM public.b2b_orders bo
        WHERE bo.id = b2b_order_id AND bo.warehouse_store_id = public.current_user_store_id()
      )
    )
  );

-- ---- Table 14: b2b_debt_ledger (2 Policies; Append-Only Ledger for Admin & Warehouse) ----

-- [25/55]
CREATE POLICY b2b_ledger_admin_warehouse_select
  ON public.b2b_debt_ledger
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER'));

-- [26/55]
CREATE POLICY b2b_ledger_admin_warehouse_insert
  ON public.b2b_debt_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'WAREHOUSE_MANAGER')
    AND recorded_by = auth.uid()
  );

-- ---- Table 15: menu_categories (2 Policies) ----

-- [27/55]
CREATE POLICY menu_cat_super_admin_all
  ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [28/55]
CREATE POLICY menu_cat_store_roles_select
  ON public.menu_categories
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'));

-- ---- Table 16: menu_products (2 Policies) ----

-- [29/55]
CREATE POLICY menu_prod_super_admin_all
  ON public.menu_products
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [30/55]
CREATE POLICY menu_prod_store_roles_select
  ON public.menu_products
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'));

-- ---- Table 17: menu_variants (2 Policies) ----

-- [31/55]
CREATE POLICY menu_var_super_admin_all
  ON public.menu_variants
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [32/55]
CREATE POLICY menu_var_store_roles_select
  ON public.menu_variants
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'));

-- ---- Table 18: menu_modifiers (2 Policies) ----

-- [33/55]
CREATE POLICY menu_mod_super_admin_all
  ON public.menu_modifiers
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [34/55]
CREATE POLICY menu_mod_store_roles_select
  ON public.menu_modifiers
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'));

-- ---- Table 19: bom_recipes (2 Policies) ----

-- [35/55]
CREATE POLICY bom_rec_super_admin_all
  ON public.bom_recipes
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [36/55]
CREATE POLICY bom_rec_store_roles_select
  ON public.bom_recipes
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'BARISTA_KDS'));

-- ---- Table 20: bom_recipe_items (2 Policies) ----

-- [37/55]
CREATE POLICY bom_items_super_admin_all
  ON public.bom_recipe_items
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [38/55]
CREATE POLICY bom_items_store_roles_select
  ON public.bom_recipe_items
  FOR SELECT
  TO authenticated
  USING (public.current_user_role() IN ('STORE_MANAGER', 'BARISTA_KDS'));

-- ---- Table 21: pos_shifts (5 Policies; WAREHOUSE_MANAGER & BARISTA_KDS blocked) ----

-- [39/55]
CREATE POLICY shifts_super_admin_all
  ON public.pos_shifts
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [40/55]
CREATE POLICY shifts_store_manager_all
  ON public.pos_shifts
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  )
  WITH CHECK (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  );

-- [41/55]
CREATE POLICY shifts_cashier_select
  ON public.pos_shifts
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'CASHIER_STAFF'
    AND store_id = public.current_user_store_id()
    AND cashier_id = auth.uid()
  );

-- [42/55]
CREATE POLICY shifts_cashier_insert
  ON public.pos_shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'CASHIER_STAFF'
    AND store_id = public.current_user_store_id()
    AND cashier_id = auth.uid()
    AND status = 'OPEN'
  );

-- [43/55]
CREATE POLICY shifts_cashier_update
  ON public.pos_shifts
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'CASHIER_STAFF'
    AND store_id = public.current_user_store_id()
    AND cashier_id = auth.uid()
    AND status = 'OPEN'
  )
  WITH CHECK (
    public.current_user_role() = 'CASHIER_STAFF'
    AND store_id = public.current_user_store_id()
    AND cashier_id = auth.uid()
  );

-- ---- Table 22: pos_orders (5 Policies; WAREHOUSE_MANAGER completely blocked) ----

-- [44/55]
CREATE POLICY orders_super_admin_all
  ON public.pos_orders
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [45/55]
CREATE POLICY orders_store_manager_all
  ON public.pos_orders
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  )
  WITH CHECK (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  );

-- [46/55]
CREATE POLICY orders_store_staff_select
  ON public.pos_orders
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('CASHIER_STAFF', 'BARISTA_KDS')
    AND store_id = public.current_user_store_id()
  );

-- [47/55]
CREATE POLICY orders_cashier_insert
  ON public.pos_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'CASHIER_STAFF'
    AND store_id = public.current_user_store_id()
    AND cashier_id = auth.uid()
    AND payment_status <> 'VOIDED'
  );

-- [48/55]
CREATE POLICY orders_barista_kds_update
  ON public.pos_orders
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'BARISTA_KDS'
    AND store_id = public.current_user_store_id()
    AND payment_status <> 'VOIDED'
  )
  WITH CHECK (
    public.current_user_role() = 'BARISTA_KDS'
    AND store_id = public.current_user_store_id()
    AND payment_status <> 'VOIDED'
  );

-- ---- Table 23: pos_order_items (3 Policies; WAREHOUSE_MANAGER completely blocked) ----

-- [49/55]
CREATE POLICY order_items_super_admin_all
  ON public.pos_order_items
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [50/55]
CREATE POLICY order_items_store_staff_select
  ON public.pos_order_items
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')
    AND store_id = public.current_user_store_id()
  );

-- [51/55]
CREATE POLICY order_items_cashier_manager_insert
  ON public.pos_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF')
    AND store_id = public.current_user_store_id()
  );

-- ---- Table 24: payment_webhook_logs (2 Policies; Admin & Store Manager Only) ----

-- [52/55]
CREATE POLICY webhooks_super_admin_all
  ON public.payment_webhook_logs
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [53/55]
CREATE POLICY webhooks_store_manager_select
  ON public.payment_webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  );

-- ---- Table 25: store_daily_stocktakes (2 Policies; Admin & Store Manager Only) ----

-- [54/55]
CREATE POLICY stocktakes_super_admin_all
  ON public.store_daily_stocktakes
  FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- [55/55]
CREATE POLICY stocktakes_store_manager_all
  ON public.store_daily_stocktakes
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  )
  WITH CHECK (
    public.current_user_role() = 'STORE_MANAGER'
    AND store_id = public.current_user_store_id()
  );

-- ============================================================================
-- SECTION 5: 5 SECURITY BARRIER VIEWS (FIELD-LEVEL DATA MASKING)
-- ============================================================================

-- View 1: store_safe_inventory_items
-- Hides moving_avg_cost_vnd completely from Store Roles
CREATE OR REPLACE VIEW public.store_safe_inventory_items
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  ii.id,
  ii.organization_id,
  ii.sku,
  ii.name,
  ii.category,
  ii.base_unit,
  ii.min_stock_threshold,
  ii.internal_transfer_price_vnd,
  ii.retail_price_vnd,
  ii.is_active,
  ii.created_at,
  ii.updated_at
FROM public.inventory_items ii;

-- View 2: store_safe_warehouse_lots
-- Hides unit_cost_vnd & shipping_cost_vnd for Central Warehouse lots from Store Roles
CREATE OR REPLACE VIEW public.store_safe_warehouse_lots
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  wl.id,
  wl.store_id,
  wl.item_id,
  wl.lot_code,
  wl.supplier_name,
  wl.moisture_pct,
  wl.roast_date,
  wl.received_at,
  wl.expiry_date,
  wl.initial_qty,
  wl.remaining_qty,
  CASE
    WHEN s.type = 'CENTRAL_WAREHOUSE'
      AND public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')
    THEN NULL::BIGINT
    ELSE wl.unit_cost_vnd
  END AS unit_cost_vnd,
  CASE
    WHEN s.type = 'CENTRAL_WAREHOUSE'
      AND public.current_user_role() IN ('STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS')
    THEN NULL::BIGINT
    ELSE wl.shipping_cost_vnd
  END AS shipping_cost_vnd,
  wl.status,
  wl.created_at,
  wl.updated_at
FROM public.warehouse_lots wl
INNER JOIN public.stores s ON s.id = wl.store_id;

-- View 3: kds_safe_order_tickets
-- Completely hides total_amount_vnd, cogs_amount_vnd, payment_method from BARISTA_KDS
CREATE OR REPLACE VIEW public.kds_safe_order_tickets
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  po.id,
  po.order_code,
  po.store_id,
  po.shift_id,
  po.kds_status,
  po.payment_status,
  po.bom_deducted_at,
  po.created_at,
  po.updated_at
FROM public.pos_orders po
WHERE po.payment_status <> 'VOIDED';

-- View 4: kds_safe_order_items
-- Completely hides unit_price_vnd and line_total_vnd from BARISTA_KDS
CREATE OR REPLACE VIEW public.kds_safe_order_items
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  poi.id,
  poi.order_id,
  poi.store_id,
  poi.product_id,
  poi.variant_id,
  poi.modifiers_json,
  poi.quantity,
  poi.notes,
  poi.created_at
FROM public.pos_order_items poi;

-- View 5: cashier_safe_pos_shifts
-- Completely hides system_expected_cash_vnd & variance_cash_vnd when OPEN for CASHIER_STAFF
CREATE OR REPLACE VIEW public.cashier_safe_pos_shifts
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  ps.id,
  ps.store_id,
  ps.cashier_id,
  ps.opened_at,
  ps.closed_at,
  ps.opening_cash_vnd,
  ps.blind_counted_cash_vnd,
  CASE
    WHEN ps.status = 'OPEN' AND public.current_user_role() = 'CASHIER_STAFF'
    THEN NULL::BIGINT
    ELSE ps.system_expected_cash_vnd
  END AS system_expected_cash_vnd,
  CASE
    WHEN ps.status = 'OPEN' AND public.current_user_role() = 'CASHIER_STAFF'
    THEN NULL::BIGINT
    ELSE ps.variance_cash_vnd
  END AS variance_cash_vnd,
  ps.status,
  ps.notes,
  ps.created_at,
  ps.updated_at
FROM public.pos_shifts ps;
