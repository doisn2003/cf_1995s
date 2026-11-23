# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M4.1 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **6 files (4 + 2)**.
- **Tiền đề đã hoàn thành:** `C:\bib\cf_19\supabase\migrations\0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql` (RBAC Guard + 3 Atomic PL/pgSQL RPCs).

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# HỢP ĐỒNG M4 TRONG `@cf19/shared` (SCHEMAS, TYPES & BARREL EXPORTS — 4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây cho hợp đồng M4 (`posCatalog.schema.ts`, `posCatalog.types.ts` và barrel exports) trong gói `@cf19/shared`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi tên file, không đổi đuôi `.js` trong import ESM.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `utils/posBomAndReceiptMath.ts` hay `__tests__/pos-catalog-m4.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M4.1 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\packages\shared\src\schemas\posCatalog.schema.ts` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\types\posCatalog.types.ts` (Tạo mới)
3. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\packages\shared\src\index.ts` (Cập nhật — Overwrite)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\packages\shared\src\schemas\posCatalog.schema.ts`
```ts
import { z } from 'zod';
import {
  KDS_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '../enums.js';
import { UuidSchema } from './auth.schema.js';

const ClientOrderCodeSchema = z
  .string()
  .trim()
  .min(4, 'client_order_code must be at least 4 characters')
  .max(64, 'client_order_code must be at most 64 characters')
  .regex(
    /^[A-Z0-9_-]+$/,
    'client_order_code must contain only uppercase letters, digits, underscores, or hyphens',
  );

export const PosCatalogQuerySchema = z.object({
  include_inactive: z.coerce.boolean().optional().default(false),
});

export const PosOrderCartItemInputSchema = z.object({
  product_id: UuidSchema,
  variant_id: UuidSchema,
  modifier_ids: z.array(UuidSchema).default([]),
  quantity: z
    .number({ invalid_type_error: 'Item quantity must be a number' })
    .int('Item quantity must be an integer')
    .positive('Item quantity must be greater than zero')
    .max(500, 'Item quantity cannot exceed 500 per line'),
  notes: z.string().trim().max(250).optional(),
});

export const SubmitPosOrderSchema = z.object({
  shift_id: UuidSchema,
  payment_method: z.enum(PAYMENT_METHODS),
  customer_phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Invalid customer phone format')
    .optional(),
  client_order_code: ClientOrderCodeSchema.optional(),
  items: z
    .array(PosOrderCartItemInputSchema)
    .min(1, 'POS order must contain at least 1 item'),
});

export const OfflinePosOrderEntrySchema = z.object({
  client_order_code: ClientOrderCodeSchema,
  payment_method: z.enum(PAYMENT_METHODS),
  customer_phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Invalid customer phone format')
    .optional(),
  created_offline_at: z.string().datetime().optional(),
  items: z
    .array(PosOrderCartItemInputSchema)
    .min(1, 'Offline POS order must contain at least 1 item'),
});

export const OfflinePosBatchSyncSchema = z.object({
  shift_id: UuidSchema,
  orders: z
    .array(OfflinePosOrderEntrySchema)
    .min(1, 'Offline batch sync requires at least 1 order')
    .max(100, 'Offline batch sync cannot exceed 100 orders per request'),
});

export const PosOrdersFilterQuerySchema = z.object({
  payment_status: z.enum(PAYMENT_STATUSES).optional(),
  kds_status: z.enum(KDS_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
```

