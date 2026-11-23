import { z } from 'zod';
import { KDS_STATUSES } from '../enums.js';
import {
  QtyNonNegativeSchema,
  UuidSchema,
  VndNonNegativeSchema,
} from './auth.schema.js';

export const BARISTA_ALERT_SEVERITIES = ['LOW', 'OUT_OF_STOCK'] as const;
export type BaristaAlertSeverity = (typeof BARISTA_ALERT_SEVERITIES)[number];

export const AdvanceKdsTicketStatusSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  target_status: z.enum(KDS_STATUSES),
  allow_partial_on_shortage: z.boolean().optional().default(false),
});

export type AdvanceKdsTicketStatusInput = z.infer<typeof AdvanceKdsTicketStatusSchema>;

export const CompleteKdsBomDeductionSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  allow_partial_on_shortage: z.boolean().optional().default(false),
});

export type CompleteKdsBomDeductionInput = z.infer<
  typeof CompleteKdsBomDeductionSchema
>;

export const ReportBaristaLowStockAlertSchema = z.object({
  store_id: UuidSchema,
  inventory_item_id: UuidSchema,
  severity: z.enum(BARISTA_ALERT_SEVERITIES).default('OUT_OF_STOCK'),
  note: z.string().trim().min(2, 'Alert note must be at least 2 characters').max(300),
});

export type ReportBaristaLowStockAlertInput = z.infer<
  typeof ReportBaristaLowStockAlertSchema
>;

export const BlindClosePosShiftRequestSchema = z.object({
  store_id: UuidSchema,
  shift_id: UuidSchema,
  blind_counted_cash_vnd: VndNonNegativeSchema,
  notes: z.string().trim().max(500).optional(),
});

export type BlindClosePosShiftRequestInput = z.infer<
  typeof BlindClosePosShiftRequestSchema
>;

export const StoreDailyStocktakeEntrySchema = z.object({
  inventory_item_id: UuidSchema,
  opening_qty: QtyNonNegativeSchema,
  received_in_qty: QtyNonNegativeSchema.default(0),
  bom_consumed_qty: QtyNonNegativeSchema.default(0),
  actual_counted_qty: QtyNonNegativeSchema,
  notes: z.string().trim().max(300).optional(),
});

export type StoreDailyStocktakeEntryInput = z.infer<
  typeof StoreDailyStocktakeEntrySchema
>;

export const SubmitStoreDailyStocktakeSchema = z.object({
  store_id: UuidSchema,
  stocktake_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'stocktake_date must be YYYY-MM-DD'),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(StoreDailyStocktakeEntrySchema)
    .min(1, 'Daily stocktake must include at least 1 inventory item')
    .max(200),
});

export type SubmitStoreDailyStocktakeInput = z.infer<
  typeof SubmitStoreDailyStocktakeSchema
>;

export const KdsQueueQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  include_completed: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1)
    .max(200)
    .default(50),
});

export type KdsQueueQueryInput = z.infer<typeof KdsQueueQuerySchema>;
