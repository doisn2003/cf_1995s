# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M6.1 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M6.1 - @cf19/shared KDS SLA, Multi-Level BOM FIFO Deduction, Blind Shift Cash Close & EOD Stocktake Variance Contracts + Pure Math Engine`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M6_1_KING_CHARTER.md` và `0007_m6_kds_bom_deduction_and_blind_close_rpcs.sql`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không bỏ `.js` trong import tương đối của `@cf19/shared` (`moduleResolution: "NodeNext"`), không đặt trùng tên symbol đã có ở M1–M5 (`OpenShiftSchema`, `BlindCloseShiftSchema`, ...).
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 4 files trong `@cf19/shared`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\packages\shared\src\schemas\kdsAndShift.schema.ts` (Tạo mới)
  2. `C:\bib\cf_19\packages\shared\src\types\kdsAndShift.types.ts` (Tạo mới)
  3. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Overwrite)
  4. `C:\bib\cf_19\packages\shared\src\index.ts` (Overwrite)

### File 1: `C:\bib\cf_19\packages\shared\src\schemas\kdsAndShift.schema.ts`

```ts
import { z } from 'zod';
import { KDS_STATUSES } from '../enums.js';
import {
  QtyNonNegativeSchema,
  UuidSchema,
  VndNonNegativeSchema,
} from './auth.schema.js';

export const BARISTA_ALERT_SEVERITIES = ['LOW', 'OUT_OF_STOCK'] as const;
export type BaristaAlertSeverity = (typeof BARISTA_ALERT_SEVERITIES)[number];

export const AdvanceKdsTicketStatusSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  target_status: z.enum(KDS_STATUSES),
  allow_partial_on_shortage: z.boolean().optional().default(false),
});

export type AdvanceKdsTicketStatusInput = z.infer<typeof AdvanceKdsTicketStatusSchema>;

export const CompleteKdsBomDeductionSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  allow_partial_on_shortage: z.boolean().optional().default(false),
});

export type CompleteKdsBomDeductionInput = z.infer<
  typeof CompleteKdsBomDeductionSchema
>;

export const ReportBaristaLowStockAlertSchema = z.object({
  store_id: UuidSchema,
  inventory_item_id: UuidSchema,
  severity: z.enum(BARISTA_ALERT_SEVERITIES).default('OUT_OF_STOCK'),
  note: z.string().trim().min(2, 'Alert note must be at least 2 characters').max(300),
});

export type ReportBaristaLowStockAlertInput = z.infer<
  typeof ReportBaristaLowStockAlertSchema
>;

export const BlindClosePosShiftRequestSchema = z.object({
  store_id: UuidSchema,
  shift_id: UuidSchema,
  blind_counted_cash_vnd: VndNonNegativeSchema,
  notes: z.string().trim().max(500).optional(),
});

export type BlindClosePosShiftRequestInput = z.infer<
  typeof BlindClosePosShiftRequestSchema
>;

export const StoreDailyStocktakeEntrySchema = z.object({
  inventory_item_id: UuidSchema,
  opening_qty: QtyNonNegativeSchema,
  received_in_qty: QtyNonNegativeSchema.default(0),
  bom_consumed_qty: QtyNonNegativeSchema.default(0),
  actual_counted_qty: QtyNonNegativeSchema,
  notes: z.string().trim().max(300).optional(),
});

export type StoreDailyStocktakeEntryInput = z.infer<
  typeof StoreDailyStocktakeEntrySchema
>;

export const SubmitStoreDailyStocktakeSchema = z.object({
  store_id: UuidSchema,
  stocktake_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'stocktake_date must be YYYY-MM-DD'),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(StoreDailyStocktakeEntrySchema)
    .min(1, 'Daily stocktake must include at least 1 inventory item')
    .max(200),
});

export type SubmitStoreDailyStocktakeInput = z.infer<
  typeof SubmitStoreDailyStocktakeSchema
>;

export const KdsQueueQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  include_completed: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1)
    .max(200)
    .default(50),
});

export type KdsQueueQueryInput = z.infer<typeof KdsQueueQuerySchema>;
```

### File 2: `C:\bib\cf_19\packages\shared\src\types\kdsAndShift.types.ts`

```ts
import type { z } from 'zod';
import type {
  BaseUnit,
  KdsStatus,
  LotStatus,
  MenuSizeCode,
  PaymentMethod,
  PaymentStatus,
} from '../enums.js';
import type {
  AdvanceKdsTicketStatusSchema,
  BaristaAlertSeverity,
  BlindClosePosShiftRequestSchema,
  CompleteKdsBomDeductionSchema,
  KdsQueueQuerySchema,
  ReportBaristaLowStockAlertSchema,
  SubmitStoreDailyStocktakeSchema,
} from '../schemas/kdsAndShift.schema.js';

