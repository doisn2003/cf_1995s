# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M1.2 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn 14 file (7 + 7).
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1 (`@cf19/shared` + `0001/0002` SQL Migrations + `seed.sql` với định dạng hash `scrypt$<salt>$<64-byte-hex>`).

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# CẤU HÌNH `@cf19/api`, DUAL DATABASE ADAPTER & CORE SERVICES (7 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 7 file dưới đây cho tầng cấu hình, mã hóa PIN `scrypt`, dữ liệu In-Memory Dual-Adapter và Audit Service của `@cf19/api`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi tên file, không đổi tên hàm, không đổi mã hash `scrypt`, không thêm bớt logic.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 7 file trong mục 2. Tuyệt đối KHÔNG chạm vào `middlewares/`, `modules/`, `index.ts`, hay `__tests__/` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install` KHI CHẠY SONG SONG:** Chỉ ghi 7 file và chạy kiểm tra `Test-Path` xác nhận đủ 7 file, trừ khi `@coordinator` yêu cầu chạy `npm install`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (7 TARGET FILES)
1. `C:\bib\cf_19\apps\api\package.json` (Tạo mới)
2. `C:\bib\cf_19\apps\api\tsconfig.json` (Tạo mới)
3. `C:\bib\cf_19\apps\api\src\config\env.ts` (Tạo mới)
4. `C:\bib\cf_19\apps\api\src\services\crypto.service.ts` (Tạo mới)
5. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Tạo mới)
6. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Tạo mới)
7. `C:\bib\cf_19\apps\api\src\services\audit.service.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\package.json`
```json
{
  "name": "@cf19/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@cf19/shared": "*",
    "@supabase/supabase-js": "^2.49.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "helmet": "^8.1.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.13.4",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2",
    "vitest": "^3.0.9"
  }
}
```

### File 2: `C:\bib\cf_19\apps\api\tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": [
      "node"
    ]
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

### File 3: `C:\bib\cf_19\apps\api\src\config\env.ts`
```ts
import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default('*'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  ALLOW_DEV_AUTH: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsedEnv = EnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error(
    `Invalid API environment configuration: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`,
  );
}

export const env = parsedEnv.data;

export const isSupabaseConfigured = Boolean(
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
);

export const supabaseAdmin: SupabaseClient | null =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const dbMode: 'supabase' | 'in_memory' = isSupabaseConfigured
  ? 'supabase'
  : 'in_memory';
```

### File 4: `C:\bib\cf_19\apps\api\src\services\crypto.service.ts`
```ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;

/**
 * Hashes a 6-digit Manager PIN using Node crypto.scryptSync.
 * Format matches supabase/seed.sql 100%: `scrypt$<salt>$<64-byte-hex>`.
 */
export function hashManagerPin(plainPin: string, customSalt?: string): string {
  const salt = customSalt ?? randomBytes(16).toString('hex');
  const derivedHex = scryptSync(plainPin, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${derivedHex}`;
}

/**
 * Constant-time verification of a Manager PIN against stored `scrypt$<salt>$<hex>`.
 */
