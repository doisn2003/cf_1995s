import { describe, expect, it } from 'vitest';
import {
  AdvanceKdsTicketStatusSchema,
  BlindClosePosShiftRequestSchema,
  CompleteKdsBomDeductionSchema,
  KdsQueueQuerySchema,
  ReportBaristaLowStockAlertSchema,
  SEED_IDS,
  SubmitStoreDailyStocktakeSchema,
  allocateStoreBomFifoDeduction,
  calculateBlindShiftCloseVariance,
  calculateDailyStocktakeVariance,
  classifyKdsWaitSla,
  classifyShiftCashVarianceStatus,
  type StoreBomLotSnapshotInput,
} from '../index.js';

describe('M6.1 KDS SLA, Multi-Lot BOM FIFO Deduction, Blind Shift Close & EOD Stocktake (@cf19/shared)', () => {
  it('1. classifyKdsWaitSla classifies wait_minutes < 5 as NORMAL_GREEN', () => {
    const baseMs = Date.parse('2026-11-22T08:00:00.000Z');
    const res = classifyKdsWaitSla(
      '2026-11-22T08:00:00.000Z',
      baseMs + 4 * 60_000 + 59_000,
    );
    expect(res).toEqual({
      wait_minutes: 4,
      sla_level: 'NORMAL_GREEN',
      is_overdue: false,
    });
  });

  it('2. classifyKdsWaitSla classifies 5 <= wait_minutes < 10 as WARNING_YELLOW', () => {
    const baseMs = Date.parse('2026-11-22T08:00:00.000Z');
    const at5 = classifyKdsWaitSla('2026-11-22T08:00:00.000Z', baseMs + 5 * 60_000);
    const at9 = classifyKdsWaitSla('2026-11-22T08:00:00.000Z', baseMs + 9 * 60_000);
    expect(at5.sla_level).toBe('WARNING_YELLOW');
    expect(at9.sla_level).toBe('WARNING_YELLOW');
    expect(at9.is_overdue).toBe(false);
  });

  it('3. classifyKdsWaitSla classifies wait_minutes >= 10 as CRITICAL_RED with is_overdue=true', () => {
    const baseMs = Date.parse('2026-11-22T08:00:00.000Z');
    const res = classifyKdsWaitSla('2026-11-22T08:00:00.000Z', baseMs + 12 * 60_000);
    expect(res).toEqual({
      wait_minutes: 12,
      sla_level: 'CRITICAL_RED',
      is_overdue: true,
    });
  });

  it('4. classifyKdsWaitSla clamps future timestamps to 0 minutes and throws on invalid ISO', () => {
    const baseMs = Date.parse('2026-11-22T08:00:00.000Z');
    expect(classifyKdsWaitSla('2026-11-22T08:05:00.000Z', baseMs).wait_minutes).toBe(0);
    expect(() => classifyKdsWaitSla('not-a-timestamp', baseMs)).toThrow(RangeError);
  });

  it('5. allocateStoreBomFifoDeduction depletes oldest roast_date lot first and cascades across multiple lots', () => {
    const lots: StoreBomLotSnapshotInput[] = [
      {
        id: 'lot-newer',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-S01-NEW',
        roast_date: '2026-11-18',
        received_at: '2026-11-19T08:00:00.000Z',
        remaining_qty: 100,
        status: 'AVAILABLE',
      },
      {
        id: 'lot-oldest',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-S01-OLD',
        roast_date: '2026-11-10',
        received_at: '2026-11-12T08:00:00.000Z',
        remaining_qty: 40,
        status: 'AVAILABLE',
      },
    ];

    const result = allocateStoreBomFifoDeduction({
      storeId: SEED_IDS.stores.store01,
      requirements: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          sku: 'RC-ROB-MED',
          name: 'Robusta Medium',
          base_unit: 'g',
          required_qty: 76.8,
        },
      ],
      availableLots: lots,
    });

    expect(result.has_shortage).toBe(false);
    expect(result.deductions).toHaveLength(1);
    const ded = result.deductions[0]!;
    expect(ded.deducted_qty).toBe(76.8);
    expect(ded.shortage_qty).toBe(0);
    expect(ded.lot_slices).toEqual([
      {
        lot_id: 'lot-oldest',
        lot_code: 'LOT-S01-OLD',
        roast_date: '2026-11-10',
        deducted_qty: 40,
        remaining_after_qty: 0,
        depleted: true,
      },
      {
        lot_id: 'lot-newer',
        lot_code: 'LOT-S01-NEW',
        roast_date: '2026-11-18',
        deducted_qty: 36.8,
        remaining_after_qty: 63.2,
        depleted: false,
      },
    ]);

    const updatedOld = result.updated_lots.find((l) => l.id === 'lot-oldest');
    expect(updatedOld?.status).toBe('DEPLETED');
    expect(updatedOld?.remaining_qty).toBe(0);
    // Input array stays immutable
    expect(lots[1]?.remaining_qty).toBe(40);
  });

  it('6. allocateStoreBomFifoDeduction ignores lots belonging to other stores (Multi-Tenant Isolation)', () => {
    const lots: StoreBomLotSnapshotInput[] = [
      {
        id: 'lot-store2',
        store_id: SEED_IDS.stores.store02,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-S02-OLD',
        roast_date: '2026-11-01',
        received_at: '2026-11-02T08:00:00.000Z',
        remaining_qty: 5000,
        status: 'AVAILABLE',
      },
      {
        id: 'lot-store1',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-S01-ONLY',
        roast_date: '2026-11-15',
        received_at: '2026-11-16T08:00:00.000Z',
        remaining_qty: 200,
        status: 'AVAILABLE',
      },
    ];

    const res = allocateStoreBomFifoDeduction({
      storeId: SEED_IDS.stores.store01,
      requirements: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          sku: 'RC-ROB-MED',
          name: 'Robusta Medium',
          base_unit: 'g',
          required_qty: 50,
        },
      ],
      availableLots: lots,
    });

    expect(res.deductions[0]?.lot_slices).toHaveLength(1);
    expect(res.deductions[0]?.lot_slices[0]?.lot_id).toBe('lot-store1');
    expect(res.updated_lots.find((l) => l.id === 'lot-store2')?.remaining_qty).toBe(5000);
  });

  it('7. allocateStoreBomFifoDeduction throws INSUFFICIENT_STORE_BOM_STOCK when strict mode lacks inventory', () => {
    const lots: StoreBomLotSnapshotInput[] = [
      {
        id: 'lot-low',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.condensedMilk,
        lot_code: 'LOT-MILK-01',
        roast_date: null,
        received_at: '2026-11-15T08:00:00.000Z',
        remaining_qty: 30,
        status: 'AVAILABLE',
      },
    ];

    expect(() =>
      allocateStoreBomFifoDeduction({
        storeId: SEED_IDS.stores.store01,
        requirements: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
            sku: 'ING-COND-MILK',
            name: 'Condensed Milk',
            base_unit: 'ml',
            required_qty: 50,
          },
        ],
        availableLots: lots,
        allowPartialOnShortage: false,
      }),
    ).toThrow(/INSUFFICIENT_STORE_BOM_STOCK/);
  });

  it('8. allocateStoreBomFifoDeduction supports allowPartialOnShortage=true and reports exact shortage_qty', () => {
    const lots: StoreBomLotSnapshotInput[] = [
      {
        id: 'lot-low',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.condensedMilk,
        lot_code: 'LOT-MILK-01',
        roast_date: null,
        received_at: '2026-11-15T08:00:00.000Z',
        remaining_qty: 30,
        status: 'AVAILABLE',
      },
    ];

    const res = allocateStoreBomFifoDeduction({
      storeId: SEED_IDS.stores.store01,
      requirements: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
          sku: 'ING-COND-MILK',
          name: 'Condensed Milk',
          base_unit: 'ml',
          required_qty: 50,
        },
      ],
      availableLots: lots,
      allowPartialOnShortage: true,
    });

    expect(res.has_shortage).toBe(true);
    expect(res.deductions[0]?.deducted_qty).toBe(30);
    expect(res.deductions[0]?.shortage_qty).toBe(20);
    expect(res.updated_lots[0]?.status).toBe('DEPLETED');
  });

  it('9. classifyShiftCashVarianceStatus returns BALANCED, SURPLUS, and SHORTAGE accurately', () => {
    expect(classifyShiftCashVarianceStatus(0)).toBe('BALANCED');
    expect(classifyShiftCashVarianceStatus(15000)).toBe('SURPLUS');
    expect(classifyShiftCashVarianceStatus(-25000)).toBe('SHORTAGE');
  });

  it('10. calculateBlindShiftCloseVariance sums ONLY PAID CASH orders and excludes VIETQR, PENDING & VOIDED from expected cash', () => {
    const result = calculateBlindShiftCloseVariance({
      openingCashVnd: 2000000,
      blindCountedCashVnd: 2145000,
      orders: [
        { payment_method: 'CASH', payment_status: 'PAID', total_amount_vnd: 85000 },
        { payment_method: 'CASH', payment_status: 'PAID', total_amount_vnd: 60000 },
        { payment_method: 'VIETQR', payment_status: 'PAID', total_amount_vnd: 120000 },
        { payment_method: 'VIETQR', payment_status: 'PENDING', total_amount_vnd: 45000 },
        { payment_method: 'CASH', payment_status: 'VOIDED', total_amount_vnd: 50000 },
      ],
    });

    expect(result.cash_sales_vnd).toBe(145000);
    expect(result.vietqr_sales_vnd).toBe(120000);
    expect(result.paid_cash_orders_count).toBe(2);
    expect(result.voided_orders_count).toBe(1);
    expect(result.system_expected_cash_vnd).toBe(2145000);
    expect(result.variance_cash_vnd).toBe(0);
    expect(result.variance_status).toBe('BALANCED');
  });

  it('11. calculateBlindShiftCloseVariance detects SHORTAGE when blind counted cash is below system expected cash', () => {
    const result = calculateBlindShiftCloseVariance({
      openingCashVnd: 2000000,
      blindCountedCashVnd: 2100000,
      orders: [
        { payment_method: 'CASH', payment_status: 'PAID', total_amount_vnd: 145000 },
      ],
    });

    expect(result.system_expected_cash_vnd).toBe(2145000);
    expect(result.variance_cash_vnd).toBe(-45000);
    expect(result.variance_status).toBe('SHORTAGE');
  });

  it('12. calculateBlindShiftCloseVariance detects SURPLUS when blind counted cash exceeds system expected cash', () => {
    const result = calculateBlindShiftCloseVariance({
      openingCashVnd: 1500000,
      blindCountedCashVnd: 1620000,
      orders: [
        { payment_method: 'CASH', payment_status: 'PAID', total_amount_vnd: 100000 },
      ],
    });

    expect(result.system_expected_cash_vnd).toBe(1600000);
    expect(result.variance_cash_vnd).toBe(20000);
    expect(result.variance_status).toBe('SURPLUS');
  });

  it('13. calculateBlindShiftCloseVariance rejects negative or float cash values', () => {
    expect(() =>
      calculateBlindShiftCloseVariance({
        openingCashVnd: -100,
        blindCountedCashVnd: 0,
        orders: [],
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateBlindShiftCloseVariance({
        openingCashVnd: 1000,
        blindCountedCashVnd: 1000.5,
        orders: [],
      }),
    ).toThrow(RangeError);
  });

  it('14. calculateDailyStocktakeVariance computes exact theoretical closing, variance, and flags >3% abnormal shrinkage', () => {
    const res = calculateDailyStocktakeVariance({
      openingQty: 5000,
      receivedInQty: 2000,
      bomConsumedQty: 1000,
      actualCountedQty: 5750,
    });

    // theoretical = 6000, variance = -250, variance_pct = -4.17% -> abnormal!
    expect(res.theoretical_closing_qty).toBe(6000);
    expect(res.variance_qty).toBe(-250);
    expect(res.variance_pct).toBe(-4.17);
    expect(res.is_abnormal_shrinkage).toBe(true);
  });

  it('15. calculateDailyStocktakeVariance does NOT flag shrinkage within 3.0% tolerance or positive surplus', () => {
    const normalLoss = calculateDailyStocktakeVariance({
      openingQty: 5000,
      receivedInQty: 0,
      bomConsumedQty: 1000,
      actualCountedQty: 3880,
    });
    // theoretical = 4000, variance = -120, pct = -3.00% (<= 3.0%) -> NOT abnormal
    expect(normalLoss.variance_pct).toBe(-3);
    expect(normalLoss.is_abnormal_shrinkage).toBe(false);

    const surplus = calculateDailyStocktakeVariance({
      openingQty: 5000,
      receivedInQty: 0,
      bomConsumedQty: 1000,
      actualCountedQty: 4200,
    });
    expect(surplus.variance_qty).toBe(200);
    expect(surplus.variance_pct).toBe(5);
    expect(surplus.is_abnormal_shrinkage).toBe(false);
  });

  it('16. calculateDailyStocktakeVariance safely returns variance_pct=0 when theoretical_closing_qty <= 0', () => {
    const res = calculateDailyStocktakeVariance({
      openingQty: 100,
      receivedInQty: 0,
      bomConsumedQty: 120,
      actualCountedQty: 0,
    });
    expect(res.theoretical_closing_qty).toBe(-20);
    expect(res.variance_qty).toBe(20);
    expect(res.variance_pct).toBe(0);
    expect(res.is_abnormal_shrinkage).toBe(false);
  });

  it('17. AdvanceKdsTicketStatusSchema validates KDS status enum and defaults allow_partial_on_shortage=false', () => {
    const parsed = AdvanceKdsTicketStatusSchema.parse({
      store_id: SEED_IDS.stores.store01,
      order_id: '90000000-0000-4000-8000-000000000001',
      target_status: 'PREPARING',
    });
    expect(parsed.allow_partial_on_shortage).toBe(false);

    const bad = AdvanceKdsTicketStatusSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      order_id: '90000000-0000-4000-8000-000000000001',
      target_status: 'INVALID_STATUS',
    });
    expect(bad.success).toBe(false);
  });

  it('18. CompleteKdsBomDeductionSchema validates store_id, order_id and optional partial flag', () => {
    const parsed = CompleteKdsBomDeductionSchema.parse({
      store_id: SEED_IDS.stores.store01,
      order_id: '90000000-0000-4000-8000-000000000001',
      allow_partial_on_shortage: true,
    });
    expect(parsed.allow_partial_on_shortage).toBe(true);
  });

  it('19. ReportBaristaLowStockAlertSchema validates severity and minimum note length', () => {
    const valid = ReportBaristaLowStockAlertSchema.parse({
      store_id: SEED_IDS.stores.store01,
      inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
      note: 'Sap het sua dac tai quay bar',
    });
    expect(valid.severity).toBe('OUT_OF_STOCK');

    const invalid = ReportBaristaLowStockAlertSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
      note: 'x',
    });
    expect(invalid.success).toBe(false);
  });

  it('20. BlindClosePosShiftRequestSchema enforces non-negative integer blind_counted_cash_vnd', () => {
    const valid = BlindClosePosShiftRequestSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      blind_counted_cash_vnd: 2145000,
    });
    expect(valid.success).toBe(true);

    const neg = BlindClosePosShiftRequestSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      blind_counted_cash_vnd: -1000,
    });
    expect(neg.success).toBe(false);
  });

  it('21. SubmitStoreDailyStocktakeSchema enforces YYYY-MM-DD date and >= 1 item', () => {
    const valid = SubmitStoreDailyStocktakeSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      stocktake_date: '2026-11-22',
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          opening_qty: 5000,
          received_in_qty: 0,
          bom_consumed_qty: 400,
          actual_counted_qty: 4550,
        },
      ],
    });
    expect(valid.success).toBe(true);

    const badDate = SubmitStoreDailyStocktakeSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      stocktake_date: '22/11/2026',
      items: [],
    });
    expect(badDate.success).toBe(false);
  });

  it('22. KdsQueueQuerySchema transforms string include_completed="true" to boolean true', () => {
    const parsed = KdsQueueQuerySchema.parse({
      store_id: SEED_IDS.stores.store01,
      include_completed: 'true',
      limit: '30',
    });
    expect(parsed.include_completed).toBe(true);
    expect(parsed.limit).toBe(30);
  });
});