export type AdvanceKdsTicketStatusDTO = z.infer<typeof AdvanceKdsTicketStatusSchema>;
export type CompleteKdsBomDeductionDTO = z.infer<typeof CompleteKdsBomDeductionSchema>;
export type ReportBaristaLowStockAlertDTO = z.infer<
  typeof ReportBaristaLowStockAlertSchema
>;
export type BlindClosePosShiftRequestDTO = z.infer<
  typeof BlindClosePosShiftRequestSchema
>;
export type SubmitStoreDailyStocktakeDTO = z.infer<
  typeof SubmitStoreDailyStocktakeSchema
>;
export type KdsQueueQueryDTO = z.infer<typeof KdsQueueQuerySchema>;

export type KdsSlaLevel = 'NORMAL_GREEN' | 'WARNING_YELLOW' | 'CRITICAL_RED';

export interface KdsSlaClassificationDTO {
  wait_minutes: number;
  sla_level: KdsSlaLevel;
  is_overdue: boolean;
}

export interface KdsTicketBoardLineDTO {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  size_code: MenuSizeCode;
  quantity: number;
  modifiers_json: Array<{ id: string; name: string }>;
  notes: string | null;
}

/**
 * KDS Ticket DTO safe for BARISTA_KDS: strictly omits prices, revenue, and cash totals.
 */
export interface KdsTicketBoardItemDTO {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  kds_status: KdsStatus;
  payment_status: PaymentStatus;
  bom_deducted_at: string | null;
  created_at: string;
  updated_at: string;
  wait_minutes: number;
  sla_level: KdsSlaLevel;
  items: KdsTicketBoardLineDTO[];
}

export interface KdsBomDeductionLotSliceDTO {
  lot_id: string;
  lot_code: string;
  roast_date: string | null;
  deducted_qty: number;
  remaining_after_qty: number;
  depleted: boolean;
}

export interface KdsBomItemDeductionResultDTO {
  inventory_item_id: string;
  sku: string;
  name: string;
  base_unit: BaseUnit;
  required_qty: number;
  deducted_qty: number;
  shortage_qty: number;
  lot_slices: KdsBomDeductionLotSliceDTO[];
}

export interface KdsOrderCompletionResultDTO {
  order_id: string;
  order_code: string;
  store_id: string;
  kds_status: KdsStatus;
  bom_deducted_at: string;
  already_deducted: boolean;
  has_shortage: boolean;
  deductions: KdsBomItemDeductionResultDTO[];
}

export interface BaristaLowStockAlertDTO {
  id: string;
  store_id: string;
  inventory_item_id: string;
  sku: string;
  item_name: string;
  reported_by: string;
  reported_by_name: string;
  severity: BaristaAlertSeverity;
  note: string;
  resolved: boolean;
  created_at: string;
}

export type ShiftVarianceStatus = 'BALANCED' | 'SURPLUS' | 'SHORTAGE';

export interface BlindShiftCloseResultDTO {
  shift_id: string;
  store_id: string;
  cashier_id: string;
  status: 'CLOSED';
  opened_at: string;
  closed_at: string;
  opening_cash_vnd: number;
  cash_sales_vnd: number;
  vietqr_sales_vnd: number;
  paid_cash_orders_count: number;
  voided_orders_count: number;
  system_expected_cash_vnd: number;
  blind_counted_cash_vnd: number;
  variance_cash_vnd: number;
  variance_status: ShiftVarianceStatus;
  notes: string | null;
}

export interface StoreDailyStocktakeItemResultDTO {
  id: string;
  store_id: string;
  inventory_item_id: string;
  sku: string;
  item_name: string;
  base_unit: BaseUnit;
  stocktake_date: string;
  opening_qty: number;
  received_in_qty: number;
  bom_consumed_qty: number;
  theoretical_closing_qty: number;
  actual_counted_qty: number;
  variance_qty: number;
  variance_pct: number;
  is_abnormal_shrinkage: boolean;
  counted_by: string;
  notes: string | null;
  updated_at: string;
}

export interface StoreDailyStocktakeBatchResultDTO {
  store_id: string;
  stocktake_date: string;
  total_items_counted: number;
  abnormal_shrinkage_count: number;
  items: StoreDailyStocktakeItemResultDTO[];
}