export function verifyManagerPin(
  plainPin: string,
  storedHash: string | null | undefined,
): boolean {
  if (!plainPin || !storedHash) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [prefix, salt, expectedHex] = parts;
  if (prefix !== SCRYPT_PREFIX || !salt || !expectedHex) {
    return false;
  }

  if (!/^[0-9a-fA-F]+$/.test(expectedHex) || expectedHex.length !== SCRYPT_KEY_LENGTH * 2) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const actualBuffer = scryptSync(plainPin, salt, SCRYPT_KEY_LENGTH);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
```

### File 5: `C:\bib\cf_19\apps\api\src\db\seedData.ts`
```ts
import {
  SEED_IDS,
  type AuditLogDto,
  type EmploymentType,
  type OrganizationDto,
  type PosOrderFullDto,
  type PosOrderItemDto,
  type PosShiftFullDto,
  type StoreDto,
  type UserRole,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
} from '@cf19/shared';

export interface StoredUserRecord {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  assigned_store_id: string | null;
  manager_pin_hash: string | null;
  dev_password: string;
  hourly_rate_vnd: number;
  employment_type: EmploymentType;
  is_active: boolean;
}

export const SEED_ORDER_IDS = {
  store01SampleOrder: '90000000-0000-4000-8000-000000000001',
  store02SampleOrder: '90000000-0000-4000-8000-000000000002',
} as const;

export const SEED_ORDER_ITEM_IDS = {
  store01Item01: '91000000-0000-4000-8000-000000000001',
  store02Item01: '91000000-0000-4000-8000-000000000002',
} as const;

export interface InMemoryDatabaseState {
  organizations: OrganizationDto[];
  stores: StoreDto[];
  users: StoredUserRecord[];
  inventoryItems: WarehouseInventoryItemDto[];
  warehouseLots: WarehouseLotFullDto[];
  posShifts: PosShiftFullDto[];
  posOrders: PosOrderFullDto[];
  posOrderItems: PosOrderItemDto[];
  auditLogs: AuditLogDto[];
}

const BASE_TS = '2026-11-22T01:00:00.000Z';

export function createInitialSeedState(): InMemoryDatabaseState {
  const organizations: OrganizationDto[] = [
    {
      id: SEED_IDS.organization.cf19,
      code: 'CF19',
      name: 'Chuỗi Cung Ứng Kho Tổng Tây Nguyên & Cà Phê CF19',
      tax_code: '6001900019',
      base_currency: 'VND',
      franchise_enabled: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const stores: StoreDto[] = [
    {
      id: SEED_IDS.stores.centralWarehouse,
      organization_id: SEED_IDS.organization.cf19,
      code: 'CW-TAYNGUYEN',
      name: 'Kho Tổng Rang Xay Tây Nguyên',
      type: 'CENTRAL_WAREHOUSE',
      address: 'Khu Công Nghiệp Tân An, TP. Buôn Ma Thuột, Đắk Lắk',
      phone: '02623888001',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store01,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-01',
      name: 'CF19 Quán 1 — Trung Tâm Thị Trấn',
      type: 'RETAIL_STORE',
      address: '19 Trần Phú, Trung Tâm Thị Trấn',
      phone: '02623888101',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store02,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-02',
      name: 'CF19 Quán 2 — Quảng Trường',
      type: 'RETAIL_STORE',
      address: '88 Hùng Vương, Khu Quảng Trường',
      phone: '02623888102',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store03,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-03',
      name: 'CF19 Quán 3 — Đại Lộ Đông Tây',
      type: 'RETAIL_STORE',
      address: '120 Lê Duẩn, Đại Lộ Đông Tây',
      phone: '02623888103',
      price_multiplier: 1.05,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.stores.store04,
      organization_id: SEED_IDS.organization.cf19,
      code: 'STORE-04',
      name: 'CF19 Quán 4 — Công Viên Hồ Điều Hòa',
      type: 'RETAIL_STORE',
      address: '05 Nguyễn Tất Thành, Công Viên Hồ Điều Hòa',
      phone: '02623888104',
      price_multiplier: 1.0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const users: StoredUserRecord[] = [
    {
      id: SEED_IDS.users.superAdmin,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Nguyễn Minh Quân (Chủ Chuỗi)',
      email: 'admin@cf19.vn',
      phone: '0901000001',
      role: 'SUPER_ADMIN',
      assigned_store_id: null,
      manager_pin_hash:
        'scrypt$cf19_salt_admin_01$0c6150e2972c3db6c399d3fae73d4cc8276dd29e0a3ec30e5cfc165555d27a360efe28390ddf69cd04fd12237eb757e901a883fad4e4f3dce236d2d95916fd9b',
      dev_password: 'Cf19@Admin123',
      hourly_rate_vnd: 0,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.warehouseManager,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Trần Văn Hùng (Quản Lý Kho Tổng)',
      email: 'warehouse@cf19.vn',
      phone: '0901000002',
      role: 'WAREHOUSE_MANAGER',
      assigned_store_id: SEED_IDS.stores.centralWarehouse,
      manager_pin_hash: null,
      dev_password: 'Cf19@Warehouse123',
      hourly_rate_vnd: 75000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.storeManager01,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Lê Thị Thảo (Quản Lý Quán 1)',
      email: 'manager.store01@cf19.vn',
      phone: '0901000003',
      role: 'STORE_MANAGER',
      assigned_store_id: SEED_IDS.stores.store01,
      manager_pin_hash:
        'scrypt$cf19_salt_store01_01$79d6ce09a13ca647774e321a7f348bd49eb5b503f76f11bf17cc1c52f16980fb4dabe41e134cb30ac4f0e38ebed46f07c3f174d94c89a0b8c6fba78985129a17',
      dev_password: 'Cf19@Manager01',
      hourly_rate_vnd: 65000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.storeManager02,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Phạm Quốc Bảo (Quản Lý Quán 2)',
      email: 'manager.store02@cf19.vn',
      phone: '0901000004',
      role: 'STORE_MANAGER',
      assigned_store_id: SEED_IDS.stores.store02,
      manager_pin_hash:
        'scrypt$cf19_salt_store02_01$ff4a685894b7d9f52f4e497c27e48b37b944e7e82df0fee18e11a80d5b30de824239bf6cd6ac7094ede07eaf63997f75098ae974af9a4076cb7293c73b8e3247',
      dev_password: 'Cf19@Manager02',
      hourly_rate_vnd: 65000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.cashier01,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Võ Ngọc Linh (Thu Ngân Quán 1)',
      email: 'cashier.store01@cf19.vn',
      phone: '0901000005',
      role: 'CASHIER_STAFF',
      assigned_store_id: SEED_IDS.stores.store01,
      manager_pin_hash: null,
      dev_password: 'Cf19@Cashier01',
      hourly_rate_vnd: 30000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.cashier02,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Đặng Minh Anh (Thu Ngân Quán 2)',
      email: 'cashier.store02@cf19.vn',
      phone: '0901000006',
      role: 'CASHIER_STAFF',
      assigned_store_id: SEED_IDS.stores.store02,
      manager_pin_hash: null,
      dev_password: 'Cf19@Cashier02',
      hourly_rate_vnd: 28000,
      employment_type: 'PART_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.barista01,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Hoàng Gia Huy (Pha Chế Quán 1)',
      email: 'barista.store01@cf19.vn',
      phone: '0901000007',
      role: 'BARISTA_KDS',
      assigned_store_id: SEED_IDS.stores.store01,
      manager_pin_hash: null,
      dev_password: 'Cf19@Barista01',
      hourly_rate_vnd: 32000,
      employment_type: 'FULL_TIME',
      is_active: true,
    },
    {
      id: SEED_IDS.users.barista02,
      organization_id: SEED_IDS.organization.cf19,
      full_name: 'Bùi Tuấn Kiệt (Pha Chế Quán 2)',
      email: 'barista.store02@cf19.vn',
      phone: '0901000008',
      role: 'BARISTA_KDS',
      assigned_store_id: SEED_IDS.stores.store02,
      manager_pin_hash: null,
      dev_password: 'Cf19@Barista02',
      hourly_rate_vnd: 30000,
      employment_type: 'PART_TIME',
      is_active: true,
    },
  ];

  const inventoryItems: WarehouseInventoryItemDto[] = [
    {
      id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'GB-ROB-TN',
      name: 'Cà phê nhân xanh Robusta Đắk Lắk S18',
      category: 'GREEN_BEAN',
      base_unit: 'g',
      min_stock_threshold: 60000,
      moving_avg_cost_vnd: 98000,
      internal_transfer_price_vnd: 0,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.greenArabicaCauDat,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'GB-ARA-CD',
      name: 'Cà phê nhân xanh Arabica Cầu Đất Washed',
      category: 'GREEN_BEAN',
      base_unit: 'g',
      min_stock_threshold: 30000,
      moving_avg_cost_vnd: 165000,
      internal_transfer_price_vnd: 0,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.roastedRobustaMed,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'RC-ROB-MED',
      name: 'Cà phê hạt rang Robusta Medium (Kg)',
      category: 'ROASTED_COFFEE',
      base_unit: 'g',
      min_stock_threshold: 3000,
      moving_avg_cost_vnd: 125000,
      internal_transfer_price_vnd: 155000,
      retail_price_vnd: 210000,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.roastedSignatureBlend,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'RC-BLEND-SIG',
      name: 'Cà phê hạt rang Signature Blend 70/30 (Kg)',
      category: 'ROASTED_COFFEE',
      base_unit: 'g',
      min_stock_threshold: 3000,
      moving_avg_cost_vnd: 158000,
      internal_transfer_price_vnd: 195000,
      retail_price_vnd: 265000,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.condensedMilk,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'ING-COND-MILK',
      name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
      category: 'INGREDIENT',
      base_unit: 'ml',
      min_stock_threshold: 2000,
      moving_avg_cost_vnd: 52,
      internal_transfer_price_vnd: 60,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.freshMilk,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'ING-FRESH-MILK',
      name: 'Sữa tươi thanh trùng DalatMilk không đường',
      category: 'INGREDIENT',
      base_unit: 'ml',
      min_stock_threshold: 5000,
      moving_avg_cost_vnd: 34,
      internal_transfer_price_vnd: 39,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.plasticCup500ml,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'PKG-CUP-500',
      name: 'Ly nhựa PET 500ml kèm nắp cầu in logo CF19',
      category: 'PACKAGING',
      base_unit: 'pcs',
      min_stock_threshold: 200,
      moving_avg_cost_vnd: 1150,
      internal_transfer_price_vnd: 1350,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.inventoryItems.bioStraw,
      organization_id: SEED_IDS.organization.cf19,
      sku: 'PKG-STRAW-BIO',
      name: 'Ống hút sinh học phi 6 bọc giấy',
      category: 'PACKAGING',
      base_unit: 'pcs',
      min_stock_threshold: 300,
      moving_avg_cost_vnd: 180,
      internal_transfer_price_vnd: 220,
      retail_price_vnd: 0,
      is_active: true,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const warehouseLots: WarehouseLotFullDto[] = [
    {
      id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-GB-ROB-001',
      supplier_name: 'HTX Nông Sản Cư Mgar Đắk Lắk',
      moisture_pct: 12.2,
      roast_date: null,
      received_at: '2026-11-01T08:00:00.000Z',
      expiry_date: '2027-11-01',
      initial_qty: 120000,
      remaining_qty: 90000,
      unit_cost_vnd: 95000,
      shipping_cost_vnd: 360000,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-RC-ROB-001',
      supplier_name: 'Xưởng Rang Nội Bộ CF19',
      moisture_pct: 3.1,
      roast_date: '2026-11-10',
      received_at: '2026-11-10T10:30:00.000Z',
      expiry_date: '2027-02-10',
      initial_qty: 24900,
      remaining_qty: 24900,
      unit_cost_vnd: 124500,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.cwRoastedRobusta02,
      store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-CW-RC-ROB-002',
      supplier_name: 'Xưởng Rang Nội Bộ CF19',
      moisture_pct: 3.0,
      roast_date: '2026-11-18',
      received_at: '2026-11-18T14:00:00.000Z',
      expiry_date: '2027-02-18',
      initial_qty: 20000,
      remaining_qty: 20000,
      unit_cost_vnd: 126000,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.store01RoastedRobusta01,
      store_id: SEED_IDS.stores.store01,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-S01-RC-ROB-001',
      supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
      moisture_pct: 3.1,
      roast_date: '2026-11-10',
      received_at: '2026-11-12T07:30:00.000Z',
      expiry_date: '2027-02-10',
      initial_qty: 5000,
      remaining_qty: 4500,
      unit_cost_vnd: 155000,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_IDS.warehouseLots.store02RoastedRobusta01,
      store_id: SEED_IDS.stores.store02,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      lot_code: 'LOT-S02-RC-ROB-001',
      supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
      moisture_pct: 3.1,
      roast_date: '2026-11-10',
      received_at: '2026-11-12T08:15:00.000Z',
      expiry_date: '2027-02-10',
      initial_qty: 5000,
      remaining_qty: 4800,
      unit_cost_vnd: 155000,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const posShifts: PosShiftFullDto[] = [
    {
      id: SEED_IDS.posShifts.store01OpenShift,
      store_id: SEED_IDS.stores.store01,
      cashier_id: SEED_IDS.users.cashier01,
      opened_at: BASE_TS,
      closed_at: null,
      opening_cash_vnd: 2000000,
      blind_counted_cash_vnd: null,
      system_expected_cash_vnd: 2145000,
      variance_cash_vnd: null,
      status: 'OPEN',
      notes: 'Ca sáng Quán 1 khởi tạo mặc định',
    },
  ];

  const posOrders: PosOrderFullDto[] = [
    {
      id: SEED_ORDER_IDS.store01SampleOrder,
      order_code: 'POS-S01-20261122-001',
      store_id: SEED_IDS.stores.store01,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      cashier_id: SEED_IDS.users.cashier01,
      customer_phone: '0988111222',
      payment_method: 'VIETQR',
      payment_status: 'PAID',
      kds_status: 'QUEUED',
      vietqr_ref_code: 'CF19S01001',
      total_amount_vnd: 58000,
      cogs_amount_vnd: 16500,
      bom_deducted_at: null,
      void_approved_by_manager_id: null,
      void_reason: null,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
    {
      id: SEED_ORDER_IDS.store02SampleOrder,
      order_code: 'POS-S02-20261122-001',
      store_id: SEED_IDS.stores.store02,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      cashier_id: SEED_IDS.users.cashier02,
      customer_phone: '0988333444',
      payment_method: 'CASH',
      payment_status: 'PAID',
      kds_status: 'PREPARING',
      vietqr_ref_code: null,
      total_amount_vnd: 70000,
      cogs_amount_vnd: 19200,
      bom_deducted_at: null,
      void_approved_by_manager_id: null,
      void_reason: null,
      created_at: BASE_TS,
      updated_at: BASE_TS,
    },
  ];

  const posOrderItems: PosOrderItemDto[] = [
    {
      id: SEED_ORDER_ITEM_IDS.store01Item01,
      order_id: SEED_ORDER_IDS.store01SampleOrder,
      store_id: SEED_IDS.stores.store01,
      product_id: SEED_IDS.menuProducts.caPheSuaDa,
      variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
      modifiers_json: [
        {
          id: SEED_IDS.menuModifiers.sugar50,
          name: 'Ít đường (50%)',
          price_delta_vnd: 0,
        },
      ],
      quantity: 2,
      unit_price_vnd: 29000,
      line_total_vnd: 58000,
      notes: 'Ít đá',
      created_at: BASE_TS,
    },
    {
      id: SEED_ORDER_ITEM_IDS.store02Item01,
      order_id: SEED_ORDER_IDS.store02SampleOrder,
      store_id: SEED_IDS.stores.store02,
      product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
      variant_id: SEED_IDS.menuVariants.bacXiuM,
      modifiers_json: [],
      quantity: 2,
      unit_price_vnd: 35000,
      line_total_vnd: 70000,
      notes: null,
      created_at: BASE_TS,
    },
  ];

  const auditLogs: AuditLogDto[] = [];

  return {
    organizations,
    stores,
    users,
    inventoryItems,
    warehouseLots,
    posShifts,
    posOrders,
    posOrderItems,
    auditLogs,
  };
}
```

### File 6: `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts`
```ts
import {
  createInitialSeedState,
  type InMemoryDatabaseState,
} from './seedData.js';

let currentState: InMemoryDatabaseState = createInitialSeedState();

export function getInMemoryDb(): InMemoryDatabaseState {
  return currentState;
}

export function resetInMemoryDb(): InMemoryDatabaseState {
  currentState = createInitialSeedState();
  return currentState;
}
```

### File 7: `C:\bib\cf_19\apps\api\src\services\audit.service.ts`
```ts
import { randomUUID } from 'node:crypto';
import type { AuditLogDto } from '@cf19/shared';
import { getInMemoryDb } from '../db/inMemoryDb.js';

export interface RecordAuditLogInput {
  actorId: string;
  storeId: string | null;
  action: string;
  targetTable: string;
  targetId?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
}

export interface ListAuditLogsFilter {
  storeId?: string;
  actorId?: string;
  action?: string;
  targetTable?: string;
  limit?: number;
  offset?: number;
}

/**
 * Appends an immutable audit log record to the relational store.
 * Returned copy is cloned to prevent external mutation of persisted state.
 */
export function recordAuditLog(input: RecordAuditLogInput): AuditLogDto {
  const entry: AuditLogDto = {
    id: randomUUID(),
    actor_id: input.actorId,
    store_id: input.storeId,
    action: input.action,
    target_table: input.targetTable,
    target_id: input.targetId ?? null,
    reason: input.reason ?? null,
    payload_json: structuredClone(input.payload ?? {}),
    created_at: new Date().toISOString(),
  };

  getInMemoryDb().auditLogs.unshift(entry);
  return structuredClone(entry);
}

/**
 * Queries immutable audit logs ordered newest-first with optional filters.
 */
export function listAuditLogs(filter: ListAuditLogsFilter = {}): AuditLogDto[] {
  const {
    storeId,
    actorId,
    action,
    targetTable,
    limit = 50,
    offset = 0,
  } = filter;

  const filtered = getInMemoryDb().auditLogs.filter((entry) => {
    if (storeId && entry.store_id !== storeId) {
      return false;
    }
    if (actorId && entry.actor_id !== actorId) {
      return false;
    }
    if (action && entry.action !== action) {
      return false;
    }
    if (targetTable && entry.target_table !== targetTable) {
      return false;
    }
    return true;
  });

  return filtered
    .slice(offset, offset + limit)
    .map((entry) => structuredClone(entry));
}
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ cả 7 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh kiểm tra tồn tại file (`Test-Path`) ở mục 5 và báo cáo `@coordinator [done]`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\package.json','C:\bib\cf_19\apps\api\tsconfig.json','C:\bib\cf_19\apps\api\src\config\env.ts','C:\bib\cf_19\apps\api\src\services\crypto.service.ts','C:\bib\cf_19\apps\api\src\db\seedData.ts','C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts','C:\bib\cf_19\apps\api\src\services\audit.service.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# 4 TẦNG MIDDLEWARE RBAC, ROUTES, EXPRESS APP & SUPERTEST SUITE (7 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 7 file dưới đây cho các Middleware bảo mật RBAC, Routes, Express Server và Bộ Kiểm Thử Tích Hợp Vitest + Supertest (18 test cases) của `@cf19/api`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi mã lỗi HTTP/JSON, không rút gọn test cases, không sửa tên file hay import `.js`.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 7 file trong mục 2. Tuyệt đối KHÔNG chạm vào 7 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install` KHI CHẠY SONG SONG:** Chỉ ghi 7 file và chạy lệnh `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done]` để Quân Vua điều phối cài đặt và chạy toàn bộ `typecheck` + `vitest`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (7 TARGET FILES)
1. `C:\bib\cf_19\apps\api\src\middlewares\auth.middleware.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\api\src\middlewares\rbac.middleware.ts` (Tạo mới)
3. `C:\bib\cf_19\apps\api\src\modules\auth\auth.routes.ts` (Tạo mới)
4. `C:\bib\cf_19\apps\api\src\modules\stores\stores.routes.ts` (Tạo mới)
5. `C:\bib\cf_19\apps\api\src\modules\audit\audit.routes.ts` (Tạo mới)
6. `C:\bib\cf_19\apps\api\src\index.ts` (Tạo mới)
7. `C:\bib\cf_19\apps\api\src\__tests__\m1-rbac-security.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\api\src\middlewares\auth.middleware.ts`
```ts
import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@cf19/shared';
import { env, supabaseAdmin } from '../config/env.js';
import { getInMemoryDb } from '../db/inMemoryDb.js';

export interface AuthActor {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedStoreId: string | null;
}

export interface ManagerApprovalContext {
  managerId: string;
  managerRole: UserRole;
  storeId: string;
  reason: string;
  auditLogId: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: AuthActor;
      managerApproval?: ManagerApprovalContext;
    }
  }
}

function resolveDevActorById(userId: string): AuthActor | null {
  const user = getInMemoryDb().users.find(
    (u) => u.id === userId && u.is_active,
  );
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    assignedStoreId: user.assigned_store_id,
  };
}

/**
 * Authenticates incoming requests via:
 * 1) `Authorization: Bearer dev:<userId>` (when ALLOW_DEV_AUTH is enabled)
 * 2) `x-dev-user-id: <userId>` header (when ALLOW_DEV_AUTH is enabled)
 * 3) Real Supabase JWT via `supabaseAdmin.auth.getUser(token)`
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const devUserHeader = req.headers['x-dev-user-id'];

  let token: string | null = null;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  }

  if (env.ALLOW_DEV_AUTH) {
    if (token && token.startsWith('dev:')) {
      const userId = token.slice('dev:'.length).trim();
      const actor = resolveDevActorById(userId);
      if (actor) {
        req.actor = actor;
        next();
        return;
      }
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or inactive dev user token',
        },
      });
      return;
    }

    if (typeof devUserHeader === 'string' && devUserHeader.trim().length > 0) {
      const actor = resolveDevActorById(devUserHeader.trim());
      if (actor) {
        req.actor = actor;
        next();
        return;
      }
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or inactive x-dev-user-id header',
        },
      });
      return;
    }
  }

  if (token && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      const actor = resolveDevActorById(data.user.id);
      if (actor) {
        req.actor = actor;
        next();
        return;
      }
    }
  }

  res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}
```

### File 2: `C:\bib\cf_19\apps\api\src\middlewares\rbac.middleware.ts`
```ts
import type { NextFunction, Request, Response } from 'express';
import {
  BLIND_SHIFT_HIDDEN_KEYS,
  KDS_FORBIDDEN_FINANCE_KEYS,
  ManagerPinApprovalSchema,
  SENSITIVE_COST_KEYS,
  STORE_LEVEL_ROLES,
  StoreIdParamSchema,
  type UserRole,
} from '@cf19/shared';
import { getInMemoryDb } from '../db/inMemoryDb.js';
import { recordAuditLog } from '../services/audit.service.js';
import { verifyManagerPin } from '../services/crypto.service.js';

const ALWAYS_STRIPPED_KEYS = new Set<string>([
  'manager_pin_hash',
  'dev_password',
  'encrypted_password',
  'password',
]);

const SENSITIVE_COST_KEY_SET = new Set<string>(SENSITIVE_COST_KEYS);
const KDS_FORBIDDEN_KEY_SET = new Set<string>(KDS_FORBIDDEN_FINANCE_KEYS);
const BLIND_SHIFT_HIDDEN_KEY_SET = new Set<string>(BLIND_SHIFT_HIDDEN_KEYS);
const STORE_LEVEL_ROLE_SET = new Set<UserRole>(STORE_LEVEL_ROLES);

export interface StoreScopeOptions {
  allowWarehouseManager?: boolean;
}

/**
 * Guard 1: Restricts route access to an explicit whitelist of UserRole values.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  const allowedSet = new Set<UserRole>(allowedRoles);
  return (req: Request, res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedSet.has(actor.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Role ${actor.role} is not permitted to access this resource`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Guard 2: Enforces Multi-Tenant Store Isolation across Central Warehouse and Stores 1..4.
 */
export function requireStoreScope(options: StoreScopeOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const parsedParam = StoreIdParamSchema.safeParse({
      storeId: req.params.storeId,
    });
    if (!parsedParam.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORE_ID',
          message: 'Invalid storeId parameter',
          details: parsedParam.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const targetStoreId = parsedParam.data.storeId;

    if (actor.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    if (actor.role === 'WAREHOUSE_MANAGER') {
      if (
        targetStoreId === actor.assignedStoreId ||
        options.allowWarehouseManager === true
      ) {
        next();
        return;
      }

      res.status(403).json({
        error: {
          code: 'FORBIDDEN_WAREHOUSE_SCOPE',
          message: 'WAREHOUSE_MANAGER cannot access operational data of retail stores',
        },
      });
      return;
    }

    if (actor.assignedStoreId !== targetStoreId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_CROSS_TENANT_ACCESS',
          message: 'Cross-branch access denied: user is restricted to assigned store',
        },
      });
      return;
    }

    next();
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively masks confidential cost, KDS finance, blind shift, and credential fields
 * based on the authenticated actor's role.
 */
export function sanitizePayloadForRole(
  value: unknown,
  role: UserRole | undefined,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadForRole(item, role));
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  const isStoreLevelRole = role !== undefined && STORE_LEVEL_ROLE_SET.has(role);
  const isBarista = role === 'BARISTA_KDS';
  const isCashier = role === 'CASHIER_STAFF';
  const isOpenShiftRecord =
    value['status'] === 'OPEN' && 'opening_cash_vnd' in value;

  const sanitized: Record<string, unknown> = {};

  for (const [key, rawFieldValue] of Object.entries(value)) {
    if (ALWAYS_STRIPPED_KEYS.has(key)) {
      continue;
    }

    if (isStoreLevelRole && SENSITIVE_COST_KEY_SET.has(key)) {
      continue;
    }

    if (isBarista && KDS_FORBIDDEN_KEY_SET.has(key)) {
      continue;
    }

    if (isCashier && isOpenShiftRecord && BLIND_SHIFT_HIDDEN_KEY_SET.has(key)) {
      sanitized[key] = null;
      continue;
    }

    sanitized[key] = sanitizePayloadForRole(rawFieldValue, role);
  }

  return sanitized;
}

/**
 * Guard 3: Express Response Interceptor enforcing Cost-Masking, KDS Finance-Masking,
 * Blind Shift Close masking, and credential stripping on every JSON response.
 */
export function sanitizeCostFields() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown): Response => {
      const cleaned = sanitizePayloadForRole(body, req.actor?.role);
      return originalJson(cleaned);
    }) as Response['json'];

    next();
  };
}

/**
 * Guard 4: Cryptographic 6-digit Manager PIN Verification Middleware.
 * Accepts ONLY active SUPER_ADMIN or active STORE_MANAGER assigned to targetStoreId.
 * Always writes an immutable audit log for both APPROVED and FAILED attempts.
 */
export function requireManagerPin(actionName: string, targetTable: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const rawBody = isPlainRecord(req.body) ? req.body : {};
    const targetStoreId =
      typeof req.params.storeId === 'string'
        ? req.params.storeId
        : typeof rawBody['store_id'] === 'string'
          ? rawBody['store_id']
          : actor.assignedStoreId ?? undefined;

    const normalizedPayload = {
      manager_id: rawBody['manager_id'],
      store_id: targetStoreId,
      pin: rawBody['pin'] ?? rawBody['manager_pin'],
      action: typeof rawBody['action'] === 'string' ? rawBody['action'] : actionName,
      target_table:
        typeof rawBody['target_table'] === 'string'
          ? rawBody['target_table']
          : targetTable,
      target_id:
        typeof req.params.orderId === 'string'
          ? req.params.orderId
          : rawBody['target_id'],
      reason: rawBody['reason'] ?? rawBody['void_reason'],
    };

    const parsed = ManagerPinApprovalSchema.safeParse(normalizedPayload);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PIN_PAYLOAD',
          message: 'Invalid Manager PIN approval payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const { manager_id, store_id, pin, target_id, reason } = parsed.data;
    const manager = getInMemoryDb().users.find(
      (u) => u.id === manager_id && u.is_active,
    );

    const isAuthorizedManagerForStore =
      manager !== undefined &&
      (manager.role === 'SUPER_ADMIN' ||
        (manager.role === 'STORE_MANAGER' &&
          manager.assigned_store_id === store_id));

    const isPinValid =
      isAuthorizedManagerForStore &&
      verifyManagerPin(pin, manager.manager_pin_hash);

    if (!isPinValid || !manager) {
      recordAuditLog({
        actorId: actor.id,
        storeId: store_id,
        action: `${actionName}_PIN_FAILED`,
        targetTable,
        targetId: target_id ?? null,
        reason,
        payload: {
          attempted_manager_id: manager_id,
          attempted_manager_role: manager?.role ?? null,
          attempted_manager_store_id: manager?.assigned_store_id ?? null,
          failure_reason: !manager
            ? 'MANAGER_NOT_FOUND'
            : !isAuthorizedManagerForStore
              ? 'MANAGER_SCOPE_MISMATCH'
              : 'PIN_HASH_MISMATCH',
        },
      });

      res.status(403).json({
        error: {
          code: 'INVALID_MANAGER_PIN',
          message:
            'Manager PIN verification failed: requires valid 6-digit PIN of SUPER_ADMIN or STORE_MANAGER for this store',
        },
      });
      return;
    }

    const auditEntry = recordAuditLog({
      actorId: actor.id,
      storeId: store_id,
      action: `${actionName}_PIN_APPROVED`,
      targetTable,
      targetId: target_id ?? null,
      reason,
      payload: {
        approved_by_manager_id: manager.id,
        approved_by_manager_role: manager.role,
      },
    });

    req.managerApproval = {
      managerId: manager.id,
      managerRole: manager.role,
      storeId: store_id,
      reason,
      auditLogId: auditEntry.id,
    };

    next();
  };
}
```

### File 3: `C:\bib\cf_19\apps\api\src\modules\auth\auth.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import { LoginRequestSchema, type AuthenticatedUserDto } from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { StoredUserRecord } from '../../db/seedData.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireManagerPin,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';

export const authRouter = Router();

function toAuthenticatedUserDto(user: StoredUserRecord): AuthenticatedUserDto {
  return {
    id: user.id,
    organization_id: user.organization_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    assigned_store_id: user.assigned_store_id,
    hourly_rate_vnd: user.hourly_rate_vnd,
    employment_type: user.employment_type,
    has_manager_pin: Boolean(user.manager_pin_hash),
    is_active: user.is_active,
  };
}

authRouter.post('/login', sanitizeCostFields(), (req: Request, res: Response) => {
  const parsed = LoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_LOGIN_PAYLOAD',
        message: 'Email and password are required',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const user = getInMemoryDb().users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.is_active,
  );

  if (!user || user.dev_password !== parsed.data.password) {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  recordAuditLog({
    actorId: user.id,
    storeId: user.assigned_store_id,
    action: 'USER_LOGIN',
    targetTable: 'user_profiles',
    targetId: user.id,
    payload: { email: user.email, role: user.role },
  });

  res.status(200).json({
    data: {
      access_token: `dev:${user.id}`,
      token_type: 'Bearer',
      user: toAuthenticatedUserDto(user),
    },
  });
});

authRouter.get(
  '/me',
  authenticate,
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const user = getInMemoryDb().users.find((u) => u.id === actor.id);
    if (!user) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Authenticated user profile not found',
        },
      });
      return;
    }

    res.status(200).json({
      data: toAuthenticatedUserDto(user),
    });
  },
);

