# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M1.1 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, không trùng lặp file.
- **Tiền đề đã hoàn thành:**
  - `C:\bib\cf_19\supabase\migrations\0001_m1_core_3nf_schema.sql` (12 ENUMs, 25 bảng 3NF, Check Constraints, FIFO Indexes)
  - `C:\bib\cf_19\supabase\migrations\0002_m1_rls_policies_and_views.sql` (3 Triggers, 2 Helper Functions, 55 RLS Policies, 5 Security Barrier Views)

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# MONOREPO ROOT & GÓI `@cf19/shared` MODULAR ARCHITECTURE (13 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 13 file dưới đây cho Monorepo Root và gói `@cf19/shared`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi tên file, không đổi tên kiểu, không đổi UUID, không thêm bớt logic.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 13 file trong danh sách mục 2. Tuyệt đối KHÔNG chạm vào `supabase/` hay `packages/shared/src/__tests__/schemas.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **DỪNG LẠI KHI GẶP MÂU THUẪN:** Nếu lệnh kiểm tra mục 5 báo lỗi, báo cáo nguyên văn lỗi lên board cho `@coordinator` và `@queen-neon`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (13 TARGET FILES)
1. `C:\bib\cf_19\package.json` (Tạo mới)
2. `C:\bib\cf_19\tsconfig.base.json` (Tạo mới)
3. `C:\bib\cf_19\packages\shared\package.json` (Tạo mới)
4. `C:\bib\cf_19\packages\shared\tsconfig.json` (Tạo mới)
5. `C:\bib\cf_19\packages\shared\src\enums.ts` (Tạo mới)
6. `C:\bib\cf_19\packages\shared\src\constants\seedIds.ts` (Tạo mới)
7. `C:\bib\cf_19\packages\shared\src\constants\securityKeys.ts` (Tạo mới)
8. `C:\bib\cf_19\packages\shared\src\schemas\auth.schema.ts` (Tạo mới)
9. `C:\bib\cf_19\packages\shared\src\schemas\store.schema.ts` (Tạo mới)
10. `C:\bib\cf_19\packages\shared\src\schemas\operations.schema.ts` (Tạo mới)
11. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Tạo mới)
12. `C:\bib\cf_19\packages\shared\src\types\domain.types.ts` (Tạo mới)
13. `C:\bib\cf_19\packages\shared\src\index.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\package.json`
```json
{
  "name": "cf19-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "typecheck": "npm run typecheck --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vitest": "^3.0.9"
  }
}
```

