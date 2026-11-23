import { z } from 'zod';
import {
  B2B_PRICE_TIERS,
  BASE_UNITS,
  EMPLOYMENT_TYPES,
  INVENTORY_CATEGORIES,
  LOT_STATUSES,
  PAYMENT_METHODS,
  STORE_TYPES,
  USER_ROLES,
} from '../enums.js';
import {
  ManagerPinSchema,
  QtyNonNegativeSchema,
  QtyPositiveSchema,
  UuidSchema,
  VndNonNegativeSchema,
} from './auth.schema.js';

const UpperCodeSchema = z
  .string()
  .trim()
  .min(2, 'Mã phải có ít nhất 2 ký tự')
  .max(48, 'Mã tối đa 48 ký tự')
  .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới');

// ============================================================================
// 1. STORE CRUD SCHEMAS (M1)
// ============================================================================
export const UpdateStoreSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(4).max(255).optional(),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  price_multiplier: z.number().finite().min(0.5).max(3.0).optional(),
  is_active: z.boolean().optional(),
});
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;

// ============================================================================
// 2. USER / STAFF MANAGEMENT CRUD SCHEMAS (M1)
// ============================================================================
export const CreateUserSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(120),
    email: z.string().trim().email('Email không hợp lệ').max(160),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
    phone: z.string().trim().min(8).max(20).optional().nullable(),
    role: z.enum(USER_ROLES),
    assigned_store_id: UuidSchema.nullable().optional(),
    manager_pin: ManagerPinSchema.optional(),
    hourly_rate_vnd: VndNonNegativeSchema.default(30000),
    employment_type: z.enum(EMPLOYMENT_TYPES).default('FULL_TIME'),
  })
  .refine(
    (data) =>
      (data.role === 'SUPER_ADMIN' && !data.assigned_store_id) ||
      (data.role !== 'SUPER_ADMIN' && Boolean(data.assigned_store_id)),
    {
      message:
        'SUPER_ADMIN không gắn chi nhánh cố định; các vai trò còn lại bắt buộc gán đúng 1 chi nhánh',
      path: ['assigned_store_id'],
    },
  );
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(8).max(20).nullable().optional(),
    role: z.enum(USER_ROLES).optional(),
    assigned_store_id: UuidSchema.nullable().optional(),
    hourly_rate_vnd: VndNonNegativeSchema.optional(),
    employment_type: z.enum(EMPLOYMENT_TYPES).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.role === undefined) return true;
      if (data.role === 'SUPER_ADMIN') {
        return data.assigned_store_id === null || data.assigned_store_id === undefined;
      }
      return data.assigned_store_id !== null;
    },
    {
      message: 'Vai trò và chi nhánh phân công không hợp lệ',
      path: ['assigned_store_id'],
    },
  );
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const ResetUserPinSchema = z.object({
  pin: ManagerPinSchema,
});
export type ResetUserPinInput = z.infer<typeof ResetUserPinSchema>;

// ============================================================================
// 3. INVENTORY ITEM & LOT STATUS CRUD SCHEMAS (M2)
// ============================================================================
export const CreateWarehouseInventoryItemSchema = z.object({
  sku: UpperCodeSchema,
  name: z.string().trim().min(2).max(150),
  category: z.enum(INVENTORY_CATEGORIES),
  base_unit: z.enum(BASE_UNITS),
  min_stock_threshold: QtyNonNegativeSchema.default(0),
  moving_avg_cost_vnd: VndNonNegativeSchema.default(0),
  internal_transfer_price_vnd: VndNonNegativeSchema.default(0),
  retail_price_vnd: VndNonNegativeSchema.default(0),
});
export type CreateWarehouseInventoryItemInput = z.infer<
  typeof CreateWarehouseInventoryItemSchema
>;

export const UpdateWarehouseInventoryItemSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  min_stock_threshold: QtyNonNegativeSchema.optional(),
  moving_avg_cost_vnd: VndNonNegativeSchema.optional(),
  internal_transfer_price_vnd: VndNonNegativeSchema.optional(),
  retail_price_vnd: VndNonNegativeSchema.optional(),
  is_active: z.boolean().optional(),
});
export type UpdateWarehouseInventoryItemInput = z.infer<
  typeof UpdateWarehouseInventoryItemSchema
>;

export const UpdateLotStatusSchema = z.object({
  status: z.enum(LOT_STATUSES),
  reason: z.string().trim().min(3, 'Vui lòng nhập lý do thay đổi trạng thái lô').max(300),
});
export type UpdateLotStatusInput = z.infer<typeof UpdateLotStatusSchema>;

// ============================================================================
// 4. B2B CUSTOMER, PRICE TIER & B2C WAREHOUSE RETAIL SCHEMAS (M3)
// ============================================================================
export const CreateB2bCustomerSchema = z.object({
  code: UpperCodeSchema,
  name: z.string().trim().min(2).max(120),
  shop_name: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(8).max(20).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  price_tier: z.enum(B2B_PRICE_TIERS).default('TIER_1'),
  credit_limit_vnd: VndNonNegativeSchema.default(15000000),
  payment_term_days: z.number().int().min(0).max(120).default(7),
});
export type CreateB2bCustomerInput = z.infer<typeof CreateB2bCustomerSchema>;

export const UpdateB2bCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  shop_name: z.string().trim().min(2).max(150).optional(),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  price_tier: z.enum(B2B_PRICE_TIERS).optional(),
  credit_limit_vnd: VndNonNegativeSchema.optional(),
  payment_term_days: z.number().int().min(0).max(120).optional(),
  is_active: z.boolean().optional(),
});
export type UpdateB2bCustomerInput = z.infer<typeof UpdateB2bCustomerSchema>;