authRouter.post(
  '/verify-manager-pin',
  authenticate,
  sanitizeCostFields(),
  requireManagerPin('MANUAL_PIN_VERIFICATION', 'user_profiles'),
  (req: Request, res: Response) => {
    res.status(200).json({
      data: {
        approved: true,
        approval: req.managerApproval,
      },
    });
  },
);
```

### File 4: `C:\bib\cf_19\apps\api\src\modules\stores\stores.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireManagerPin,
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';

export const storesRouter = Router();

/**
 * GET /api/v1/stores
 * SUPER_ADMIN & WAREHOUSE_MANAGER see all 5 nodes; store roles see ONLY their assigned store.
 */
storesRouter.get(
  '/',
  authenticate,
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const actor = req.actor!;
    const db = getInMemoryDb();

    if (actor.role === 'SUPER_ADMIN' || actor.role === 'WAREHOUSE_MANAGER') {
      res.status(200).json({
        data: db.stores.map((s) => structuredClone(s)),
      });
      return;
    }

    const scopedStores = db.stores.filter((s) => s.id === actor.assignedStoreId);
    res.status(200).json({
      data: scopedStores.map((s) => structuredClone(s)),
    });
  },
);

/**
 * GET /api/v1/stores/:storeId
 */
storesRouter.get(
  '/:storeId',
  authenticate,
  requireStoreScope({ allowWarehouseManager: true }),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const store = getInMemoryDb().stores.find((s) => s.id === req.params.storeId);
    if (!store) {
      res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: 'Store not found',
        },
      });
      return;
    }

    res.status(200).json({
      data: structuredClone(store),
    });
  },
);