### File 2: `C:\bib\cf_19\packages\shared\src\types\posCatalog.types.ts`
```ts
import type { z } from 'zod';
import type {
  BaseUnit,
  PaymentMethod,
  PaymentStatus,
} from '../enums.js';
import type {
  OfflinePosBatchSyncSchema,
  OfflinePosOrderEntrySchema,
  PosCatalogQuerySchema,
  PosOrderCartItemInputSchema,
  PosOrdersFilterQuerySchema,
  SubmitPosOrderSchema,
} from '../schemas/posCatalog.schema.js';
import type {
  MenuModifierDto,
  MenuProductDto,
  MenuVariantDto,
  PosOrderFullDto,
  PosOrderItemDto,
} from './domain.types.js';

export type PosCatalogQueryDTO = z.infer<typeof PosCatalogQuerySchema>;
export type PosOrderCartItemInputDTO = z.infer<typeof PosOrderCartItemInputSchema>;
export type SubmitPosOrderDTO = z.infer<typeof SubmitPosOrderSchema>;
export type OfflinePosOrderEntryDTO = z.infer<typeof OfflinePosOrderEntrySchema>;
export type OfflinePosBatchSyncDTO = z.infer<typeof OfflinePosBatchSyncSchema>;
export type PosOrdersFilterQueryDTO = z.infer<typeof PosOrdersFilterQuerySchema>;

export interface MenuCategoryDto {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface BomRecipeItemDetailDTO {
  inventory_item_id: string;
  sku: string;
  name: string;
  base_unit: BaseUnit;
  quantity_per_cup_base_unit: number;
  wastage_allowance_pct: number;
  internal_transfer_price_vnd: number;
}

export interface BomRecipeWithItemsDTO {
  id: string;
  product_id: string;
  variant_id: string;
  version: number;
  is_active: boolean;
  items: BomRecipeItemDetailDTO[];
}

export interface StoreCatalogProductDTO extends MenuProductDto {
  effective_base_price_vnd: number;
  variants: MenuVariantDto[];
}

export interface StorePosCatalogDTO {
  store: {
    id: string;
    code: string;
    name: string;
    price_multiplier: number;
  };
  categories: MenuCategoryDto[];
  products: StoreCatalogProductDTO[];
  modifiers: MenuModifierDto[];
  bom_recipes: BomRecipeWithItemsDTO[];
}

export interface PosLinePricingBreakdownDTO {
  effective_base_price_vnd: number;
  variant_price_delta_vnd: number;
  modifiers_price_delta_vnd: number;
  unit_price_vnd: number;
  quantity: number;
  line_total_vnd: number;
}

export interface ModifierMatrixValidationResultDTO {
  valid: boolean;
  errors: string[];
}

export interface BomMaterialRequirementSliceDTO {
  inventory_item_id: string;
  sku: string;
  name: string;
  base_unit: BaseUnit;
  recipe_required_qty: number;
  modifier_required_qty: number;
  total_required_qty: number;
  internal_transfer_price_vnd: number;
  estimated_cogs_vnd: number;
}

export type PosOrderSyncStatus = 'SYNCED_NEW' | 'IDEMPOTENT_EXISTING';

export interface PosOrderDetailResultDTO {
  sync_status: PosOrderSyncStatus;
  order: PosOrderFullDto;
  items: PosOrderItemDto[];
  bom_requirements: BomMaterialRequirementSliceDTO[];
  thermal_receipt_text: string;
}

export interface OfflinePosBatchSyncResultDTO {
  total_received: number;
  synced_new_count: number;
  idempotent_existing_count: number;
  results: PosOrderDetailResultDTO[];
}

export interface EscPosReceiptLineInput {
  product_name: string;
  size_code: string;
  modifier_names: string[];
  quantity: number;
  unit_price_vnd: number;
  line_total_vnd: number;
  notes?: string | null;
}

export interface EscPosThermalReceiptInputDTO {
  store_name: string;
  store_address?: string;
  order_code: string;
  created_at: string;
  cashier_name: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  vietqr_ref_code?: string | null;
  total_amount_vnd: number;
  lines: EscPosReceiptLineInput[];
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
export * from './utils/warehouseMath.js';
export * from './utils/b2bAndTransferMath.js';
export * from './utils/posBomAndReceiptMath.js';
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M4.1 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\packages\shared\src\schemas\posCatalog.schema.ts','C:\bib\cf_19\packages\shared\src\types\posCatalog.types.ts','C:\bib\cf_19\packages\shared\src\schemas\index.ts','C:\bib\cf_19\packages\shared\src\index.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# PURE POS / BOM / ESC-POS MATH ENGINE & 22 VITEST UNIT TESTS (2 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 2 file dưới đây: `posBomAndReceiptMath.ts` và bộ 22 Vitest Unit Tests `pos-catalog-m4.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thay đổi công thức làm tròn hay chiều rộng 42 cột hóa đơn ESC/POS, không rút gọn test cases.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 2 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1` hay `supabase/migrations/0005_m4_pos_catalog_bom_and_offline_sync_rpcs.sql`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 2 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M4.1 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (2 TARGET FILES)
1. `C:\bib\cf_19\packages\shared\src\utils\posBomAndReceiptMath.ts` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\__tests__\pos-catalog-m4.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\packages\shared\src\utils\posBomAndReceiptMath.ts`
```ts
import type { BaseUnit } from '../enums.js';
import type { MenuModifierDto } from '../types/domain.types.js';
import type {
  BomMaterialRequirementSliceDTO,
  BomRecipeWithItemsDTO,
  EscPosThermalReceiptInputDTO,
  ModifierMatrixValidationResultDTO,
  PosLinePricingBreakdownDTO,
} from '../types/posCatalog.types.js';
import { convertToKgForTierPricing } from './b2bAndTransferMath.js';

export const ESC_POS_RECEIPT_WIDTH = 42;

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 1. Adjusts Master Menu base price using a store's regional price_multiplier.
 */
export function calculateBranchAdjustedBasePriceVnd(
  basePriceVnd: number,
  priceMultiplier: number,
): number {
  if (!Number.isFinite(basePriceVnd) || basePriceVnd < 0) {
    throw new RangeError('basePriceVnd must be a non-negative finite number');
  }
  if (!Number.isFinite(priceMultiplier) || priceMultiplier <= 0) {
    throw new RangeError('priceMultiplier must be a positive finite number');
  }
  return Math.round(basePriceVnd * priceMultiplier);
}

/**
 * 2. Computes full POS line item pricing (Regional Base + Size Variant + Modifiers * Qty).
 */
export function calculatePosLinePricing(params: {
  basePriceVnd: number;
  priceMultiplier: number;
  variantPriceDeltaVnd: number;
  modifiers: readonly Pick<MenuModifierDto, 'price_delta_vnd'>[];
  quantity: number;
}): PosLinePricingBreakdownDTO {
  const {
    basePriceVnd,
    priceMultiplier,
    variantPriceDeltaVnd,
    modifiers,
    quantity,
  } = params;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError('quantity must be a positive integer');
  }

  const effectiveBasePriceVnd = calculateBranchAdjustedBasePriceVnd(
    basePriceVnd,
    priceMultiplier,
  );
  const modifiersPriceDeltaVnd = modifiers.reduce(
    (sum, mod) => sum + Math.round(mod.price_delta_vnd),
    0,
  );
  const unitPriceVnd = Math.max(
    0,
    effectiveBasePriceVnd + Math.round(variantPriceDeltaVnd) + modifiersPriceDeltaVnd,
  );

  return {
    effective_base_price_vnd: effectiveBasePriceVnd,
    variant_price_delta_vnd: Math.round(variantPriceDeltaVnd),
    modifiers_price_delta_vnd: modifiersPriceDeltaVnd,
    unit_price_vnd: unitPriceVnd,
    quantity,
    line_total_vnd: unitPriceVnd * quantity,
  };
}

/**
 * 3. Validates Modifier Selection Matrix rules for a single POS drink line:
 *    - SUGAR group: maximum 1 selection
 *    - ICE group: maximum 1 selection
 *    - TOPPING group: unlimited distinct selections
 *    - Duplicate modifier IDs rejected
 */
export function validateModifierSelectionMatrix(
  selectedModifiers: readonly Pick<
    MenuModifierDto,
    'id' | 'code' | 'name' | 'modifier_group'
  >[],
): ModifierMatrixValidationResultDTO {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  let sugarCount = 0;
  let iceCount = 0;

  for (const mod of selectedModifiers) {
    if (seenIds.has(mod.id)) {
      errors.push(`Duplicate modifier selected: ${mod.code}`);
      continue;
    }
    seenIds.add(mod.id);

    if (mod.modifier_group === 'SUGAR') {
      sugarCount += 1;
    } else if (mod.modifier_group === 'ICE') {
      iceCount += 1;
    }
  }

  if (sugarCount > 1) {
    errors.push(`SUGAR group allows at most 1 selection (got ${sugarCount})`);
  }
  if (iceCount > 1) {
    errors.push(`ICE group allows at most 1 selection (got ${iceCount})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface PosBomOrderLineInput {
  product_id: string;
  variant_id: string;
  modifier_ids: readonly string[];
  quantity: number;
}