export const UpsertB2bPriceTierSchema = z.object({
  item_id: UuidSchema,
  price_tier: z.enum(B2B_PRICE_TIERS),
  min_qty_kg: z.number().finite().min(0).max(100000),
  unit_price_vnd: VndNonNegativeSchema,
  is_active: z.boolean().default(true),
});
export type UpsertB2bPriceTierInput = z.infer<typeof UpsertB2bPriceTierSchema>;

export const CreateB2cRetailOrderSchema = z.object({
  warehouse_store_id: UuidSchema,
  retail_customer_name: z.string().trim().min(2).max(120).default('Khách lẻ Kho Tổng'),
  retail_customer_phone: z.string().trim().max(20).optional(),
  payment_method: z.enum(PAYMENT_METHODS).default('CASH'),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        item_id: UuidSchema,
        quantity_base_unit: QtyPositiveSchema,
      }),
    )
    .min(1, 'Đơn bán lẻ phải có ít nhất 1 mặt hàng'),
});
export type CreateB2cRetailOrderInput = z.infer<typeof CreateB2cRetailOrderSchema>;

export const CancelInternalTransferSchema = z.object({
  reason: z.string().trim().min(3, 'Vui lòng nhập lý do hủy phiếu').max(300),
});
export type CancelInternalTransferInput = z.infer<typeof CancelInternalTransferSchema>;

// ============================================================================
// 5. MASTER MENU & BOM RECIPE CRUD SCHEMAS (M4)
// ============================================================================
export const CreateMenuCategorySchema = z.object({
  code: UpperCodeSchema,
  name: z.string().trim().min(2).max(100),
  sort_order: z.number().int().min(0).max(999).default(1),
});
export type CreateMenuCategoryInput = z.infer<typeof CreateMenuCategorySchema>;

export const UpdateMenuCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
});
export type UpdateMenuCategoryInput = z.infer<typeof UpdateMenuCategorySchema>;

export const CreateMenuProductSchema = z.object({
  category_id: UuidSchema,
  code: UpperCodeSchema,
  name: z.string().trim().min(2).max(150),
  base_price_vnd: VndNonNegativeSchema,
  create_default_variants: z.boolean().default(true),
  size_l_delta_vnd: VndNonNegativeSchema.default(6000),
});
export type CreateMenuProductInput = z.infer<typeof CreateMenuProductSchema>;

export const UpdateMenuProductSchema = z.object({
  category_id: UuidSchema.optional(),
  name: z.string().trim().min(2).max(150).optional(),
  base_price_vnd: VndNonNegativeSchema.optional(),
  is_active: z.boolean().optional(),
});
export type UpdateMenuProductInput = z.infer<typeof UpdateMenuProductSchema>;

export const UpsertMenuVariantSchema = z.object({
  size_code: z.enum(['S', 'M', 'L']),
  name: z.string().trim().min(2).max(100),
  price_delta_vnd: VndNonNegativeSchema.default(0),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
export type UpsertMenuVariantInput = z.infer<typeof UpsertMenuVariantSchema>;

export const CreateMenuModifierSchema = z.object({
  code: UpperCodeSchema,
  modifier_group: z.enum(['SUGAR', 'ICE', 'TOPPING']),
  name: z.string().trim().min(2).max(120),
  price_delta_vnd: VndNonNegativeSchema.default(0),
  inventory_item_id: UuidSchema.nullable().optional(),
  bom_qty_base_unit: QtyNonNegativeSchema.default(0),
});
export type CreateMenuModifierInput = z.infer<typeof CreateMenuModifierSchema>;

export const UpdateMenuModifierSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  price_delta_vnd: VndNonNegativeSchema.optional(),
  inventory_item_id: UuidSchema.nullable().optional(),
  bom_qty_base_unit: QtyNonNegativeSchema.optional(),
  is_active: z.boolean().optional(),
});
export type UpdateMenuModifierInput = z.infer<typeof UpdateMenuModifierSchema>;

export const UpsertBomRecipeSchema = z.object({
  product_id: UuidSchema,
  variant_id: UuidSchema,
  notes: z.string().trim().max(300).optional(),
  items: z
    .array(
      z.object({
        inventory_item_id: UuidSchema,
        quantity_per_cup_base_unit: QtyPositiveSchema,
        wastage_allowance_pct: z.number().finite().min(0).max(50).default(0),
      }),
    )
    .min(1, 'Công thức BOM phải có ít nhất 1 nguyên liệu định lượng'),
});
export type UpsertBomRecipeInput = z.infer<typeof UpsertBomRecipeSchema>;

// ============================================================================
// 6. AUTO STOCKTAKE PREVIEW DTO (M6)
// ============================================================================
export interface StocktakePreviewRowDTO {
  inventory_item_id: string;
  sku: string;
  item_name: string;
  base_unit: 'g' | 'ml' | 'pcs';
  opening_qty: number;
  received_in_qty: number;
  bom_consumed_qty: number;
  theoretical_closing_qty: number;
  current_lot_stock_qty: number;
  last_counted_qty: number | null;
}

export const CreateStoreDirectSchema = z.object({
  code: UpperCodeSchema,
  name: z.string().trim().min(2).max(120),
  type: z.enum(STORE_TYPES).default('RETAIL_STORE'),
  address: z.string().trim().min(4).max(255),
  phone: z.string().trim().min(8).max(20).optional(),
  price_multiplier: z.number().finite().min(0.5).max(3.0).default(1.0),
});
export type CreateStoreDirectInput = z.infer<typeof CreateStoreDirectSchema>;