### File 2: `C:\bib\cf_19\tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  }
}
```

### File 3: `C:\bib\cf_19\packages\shared\package.json`
```json
{
  "name": "@cf19/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vitest": "^3.0.9"
  }
}
```

### File 4: `C:\bib\cf_19\packages\shared\tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "dist",
    "node_modules"
  ]
}
```

### File 5: `C:\bib\cf_19\packages\shared\src\enums.ts`
```ts
export const USER_ROLES = [
  'SUPER_ADMIN',
  'WAREHOUSE_MANAGER',
  'STORE_MANAGER',
  'CASHIER_STAFF',
  'BARISTA_KDS',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STORE_LEVEL_ROLES = [
  'STORE_MANAGER',
  'CASHIER_STAFF',
  'BARISTA_KDS',
] as const;
export type StoreLevelRole = (typeof STORE_LEVEL_ROLES)[number];

export const COST_PRIVILEGED_ROLES = [
  'SUPER_ADMIN',
  'WAREHOUSE_MANAGER',
] as const;
export type CostPrivilegedRole = (typeof COST_PRIVILEGED_ROLES)[number];

export const PIN_APPROVER_ROLES = [
  'SUPER_ADMIN',
  'STORE_MANAGER',
] as const;
export type PinApproverRole = (typeof PIN_APPROVER_ROLES)[number];

export const STORE_TYPES = [
  'CENTRAL_WAREHOUSE',
  'RETAIL_STORE',
  'FRANCHISE_STORE',
] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const INVENTORY_CATEGORIES = [
  'GREEN_BEAN',
  'ROASTED_COFFEE',
  'INGREDIENT',
  'PACKAGING',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const BASE_UNITS = ['g', 'ml', 'pcs'] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

export const LOT_STATUSES = ['AVAILABLE', 'DEPLETED', 'EXPIRED'] as const;
export type LotStatus = (typeof LOT_STATUSES)[number];

export const TRANSFER_STATUSES = [
  'REQUESTED',
  'IN_TRANSIT',
  'RECONCILED',
  'CANCELLED',
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const B2B_PRICE_TIERS = ['TIER_1', 'TIER_2', 'TIER_3'] as const;
export type B2bPriceTier = (typeof B2B_PRICE_TIERS)[number];

export const SHIFT_STATUSES = ['OPEN', 'CLOSED'] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'VIETQR'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'VOIDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const KDS_STATUSES = ['QUEUED', 'PREPARING', 'COMPLETED'] as const;
export type KdsStatus = (typeof KDS_STATUSES)[number];

export const MENU_SIZE_CODES = ['S', 'M', 'L'] as const;
export type MenuSizeCode = (typeof MENU_SIZE_CODES)[number];

export const MODIFIER_GROUPS = ['SUGAR', 'ICE', 'TOPPING'] as const;
export type ModifierGroup = (typeof MODIFIER_GROUPS)[number];

export const B2B_LEDGER_ENTRY_TYPES = [
  'DEBIT_INVOICE',
  'CREDIT_PAYMENT',
  'ADJUSTMENT',
] as const;
export type B2bLedgerEntryType = (typeof B2B_LEDGER_ENTRY_TYPES)[number];
```

### File 6: `C:\bib\cf_19\packages\shared\src\constants\seedIds.ts`
```ts
/**
 * Immutable RFC-4122 v4 UUIDs shared between supabase/seed.sql,
 * Backend In-Memory DB (M1.2), Integration Tests, and Frontend Switcher (M1.3).
 */
export const SEED_IDS = {
  organization: {
    cf19: '10000000-0000-4000-8000-000000000001',
  },
  stores: {
    centralWarehouse: '20000000-0000-4000-8000-000000000001',
    store01: '20000000-0000-4000-8000-000000000002',
    store02: '20000000-0000-4000-8000-000000000003',
    store03: '20000000-0000-4000-8000-000000000004',
    store04: '20000000-0000-4000-8000-000000000005',
  },
  users: {
    superAdmin: '30000000-0000-4000-8000-000000000001',
    warehouseManager: '30000000-0000-4000-8000-000000000002',
    storeManager01: '30000000-0000-4000-8000-000000000003',
    storeManager02: '30000000-0000-4000-8000-000000000004',
    cashier01: '30000000-0000-4000-8000-000000000005',
    cashier02: '30000000-0000-4000-8000-000000000006',
    barista01: '30000000-0000-4000-8000-000000000007',
    barista02: '30000000-0000-4000-8000-000000000008',
  },
  inventoryItems: {
    greenRobustaDakLak: '40000000-0000-4000-8000-000000000001',
    greenArabicaCauDat: '40000000-0000-4000-8000-000000000002',
    roastedRobustaMed: '40000000-0000-4000-8000-000000000003',
    roastedSignatureBlend: '40000000-0000-4000-8000-000000000004',
    condensedMilk: '40000000-0000-4000-8000-000000000005',
    freshMilk: '40000000-0000-4000-8000-000000000006',
    plasticCup500ml: '40000000-0000-4000-8000-000000000007',
    bioStraw: '40000000-0000-4000-8000-000000000008',
  },
  warehouseLots: {
    cwGreenRobusta01: '50000000-0000-4000-8000-000000000001',
    cwRoastedRobusta01: '50000000-0000-4000-8000-000000000002',
    cwRoastedRobusta02: '50000000-0000-4000-8000-000000000003',
    store01RoastedRobusta01: '50000000-0000-4000-8000-000000000004',
    store02RoastedRobusta01: '50000000-0000-4000-8000-000000000005',
  },
  roastBatches: {
    batchRobusta001: '55000000-0000-4000-8000-000000000001',
  },
  menuCategories: {
    coffee: '60000000-0000-4000-8000-000000000001',
    milkAndTea: '60000000-0000-4000-8000-000000000002',
  },
  menuProducts: {
    caPheSuaDa: '61000000-0000-4000-8000-000000000001',
    caPheDenDa: '61000000-0000-4000-8000-000000000002',
    bacXiuTayNguyen: '61000000-0000-4000-8000-000000000003',
  },
  menuVariants: {
    caPheSuaDaM: '62000000-0000-4000-8000-000000000001',
    caPheSuaDaL: '62000000-0000-4000-8000-000000000002',
    caPheDenDaM: '62000000-0000-4000-8000-000000000003',
    caPheDenDaL: '62000000-0000-4000-8000-000000000004',
    bacXiuM: '62000000-0000-4000-8000-000000000005',
    bacXiuL: '62000000-0000-4000-8000-000000000006',
  },
  menuModifiers: {
    sugar50: '63000000-0000-4000-8000-000000000001',
    ice50: '63000000-0000-4000-8000-000000000002',
    extraEspressoShot: '63000000-0000-4000-8000-000000000003',
    extraCondensedMilk: '63000000-0000-4000-8000-000000000004',
  },
  bomRecipes: {
    caPheSuaDaM: '64000000-0000-4000-8000-000000000001',
    caPheDenDaM: '64000000-0000-4000-8000-000000000002',
    bacXiuM: '64000000-0000-4000-8000-000000000003',
  },
  b2bCustomers: {
    phoNuiCoffee: '70000000-0000-4000-8000-000000000001',
    hoaDoBakery: '70000000-0000-4000-8000-000000000002',
  },
  b2bPriceTiers: {
    robustaTier1: '71000000-0000-4000-8000-000000000001',
    robustaTier2: '71000000-0000-4000-8000-000000000002',
    robustaTier3: '71000000-0000-4000-8000-000000000003',
    blendTier1: '71000000-0000-4000-8000-000000000004',
  },
  posShifts: {
    store01OpenShift: '80000000-0000-4000-8000-000000000001',
  },
  internalTransfers: {
    store01InitialRequest: '81000000-0000-4000-8000-000000000001',
  },
} as const;
```

### File 7: `C:\bib\cf_19\packages\shared\src\constants\securityKeys.ts`
```ts
/**
 * Confidential Central Warehouse cost fields that MUST NEVER be exposed
 * to STORE_MANAGER, CASHIER_STAFF, or BARISTA_KDS responses.
 */
export const SENSITIVE_COST_KEYS = [
  'moving_avg_cost_vnd',
  'unit_cost_vnd',
  'shipping_cost_vnd',
  'raw_import_cost',
  'raw_import_cost_vnd',
  'cogs_amount_vnd',
] as const;

export type SensitiveCostKey = (typeof SENSITIVE_COST_KEYS)[number];

/**
 * Financial & revenue fields that MUST NEVER be exposed to BARISTA_KDS.
 */
export const KDS_FORBIDDEN_FINANCE_KEYS = [
  'total_amount_vnd',
  'cogs_amount_vnd',
  'unit_price_vnd',
  'line_total_vnd',
  'payment_method',
  'vietqr_ref_code',
  'opening_cash_vnd',
  'blind_counted_cash_vnd',
  'system_expected_cash_vnd',
  'variance_cash_vnd',
] as const;

export type KdsForbiddenFinanceKey = (typeof KDS_FORBIDDEN_FINANCE_KEYS)[number];

/**
 * Blind Shift Close theoretical cash fields that MUST remain hidden
 * from CASHIER_STAFF while shift status is OPEN.
 */
export const BLIND_SHIFT_HIDDEN_KEYS = [
  'system_expected_cash_vnd',
  'variance_cash_vnd',
] as const;

export type BlindShiftHiddenKey = (typeof BLIND_SHIFT_HIDDEN_KEYS)[number];
```

### File 8: `C:\bib\cf_19\packages\shared\src\schemas\auth.schema.ts`
```ts
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
```

### File 9: `C:\bib\cf_19\packages\shared\src\schemas\store.schema.ts`
```ts
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
```

### File 10: `C:\bib\cf_19\packages\shared\src\schemas\operations.schema.ts`
```ts
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
    .min(1, 'Reconciliation must confirm at least 1 item'),
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
```

### File 11: `C:\bib\cf_19\packages\shared\src\schemas\index.ts`
```ts
export * from './auth.schema.js';
export * from './store.schema.js';
export * from './operations.schema.js';
```

### File 12: `C:\bib\cf_19\packages\shared\src\types\domain.types.ts`
```ts
import type {
  B2bLedgerEntryType,
  B2bPriceTier,
  BaseUnit,
  EmploymentType,
  InventoryCategory,
  KdsStatus,
  LotStatus,
  MenuSizeCode,
  ModifierGroup,
  PaymentMethod,
  PaymentStatus,
  ShiftStatus,
  StoreType,
  TransferStatus,
  UserRole,
} from '../enums.js';

export interface OrganizationDto {
  id: string;
  code: string;
  name: string;
  tax_code: string | null;
  base_currency: 'VND';
  franchise_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreDto {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: StoreType;
  address: string;
  phone: string | null;
  price_multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUserDto {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  assigned_store_id: string | null;
  hourly_rate_vnd: number;
  employment_type: EmploymentType;
  has_manager_pin: boolean;
  is_active: boolean;
}

export interface AuditLogDto {
  id: string;
  actor_id: string;
  store_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  reason: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
}

/**
 * Full Inventory Item DTO (ONLY for SUPER_ADMIN & WAREHOUSE_MANAGER).
 * Includes confidential Central Warehouse moving_avg_cost_vnd.
 */
export interface WarehouseInventoryItemDto {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  base_unit: BaseUnit;
  min_stock_threshold: number;
  moving_avg_cost_vnd: number;
  internal_transfer_price_vnd: number;
  retail_price_vnd: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Store-Safe Inventory Item DTO (for STORE_MANAGER, CASHIER_STAFF, BARISTA_KDS).
 * Strictly omits moving_avg_cost_vnd.
 */
export type StoreSafeInventoryItemDto = Omit<
  WarehouseInventoryItemDto,
  'moving_avg_cost_vnd'
>;

/**
 * Full Warehouse Lot DTO (ONLY for SUPER_ADMIN & WAREHOUSE_MANAGER).
 * Includes confidential Central Warehouse unit_cost_vnd & shipping_cost_vnd.
 */
export interface WarehouseLotFullDto {
  id: string;
  store_id: string;
  item_id: string;
  lot_code: string;
  supplier_name: string | null;
  moisture_pct: number | null;
  roast_date: string | null;
  received_at: string;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  unit_cost_vnd: number;
  shipping_cost_vnd: number;
  status: LotStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Store-Safe Lot DTO (for STORE_MANAGER, CASHIER_STAFF, BARISTA_KDS).
 * Strictly omits confidential origin cost columns.
 */
export type StoreSafeWarehouseLotDto = Omit<
  WarehouseLotFullDto,
  'unit_cost_vnd' | 'shipping_cost_vnd'
>;

export interface RoastBatchDto {
  id: string;
  warehouse_store_id: string;
  batch_code: string;
  source_green_lot_id: string;
  output_lot_id: string | null;
  green_input_weight_g: number;
  roasted_output_weight_g: number;
  weight_loss_pct: number;
  roast_profile: string | null;
  roasted_by: string;
  roasted_at: string;
  notes: string | null;
}

export interface InternalTransferItemDto {
  id: string;
  transfer_id: string;
  item_id: string;
  source_lot_id: string | null;
  destination_lot_id: string | null;
  requested_qty: number;
  dispatched_qty: number;
  received_qty: number;
  internal_unit_price_vnd: number;
  line_total_vnd: number;
}

export interface InternalTransferDto {
  id: string;
  transfer_code: string;
  from_warehouse_id: string;
  to_store_id: string;
  status: TransferStatus;
  total_internal_value_vnd: number;
  requested_by: string;
  dispatched_by: string | null;
  received_by: string | null;
  requested_at: string;
  dispatched_at: string | null;
  received_at: string | null;
  notes: string | null;
  items?: InternalTransferItemDto[];
}

export interface B2bCustomerDto {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string | null;
  price_tier: B2bPriceTier;
  credit_limit_vnd: number;
  current_debt_vnd: number;
  payment_term_days: number;
  is_active: boolean;
}

export interface B2bPriceTierDto {
  id: string;
  item_id: string;
  price_tier: B2bPriceTier;
  min_qty_kg: number;
  unit_price_vnd: number;
}

export interface B2bDebtLedgerEntryDto {
  id: string;
  customer_id: string;
  b2b_order_id: string | null;
  entry_type: B2bLedgerEntryType;
  amount_vnd: number;
  balance_after_vnd: number;
  recorded_by: string;
  reference_note: string | null;
  created_at: string;
}

export interface MenuVariantDto {
  id: string;
  product_id: string;
  size_code: MenuSizeCode;
  name: string;
  price_delta_vnd: number;
  is_default: boolean;
  is_active: boolean;
}

export interface MenuModifierDto {
  id: string;
  organization_id: string;
  code: string;
  modifier_group: ModifierGroup;
  name: string;
  price_delta_vnd: number;
  inventory_item_id: string | null;
  bom_qty_base_unit: number;
  is_active: boolean;
}

export interface MenuProductDto {
  id: string;
  organization_id: string;
  category_id: string;
  code: string;
  name: string;
  base_price_vnd: number;
  is_active: boolean;
  variants?: MenuVariantDto[];
}

/**
 * Full POS Shift DTO (for SUPER_ADMIN & STORE_MANAGER, or CLOSED shift after blind close).
 */
export interface PosShiftFullDto {
  id: string;
  store_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash_vnd: number;
  blind_counted_cash_vnd: number | null;
  system_expected_cash_vnd: number | null;
  variance_cash_vnd: number | null;
  status: ShiftStatus;
  notes: string | null;
}

/**
 * Cashier Open-Shift DTO (Blind Shift Close protection).
 * Strictly hides system_expected_cash_vnd and variance_cash_vnd while OPEN.
 */
export type CashierOpenShiftDto = Omit<
  PosShiftFullDto,
  'system_expected_cash_vnd' | 'variance_cash_vnd'
>;

export interface PosOrderItemDto {
  id: string;
  order_id: string;
  store_id: string;
  product_id: string;
  variant_id: string;
  modifiers_json: Array<{ id: string; name: string; price_delta_vnd: number }>;
  quantity: number;
  unit_price_vnd: number;
  line_total_vnd: number;
  notes: string | null;
  created_at: string;
}

export interface PosOrderFullDto {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  cashier_id: string;
  customer_phone: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  kds_status: KdsStatus;
  vietqr_ref_code: string | null;
  total_amount_vnd: number;
  cogs_amount_vnd: number;
  bom_deducted_at: string | null;
  void_approved_by_manager_id: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  items?: PosOrderItemDto[];
}

/**
 * KDS-Safe Order Item DTO (for BARISTA_KDS).
 * Strictly omits unit_price_vnd and line_total_vnd.
 */
export interface KdsSafeOrderItemDto {
  id: string;
  order_id: string;
  store_id: string;
  product_id: string;
  variant_id: string;
  modifiers_json: Array<{ id: string; name: string }>;
  quantity: number;
  notes: string | null;
  created_at: string;
}

/**
 * KDS-Safe Order Ticket DTO (for BARISTA_KDS).
 * Strictly omits total_amount_vnd, cogs_amount_vnd, payment_method, vietqr_ref_code.
 */
export interface KdsSafeOrderTicketDto {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  kds_status: KdsStatus;
  payment_status: PaymentStatus;
  bom_deducted_at: string | null;
  created_at: string;
  updated_at: string;
  items?: KdsSafeOrderItemDto[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}
```

### File 13: `C:\bib\cf_19\packages\shared\src\index.ts`
```ts
export * from './enums.js';
export * from './constants/seedIds.js';
export * from './constants/securityKeys.js';
export * from './schemas/index.js';
export * from './types/domain.types.js';
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ cả 13 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy `npm install` tại `C:\bib\cf_19` để cài đặt workspace dependencies (`zod`, `typescript`, `vitest`).
3. Chạy lệnh kiểm tra ở mục 5 và xác nhận `typecheck` + `build` thành công với exit code `0`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
npm install && npm run typecheck --workspace=@cf19/shared && npm run build --workspace=@cf19/shared
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# DỮ LIỆU MẪU ĐA CHI NHÁNH `supabase/seed.sql` & BỘ VITEST UNIT TESTS (2 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 2 file dưới đây: `C:\bib\cf_19\supabase\seed.sql` và `C:\bib\cf_19\packages\shared\src\__tests__\schemas.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung SQL và TypeScript Vitest đã được Quân Hậu biên soạn sẵn trong mục 3. Tuyệt đối KHÔNG thay đổi UUID, KHÔNG thay đổi hash PIN `scrypt`, KHÔNG rút gọn bất kỳ test case nào.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 2 file trong mục 2. Tuyệt đối KHÔNG sửa 13 file của `pawn-flash-1` hay 2 file migration trong `supabase/migrations/`.
- **CHỜ ĐỒNG BỘ CHẠY TEST:** Sau khi ghi xong 2 file, nếu `node_modules` đã được `pawn-flash-1` cài xong thì chạy ngay lệnh mục 5 (`vitest run` và `typecheck`). Nếu chưa có `node_modules`, báo cáo đã ghi xong 2 file lên board cho `@coordinator` để chạy kiểm định sau khi `pawn-flash-1` cài xong dependencies.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (2 TARGET FILES)
1. `C:\bib\cf_19\supabase\seed.sql` (Tạo mới)
2. `C:\bib\cf_19\packages\shared\src\__tests__\schemas.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\supabase\seed.sql`
```sql
-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Seed Script: supabase/seed.sql
-- Scope: 1 Org, 5 Stores (1 Central Warehouse + 4 Retail Stores),
--        8 Users covering all 5 Roles across Store 1 & Store 2 (with scrypt PIN hashes),
--        8 Inventory Items, 5 Lots, 1 Roast Batch, Menu + Variants + Modifiers + BOM,
--        2 B2B Customers + 4 Price Tiers, 1 Open Shift, 1 Internal Transfer Request.
-- All UUIDs match packages/shared/src/constants/seedIds.ts 100%.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ORGANIZATION (1)
-- ============================================================================
INSERT INTO public.organizations (id, code, name, tax_code, base_currency, franchise_enabled)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  'CF19',
  'Chuỗi Cung Ứng Kho Tổng Tây Nguyên & Cà Phê CF19',
  '6001900019',
  'VND',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STORES: 1 CENTRAL WAREHOUSE + 4 RETAIL STORES (5)
-- ============================================================================
INSERT INTO public.stores (id, organization_id, code, name, type, address, phone, price_multiplier, is_active)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'CW-TAYNGUYEN',
    'Kho Tổng Rang Xay Tây Nguyên',
    'CENTRAL_WAREHOUSE',
    'Khu Công Nghiệp Tân An, TP. Buôn Ma Thuột, Đắk Lắk',
    '02623888001',
    1.00,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'STORE-01',
    'CF19 Quán 1 — Trung Tâm Thị Trấn',
    'RETAIL_STORE',
    '19 Trần Phú, Trung Tâm Thị Trấn',
    '02623888101',
    1.00,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'STORE-02',
    'CF19 Quán 2 — Quảng Trường',
    'RETAIL_STORE',
    '88 Hùng Vương, Khu Quảng Trường',
    '02623888102',
    1.00,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'STORE-03',
    'CF19 Quán 3 — Đại Lộ Đông Tây',
    'RETAIL_STORE',
    '120 Lê Duẩn, Đại Lộ Đông Tây',
    '02623888103',
    1.05,
    TRUE
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'STORE-04',
    'CF19 Quán 4 — Công Viên Hồ Điều Hòa',
    'RETAIL_STORE',
    '05 Nguyễn Tất Thành, Công Viên Hồ Điều Hòa',
    '02623888104',
    1.00,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. USERS: 8 ACCOUNTS IN auth.users + public.user_profiles
--    PINs (Node crypto.scryptSync(pin, salt, 64), format scrypt$<salt>$<hex>):
--      - SUPER_ADMIN (admin@cf19.vn): PIN 123456
--      - STORE_MANAGER Quán 1 (manager.store01@cf19.vn): PIN 123456
--      - STORE_MANAGER Quán 2 (manager.store02@cf19.vn): PIN 654321
-- ============================================================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@cf19.vn',
    crypt('Cf19@Admin123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"SUPER_ADMIN"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'warehouse@cf19.vn',
    crypt('Cf19@Warehouse123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"WAREHOUSE_MANAGER"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager.store01@cf19.vn',
    crypt('Cf19@Manager01', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"STORE_MANAGER"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager.store02@cf19.vn',
    crypt('Cf19@Manager02', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"STORE_MANAGER"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cashier.store01@cf19.vn',
    crypt('Cf19@Cashier01', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"CASHIER_STAFF"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cashier.store02@cf19.vn',
    crypt('Cf19@Cashier02', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"CASHIER_STAFF"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'barista.store01@cf19.vn',
    crypt('Cf19@Barista01', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"BARISTA_KDS"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'barista.store02@cf19.vn',
    crypt('Cf19@Barista02', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"BARISTA_KDS"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (
  id,
  organization_id,
  full_name,
  email,
  phone,
  role,
  assigned_store_id,
  manager_pin_hash,
  hourly_rate_vnd,
  employment_type,
  is_active
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Nguyễn Minh Quân (Chủ Chuỗi)',
    'admin@cf19.vn',
    '0901000001',
    'SUPER_ADMIN',
    NULL,
    'scrypt$cf19_salt_admin_01$0c6150e2972c3db6c399d3fae73d4cc8276dd29e0a3ec30e5cfc165555d27a360efe28390ddf69cd04fd12237eb757e901a883fad4e4f3dce236d2d95916fd9b',
    0,
    'FULL_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Trần Văn Hùng (Quản Lý Kho Tổng)',
    'warehouse@cf19.vn',
    '0901000002',
    'WAREHOUSE_MANAGER',
    '20000000-0000-4000-8000-000000000001',
    NULL,
    75000,
    'FULL_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Lê Thị Thảo (Quản Lý Quán 1)',
    'manager.store01@cf19.vn',
    '0901000003',
    'STORE_MANAGER',
    '20000000-0000-4000-8000-000000000002',
    'scrypt$cf19_salt_store01_01$79d6ce09a13ca647774e321a7f348bd49eb5b503f76f11bf17cc1c52f16980fb4dabe41e134cb30ac4f0e38ebed46f07c3f174d94c89a0b8c6fba78985129a17',
    65000,
    'FULL_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'Phạm Quốc Bảo (Quản Lý Quán 2)',
    'manager.store02@cf19.vn',
    '0901000004',
    'STORE_MANAGER',
    '20000000-0000-4000-8000-000000000003',
    'scrypt$cf19_salt_store02_01$ff4a685894b7d9f52f4e497c27e48b37b944e7e82df0fee18e11a80d5b30de824239bf6cd6ac7094ede07eaf63997f75098ae974af9a4076cb7293c73b8e3247',
    65000,
    'FULL_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'Võ Ngọc Linh (Thu Ngân Quán 1)',
    'cashier.store01@cf19.vn',
    '0901000005',
    'CASHIER_STAFF',
    '20000000-0000-4000-8000-000000000002',
    NULL,
    30000,
    'FULL_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    'Đặng Minh Anh (Thu Ngân Quán 2)',
    'cashier.store02@cf19.vn',
    '0901000006',
    'CASHIER_STAFF',
    '20000000-0000-4000-8000-000000000003',
    NULL,
    28000,
    'PART_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000001',
    'Hoàng Gia Huy (Pha Chế Quán 1)',
    'barista.store01@cf19.vn',
    '0901000007',
    'BARISTA_KDS',
    '20000000-0000-4000-8000-000000000002',
    NULL,
    32000,
    'FULL_TIME',
    TRUE
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    'Bùi Tuấn Kiệt (Pha Chế Quán 2)',
    'barista.store02@cf19.vn',
    '0901000008',
    'BARISTA_KDS',
    '20000000-0000-4000-8000-000000000003',
    NULL,
    30000,
    'PART_TIME',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. INVENTORY ITEMS (8 ITEMS)
--    moving_avg_cost_vnd is CONFIDENTIAL (Central Warehouse / Admin only)
-- ============================================================================
INSERT INTO public.inventory_items (
  id,
  organization_id,
  sku,
  name,
  category,
  base_unit,
  min_stock_threshold,
  moving_avg_cost_vnd,
  internal_transfer_price_vnd,
  retail_price_vnd,
  is_active
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'GB-ROB-TN',
    'Cà phê nhân xanh Robusta Đắk Lắk S18',
    'GREEN_BEAN',
    'g',
    60000.00,
    98000,
    0,
    0,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'GB-ARA-CD',
    'Cà phê nhân xanh Arabica Cầu Đất Washed',
    'GREEN_BEAN',
    'g',
    30000.00,
    165000,
    0,
    0,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'RC-ROB-MED',
    'Cà phê hạt rang Robusta Medium (Kg)',
    'ROASTED_COFFEE',
    'g',
    3000.00,
    125000,
    155000,
    210000,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'RC-BLEND-SIG',
    'Cà phê hạt rang Signature Blend 70/30 (Kg)',
    'ROASTED_COFFEE',
    'g',
    3000.00,
    158000,
    195000,
    265000,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'ING-COND-MILK',
    'Sữa đặc có đường Ngôi Sao Phương Nam',
    'INGREDIENT',
    'ml',
    2000.00,
    52,
    60,
    0,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    'ING-FRESH-MILK',
    'Sữa tươi thanh trùng DalatMilk không đường',
    'INGREDIENT',
    'ml',
    5000.00,
    34,
    39,
    0,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000001',
    'PKG-CUP-500',
    'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
    'PACKAGING',
    'pcs',
    200.00,
    1150,
    1350,
    0,
    TRUE
  ),
  (
    '40000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    'PKG-STRAW-BIO',
    'Ống hút sinh học phi 6 bọc giấy',
    'PACKAGING',
    'pcs',
    300.00,
    180,
    220,
    0,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. WAREHOUSE LOTS (5 LOTS: 3 AT CENTRAL WAREHOUSE, 1 AT STORE 1, 1 AT STORE 2)
-- ============================================================================
INSERT INTO public.warehouse_lots (
  id,
  store_id,
  item_id,
  lot_code,
  supplier_name,
  moisture_pct,
  roast_date,
  received_at,
  expiry_date,
  initial_qty,
  remaining_qty,
  unit_cost_vnd,
  shipping_cost_vnd,
  status
)
VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'LOT-CW-GB-ROB-001',
    'HTX Nông Sản Cư Mgar Đắk Lắk',
    12.20,
    NULL,
    '2026-11-01T08:00:00Z',
    '2027-11-01',
    120000.00,
    90000.00,
    95000,
    360000,
    'AVAILABLE'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    'LOT-CW-RC-ROB-001',
    'Xưởng Rang Nội Bộ CF19',
    3.10,
    '2026-11-10',
    '2026-11-10T10:30:00Z',
    '2027-02-10',
    24900.00,
    24900.00,
    124500,
    0,
    'AVAILABLE'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    'LOT-CW-RC-ROB-002',
    'Xưởng Rang Nội Bộ CF19',
    3.00,
    '2026-11-18',
    '2026-11-18T14:00:00Z',
    '2027-02-18',
    20000.00,
    20000.00,
    126000,
    0,
    'AVAILABLE'
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
    'LOT-S01-RC-ROB-001',
    'Kho Tổng CF19 (Chuyển Nội Bộ)',
    3.10,
    '2026-11-10',
    '2026-11-12T07:30:00Z',
    '2027-02-10',
    5000.00,
    4500.00,
    155000,
    0,
    'AVAILABLE'
  ),
  (
    '50000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000003',
    'LOT-S02-RC-ROB-001',
    'Kho Tổng CF19 (Chuyển Nội Bộ)',
    3.10,
    '2026-11-10',
    '2026-11-12T08:15:00Z',
    '2027-02-10',
    5000.00,
    4800.00,
    155000,
    0,
    'AVAILABLE'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. ROAST BATCH (1 BATCH: 30kg Green -> 24.9kg Roasted = 17.00% Loss)
-- ============================================================================
INSERT INTO public.roast_batches (
  id,
  warehouse_store_id,
  batch_code,
  source_green_lot_id,
  output_lot_id,
  green_input_weight_g,
  roasted_output_weight_g,
  weight_loss_pct,
  roast_profile,
  roasted_by,
  roasted_at,
  notes
)
VALUES (
  '55000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'RB-20261110-001',
  '50000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002',
  30000.00,
  24900.00,
  17.00,
  'Medium Full City 212C - 14 phút',
  '30000000-0000-4000-8000-000000000002',
  '2026-11-10T10:30:00Z',
  'Mẻ rang chuẩn định mức hao hụt 17% phục vụ 4 quán và bán sỉ'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. MASTER MENU (CATEGORIES, PRODUCTS, VARIANTS, MODIFIERS) & BOM RECIPES
-- ============================================================================
INSERT INTO public.menu_categories (id, organization_id, code, name, sort_order, is_active)
VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'CAT-COFFEE', 'Cà Phê Tây Nguyên', 1, TRUE),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'CAT-MILK', 'Cà Phê Sữa & Bạc Xỉu', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_products (id, organization_id, category_id, code, name, base_price_vnd, is_active)
VALUES
  ('61000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'PRD-CF-SUA-DA', 'Cà Phê Sữa Đá Tây Nguyên', 29000, TRUE),
  ('61000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'PRD-CF-DEN-DA', 'Cà Phê Đen Đá Nguyên Chất', 25000, TRUE),
  ('61000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'PRD-BAC-XIU', 'Bạc Xỉu Tây Nguyên', 35000, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_variants (id, product_id, size_code, name, price_delta_vnd, is_default, is_active)
VALUES
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'M', 'Size M (Tiêu chuẩn)', 0, TRUE, TRUE),
  ('62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 'L', 'Size L (Lớn)', 6000, FALSE, TRUE),
  ('62000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000002', 'M', 'Size M (Tiêu chuẩn)', 0, TRUE, TRUE),
  ('62000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000002', 'L', 'Size L (Lớn)', 6000, FALSE, TRUE),
  ('62000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000003', 'M', 'Size M (Tiêu chuẩn)', 0, TRUE, TRUE),
  ('62000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000003', 'L', 'Size L (Lớn)', 6000, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_modifiers (
  id,
  organization_id,
  code,
  modifier_group,
  name,
  price_delta_vnd,
  inventory_item_id,
  bom_qty_base_unit,
  is_active
)
VALUES
  ('63000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'MOD-SUGAR-50', 'SUGAR', 'Ít đường (50%)', 0, NULL, 0.00, TRUE),
  ('63000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'MOD-ICE-50', 'ICE', 'Ít đá (50%)', 0, NULL, 0.00, TRUE),
  ('63000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'MOD-TOP-SHOT', 'TOPPING', 'Thêm 1 Shot Espresso', 10000, '40000000-0000-4000-8000-000000000003', 18.00, TRUE),
  ('63000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'MOD-TOP-MILK', 'TOPPING', 'Thêm Sữa Đặc', 5000, '40000000-0000-4000-8000-000000000005', 15.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bom_recipes (id, product_id, variant_id, version, is_active, notes)
VALUES
  ('64000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 1, TRUE, 'Định mức chuẩn 1 ly Cà Phê Sữa Đá Size M'),
  ('64000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000003', 1, TRUE, 'Định mức chuẩn 1 ly Cà Phê Đen Đá Size M'),
  ('64000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', '62000000-0000-4000-8000-000000000005', 1, TRUE, 'Định mức chuẩn 1 ly Bạc Xỉu Size M')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bom_recipe_items (recipe_id, inventory_item_id, quantity_per_cup_base_unit, wastage_allowance_pct)
VALUES
  -- Cà Phê Sữa Đá M: 20g coffee + 25ml condensed milk + 1 cup + 1 straw
  ('64000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 20.00, 2.00),
  ('64000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 25.00, 2.00),
  ('64000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000007', 1.00, 0.00),
  ('64000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000008', 1.00, 0.00),
  -- Cà Phê Đen Đá M: 22g coffee + 1 cup + 1 straw
  ('64000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 22.00, 2.00),
  ('64000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000007', 1.00, 0.00),
  ('64000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000008', 1.00, 0.00),
  -- Bạc Xỉu M: 15g coffee + 25ml condensed milk + 80ml fresh milk + 1 cup + 1 straw
  ('64000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 15.00, 2.00),
  ('64000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000005', 25.00, 2.00),
  ('64000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000006', 80.00, 3.00),
  ('64000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000007', 1.00, 0.00),
  ('64000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000008', 1.00, 0.00)
ON CONFLICT (recipe_id, inventory_item_id) DO NOTHING;

-- ============================================================================
-- 8. B2B WHOLESALE CUSTOMERS (2) & PRICE TIERS (4)
-- ============================================================================
INSERT INTO public.b2b_customers (
  id,
  organization_id,
  code,
  name,
  shop_name,
  phone,
  address,
  price_tier,
  credit_limit_vnd,
  current_debt_vnd,
  payment_term_days,
  is_active
)
VALUES
  (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'B2B-001',
    'Nguyễn Thành Nam',
    'Quán Cà Phê Phố Núi',
    '0912345001',
    '42 Quang Trung, Thị Trấn',
    'TIER_2',
    30000000,
    5500000,
    15,
    TRUE
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'B2B-002',
    'Trần Mỹ Hạnh',
    'Tiệm Bánh & Trà Hoa Đỏ',
    '0912345002',
    '77 Phan Bội Châu, Thị Trấn',
    'TIER_1',
    15000000,
    0,
    7,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.b2b_price_tiers (id, item_id, price_tier, min_qty_kg, unit_price_vnd)
VALUES
  ('71000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'TIER_1', 0.00, 185000),
  ('71000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 'TIER_2', 10.00, 172000),
  ('71000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'TIER_3', 50.00, 160000),
  ('71000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'TIER_1', 0.00, 240000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. SAMPLE OPEN SHIFT (STORE 1) & INTERNAL TRANSFER REQUEST (STORE 1)
-- ============================================================================
INSERT INTO public.pos_shifts (
  id,
  store_id,
  cashier_id,
  opened_at,
  opening_cash_vnd,
  status,
  notes
)
VALUES (
  '80000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000005',
  NOW(),
  2000000,
  'OPEN',
  'Ca sáng Quán 1 khởi tạo mặc định'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.internal_transfers (
  id,
  transfer_code,
  from_warehouse_id,
  to_store_id,
  status,
  total_internal_value_vnd,
  requested_by,
  notes
)
VALUES (
  '81000000-0000-4000-8000-000000000001',
  'TRF-20261122-001',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  'REQUESTED',
  775000,
  '30000000-0000-4000-8000-000000000003',
  'Phiếu xin bổ sung 5kg Robusta rang cho Quán 1'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.internal_transfer_items (
  transfer_id,
  item_id,
  requested_qty,
  dispatched_qty,
  received_qty,
  internal_unit_price_vnd,
  line_total_vnd
)
VALUES (
  '81000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000003',
  5000.00,
  0.00,
  0.00,
  155000,
  775000
);

COMMIT;
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\schemas.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import {
  BLIND_SHIFT_HIDDEN_KEYS,
  BlindCloseShiftSchema,
  CreateInternalTransferRequestSchema,
  CreatePosOrderSchema,
  CreateStoreSchema,
  KDS_FORBIDDEN_FINANCE_KEYS,
  ManagerPinApprovalSchema,
  OpenShiftSchema,
  QtyPositiveSchema,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
  UuidSchema,
  VndNonNegativeSchema,
  VoidPosOrderSchema,
  WarehouseLotCreateSchema,
} from '../index.js';

describe('@cf19/shared — Domain Invariants, Zod Schemas & Security Constants', () => {
  // 1-3: VND Currency Integer Guardrails
  it('1. accepts non-negative integer VND amounts including 0', () => {
    expect(VndNonNegativeSchema.parse(0)).toBe(0);
    expect(VndNonNegativeSchema.parse(29000)).toBe(29000);
    expect(VndNonNegativeSchema.parse(15000000)).toBe(15000000);
  });

  it('2. rejects floating-point VND currency amounts (e.g., 25000.5)', () => {
    const result = VndNonNegativeSchema.safeParse(25000.5);
    expect(result.success).toBe(false);
  });

  it('3. rejects negative VND currency amounts (e.g., -100)', () => {
    const result = VndNonNegativeSchema.safeParse(-100);
    expect(result.success).toBe(false);
  });

  // 4-5: Inventory & BOM Quantity Guardrails
  it('4. accepts positive finite inventory/BOM quantities', () => {
    expect(QtyPositiveSchema.parse(20.5)).toBe(20.5);
    expect(QtyPositiveSchema.parse(1)).toBe(1);
  });

  it('5. rejects zero and negative inventory/BOM quantities', () => {
    expect(QtyPositiveSchema.safeParse(0).success).toBe(false);
    expect(QtyPositiveSchema.safeParse(-5.25).success).toBe(false);
  });

  // 6-8: Manager 6-Digit PIN & Approval Reason Guardrails
  it('6. accepts valid 6-digit numeric Manager PIN approval payload', () => {
    const parsed = ManagerPinApprovalSchema.parse({
      manager_id: SEED_IDS.users.storeManager01,
      store_id: SEED_IDS.stores.store01,
      pin: '123456',
      action: 'VOID_POS_ORDER',
      target_table: 'pos_orders',
      reason: 'Khách đổi món trước khi pha chế',
    });
    expect(parsed.pin).toBe('123456');
  });

  it('7. rejects malformed Manager PINs (5 digits, 7 digits, alphanumeric)', () => {
    const base = {
      manager_id: SEED_IDS.users.storeManager01,
      store_id: SEED_IDS.stores.store01,
      action: 'VOID_POS_ORDER',
      target_table: 'pos_orders',
      reason: 'Hủy đơn nhầm',
    };
    expect(ManagerPinApprovalSchema.safeParse({ ...base, pin: '12345' }).success).toBe(false);
    expect(ManagerPinApprovalSchema.safeParse({ ...base, pin: '1234567' }).success).toBe(false);
    expect(ManagerPinApprovalSchema.safeParse({ ...base, pin: '12345a' }).success).toBe(false);
  });

  it('8. rejects Manager PIN approval when reason is shorter than 3 characters', () => {
    const result = ManagerPinApprovalSchema.safeParse({
      manager_id: SEED_IDS.users.storeManager01,
      store_id: SEED_IDS.stores.store01,
      pin: '123456',
      action: 'VOID_POS_ORDER',
      target_table: 'pos_orders',
      reason: 'ab',
    });
    expect(result.success).toBe(false);
  });

  // 9-11: POS Order & Void Order Validation
  it('9. accepts valid POS order with at least 1 item and positive integer quantity', () => {
    const parsed = CreatePosOrderSchema.parse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'VIETQR',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [SEED_IDS.menuModifiers.sugar50],
          quantity: 2,
        },
      ],
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.quantity).toBe(2);
  });

  it('10. rejects POS order with empty items array or non-positive/float item quantity', () => {
    const emptyOrder = CreatePosOrderSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [],
    });
    expect(emptyOrder.success).toBe(false);

    const floatQtyOrder = CreatePosOrderSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 1.5,
        },
      ],
    });
    expect(floatQtyOrder.success).toBe(false);

    const zeroQtyOrder = CreatePosOrderSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 0,
        },
      ],
    });
    expect(zeroQtyOrder.success).toBe(false);
  });

  it('11. validates VoidPosOrderSchema requiring 6-digit manager PIN and valid reason', () => {
    const validVoid = VoidPosOrderSchema.safeParse({
      order_id: '90000000-0000-4000-8000-000000000001',
      store_id: SEED_IDS.stores.store01,
      manager_id: SEED_IDS.users.storeManager01,
      manager_pin: '123456',
      void_reason: 'Nhập sai phương thức thanh toán',
    });
    expect(validVoid.success).toBe(true);

    const badPinVoid = VoidPosOrderSchema.safeParse({
      order_id: '90000000-0000-4000-8000-000000000001',
      store_id: SEED_IDS.stores.store01,
      manager_id: SEED_IDS.users.storeManager01,
      manager_pin: '999',
      void_reason: 'Nhập sai phương thức thanh toán',
    });
    expect(badPinVoid.success).toBe(false);
  });

  // 12-13: 2-Phase Internal Stock Transfer Validation
  it('12. accepts valid 2-phase internal transfer request from Central Warehouse to Store 1', () => {
    const result = CreateInternalTransferRequestSchema.safeParse({
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.store01,
      items: [
        {
          item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          requested_qty: 5000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('13. rejects internal transfer with empty items or identical source and destination store', () => {
    const emptyItems = CreateInternalTransferRequestSchema.safeParse({
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.store01,
      items: [],
    });
    expect(emptyItems.success).toBe(false);

    const sameStore = CreateInternalTransferRequestSchema.safeParse({
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.centralWarehouse,
      items: [
        {
          item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          requested_qty: 1000,
        },
      ],
    });
    expect(sameStore.success).toBe(false);
  });

  // 14-15: Blind Shift Close & Open Shift Validation
  it('14. accepts valid OpenShiftSchema and BlindCloseShiftSchema with non-negative integer cash', () => {
    expect(
      OpenShiftSchema.safeParse({
        store_id: SEED_IDS.stores.store01,
        opening_cash_vnd: 2000000,
      }).success,
    ).toBe(true);

    expect(
      BlindCloseShiftSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        blind_counted_cash_vnd: 4850000,
      }).success,
    ).toBe(true);
  });

  it('15. rejects BlindCloseShiftSchema with negative or floating-point blind_counted_cash_vnd', () => {
    expect(
      BlindCloseShiftSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        blind_counted_cash_vnd: -50000,
      }).success,
    ).toBe(false);

    expect(
      BlindCloseShiftSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        blind_counted_cash_vnd: 120000.75,
      }).success,
    ).toBe(false);
  });

  // 16-17: Warehouse Lot Date & Store Code Validation
  it('16. rejects WarehouseLotCreateSchema when expiry_date is earlier than roast_date', () => {
    const result = WarehouseLotCreateSchema.safeParse({
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-TEST-001',
      roast_date: '2026-11-20',
      expiry_date: '2026-11-10',
      initial_qty: 10000,
      unit_cost_vnd: 120000,
    });
    expect(result.success).toBe(false);
  });

  it('17. rejects CreateStoreSchema with lowercase or invalid store code', () => {
    const result = CreateStoreSchema.safeParse({
      organization_id: SEED_IDS.organization.cf19,
      code: 'store 05',
      name: 'Quán 5',
      type: 'RETAIL_STORE',
      address: '100 Lê Lợi, Thị Trấn',
    });
    expect(result.success).toBe(false);
  });

  // 18-20: Security Key Constants & SEED_IDS UUID Integrity
  it('18. ensures SENSITIVE_COST_KEYS contains all critical origin cost fields', () => {
    expect(SENSITIVE_COST_KEYS).toContain('moving_avg_cost_vnd');
    expect(SENSITIVE_COST_KEYS).toContain('unit_cost_vnd');
    expect(SENSITIVE_COST_KEYS).toContain('shipping_cost_vnd');
    expect(SENSITIVE_COST_KEYS).toContain('raw_import_cost');
    expect(SENSITIVE_COST_KEYS).toContain('cogs_amount_vnd');
  });

  it('19. ensures KDS_FORBIDDEN_FINANCE_KEYS and BLIND_SHIFT_HIDDEN_KEYS contain required masked fields', () => {
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('total_amount_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('cogs_amount_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('unit_price_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('line_total_vnd');
    expect(KDS_FORBIDDEN_FINANCE_KEYS).toContain('payment_method');

    expect(BLIND_SHIFT_HIDDEN_KEYS).toContain('system_expected_cash_vnd');
    expect(BLIND_SHIFT_HIDDEN_KEYS).toContain('variance_cash_vnd');
  });

  it('20. ensures every UUID in SEED_IDS is a valid RFC-4122 UUID matching UuidSchema', () => {
    const allUuids: string[] = [];
    for (const group of Object.values(SEED_IDS)) {
      for (const value of Object.values(group)) {
        allUuids.push(value);
      }
    }
    expect(allUuids.length).toBeGreaterThanOrEqual(40);
    for (const id of allUuids) {
      expect(UuidSchema.safeParse(id).success).toBe(true);
    }
    // Ensure all 8 user accounts (including Store 1 & Store 2 managers) are distinct
    const userIds = Object.values(SEED_IDS.users);
    expect(userIds).toHaveLength(8);
    expect(new Set(userIds).size).toBe(8);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi nguyên văn `C:\bib\cf_19\supabase\seed.sql` theo đúng nội dung mục 3 (File 1).
2. Ghi nguyên văn `C:\bib\cf_19\packages\shared\src\__tests__\schemas.test.ts` theo đúng nội dung mục 3 (File 2).
3. Nếu `C:\bib\cf_19\node_modules` đã tồn tại, chạy lệnh mục 5 để xác nhận toàn bộ 20 test cases đạt `PASS` và `tsc --noEmit` đạt exit code `0`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
npm run test --workspace=@cf19/shared && npm run typecheck --workspace=@cf19/shared
```
