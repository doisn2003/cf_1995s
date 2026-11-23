# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M7.1 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M7.1 - @cf19/shared Executive OLAP P&L Consolidation & 1-Click Franchise Store Cloning Contracts + Pure Math Engine`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M7_1_KING_CHARTER.md` và `0008_m7_olap_pnl_and_franchise_cloning.sql`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không bỏ `.js` trong import tương đối của `@cf19/shared` (`moduleResolution: "NodeNext"`), không đặt trùng bất kỳ tên symbol nào đã có ở M1–M6.
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 4 files trong `@cf19/shared`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\packages\shared\src\schemas\executivePnl.schema.ts` (Tạo mới)
  2. `C:\bib\cf_19\packages\shared\src\types\executivePnl.types.ts` (Tạo mới)
  3. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Overwrite)
  4. `C:\bib\cf_19\packages\shared\src\index.ts` (Overwrite)

### File 1: `C:\bib\cf_19\packages\shared\src\schemas\executivePnl.schema.ts`

```ts
import { z } from 'zod';
import { QtyPositiveSchema, VndNonNegativeSchema } from './auth.schema.js';

export const CLONABLE_STORE_TYPES = ['RETAIL_STORE', 'FRANCHISE_STORE'] as const;
export type ClonableStoreType = (typeof CLONABLE_STORE_TYPES)[number];

const IsoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD');

export const ExecutivePnlQuerySchema = z
  .object({
    period_from: IsoDateStringSchema.optional(),
    period_to: IsoDateStringSchema.optional(),
    warehouse_operating_expense_vnd: z.coerce
      .number()
      .int('warehouse_operating_expense_vnd must be an integer')
      .min(0, 'warehouse_operating_expense_vnd must be non-negative')
      .default(0),
    franchise_royalty_pct: z.coerce
      .number()
      .finite()
      .min(0, 'franchise_royalty_pct must be >= 0')
      .max(50, 'franchise_royalty_pct must be <= 50')
      .default(5.0),
  })
  .refine(
    (data) =>
      !data.period_from ||
      !data.period_to ||
      data.period_to >= data.period_from,
    {
      message: 'period_to must be on or after period_from',
      path: ['period_to'],
    },
  );

export type ExecutivePnlQueryInput = z.infer<typeof ExecutivePnlQuerySchema>;

export const PreviewFranchisePricingSchema = z.object({
  price_multiplier: z.coerce
    .number({ invalid_type_error: 'price_multiplier must be a number' })
    .finite()
    .min(0.5, 'price_multiplier must be at least 0.50')
    .max(3.0, 'price_multiplier must not exceed 3.00'),
});

export type PreviewFranchisePricingInput = z.infer<
  typeof PreviewFranchisePricingSchema
>;

export const CloneFranchiseStoreSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Store code must be at least 3 characters')
    .max(32, 'Store code must not exceed 32 characters')
    .regex(
      /^[A-Z0-9_-]+$/,
      'Store code must contain only uppercase letters, digits, underscores, or hyphens',
    ),
  name: z.string().trim().min(2, 'Store name must be at least 2 characters').max(120),
  type: z.enum(CLONABLE_STORE_TYPES).default('FRANCHISE_STORE'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Invalid phone format')
    .optional(),
  price_multiplier: z
    .number({ invalid_type_error: 'price_multiplier must be a number' })
    .finite()
    .min(0.5, 'price_multiplier must be at least 0.50')
    .max(3.0, 'price_multiplier must not exceed 3.00')
    .default(1.0),
  opening_cash_vnd: VndNonNegativeSchema.default(2000000),
  create_starter_transfer: z.boolean().default(true),
  starter_coffee_qty_g: QtyPositiveSchema.default(10000),
  notes: z.string().trim().max(500).optional(),
});

export type CloneFranchiseStoreInput = z.infer<typeof CloneFranchiseStoreSchema>;
```

### File 2: `C:\bib\cf_19\packages\shared\src\types\executivePnl.types.ts`

```ts
import type { z } from 'zod';
import type { TransferStatus } from '../enums.js';
import type {
  ClonableStoreType,
  CloneFranchiseStoreSchema,
  ExecutivePnlQuerySchema,
  PreviewFranchisePricingSchema,
} from '../schemas/executivePnl.schema.js';
import type { StoreDto } from './domain.types.js';

export type ExecutivePnlQueryDTO = z.infer<typeof ExecutivePnlQuerySchema>;
export type PreviewFranchisePricingDTO = z.infer<typeof PreviewFranchisePricingSchema>;
export type CloneFranchiseStoreDTO = z.infer<typeof CloneFranchiseStoreSchema>;

