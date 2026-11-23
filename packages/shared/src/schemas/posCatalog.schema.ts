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
