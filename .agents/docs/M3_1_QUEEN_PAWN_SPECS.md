# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M3.1 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **6 files (4 + 2)**.
- **Tiền đề đã hoàn thành:** `C:\bib\cf_19\supabase\migrations\0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql` (5 Atomic PL/pgSQL RPCs).

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# HỢP ĐỒNG M3 TRONG `@cf19/shared` (SCHEMAS, TYPES & BARREL EXPORTS — 4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây cho hợp đồng M3 (`b2b.schema.ts`, `b2b.types.ts` và barrel exports) trong gói `@cf19/shared`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi tên file, không đổi đuôi `.js` trong import ESM.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `utils/b2bAndTransferMath.ts` hay `__tests__/b2b-transfers-m3.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M3.1 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\packages\shared\src\schemas\b2b.schema.ts` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\types\b2b.types.ts` (Tạo mới)
3. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Overwrite)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\packages\shared\src\schemas\b2b.schema.ts`
```ts
import { z } from 'zod';
import { PAYMENT_METHODS, TRANSFER_STATUSES } from '../enums.js';
import {
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
  VndPositiveSchema,
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

export const B2bPriceQuoteQuerySchema = z.object({
  customer_id: UuidSchema,
  item_id: UuidSchema,
  quantity_base_unit: z.coerce
    .number({ invalid_type_error: 'quantity_base_unit must be a number' })
    .finite()
    .positive('quantity_base_unit must be strictly positive'),
});

export const B2bOrderItemInputSchema = z.object({
  item_id: UuidSchema,
  quantity_base_unit: QtyPositiveSchema,
});

export const CreateB2bOrderSchema = z.object({
  warehouse_store_id: UuidSchema,
  customer_id: UuidSchema,
  order_code: UpperCodeSchema.optional(),
  payment_method: z.enum(PAYMENT_METHODS).default('VIETQR'),
  paid_amount_vnd: VndNonNegativeSchema.default(0),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(B2bOrderItemInputSchema)
    .min(1, 'B2B order must contain at least 1 item'),
});

export const RecordB2bDebtPaymentSchema = z.object({
  warehouse_store_id: UuidSchema,
  customer_id: UuidSchema,
  payment_amount_vnd: VndPositiveSchema,
  reference_note: z.string().trim().min(3).max(500).optional(),
});

export const TransferFilterQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  status: z.enum(TRANSFER_STATUSES).optional(),
});

export const DispatchInternalTransferFifoSchema = z.object({
  transfer_id: UuidSchema,
  notes: z.string().trim().max(500).optional(),
});
```

### File 2: `C:\bib\cf_19\packages\shared\src\types\b2b.types.ts`
```ts
import type { z } from 'zod';
import type {
  B2bPriceTier,
  BaseUnit,
  PaymentMethod,
  PaymentStatus,
} from '../enums.js';
import type {
  B2bOrderItemInputSchema,
  B2bPriceQuoteQuerySchema,
  CreateB2bOrderSchema,
  DispatchInternalTransferFifoSchema,
  RecordB2bDebtPaymentSchema,
  TransferFilterQuerySchema,
} from '../schemas/b2b.schema.js';
import type {
  B2bCustomerDto,
  B2bDebtLedgerEntryDto,
  B2bPriceTierDto,
  InternalTransferDto,
  InternalTransferItemDto,
  StoreSafeWarehouseLotDto,
} from './domain.types.js';

export type ArAgingBucket =
  | 'CURRENT'
  | 'OVERDUE_1_30'
  | 'OVERDUE_31_60'
  | 'OVERDUE_60_PLUS';

export type B2bPriceQuoteQueryDTO = z.infer<typeof B2bPriceQuoteQuerySchema>;
export type B2bOrderItemInputDTO = z.infer<typeof B2bOrderItemInputSchema>;
export type CreateB2bOrderDTO = z.infer<typeof CreateB2bOrderSchema>;
export type RecordB2bDebtPaymentDTO = z.infer<typeof RecordB2bDebtPaymentSchema>;
export type TransferFilterQueryDTO = z.infer<typeof TransferFilterQuerySchema>;
export type DispatchInternalTransferFifoDTO = z.infer<
  typeof DispatchInternalTransferFifoSchema
