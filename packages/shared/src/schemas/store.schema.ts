import { z } from 'zod';
import {
  BASE_UNITS,
  INVENTORY_CATEGORIES,
  STORE_TYPES,
} from '../enums.js';
import {
  QtyNonNegativeSchema,
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
} from './auth.schema.js';

export const StoreIdParamSchema = z.object({
  storeId: UuidSchema,
});

export type StoreIdParam = z.infer<typeof StoreIdParamSchema>;

export const CreateStoreSchema = z.object({
  organization_id: UuidSchema,
  code: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Store code must contain only uppercase letters, digits, underscores, or hyphens'),
  name: z.string().trim().min(2).max(120),
  type: z.enum(STORE_TYPES),
  address: z.string().trim().min(5).max(255),
  phone: z.string().trim().min(8).max(20).optional(),
  price_multiplier: z.number().finite().positive().max(10).default(1),
});

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;

export const CreateInventoryItemSchema = z.object({
  organization_id: UuidSchema,
  sku: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, 'SKU must contain only uppercase letters, digits, underscores, or hyphens'),
  name: z.string().trim().min(2).max(150),
  category: z.enum(INVENTORY_CATEGORIES),
  base_unit: z.enum(BASE_UNITS),
  min_stock_threshold: QtyNonNegativeSchema.default(0),
  moving_avg_cost_vnd: VndNonNegativeSchema.default(0),
  internal_transfer_price_vnd: VndNonNegativeSchema.default(0),
  retail_price_vnd: VndNonNegativeSchema.default(0),
});

export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;

export const WarehouseLotCreateSchema = z
  .object({
    store_id: UuidSchema,
    item_id: UuidSchema,
    lot_code: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[A-Z0-9_-]+$/, 'Lot code must contain only uppercase letters, digits, underscores, or hyphens'),
    supplier_name: z.string().trim().min(2).max(150).optional(),
    moisture_pct: z.number().finite().min(0).max(100).optional(),
    roast_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'roast_date must be YYYY-MM-DD').optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expiry_date must be YYYY-MM-DD').optional(),
    initial_qty: QtyPositiveSchema,
    unit_cost_vnd: VndNonNegativeSchema,
    shipping_cost_vnd: VndNonNegativeSchema.default(0),
  })
  .refine(
    (data) => !data.roast_date || !data.expiry_date || data.expiry_date >= data.roast_date,
    {
      message: 'expiry_date must be on or after roast_date',
      path: ['expiry_date'],
    },
  );

export type WarehouseLotCreateInput = z.infer<typeof WarehouseLotCreateSchema>;