/**
 * GET /api/v1/stores/:storeId/inventory
 * moving_avg_cost_vnd is automatically stripped for Store Roles by sanitizeCostFields().
 */
storesRouter.get(
  '/:storeId/inventory',
  authenticate,
  requireStoreScope(),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const store = getInMemoryDb().stores.find((s) => s.id === req.params.storeId);
    if (!store) {
      res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: 'Store not found',
        },
      });
      return;
    }

    const items = getInMemoryDb().inventoryItems.map((item) =>
      structuredClone(item),
    );
    res.status(200).json({
      data: items,
      meta: {
        store_id: store.id,
        store_code: store.code,
      },
    });
  },
);

/**
 * GET /api/v1/stores/:storeId/lots
 * Returns lots for the requested store sorted FIFO (roast_date ASC NULLS LAST, received_at ASC).
 * unit_cost_vnd & shipping_cost_vnd are stripped for Store Roles by sanitizeCostFields().
 */
storesRouter.get(
  '/:storeId/lots',
  authenticate,
  requireStoreScope(),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const storeId = req.params.storeId;
    const lots = getInMemoryDb()
      .warehouseLots.filter((lot) => lot.store_id === storeId)
      .sort((a, b) => {
        const aRoast = a.roast_date ?? '9999-12-31';
        const bRoast = b.roast_date ?? '9999-12-31';
        if (aRoast !== bRoast) {
          return aRoast.localeCompare(bRoast);
        }
        return a.received_at.localeCompare(b.received_at);
      })
      .map((lot) => structuredClone(lot));

    res.status(200).json({
      data: lots,
    });
  },
);