export interface BomInventoryCostLookup {
  id: string;
  sku: string;
  name: string;
  base_unit: BaseUnit;
  internal_transfer_price_vnd: number;
}

/**
 * 4. Computes Multi-level BOM material requirements (Tier 1 Recipe + Wastage,
 *    Tier 2 Modifier Linked Inventory) and aggregated internal COGS in integer VND.
 */
export function calculateOrderBomRequirementsAndCogs(params: {
  lines: readonly PosBomOrderLineInput[];
  recipes: readonly BomRecipeWithItemsDTO[];
  modifiersById: Readonly<Record<string, MenuModifierDto>>;
  inventoryItemsById: Readonly<Record<string, BomInventoryCostLookup>>;
}): {
  requirements: BomMaterialRequirementSliceDTO[];
  total_cogs_vnd: number;
} {
  const { lines, recipes, modifiersById, inventoryItemsById } = params;

  const aggregated = new Map<
    string,
    {
      sku: string;
      name: string;
      base_unit: BaseUnit;
      internal_transfer_price_vnd: number;
      recipe_required_qty: number;
      modifier_required_qty: number;
    }
  >();

  const ensureBucket = (item: BomInventoryCostLookup) => {
    let bucket = aggregated.get(item.id);
    if (!bucket) {
      bucket = {
        sku: item.sku,
        name: item.name,
        base_unit: item.base_unit,
        internal_transfer_price_vnd: item.internal_transfer_price_vnd,
        recipe_required_qty: 0,
        modifier_required_qty: 0,
      };
      aggregated.set(item.id, bucket);
    }
    return bucket;
  };

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new RangeError('BOM line quantity must be a positive integer');
    }

    // Tier 1: Master BOM Recipe (with wastage_allowance_pct)
    const recipe = recipes.find(
      (r) =>
        r.is_active &&
        r.product_id === line.product_id &&
        r.variant_id === line.variant_id,
    );
    if (recipe) {
      for (const item of recipe.items) {
        const lookup = inventoryItemsById[item.inventory_item_id] ?? {
          id: item.inventory_item_id,
          sku: item.sku,
          name: item.name,
          base_unit: item.base_unit,
          internal_transfer_price_vnd: item.internal_transfer_price_vnd,
        };
        const requiredQty = roundQty2(
          line.quantity *
            item.quantity_per_cup_base_unit *
            (1 + item.wastage_allowance_pct / 100),
        );
        const bucket = ensureBucket(lookup);
        bucket.recipe_required_qty = roundQty2(
          bucket.recipe_required_qty + requiredQty,
        );
      }
    }

    // Tier 2: Modifier-linked inventory materials (e.g., Extra Shot, Extra Milk)
    for (const modId of line.modifier_ids) {
      const mod = modifiersById[modId];
      if (!mod || !mod.inventory_item_id || mod.bom_qty_base_unit <= 0) {
        continue;
      }
      const lookup = inventoryItemsById[mod.inventory_item_id];
      if (!lookup) {
        continue;
      }
      const modQty = roundQty2(line.quantity * mod.bom_qty_base_unit);
      const bucket = ensureBucket(lookup);
      bucket.modifier_required_qty = roundQty2(
        bucket.modifier_required_qty + modQty,
      );
    }
  }

  const requirements: BomMaterialRequirementSliceDTO[] = [];
  let totalCogsVnd = 0;

  for (const [inventoryItemId, bucket] of aggregated.entries()) {
    const totalRequiredQty = roundQty2(
      bucket.recipe_required_qty + bucket.modifier_required_qty,
    );
    const billingQty = convertToKgForTierPricing(
      totalRequiredQty,
      bucket.base_unit,
    );
    const estimatedCogsVnd = Math.round(
      billingQty * bucket.internal_transfer_price_vnd,
    );
    totalCogsVnd += estimatedCogsVnd;

    requirements.push({
      inventory_item_id: inventoryItemId,
      sku: bucket.sku,
      name: bucket.name,
      base_unit: bucket.base_unit,
      recipe_required_qty: bucket.recipe_required_qty,
      modifier_required_qty: bucket.modifier_required_qty,
      total_required_qty: totalRequiredQty,
      internal_transfer_price_vnd: bucket.internal_transfer_price_vnd,
      estimated_cogs_vnd: estimatedCogsVnd,
    });
  }

  requirements.sort((a, b) => a.sku.localeCompare(b.sku));

  return {
    requirements,
    total_cogs_vnd: totalCogsVnd,
  };
}