>;

export type B2bPriceQuoteSource =
  | 'PRICE_TIER'
  | 'RETAIL_FALLBACK'
  | 'INTERNAL_FALLBACK';

export interface B2bPriceQuoteResultDTO {
  customer_id: string;
  item_id: string;
  base_unit: BaseUnit;
  quantity_base_unit: number;
  qty_kg: number;
  customer_price_tier: B2bPriceTier;
  applied_price_tier: B2bPriceTier | null;
  unit_price_vnd: number;
  estimated_line_total_vnd: number;
  price_source: B2bPriceQuoteSource;
}

export interface B2bCreditCheckResultDTO {
  current_debt_vnd: number;
  credit_limit_vnd: number;
  total_amount_vnd: number;
  paid_amount_vnd: number;
  debt_added_vnd: number;
  projected_debt_vnd: number;
  remaining_credit_vnd: number;
  exceeds_credit_limit: boolean;
}

export interface B2bOrderItemDto {
  id: string;
  b2b_order_id: string;
  item_id: string;
  lot_id: string | null;
  quantity_base_unit: number;
  unit_price_vnd: number;
  unit_cost_vnd: number;
  line_total_vnd: number;
  created_at: string;
}

export interface B2bOrderDto {
  id: string;
  order_code: string;
  warehouse_store_id: string;
  customer_id: string;
  created_by: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount_vnd: number;
  paid_amount_vnd: number;
  cogs_amount_vnd: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: B2bOrderItemDto[];
}

export interface CreateB2bOrderResultDTO {
  order: B2bOrderDto;
  items: B2bOrderItemDto[];
  debt_added_vnd: number;
  projected_debt_vnd: number;
  remaining_credit_vnd: number;
  ledger_entry: B2bDebtLedgerEntryDto | null;
}

export interface FifoInvoiceSettlementSliceDTO {
  order_id: string;
  order_code: string;
  applied_vnd: number;
  previous_paid_amount_vnd: number;
  new_paid_amount_vnd: number;
  new_payment_status: PaymentStatus;
}

export interface RecordB2bDebtPaymentResultDTO {
  customer_id: string;
  payment_amount_vnd: number;
  previous_debt_vnd: number;
  new_debt_vnd: number;
  ledger_entry: B2bDebtLedgerEntryDto;
  settled_orders: FifoInvoiceSettlementSliceDTO[];
}

export interface ArCustomerAgingRowDTO {
  customer: B2bCustomerDto;
  pending_invoice_count: number;
  current_vnd: number;
  overdue_1_30_vnd: number;
  overdue_31_60_vnd: number;
  overdue_60_plus_vnd: number;
  total_outstanding_vnd: number;
  worst_bucket: ArAgingBucket;
}

export interface ArAgingSummaryDTO {
  as_of_date: string;
  total_receivables_vnd: number;
  current_vnd: number;
  overdue_1_30_vnd: number;
  overdue_31_60_vnd: number;
  overdue_60_plus_vnd: number;
  customers: ArCustomerAgingRowDTO[];
}

export interface B2bCatalogOverviewDTO {
  customers: B2bCustomerDto[];
  price_tiers: B2bPriceTierDto[];
  recent_orders: B2bOrderDto[];
  aging_summary: ArAgingSummaryDTO;
}

export interface InternalTransferDispatchResultDTO {
  transfer: InternalTransferDto;
  items: InternalTransferItemDto[];
}

