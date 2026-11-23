import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import {
  KDS_FORBIDDEN_FINANCE_KEYS,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
} from '@cf19/shared';
import { closePgPool } from '../db/pgClient.js';
import { app } from '../index.js';

describe(
  'CF19 Production E2E Integration Suite — 100% Live Supabase PostgreSQL',
  { timeout: 30000 },
  () => {
  let adminToken = '';
  let warehouseToken = '';
  let store1ManagerToken = '';
  let cashier1Token = '';
  let barista1Token = '';

  let createdProductId = '';
  let createdVariantId = '';
  let createdCustomerId = '';
  let createdTransferId = '';
  let createdVietQrOrderId = '';
  let clonedStoreId = '';

  afterAll(async () => {
    await closePgPool();
  });

  it('1. GET /api/v1/supabase/live-status verifies direct PostgreSQL connection to Supabase', async () => {
    const res = await request(app).get('/api/v1/supabase/live-status');
    expect(res.status).toBe(200);
    expect(res.body.data.connected).toBe(true);
    expect(res.body.data.tables_count).toBeGreaterThanOrEqual(26);
    expect(res.body.data.stores_count).toBeGreaterThanOrEqual(5);
  });

  it('2. Real PostgreSQL Auth (bcrypt crypt + signed JWT): authenticates all 5 Roles & rejects wrong password', async () => {
    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@cf19.vn', password: 'WrongPassword!' });
    expect(bad.status).toBe(401);

    const login = async (email: string, password: string) => {
      const r = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });
      expect(r.status).toBe(200);
      expect(r.body.data.access_token.split('.')).toHaveLength(3); // Real HS256 JWT
      expect(r.body.data.user).not.toHaveProperty('manager_pin_hash');
      return r.body.data.access_token as string;
    };

    adminToken = await login('admin@cf19.vn', 'Cf19@Admin123');
    warehouseToken = await login('warehouse@cf19.vn', 'Cf19@Warehouse123');
    store1ManagerToken = await login('manager.store01@cf19.vn', 'Cf19@Manager01');
    cashier1Token = await login('cashier.store01@cf19.vn', 'Cf19@Cashier01');
    barista1Token = await login('barista.store01@cf19.vn', 'Cf19@Barista01');
  });

  it('3. RBAC Multi-Tenant Isolation & Cost Masking on live Supabase queries', async () => {
    // Store 1 manager blocked from Store 2
    const cross = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store02}/lots`)
      .set('Authorization', `Bearer ${store1ManagerToken}`);
    expect(cross.status).toBe(403);
    expect(cross.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');

    // Store 1 manager NEVER sees sensitive cost fields
    const inv = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/inventory`)
      .set('Authorization', `Bearer ${store1ManagerToken}`);
    expect(inv.status).toBe(200);
    for (const item of inv.body.data as Record<string, unknown>[]) {
      for (const k of SENSITIVE_COST_KEYS) {
        expect(item).not.toHaveProperty(k);
      }
    }

    // Barista NEVER sees revenue/price/cost fields
    const kds = await request(app)
      .get(`/api/v1/kds/stores/${SEED_IDS.stores.store01}/board`)
      .set('Authorization', `Bearer ${barista1Token}`);
    expect(kds.status).toBe(200);
    for (const ticket of kds.body.data as Record<string, unknown>[]) {
      for (const k of [...KDS_FORBIDDEN_FINANCE_KEYS, ...SENSITIVE_COST_KEYS]) {
        expect(ticket).not.toHaveProperty(k);
      }
    }
  });

  it('4. M2 Exact Unit Math (kg/g): Warehouse inventory valuation is realistic (not 1000x inflated) & shipping amortizes per kg', async () => {
    const ov = await request(app)
      .get('/api/v1/warehouse/overview')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(ov.status).toBe(200);
    // Realistic stock value (~30M-50M VND, definitely < 200M VND, NOT 14 billion!)
    expect(ov.body.data.total_inventory_value_vnd).toBeGreaterThan(10_000_000);
    expect(ov.body.data.total_inventory_value_vnd).toBeLessThan(200_000_000);

    // Ingest 30kg (30,000g) at 100,000 VND/kg + 150,000 VND shipping => 105,000 VND/kg exact!
    const lotCode = `LOT-E2E-${Date.now().toString().slice(-6)}`;
    const ingest = await request(app)
      .post('/api/v1/warehouse/lots/ingest')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: lotCode,
        supplier_name: 'HTX E2E Test',
        initial_qty: 30000,
        unit_cost_vnd: 100000,
        shipping_cost_vnd: 150000,
        moisture_pct: 12.0,
      });
    expect(ingest.status).toBe(201);
    expect(ingest.body.data.effective_unit_cost_vnd).toBe(105000);
  });

  it('5. Full CRUD: Master Menu Product + BOM Recipe (with GREEN_BEAN validator rejection)', async () => {
    const code = `PRD-E2E-${Date.now().toString().slice(-4)}`;
    const prod = await request(app)
      .post('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category_id: SEED_IDS.menuCategories.coffee,
        code,
        name: 'Cold Brew Cam Sả E2E',
        base_price_vnd: 42000,
        create_default_variants: true,
        size_l_delta_vnd: 8000,
      });
    expect(prod.status).toBe(201);
    createdProductId = prod.body.data.id;
    createdVariantId = prod.body.data.variants[0].id;

    // Validator rejects raw GREEN_BEAN in beverage BOM
    const badBom = await request(app)
      .put('/api/v1/catalog/bom-recipes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        product_id: createdProductId,
        variant_id: createdVariantId,
        items: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
            quantity_per_cup_base_unit: 20,
            wastage_allowance_pct: 2,
          },
        ],
      });
    expect(badBom.status).toBe(400);
    expect(badBom.body.error.code).toBe('INVALID_BOM_INGREDIENT');

    // Valid BOM upsert succeeds
    const goodBom = await request(app)
      .put('/api/v1/catalog/bom-recipes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        product_id: createdProductId,
        variant_id: createdVariantId,
        items: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_per_cup_base_unit: 25,
            wastage_allowance_pct: 2,
          },
          {
            inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
            quantity_per_cup_base_unit: 1,
            wastage_allowance_pct: 0,
          },
        ],
      });
    expect(goodBom.status).toBe(200);
    expect(goodBom.body.data.items).toHaveLength(2);
  });

  it('6. Full CRUD: B2B Customer + B2C Retail Coffee Sale at Central Warehouse', async () => {
    const custCode = `B2B-E2E-${Date.now().toString().slice(-4)}`;
    const cust = await request(app)
      .post('/api/v1/b2b/customers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        code: custCode,
        name: 'Chủ Quán E2E',
        shop_name: 'Tiệm Cà Phê Cao Nguyên E2E',
        phone: '0911222333',
        price_tier: 'TIER_2',
        credit_limit_vnd: 25000000,
        payment_term_days: 14,
      });
    expect(cust.status).toBe(201);
    createdCustomerId = cust.body.data.id;
    expect(createdCustomerId).toBeTruthy();

    const retail = await request(app)
      .post('/api/v1/b2b/retail-orders')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        retail_customer_name: 'Khách Lẻ E2E',
        payment_method: 'CASH',
        items: [
          {
            item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            quantity_base_unit: 2000, // 2kg * 210,000 = 420,000 VND
          },
        ],
      });
    expect(retail.status).toBe(201);
    expect(retail.body.data.sale_channel).toBe('B2C_RETAIL');
    expect(retail.body.data.total_amount_vnd).toBe(420000);
  });

  it('7. 2-Phase Internal Stock Transfer (REQUESTED -> IN_TRANSIT -> RECONCILED) & Cancel flow', async () => {
    const reqTrf = await request(app)
      .post('/api/v1/transfers/request')
      .set('Authorization', `Bearer ${store1ManagerToken}`)
      .send({
        from_warehouse_id: SEED_IDS.stores.centralWarehouse,
        to_store_id: SEED_IDS.stores.store01,
        items: [{ item_id: SEED_IDS.inventoryItems.roastedRobustaMed, requested_qty: 2000 }],
        notes: 'E2E Transfer Test',
      });
    expect(reqTrf.status).toBe(201);
    createdTransferId = reqTrf.body.data.id;

    const dispatch = await request(app)
      .post(`/api/v1/transfers/${createdTransferId}/dispatch`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ notes: 'FIFO dispatch' });
    expect(dispatch.status).toBe(200);
    expect(dispatch.body.data.transfer.status).toBe('IN_TRANSIT');

    const reconcile = await request(app)
      .post(`/api/v1/transfers/${createdTransferId}/reconcile`)
      .set('Authorization', `Bearer ${store1ManagerToken}`)
      .send({ notes: 'Đã nhận đủ 2kg' });
    expect(reconcile.status).toBe(200);
    expect(reconcile.body.data.transfer.status).toBe('RECONCILED');
    expect(reconcile.body.data.created_store_lots.length).toBeGreaterThanOrEqual(1);
  });

  it('8. Strict POS -> VietQR -> Webhook -> KDS Gate & Atomic BOM Deduction', async () => {
    // Create VIETQR order (PENDING)
    const ord = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'VIETQR',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [SEED_IDS.menuModifiers.sugar50],
            quantity: 1,
          },
        ],
      });
    expect(ord.status).toBe(201);
    expect(ord.body.data.order.payment_status).toBe('PENDING');
    createdVietQrOrderId = ord.body.data.order.id;

    // STRICT RULE: Unpaid VIETQR order MUST NOT appear on Barista KDS board yet!
    const kdsBefore = await request(app)
      .get(`/api/v1/kds/stores/${SEED_IDS.stores.store01}/board`)
      .set('Authorization', `Bearer ${barista1Token}`);
    expect(kdsBefore.status).toBe(200);
    expect(
      (kdsBefore.body.data as Array<{ id: string }>).some(
        (t) => t.id === createdVietQrOrderId,
      ),
    ).toBe(false);

    // Generate EMVCo VietQR + trigger Webhook IPN
    const qr = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${createdVietQrOrderId}/generate`,
      )
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({});
    expect(qr.status).toBe(200);
    expect(qr.body.data.emvco_payload).toContain('A000000727');

    const hook = await request(app)
      .post(
        `/api/v1/vietqr/stores/${SEED_IDS.stores.store01}/orders/${createdVietQrOrderId}/simulate-webhook`,
      )
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ simulate_duplicate: false });
    expect(hook.status).toBe(200);
    expect(hook.body.data.status).toBe('RECONCILED_PAID');

    // Now PAID order immediately appears on Barista KDS board!
    const kdsAfter = await request(app)
      .get(`/api/v1/kds/stores/${SEED_IDS.stores.store01}/board`)
      .set('Authorization', `Bearer ${barista1Token}`);
    expect(kdsAfter.status).toBe(200);
    expect(
      (kdsAfter.body.data as Array<{ id: string }>).some(
        (t) => t.id === createdVietQrOrderId,
      ),
    ).toBe(true);

    // Complete KDS order -> Atomic BOM FIFO deduction
    const complete = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${createdVietQrOrderId}/complete-bom`,
      )
      .set('Authorization', `Bearer ${barista1Token}`)
      .send({ allow_partial_on_shortage: false });
    expect(complete.status).toBe(200);
    expect(complete.body.data.kds_status).toBe('COMPLETED');
    expect(complete.body.data.deductions.length).toBeGreaterThanOrEqual(4);
  });

  it('9. Auto EOD Stocktake Preview + Executive OLAP P&L (with Real Labor & Intercompany Elimination) + 1-Click Franchise Clone', async () => {
    const preview = await request(app)
      .get(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes/preview`)
      .set('Authorization', `Bearer ${store1ManagerToken}`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.length).toBeGreaterThanOrEqual(5);

    const pnl = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pnl.status).toBe(200);
    expect(pnl.body.data.intercompany_eliminated_revenue_vnd).toBeGreaterThan(0);
    const coreStores = (
      pnl.body.data.stores as Array<{
        store_code: string;
        pos_gross_revenue_vnd: number;
        labor_cost_vnd: number;
      }>
    ).filter((s) => ['STORE-01', 'STORE-02', 'STORE-03', 'STORE-04'].includes(s.store_code));
    expect(coreStores).toHaveLength(4);
    expect(coreStores.every((s) => s.pos_gross_revenue_vnd > 0)).toBe(true);
    expect(coreStores.every((s) => s.labor_cost_vnd > 0)).toBe(true);

    const cloneCode = `FRAN-${Date.now().toString().slice(-4)}`;
    const clone = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: cloneCode,
        name: 'CF19 Nhượng Quyền E2E Test',
        type: 'FRANCHISE_STORE',
        address: '99 Nguyễn Huệ, TP. Đà Lạt',
        price_multiplier: 1.15,
        opening_cash_vnd: 2500000,
        create_starter_transfer: true,
        starter_coffee_qty_g: 5000,
      });
    expect(clone.status).toBe(201);
    clonedStoreId = clone.body.data.store.id;
    expect(clonedStoreId).toBeTruthy();
  });
});
