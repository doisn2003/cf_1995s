import { z } from 'zod';
import { QtyPositiveSchema, VndNonNegativeSchema } from './auth.schema.js';

export const CLONABLE_STORE_TYPES = ['RETAIL_STORE', 'FRANCHISE_STORE'] as const;
export type ClonableStoreType = (typeof CLONABLE_STORE_TYPES)[number];

const IsoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD');

export const ExecutivePnlQuerySchema = z
  .object({
    period_from: IsoDateStringSchema.optional(),
    period_to: IsoDateStringSchema.optional(),
    warehouse_operating_expense_vnd: z.coerce
      .number()
      .int('warehouse_operating_expense_vnd must be an integer')
      .min(0, 'warehouse_operating_expense_vnd must be non-negative')
      .default(0),
    franchise_royalty_pct: z.coerce
      .number()
      .finite()
      .min(0, 'franchise_royalty_pct must be >= 0')
      .max(50, 'franchise_royalty_pct must be <= 50')
      .default(5.0),
  })
  .refine(
    (data) =>
      !data.period_from ||
      !data.period_to ||
      data.period_to >= data.period_from,
    {
      message: 'period_to must be on or after period_from',
      path: ['period_to'],
    },
  );

export type ExecutivePnlQueryInput = z.infer<typeof ExecutivePnlQuerySchema>;

export const PreviewFranchisePricingSchema = z.object({
  price_multiplier: z.coerce
    .number({ invalid_type_error: 'price_multiplier must be a number' })
    .finite()
    .min(0.5, 'price_multiplier must be at least 0.50')
    .max(3.0, 'price_multiplier must not exceed 3.00'),
});

export type PreviewFranchisePricingInput = z.infer<
  typeof PreviewFranchisePricingSchema
>;

export const CloneFranchiseStoreSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Store code must be at least 3 characters')
    .max(32, 'Store code must not exceed 32 characters')
    .regex(
      /^[A-Z0-9_-]+$/,
      'Store code must contain only uppercase letters, digits, underscores, or hyphens',
    ),
  name: z.string().trim().min(2, 'Store name must be at least 2 characters').max(120),
  type: z.enum(CLONABLE_STORE_TYPES).default('FRANCHISE_STORE'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Invalid phone format')
    .optional(),
  price_multiplier: z
    .number({ invalid_type_error: 'price_multiplier must be a number' })
    .finite()
    .min(0.5, 'price_multiplier must be at least 0.50')
    .max(3.0, 'price_multiplier must not exceed 3.00')
    .default(1.0),
  opening_cash_vnd: VndNonNegativeSchema.default(2000000),
  create_starter_transfer: z.boolean().default(true),
  starter_coffee_qty_g: QtyPositiveSchema.default(10000),
  notes: z.string().trim().max(500).optional(),
});

export type CloneFranchiseStoreInput = z.infer<typeof CloneFranchiseStoreSchema>;