export interface InternalTransferReconcileResultDTO {
  transfer: InternalTransferDto;
  items: InternalTransferItemDto[];
  created_store_lots: StoreSafeWarehouseLotDto[];
}
```

### File 3: `C:\bib\cf_19\packages\shared\src\schemas\index.ts`
```ts
export * from './auth.schema.js';
export * from './store.schema.js';
export * from './operations.schema.js';
export * from './warehouse.schema.js';
export * from './b2b.schema.js';
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
export * from './utils/warehouseMath.js';
export * from './utils/b2bAndTransferMath.js';
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M3.1 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\packages\shared\src\schemas\b2b.schema.ts','C:\bib\cf_19\packages\shared\src\types\b2b.types.ts','C:\bib\cf_19\packages\shared\src\schemas\index.ts','C:\bib\cf_19\packages\shared\src\index.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# PURE B2B & 2-PHASE TRANSFER MATH ENGINE & 22 VITEST UNIT TESTS (2 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 2 file dưới đây: `b2bAndTransferMath.ts` và bộ 22 Vitest Unit Tests `b2b-transfers-m3.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thay đổi công thức, không rút gọn test cases.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 2 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1` hay `supabase/migrations/0004_m3_b2b_ar_and_2phase_transfers_rpcs.sql`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 2 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M3.1 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (2 TARGET FILES)
1. `C:\bib\cf_19\packages\shared\src\utils\b2bAndTransferMath.ts` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\__tests__\b2b-transfers-m3.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\packages\shared\src\utils\b2bAndTransferMath.ts`
```ts
import type { B2bPriceTier, BaseUnit, PaymentStatus } from '../enums.js';
import type {
  ArAgingBucket,
  B2bCreditCheckResultDTO,
  B2bPriceQuoteSource,
  FifoInvoiceSettlementSliceDTO,
} from '../types/b2b.types.js';

export interface B2bPriceTierCandidate {
  price_tier: B2bPriceTier;
  min_qty_kg: number;
  unit_price_vnd: number;
  is_active?: boolean;
}

export interface ResolvedTieredPrice {
  qty_kg: number;
  unit_price_vnd: number;
  applied_price_tier: B2bPriceTier | null;
  price_source: B2bPriceQuoteSource;
  estimated_line_total_vnd: number;
}

export interface PendingB2bInvoiceCandidate {
  id: string;
  order_code: string;
  ordered_at: string;
  total_amount_vnd: number;
  paid_amount_vnd: number;
  payment_status: PaymentStatus;
}

export interface InternalTransferLinePriceInput {
  qty_base_unit: number;
  base_unit: BaseUnit;
  internal_unit_price_vnd: number;
}

/**
 * 1. Converts base unit quantity to kg-equivalent billing quantity for tiered pricing:
 *    - 'g' -> qtyBaseUnit / 1000
 *    - 'ml' | 'pcs' -> qtyBaseUnit
 */
export function convertToKgForTierPricing(
  qtyBaseUnit: number,
  baseUnit: BaseUnit,
): number {
  if (!Number.isFinite(qtyBaseUnit) || qtyBaseUnit < 0) {
    throw new RangeError('qtyBaseUnit must be a non-negative finite number');
  }
  if (baseUnit === 'g') {
    return qtyBaseUnit / 1000;
  }
  return qtyBaseUnit;
}

/**
 * 2. Resolves the best (lowest) B2B wholesale unit price in integer VND matching:
 *    - Active tiers where tier.price_tier === customerPriceTier OR tier.min_qty_kg <= qty_kg
 *    - Falls back to retailPriceVnd (if > 0), otherwise internalTransferPriceVnd.
 */