function formatLeftRight(left: string, right: string, width = ESC_POS_RECEIPT_WIDTH): string {
  const cleanLeft = left.trim();
  const cleanRight = right.trim();
  const maxLeft = Math.max(1, width - cleanRight.length - 1);
  const clippedLeft =
    cleanLeft.length > maxLeft ? cleanLeft.slice(0, maxLeft) : cleanLeft;
  const spaces = Math.max(1, width - clippedLeft.length - cleanRight.length);
  return `${clippedLeft}${' '.repeat(spaces)}${cleanRight}`;
}

function centerText(text: string, width = ESC_POS_RECEIPT_WIDTH): string {
  const clean = text.trim().slice(0, width);
  const padLeft = Math.floor((width - clean.length) / 2);
  return `${' '.repeat(Math.max(0, padLeft))}${clean}`;
}

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')}d`;
}

/**
 * 5. Renders a deterministic 42-column ESC/POS thermal receipt string.
 */
export function buildEscPosThermalReceiptText(
  receipt: EscPosThermalReceiptInputDTO,
): string {
  const divider = '-'.repeat(ESC_POS_RECEIPT_WIDTH);
  const doubleDivider = '='.repeat(ESC_POS_RECEIPT_WIDTH);
  const out: string[] = [
    doubleDivider,
    centerText(receipt.store_name),
  ];

  if (receipt.store_address) {
    out.push(centerText(receipt.store_address));
  }

  out.push(
    divider,
    formatLeftRight('Ma don:', receipt.order_code),
    formatLeftRight('Thoi gian:', receipt.created_at.slice(0, 19).replace('T', ' ')),
    formatLeftRight('Thu ngan:', receipt.cashier_name),
    divider,
  );

  for (const line of receipt.lines) {
    const title = `${line.quantity}x ${line.product_name} (${line.size_code})`;
    out.push(formatLeftRight(title, formatVnd(line.line_total_vnd)));
    if (line.modifier_names.length > 0) {
      out.push(`   + ${line.modifier_names.join(', ')}`.slice(0, ESC_POS_RECEIPT_WIDTH));
    }
    if (line.notes) {
      out.push(`   * ${line.notes}`.slice(0, ESC_POS_RECEIPT_WIDTH));
    }
  }

  out.push(
    divider,
    formatLeftRight('TONG THANH TOAN:', formatVnd(receipt.total_amount_vnd)),
    formatLeftRight('Phuong thuc:', receipt.payment_method),
    formatLeftRight('Trang thai:', receipt.payment_status),
  );

  if (receipt.vietqr_ref_code) {
    out.push(formatLeftRight('Ma VietQR:', receipt.vietqr_ref_code));
  }

  out.push(doubleDivider, centerText('Cam on quy khach — CF19 Coffee!'));
  return out.join('\n');
}
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\pos-catalog-m4.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import {
  ESC_POS_RECEIPT_WIDTH,
  OfflinePosBatchSyncSchema,
  PosOrdersFilterQuerySchema,
  SEED_IDS,
  SubmitPosOrderSchema,
  buildEscPosThermalReceiptText,
  calculateBranchAdjustedBasePriceVnd,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BomRecipeWithItemsDTO,
  type MenuModifierDto,
} from '../index.js';