export interface StoreBomDeductionRequirementInput {
  inventory_item_id: string;
  sku: string;
  name: string;
  base_unit: BaseUnit;
  required_qty: number;
}

export interface StoreBomLotSnapshotInput {
  id: string;
  store_id: string;
  item_id: string;
  lot_code: string;
  roast_date: string | null;
  received_at: string;
  remaining_qty: number;
  status: LotStatus;
}

export interface StoreBomFifoAllocationOutputDTO {
  has_shortage: boolean;
  deductions: KdsBomItemDeductionResultDTO[];
  updated_lots: StoreBomLotSnapshotInput[];
}

export interface BlindShiftOrderInput {
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount_vnd: number;
}

export interface BlindShiftVarianceCalculationDTO {
  opening_cash_vnd: number;
  cash_sales_vnd: number;
  vietqr_sales_vnd: number;
  paid_cash_orders_count: number;
  voided_orders_count: number;
  system_expected_cash_vnd: number;
  blind_counted_cash_vnd: number;
  variance_cash_vnd: number;
  variance_status: ShiftVarianceStatus;
}

export interface DailyStocktakeVarianceCalculationDTO {
  opening_qty: number;
  received_in_qty: number;
  bom_consumed_qty: number;
  theoretical_closing_qty: number;
  actual_counted_qty: number;
  variance_qty: number;
  variance_pct: number;
  is_abnormal_shrinkage: boolean;
}
```

### File 3: `C:\bib\cf_19\packages\shared\src\schemas\index.ts`

```ts
export * from './auth.schema.js';
export * from './store.schema.js';
export * from './operations.schema.js';
export * from './warehouse.schema.js';
export * from './b2b.schema.js';
export * from './posCatalog.schema.js';
export * from './vietqr.schema.js';
export * from './kdsAndShift.schema.js';
```

### File 4: `C:\bib\cf_19\packages\shared\src\index.ts`

```ts
export * from './enums.js';
export * from './constants/seedIds.js';
export * from './constants/securityKeys.js';
export * from './schemas/index.js';
export * from './types/domain.types.js';
export * from './types/warehouse.types.js';
export * from './types/b2b.types.js';
export * from './types/posCatalog.types.js';
export * from './types/vietqr.types.js';
export * from './types/kdsAndShift.types.js';
export * from './utils/warehouseMath.js';
export * from './utils/b2bAndTransferMath.js';
export * from './utils/posBomAndReceiptMath.js';
export * from './utils/emvcoVietQrMath.js';
export * from './utils/kdsBomAndVarianceMath.js';
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 2 files trong `@cf19/shared`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\packages\shared\src\utils\kdsBomAndVarianceMath.ts` (Tạo mới)
  2. `C:\bib\cf_19\packages\shared\src\__tests__\kds-bom-blindclose-m6.test.ts` (Tạo mới — 22 Vitest unit tests)

### File 1: `C:\bib\cf_19\packages\shared\src\utils\kdsBomAndVarianceMath.ts`

```ts
import type {
  BlindShiftOrderInput,
  BlindShiftVarianceCalculationDTO,
  DailyStocktakeVarianceCalculationDTO,
  KdsBomDeductionLotSliceDTO,
  KdsBomItemDeductionResultDTO,
  KdsSlaClassificationDTO,
  KdsSlaLevel,
  ShiftVarianceStatus,
  StoreBomDeductionRequirementInput,
  StoreBomFifoAllocationOutputDTO,
  StoreBomLotSnapshotInput,
} from '../types/kdsAndShift.types.js';
import { compareFifoLots } from './warehouseMath.js';

export const KDS_SLA_WARNING_MINUTES = 5;
export const KDS_SLA_CRITICAL_MINUTES = 10;
export const STOCKTAKE_ABNORMAL_SHRINKAGE_THRESHOLD_PCT = 3.0;

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 1. Classify KDS ticket wait duration into SRS SLA color tiers:
 *    - < 5 min: NORMAL_GREEN
 *    - 5..9 min: WARNING_YELLOW
 *    - >= 10 min: CRITICAL_RED
 */