export function resolveB2bTieredUnitPriceVnd(params: {
  qtyBaseUnit: number;
  baseUnit: BaseUnit;
  customerPriceTier: B2bPriceTier;
  tiers: readonly B2bPriceTierCandidate[];
  fallbackRetailPriceVnd: number;
  fallbackInternalTransferPriceVnd: number;
}): ResolvedTieredPrice {
  const {
    qtyBaseUnit,
    baseUnit,
    customerPriceTier,
    tiers,
    fallbackRetailPriceVnd,
    fallbackInternalTransferPriceVnd,
  } = params;

  if (!Number.isFinite(qtyBaseUnit) || qtyBaseUnit <= 0) {
    throw new RangeError('qtyBaseUnit must be strictly positive');
  }

  const qtyKg = convertToKgForTierPricing(qtyBaseUnit, baseUnit);
  const eligible = tiers.filter(
    (tier) =>
      tier.is_active !== false &&
      (tier.price_tier === customerPriceTier || tier.min_qty_kg <= qtyKg),
  );

  if (eligible.length > 0) {
    const bestTier = eligible.reduce((best, current) =>
      current.unit_price_vnd < best.unit_price_vnd ? current : best,
    );
    const unitPriceVnd = Math.round(bestTier.unit_price_vnd);
    return {
      qty_kg: qtyKg,
      unit_price_vnd: unitPriceVnd,
      applied_price_tier: bestTier.price_tier,
      price_source: 'PRICE_TIER',
      estimated_line_total_vnd: Math.round(qtyKg * unitPriceVnd),
    };
  }

  if (fallbackRetailPriceVnd > 0) {
    const unitPriceVnd = Math.round(fallbackRetailPriceVnd);
    return {
      qty_kg: qtyKg,
      unit_price_vnd: unitPriceVnd,
      applied_price_tier: null,
      price_source: 'RETAIL_FALLBACK',
      estimated_line_total_vnd: Math.round(qtyKg * unitPriceVnd),
    };
  }

  const unitPriceVnd = Math.round(Math.max(0, fallbackInternalTransferPriceVnd));
  return {
    qty_kg: qtyKg,
    unit_price_vnd: unitPriceVnd,
    applied_price_tier: null,
    price_source: 'INTERNAL_FALLBACK',
    estimated_line_total_vnd: Math.round(qtyKg * unitPriceVnd),
  };
}

/**
 * 3. Evaluates B2B credit limit compliance before committing a wholesale order.
 */
export function calculateB2bCreditCheck(params: {
  currentDebtVnd: number;
  creditLimitVnd: number;
  totalAmountVnd: number;
  paidAmountVnd: number;
}): B2bCreditCheckResultDTO {
  const { currentDebtVnd, creditLimitVnd, totalAmountVnd, paidAmountVnd } = params;

  if (
    currentDebtVnd < 0 ||
    creditLimitVnd < 0 ||
    totalAmountVnd < 0 ||
    paidAmountVnd < 0
  ) {
    throw new RangeError('Credit check monetary inputs cannot be negative');
  }
  if (paidAmountVnd > totalAmountVnd) {
    throw new RangeError('paidAmountVnd cannot exceed totalAmountVnd');
  }

  const debtAddedVnd = Math.round(totalAmountVnd - paidAmountVnd);
  const projectedDebtVnd = Math.round(currentDebtVnd + debtAddedVnd);
  const exceedsCreditLimit = projectedDebtVnd > creditLimitVnd;
  const remainingCreditVnd = Math.max(0, Math.round(creditLimitVnd - projectedDebtVnd));

  return {
    current_debt_vnd: Math.round(currentDebtVnd),
    credit_limit_vnd: Math.round(creditLimitVnd),
    total_amount_vnd: Math.round(totalAmountVnd),
    paid_amount_vnd: Math.round(paidAmountVnd),
    debt_added_vnd: debtAddedVnd,
    projected_debt_vnd: projectedDebtVnd,
    remaining_credit_vnd: remainingCreditVnd,
    exceeds_credit_limit: exceedsCreditLimit,
  };
}

/**
 * 4. Applies a customer debt payment across PENDING invoices in strict FIFO order:
 *    ordered_at ASC, order_code ASC, id ASC.
 */
