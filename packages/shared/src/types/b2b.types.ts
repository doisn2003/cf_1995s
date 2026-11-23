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