export function classifyKdsWaitSla(
  createdAtIso: string,
  nowMs: number = Date.now(),
): KdsSlaClassificationDTO {
  const createdMs = Date.parse(createdAtIso);
  if (Number.isNaN(createdMs)) {
    throw new RangeError(`Invalid ISO timestamp for KDS ticket: "${createdAtIso}"`);
  }

  const waitMinutes = Math.max(0, Math.floor((nowMs - createdMs) / 60_000));
  let slaLevel: KdsSlaLevel = 'NORMAL_GREEN';
  if (waitMinutes >= KDS_SLA_CRITICAL_MINUTES) {
    slaLevel = 'CRITICAL_RED';
  } else if (waitMinutes >= KDS_SLA_WARNING_MINUTES) {
    slaLevel = 'WARNING_YELLOW';
  }

  return {
    wait_minutes: waitMinutes,
    sla_level: slaLevel,
    is_overdue: slaLevel === 'CRITICAL_RED',
  };
}

/**
 * 2. Pure Multi-Lot FIFO Store BOM Inventory Deduction Allocator.
 *    Does NOT mutate input lots; returns immutable updated lot snapshots & per-lot slices.
 *    Throws INSUFFICIENT_STORE_BOM_STOCK if allowPartialOnShortage is false and stock is lacking.
 */
