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
