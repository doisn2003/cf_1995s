# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M2.1 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **6 files (4 + 2)**.
- **Tiền đề đã hoàn thành:** `C:\bib\cf_19\supabase\migrations\0003_m2_wms_roastery_fifo_rpcs.sql` (RBAC Guard + 3 Atomic PL/pgSQL RPCs).

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# HỢP ĐỒNG M2 TRONG `@cf19/shared` (SCHEMAS, TYPES & BARREL EXPORTS — 4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây cho hợp đồng M2 trong gói `@cf19/shared`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi tên file, không đổi tên schema/type, không đổi đuôi `.js` trong import ESM.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `utils/warehouseMath.ts` hay `__tests__/warehouse-m2.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M2.1 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\packages\shared\src\schemas\warehouse.schema.ts` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\types\warehouse.types.ts` (Tạo mới)
3. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Overwrite)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\packages\shared\src\schemas\warehouse.schema.ts`
```ts
import { z } from 'zod';
import { LOT_STATUSES } from '../enums.js';
import {
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
} from './auth.schema.js';

const UpperCodeSchema = z
  .string()
  .trim()
  .min(3, 'Code must be at least 3 characters')
  .max(64, 'Code must be at most 64 characters')
  .regex(
    /^[A-Z0-9_-]+$/,
    'Code must contain only uppercase letters, digits, underscores, or hyphens',
  );

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const IngestWarehouseLotSchema = z
  .object({
    warehouse_store_id: UuidSchema,
    item_id: UuidSchema,
    lot_code: UpperCodeSchema,
    supplier_name: z.string().trim().min(2).max(150).optional(),
    moisture_pct: z.number().finite().min(0).max(100).optional(),
    roast_date: IsoDateSchema.optional(),
    expiry_date: IsoDateSchema.optional(),
    initial_qty: QtyPositiveSchema,
    unit_cost_vnd: VndNonNegativeSchema,
    shipping_cost_vnd: VndNonNegativeSchema.default(0),
  })
  .refine(
    (data) =>
      !data.roast_date || !data.expiry_date || data.expiry_date >= data.roast_date,
    {
      message: 'expiry_date must be on or after roast_date',
      path: ['expiry_date'],
    },
  );

export const CompleteRoastBatchSchema = z
  .object({
    warehouse_store_id: UuidSchema,
    batch_code: UpperCodeSchema,
    source_green_lot_id: UuidSchema,
    output_item_id: UuidSchema,
    output_lot_code: UpperCodeSchema,
    green_input_weight_g: QtyPositiveSchema,
    roasted_output_weight_g: QtyPositiveSchema,
    roast_date: IsoDateSchema.optional(),
    expiry_date: IsoDateSchema.optional(),
    roast_profile: z.string().trim().max(120).optional(),
    moisture_pct: z.number().finite().min(0).max(100).optional(),
    notes: z.string().trim().max(500).optional(),
    enforce_fifo: z.boolean().default(true),
  })
  .refine(
    (data) => data.roasted_output_weight_g <= data.green_input_weight_g,
    {
      message: 'roasted_output_weight_g cannot exceed green_input_weight_g',
      path: ['roasted_output_weight_g'],
    },
  )
  .refine(
    (data) =>
      !data.roast_date || !data.expiry_date || data.expiry_date >= data.roast_date,
    {
      message: 'expiry_date must be on or after roast_date',
      path: ['expiry_date'],
    },
  );

