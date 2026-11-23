import { z } from 'zod';
import { UuidSchema, VndPositiveSchema } from './auth.schema.js';

export const BankBinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'NAPAS bank BIN must be exactly 6 numeric digits');

export const BankAccountNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4,32}$/, 'Bank account number must be 4-32 alphanumeric characters');

export const VietQrBankAccountConfigSchema = z.object({
  bank_bin: BankBinSchema,
  bank_short_name: z.string().trim().min(2).max(32),
  account_number: BankAccountNumberSchema,
  account_name: z.string().trim().min(2).max(60),
  merchant_city: z.string().trim().min(2).max(40).default('BUON MA THUOT'),
});

export type VietQrBankAccountConfigInput = z.infer<typeof VietQrBankAccountConfigSchema>;

export const GenerateOrderVietQrSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  bank_bin: BankBinSchema.optional(),
  account_number: BankAccountNumberSchema.optional(),
  account_name: z.string().trim().min(2).max(60).optional(),
  merchant_city: z.string().trim().min(2).max(40).optional(),
});

export type GenerateOrderVietQrInput = z.infer<typeof GenerateOrderVietQrSchema>;

export const VietQrBankingWebhookPayloadSchema = z.object({
  idempotency_key: z
    .string()
    .trim()
    .min(4, 'idempotency_key must be at least 4 characters')
    .max(128, 'idempotency_key must not exceed 128 characters'),
  bank_tx_id: z
    .string()
    .trim()
    .min(3, 'bank_tx_id must be at least 3 characters')
    .max(128, 'bank_tx_id must not exceed 128 characters'),
  amount_vnd: VndPositiveSchema,
  transfer_content: z
    .string()
    .trim()
    .min(3, 'transfer_content must be at least 3 characters')
    .max(500, 'transfer_content must not exceed 500 characters'),
  order_id: UuidSchema.optional(),
  vietqr_ref_code: z
    .string()
    .trim()
    .min(4, 'vietqr_ref_code must be at least 4 characters')
    .max(64, 'vietqr_ref_code must not exceed 64 characters')
    .optional(),
  bank_bin: BankBinSchema.optional(),
  account_number: BankAccountNumberSchema.optional(),
  webhook_signature: z.string().trim().min(8).max(256).optional(),
  occurred_at: z.string().datetime().optional(),
});

export type VietQrBankingWebhookPayloadInput = z.infer<
  typeof VietQrBankingWebhookPayloadSchema
>;

export const SimulateVietQrWebhookSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  amount_vnd: VndPositiveSchema.optional(),
  idempotency_key: z.string().trim().min(4).max(128).optional(),
  bank_tx_id: z.string().trim().min(3).max(128).optional(),
  transfer_content: z.string().trim().min(3).max(500).optional(),
  simulate_duplicate: z.boolean().optional().default(false),
});

export type SimulateVietQrWebhookInput = z.infer<typeof SimulateVietQrWebhookSchema>;

export const WebhookLogQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  order_id: UuidSchema.optional(),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(200, 'limit must not exceed 200')
    .default(50),
});

export type WebhookLogQueryInput = z.infer<typeof WebhookLogQuerySchema>;
