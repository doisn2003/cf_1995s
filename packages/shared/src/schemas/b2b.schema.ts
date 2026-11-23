import { z } from 'zod';
import { PAYMENT_METHODS, TRANSFER_STATUSES } from '../enums.js';
import {
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
  VndPositiveSchema,
} from './auth.schema.js';

const UpperCodeSchema = z
  .string()
  .trim()
  .min(3, 'Code must be at least 3 characters')
  .max(64, 'Code must be at most 64 characters')
  .regex(
    /^[A-Z0-9_-]+$/,
    'Code must contain only uppercase letters, digits, underscores, or hyphens',
  );

export const B2bPriceQuoteQuerySchema = z.object({
  customer_id: UuidSchema,
  item_id: UuidSchema,
  quantity_base_unit: z.coerce
    .number({ invalid_type_error: 'quantity_base_unit must be a number' })
    .finite()
    .positive('quantity_base_unit must be strictly positive'),
});

export const B2bOrderItemInputSchema = z.object({
  item_id: UuidSchema,
  quantity_base_unit: QtyPositiveSchema,
});

export const CreateB2bOrderSchema = z.object({
  warehouse_store_id: UuidSchema,
  customer_id: UuidSchema,
  order_code: UpperCodeSchema.optional(),
  payment_method: z.enum(PAYMENT_METHODS).default('VIETQR'),
  paid_amount_vnd: VndNonNegativeSchema.default(0),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(B2bOrderItemInputSchema)
    .min(1, 'B2B order must contain at least 1 item'),
});

export const RecordB2bDebtPaymentSchema = z.object({
  warehouse_store_id: UuidSchema,
  customer_id: UuidSchema,
  payment_amount_vnd: VndPositiveSchema,
  reference_note: z.string().trim().min(3).max(500).optional(),
});

export const TransferFilterQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  status: z.enum(TRANSFER_STATUSES).optional(),
});

export const DispatchInternalTransferFifoSchema = z.object({
  transfer_id: UuidSchema,
  notes: z.string().trim().max(500).optional(),
});