/**
 * GET /api/v1/stores/:storeId/shifts/current
 * Enforces Blind Shift Close: CASHIER_STAFF receives null for system_expected_cash_vnd & variance_cash_vnd.
 * WAREHOUSE_MANAGER and BARISTA_KDS are strictly blocked (403 FORBIDDEN_ROLE).
 */
storesRouter.get(
  '/:storeId/shifts/current',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const storeId = req.params.storeId;
    const openShift = getInMemoryDb().posShifts.find(
      (shift) => shift.store_id === storeId && shift.status === 'OPEN',
    );

    if (!openShift) {
      res.status(404).json({
        error: {
          code: 'NO_OPEN_SHIFT',
          message: 'No open shift found for this store',
        },
      });
      return;
    }

    res.status(200).json({
      data: structuredClone(openShift),
    });
  },
);

/**
 * GET /api/v1/stores/:storeId/kds/tickets
 * WAREHOUSE_MANAGER is strictly blocked (403 FORBIDDEN_ROLE).
 * BARISTA_KDS receives tickets with ALL finance & cost keys stripped by sanitizeCostFields().
 */
storesRouter.get(
  '/:storeId/kds/tickets',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const storeId = req.params.storeId;
    const db = getInMemoryDb();

    const tickets = db.posOrders
      .filter(
        (order) =>
          order.store_id === storeId && order.payment_status !== 'VOIDED',
      )
      .map((order) => {
        const items = db.posOrderItems
          .filter((item) => item.order_id === order.id)
          .map((item) => structuredClone(item));

        return {
          ...structuredClone(order),
          items,
        };
      });

    res.status(200).json({
      data: tickets,
    });
  },
);

