/**
 * Confidential Central Warehouse cost fields that MUST NEVER be exposed
 * to STORE_MANAGER, CASHIER_STAFF, or BARISTA_KDS responses.
 */
export const SENSITIVE_COST_KEYS = [
  'moving_avg_cost_vnd',
  'unit_cost_vnd',
  'shipping_cost_vnd',
  'raw_import_cost',
  'raw_import_cost_vnd',
  'cogs_amount_vnd',
] as const;

export type SensitiveCostKey = (typeof SENSITIVE_COST_KEYS)[number];

/**
 * Financial & revenue fields that MUST NEVER be exposed to BARISTA_KDS.
 */
export const KDS_FORBIDDEN_FINANCE_KEYS = [
  'total_amount_vnd',
  'cogs_amount_vnd',
  'unit_price_vnd',
  'line_total_vnd',
  'payment_method',
  'vietqr_ref_code',
  'opening_cash_vnd',
  'blind_counted_cash_vnd',
  'system_expected_cash_vnd',
  'variance_cash_vnd',
] as const;

export type KdsForbiddenFinanceKey = (typeof KDS_FORBIDDEN_FINANCE_KEYS)[number];

/**
 * Blind Shift Close theoretical cash fields that MUST remain hidden
 * from CASHIER_STAFF while shift status is OPEN.
 */
export const BLIND_SHIFT_HIDDEN_KEYS = [
  'system_expected_cash_vnd',
  'variance_cash_vnd',
] as const;

export type BlindShiftHiddenKey = (typeof BLIND_SHIFT_HIDDEN_KEYS)[number];
