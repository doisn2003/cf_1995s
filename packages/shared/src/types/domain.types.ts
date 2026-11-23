import type {
  B2bLedgerEntryType,
  B2bPriceTier,
  BaseUnit,
  EmploymentType,
  InventoryCategory,
  KdsStatus,
  LotStatus,
  MenuSizeCode,
  ModifierGroup,
  PaymentMethod,
  PaymentStatus,
  ShiftStatus,
  StoreType,
  TransferStatus,
  UserRole,
} from '../enums.js';

export interface OrganizationDto {
  id: string;
  code: string;
  name: string;
  tax_code: string | null;
  base_currency: 'VND';
  franchise_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreDto {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: StoreType;
  address: string;
  phone: string | null;
  price_multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUserDto {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  assigned_store_id: string | null;
  hourly_rate_vnd: number;
  employment_type: EmploymentType;
  has_manager_pin: boolean;
  is_active: boolean;
}

export interface AuditLogDto {
  id: string;
  actor_id: string;
  store_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  reason: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
}

/**
 * Full Inventory Item DTO (ONLY for SUPER_ADMIN & WAREHOUSE_MANAGER).
 * Includes confidential Central Warehouse moving_avg_cost_vnd.
 */
export interface WarehouseInventoryItemDto {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  base_unit: BaseUnit;
  min_stock_threshold: number;
  moving_avg_cost_vnd: number;
  internal_transfer_price_vnd: number;
  retail_price_vnd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Store-Safe Inventory Item DTO (for STORE_MANAGER, CASHIER_STAFF, BARISTA_KDS).
 * Strictly omits moving_avg_cost_vnd.
 */
export type StoreSafeInventoryItemDto = Omit<
  WarehouseInventoryItemDto,
  'moving_avg_cost_vnd'
>;

/**
 * Full Warehouse Lot DTO (ONLY for SUPER_ADMIN & WAREHOUSE_MANAGER).
 * Includes confidential Central Warehouse unit_cost_vnd & shipping_cost_vnd.
 */
export interface WarehouseLotFullDto {
  id: string;
  store_id: string;
  item_id: string;
  lot_code: string;
  supplier_name: string | null;
  moisture_pct: number | null;
  roast_date: string | null;
  received_at: string;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  unit_cost_vnd: number;
  shipping_cost_vnd: number;
  status: LotStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Store-Safe Lot DTO (for STORE_MANAGER, CASHIER_STAFF, BARISTA_KDS).
 * Strictly omits confidential origin cost columns.
 */
export type StoreSafeWarehouseLotDto = Omit<
  WarehouseLotFullDto,
  'unit_cost_vnd' | 'shipping_cost_vnd'
>;

export interface RoastBatchDto {
  id: string;
  warehouse_store_id: string;
  batch_code: string;
  source_green_lot_id: string;
  output_lot_id: string | null;
  green_input_weight_g: number;
  roasted_output_weight_g: number;
  weight_loss_pct: number;
  roast_profile: string | null;
  roasted_by: string;
  roasted_at: string;
  notes: string | null;
}

export interface InternalTransferItemDto {
  id: string;
  transfer_id: string;
  item_id: string;
  source_lot_id: string | null;
  destination_lot_id: string | null;
  requested_qty: number;
  dispatched_qty: number;
  received_qty: number;
  internal_unit_price_vnd: number;
  line_total_vnd: number;
}

export interface InternalTransferDto {
  id: string;
  transfer_code: string;
  from_warehouse_id: string;
  to_store_id: string;
  status: TransferStatus;
  total_internal_value_vnd: number;
  requested_by: string;
  dispatched_by: string | null;
  received_by: string | null;
  requested_at: string;
  dispatched_at: string | null;
  received_at: string | null;
  notes: string | null;
  items?: InternalTransferItemDto[];
}

export interface B2bCustomerDto {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string | null;
  price_tier: B2bPriceTier;
  credit_limit_vnd: number;
  current_debt_vnd: number;
  payment_term_days: number;
  is_active: boolean;
}

export interface B2bPriceTierDto {
  id: string;
  item_id: string;
  price_tier: B2bPriceTier;
  min_qty_kg: number;
  unit_price_vnd: number;
}

export interface B2bDebtLedgerEntryDto {
  id: string;
  customer_id: string;
  b2b_order_id: string | null;
  entry_type: B2bLedgerEntryType;
  amount_vnd: number;
  balance_after_vnd: number;
  recorded_by: string;
  reference_note: string | null;
  created_at: string;
}

export interface MenuVariantDto {
  id: string;
  product_id: string;
  size_code: MenuSizeCode;
  name: string;
  price_delta_vnd: number;
  is_default: boolean;
  is_active: boolean;
}

export interface MenuModifierDto {
  id: string;
  organization_id: string;
  code: string;
  modifier_group: ModifierGroup;
  name: string;
  price_delta_vnd: number;
  inventory_item_id: string | null;
  bom_qty_base_unit: number;
  is_active: boolean;
}

export interface MenuProductDto {
  id: string;
  organization_id: string;
  category_id: string;
  code: string;
  name: string;
  base_price_vnd: number;
  is_active: boolean;
  variants?: MenuVariantDto[];
}

/**
 * Full POS Shift DTO (for SUPER_ADMIN & STORE_MANAGER, or CLOSED shift after blind close).
 */
export interface PosShiftFullDto {
  id: string;
  store_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash_vnd: number;
  blind_counted_cash_vnd: number | null;
  system_expected_cash_vnd: number | null;
  variance_cash_vnd: number | null;
  status: ShiftStatus;
  notes: string | null;
}

/**
 * Cashier Open-Shift DTO (Blind Shift Close protection).
 * Strictly hides system_expected_cash_vnd and variance_cash_vnd while OPEN.
 */
export type CashierOpenShiftDto = Omit<
  PosShiftFullDto,
  'system_expected_cash_vnd' | 'variance_cash_vnd'
>;

export interface PosOrderItemDto {
  id: string;
  order_id: string;
  store_id: string;
  product_id: string;
  variant_id: string;
  modifiers_json: Array<{ id: string; name: string; price_delta_vnd: number }>;
  quantity: number;
  unit_price_vnd: number;
  line_total_vnd: number;
  notes: string | null;
  created_at: string;
}

export interface PosOrderFullDto {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  cashier_id: string;
  customer_phone: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  kds_status: KdsStatus;
  vietqr_ref_code: string | null;
  total_amount_vnd: number;
  cogs_amount_vnd: number;
  bom_deducted_at: string | null;
  void_approved_by_manager_id: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  items?: PosOrderItemDto[];
}

/**
 * KDS-Safe Order Item DTO (for BARISTA_KDS).
 * Strictly omits unit_price_vnd and line_total_vnd.
 */
export interface KdsSafeOrderItemDto {
  id: string;
  order_id: string;
  store_id: string;
  product_id: string;
  variant_id: string;
  modifiers_json: Array<{ id: string; name: string }>;
  quantity: number;
  notes: string | null;
  created_at: string;
}

/**
 * KDS-Safe Order Ticket DTO (for BARISTA_KDS).
 * Strictly omits total_amount_vnd, cogs_amount_vnd, payment_method, vietqr_ref_code.
 */
export interface KdsSafeOrderTicketDto {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  kds_status: KdsStatus;
  payment_status: PaymentStatus;
  bom_deducted_at: string | null;
  created_at: string;
  updated_at: string;
  items?: KdsSafeOrderItemDto[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}