const SAMPLE_MODIFIERS: Record<string, MenuModifierDto> = {
  sugar50: {
    id: SEED_IDS.menuModifiers.sugar50,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-SUGAR-50',
    modifier_group: 'SUGAR',
    name: 'Ít đường (50%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  sugar0: {
    id: '63000000-0000-4000-8000-000000000099',
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-SUGAR-0',
    modifier_group: 'SUGAR',
    name: 'Không đường (0%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  ice50: {
    id: SEED_IDS.menuModifiers.ice50,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-ICE-50',
    modifier_group: 'ICE',
    name: 'Ít đá (50%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  ice0: {
    id: '63000000-0000-4000-8000-000000000098',
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-ICE-0',
    modifier_group: 'ICE',
    name: 'Không đá (0%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  shot: {
    id: SEED_IDS.menuModifiers.extraEspressoShot,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-TOP-SHOT',
    modifier_group: 'TOPPING',
    name: 'Thêm 1 Shot Espresso',
    price_delta_vnd: 10000,
    inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
    bom_qty_base_unit: 18,
    is_active: true,
  },
  milk: {
    id: SEED_IDS.menuModifiers.extraCondensedMilk,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-TOP-MILK',
    modifier_group: 'TOPPING',
    name: 'Thêm Sữa Đặc',
    price_delta_vnd: 5000,
    inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
    bom_qty_base_unit: 15,
    is_active: true,
  },
};

const SAMPLE_RECIPES: BomRecipeWithItemsDTO[] = [
  {
    id: SEED_IDS.bomRecipes.caPheSuaDaM,
    product_id: SEED_IDS.menuProducts.caPheSuaDa,
    variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
    version: 1,
    is_active: true,
    items: [
      {
        inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        sku: 'RC-ROB-MED',
        name: 'Cà phê hạt rang Robusta Medium',
        base_unit: 'g',
        quantity_per_cup_base_unit: 20,
        wastage_allowance_pct: 2,
        internal_transfer_price_vnd: 155000,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
        sku: 'ING-COND-MILK',
        name: 'Sữa đặc có đường',
        base_unit: 'ml',
        quantity_per_cup_base_unit: 25,
        wastage_allowance_pct: 2,
        internal_transfer_price_vnd: 60,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
        sku: 'PKG-CUP-500',
        name: 'Ly nhựa 500ml',
        base_unit: 'pcs',
        quantity_per_cup_base_unit: 1,
        wastage_allowance_pct: 0,
        internal_transfer_price_vnd: 1350,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
        sku: 'PKG-STRAW-BIO',
        name: 'Ống hút sinh học',
        base_unit: 'pcs',
        quantity_per_cup_base_unit: 1,
        wastage_allowance_pct: 0,
        internal_transfer_price_vnd: 220,
      },
    ],
  },
];