/**
 * POST /api/v1/stores/:storeId/orders/:orderId/void
 * Requires valid 6-digit Manager PIN from SUPER_ADMIN or same-store STORE_MANAGER.
 * Writes immutable audit logs on both failure and success.
 */
storesRouter.post(
  '/:storeId/orders/:orderId/void',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  requireManagerPin('VOID_POS_ORDER', 'pos_orders'),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const storeId = req.params.storeId;
    const orderId = req.params.orderId;
    const approval = req.managerApproval!;

    const order = getInMemoryDb().posOrders.find(
      (o) => o.id === orderId && o.store_id === storeId,
    );

    if (!order) {
      res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'POS order not found in this store',
        },
      });
      return;
    }

    if (order.payment_status === 'VOIDED') {
      res.status(409).json({
        error: {
          code: 'ORDER_ALREADY_VOIDED',
          message: 'POS order is already voided',
        },
      });
      return;
    }

    order.payment_status = 'VOIDED';
    order.void_approved_by_manager_id = approval.managerId;
    order.void_reason = approval.reason;
    order.updated_at = new Date().toISOString();

    res.status(200).json({
      data: structuredClone(order),
      meta: {
        approval_audit_id: approval.auditLogId,
      },
    });
  },
);
```

### File 5: `C:\bib\cf_19\apps\api\src\modules\audit\audit.routes.ts`
```ts
import { Router, type Request, type Response } from 'express';
import { AuditLogQuerySchema } from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { listAuditLogs } from '../../services/audit.service.js';