export interface CentralWarehousePnlInputDTO {
  warehouse_store_id: string;
  warehouse_code: string;
  warehouse_name: string;
  b2b_orders_count?: number;
  reconciled_transfers_count?: number;
  b2b_external_revenue_vnd: number;
  b2b_raw_cogs_vnd: number;
  internal_transfer_revenue_vnd: number;
  internal_transfer_raw_cogs_vnd: number;
  warehouse_operating_expense_vnd?: number;
}

export interface CentralWarehousePnlDTO {
  warehouse_store_id: string;
  warehouse_code: string;
  warehouse_name: string;
  b2b_orders_count: number;
  reconciled_transfers_count: number;
  b2b_external_revenue_vnd: number;
  b2b_raw_cogs_vnd: number;
  b2b_external_gross_profit_vnd: number;
  internal_transfer_revenue_vnd: number;
  internal_transfer_raw_cogs_vnd: number;
  internal_markup_profit_vnd: number;
  warehouse_total_revenue_vnd: number;
  warehouse_total_raw_cogs_vnd: number;
  warehouse_total_gross_profit_vnd: number;
  warehouse_operating_expense_vnd: number;
  warehouse_net_profit_vnd: number;
  warehouse_gross_margin_pct: number;
  warehouse_net_margin_pct: number;
}

export interface StoreNodePnlInputDTO {
  store_id: string;
  store_code: string;
  store_name: string;
  store_type: ClonableStoreType;
  price_multiplier: number;
  paid_orders_count?: number;
  cash_revenue_vnd: number;
  vietqr_revenue_vnd: number;
  store_internal_bom_cogs_vnd: number;
  labor_cost_vnd?: number;
  cash_shortage_loss_vnd?: number;
  stocktake_shrinkage_loss_vnd?: number;
  franchise_royalty_pct?: number;
}

export interface StoreNodePnlDTO {
  store_id: string;
  store_code: string;
  store_name: string;
  store_type: ClonableStoreType;
  price_multiplier: number;
  paid_orders_count: number;
  cash_revenue_vnd: number;
  vietqr_revenue_vnd: number;
  pos_gross_revenue_vnd: number;
  store_internal_bom_cogs_vnd: number;
  store_gross_profit_vnd: number;
  labor_cost_vnd: number;
  cash_shortage_loss_vnd: number;
  stocktake_shrinkage_loss_vnd: number;
  franchise_royalty_fee_vnd: number;
  store_net_profit_vnd: number;
  gross_margin_pct: number;
  net_margin_pct: number;
  rank?: number;
}

export interface EnterpriseConsolidatedPnlDTO {
  period_from: string | null;
  period_to: string | null;
  generated_at: string;
  warehouse: CentralWarehousePnlDTO;
  stores: StoreNodePnlDTO[];
  total_store_pos_revenue_vnd: number;
  total_store_net_profit_vnd: number;
  total_franchise_royalty_income_vnd: number;
  total_cash_shortage_loss_vnd: number;
  total_stocktake_shrinkage_loss_vnd: number;
  consolidated_external_revenue_vnd: number;
  intercompany_eliminated_revenue_vnd: number;
  consolidated_net_profit_vnd: number;
  consolidated_net_margin_pct: number;
}

export interface FranchiseMenuProductSourceInput {
  product_id: string;
  product_code: string;
  product_name: string;
  master_base_price_vnd: number;
  default_variant_bom_cogs_vnd: number;
}

export interface ClonedMenuProductPricePreviewDTO {
  product_id: string;
  product_code: string;
  product_name: string;
  master_base_price_vnd: number;
  cloned_base_price_vnd: number;
  price_diff_vnd: number;
  default_variant_bom_cogs_vnd: number;
  estimated_gross_profit_vnd: number;
  estimated_gross_margin_pct: number;
}

export interface StarterTransferSummaryDTO {
  transfer_id: string;
  transfer_code: string;
  status: TransferStatus;
  total_internal_value_vnd: number;
}