export const FifoAllocationRequestSchema = z.object({
  warehouse_store_id: UuidSchema,
  item_id: UuidSchema,
  requested_qty: QtyPositiveSchema,
  reference_code: z.string().trim().min(2).max(64).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const WarehouseLotQuerySchema = z.object({
  warehouse_store_id: UuidSchema.optional(),
  item_id: UuidSchema.optional(),
  status: z.enum(LOT_STATUSES).optional(),
  only_available: z.coerce.boolean().optional(),
});
```

### File 2: `C:\bib\cf_19\packages\shared\src\types\warehouse.types.ts`
```ts
import type { z } from 'zod';
import type { BaseUnit, InventoryCategory, LotStatus } from '../enums.js';
import type {
  CompleteRoastBatchSchema,
  FifoAllocationRequestSchema,
  IngestWarehouseLotSchema,
  WarehouseLotQuerySchema,
} from '../schemas/warehouse.schema.js';
import type { RoastBatchDto, WarehouseLotFullDto } from './domain.types.js';

export type IngestWarehouseLotDTO = z.infer<typeof IngestWarehouseLotSchema>;
export type CompleteRoastBatchDTO = z.infer<typeof CompleteRoastBatchSchema>;
export type FifoAllocationRequestDTO = z.infer<typeof FifoAllocationRequestSchema>;
export type WarehouseLotQueryDTO = z.infer<typeof WarehouseLotQuerySchema>;

export interface WarehouseLotIngestResultDTO {
  lot: WarehouseLotFullDto;
  item_id: string;
  previous_qty: number;
  previous_mac_vnd: number;
  effective_unit_cost_vnd: number;
  new_mac_vnd: number;
}

export interface CompleteRoastBatchResultDTO {
  roast_batch: RoastBatchDto;
  output_lot: WarehouseLotFullDto;
  source_lot_id: string;
  source_lot_remaining_qty: number;
  source_lot_status: LotStatus;
  weight_loss_pct: number;
  is_abnormal_yield_loss: boolean;
  output_unit_cost_vnd: number;
  new_output_item_mac_vnd: number;
}

export interface FifoLotAllocationSliceDTO {
  lot_id: string;
  lot_code: string;
  roast_date: string | null;
  received_at: string;
  allocated_qty: number;
  remaining_after_qty: number;
  lot_status_after: LotStatus;
  unit_cost_vnd: number;
  slice_cogs_vnd: number;
}

export interface FifoAllocationResultDTO {
  warehouse_store_id: string;
  item_id: string;
  requested_qty: number;
  total_allocated_qty: number;
  total_cogs_vnd: number;
  weighted_unit_cost_vnd: number;
  reference_code: string | null;
  allocations: FifoLotAllocationSliceDTO[];
}

export interface WarehouseStockSummaryDTO {
  item_id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  base_unit: BaseUnit;
  min_stock_threshold: number;
  total_available_qty: number;
  available_lot_count: number;
  moving_avg_cost_vnd: number;
  estimated_stock_value_vnd: number;
  is_low_stock: boolean;
}

export interface WarehouseOverviewDTO {
  warehouse_store_id: string;
  warehouse_code: string;
  warehouse_name: string;
  total_skus: number;
  total_available_lots: number;
  low_stock_sku_count: number;
  total_inventory_value_vnd: number;
  recent_roast_batches_count: number;
  stock_summaries: WarehouseStockSummaryDTO[];
}
```

### File 3: `C:\bib\cf_19\packages\shared\src\schemas\index.ts`
```ts
export * from './auth.schema.js';
export * from './store.schema.js';
export * from './operations.schema.js';
export * from './warehouse.schema.js';
```

### File 4: `C:\bib\cf_19\packages\shared\src\index.ts`
```ts
export * from './enums.js';
export * from './constants/seedIds.js';
export * from './constants/securityKeys.js';
export * from './schemas/index.js';
export * from './types/domain.types.js';
export * from './types/warehouse.types.js';
export * from './utils/warehouseMath.js';
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M2.1 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\packages\shared\src\schemas\warehouse.schema.ts','C:\bib\cf_19\packages\shared\src\types\warehouse.types.ts','C:\bib\cf_19\packages\shared\src\schemas\index.ts','C:\bib\cf_19\packages\shared\src\index.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# PURE WAREHOUSE MATH ENGINE & BỘ VITEST UNIT TESTS M2.1 (2 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 2 file dưới đây: động cơ toán học thuần túy `warehouseMath.ts` và bộ 20 Vitest unit test cases `warehouse-m2.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thay đổi công thức làm tròn, không rút gọn test cases.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 2 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1` hay `supabase/migrations/0003_m2_wms_roastery_fifo_rpcs.sql`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 2 file và chạy lệnh `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M2.1 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (2 TARGET FILES)
1. `C:\bib\cf_19\packages\shared\src\utils\warehouseMath.ts` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\__tests__\warehouse-m2.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\packages\shared\src\utils\warehouseMath.ts`
```ts
export const ROAST_YIELD_LOSS_MIN_NORMAL_PCT = 12.0;
export const ROAST_YIELD_LOSS_MAX_NORMAL_PCT = 20.0;

export interface FifoSortableLot {
  id: string;
  lot_code: string;
  roast_date: string | null;
  received_at: string;
}

/**
 * Computes effective unit cost (VND integer) of an ingested lot with amortized shipping cost:
 *   effective_unit_cost_vnd = unit_cost_vnd + ROUND(shipping_cost_vnd / initial_qty)
 */
export function calculateEffectiveLotUnitCostVnd(
  unitCostVnd: number,
  shippingCostVnd: number,
  initialQty: number,
): number {
  if (!Number.isFinite(initialQty) || initialQty <= 0) {
    throw new RangeError('initialQty must be a positive finite number');
  }
  if (!Number.isFinite(unitCostVnd) || unitCostVnd < 0) {
    throw new RangeError('unitCostVnd must be a non-negative finite number');
  }
  if (!Number.isFinite(shippingCostVnd) || shippingCostVnd < 0) {
    throw new RangeError('shippingCostVnd must be a non-negative finite number');
  }

  return Math.round(unitCostVnd) + Math.round(shippingCostVnd / initialQty);
}

/**
 * Computes Moving Average Cost (MAC) in integer VND:
 *   new_mac_vnd = ROUND((oldQty * oldMacVnd + newQty * newEffectiveUnitCostVnd) / (oldQty + newQty))
 */
export function calculateMovingAverageCostVnd(
  oldQty: number,
  oldMacVnd: number,
  newQty: number,
  newEffectiveUnitCostVnd: number,
): number {
  if (!Number.isFinite(oldQty) || oldQty < 0) {
    throw new RangeError('oldQty must be a non-negative finite number');
  }
  if (!Number.isFinite(newQty) || newQty < 0) {
    throw new RangeError('newQty must be a non-negative finite number');
  }
  if (!Number.isFinite(oldMacVnd) || oldMacVnd < 0) {
    throw new RangeError('oldMacVnd must be a non-negative finite number');
  }
  if (!Number.isFinite(newEffectiveUnitCostVnd) || newEffectiveUnitCostVnd < 0) {
    throw new RangeError('newEffectiveUnitCostVnd must be a non-negative finite number');
  }

  const totalQty = oldQty + newQty;
  if (totalQty <= 0) {
    return Math.round(newEffectiveUnitCostVnd);
  }

  const weightedTotal = oldQty * oldMacVnd + newQty * newEffectiveUnitCostVnd;
  return Math.round(weightedTotal / totalQty);
}

/**
 * Computes roast yield weight loss percentage rounded to 2 decimal places:
 *   weight_loss_pct = ROUND(((greenInputWeightG - roastedOutputWeightG) / greenInputWeightG) * 100, 2)
 */
export function calculateRoastYieldLossPct(
  greenInputWeightG: number,
  roastedOutputWeightG: number,
): number {
  if (!Number.isFinite(greenInputWeightG) || greenInputWeightG <= 0) {
    throw new RangeError('greenInputWeightG must be a positive finite number');
  }
  if (
    !Number.isFinite(roastedOutputWeightG) ||
    roastedOutputWeightG <= 0 ||
    roastedOutputWeightG > greenInputWeightG
  ) {
    throw new RangeError(
      'roastedOutputWeightG must satisfy 0 < roastedOutputWeightG <= greenInputWeightG',
    );
  }

  const rawPct =
    ((greenInputWeightG - roastedOutputWeightG) / greenInputWeightG) * 100;
  return Math.round(rawPct * 100) / 100;
}

/**
 * Flags abnormal roast yield loss outside the Central Highlands standard [12.00%, 20.00%].
 */
export function isAbnormalRoastYieldLoss(weightLossPct: number): boolean {
  return (
    weightLossPct < ROAST_YIELD_LOSS_MIN_NORMAL_PCT ||
    weightLossPct > ROAST_YIELD_LOSS_MAX_NORMAL_PCT
  );
}

/**
 * Transfers green bean cost into roasted coffee output unit cost (VND integer):
 *   output_unit_cost_vnd = ROUND((greenInputWeightG * sourceGreenUnitCostVnd) / roastedOutputWeightG)
 */
export function calculateRoastedOutputUnitCostVnd(
  greenInputWeightG: number,
  sourceGreenUnitCostVnd: number,
  roastedOutputWeightG: number,
): number {
  if (!Number.isFinite(greenInputWeightG) || greenInputWeightG <= 0) {
    throw new RangeError('greenInputWeightG must be a positive finite number');
  }
  if (!Number.isFinite(sourceGreenUnitCostVnd) || sourceGreenUnitCostVnd < 0) {
    throw new RangeError('sourceGreenUnitCostVnd must be a non-negative finite number');
  }
  if (
    !Number.isFinite(roastedOutputWeightG) ||
    roastedOutputWeightG <= 0 ||
    roastedOutputWeightG > greenInputWeightG
  ) {
    throw new RangeError(
      'roastedOutputWeightG must satisfy 0 < roastedOutputWeightG <= greenInputWeightG',
    );
  }

  return Math.round(
    (greenInputWeightG * sourceGreenUnitCostVnd) / roastedOutputWeightG,
  );
}

function resolveFifoUtcDateKey(lot: FifoSortableLot): string {
  if (lot.roast_date) {
    return lot.roast_date;
  }
  const parsedMs = Date.parse(lot.received_at);
  if (!Number.isNaN(parsedMs)) {
    return new Date(parsedMs).toISOString().slice(0, 10);
  }
  return lot.received_at.slice(0, 10);
}

/**
 * Deterministic Multi-Lot FIFO Comparator matching 0003_m2_wms_roastery_fifo_rpcs.sql:
 *   1. COALESCE(roast_date, UTC date of received_at) ASC
 *   2. received_at ASC
 *   3. lot_code ASC
 *   4. id ASC
 */
export function compareFifoLots(a: FifoSortableLot, b: FifoSortableLot): number {
  const aDate = resolveFifoUtcDateKey(a);
  const bDate = resolveFifoUtcDateKey(b);
  if (aDate !== bDate) {
    return aDate.localeCompare(bDate);
  }

  const aTs = Date.parse(a.received_at);
  const bTs = Date.parse(b.received_at);
  if (!Number.isNaN(aTs) && !Number.isNaN(bTs) && aTs !== bTs) {
    return aTs - bTs;
  }
  if (a.received_at !== b.received_at) {
    return a.received_at.localeCompare(b.received_at);
  }

  const codeDiff = a.lot_code.localeCompare(b.lot_code);
  if (codeDiff !== 0) {
    return codeDiff;
  }

  return a.id.localeCompare(b.id);
}
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\warehouse-m2.test.ts`
```ts
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
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 2 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M2.1 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\packages\shared\src\utils\warehouseMath.ts','C:\bib\cf_19\packages\shared\src\__tests__\warehouse-m2.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
