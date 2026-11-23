import { z } from 'zod';
import { LOT_STATUSES } from '../enums.js';
import {
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
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

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const IngestWarehouseLotSchema = z
  .object({
    warehouse_store_id: UuidSchema,
    item_id: UuidSchema,
    lot_code: UpperCodeSchema,
    supplier_name: z.string().trim().min(2).max(150).optional(),
    moisture_pct: z.number().finite().min(0).max(100).optional(),
    roast_date: IsoDateSchema.optional(),
    expiry_date: IsoDateSchema.optional(),
    initial_qty: QtyPositiveSchema,
    unit_cost_vnd: VndNonNegativeSchema,
    shipping_cost_vnd: VndNonNegativeSchema.default(0),
  })
  .refine(
    (data) =>
      !data.roast_date || !data.expiry_date || data.expiry_date >= data.roast_date,
    {
      message: 'expiry_date must be on or after roast_date',
      path: ['expiry_date'],
    },
  );

export const CompleteRoastBatchSchema = z
  .object({
    warehouse_store_id: UuidSchema,
    batch_code: UpperCodeSchema,
    source_green_lot_id: UuidSchema,
    output_item_id: UuidSchema,
    output_lot_code: UpperCodeSchema,
    green_input_weight_g: QtyPositiveSchema,
    roasted_output_weight_g: QtyPositiveSchema,
    roast_date: IsoDateSchema.optional(),
    expiry_date: IsoDateSchema.optional(),
    roast_profile: z.string().trim().max(120).optional(),
    moisture_pct: z.number().finite().min(0).max(100).optional(),
    notes: z.string().trim().max(500).optional(),
    enforce_fifo: z.boolean().default(true),
  })
  .refine(
    (data) => data.roasted_output_weight_g <= data.green_input_weight_g,
    {
      message: 'roasted_output_weight_g cannot exceed green_input_weight_g',
      path: ['roasted_output_weight_g'],
    },
  )
  .refine(
    (data) =>
      !data.roast_date || !data.expiry_date || data.expiry_date >= data.roast_date,
    {
      message: 'expiry_date must be on or after roast_date',
      path: ['expiry_date'],
    },
  );

export const FifoAllocationRequestSchema = z.object({
  warehouse_store_id: UuidSchema,
  item_id: UuidSchema,
  requested_qty: QtyPositiveSchema,
  reference_code: z.string().trim().min(2).max(64).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const WarehouseLotQuerySchema = z.object({
  warehouse_store_id: UuidSchema.optional(),
  item_id: UuidSchema.optional(),
  status: z.enum(LOT_STATUSES).optional(),
  only_available: z.coerce.boolean().optional(),
});