export function settleFifoPendingInvoices(
  pendingInvoices: readonly PendingB2bInvoiceCandidate[],
  paymentAmountVnd: number,
): {
  settled: FifoInvoiceSettlementSliceDTO[];
  totalAppliedVnd: number;
  unappliedPaymentVnd: number;
} {
  if (!Number.isFinite(paymentAmountVnd) || paymentAmountVnd <= 0) {
    throw new RangeError('paymentAmountVnd must be strictly positive');
  }

  const sorted = pendingInvoices
    .filter(
      (inv) =>
        inv.payment_status === 'PENDING' &&
        inv.paid_amount_vnd < inv.total_amount_vnd,
    )
    .sort((a, b) => {
      const aTs = Date.parse(a.ordered_at);
      const bTs = Date.parse(b.ordered_at);
      if (!Number.isNaN(aTs) && !Number.isNaN(bTs) && aTs !== bTs) {
        return aTs - bTs;
      }
      if (a.ordered_at !== b.ordered_at) {
        return a.ordered_at.localeCompare(b.ordered_at);
      }
      const codeCmp = a.order_code.localeCompare(b.order_code);
      if (codeCmp !== 0) {
        return codeCmp;
      }
      return a.id.localeCompare(b.id);
    });

  let remainingPayment = Math.round(paymentAmountVnd);
  let totalAppliedVnd = 0;
  const settled: FifoInvoiceSettlementSliceDTO[] = [];

  for (const inv of sorted) {
    if (remainingPayment <= 0) {
      break;
    }

    const outstanding = inv.total_amount_vnd - inv.paid_amount_vnd;
    const appliedVnd = Math.min(remainingPayment, outstanding);
    const newPaidVnd = inv.paid_amount_vnd + appliedVnd;
    const newStatus: PaymentStatus =
      newPaidVnd === inv.total_amount_vnd ? 'PAID' : 'PENDING';

    settled.push({
      order_id: inv.id,
      order_code: inv.order_code,
      applied_vnd: appliedVnd,
      previous_paid_amount_vnd: inv.paid_amount_vnd,
      new_paid_amount_vnd: newPaidVnd,
      new_payment_status: newStatus,
    });

    totalAppliedVnd += appliedVnd;
    remainingPayment -= appliedVnd;
  }

  return {
    settled,
    totalAppliedVnd,
    unappliedPaymentVnd: remainingPayment,
  };
}

/**
 * 5. Classifies AR invoice aging bucket based on days overdue from due_date.
 */
export function classifyArAgingBucket(daysOverdue: number): ArAgingBucket {
  if (!Number.isFinite(daysOverdue)) {
    throw new RangeError('daysOverdue must be finite');
  }
  if (daysOverdue <= 0) {
    return 'CURRENT';
  }
  if (daysOverdue <= 30) {
    return 'OVERDUE_1_30';
  }
  if (daysOverdue <= 60) {
    return 'OVERDUE_31_60';
  }
  return 'OVERDUE_60_PLUS';
}

/**
 * 6. Computes total internal transfer value in integer VND across transfer lines,
 *    converting 'g' quantities to kg-equivalent to match internal_transfer_price_vnd.
 */
export function calculateInternalTransferTotalVnd(
  lines: readonly InternalTransferLinePriceInput[],
): number {
  let totalVnd = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.qty_base_unit) || line.qty_base_unit < 0) {
      throw new RangeError('qty_base_unit must be non-negative');
    }
    if (
      !Number.isFinite(line.internal_unit_price_vnd) ||
      line.internal_unit_price_vnd < 0
    ) {
      throw new RangeError('internal_unit_price_vnd must be non-negative');
    }
    const billingQty = convertToKgForTierPricing(
      line.qty_base_unit,
      line.base_unit,
    );
    totalVnd += Math.round(billingQty * line.internal_unit_price_vnd);
  }
  return totalVnd;
}
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\b2b-transfers-m3.test.ts`
```ts
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
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 2 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M3.1 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\packages\shared\src\utils\b2bAndTransferMath.ts','C:\bib\cf_19\packages\shared\src\__tests__\b2b-transfers-m3.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
