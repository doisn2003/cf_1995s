import { z } from 'zod';
import { PAYMENT_METHODS } from '../enums.js';
import {
  ManagerPinSchema,
  QtyNonNegativeSchema,
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
} from './auth.schema.js';

export const InternalTransferItemRequestSchema = z.object({
  item_id: UuidSchema,
  requested_qty: QtyPositiveSchema,
});

export type InternalTransferItemRequest = z.infer<typeof InternalTransferItemRequestSchema>;

export const CreateInternalTransferRequestSchema = z
  .object({
    from_warehouse_id: UuidSchema,
    to_store_id: UuidSchema,
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(InternalTransferItemRequestSchema)
      .min(1, 'Internal transfer must contain at least 1 item'),
  })
  .refine((data) => data.from_warehouse_id !== data.to_store_id, {
    message: 'Source warehouse and destination store must be different',
    path: ['to_store_id'],
  });

export type CreateInternalTransferRequest = z.infer<typeof CreateInternalTransferRequestSchema>;

export const DispatchInternalTransferSchema = z.object({
  transfer_id: UuidSchema,
  items: z
    .array(
      z.object({
        transfer_item_id: UuidSchema,
        source_lot_id: UuidSchema,
        dispatched_qty: QtyPositiveSchema,
      }),
    )
    .min(1, 'Dispatch must allocate at least 1 item'),
  notes: z.string().trim().max(500).optional(),
});

export type DispatchInternalTransferInput = z.infer<typeof DispatchInternalTransferSchema>;

export const ReconcileInternalTransferSchema = z.object({
  transfer_id: UuidSchema,
  items: z
    .array(
      z.object({
        transfer_item_id: UuidSchema,
        received_qty: QtyNonNegativeSchema,
      }),
    )
    .min(1, 'Reconciliation must confirm at least 1 item')
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export type ReconcileInternalTransferInput = z.infer<typeof ReconcileInternalTransferSchema>;

export const PosOrderItemInputSchema = z.object({
  product_id: UuidSchema,
  variant_id: UuidSchema,
  modifier_ids: z.array(UuidSchema).default([]),
  quantity: z
    .number({ invalid_type_error: 'Item quantity must be a number' })
    .int('Item quantity must be an integer')
    .positive('Item quantity must be greater than zero')
    .max(500),
  notes: z.string().trim().max(250).optional(),
});

export type PosOrderItemInput = z.infer<typeof PosOrderItemInputSchema>;

export const CreatePosOrderSchema = z.object({
  store_id: UuidSchema,
  shift_id: UuidSchema,
  payment_method: z.enum(PAYMENT_METHODS),
  customer_phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Invalid phone format')
    .optional(),
  items: z
    .array(PosOrderItemInputSchema)
    .min(1, 'POS order must contain at least 1 item'),
});

export type CreatePosOrderInput = z.infer<typeof CreatePosOrderSchema>;

export const VoidPosOrderSchema = z.object({
  order_id: UuidSchema,
  store_id: UuidSchema,
  manager_id: UuidSchema,
  manager_pin: ManagerPinSchema,
  void_reason: z.string().trim().min(3, 'Void reason must be at least 3 characters').max(500),
});

export type VoidPosOrderInput = z.infer<typeof VoidPosOrderSchema>;

export const OpenShiftSchema = z.object({
  store_id: UuidSchema,
  opening_cash_vnd: VndNonNegativeSchema,
  notes: z.string().trim().max(500).optional(),
});

export type OpenShiftInput = z.infer<typeof OpenShiftSchema>;

export const BlindCloseShiftSchema = z.object({
  shift_id: UuidSchema,
  store_id: UuidSchema,
  blind_counted_cash_vnd: VndNonNegativeSchema,
  notes: z.string().trim().max(500).optional(),
});

export type BlindCloseShiftInput = z.infer<typeof BlindCloseShiftSchema>;
