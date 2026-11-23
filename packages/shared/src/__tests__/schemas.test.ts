import { describe, expect, it } from 'vitest';
import {
  BLIND_SHIFT_HIDDEN_KEYS,
  BlindCloseShiftSchema,
  CreateInternalTransferRequestSchema,
  CreatePosOrderSchema,
  CreateStoreSchema,
  KDS_FORBIDDEN_FINANCE_KEYS,
  ManagerPinApprovalSchema,
  OpenShiftSchema,
  QtyPositiveSchema,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
  UuidSchema,
  VndNonNegativeSchema,
  VoidPosOrderSchema,
  WarehouseLotCreateSchema,
} from '../index.js';

describe('@cf19/shared — Domain Invariants, Zod Schemas & Security Constants', () => {
  // 1-3: VND Currency Integer Guardrails
  it('1. accepts non-negative integer VND amounts including 0', () => {
    expect(VndNonNegativeSchema.parse(0)).toBe(0);
    expect(VndNonNegativeSchema.parse(29000)).toBe(29000);
    expect(VndNonNegativeSchema.parse(15000000)).toBe(15000000);
  });

  it('2. rejects floating-point VND currency amounts (e.g., 25000.5)', () => {
    const result = VndNonNegativeSchema.safeParse(25000.5);
    expect(result.success).toBe(false);
  });

  it('3. rejects negative VND currency amounts (e.g., -100)', () => {
    const result = VndNonNegativeSchema.safeParse(-100);
    expect(result.success).toBe(false);
  });

  // 4-5: Inventory & BOM Quantity Guardrails
  it('4. accepts positive finite inventory/BOM quantities', () => {
    expect(QtyPositiveSchema.parse(20.5)).toBe(20.5);
    expect(QtyPositiveSchema.parse(1)).toBe(1);
  });

  it('5. rejects zero and negative inventory/BOM quantities', () => {
    expect(QtyPositiveSchema.safeParse(0).success).toBe(false);
    expect(QtyPositiveSchema.safeParse(-5.25).success).toBe(false);
  });

  // 6-8: Manager 6-Digit PIN & Approval Reason Guardrails
  it('6. accepts valid 6-digit numeric Manager PIN approval payload', () => {
    const parsed = ManagerPinApprovalSchema.parse({
      manager_id: SEED_IDS.users.storeManager01,
      store_id: SEED_IDS.stores.store01,
      pin: '123456',
      action: 'VOID_POS_ORDER',
      target_table: 'pos_orders',
      reason: 'Khách đổi món trước khi pha chế',
    });
    expect(parsed.pin).toBe('123456');
  });

  it('7. rejects malformed Manager PINs (5 digits, 7 digits, alphanumeric)', () => {
    const base = {
      manager_id: SEED_IDS.users.storeManager01,
      store_id: SEED_IDS.stores.store01,
      action: 'VOID_POS_ORDER',
      target_table: 'pos_orders',
      reason: 'Hủy đơn nhầm',
    };
    expect(ManagerPinApprovalSchema.safeParse({ ...base, pin: '12345' }).success).toBe(false);
    expect(ManagerPinApprovalSchema.safeParse({ ...base, pin: '1234567' }).success).toBe(false);
    expect(ManagerPinApprovalSchema.safeParse({ ...base, pin: '12345a' }).success).toBe(false);
  });

  it('8. rejects Manager PIN approval when reason is shorter than 3 characters', () => {
    const result = ManagerPinApprovalSchema.safeParse({
      manager_id: SEED_IDS.users.storeManager01,
      store_id: SEED_IDS.stores.store01,
      pin: '123456',
      action: 'VOID_POS_ORDER',
      target_table: 'pos_orders',
      reason: 'ab',
    });
    expect(result.success).toBe(false);
  });

  // 9-11: POS Order & Void Order Validation
  it('9. accepts valid POS order with at least 1 item and positive integer quantity', () => {
    const parsed = CreatePosOrderSchema.parse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'VIETQR',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [SEED_IDS.menuModifiers.sugar50],
          quantity: 2,
        },
      ],
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.quantity).toBe(2);
  });

  it('10. rejects POS order with empty items array or non-positive/float item quantity', () => {
    const emptyOrder = CreatePosOrderSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [],
    });
    expect(emptyOrder.success).toBe(false);

    const floatQtyOrder = CreatePosOrderSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 1.5,
        },
      ],
    });
    expect(floatQtyOrder.success).toBe(false);

    const zeroQtyOrder = CreatePosOrderSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 0,
        },
      ],
    });
    expect(zeroQtyOrder.success).toBe(false);
  });

  it('11. validates VoidPosOrderSchema requiring 6-digit manager PIN and valid reason', () => {
    const validVoid = VoidPosOrderSchema.safeParse({
      order_id: '90000000-0000-4000-8000-000000000001',
      store_id: SEED_IDS.stores.store01,
      manager_id: SEED_IDS.users.storeManager01,
      manager_pin: '123456',
      void_reason: 'Nhập sai phương thức thanh toán',
    });
    expect(validVoid.success).toBe(true);

    const badPinVoid = VoidPosOrderSchema.safeParse({
      order_id: '90000000-0000-4000-8000-000000000001',
      store_id: SEED_IDS.stores.store01,
      manager_id: SEED_IDS.users.storeManager01,
      manager_pin: '999',
      void_reason: 'Nhập sai phương thức thanh toán',
    });
    expect(badPinVoid.success).toBe(false);
  });

  // 12-13: 2-Phase Internal Stock Transfer Validation
  it('12. accepts valid 2-phase internal transfer request from Central Warehouse to Store 1', () => {
    const result = CreateInternalTransferRequestSchema.safeParse({
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.store01,
      items: [
        {
          item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          requested_qty: 5000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('13. rejects internal transfer with empty items or identical source and destination store', () => {
    const emptyItems = CreateInternalTransferRequestSchema.safeParse({
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.store01,
      items: [],
    });
    expect(emptyItems.success).toBe(false);

    const sameStore = CreateInternalTransferRequestSchema.safeParse({
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.centralWarehouse,
      items: [
        {
          item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          requested_qty: 1000,
        },
      ],
    });
    expect(sameStore.success).toBe(false);
  });

  // 14-15: Blind Shift Close & Open Shift Validation
  it('14. accepts valid OpenShiftSchema and BlindCloseShiftSchema with non-negative integer cash', () => {
    expect(
      OpenShiftSchema.safeParse({
        store_id: SEED_IDS.stores.store01,
        opening_cash_vnd: 2000000,
      }).success,
    ).toBe(true);

    expect(
      BlindCloseShiftSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        blind_counted_cash_vnd: 4850000,
      }).success,
    ).toBe(true);
  });

  it('15. rejects BlindCloseShiftSchema with negative or floating-point blind_counted_cash_vnd', () => {
    expect(
      BlindCloseShiftSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        blind_counted_cash_vnd: -50000,
      }).success,
    ).toBe(false);

    expect(
      BlindCloseShiftSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        blind_counted_cash_vnd: 120000.75,
      }).success,
    ).toBe(false);
  });

  // 16-17: Warehouse Lot Date & Store Code Validation
  it('16. rejects WarehouseLotCreateSchema when expiry_date is earlier than roast_date', () => {
    const result = WarehouseLotCreateSchema.safeParse({
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-TEST-001',
      roast_date: '2026-11-20',
      expiry_date: '2026-11-10',
      initial_qty: 10000,
      unit_cost_vnd: 120000,
    });
    expect(result.success).toBe(false);
  });

  it('17. rejects CreateStoreSchema with lowercase or invalid store code', () => {
    const result = CreateStoreSchema.safeParse({
      organization_id: SEED_IDS.organization.cf19,
      code: 'store 05',
      name: 'Quán 5',
      type: 'RETAIL_STORE',
      address: '100 Lê Lợi, Thị Trấn',
    });
    expect(result.success).toBe(false);
  });

  // 18-20: Security Key Constants & SEED_IDS UUID Integrity
  it('18. ensures SENSITIVE_COST_KEYS contains all critical origin cost fields', () => {
    expect(SENSITIVE_COST_KEYS).toContain('moving_avg_cost_vnd');
    expect(SENSITIVE_COST_KEYS).toContain('unit_cost_vnd');
    expect(SENSITIVE_COST_KEYS).toContain('shipping_cost_vnd');
    expect(SENSITIVE_COST_KEYS).toContain('raw_import_cost');
    expect(SENSITIVE_COST_KEYS).toContain('cogs_amount_vnd');
  });

  it('19. ensures KDS_FORBIDDEN_FINANCE_KEYS and BLIND_SHIFT_HIDDEN_KEYS contain required masked fields', () => {
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('total_amount_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('cogs_amount_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('unit_price_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('line_total_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('payment_method');

    expect(BLIND_SHIFT_HIDDEN_KEYS).toContain('system_expected_cash_vnd');
    expect(BLIND_SHIFT_HIDDEN_KEYS).toContain('variance_cash_vnd');
  });

  it('20. ensures every UUID in SEED_IDS is a valid RFC-4122 UUID matching UuidSchema', () => {
    const allUuids: string[] = [];
    for (const group of Object.values(SEED_IDS)) {
      for (const value of Object.values(group)) {
        allUuids.push(value);
      }
    }
    expect(allUuids.length).toBeGreaterThanOrEqual(40);
    for (const id of allUuids) {
      expect(UuidSchema.safeParse(id).success).toBe(true);
    }
    // Ensure all 8 user accounts (including Store 1 & Store 2 managers) are distinct
    const userIds = Object.values(SEED_IDS.users);
    expect(userIds).toHaveLength(8);
    expect(new Set(userIds).size).toBe(8);
  });
});
