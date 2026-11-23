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