export interface CloneFranchiseStoreResultDTO {
  store: StoreDto;
  opening_shift_id: string;
  starter_transfer: StarterTransferSummaryDTO | null;
  cloned_menu_preview: ClonedMenuProductPricePreviewDTO[];
  cloned_at: string;
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
export * from './executivePnl.schema.js';
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
export * from './types/executivePnl.types.js';
export * from './utils/warehouseMath.js';
export * from './utils/b2bAndTransferMath.js';
export * from './utils/posBomAndReceiptMath.js';
export * from './utils/emvcoVietQrMath.js';
export * from './utils/kdsBomAndVarianceMath.js';
export * from './utils/executivePnlAndFranchiseMath.js';
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 2 files trong `@cf19/shared`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\packages\shared\src\utils\executivePnlAndFranchiseMath.ts` (Tạo mới)
  2. `C:\bib\cf_19\packages\shared\src\__tests__\executive-pnl-franchise-m7.test.ts` (Tạo mới — 20 Vitest unit tests)

### File 1: `C:\bib\cf_19\packages\shared\src\utils\executivePnlAndFranchiseMath.ts`

```ts
import type {
  CentralWarehousePnlDTO,
  CentralWarehousePnlInputDTO,
  ClonedMenuProductPricePreviewDTO,
  EnterpriseConsolidatedPnlDTO,
  FranchiseMenuProductSourceInput,
  StoreNodePnlDTO,
  StoreNodePnlInputDTO,
} from '../types/executivePnl.types.js';

export const DEFAULT_FRANCHISE_ROYALTY_PCT = 5.0;
export const MIN_FRANCHISE_PRICE_MULTIPLIER = 0.5;
export const MAX_FRANCHISE_PRICE_MULTIPLIER = 3.0;

function roundPct2(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertNonNegativeInt(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
  return Math.round(value);
}

/**
 * 1. Central Warehouse Supply Chain P&L (External B2B Wholesale vs. Internal Store Transfers).
 *    Strictly confidential to SUPER_ADMIN.
 */
export function calculateCentralWarehousePnl(
  input: CentralWarehousePnlInputDTO,
): CentralWarehousePnlDTO {
  const b2bRevenue = assertNonNegativeInt(
    input.b2b_external_revenue_vnd,
    'b2b_external_revenue_vnd',
  );
  const b2bRawCogs = assertNonNegativeInt(
    input.b2b_raw_cogs_vnd,
    'b2b_raw_cogs_vnd',
  );
  const internalRevenue = assertNonNegativeInt(
    input.internal_transfer_revenue_vnd,
    'internal_transfer_revenue_vnd',
  );
  const internalRawCogs = assertNonNegativeInt(
    input.internal_transfer_raw_cogs_vnd,
    'internal_transfer_raw_cogs_vnd',
  );
  const opex = assertNonNegativeInt(
    input.warehouse_operating_expense_vnd ?? 0,
    'warehouse_operating_expense_vnd',
  );

  const b2bGrossProfit = b2bRevenue - b2bRawCogs;
  const internalMarkupProfit = internalRevenue - internalRawCogs;
  const totalRevenue = b2bRevenue + internalRevenue;
  const totalRawCogs = b2bRawCogs + internalRawCogs;
  const totalGrossProfit = b2bGrossProfit + internalMarkupProfit;
  const netProfit = totalGrossProfit - opex;

  const grossMarginPct =
    totalRevenue <= 0 ? 0 : roundPct2((totalGrossProfit / totalRevenue) * 100);
  const netMarginPct =
    totalRevenue <= 0 ? 0 : roundPct2((netProfit / totalRevenue) * 100);

  return {
    warehouse_store_id: input.warehouse_store_id,
    warehouse_code: input.warehouse_code,
    warehouse_name: input.warehouse_name,
    b2b_orders_count: Math.max(0, Math.round(input.b2b_orders_count ?? 0)),
    reconciled_transfers_count: Math.max(
      0,
      Math.round(input.reconciled_transfers_count ?? 0),
    ),
    b2b_external_revenue_vnd: b2bRevenue,
    b2b_raw_cogs_vnd: b2bRawCogs,
    b2b_external_gross_profit_vnd: b2bGrossProfit,
    internal_transfer_revenue_vnd: internalRevenue,
    internal_transfer_raw_cogs_vnd: internalRawCogs,
    internal_markup_profit_vnd: internalMarkupProfit,
    warehouse_total_revenue_vnd: totalRevenue,
    warehouse_total_raw_cogs_vnd: totalRawCogs,
    warehouse_total_gross_profit_vnd: totalGrossProfit,
    warehouse_operating_expense_vnd: opex,
    warehouse_net_profit_vnd: netProfit,
    warehouse_gross_margin_pct: grossMarginPct,
    warehouse_net_margin_pct: netMarginPct,
  };
}

/**
 * 2. Individual Retail / Franchise Store P&L (POS Revenue - Internal BOM COGS - Labor - Losses - Royalty).
 */
export function calculateStoreNodePnl(
  input: StoreNodePnlInputDTO,
): StoreNodePnlDTO {
  const cashRevenue = assertNonNegativeInt(input.cash_revenue_vnd, 'cash_revenue_vnd');
  const vietqrRevenue = assertNonNegativeInt(
    input.vietqr_revenue_vnd,
    'vietqr_revenue_vnd',
  );
  const bomCogs = assertNonNegativeInt(
    input.store_internal_bom_cogs_vnd,
    'store_internal_bom_cogs_vnd',
  );
  const laborCost = assertNonNegativeInt(
    input.labor_cost_vnd ?? 0,
    'labor_cost_vnd',
  );
  const cashShortage = assertNonNegativeInt(
    input.cash_shortage_loss_vnd ?? 0,
    'cash_shortage_loss_vnd',
  );
  const shrinkageLoss = assertNonNegativeInt(
    input.stocktake_shrinkage_loss_vnd ?? 0,
    'stocktake_shrinkage_loss_vnd',
  );
  const royaltyPct = input.franchise_royalty_pct ?? DEFAULT_FRANCHISE_ROYALTY_PCT;
  if (!Number.isFinite(royaltyPct) || royaltyPct < 0 || royaltyPct > 50) {
    throw new RangeError('franchise_royalty_pct must be between 0 and 50');
  }

  const posGrossRevenue = cashRevenue + vietqrRevenue;
  const grossProfit = posGrossRevenue - bomCogs;
  const royaltyFee =
    input.store_type === 'FRANCHISE_STORE'
      ? Math.round((posGrossRevenue * royaltyPct) / 100)
      : 0;
  const netProfit =
    grossProfit - laborCost - cashShortage - shrinkageLoss - royaltyFee;

  const grossMarginPct =
    posGrossRevenue <= 0
      ? 0
      : roundPct2((grossProfit / posGrossRevenue) * 100);
  const netMarginPct =
    posGrossRevenue <= 0
      ? 0
      : roundPct2((netProfit / posGrossRevenue) * 100);

  return {
    store_id: input.store_id,
    store_code: input.store_code,
    store_name: input.store_name,
    store_type: input.store_type,
    price_multiplier: input.price_multiplier,
    paid_orders_count: Math.max(0, Math.round(input.paid_orders_count ?? 0)),
    cash_revenue_vnd: cashRevenue,
    vietqr_revenue_vnd: vietqrRevenue,
    pos_gross_revenue_vnd: posGrossRevenue,
    store_internal_bom_cogs_vnd: bomCogs,
    store_gross_profit_vnd: grossProfit,
    labor_cost_vnd: laborCost,
    cash_shortage_loss_vnd: cashShortage,
    stocktake_shrinkage_loss_vnd: shrinkageLoss,
    franchise_royalty_fee_vnd: royaltyFee,
    store_net_profit_vnd: netProfit,
    gross_margin_pct: grossMarginPct,
    net_margin_pct: netMarginPct,
  };
}

/**
 * 3. Enterprise Consolidated P&L with Intercompany Transfer Revenue Elimination & Store Ranking.
 */
export function consolidateEnterprisePnl(params: {
  warehouse: CentralWarehousePnlDTO;
  stores: readonly StoreNodePnlDTO[];
  period_from?: string | null;
  period_to?: string | null;
  generated_at?: string;
}): EnterpriseConsolidatedPnlDTO {
  const { warehouse, stores } = params;

  const rankedStores: StoreNodePnlDTO[] = [...stores]
    .sort((a, b) => {
      if (b.store_net_profit_vnd !== a.store_net_profit_vnd) {
        return b.store_net_profit_vnd - a.store_net_profit_vnd;
      }
      if (b.pos_gross_revenue_vnd !== a.pos_gross_revenue_vnd) {
        return b.pos_gross_revenue_vnd - a.pos_gross_revenue_vnd;
      }
      return a.store_code.localeCompare(b.store_code);
    })
    .map((store, idx) => ({
      ...store,
      rank: idx + 1,
    }));

  const totalStorePosRevenue = rankedStores.reduce(
    (sum, s) => sum + s.pos_gross_revenue_vnd,
    0,
  );
  const totalStoreNetProfit = rankedStores.reduce(
    (sum, s) => sum + s.store_net_profit_vnd,
    0,
  );
  const totalRoyaltyIncome = rankedStores.reduce(
    (sum, s) => sum + s.franchise_royalty_fee_vnd,
    0,
  );
  const totalCashShortageLoss = rankedStores.reduce(
    (sum, s) => sum + s.cash_shortage_loss_vnd,
    0,
  );
  const totalShrinkageLoss = rankedStores.reduce(
    (sum, s) => sum + s.stocktake_shrinkage_loss_vnd,
    0,
  );

  // Eliminate internal warehouse->store transfers from consolidated external top-line revenue
  const consolidatedExternalRevenue =
    warehouse.b2b_external_revenue_vnd + totalStorePosRevenue;
  const intercompanyEliminatedRevenue = warehouse.internal_transfer_revenue_vnd;
  const consolidatedNetProfit =
    warehouse.warehouse_net_profit_vnd +
    totalStoreNetProfit +
    totalRoyaltyIncome;
  const consolidatedNetMarginPct =
    consolidatedExternalRevenue <= 0
      ? 0
      : roundPct2((consolidatedNetProfit / consolidatedExternalRevenue) * 100);

  return {
    period_from: params.period_from ?? null,
    period_to: params.period_to ?? null,
    generated_at: params.generated_at ?? new Date().toISOString(),
    warehouse: { ...warehouse },
    stores: rankedStores,
    total_store_pos_revenue_vnd: totalStorePosRevenue,
    total_store_net_profit_vnd: totalStoreNetProfit,
    total_franchise_royalty_income_vnd: totalRoyaltyIncome,
    total_cash_shortage_loss_vnd: totalCashShortageLoss,
    total_stocktake_shrinkage_loss_vnd: totalShrinkageLoss,
    consolidated_external_revenue_vnd: consolidatedExternalRevenue,
    intercompany_eliminated_revenue_vnd: intercompanyEliminatedRevenue,
    consolidated_net_profit_vnd: consolidatedNetProfit,
    consolidated_net_margin_pct: consolidatedNetMarginPct,
  };
}

/**
 * 4. 1-Click Franchise Store Menu Pricing Preview with Regional Multiplier & Estimated BOM Gross Margin.
 */
export function previewClonedStoreMenuPricing(
  priceMultiplier: number,
  products: readonly FranchiseMenuProductSourceInput[],
): ClonedMenuProductPricePreviewDTO[] {
  if (
    !Number.isFinite(priceMultiplier) ||
    priceMultiplier < MIN_FRANCHISE_PRICE_MULTIPLIER ||
    priceMultiplier > MAX_FRANCHISE_PRICE_MULTIPLIER
  ) {
    throw new RangeError(
      `price_multiplier must be between ${MIN_FRANCHISE_PRICE_MULTIPLIER} and ${MAX_FRANCHISE_PRICE_MULTIPLIER}`,
    );
  }

  return products.map((product) => {
    const masterBase = assertNonNegativeInt(
      product.master_base_price_vnd,
      'master_base_price_vnd',
    );
    const bomCogs = assertNonNegativeInt(
      product.default_variant_bom_cogs_vnd,
      'default_variant_bom_cogs_vnd',
    );
    const clonedBase = Math.round(masterBase * priceMultiplier);
    const priceDiff = clonedBase - masterBase;
    const grossProfit = clonedBase - bomCogs;
    const grossMarginPct =
      clonedBase <= 0 ? 0 : roundPct2((grossProfit / clonedBase) * 100);

    return {
      product_id: product.product_id,
      product_code: product.product_code,
      product_name: product.product_name,
      master_base_price_vnd: masterBase,
      cloned_base_price_vnd: clonedBase,
      price_diff_vnd: priceDiff,
      default_variant_bom_cogs_vnd: bomCogs,
      estimated_gross_profit_vnd: grossProfit,
      estimated_gross_margin_pct: grossMarginPct,
    };
  });
}
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\executive-pnl-franchise-m7.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  CloneFranchiseStoreSchema,
  ExecutivePnlQuerySchema,
  PreviewFranchisePricingSchema,
  SEED_IDS,
  calculateCentralWarehousePnl,
  calculateStoreNodePnl,
  consolidateEnterprisePnl,
  previewClonedStoreMenuPricing,
} from '../index.js';

describe('M7.1 Executive OLAP P&L Consolidation & 1-Click Franchise Cloning Engine (@cf19/shared)', () => {
  it('1. calculateCentralWarehousePnl separates external B2B profit from internal transfer markup profit', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW-TAYNGUYEN',
      warehouse_name: 'Kho Tổng Tây Nguyên',
      b2b_orders_count: 12,
      reconciled_transfers_count: 8,
      b2b_external_revenue_vnd: 40_000_000,
      b2b_raw_cogs_vnd: 25_000_000,
      internal_transfer_revenue_vnd: 15_500_000,
      internal_transfer_raw_cogs_vnd: 12_500_000,
      warehouse_operating_expense_vnd: 4_000_000,
    });

    expect(wh.b2b_external_gross_profit_vnd).toBe(15_000_000);
    expect(wh.internal_markup_profit_vnd).toBe(3_000_000);
    expect(wh.warehouse_total_revenue_vnd).toBe(55_500_000);
    expect(wh.warehouse_total_raw_cogs_vnd).toBe(37_500_000);
    expect(wh.warehouse_total_gross_profit_vnd).toBe(18_000_000);
    expect(wh.warehouse_net_profit_vnd).toBe(14_000_000);
    expect(wh.warehouse_gross_margin_pct).toBe(32.43);
    expect(wh.warehouse_net_margin_pct).toBe(25.23);
  });

  it('2. calculateCentralWarehousePnl handles zero revenue safely without NaN or Infinity', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW-TAYNGUYEN',
      warehouse_name: 'Kho Tổng',
      b2b_external_revenue_vnd: 0,
      b2b_raw_cogs_vnd: 0,
      internal_transfer_revenue_vnd: 0,
      internal_transfer_raw_cogs_vnd: 0,
      warehouse_operating_expense_vnd: 1_000_000,
    });

    expect(wh.warehouse_net_profit_vnd).toBe(-1_000_000);
    expect(wh.warehouse_gross_margin_pct).toBe(0);
    expect(wh.warehouse_net_margin_pct).toBe(0);
  });

  it('3. calculateCentralWarehousePnl rejects negative monetary inputs', () => {
    expect(() =>
      calculateCentralWarehousePnl({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        warehouse_code: 'CW-TAYNGUYEN',
        warehouse_name: 'Kho Tổng',
        b2b_external_revenue_vnd: -1,
        b2b_raw_cogs_vnd: 0,
        internal_transfer_revenue_vnd: 0,
        internal_transfer_raw_cogs_vnd: 0,
      }),
    ).toThrow(RangeError);
  });

  it('4. calculateStoreNodePnl computes RETAIL_STORE P&L with zero franchise royalty fee', () => {
    const store1 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'CF19 Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      paid_orders_count: 150,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 20_000_000,
      store_internal_bom_cogs_vnd: 9_000_000,
      labor_cost_vnd: 5_000_000,
      cash_shortage_loss_vnd: 50_000,
      stocktake_shrinkage_loss_vnd: 150_000,
      franchise_royalty_pct: 5.0,
    });

    expect(store1.pos_gross_revenue_vnd).toBe(30_000_000);
    expect(store1.store_gross_profit_vnd).toBe(21_000_000);
    expect(store1.franchise_royalty_fee_vnd).toBe(0);
    expect(store1.store_net_profit_vnd).toBe(15_800_000);
    expect(store1.gross_margin_pct).toBe(70);
    expect(store1.net_margin_pct).toBe(52.67);
  });

  it('5. calculateStoreNodePnl deducts franchise royalty fee ONLY for FRANCHISE_STORE', () => {
    const franchise = calculateStoreNodePnl({
      store_id: '20000000-0000-4000-8000-000000000009',
      store_code: 'FRAN-05',
      store_name: 'CF19 Nhượng Quyền Buôn Hồ',
      store_type: 'FRANCHISE_STORE',
      price_multiplier: 1.1,
      paid_orders_count: 100,
      cash_revenue_vnd: 8_000_000,
      vietqr_revenue_vnd: 12_000_000,
      store_internal_bom_cogs_vnd: 6_000_000,
      labor_cost_vnd: 3_000_000,
      franchise_royalty_pct: 5.0,
    });

    // 5% of 20,000,000 = 1,000,000 royalty fee
    expect(franchise.franchise_royalty_fee_vnd).toBe(1_000_000);
    expect(franchise.store_net_profit_vnd).toBe(10_000_000);
    expect(franchise.net_margin_pct).toBe(50);
  });

  it('6. calculateStoreNodePnl handles zero POS revenue safely without NaN', () => {
    const empty = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store04,
      store_code: 'STORE-04',
      store_name: 'CF19 Quán 4',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 0,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 0,
      labor_cost_vnd: 500_000,
    });

    expect(empty.store_net_profit_vnd).toBe(-500_000);
    expect(empty.gross_margin_pct).toBe(0);
    expect(empty.net_margin_pct).toBe(0);
  });

  it('7. calculateStoreNodePnl rejects invalid franchise_royalty_pct outside [0, 50]', () => {
    expect(() =>
      calculateStoreNodePnl({
        store_id: SEED_IDS.stores.store01,
        store_code: 'STORE-01',
        store_name: 'Quán 1',
        store_type: 'FRANCHISE_STORE',
        price_multiplier: 1.0,
        cash_revenue_vnd: 1_000_000,
        vietqr_revenue_vnd: 0,
        store_internal_bom_cogs_vnd: 300_000,
        franchise_royalty_pct: 60,
      }),
    ).toThrow(RangeError);
  });

  it('8. consolidateEnterprisePnl eliminates internal transfer revenue from consolidated external top-line', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW-TAYNGUYEN',
      warehouse_name: 'Kho Tổng',
      b2b_external_revenue_vnd: 40_000_000,
      b2b_raw_cogs_vnd: 25_000_000,
      internal_transfer_revenue_vnd: 15_500_000,
      internal_transfer_raw_cogs_vnd: 12_500_000,
      warehouse_operating_expense_vnd: 4_000_000,
    });

    const s1 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 20_000_000,
      store_internal_bom_cogs_vnd: 9_000_000,
      labor_cost_vnd: 5_000_000,
    });

    const s2 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store02,
      store_code: 'STORE-02',
      store_name: 'Quán 2',
      store_type: 'FRANCHISE_STORE',
      price_multiplier: 1.05,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 10_000_000,
      store_internal_bom_cogs_vnd: 6_000_000,
      labor_cost_vnd: 3_000_000,
      franchise_royalty_pct: 5.0,
    });

    const consolidated = consolidateEnterprisePnl({
      warehouse: wh,
      stores: [s2, s1],
      period_from: '2026-11-01',
      period_to: '2026-11-30',
      generated_at: '2026-11-22T10:00:00.000Z',
    });

    // External revenue = 40M (B2B) + 30M (S1) + 20M (S2) = 90M (15.5M internal transfer eliminated!)
    expect(consolidated.consolidated_external_revenue_vnd).toBe(90_000_000);
    expect(consolidated.intercompany_eliminated_revenue_vnd).toBe(15_500_000);
    expect(consolidated.total_store_pos_revenue_vnd).toBe(50_000_000);
    expect(consolidated.total_franchise_royalty_income_vnd).toBe(1_000_000);
    // Consolidated net profit = 14M (WH) + 16M (S1) + 10M (S2) + 1M (Royalty) = 41M
    expect(consolidated.consolidated_net_profit_vnd).toBe(41_000_000);
    expect(consolidated.consolidated_net_margin_pct).toBe(45.56);
  });

  it('9. consolidateEnterprisePnl ranks stores descending by store_net_profit_vnd with 1-based rank', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW',
      warehouse_name: 'WH',
      b2b_external_revenue_vnd: 0,
      b2b_raw_cogs_vnd: 0,
      internal_transfer_revenue_vnd: 0,
      internal_transfer_raw_cogs_vnd: 0,
    });

    const low = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store04,
      store_code: 'STORE-04',
      store_name: 'Quán 4',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 5_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 2_000_000,
    });

    const top = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 25_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 7_000_000,
    });

    const mid = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store02,
      store_code: 'STORE-02',
      store_name: 'Quán 2',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 12_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 4_000_000,
    });

    const result = consolidateEnterprisePnl({
      warehouse: wh,
      stores: [low, mid, top],
    });

    expect(result.stores.map((s) => s.store_code)).toEqual([
      'STORE-01',
      'STORE-02',
      'STORE-04',
    ]);
    expect(result.stores.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  it('10. consolidateEnterprisePnl aggregates cash shortage and stocktake shrinkage losses across all branches', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW',
      warehouse_name: 'WH',
      b2b_external_revenue_vnd: 10_000_000,
      b2b_raw_cogs_vnd: 6_000_000,
      internal_transfer_revenue_vnd: 0,
      internal_transfer_raw_cogs_vnd: 0,
    });

    const s1 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 3_000_000,
      cash_shortage_loss_vnd: 40_000,
      stocktake_shrinkage_loss_vnd: 120_000,
    });

    const s2 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store02,
      store_code: 'STORE-02',
      store_name: 'Quán 2',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 3_000_000,
      cash_shortage_loss_vnd: 60_000,
      stocktake_shrinkage_loss_vnd: 80_000,
    });

    const res = consolidateEnterprisePnl({ warehouse: wh, stores: [s1, s2] });
    expect(res.total_cash_shortage_loss_vnd).toBe(100_000);
    expect(res.total_stocktake_shrinkage_loss_vnd).toBe(200_000);
  });

  it('11. previewClonedStoreMenuPricing applies 1.15x regional multiplier and calculates BOM gross margin', () => {
    const preview = previewClonedStoreMenuPricing(1.15, [
      {
        product_id: SEED_IDS.menuProducts.caPheSuaDa,
        product_code: 'PRD-CF-SUA-DA',
        product_name: 'Cà Phê Sữa Đá Tây Nguyên',
        master_base_price_vnd: 29000,
        default_variant_bom_cogs_vnd: 8250,
      },
      {
        product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
        product_code: 'PRD-BAC-XIU',
        product_name: 'Bạc Xỉu Tây Nguyên',
        master_base_price_vnd: 35000,
        default_variant_bom_cogs_vnd: 9600,
      },
    ]);

    expect(preview).toHaveLength(2);
    expect(preview[0]?.cloned_base_price_vnd).toBe(33350);
    expect(preview[0]?.price_diff_vnd).toBe(4350);
    expect(preview[0]?.estimated_gross_profit_vnd).toBe(25100);
    expect(preview[0]?.estimated_gross_margin_pct).toBe(75.26);

    expect(preview[1]?.cloned_base_price_vnd).toBe(40250);
    expect(preview[1]?.price_diff_vnd).toBe(5250);
  });

  it('12. previewClonedStoreMenuPricing supports discounted tier multiplier (0.90x) for rural branches', () => {
    const preview = previewClonedStoreMenuPricing(0.9, [
      {
        product_id: SEED_IDS.menuProducts.caPheDenDa,
        product_code: 'PRD-CF-DEN-DA',
        product_name: 'Cà Phê Đen Đá',
        master_base_price_vnd: 25000,
        default_variant_bom_cogs_vnd: 6000,
      },
    ]);

    expect(preview[0]?.cloned_base_price_vnd).toBe(22500);
    expect(preview[0]?.price_diff_vnd).toBe(-2500);
    expect(preview[0]?.estimated_gross_margin_pct).toBe(73.33);
  });

  it('13. previewClonedStoreMenuPricing rejects price_multiplier outside [0.50, 3.00]', () => {
    expect(() => previewClonedStoreMenuPricing(0.49, [])).toThrow(RangeError);
    expect(() => previewClonedStoreMenuPricing(3.01, [])).toThrow(RangeError);
  });

  it('14. ExecutivePnlQuerySchema accepts valid date range and coerces numeric defaults', () => {
    const parsed = ExecutivePnlQuerySchema.safeParse({
      period_from: '2026-11-01',
      period_to: '2026-11-30',
      warehouse_operating_expense_vnd: '4500000',
      franchise_royalty_pct: '6.5',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.warehouse_operating_expense_vnd).toBe(4500000);
      expect(parsed.data.franchise_royalty_pct).toBe(6.5);
    }
  });

  it('15. ExecutivePnlQuerySchema rejects inverted date range (period_to < period_from)', () => {
    const parsed = ExecutivePnlQuerySchema.safeParse({
      period_from: '2026-11-30',
      period_to: '2026-11-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('16. PreviewFranchisePricingSchema enforces [0.50, 3.00] multiplier bounds', () => {
    expect(PreviewFranchisePricingSchema.safeParse({ price_multiplier: '1.15' }).success).toBe(true);
    expect(PreviewFranchisePricingSchema.safeParse({ price_multiplier: 0.2 }).success).toBe(false);
    expect(PreviewFranchisePricingSchema.safeParse({ price_multiplier: 4.5 }).success).toBe(false);
  });

  it('17. CloneFranchiseStoreSchema validates franchise store creation and applies safe defaults', () => {
    const parsed = CloneFranchiseStoreSchema.safeParse({
      code: 'FRAN-05-BMT',
      name: 'CF19 Nhượng Quyền Buôn Hồ',
      address: '45 Hùng Vương, TX. Buôn Hồ, Đắk Lắk',
      price_multiplier: 1.1,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('FRANCHISE_STORE');
      expect(parsed.data.opening_cash_vnd).toBe(2000000);
      expect(parsed.data.create_starter_transfer).toBe(true);
      expect(parsed.data.starter_coffee_qty_g).toBe(10000);
    }
  });

  it('18. CloneFranchiseStoreSchema blocks cloning CENTRAL_WAREHOUSE type', () => {
    const parsed = CloneFranchiseStoreSchema.safeParse({
      code: 'CW-CLONE-02',
      name: 'Invalid Warehouse Clone',
      type: 'CENTRAL_WAREHOUSE',
      address: '123 Test Street',
    });
    expect(parsed.success).toBe(false);
  });

  it('19. CloneFranchiseStoreSchema rejects lowercase/invalid store code or invalid phone', () => {
    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'fran 05',
        name: 'Quán 5',
        address: '123 Đường A',
      }).success,
    ).toBe(false);

    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'FRAN-05',
        name: 'Quán 5',
        address: '123 Đường A',
        phone: 'abc',
      }).success,
    ).toBe(false);
  });

  it('20. CloneFranchiseStoreSchema rejects non-positive starter_coffee_qty_g or negative opening_cash_vnd', () => {
    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'FRAN-06',
        name: 'Quán 6',
        address: '123 Đường B',
        starter_coffee_qty_g: 0,
      }).success,
    ).toBe(false);

    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'FRAN-06',
        name: 'Quán 6',
        address: '123 Đường B',
        opening_cash_vnd: -500000,
      }).success,
    ).toBe(false);
  });
});
```
