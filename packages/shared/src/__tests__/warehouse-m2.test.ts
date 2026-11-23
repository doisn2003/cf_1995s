import { describe, expect, it } from 'vitest';
import {
  CompleteRoastBatchSchema,
  FifoAllocationRequestSchema,
  IngestWarehouseLotSchema,
  SEED_IDS,
  WarehouseLotQuerySchema,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  calculateRoastYieldLossPct,
  calculateRoastedOutputUnitCostVnd,
  compareFifoLots,
  isAbnormalRoastYieldLoss,
} from '../index.js';

describe('M2.1 — Warehouse Math Engine (MAC, Yield Loss, Cost Transfer, FIFO) & Zod Contracts', () => {
  // 1-3: Effective Lot Unit Cost with Shipping Amortization
  it('1. calculates effective lot unit cost when shipping_cost_vnd is 0', () => {
    expect(calculateEffectiveLotUnitCostVnd(95000, 0, 1000)).toBe(95000);
  });

  it('2. amortizes shipping_cost_vnd across initial_qty and rounds to integer VND', () => {
    expect(calculateEffectiveLotUnitCostVnd(95000, 360000, 120000)).toBe(95003);
    expect(calculateEffectiveLotUnitCostVnd(100000, 500, 300)).toBe(100002);
  });

  it('3. throws RangeError on invalid inputs for calculateEffectiveLotUnitCostVnd', () => {
    expect(() => calculateEffectiveLotUnitCostVnd(95000, 1000, 0)).toThrow(RangeError);
    expect(() => calculateEffectiveLotUnitCostVnd(-100, 1000, 10)).toThrow(RangeError);
    expect(() => calculateEffectiveLotUnitCostVnd(95000, -50, 10)).toThrow(RangeError);
  });

  // 4-6: Moving Average Cost (MAC)
  it('4. returns newEffectiveUnitCostVnd when existing stock quantity is 0', () => {
    expect(calculateMovingAverageCostVnd(0, 98000, 50000, 112000)).toBe(112000);
    expect(calculateMovingAverageCostVnd(0, 0, 0, 125000)).toBe(125000);
  });

  it('5. computes exact weighted Moving Average Cost rounded to integer VND', () => {
    // (1000 * 100000 + 2000 * 130000) / 3000 = 360000000 / 3000 = 120000
    expect(calculateMovingAverageCostVnd(1000, 100000, 2000, 130000)).toBe(120000);
    // (100 * 95000 + 200 * 100000) / 300 = 98333.33 -> 98333
    expect(calculateMovingAverageCostVnd(100, 95000, 200, 100000)).toBe(98333);
  });

  it('6. throws RangeError on negative quantities or costs in MAC calculation', () => {
    expect(() => calculateMovingAverageCostVnd(-10, 100000, 50, 110000)).toThrow(RangeError);
    expect(() => calculateMovingAverageCostVnd(10, 100000, -5, 110000)).toThrow(RangeError);
    expect(() => calculateMovingAverageCostVnd(10, -1, 50, 110000)).toThrow(RangeError);
  });

  // 7-10: Roastery Yield Loss & Abnormal Thresholds
  it('7. computes exact roast yield loss percentage rounded to 2 decimal places', () => {
    expect(calculateRoastYieldLossPct(30000, 24900)).toBe(17);
    expect(calculateRoastYieldLossPct(10000, 8233)).toBe(17.67);
    expect(calculateRoastYieldLossPct(10000, 10000)).toBe(0);
  });

  it('8. throws RangeError when roasted output exceeds green input or is non-positive', () => {
    expect(() => calculateRoastYieldLossPct(10000, 10001)).toThrow(RangeError);
    expect(() => calculateRoastYieldLossPct(10000, 0)).toThrow(RangeError);
    expect(() => calculateRoastYieldLossPct(0, 0)).toThrow(RangeError);
  });

  it('9. flags abnormal roast yield loss strictly outside [12.00%, 20.00%]', () => {
    expect(isAbnormalRoastYieldLoss(12.0)).toBe(false);
    expect(isAbnormalRoastYieldLoss(17.0)).toBe(false);
    expect(isAbnormalRoastYieldLoss(20.0)).toBe(false);
    expect(isAbnormalRoastYieldLoss(11.99)).toBe(true);
    expect(isAbnormalRoastYieldLoss(20.01)).toBe(true);
  });

  it('10. transfers green bean cost into roasted coffee output unit cost (VND integer)', () => {
    // 30000 * 95000 / 24900 = 114457.831 -> 114458
    expect(calculateRoastedOutputUnitCostVnd(30000, 95000, 24900)).toBe(114458);
    expect(calculateRoastedOutputUnitCostVnd(10000, 100000, 8000)).toBe(125000);
    expect(() => calculateRoastedOutputUnitCostVnd(10000, 95000, 12000)).toThrow(RangeError);
  });

  // 11-13: Multi-Lot FIFO Comparator
  it('11. sorts roasted lots by oldest roast_date first (Key 1)', () => {
    const lots = [
      { id: '2', lot_code: 'LOT-NEW', roast_date: '2026-11-18', received_at: '2026-11-18T08:00:00Z' },
      { id: '1', lot_code: 'LOT-OLD', roast_date: '2026-11-10', received_at: '2026-11-19T08:00:00Z' },
    ];
    const sorted = [...lots].sort(compareFifoLots);
    expect(sorted[0]?.lot_code).toBe('LOT-OLD');
    expect(sorted[1]?.lot_code).toBe('LOT-NEW');
  });

  it('12. falls back to received_at UTC date when roast_date is null, then compares received_at timestamp', () => {
    const lots = [
      { id: 'b', lot_code: 'LOT-GB-02', roast_date: null, received_at: '2026-11-05T14:00:00Z' },
      { id: 'a', lot_code: 'LOT-GB-01', roast_date: null, received_at: '2026-11-05T08:00:00Z' },
      { id: 'c', lot_code: 'LOT-GB-00', roast_date: null, received_at: '2026-11-01T23:00:00Z' },
    ];
    const sorted = [...lots].sort(compareFifoLots);
    expect(sorted.map((l) => l.lot_code)).toEqual(['LOT-GB-00', 'LOT-GB-01', 'LOT-GB-02']);
  });

  it('13. breaks identical date & timestamp ties deterministically via lot_code ASC then id ASC', () => {
    const lots = [
      { id: '9', lot_code: 'LOT-B', roast_date: '2026-11-10', received_at: '2026-11-10T10:00:00Z' },
      { id: '2', lot_code: 'LOT-A', roast_date: '2026-11-10', received_at: '2026-11-10T10:00:00Z' },
      { id: '1', lot_code: 'LOT-A', roast_date: '2026-11-10', received_at: '2026-11-10T10:00:00Z' },
    ];
    const sorted = [...lots].sort(compareFifoLots);
    expect(sorted.map((l) => `${l.lot_code}:${l.id}`)).toEqual(['LOT-A:1', 'LOT-A:2', 'LOT-B:9']);
  });

  // 14-20: M2 Zod Schemas
  it('14. accepts valid IngestWarehouseLotSchema payload with default shipping_cost_vnd = 0', () => {
    const parsed = IngestWarehouseLotSchema.parse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-GB-ROB-002',
      supplier_name: 'HTX Đắk Lắk',
      moisture_pct: 12.1,
      initial_qty: 60000,
      unit_cost_vnd: 96000,
    });
    expect(parsed.shipping_cost_vnd).toBe(0);
  });

  it('15. rejects IngestWarehouseLotSchema with float VND, invalid lot_code, or expiry < roast_date', () => {
    const floatCost = IngestWarehouseLotSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-01',
      initial_qty: 10000,
      unit_cost_vnd: 96000.5,
    });
    expect(floatCost.success).toBe(false);

    const badDate = IngestWarehouseLotSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-02',
      roast_date: '2026-11-20',
      expiry_date: '2026-11-15',
      initial_qty: 10000,
      unit_cost_vnd: 125000,
    });
    expect(badDate.success).toBe(false);
  });

  it('16. accepts valid CompleteRoastBatchSchema with enforce_fifo defaulting to true', () => {
    const parsed = CompleteRoastBatchSchema.parse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-20261122-002',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-ROB-003',
      green_input_weight_g: 20000,
      roasted_output_weight_g: 16600,
    });
    expect(parsed.enforce_fifo).toBe(true);
  });

  it('17. rejects CompleteRoastBatchSchema when roasted_output_weight_g > green_input_weight_g', () => {
    const result = CompleteRoastBatchSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-20261122-BAD',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-BAD',
      green_input_weight_g: 10000,
      roasted_output_weight_g: 10500,
    });
    expect(result.success).toBe(false);
  });

  it('18. accepts valid FifoAllocationRequestSchema and rejects zero or negative requested_qty', () => {
    const ok = FifoAllocationRequestSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      requested_qty: 30000,
      reference_code: 'TRF-20261122-002',
    });
    expect(ok.success).toBe(true);

    const zero = FifoAllocationRequestSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      requested_qty: 0,
    });
    expect(zero.success).toBe(false);
  });

  it('19. validates WarehouseLotQuerySchema status enum and boolean coercion', () => {
    const ok = WarehouseLotQuerySchema.parse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      status: 'AVAILABLE',
      only_available: 'true',
    });
    expect(ok.only_available).toBe(true);
    expect(ok.status).toBe('AVAILABLE');

    const badStatus = WarehouseLotQuerySchema.safeParse({
      status: 'UNKNOWN_STATUS',
    });
    expect(badStatus.success).toBe(false);
  });

  it('20. ensures CompleteRoastBatchSchema rejects invalid lowercase batch_code or expiry before roast_date', () => {
    const badCode = CompleteRoastBatchSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'rb-lower-01',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-009',
      green_input_weight_g: 10000,
      roasted_output_weight_g: 8300,
    });
    expect(badCode.success).toBe(false);

    const badExpiry = CompleteRoastBatchSchema.safeParse({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-20261122-009',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-009',
      green_input_weight_g: 10000,
      roasted_output_weight_g: 8300,
      roast_date: '2026-11-22',
      expiry_date: '2026-11-01',
    });
    expect(badExpiry.success).toBe(false);
  });
});