const SAMPLE_ITEMS_BY_ID = {
  [SEED_IDS.inventoryItems.roastedRobustaMed]: {
    id: SEED_IDS.inventoryItems.roastedRobustaMed,
    sku: 'RC-ROB-MED',
    name: 'Cà phê hạt rang Robusta Medium',
    base_unit: 'g' as const,
    internal_transfer_price_vnd: 155000,
  },
  [SEED_IDS.inventoryItems.condensedMilk]: {
    id: SEED_IDS.inventoryItems.condensedMilk,
    sku: 'ING-COND-MILK',
    name: 'Sữa đặc có đường',
    base_unit: 'ml' as const,
    internal_transfer_price_vnd: 60,
  },
  [SEED_IDS.inventoryItems.plasticCup500ml]: {
    id: SEED_IDS.inventoryItems.plasticCup500ml,
    sku: 'PKG-CUP-500',
    name: 'Ly nhựa 500ml',
    base_unit: 'pcs' as const,
    internal_transfer_price_vnd: 1350,
  },
  [SEED_IDS.inventoryItems.bioStraw]: {
    id: SEED_IDS.inventoryItems.bioStraw,
    sku: 'PKG-STRAW-BIO',
    name: 'Ống hút sinh học',
    base_unit: 'pcs' as const,
    internal_transfer_price_vnd: 220,
  },
};

