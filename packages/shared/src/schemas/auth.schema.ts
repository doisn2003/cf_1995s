import { z } from 'zod';

/**
 * Strict reusable primitives for CF_19 Domain Invariants:
 * - Currency (VND): Non-negative safe integer (no floats, no negatives)
 * - Inventory/BOM Quantities: Positive or non-negative finite decimals (up to 2dp)
 */
export const UuidSchema = z.string().uuid('Invalid UUID format');

export const VndNonNegativeSchema = z
  .number({ invalid_type_error: 'VND amount must be a number' })
  .int('VND amount must be an integer (no decimals)')
  .nonnegative('VND amount cannot be negative')
  .max(999_999_999_999, 'VND amount exceeds safe limit');

export const VndPositiveSchema = z
  .number({ invalid_type_error: 'VND amount must be a number' })
  .int('VND amount must be an integer (no decimals)')
  .positive('VND amount must be greater than zero')
  .max(999_999_999_999, 'VND amount exceeds safe limit');

export const QtyPositiveSchema = z
  .number({ invalid_type_error: 'Quantity must be a number' })
  .finite('Quantity must be finite')
  .positive('Quantity must be greater than zero')
  .max(9_999_999_999.99, 'Quantity exceeds NUMERIC(12,2) limit');

export const QtyNonNegativeSchema = z
  .number({ invalid_type_error: 'Quantity must be a number' })
  .finite('Quantity must be finite')
  .nonnegative('Quantity cannot be negative')
  .max(9_999_999_999.99, 'Quantity exceeds NUMERIC(12,2) limit');

export const ManagerPinSchema = z
  .string()
  .regex(/^\d{6}$/, 'Manager PIN must be exactly 6 numeric digits');

export const LoginRequestSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const ManagerPinApprovalSchema = z.object({
  manager_id: UuidSchema,
  store_id: UuidSchema,
  pin: ManagerPinSchema,
  action: z.string().trim().min(3, 'Action must be at least 3 characters').max(80),
  target_table: z.string().trim().min(2).max(64),
  target_id: UuidSchema.optional(),
  reason: z.string().trim().min(3, 'Approval reason must be at least 3 characters').max(500),
});

export type ManagerPinApprovalRequest = z.infer<typeof ManagerPinApprovalSchema>;

export const AuditLogQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  actor_id: UuidSchema.optional(),
  action: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
