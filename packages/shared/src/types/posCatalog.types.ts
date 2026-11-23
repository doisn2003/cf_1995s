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