export const auditRouter = Router();

/**
 * GET /api/v1/audit-logs
 * Strictly restricted to SUPER_ADMIN.
 */
auditRouter.get(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  (req: Request, res: Response) => {
    const parsed = AuditLogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_AUDIT_QUERY',
          message: 'Invalid audit log query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const logs = listAuditLogs({
      storeId: parsed.data.store_id,
      actorId: parsed.data.actor_id,
      action: parsed.data.action,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    res.status(200).json({
      data: logs,
      meta: {
        count: logs.length,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      },
    });
  },
);
```

### File 6: `C:\bib\cf_19\apps\api\src\index.ts`
```ts
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { dbMode, env } from './config/env.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: '@cf19/api',
      db_mode: dbMode,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/stores', storesRouter);
  app.use('/api/v1/audit-logs', auditRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Requested endpoint does not exist',
      },
    });
  });

  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ): void => {
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            env.NODE_ENV === 'production'
              ? 'An unexpected error occurred'
              : err.message,
        },
      });
    },
  );

  return app;
}

export const app = createApp();

const isTestEnv =
  env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

if (!isTestEnv) {
  app.listen(env.PORT, () => {
    console.log(
      `[@cf19/api] running on http://localhost:${env.PORT} (mode=${dbMode})`,
    );
  });
}
```

### File 7: `C:\bib\cf_19\apps\api\src\__tests__\m1-rbac-security.test.ts`
```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  KDS_FORBIDDEN_FINANCE_KEYS,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
} from '@cf19/shared';
import { resetInMemoryDb } from '../db/inMemoryDb.js';
import { SEED_ORDER_IDS } from '../db/seedData.js';
import { app } from '../index.js';

function authAs(userId: string): Record<string, string> {
  return { Authorization: `Bearer dev:${userId}` };
}

