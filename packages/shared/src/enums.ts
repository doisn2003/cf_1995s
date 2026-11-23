export const USER_ROLES = [
  'SUPER_ADMIN',
  'WAREHOUSE_MANAGER',
  'STORE_MANAGER',
  'CASHIER_STAFF',
  'BARISTA_KDS',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STORE_LEVEL_ROLES = [
  'STORE_MANAGER',
  'CASHIER_STAFF',
  'BARISTA_KDS',
] as const;
export type StoreLevelRole = (typeof STORE_LEVEL_ROLES)[number];

export const COST_PRIVILEGED_ROLES = [
  'SUPER_ADMIN',
  'WAREHOUSE_MANAGER',
] as const;
export type CostPrivilegedRole = (typeof COST_PRIVILEGED_ROLES)[number];

export const PIN_APPROVER_ROLES = [
  'SUPER_ADMIN',
  'STORE_MANAGER',
] as const;
export type PinApproverRole = (typeof PIN_APPROVER_ROLES)[number];

export const STORE_TYPES = [
  'CENTRAL_WAREHOUSE',
  'RETAIL_STORE',
  'FRANCHISE_STORE',
] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const INVENTORY_CATEGORIES = [
  'GREEN_BEAN',
  'ROASTED_COFFEE',
  'INGREDIENT',
  'PACKAGING',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const BASE_UNITS = ['g', 'ml', 'pcs'] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

export const LOT_STATUSES = ['AVAILABLE', 'DEPLETED', 'EXPIRED'] as const;
export type LotStatus = (typeof LOT_STATUSES)[number];

export const TRANSFER_STATUSES = [
  'REQUESTED',
  'IN_TRANSIT',
  'RECONCILED',
  'CANCELLED',
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const B2B_PRICE_TIERS = ['TIER_1', 'TIER_2', 'TIER_3'] as const;
export type B2bPriceTier = (typeof B2B_PRICE_TIERS)[number];

export const SHIFT_STATUSES = ['OPEN', 'CLOSED'] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'VIETQR'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'VOIDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const KDS_STATUSES = ['QUEUED', 'PREPARING', 'COMPLETED'] as const;
export type KdsStatus = (typeof KDS_STATUSES)[number];

export const MENU_SIZE_CODES = ['S', 'M', 'L'] as const;
export type MenuSizeCode = (typeof MENU_SIZE_CODES)[number];

export const MODIFIER_GROUPS = ['SUGAR', 'ICE', 'TOPPING'] as const;
export type ModifierGroup = (typeof MODIFIER_GROUPS)[number];

export const B2B_LEDGER_ENTRY_TYPES = [
  'DEBIT_INVOICE',
  'CREDIT_PAYMENT',
  'ADJUSTMENT',
] as const;
export type B2bLedgerEntryType = (typeof B2B_LEDGER_ENTRY_TYPES)[number];