export function allocateStoreBomFifoDeduction(params: {
  storeId: string;
  requirements: readonly StoreBomDeductionRequirementInput[];
  availableLots: readonly StoreBomLotSnapshotInput[];
  allowPartialOnShortage?: boolean;
}): StoreBomFifoAllocationOutputDTO {
  const {
    storeId,
    requirements,
    availableLots,
    allowPartialOnShortage = false,
  } = params;

  const clonedLots: StoreBomLotSnapshotInput[] = availableLots.map((lot) => ({
    ...lot,
  }));

  const deductions: KdsBomItemDeductionResultDTO[] = [];
  let hasShortage = false;

  const sortedRequirements = [...requirements].sort((a, b) =>
    a.inventory_item_id.localeCompare(b.inventory_item_id),
  );

  for (const req of sortedRequirements) {
    const requiredQty = roundQty2(req.required_qty);
    if (!Number.isFinite(requiredQty) || requiredQty < 0) {
      throw new RangeError(
        `BOM required_qty must be a non-negative finite number for ${req.sku}`,
      );
    }
    if (requiredQty === 0) {
      continue;
    }

    const candidateLots = clonedLots
      .filter(
        (lot) =>
          lot.store_id === storeId &&
          lot.item_id === req.inventory_item_id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .sort(compareFifoLots);

    let remainingNeeded = requiredQty;
    let totalDeducted = 0;
    const lotSlices: KdsBomDeductionLotSliceDTO[] = [];

    for (const lot of candidateLots) {
      if (remainingNeeded <= 0) {
        break;
      }

      const takeQty = roundQty2(Math.min(lot.remaining_qty, remainingNeeded));
      const remainingAfter = roundQty2(lot.remaining_qty - takeQty);
      const depleted = remainingAfter <= 0;

      lot.remaining_qty = remainingAfter;
      if (depleted) {
        lot.status = 'DEPLETED';
      }

      totalDeducted = roundQty2(totalDeducted + takeQty);
      remainingNeeded = roundQty2(remainingNeeded - takeQty);

      lotSlices.push({
        lot_id: lot.id,
        lot_code: lot.lot_code,
        roast_date: lot.roast_date,
        deducted_qty: takeQty,
        remaining_after_qty: remainingAfter,
        depleted,
      });
    }

    const shortageQty = Math.max(0, remainingNeeded);
    if (shortageQty > 0) {
      if (!allowPartialOnShortage) {
        throw new Error(
          `INSUFFICIENT_STORE_BOM_STOCK: Store ${storeId} lacks ${shortageQty} ${req.base_unit} of ${req.sku} (${req.name})`,
        );
      }
      hasShortage = true;
    }

    deductions.push({
      inventory_item_id: req.inventory_item_id,
      sku: req.sku,
      name: req.name,
      base_unit: req.base_unit,
      required_qty: requiredQty,
      deducted_qty: totalDeducted,
      shortage_qty: shortageQty,
      lot_slices: lotSlices,
    });
  }

  return {
    has_shortage: hasShortage,
    deductions,
    updated_lots: clonedLots,
  };
}

/**
 * 3. Classify cash drawer variance into BALANCED / SURPLUS / SHORTAGE.
 */
export function classifyShiftCashVarianceStatus(
  varianceCashVnd: number,
): ShiftVarianceStatus {
  if (!Number.isFinite(varianceCashVnd)) {
    throw new RangeError('varianceCashVnd must be a finite number');
  }
  const rounded = Math.round(varianceCashVnd);
  if (rounded === 0) {
    return 'BALANCED';
  }
  return rounded > 0 ? 'SURPLUS' : 'SHORTAGE';
}

/**
 * 4. Calculate Blind Shift Close expected cash & variance in integer VND.
 *    Strictly sums ONLY PAID CASH orders into expected drawer cash.
 */
export function calculateBlindShiftCloseVariance(params: {
  openingCashVnd: number;
  blindCountedCashVnd: number;
  orders: readonly BlindShiftOrderInput[];
}): BlindShiftVarianceCalculationDTO {
  const { openingCashVnd, blindCountedCashVnd, orders } = params;

  if (!Number.isInteger(openingCashVnd) || openingCashVnd < 0) {
    throw new RangeError('openingCashVnd must be a non-negative integer');
  }
  if (!Number.isInteger(blindCountedCashVnd) || blindCountedCashVnd < 0) {
    throw new RangeError('blindCountedCashVnd must be a non-negative integer');
  }

  let cashSalesVnd = 0;
  let vietqrSalesVnd = 0;
  let paidCashOrdersCount = 0;
  let voidedOrdersCount = 0;

  for (const order of orders) {
    if (order.payment_status === 'VOIDED') {
      voidedOrdersCount += 1;
      continue;
    }
    if (order.payment_status !== 'PAID') {
      continue;
    }
    const amt = Math.round(order.total_amount_vnd);
    if (order.payment_method === 'CASH') {
      cashSalesVnd += amt;
      paidCashOrdersCount += 1;
    } else if (order.payment_method === 'VIETQR') {
      vietqrSalesVnd += amt;
    }
  }

  const systemExpectedCashVnd = openingCashVnd + cashSalesVnd;
  const varianceCashVnd = blindCountedCashVnd - systemExpectedCashVnd;
  const varianceStatus = classifyShiftCashVarianceStatus(varianceCashVnd);

  return {
    opening_cash_vnd: openingCashVnd,
    cash_sales_vnd: cashSalesVnd,
    vietqr_sales_vnd: vietqrSalesVnd,
    paid_cash_orders_count: paidCashOrdersCount,
    voided_orders_count: voidedOrdersCount,
    system_expected_cash_vnd: systemExpectedCashVnd,
    blind_counted_cash_vnd: blindCountedCashVnd,
    variance_cash_vnd: varianceCashVnd,
    variance_status: varianceStatus,
  };
}

/**
 * 5. Calculate End-of-Day Store Stocktake vs BOM theoretical closing variance.
 *    Flags is_abnormal_shrinkage when variance_qty < 0 and |variance_pct| > 3.0%.
 */
export function calculateDailyStocktakeVariance(params: {
  openingQty: number;
  receivedInQty: number;
  bomConsumedQty: number;
  actualCountedQty: number;
  abnormalShrinkageThresholdPct?: number;
}): DailyStocktakeVarianceCalculationDTO {
  const {
    openingQty,
    receivedInQty,
    bomConsumedQty,
    actualCountedQty,
    abnormalShrinkageThresholdPct = STOCKTAKE_ABNORMAL_SHRINKAGE_THRESHOLD_PCT,
  } = params;

  if (
    !Number.isFinite(openingQty) ||
    openingQty < 0 ||
    !Number.isFinite(receivedInQty) ||
    receivedInQty < 0 ||
    !Number.isFinite(bomConsumedQty) ||
    bomConsumedQty < 0 ||
    !Number.isFinite(actualCountedQty) ||
    actualCountedQty < 0
  ) {
    throw new RangeError('All daily stocktake quantities must be non-negative finite numbers');
  }

  const opening = roundQty2(openingQty);
  const receivedIn = roundQty2(receivedInQty);
  const bomConsumed = roundQty2(bomConsumedQty);
  const actualCounted = roundQty2(actualCountedQty);

  const theoreticalClosingQty = roundQty2(opening + receivedIn - bomConsumed);
  const varianceQty = roundQty2(actualCounted - theoreticalClosingQty);
  const variancePct =
    theoreticalClosingQty <= 0
      ? 0
      : roundQty2((varianceQty / theoreticalClosingQty) * 100);
  const isAbnormalShrinkage =
    varianceQty < 0 && Math.abs(variancePct) > abnormalShrinkageThresholdPct;

  return {
    opening_qty: opening,
    received_in_qty: receivedIn,
    bom_consumed_qty: bomConsumed,
    theoretical_closing_qty: theoreticalClosingQty,
    actual_counted_qty: actualCounted,
    variance_qty: varianceQty,
    variance_pct: variancePct,
    is_abnormal_shrinkage: isAbnormalShrinkage,
  };
}
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\kds-bom-blindclose-m6.test.ts`

```ts
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
```
