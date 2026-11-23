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
