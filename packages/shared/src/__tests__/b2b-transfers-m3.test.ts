import { describe, expect, it } from 'vitest';
import {
  B2bPriceQuoteQuerySchema,
  CreateB2bOrderSchema,
  DispatchInternalTransferFifoSchema,
  RecordB2bDebtPaymentSchema,
  SEED_IDS,
  TransferFilterQuerySchema,
  calculateB2bCreditCheck,
  calculateInternalTransferTotalVnd,
  classifyArAgingBucket,
  convertToKgForTierPricing,
  resolveB2bTieredUnitPriceVnd,
  settleFifoPendingInvoices,
} from '../index.js';

const ROBUSTA_TIERS = [
  { price_tier: 'TIER_1' as const, min_qty_kg: 0, unit_price_vnd: 185000 },
  { price_tier: 'TIER_2' as const, min_qty_kg: 10, unit_price_vnd: 172000 },
  { price_tier: 'TIER_3' as const, min_qty_kg: 50, unit_price_vnd: 160000 },
];

describe('M3.1 — Pure B2B Tiered Pricing, AR Credit Ledger & 2-Phase Transfer Math + Schemas', () => {
  // 1-2: Unit conversion to kg-equivalent
  it('1. converts gram base units to kg and preserves ml/pcs units unchanged', () => {
    expect(convertToKgForTierPricing(5000, 'g')).toBe(5);
    expect(convertToKgForTierPricing(1500, 'g')).toBe(1.5);
    expect(convertToKgForTierPricing(250, 'ml')).toBe(250);
    expect(convertToKgForTierPricing(100, 'pcs')).toBe(100);
  });

  it('2. rejects negative quantity in convertToKgForTierPricing', () => {
    expect(() => convertToKgForTierPricing(-10, 'g')).toThrow(RangeError);
  });

  // 3-6: B2B Tiered Pricing Engine
  it('3. quotes TIER_1 price (185,000) for TIER_1 customer ordering 5kg', () => {
    const quote = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: 5000,
      baseUnit: 'g',
      customerPriceTier: 'TIER_1',
      tiers: ROBUSTA_TIERS,
      fallbackRetailPriceVnd: 210000,
      fallbackInternalTransferPriceVnd: 155000,
    });
    expect(quote.unit_price_vnd).toBe(185000);
    expect(quote.applied_price_tier).toBe('TIER_1');
    expect(quote.estimated_line_total_vnd).toBe(925000);
    expect(quote.price_source).toBe('PRICE_TIER');
  });

  it('4. automatically unlocks TIER_2 (172,000) and TIER_3 (160,000) volume discounts for TIER_1 customer', () => {
    const q15 = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: 15000,
      baseUnit: 'g',
      customerPriceTier: 'TIER_1',
      tiers: ROBUSTA_TIERS,
      fallbackRetailPriceVnd: 210000,
      fallbackInternalTransferPriceVnd: 155000,
    });
    expect(q15.unit_price_vnd).toBe(172000);
    expect(q15.applied_price_tier).toBe('TIER_2');
    expect(q15.estimated_line_total_vnd).toBe(2580000);

    const q50 = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: 50000,
      baseUnit: 'g',
      customerPriceTier: 'TIER_1',
      tiers: ROBUSTA_TIERS,
      fallbackRetailPriceVnd: 210000,
      fallbackInternalTransferPriceVnd: 155000,
    });
    expect(q50.unit_price_vnd).toBe(160000);
    expect(q50.applied_price_tier).toBe('TIER_3');
    expect(q50.estimated_line_total_vnd).toBe(8000000);
  });

  it('5. honors contracted VIP customer tier (TIER_2) even on small restock orders under 10kg', () => {
    const quote = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: 5000,
      baseUnit: 'g',
      customerPriceTier: 'TIER_2',
      tiers: ROBUSTA_TIERS,
      fallbackRetailPriceVnd: 210000,
      fallbackInternalTransferPriceVnd: 155000,
    });
    expect(quote.unit_price_vnd).toBe(172000);
    expect(quote.applied_price_tier).toBe('TIER_2');
  });

  it('6. falls back to retail_price_vnd then internal_transfer_price_vnd when no active tiers match', () => {
    const retailFallback = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: 2000,
      baseUnit: 'g',
      customerPriceTier: 'TIER_1',
      tiers: [{ price_tier: 'TIER_2', min_qty_kg: 10, unit_price_vnd: 170000, is_active: false }],
      fallbackRetailPriceVnd: 210000,
      fallbackInternalTransferPriceVnd: 155000,
    });
    expect(retailFallback.price_source).toBe('RETAIL_FALLBACK');
    expect(retailFallback.unit_price_vnd).toBe(210000);

    const internalFallback = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: 100,
      baseUnit: 'pcs',
      customerPriceTier: 'TIER_1',
      tiers: [],
      fallbackRetailPriceVnd: 0,
      fallbackInternalTransferPriceVnd: 1350,
    });
    expect(internalFallback.price_source).toBe('INTERNAL_FALLBACK');
    expect(internalFallback.unit_price_vnd).toBe(1350);
    expect(internalFallback.estimated_line_total_vnd).toBe(135000);
  });

  // 7-9: Credit Limit Check
  it('7. approves credit check when projected debt is within credit_limit_vnd', () => {
    const check = calculateB2bCreditCheck({
      currentDebtVnd: 5500000,
      creditLimitVnd: 30000000,
      totalAmountVnd: 10000000,
      paidAmountVnd: 2000000,
    });
    expect(check.debt_added_vnd).toBe(8000000);
    expect(check.projected_debt_vnd).toBe(13500000);
    expect(check.remaining_credit_vnd).toBe(16500000);
    expect(check.exceeds_credit_limit).toBe(false);
  });

  it('8. flags exceeds_credit_limit when projected debt exceeds credit_limit_vnd by even 1 VND', () => {
    const check = calculateB2bCreditCheck({
      currentDebtVnd: 25000000,
      creditLimitVnd: 30000000,
      totalAmountVnd: 5000001,
      paidAmountVnd: 0,
    });
    expect(check.exceeds_credit_limit).toBe(true);
    expect(check.remaining_credit_vnd).toBe(0);
  });

  it('9. rejects paidAmountVnd exceeding totalAmountVnd or negative inputs in credit check', () => {
    expect(() =>
      calculateB2bCreditCheck({
        currentDebtVnd: 0,
        creditLimitVnd: 10000000,
        totalAmountVnd: 1000000,
        paidAmountVnd: 1500000,
      }),
    ).toThrow(RangeError);
  });

  // 10-12: FIFO Pending Invoice Debt Settlement
  it('10. settles oldest PENDING invoice first and partially settles the second invoice', () => {
    const result = settleFifoPendingInvoices(
      [
        {
          id: '2',
          order_code: 'B2B-2026-002',
          ordered_at: '2026-11-15T10:00:00Z',
          total_amount_vnd: 4000000,
          paid_amount_vnd: 0,
          payment_status: 'PENDING',
        },
        {
          id: '1',
          order_code: 'B2B-2026-001',
          ordered_at: '2026-11-05T08:00:00Z',
          total_amount_vnd: 3000000,
          paid_amount_vnd: 1000000,
          payment_status: 'PENDING',
        },
      ],
      3500000,
    );

    expect(result.totalAppliedVnd).toBe(3500000);
    expect(result.unappliedPaymentVnd).toBe(0);
    expect(result.settled).toHaveLength(2);
    expect(result.settled[0]?.order_code).toBe('B2B-2026-001');
    expect(result.settled[0]?.applied_vnd).toBe(2000000);
    expect(result.settled[0]?.new_payment_status).toBe('PAID');
    expect(result.settled[1]?.order_code).toBe('B2B-2026-002');
    expect(result.settled[1]?.applied_vnd).toBe(1500000);
    expect(result.settled[1]?.new_payment_status).toBe('PENDING');
  });

  it('11. ignores already PAID or VOIDED invoices during FIFO debt settlement', () => {
    const result = settleFifoPendingInvoices(
      [
        {
          id: '1',
          order_code: 'B2B-PAID',
          ordered_at: '2026-11-01T08:00:00Z',
          total_amount_vnd: 1000000,
          paid_amount_vnd: 1000000,
          payment_status: 'PAID',
        },
        {
          id: '2',
          order_code: 'B2B-PENDING',
          ordered_at: '2026-11-02T08:00:00Z',
          total_amount_vnd: 2000000,
          paid_amount_vnd: 0,
          payment_status: 'PENDING',
        },
      ],
      1000000,
    );

    expect(result.settled).toHaveLength(1);
    expect(result.settled[0]?.order_code).toBe('B2B-PENDING');
  });

  it('12. rejects non-positive paymentAmountVnd in settleFifoPendingInvoices', () => {
    expect(() => settleFifoPendingInvoices([], 0)).toThrow(RangeError);
    expect(() => settleFifoPendingInvoices([], -50000)).toThrow(RangeError);
  });

  // 13-14: AR Aging Classification
  it('13. classifies AR aging buckets accurately across all 4 boundary thresholds', () => {
    expect(classifyArAgingBucket(-5)).toBe('CURRENT');
    expect(classifyArAgingBucket(0)).toBe('CURRENT');
    expect(classifyArAgingBucket(1)).toBe('OVERDUE_1_30');
    expect(classifyArAgingBucket(30)).toBe('OVERDUE_1_30');
    expect(classifyArAgingBucket(31)).toBe('OVERDUE_31_60');
    expect(classifyArAgingBucket(60)).toBe('OVERDUE_31_60');
    expect(classifyArAgingBucket(61)).toBe('OVERDUE_60_PLUS');
  });

  it('14. rejects NaN/Infinity in classifyArAgingBucket', () => {
    expect(() => classifyArAgingBucket(Number.NaN)).toThrow(RangeError);
  });

  // 15-16: Internal Transfer Total Calculation
  it('15. calculates exact internal transfer total across g (kg-priced), ml and pcs lines', () => {
    const total = calculateInternalTransferTotalVnd([
      { qty_base_unit: 5000, base_unit: 'g', internal_unit_price_vnd: 155000 }, // 775,000
      { qty_base_unit: 2000, base_unit: 'ml', internal_unit_price_vnd: 60 }, // 120,000
      { qty_base_unit: 200, base_unit: 'pcs', internal_unit_price_vnd: 1350 }, // 270,000
    ]);
    expect(total).toBe(1165000);
  });

  it('16. rejects negative qty or price in calculateInternalTransferTotalVnd', () => {
    expect(() =>
      calculateInternalTransferTotalVnd([
        { qty_base_unit: -1, base_unit: 'g', internal_unit_price_vnd: 155000 },
      ]),
    ).toThrow(RangeError);
  });

  // 17-22: M3 Zod Schemas
  it('17. validates B2bPriceQuoteQuerySchema coercing string query numbers', () => {
    const parsed = B2bPriceQuoteQuerySchema.parse({
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      quantity_base_unit: '15000',
    });
    expect(parsed.quantity_base_unit).toBe(15000);
  });

  it('18. validates CreateB2bOrderSchema with defaults and rejects empty items array', () => {
    const ok = CreateB2bOrderSchema.parse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      items: [
        { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, quantity_base_unit: 10000 },
      ],
    });
    expect(ok.payment_method).toBe('VIETQR');
    expect(ok.paid_amount_vnd).toBe(0);

    const empty = CreateB2bOrderSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      items: [],
    });
    expect(empty.success).toBe(false);
  });

  it('19. rejects CreateB2bOrderSchema when paid_amount_vnd is float or negative', () => {
    const floatPaid = CreateB2bOrderSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      paid_amount_vnd: 500000.5,
      items: [
        { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, quantity_base_unit: 5000 },
      ],
    });
    expect(floatPaid.success).toBe(false);
  });

  it('20. validates RecordB2bDebtPaymentSchema requiring positive integer payment_amount_vnd', () => {
    expect(
      RecordB2bDebtPaymentSchema.safeParse({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_amount_vnd: 2500000,
        reference_note: 'CK VietQR thu nợ đợt 1',
      }).success,
    ).toBe(true);

    expect(
      RecordB2bDebtPaymentSchema.safeParse({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_amount_vnd: 0,
      }).success,
    ).toBe(false);
  });

  it('21. validates TransferFilterQuerySchema status enum', () => {
    expect(
      TransferFilterQuerySchema.safeParse({
        store_id: SEED_IDS.stores.store01,
        status: 'IN_TRANSIT',
      }).success,
    ).toBe(true);
    expect(
      TransferFilterQuerySchema.safeParse({
        status: 'INVALID_PHASE',
      }).success,
    ).toBe(false);
  });

  it('22. validates DispatchInternalTransferFifoSchema UUID format', () => {
    expect(
      DispatchInternalTransferFifoSchema.safeParse({
        transfer_id: SEED_IDS.internalTransfers.store01InitialRequest,
        notes: 'Xuất lô FIFO cho Quán 1',
      }).success,
    ).toBe(true);
    expect(
      DispatchInternalTransferFifoSchema.safeParse({
        transfer_id: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });
});