describe('M4.1 — Pure POS Pricing, Modifier Matrix, Multi-level BOM COGS & ESC/POS Receipt Engine', () => {
  // 1-3: Regional Price Multiplier
  it('1. keeps base price unchanged when store price_multiplier is 1.00', () => {
    expect(calculateBranchAdjustedBasePriceVnd(29000, 1.0)).toBe(29000);
  });

  it('2. applies regional multiplier (e.g., Store 3 = 1.05) and rounds to integer VND', () => {
    expect(calculateBranchAdjustedBasePriceVnd(29000, 1.05)).toBe(30450);
    expect(calculateBranchAdjustedBasePriceVnd(25000, 1.05)).toBe(26250);
  });

  it('3. throws RangeError on invalid basePriceVnd or non-positive priceMultiplier', () => {
    expect(() => calculateBranchAdjustedBasePriceVnd(-1000, 1.0)).toThrow(RangeError);
    expect(() => calculateBranchAdjustedBasePriceVnd(29000, 0)).toThrow(RangeError);
  });

  // 4-6: POS Line Pricing Breakdown
  it('4. calculates POS line pricing for standard Size M drink with no modifiers', () => {
    const line = calculatePosLinePricing({
      basePriceVnd: 29000,
      priceMultiplier: 1.0,
      variantPriceDeltaVnd: 0,
      modifiers: [],
      quantity: 2,
    });
    expect(line.unit_price_vnd).toBe(29000);
    expect(line.line_total_vnd).toBe(58000);
  });

  it('5. calculates POS line pricing for Store 3 (1.05x) + Size L (+6,000) + 2 Toppings (+15,000)', () => {
    const line = calculatePosLinePricing({
      basePriceVnd: 29000,
      priceMultiplier: 1.05, // 30,450
      variantPriceDeltaVnd: 6000,
      modifiers: [SAMPLE_MODIFIERS.shot, SAMPLE_MODIFIERS.milk],
      quantity: 3,
    });
    expect(line.effective_base_price_vnd).toBe(30450);
    expect(line.modifiers_price_delta_vnd).toBe(15000);
    expect(line.unit_price_vnd).toBe(51450);
    expect(line.line_total_vnd).toBe(154350);
  });

  it('6. throws RangeError on float or zero quantity in calculatePosLinePricing', () => {
    expect(() =>
      calculatePosLinePricing({
        basePriceVnd: 29000,
        priceMultiplier: 1,
        variantPriceDeltaVnd: 0,
        modifiers: [],
        quantity: 1.5,
      }),
    ).toThrow(RangeError);
  });

  // 7-10: Modifier Selection Matrix
  it('7. approves 1 SUGAR + 1 ICE + multiple distinct TOPPING modifiers on one drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.sugar50,
      SAMPLE_MODIFIERS.ice50,
      SAMPLE_MODIFIERS.shot,
      SAMPLE_MODIFIERS.milk,
    ]);
    expect(check.valid).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it('8. rejects selecting 2 SUGAR modifiers on the same drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.sugar50,
      SAMPLE_MODIFIERS.sugar0,
    ]);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toContain('SUGAR');
  });

  it('9. rejects selecting 2 ICE modifiers on the same drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.ice50,
      SAMPLE_MODIFIERS.ice0,
    ]);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toContain('ICE');
  });

  it('10. rejects duplicate identical modifier IDs on the same drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.shot,
      SAMPLE_MODIFIERS.shot,
    ]);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toContain('Duplicate');
  });

  // 11-14: Multi-level BOM Requirements & Internal COGS
  it('11. calculates exact Tier 1 BOM requirements with wastage allowance and internal COGS for 1 Cà Phê Sữa Đá M', () => {
    // 20g * 1.02 = 20.4g coffee -> ROUND(0.0204 * 155000) = 3,162
    // 25ml * 1.02 = 25.5ml milk -> ROUND(25.5 * 60) = 1,530
    // 1 cup = 1,350 ; 1 straw = 220 -> Total COGS = 6,262 VND
    const bom = calculateOrderBomRequirementsAndCogs({
      lines: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [],
          quantity: 1,
        },
      ],
      recipes: SAMPLE_RECIPES,
      modifiersById: {},
      inventoryItemsById: SAMPLE_ITEMS_BY_ID,
    });
    expect(bom.requirements).toHaveLength(4);
    expect(bom.total_cogs_vnd).toBe(6262);
  });

  it('12. aggregates Tier 1 Recipe BOM + Tier 2 Modifier BOM (Extra Shot 18g + Extra Milk 15ml) across 2 cups', () => {
    // 2 cups:
    // Coffee: recipe 2*20*1.02 = 40.8g + modifier 2*18 = 36g -> 76.8g -> ROUND(0.0768 * 155000) = 11,904
    // Milk:   recipe 2*25*1.02 = 51ml + modifier 2*15 = 30ml -> 81ml -> ROUND(81 * 60) = 4,860
    // Cup: 2 * 1350 = 2,700 ; Straw: 2 * 220 = 440 -> Total = 19,904 VND
    const modifiersById = {
      [SAMPLE_MODIFIERS.shot.id]: SAMPLE_MODIFIERS.shot,
      [SAMPLE_MODIFIERS.milk.id]: SAMPLE_MODIFIERS.milk,
    };
    const bom = calculateOrderBomRequirementsAndCogs({
      lines: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [SAMPLE_MODIFIERS.shot.id, SAMPLE_MODIFIERS.milk.id],
          quantity: 2,
        },
      ],
      recipes: SAMPLE_RECIPES,
      modifiersById,
      inventoryItemsById: SAMPLE_ITEMS_BY_ID,
    });

    const coffeeSlice = bom.requirements.find((r) => r.sku === 'RC-ROB-MED');
    expect(coffeeSlice?.recipe_required_qty).toBe(40.8);
    expect(coffeeSlice?.modifier_required_qty).toBe(36);
    expect(coffeeSlice?.total_required_qty).toBe(76.8);
    expect(coffeeSlice?.estimated_cogs_vnd).toBe(11904);
    expect(bom.total_cogs_vnd).toBe(19904);
  });

  it('13. returns empty requirements and 0 COGS if product/variant has no active BOM recipe and no linked modifiers', () => {
    const bom = calculateOrderBomRequirementsAndCogs({
      lines: [
        {
          product_id: SEED_IDS.menuProducts.caPheDenDa,
          variant_id: SEED_IDS.menuVariants.caPheDenDaL,
          modifier_ids: [],
          quantity: 1,
        },
      ],
      recipes: SAMPLE_RECIPES,
      modifiersById: {},
      inventoryItemsById: SAMPLE_ITEMS_BY_ID,
    });
    expect(bom.requirements).toHaveLength(0);
    expect(bom.total_cogs_vnd).toBe(0);
  });

  it('14. throws RangeError on non-positive quantity in BOM calculation', () => {
    expect(() =>
      calculateOrderBomRequirementsAndCogs({
        lines: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [],
            quantity: 0,
          },
        ],
        recipes: SAMPLE_RECIPES,
        modifiersById: {},
        inventoryItemsById: SAMPLE_ITEMS_BY_ID,
      }),
    ).toThrow(RangeError);
  });

  // 15-17: ESC/POS 42-Column Thermal Receipt Renderer
  it('15. renders a valid 42-column ESC/POS thermal receipt with VietQR ref and modifiers', () => {
    const text = buildEscPosThermalReceiptText({
      store_name: 'CF19 QUAN 1 - TRUNG TAM',
      store_address: '19 Tran Phu, Thi Tran',
      order_code: 'POS-S01-20261122-001',
      created_at: '2026-11-22T09:15:00.000Z',
      cashier_name: 'Vo Ngoc Linh',
      payment_method: 'VIETQR',
      payment_status: 'PENDING',
      vietqr_ref_code: 'CF19STORE01ABCD1234',
      total_amount_vnd: 78000,
      lines: [
        {
          product_name: 'Ca Phe Sua Da',
          size_code: 'M',
          modifier_names: ['It duong 50%', 'Them 1 Shot'],
          quantity: 2,
          unit_price_vnd: 39000,
          line_total_vnd: 78000,
          notes: 'It da',
        },
      ],
    });

    const receiptLines = text.split('\n');
    expect(receiptLines.length).toBeGreaterThanOrEqual(12);
    for (const rLine of receiptLines) {
      expect(rLine.length).toBeLessThanOrEqual(ESC_POS_RECEIPT_WIDTH);
    }
    expect(text).toContain('POS-S01-20261122-001');
    expect(text).toContain('CF19STORE01ABCD1234');
    expect(text).toContain('78,000d');
    expect(text).toContain('VIETQR');
  });

  it('16. omits Ma VietQR line on CASH receipts', () => {
    const text = buildEscPosThermalReceiptText({
      store_name: 'CF19 QUAN 1',
      order_code: 'POS-S01-CASH-01',
      created_at: '2026-11-22T10:00:00.000Z',
      cashier_name: 'Vo Ngoc Linh',
      payment_method: 'CASH',
      payment_status: 'PAID',
      vietqr_ref_code: null,
      total_amount_vnd: 25000,
      lines: [
        {
          product_name: 'Ca Phe Den Da',
          size_code: 'M',
          modifier_names: [],
          quantity: 1,
          unit_price_vnd: 25000,
          line_total_vnd: 25000,
        },
      ],
    });
    expect(text).not.toContain('Ma VietQR:');
    expect(text).toContain('CASH');
    expect(text).toContain('PAID');
  });

  // 17-22: M4 Zod Schemas
  it('17. validates SubmitPosOrderSchema with optional client_order_code', () => {
    const parsed = SubmitPosOrderSchema.parse({
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'VIETQR',
      client_order_code: 'POS-S01-OFFLINE-001',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 2,
        },
      ],
    });
    expect(parsed.items[0]?.modifier_ids).toEqual([]);
    expect(parsed.client_order_code).toBe('POS-S01-OFFLINE-001');
  });

  it('18. rejects SubmitPosOrderSchema with empty items or lowercase client_order_code', () => {
    expect(
      SubmitPosOrderSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [],
      }).success,
    ).toBe(false);

    expect(
      SubmitPosOrderSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        client_order_code: 'bad lower code',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            quantity: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('19. validates OfflinePosBatchSyncSchema requiring unique uppercase client_order_code per offline order', () => {
    const ok = OfflinePosBatchSyncSchema.safeParse({
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      orders: [
        {
          client_order_code: 'POS-S01-OFF-001',
          payment_method: 'CASH',
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheDenDa,
              variant_id: SEED_IDS.menuVariants.caPheDenDaM,
              quantity: 1,
            },
          ],
        },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it('20. rejects OfflinePosBatchSyncSchema with empty orders array or missing client_order_code', () => {
    expect(
      OfflinePosBatchSyncSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        orders: [],
      }).success,
    ).toBe(false);

    expect(
      OfflinePosBatchSyncSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        orders: [
          {
            payment_method: 'CASH',
            items: [
              {
                product_id: SEED_IDS.menuProducts.caPheDenDa,
                variant_id: SEED_IDS.menuVariants.caPheDenDaM,
                quantity: 1,
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('21. validates PosOrdersFilterQuerySchema with enum filters and default limit = 50', () => {
    const parsed = PosOrdersFilterQuerySchema.parse({
      payment_status: 'PAID',
      kds_status: 'QUEUED',
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.payment_status).toBe('PAID');
  });

  it('22. rejects PosOrdersFilterQuerySchema with invalid payment_status or out-of-range limit', () => {
    expect(
      PosOrdersFilterQuerySchema.safeParse({ payment_status: 'REFUNDED' }).success,
    ).toBe(false);
    expect(
      PosOrdersFilterQuerySchema.safeParse({ limit: 500 }).success,
    ).toBe(false);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 2 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M4.1 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\packages\shared\src\utils\posBomAndReceiptMath.ts','C:\bib\cf_19\packages\shared\src\__tests__\pos-catalog-m4.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