describe('M1.2 — @cf19/api 5-Role RBAC, Multi-Tenant Isolation, Cost Masking, Blind Close & PIN Audit', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. GET /health returns 200 OK with service metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('@cf19/api');
  });

  it('2. rejects unauthenticated requests to /api/v1/auth/me with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('3. POST /api/v1/auth/login authenticates Store 1 Manager and strips manager_pin_hash', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'manager.store01@cf19.vn',
      password: 'Cf19@Manager01',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBe(`dev:${SEED_IDS.users.storeManager01}`);
    expect(res.body.data.user.role).toBe('STORE_MANAGER');
    expect(res.body.data.user.has_manager_pin).toBe(true);
    expect(res.body.data.user).not.toHaveProperty('manager_pin_hash');
    expect(res.body.data.user).not.toHaveProperty('dev_password');
  });

  it('4. GET /api/v1/stores returns all 5 nodes for SUPER_ADMIN & WAREHOUSE_MANAGER, but ONLY Store 1 for STORE_MANAGER Quán 1', async () => {
    const adminRes = await request(app)
      .get('/api/v1/stores')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data).toHaveLength(5);

    const whRes = await request(app)
      .get('/api/v1/stores')
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(whRes.status).toBe(200);
    expect(whRes.body.data).toHaveLength(5);

    const mgr1Res = await request(app)
      .get('/api/v1/stores')
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(mgr1Res.status).toBe(200);
    expect(mgr1Res.body.data).toHaveLength(1);
    expect(mgr1Res.body.data[0].id).toBe(SEED_IDS.stores.store01);
  });

  it('5. Multi-Tenant Isolation: STORE_MANAGER Quán 1 accessing Quán 2 lots is blocked with 403 FORBIDDEN_CROSS_TENANT_ACCESS', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store02}/lots`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('6. Multi-Tenant Isolation: CASHIER_STAFF Quán 1 accessing Quán 2 shift is blocked with 403 FORBIDDEN_CROSS_TENANT_ACCESS', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store02}/shifts/current`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('7. Warehouse Isolation: WAREHOUSE_MANAGER cannot read Store 1 shifts or KDS tickets (403 FORBIDDEN_ROLE)', async () => {
    const shiftRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(shiftRes.status).toBe(403);
    expect(shiftRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const kdsRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/kds/tickets`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(kdsRes.status).toBe(403);
    expect(kdsRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('8. Warehouse Isolation: WAREHOUSE_MANAGER cannot read Store 1 lots (403 FORBIDDEN_WAREHOUSE_SCOPE)', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/lots`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_WAREHOUSE_SCOPE');
  });

  it('9. Cost Visibility (Privileged): WAREHOUSE_MANAGER & SUPER_ADMIN see moving_avg_cost_vnd, unit_cost_vnd & shipping_cost_vnd at Central Warehouse', async () => {
    const invRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.centralWarehouse}/inventory`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(invRes.status).toBe(200);
    expect(invRes.body.data.length).toBe(8);
    expect(invRes.body.data[0].moving_avg_cost_vnd).toBe(98000);

    const lotRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.centralWarehouse}/lots`)
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(lotRes.status).toBe(200);
    expect(lotRes.body.data.length).toBe(3);
    expect(lotRes.body.data[0]).toHaveProperty('unit_cost_vnd');
    expect(lotRes.body.data[0]).toHaveProperty('shipping_cost_vnd');
  });

  it('10. Cost Masking (Store Roles): STORE_MANAGER Quán 1 NEVER receives SENSITIVE_COST_KEYS in inventory or lots responses', async () => {
    const invRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/inventory`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(invRes.status).toBe(200);
    for (const item of invRes.body.data as Record<string, unknown>[]) {
      for (const forbiddenKey of SENSITIVE_COST_KEYS) {
        expect(item).not.toHaveProperty(forbiddenKey);
      }
      expect(item).toHaveProperty('internal_transfer_price_vnd');
    }

    const lotRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/lots`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(lotRes.status).toBe(200);
    expect(lotRes.body.data).toHaveLength(1);
    for (const forbiddenKey of SENSITIVE_COST_KEYS) {
      expect(lotRes.body.data[0]).not.toHaveProperty(forbiddenKey);
    }
  });

  it('11. KDS Finance Masking: BARISTA_KDS Quán 1 sees order tickets & quantities but ZERO financial/cost fields', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/kds/tickets`)
      .set(authAs(SEED_IDS.users.barista01));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const ticket = res.body.data[0] as Record<string, unknown>;
    expect(ticket.order_code).toBe('POS-S01-20261122-001');
    for (const key of [...KDS_FORBIDDEN_FINANCE_KEYS, ...SENSITIVE_COST_KEYS]) {
      expect(ticket).not.toHaveProperty(key);
    }

    const items = ticket.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(2);
    expect(items[0]).not.toHaveProperty('unit_price_vnd');
    expect(items[0]).not.toHaveProperty('line_total_vnd');
  });

  it('12. KDS Cash Block: BARISTA_KDS cannot access shifts/current (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.barista01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('13. Blind Shift Close: CASHIER_STAFF Quán 1 sees OPEN shift with system_expected_cash_vnd & variance_cash_vnd masked to null', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.opening_cash_vnd).toBe(2000000);
    expect(res.body.data.system_expected_cash_vnd).toBeNull();
    expect(res.body.data.variance_cash_vnd).toBeNull();
  });

  it('14. Blind Shift Manager View: STORE_MANAGER Quán 1 sees real system_expected_cash_vnd on Store 1 shift', async () => {
    const res = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.system_expected_cash_vnd).toBe(2145000);
  });

  it('15. Manager PIN Void (Success): CASHIER_STAFF Quán 1 voids Store 1 order with Store 1 Manager PIN (123456) and writes audit log', async () => {
    const voidRes = await request(app)
      .post(
        `/api/v1/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/void`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        manager_id: SEED_IDS.users.storeManager01,
        pin: '123456',
        reason: 'Khách yêu cầu hủy món ngay sau khi in bill',
      });

    expect(voidRes.status).toBe(200);
    expect(voidRes.body.data.payment_status).toBe('VOIDED');
    expect(voidRes.body.data.void_approved_by_manager_id).toBe(
      SEED_IDS.users.storeManager01,
    );
    expect(voidRes.body.data).not.toHaveProperty('cogs_amount_vnd');
    expect(voidRes.body.meta.approval_audit_id).toBeTruthy();

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=VOID_POS_ORDER_PIN_APPROVED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
    expect(auditRes.body.data[0].store_id).toBe(SEED_IDS.stores.store01);
  });

  it('16. Manager PIN Void (Cross-Branch Attack Blocked): Store 2 Manager PIN (654321) CANNOT void Store 1 order (403 + PIN_FAILED audit)', async () => {
    const voidRes = await request(app)
      .post(
        `/api/v1/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/void`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        manager_id: SEED_IDS.users.storeManager02,
        pin: '654321',
        reason: 'Cố tình dùng PIN Quản lý Quán 2 để hủy đơn Quán 1',
      });

    expect(voidRes.status).toBe(403);
    expect(voidRes.body.error.code).toBe('INVALID_MANAGER_PIN');

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=VOID_POS_ORDER_PIN_FAILED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
    expect(auditRes.body.data[0].payload_json.failure_reason).toBe(
      'MANAGER_SCOPE_MISMATCH',
    );
  });

  it('17. Manager PIN Void (Wrong PIN Blocked): Store 1 Manager wrong PIN (999999) is rejected with 403 + PIN_FAILED audit', async () => {
    const voidRes = await request(app)
      .post(
        `/api/v1/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/void`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        manager_id: SEED_IDS.users.storeManager01,
        pin: '999999',
        reason: 'Nhập sai mã PIN quản lý',
      });

    expect(voidRes.status).toBe(403);
    expect(voidRes.body.error.code).toBe('INVALID_MANAGER_PIN');

    const auditRes = await request(app)
      .get('/api/v1/audit-logs?action=VOID_POS_ORDER_PIN_FAILED')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);
    expect(auditRes.body.data[0].payload_json.failure_reason).toBe(
      'PIN_HASH_MISMATCH',
    );
  });

  it('18. Audit Logs RBAC: non-SUPER_ADMIN roles are blocked (403 FORBIDDEN_ROLE); SUPER_ADMIN can query immutable logs', async () => {
    const mgrRes = await request(app)
      .get('/api/v1/audit-logs')
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(mgrRes.status).toBe(403);
    expect(mgrRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const whRes = await request(app)
      .get('/api/v1/audit-logs')
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(whRes.status).toBe(403);
    expect(whRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-manager-pin')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        manager_id: SEED_IDS.users.superAdmin,
        store_id: SEED_IDS.stores.store01,
        pin: '123456',
        action: 'MANUAL_PIN_VERIFICATION',
        target_table: 'user_profiles',
        reason: 'Kiểm tra xác thực PIN của Chủ chuỗi',
      });
    expect(verifyRes.status).toBe(200);

    const adminRes = await request(app)
      .get('/api/v1/audit-logs')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.data[0].action).toBe('MANUAL_PIN_VERIFICATION_PIN_APPROVED');
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ cả 7 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh kiểm tra tồn tại file (`Test-Path`) ở mục 5 và báo cáo `@coordinator [done]`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\api\src\middlewares\auth.middleware.ts','C:\bib\cf_19\apps\api\src\middlewares\rbac.middleware.ts','C:\bib\cf_19\apps\api\src\modules\auth\auth.routes.ts','C:\bib\cf_19\apps\api\src\modules\stores\stores.routes.ts','C:\bib\cf_19\apps\api\src\modules\audit\audit.routes.ts','C:\bib\cf_19\apps\api\src\index.ts','C:\bib\cf_19\apps\api\src\__tests__\m1-rbac-security.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
