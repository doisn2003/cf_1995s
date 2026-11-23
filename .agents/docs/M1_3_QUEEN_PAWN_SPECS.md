# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M1.3 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **16 files (8 + 8)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1 (`@cf19/shared`) & Tiểu phân hệ M1.2 (`@cf19/api`).

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# CẤU HÌNH `@cf19/web`, TYPED API CLIENT, 8-USER AUTH STORE & CORE COMPONENTS (8 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 8 file dưới đây cho cấu hình Vite/React/TS, Typed API Client, Zustand 8-Account Auth Store, RoleGuard + RoleShellHeader và ManagerPinModal của `@cf19/web`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không đổi tên file, không đổi tên hàm/props, không thêm import thừa gây lỗi `noUnusedLocals`.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 8 file trong mục 2. Tuyệt đối KHÔNG chạm vào `layouts/`, `App.tsx`, `main.tsx`, hay `__tests__/` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install` KHI CHẠY SONG SONG:** Chỉ ghi 8 file và chạy lệnh `Test-Path` xác nhận đủ 8 file, rồi báo cáo `@coordinator [done] M1.3 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (8 TARGET FILES)
1. `C:\bib\cf_19\apps\web\package.json` (Tạo mới)
2. `C:\bib\cf_19\apps\web\tsconfig.json` (Tạo mới)
3. `C:\bib\cf_19\apps\web\vite.config.ts` (Tạo mới)
4. `C:\bib\cf_19\apps\web\index.html` (Tạo mới)
5. `C:\bib\cf_19\apps\web\src\api\apiClient.ts` (Tạo mới)
6. `C:\bib\cf_19\apps\web\src\store\authStore.ts` (Tạo mới)
7. `C:\bib\cf_19\apps\web\src\components\RoleGuard.tsx` (Tạo mới)
8. `C:\bib\cf_19\apps\web\src\components\ManagerPinModal.tsx` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\package.json`
```json
{
  "name": "@cf19/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@cf19/shared": "*",
    "lucide-react": "^0.475.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.2.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.8.2",
    "vite": "^6.2.0",
    "vitest": "^3.0.9"
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "isolatedModules": true
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "dist",
    "node_modules"
  ]
}
```

### File 3: `C:\bib\cf_19\apps\web\vite.config.ts`
```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

### File 4: `C:\bib\cf_19\apps\web\index.html`
```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CF19 — Kho Tổng Tây Nguyên &amp; Chuỗi 4 Quán Cà Phê</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body {
        font-family: 'Be Vietnam Pro', system-ui, -apple-system, sans-serif;
      }
    </style>
  </head>
  <body class="bg-stone-50 text-stone-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### File 5: `C:\bib\cf_19\apps\web\src\api\apiClient.ts`
```ts
import {
  BLIND_SHIFT_HIDDEN_KEYS,
  KDS_FORBIDDEN_FINANCE_KEYS,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
  STORE_LEVEL_ROLES,
  type AuditLogDto,
  type AuthenticatedUserDto,
  type PosOrderFullDto,
  type PosShiftFullDto,
  type StoreDto,
  type UserRole,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
} from '@cf19/shared';

export type DataSourceMode = 'live_api' | 'offline_fallback';

export interface ApiCallResult<T> {
  data: T;
  source: DataSourceMode;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export interface VoidOrderRequestPayload {
  manager_id: string;
  pin: string;
  reason: string;
}

export interface VoidOrderResponse {
  order: Partial<PosOrderFullDto> & {
    id: string;
    order_code: string;
    payment_status: string;
    void_approved_by_manager_id: string | null;
    void_reason: string | null;
  };
  approval_audit_id: string;
}

export type AnyInventoryItemRecord = Partial<WarehouseInventoryItemDto> & {
  id: string;
  sku: string;
  name: string;
  category: string;
  base_unit: string;
  min_stock_threshold: number;
  internal_transfer_price_vnd: number;
  retail_price_vnd: number;
};

export type AnyLotRecord = Partial<WarehouseLotFullDto> & {
  id: string;
  store_id: string;
  item_id: string;
  lot_code: string;
  roast_date: string | null;
  remaining_qty: number;
  initial_qty: number;
  status: string;
};

export type AnyShiftRecord = Partial<PosShiftFullDto> & {
  id: string;
  store_id: string;
  cashier_id: string;
  opening_cash_vnd: number;
  status: string;
  system_expected_cash_vnd?: number | null;
  variance_cash_vnd?: number | null;
};

export interface KdsTicketViewRecord {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  kds_status: string;
  payment_status: string;
  created_at: string;
  total_amount_vnd?: number;
  cogs_amount_vnd?: number;
  payment_method?: string;
  items: Array<{
    id: string;
    product_id: string;
    variant_id: string;
    quantity: number;
    notes: string | null;
    unit_price_vnd?: number;
    line_total_vnd?: number;
    modifiers_json: Array<{ id: string; name: string }>;
  }>;
}

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

const FALLBACK_BASE_TS = '2026-11-22T01:00:00.000Z';

const FALLBACK_STORES: StoreDto[] = [
  {
    id: SEED_IDS.stores.centralWarehouse,
    organization_id: SEED_IDS.organization.cf19,
    code: 'CW-TAYNGUYEN',
    name: 'Kho Tổng Rang Xay Tây Nguyên',
    type: 'CENTRAL_WAREHOUSE',
    address: 'KCN Tân An, TP. Buôn Ma Thuột, Đắk Lắk',
    phone: '02623888001',
    price_multiplier: 1,
    is_active: true,
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
  },
  {
    id: SEED_IDS.stores.store01,
    organization_id: SEED_IDS.organization.cf19,
    code: 'STORE-01',
    name: 'CF19 Quán 1 — Trung Tâm Thị Trấn',
    type: 'RETAIL_STORE',
    address: '19 Trần Phú, Trung Tâm Thị Trấn',
    phone: '02623888101',
    price_multiplier: 1,
    is_active: true,
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
  },
  {
    id: SEED_IDS.stores.store02,
    organization_id: SEED_IDS.organization.cf19,
    code: 'STORE-02',
    name: 'CF19 Quán 2 — Quảng Trường',
    type: 'RETAIL_STORE',
    address: '88 Hùng Vương, Khu Quảng Trường',
    phone: '02623888102',
    price_multiplier: 1,
    is_active: true,
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
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
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
  },
  {
    id: SEED_IDS.stores.store04,
    organization_id: SEED_IDS.organization.cf19,
    code: 'STORE-04',
    name: 'CF19 Quán 4 — Công Viên Hồ Điều Hòa',
    type: 'RETAIL_STORE',
    address: '05 Nguyễn Tất Thành, Công Viên Hồ Điều Hòa',
    phone: '02623888104',
    price_multiplier: 1,
    is_active: true,
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
  },
];

const FALLBACK_INVENTORY: WarehouseInventoryItemDto[] = [
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
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
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
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
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
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
  },
];

const FALLBACK_LOTS: WarehouseLotFullDto[] = [
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
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
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
    created_at: FALLBACK_BASE_TS,
    updated_at: FALLBACK_BASE_TS,
  },
];

const STORE_ROLE_SET = new Set<UserRole>(STORE_LEVEL_ROLES);
const COST_KEY_SET = new Set<string>(SENSITIVE_COST_KEYS);
const KDS_KEY_SET = new Set<string>(KDS_FORBIDDEN_FINANCE_KEYS);
const BLIND_KEY_SET = new Set<string>(BLIND_SHIFT_HIDDEN_KEYS);

function stripKeysForRole<T>(value: T, role: UserRole): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripKeysForRole(entry, role)) as T;
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const isStoreRole = STORE_ROLE_SET.has(role);
  const isBarista = role === 'BARISTA_KDS';
  const isCashier = role === 'CASHIER_STAFF';
  const isOpenShift = record['status'] === 'OPEN' && 'opening_cash_vnd' in record;

  const out: Record<string, unknown> = {};
  for (const [key, fieldVal] of Object.entries(record)) {
    if (isStoreRole && COST_KEY_SET.has(key)) {
      continue;
    }
    if (isBarista && KDS_KEY_SET.has(key)) {
      continue;
    }
    if (isCashier && isOpenShift && BLIND_KEY_SET.has(key)) {
      out[key] = null;
      continue;
    }
    out[key] = stripKeysForRole(fieldVal, role);
  }

  return out as T;
}

export function getFallbackInventoryForRole(
  role: UserRole,
): AnyInventoryItemRecord[] {
  return stripKeysForRole(FALLBACK_INVENTORY, role);
}

export function getFallbackLotsForRole(
  storeId: string,
  role: UserRole,
): AnyLotRecord[] {
  const scoped = FALLBACK_LOTS.filter((lot) => lot.store_id === storeId);
  return stripKeysForRole(scoped, role);
}

export function getFallbackCurrentShift(
  storeId: string,
  role: UserRole,
): AnyShiftRecord {
  const rawShift: PosShiftFullDto = {
    id: SEED_IDS.posShifts.store01OpenShift,
    store_id: storeId,
    cashier_id: SEED_IDS.users.cashier01,
    opened_at: FALLBACK_BASE_TS,
    closed_at: null,
    opening_cash_vnd: 2000000,
    blind_counted_cash_vnd: null,
    system_expected_cash_vnd: 2145000,
    variance_cash_vnd: null,
    status: 'OPEN',
    notes: 'Ca sáng khởi tạo (offline preview fallback)',
  };
  return stripKeysForRole(rawShift, role);
}

export function getFallbackKdsTickets(
  storeId: string,
  role: UserRole,
): KdsTicketViewRecord[] {
  const rawTickets: KdsTicketViewRecord[] = [
    {
      id: '90000000-0000-4000-8000-000000000001',
      order_code: 'POS-S01-20261122-001',
      store_id: storeId,
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      kds_status: 'QUEUED',
      payment_status: 'PAID',
      created_at: new Date(Date.now() - 4 * 60_000).toISOString(),
      total_amount_vnd: 58000,
      cogs_amount_vnd: 16500,
      payment_method: 'VIETQR',
      items: [
        {
          id: '91000000-0000-4000-8000-000000000001',
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 2,
          notes: 'Ít đá',
          unit_price_vnd: 29000,
          line_total_vnd: 58000,
          modifiers_json: [
            { id: SEED_IDS.menuModifiers.sugar50, name: 'Ít đường (50%)' },
          ],
        },
      ],
    },
  ];
  return stripKeysForRole(rawTickets, role);
}

async function requestJson<T>(
  path: string,
  actorId: string | null,
  init: RequestInit = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (actorId) {
    headers.set('Authorization', `Bearer dev:${actorId}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json()) as {
    data?: T;
    meta?: Record<string, unknown>;
    error?: { code?: string; message?: string };
  };

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      payload.error?.code ?? 'API_ERROR',
      payload.error?.message ?? `HTTP ${response.status}`,
    );
  }

  return {
    data: payload.data as T,
    meta: payload.meta,
  };
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ access_token: string; user: AuthenticatedUserDto }> {
  const res = await requestJson<{
    access_token: string;
    user: AuthenticatedUserDto;
  }>('/api/v1/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

export async function fetchCurrentUser(
  actorId: string,
): Promise<AuthenticatedUserDto> {
  const res = await requestJson<AuthenticatedUserDto>(
    '/api/v1/auth/me',
    actorId,
  );
  return res.data;
}

export async function verifyManagerPinApi(
  actorId: string,
  payload: {
    manager_id: string;
    store_id: string;
    pin: string;
    action: string;
    target_table: string;
    target_id?: string;
    reason: string;
  },
): Promise<{ approved: boolean; approval: { auditLogId: string } }> {
  const res = await requestJson<{
    approved: boolean;
    approval: { auditLogId: string };
  }>('/api/v1/auth/verify-manager-pin', actorId, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function fetchStores(
  actorId: string,
  role: UserRole,
  assignedStoreId: string | null,
): Promise<ApiCallResult<StoreDto[]>> {
  try {
    const res = await requestJson<StoreDto[]>('/api/v1/stores', actorId);
    return { data: res.data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const fallback =
      role === 'SUPER_ADMIN' || role === 'WAREHOUSE_MANAGER'
        ? FALLBACK_STORES
        : FALLBACK_STORES.filter((s) => s.id === assignedStoreId);
    return { data: fallback, source: 'offline_fallback' };
  }
}

export async function fetchStoreInventory(
  actorId: string,
  storeId: string,
  role: UserRole,
): Promise<ApiCallResult<AnyInventoryItemRecord[]>> {
  try {
    const res = await requestJson<AnyInventoryItemRecord[]>(
      `/api/v1/stores/${storeId}/inventory`,
      actorId,
    );
    return { data: res.data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return {
      data: getFallbackInventoryForRole(role),
      source: 'offline_fallback',
    };
  }
}

export async function fetchStoreLots(
  actorId: string,
  storeId: string,
  role: UserRole,
): Promise<ApiCallResult<AnyLotRecord[]>> {
  try {
    const res = await requestJson<AnyLotRecord[]>(
      `/api/v1/stores/${storeId}/lots`,
      actorId,
    );
    return { data: res.data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return {
      data: getFallbackLotsForRole(storeId, role),
      source: 'offline_fallback',
    };
  }
}

export async function fetchCurrentShift(
  actorId: string,
  storeId: string,
  role: UserRole,
): Promise<ApiCallResult<AnyShiftRecord>> {
  try {
    const res = await requestJson<AnyShiftRecord>(
      `/api/v1/stores/${storeId}/shifts/current`,
      actorId,
    );
    return { data: res.data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return {
      data: getFallbackCurrentShift(storeId, role),
      source: 'offline_fallback',
    };
  }
}

export async function fetchKdsTickets(
  actorId: string,
  storeId: string,
  role: UserRole,
): Promise<ApiCallResult<KdsTicketViewRecord[]>> {
  try {
    const res = await requestJson<KdsTicketViewRecord[]>(
      `/api/v1/stores/${storeId}/kds/tickets`,
      actorId,
    );
    return { data: res.data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return {
      data: getFallbackKdsTickets(storeId, role),
      source: 'offline_fallback',
    };
  }
}

export async function voidPosOrder(
  actorId: string,
  storeId: string,
  orderId: string,
  payload: VoidOrderRequestPayload,
): Promise<VoidOrderResponse> {
  const res = await requestJson<VoidOrderResponse['order']>(
    `/api/v1/stores/${storeId}/orders/${orderId}/void`,
    actorId,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return {
    order: res.data,
    approval_audit_id: String(res.meta?.approval_audit_id ?? ''),
  };
}

export async function fetchAuditLogs(
  actorId: string,
): Promise<ApiCallResult<AuditLogDto[]>> {
  try {
    const res = await requestJson<AuditLogDto[]>(
      '/api/v1/audit-logs?limit=50',
      actorId,
    );
    return { data: res.data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return { data: [], source: 'offline_fallback' };
  }
}
```

### File 6: `C:\bib\cf_19\apps\web\src\store\authStore.ts`
```ts
import { create } from 'zustand';
import { SEED_IDS, type UserRole } from '@cf19/shared';

export interface AuthActor {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  assignedStoreId: string | null;
  storeLabel: string;
  pinHint?: string;
}

export const SEED_ACTORS: readonly AuthActor[] = [
  {
    id: SEED_IDS.users.superAdmin,
    fullName: 'Nguyễn Minh Quân (Chủ Chuỗi)',
    email: 'admin@cf19.vn',
    role: 'SUPER_ADMIN',
    assignedStoreId: null,
    storeLabel: 'Toàn Hệ Thống (Kho Tổng + 4 Quán)',
    pinHint: 'PIN: 123456',
  },
  {
    id: SEED_IDS.users.warehouseManager,
    fullName: 'Trần Văn Hùng (Quản Lý Kho Tổng)',
    email: 'warehouse@cf19.vn',
    role: 'WAREHOUSE_MANAGER',
    assignedStoreId: SEED_IDS.stores.centralWarehouse,
    storeLabel: 'CW-TAYNGUYEN (Kho Tổng)',
  },
  {
    id: SEED_IDS.users.storeManager01,
    fullName: 'Lê Thị Thảo (Quản Lý Quán 1)',
    email: 'manager.store01@cf19.vn',
    role: 'STORE_MANAGER',
    assignedStoreId: SEED_IDS.stores.store01,
    storeLabel: 'STORE-01 (Quán 1)',
    pinHint: 'PIN: 123456',
  },
  {
    id: SEED_IDS.users.storeManager02,
    fullName: 'Phạm Quốc Bảo (Quản Lý Quán 2)',
    email: 'manager.store02@cf19.vn',
    role: 'STORE_MANAGER',
    assignedStoreId: SEED_IDS.stores.store02,
    storeLabel: 'STORE-02 (Quán 2)',
    pinHint: 'PIN: 654321',
  },
  {
    id: SEED_IDS.users.cashier01,
    fullName: 'Võ Ngọc Linh (Thu Ngân Quán 1)',
    email: 'cashier.store01@cf19.vn',
    role: 'CASHIER_STAFF',
    assignedStoreId: SEED_IDS.stores.store01,
    storeLabel: 'STORE-01 (Quán 1)',
  },
  {
    id: SEED_IDS.users.cashier02,
    fullName: 'Đặng Minh Anh (Thu Ngân Quán 2)',
    email: 'cashier.store02@cf19.vn',
    role: 'CASHIER_STAFF',
    assignedStoreId: SEED_IDS.stores.store02,
    storeLabel: 'STORE-02 (Quán 2)',
  },
  {
    id: SEED_IDS.users.barista01,
    fullName: 'Hoàng Gia Huy (Pha Chế Quán 1)',
    email: 'barista.store01@cf19.vn',
    role: 'BARISTA_KDS',
    assignedStoreId: SEED_IDS.stores.store01,
    storeLabel: 'STORE-01 (Quán 1)',
  },
  {
    id: SEED_IDS.users.barista02,
    fullName: 'Bùi Tuấn Kiệt (Pha Chế Quán 2)',
    email: 'barista.store02@cf19.vn',
    role: 'BARISTA_KDS',
    assignedStoreId: SEED_IDS.stores.store02,
    storeLabel: 'STORE-02 (Quán 2)',
  },
] as const;

export function getRoleDefaultRoute(actor: AuthActor): string {
  switch (actor.role) {
    case 'SUPER_ADMIN':
      return '/executive';
    case 'WAREHOUSE_MANAGER':
      return '/warehouse';
    case 'STORE_MANAGER':
      return `/store/${actor.assignedStoreId}/manage`;
    case 'CASHIER_STAFF':
      return `/store/${actor.assignedStoreId}/pos`;
    case 'BARISTA_KDS':
      return `/store/${actor.assignedStoreId}/kds`;
  }
}

export function canAccessStore(
  actor: AuthActor,
  targetStoreId: string,
): boolean {
  if (actor.role === 'SUPER_ADMIN') {
    return true;
  }
  if (actor.role === 'WAREHOUSE_MANAGER') {
    return targetStoreId === SEED_IDS.stores.centralWarehouse;
  }
  return actor.assignedStoreId === targetStoreId;
}

interface AuthStoreState {
  currentActor: AuthActor | null;
  loginAsActorId: (actorId: string) => AuthActor | null;
  logout: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  currentActor: null,
  loginAsActorId: (actorId: string): AuthActor | null => {
    const found = SEED_ACTORS.find((a) => a.id === actorId) ?? null;
    set({ currentActor: found });
    return found;
  },
  logout: (): void => {
    set({ currentActor: null });
  },
}));
```

### File 7: `C:\bib\cf_19\apps\web\src\components\RoleGuard.tsx`
```tsx
import type { ReactNode } from 'react';
import { ShieldAlert, LogOut, ArrowRightLeft } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { UserRole } from '@cf19/shared';
import {
  SEED_ACTORS,
  canAccessStore,
  getRoleDefaultRoute,
  useAuthStore,
} from '../store/authStore';

export interface RoleGuardProps {
  allowedRoles: readonly UserRole[];
  requireStoreMatch?: boolean;
  children: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  requireStoreMatch = false,
  children,
}: RoleGuardProps) {
  const currentActor = useAuthStore((s) => s.currentActor);
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  if (!currentActor) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentActor.role)) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-red-700">
            403 — FORBIDDEN_ROLE
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Vai trò <span className="font-semibold">{currentActor.role}</span>{' '}
            không có quyền truy cập phân hệ này.
          </p>
          <button
            type="button"
            onClick={() => navigate(getRoleDefaultRoute(currentActor))}
            className="mt-6 px-5 py-2.5 rounded-xl bg-amber-700 text-white font-medium hover:bg-amber-800 transition"
          >
            Quay về màn hình mặc định
          </button>
        </div>
      </div>
    );
  }

  if (requireStoreMatch && storeId && !canAccessStore(currentActor, storeId)) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-red-300 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-red-700">
            403 — FORBIDDEN_CROSS_TENANT_ACCESS
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Tài khoản <span className="font-semibold">{currentActor.fullName}</span>{' '}
            chỉ được phép thao tác trong chi nhánh{' '}
            <span className="font-mono font-semibold">{currentActor.storeLabel}</span>.
            Hệ thống đã chặn truy cập trái phép vào chi nhánh{' '}
            <span className="font-mono">{storeId}</span>.
          </p>
          <button
            type="button"
            onClick={() => navigate(getRoleDefaultRoute(currentActor))}
            className="mt-6 px-5 py-2.5 rounded-xl bg-amber-700 text-white font-medium hover:bg-amber-800 transition"
          >
            Trở về chi nhánh của tôi
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export interface RoleShellHeaderProps {
  title: string;
  subtitle: string;
  badgeText: string;
  dark?: boolean;
}

export function RoleShellHeader({
  title,
  subtitle,
  badgeText,
  dark = false,
}: RoleShellHeaderProps) {
  const currentActor = useAuthStore((s) => s.currentActor);
  const loginAsActorId = useAuthStore((s) => s.loginAsActorId);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleSwitchAccount = (actorId: string) => {
    const nextActor = loginAsActorId(actorId);
    if (nextActor) {
      navigate(getRoleDefaultRoute(nextActor));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={
        dark
          ? 'bg-stone-900 border-b border-stone-800 text-stone-100 px-6 py-4'
          : 'bg-white border-b border-stone-200 text-stone-900 px-6 py-4'
      }
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            <span
              className={
                dark
                  ? 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800'
              }
            >
              {badgeText}
            </span>
          </div>
          <p className={dark ? 'text-xs text-stone-400 mt-0.5' : 'text-xs text-stone-500 mt-0.5'}>
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 opacity-60" />
            <select
              aria-label="Chuyển đổi tài khoản RBAC"
              value={currentActor?.id ?? ''}
              onChange={(e) => handleSwitchAccount(e.target.value)}
              className={
                dark
                  ? 'text-xs rounded-lg bg-stone-800 border border-stone-700 text-stone-100 px-3 py-2'
                  : 'text-xs rounded-lg bg-stone-50 border border-stone-300 text-stone-800 px-3 py-2'
              }
            >
              {SEED_ACTORS.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  [{actor.role}] {actor.fullName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={
              dark
                ? 'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                : 'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700'
            }
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
```

### File 8: `C:\bib\cf_19\apps\web\src\components\ManagerPinModal.tsx`
```tsx
import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldAlert, X } from 'lucide-react';
import { ManagerPinSchema, SEED_IDS } from '@cf19/shared';
import { ApiClientError } from '../api/apiClient';

export interface ManagerPinSubmitPayload {
  manager_id: string;
  pin: string;
  reason: string;
}

export interface ManagerPinModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  storeId: string;
  onClose: () => void;
  onConfirm: (payload: ManagerPinSubmitPayload) => Promise<void>;
}

const MANAGER_OPTIONS = [
  {
    id: SEED_IDS.users.storeManager01,
    label: 'Lê Thị Thảo — Quản Lý Quán 1 (PIN mẫu: 123456)',
  },
  {
    id: SEED_IDS.users.storeManager02,
    label: 'Phạm Quốc Bảo — Quản Lý Quán 2 (PIN mẫu: 654321 — Test chặn chéo chi nhánh)',
  },
  {
    id: SEED_IDS.users.superAdmin,
    label: 'Nguyễn Minh Quân — Chủ Chuỗi SUPER_ADMIN (PIN mẫu: 123456)',
  },
] as const;

export function ManagerPinModal({
  isOpen,
  title,
  description,
  storeId,
  onClose,
  onConfirm,
}: ManagerPinModalProps) {
  const [managerId, setManagerId] = useState<string>(SEED_IDS.users.storeManager01);
  const [pin, setPin] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const pinCheck = ManagerPinSchema.safeParse(pin);
    if (!pinCheck.success) {
      setErrorMessage('Mã PIN Quản lý bắt buộc gồm đúng 6 chữ số (0-9).');
      return;
    }

    if (reason.trim().length < 3) {
      setErrorMessage('Vui lòng nhập lý do hủy hóa đơn (tối thiểu 3 ký tự).');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        manager_id: managerId,
        pin: pinCheck.data,
        reason: reason.trim(),
      });
      setPin('');
      setReason('');
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Xác thực PIN thất bại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900">
            <KeyRound className="w-5 h-5" />
            <h2 className="font-bold text-base">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-stone-600">{description}</p>
          <p className="text-[11px] font-mono text-stone-500">
            Chi nhánh áp dụng: {storeId}
          </p>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Chọn Quản lý phê duyệt
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {MANAGER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã PIN 6 chữ số (Xác thực scrypt Backend)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm tracking-widest font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Lý do phê duyệt (Ghi bất biến vào audit_logs)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Khách đổi món trước khi pha chế"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Đang kiểm chứng PIN...' : 'Xác nhận phê duyệt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ cả 8 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh kiểm tra tồn tại file (`Test-Path`) ở mục 5 và báo cáo `@coordinator [done] M1.3 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\package.json','C:\bib\cf_19\apps\web\tsconfig.json','C:\bib\cf_19\apps\web\vite.config.ts','C:\bib\cf_19\apps\web\index.html','C:\bib\cf_19\apps\web\src\api\apiClient.ts','C:\bib\cf_19\apps\web\src\store\authStore.ts','C:\bib\cf_19\apps\web\src\components\RoleGuard.tsx','C:\bib\cf_19\apps\web\src\components\ManagerPinModal.tsx') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# 5 FILE LAYOUT ĐỘC LẬP CHO 5 ROLE, `App.tsx`, `main.tsx` & VITEST SUITE (8 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 8 file dưới đây cho 5 giao diện Layout độc lập của 5 Role, điểm định tuyến `App.tsx`, `main.tsx` và bộ Vitest Frontend Unit Tests (`m1-role-routing.test.ts`).

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Tuyệt đối KHÔNG gộp 5 Layout thành 1 file, không sửa tên export hay props.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 8 file trong mục 2. Tuyệt đối KHÔNG chạm vào 8 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install` KHI CHẠY SONG SONG:** Chỉ ghi 8 file và chạy lệnh `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M1.3 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (8 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx` (Tạo mới)
3. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (Tạo mới)
4. `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx` (Tạo mới)
5. `C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx` (Tạo mới)
6. `C:\bib\cf_19\apps\web\src\App.tsx` (Tạo mới)
7. `C:\bib\cf_19\apps\web\src\main.tsx` (Tạo mới)
8. `C:\bib\cf_19\apps\web\src\__tests__\m1-role-routing.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { Building2, FileText, ShieldCheck } from 'lucide-react';
import { SEED_IDS, type AuditLogDto, type StoreDto } from '@cf19/shared';
import {
  fetchAuditLogs,
  fetchStoreInventory,
  fetchStores,
  type AnyInventoryItemRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { useAuthStore } from '../store/authStore';

export function ExecutiveLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [storesRes, invRes, auditRes] = await Promise.all([
        fetchStores(actor.id, actor.role, actor.assignedStoreId),
        fetchStoreInventory(actor.id, SEED_IDS.stores.centralWarehouse, actor.role),
        fetchAuditLogs(actor.id),
      ]);
      if (!active) {
        return;
      }
      setStores(storesRes.data);
      setInventory(invRes.data);
      setAuditLogs(auditRes.data);
      setSource(storesRes.source);
    };
    void load();
    return () => {
      active = false;
    };
  }, [actor.id, actor.role, actor.assignedStoreId]);

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Executive Command Center — Chủ Chuỗi CF19"
        subtitle={`Toàn quyền P&L, giá vốn MAC Tây Nguyên & Nhật ký bất biến (${source})`}
        badgeText="SUPER_ADMIN"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-base">
              Hệ thống 5 Điểm Vận Hành (1 Kho Tổng + 4 Quán Cà Phê)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="rounded-xl border border-stone-200 p-4 bg-stone-50"
              >
                <div className="text-xs font-mono font-bold text-amber-800">
                  {store.code}
                </div>
                <div className="text-sm font-semibold mt-1">{store.name}</div>
                <div className="text-xs text-stone-500 mt-1">{store.type}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h2 className="font-bold text-base">
              Danh mục Vật tư &amp; Giá vốn MAC Tây Nguyên (Chỉ Chủ Chuỗi &amp; Kho Tổng thấy)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Tên vật tư</th>
                  <th className="px-4 py-2.5">Đơn vị</th>
                  <th className="px-4 py-2.5 text-right">Giá vốn MAC (VNĐ)</th>
                  <th className="px-4 py-2.5 text-right">Giá chuyển nội bộ (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5">{item.base_unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {item.moving_avg_cost_vnd !== undefined
                        ? item.moving_avg_cost_vnd.toLocaleString('vi-VN')
                        : 'MASKED'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {item.internal_transfer_price_vnd.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-base">
              Nhật ký Audit Logs Bất Biến ({auditLogs.length} bản ghi)
            </h2>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-stone-500">
              Chưa có thao tác phê duyệt PIN hoặc hủy đơn nào trong phiên hiện tại.
            </p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex flex-wrap justify-between gap-2"
                >
                  <div>
                    <span className="font-mono font-bold text-indigo-800">
                      {log.action}
                    </span>{' '}
                    — <span className="text-stone-600">{log.reason ?? log.target_table}</span>
                  </div>
                  <div className="font-mono text-stone-500">{log.created_at}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { Boxes, Flame, Lock } from 'lucide-react';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchStoreInventory,
  fetchStoreLots,
  type AnyInventoryItemRecord,
  type AnyLotRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { useAuthStore } from '../store/authStore';

export function WarehouseLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [lots, setLots] = useState<AnyLotRecord[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [invRes, lotsRes] = await Promise.all([
        fetchStoreInventory(actor.id, SEED_IDS.stores.centralWarehouse, actor.role),
        fetchStoreLots(actor.id, SEED_IDS.stores.centralWarehouse, actor.role),
      ]);
      if (!active) {
        return;
      }
      setInventory(invRes.data);
      setLots(lotsRes.data);
      setSource(invRes.source);
    };
    void load();
    return () => {
      active = false;
    };
  }, [actor.id, actor.role]);

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Kho Tổng Rang Xay Tây Nguyên (WMS & FIFO)"
        subtitle={`Quản lý nhập nhân xanh, mẻ rang FIFO & cung ứng nội bộ (${source})`}
        badgeText="WAREHOUSE_MANAGER"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Phân vùng bảo mật RBAC: Quản lý Kho Tổng xem đầy đủ giá vốn MAC và lô hàng FIFO Tây Nguyên;
            tuyệt đối không có quyền truy cập doanh thu bán nước hay két tiền của 4 Quán.
          </span>
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-600" />
            <h2 className="font-bold text-base">
              Tồn kho theo Lô hàng FIFO tại Kho Tổng ({lots.length} lô)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5">Mã Lô (FIFO)</th>
                  <th className="px-4 py-2.5">Ngày Rang</th>
                  <th className="px-4 py-2.5 text-right">Còn lại</th>
                  <th className="px-4 py-2.5 text-right">Đơn giá nhập (VNĐ)</th>
                  <th className="px-4 py-2.5 text-right">Cước vận chuyển (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-xs">
                      {lot.lot_code}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {lot.roast_date ?? 'Nhân xanh chưa rang'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {lot.remaining_qty.toLocaleString('vi-VN')} /{' '}
                      {lot.initial_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {(lot.unit_cost_vnd ?? 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {(lot.shipping_cost_vnd ?? 0).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-base">
              Danh mục Vật tư Kho Tổng &amp; Giá vốn Bình quân Gia quyền (MAC)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200 p-4 bg-stone-50"
              >
                <div className="text-xs font-mono text-stone-500">{item.sku}</div>
                <div className="font-semibold text-sm mt-1">{item.name}</div>
                <div className="mt-2 text-xs text-emerald-700 font-mono font-bold">
                  MAC: {(item.moving_avg_cost_vnd ?? 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { EyeOff, ShieldAlert, Store } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchStoreInventory,
  fetchStoreLots,
  type AnyInventoryItemRecord,
  type AnyLotRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { useAuthStore } from '../store/authStore';

export function StoreManagerLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [lots, setLots] = useState<AnyLotRecord[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [invRes, lotsRes] = await Promise.all([
        fetchStoreInventory(actor.id, activeStoreId, actor.role),
        fetchStoreLots(actor.id, activeStoreId, actor.role),
      ]);
      if (!active) {
        return;
      }
      setInventory(invRes.data);
      setLots(lotsRes.data);
      setSource(invRes.source);
    };
    void load();
    return () => {
      active = false;
    };
  }, [actor.id, actor.role, activeStoreId]);

  const otherStoreId =
    activeStoreId === SEED_IDS.stores.store01
      ? SEED_IDS.stores.store02
      : SEED_IDS.stores.store01;

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title={`Quản Lý Chi Nhánh — ${actor.storeLabel}`}
        subtitle={`Cách ly dữ liệu Multi-Tenant & Ẩn tuyệt đối giá vốn gốc Tây Nguyên (${source})`}
        badgeText="STORE_MANAGER"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-indigo-900">
            <EyeOff className="w-4 h-4 shrink-0" />
            <span>
              Chế độ Cost-Masking đang bật: Mọi cột giá nhập gốc (
              <code>moving_avg_cost_vnd</code>, <code>unit_cost_vnd</code>,{' '}
              <code>shipping_cost_vnd</code>) đã bị cắt bỏ hoàn toàn khỏi JSON trả về.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/store/${otherStoreId}/manage`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Thử truy cập trái phép Quán khác (Test 403)
          </button>
        </div>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-base">
              Danh mục Nguyên liệu Chi nhánh (Chỉ hiển thị Giá chuyển nội bộ)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Tên nguyên liệu</th>
                  <th className="px-4 py-2.5 text-right">Giá vốn Tây Nguyên</th>
                  <th className="px-4 py-2.5 text-right">Giá hạch toán nội bộ (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-red-600 font-semibold">
                      {'moving_avg_cost_vnd' in item
                        ? String(item.moving_avg_cost_vnd)
                        : 'ĐÃ ẨN (STRIPPED)'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold">
                      {item.internal_transfer_price_vnd.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="font-bold text-base mb-3">
            Lô hàng tại Chi nhánh ({lots.length} lô — không lộ unit_cost_vnd)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lots.map((lot) => (
              <div
                key={lot.id}
                className="rounded-xl border border-stone-200 p-4 bg-stone-50 text-xs space-y-1"
              >
                <div className="font-mono font-bold text-stone-800">{lot.lot_code}</div>
                <div>
                  Tồn hiện tại:{' '}
                  <span className="font-mono font-semibold">
                    {lot.remaining_qty.toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="text-emerald-700 font-medium">
                  unit_cost_vnd:{' '}
                  {'unit_cost_vnd' in lot ? String(lot.unit_cost_vnd) : 'ĐÃ ẨN (STRIPPED)'}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
```

### File 4: `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, EyeOff, Receipt } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchCurrentShift,
  fetchKdsTickets,
  voidPosOrder,
  type AnyShiftRecord,
  type DataSourceMode,
  type KdsTicketViewRecord,
} from '../api/apiClient';
import {
  ManagerPinModal,
  type ManagerPinSubmitPayload,
} from '../components/ManagerPinModal';
import { RoleShellHeader } from '../components/RoleGuard';
import { useAuthStore } from '../store/authStore';

export function CashierPosLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [shift, setShift] = useState<AnyShiftRecord | null>(null);
  const [orders, setOrders] = useState<KdsTicketViewRecord[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');
  const [voidTargetOrder, setVoidTargetOrder] = useState<KdsTicketViewRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadPosState = async () => {
    const [shiftRes, ordersRes] = await Promise.all([
      fetchCurrentShift(actor.id, activeStoreId, actor.role),
      fetchKdsTickets(actor.id, activeStoreId, actor.role),
    ]);
    setShift(shiftRes.data);
    setOrders(ordersRes.data);
    setSource(shiftRes.source);
  };

  useEffect(() => {
    void loadPosState();
  }, [actor.id, actor.role, activeStoreId]);

  const handleConfirmVoid = async (payload: ManagerPinSubmitPayload) => {
    if (!voidTargetOrder) {
      return;
    }
    const result = await voidPosOrder(
      actor.id,
      activeStoreId,
      voidTargetOrder.id,
      payload,
    );
    setStatusMessage(
      `Đã hủy thành công đơn ${result.order.order_code} (Audit ID: ${result.approval_audit_id})`,
    );
    await loadPosState();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title={`Quầy Thu Ngân POS — ${actor.storeLabel}`}
        subtitle={`Đóng ca đếm tiền mù (Blind Shift Close) & Hủy hóa đơn bảo vệ bằng PIN Quản lý (${source})`}
        badgeText="CASHIER_STAFF"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {statusMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <EyeOff className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-base">
              Trạng thái Ca Hiện Tại (Chế độ Đóng Ca Đếm Tiền Mù)
            </h2>
          </div>
          {shift ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-xs text-stone-500">Trạng thái ca</div>
                <div className="font-bold text-emerald-700 mt-1">{shift.status}</div>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-xs text-stone-500">Tiền đầu ca (VNĐ)</div>
                <div className="font-mono font-bold mt-1">
                  {shift.opening_cash_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xs text-amber-800">
                  Tiền lý thuyết hệ thống (Blind Mask)
                </div>
                <div className="font-mono font-bold text-amber-900 mt-1">
                  {shift.system_expected_cash_vnd === null
                    ? 'ĐÃ ẨN (NULL — BLIND CLOSE)'
                    : String(shift.system_expected_cash_vnd)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xs text-amber-800">Độ lệch tiền mặt</div>
                <div className="font-mono font-bold text-amber-900 mt-1">
                  {shift.variance_cash_vnd === null
                    ? 'ĐÃ ẨN (NULL)'
                    : String(shift.variance_cash_vnd)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500">Đang tải thông tin ca làm việc...</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-base">
              Danh sách Hóa đơn POS trong ca ({orders.length} đơn)
            </h2>
          </div>
          {orders.length === 0 ? (
            <p className="text-xs text-stone-500">
              Không còn hóa đơn nào đang hoạt động (các hóa đơn đã hủy đã ẩn khỏi danh sách KDS).
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-mono font-bold text-sm">{order.order_code}</div>
                    <div className="text-xs text-stone-500 mt-1">
                      Trạng thái thanh toán: <span className="font-semibold">{order.payment_status}</span> •
                      Tổng tiền:{' '}
                      <span className="font-mono font-semibold text-stone-800">
                        {(order.total_amount_vnd ?? 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoidTargetOrder(order)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                  >
                    <Ban className="w-4 h-4" />
                    Hủy Hóa Đơn Đã In (Cần PIN Quản Lý)
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <ManagerPinModal
        isOpen={voidTargetOrder !== null}
        title="Phê duyệt Hủy Hóa Đơn Đã In"
        description={
          voidTargetOrder
            ? `Hủy đơn ${voidTargetOrder.order_code} yêu cầu mã PIN 6 số của Quản lý chi nhánh này hoặc Chủ chuỗi.`
            : ''
        }
        storeId={activeStoreId}
        onClose={() => setVoidTargetOrder(null)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
}
```

### File 5: `C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Coffee, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchKdsTickets,
  type DataSourceMode,
  type KdsTicketViewRecord,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { useAuthStore } from '../store/authStore';

function getSlaBadgeClass(elapsedMinutes: number): string {
  if (elapsedMinutes >= 10) {
    return 'bg-red-500/20 text-red-300 border-red-500';
  }
  if (elapsedMinutes >= 5) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500';
  }
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500';
}

export function BaristaKdsLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [tickets, setTickets] = useState<KdsTicketViewRecord[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');
  const [lowStockNotified, setLowStockNotified] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetchKdsTickets(actor.id, activeStoreId, actor.role);
      if (!active) {
        return;
      }
      setTickets(res.data);
      setSource(res.source);
    };
    void load();
    return () => {
      active = false;
    };
  }, [actor.id, actor.role, activeStoreId]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <RoleShellHeader
        title={`Màn Hình Quầy Pha Chế KDS — ${actor.storeLabel}`}
        subtitle={`High-Contrast Dark Mode • Ẩn 100% doanh thu & tiền mặt (${source})`}
        badgeText="BARISTA_KDS"
        dark
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-stone-900 border border-stone-800">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              KDS Finance-Masking đang bật: Không hiển thị <code>total_amount_vnd</code>,{' '}
              <code>unit_price_vnd</code> hay <code>payment_method</code>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLowStockNotified(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold"
          >
            <AlertTriangle className="w-4 h-4" />
            {lowStockNotified
              ? 'Đã gửi cảnh báo sắp hết nguyên liệu!'
              : 'Báo sắp hết nguyên liệu tại quầy'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => {
            const elapsedMinutes = Math.max(
              1,
              Math.floor(
                (Date.now() - new Date(ticket.created_at).getTime()) / 60_000,
              ),
            );
            return (
              <div
                key={ticket.id}
                className="rounded-2xl bg-stone-900 border border-stone-700 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-amber-400" />
                    <span className="font-mono font-bold text-base">
                      {ticket.order_code}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${getSlaBadgeClass(elapsedMinutes)}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {elapsedMinutes}p
                  </span>
                </div>

                <div className="space-y-2">
                  {ticket.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-800 border border-stone-700 text-sm"
                    >
                      <div className="flex justify-between font-semibold">
                        <span>Món #{item.product_id.slice(-4)}</span>
                        <span className="text-amber-300 font-mono">
                          x{item.quantity}
                        </span>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-stone-400 mt-1">
                          Ghi chú: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] font-mono text-stone-400 border-t border-stone-800 pt-2">
                  total_amount_vnd:{' '}
                  {'total_amount_vnd' in ticket
                    ? String(ticket.total_amount_vnd)
                    : 'ĐÃ ẨN (STRIPPED)'}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
```

### File 6: `C:\bib\cf_19\apps\web\src\App.tsx`
```tsx
import { Coffee, Shield } from 'lucide-react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { RoleGuard } from './components/RoleGuard';
import { BaristaKdsLayout } from './layouts/BaristaKdsLayout';
import { CashierPosLayout } from './layouts/CashierPosLayout';
import { ExecutiveLayout } from './layouts/ExecutiveLayout';
import { StoreManagerLayout } from './layouts/StoreManagerLayout';
import { WarehouseLayout } from './layouts/WarehouseLayout';
import {
  SEED_ACTORS,
  getRoleDefaultRoute,
  useAuthStore,
} from './store/authStore';

function LoginPage() {
  const loginAsActorId = useAuthStore((s) => s.loginAsActorId);
  const navigate = useNavigate();

  const handleSelectActor = (actorId: string) => {
    const actor = loginAsActorId(actorId);
    if (actor) {
      navigate(getRoleDefaultRoute(actor));
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-stone-200 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-amber-800 text-white flex items-center justify-center">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              CF19 — Hệ Thống Kho Tổng Tây Nguyên &amp; 4 Quán Cà Phê
            </h1>
            <p className="text-sm text-stone-500">
              Chọn 1 trong 8 tài khoản nhân sự (5 Role • Kho Tổng + Quán 1 + Quán 2) để kiểm chứng RBAC &amp; Multi-Tenant
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {SEED_ACTORS.map((actor) => (
            <button
              key={actor.id}
              type="button"
              onClick={() => handleSelectActor(actor.id)}
              className="text-left p-4 rounded-2xl border border-stone-200 hover:border-amber-600 hover:bg-amber-50/50 transition group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" />
                  {actor.role}
                </span>
                {actor.pinHint && (
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    {actor.pinHint}
                  </span>
                )}
              </div>
              <div className="font-bold text-stone-900 mt-2 group-hover:text-amber-900">
                {actor.fullName}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                {actor.email} • {actor.storeLabel}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/executive"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <ExecutiveLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/warehouse"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}>
              <WarehouseLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/store/:storeId/manage"
          element={
            <RoleGuard
              allowedRoles={['SUPER_ADMIN', 'STORE_MANAGER']}
              requireStoreMatch
            >
              <StoreManagerLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/store/:storeId/pos"
          element={
            <RoleGuard
              allowedRoles={['SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF']}
              requireStoreMatch
            >
              <CashierPosLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/store/:storeId/kds"
          element={
            <RoleGuard
              allowedRoles={[
                'SUPER_ADMIN',
                'STORE_MANAGER',
                'CASHIER_STAFF',
                'BARISTA_KDS',
              ]}
              requireStoreMatch
            >
              <BaristaKdsLayout />
            </RoleGuard>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### File 7: `C:\bib\cf_19\apps\web\src\main.tsx`
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### File 8: `C:\bib\cf_19\apps\web\src\__tests__\m1-role-routing.test.ts`
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  KDS_FORBIDDEN_FINANCE_KEYS,
  ManagerPinSchema,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
  USER_ROLES,
} from '@cf19/shared';
import {
  getFallbackCurrentShift,
  getFallbackInventoryForRole,
  getFallbackKdsTickets,
  getFallbackLotsForRole,
} from '../api/apiClient';
import {
  SEED_ACTORS,
  canAccessStore,
  getRoleDefaultRoute,
  useAuthStore,
} from '../store/authStore';

describe('M1.3 — @cf19/web 5-Role Routing, Multi-Tenant Store Guard & Sanitizer Fallback', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('1. SEED_ACTORS defines all 8 distinct staff accounts covering all 5 RBAC roles', () => {
    expect(SEED_ACTORS).toHaveLength(8);
    const ids = SEED_ACTORS.map((a) => a.id);
    expect(new Set(ids).size).toBe(8);

    const presentRoles = new Set(SEED_ACTORS.map((a) => a.role));
    for (const role of USER_ROLES) {
      expect(presentRoles.has(role)).toBe(true);
    }
  });

  it('2. routes SUPER_ADMIN to /executive and WAREHOUSE_MANAGER to /warehouse', () => {
    const admin = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.superAdmin)!;
    const wh = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.warehouseManager)!;
    expect(getRoleDefaultRoute(admin)).toBe('/executive');
    expect(getRoleDefaultRoute(wh)).toBe('/warehouse');
  });

  it('3. routes Store 1 & Store 2 Managers to their respective /store/:storeId/manage routes', () => {
    const mgr1 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.storeManager01)!;
    const mgr2 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.storeManager02)!;
    expect(getRoleDefaultRoute(mgr1)).toBe(`/store/${SEED_IDS.stores.store01}/manage`);
    expect(getRoleDefaultRoute(mgr2)).toBe(`/store/${SEED_IDS.stores.store02}/manage`);
  });

  it('4. routes Cashiers to /pos and Baristas to /kds scoped to their assigned store', () => {
    const c1 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.cashier01)!;
    const c2 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.cashier02)!;
    const b1 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.barista01)!;
    const b2 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.barista02)!;

    expect(getRoleDefaultRoute(c1)).toBe(`/store/${SEED_IDS.stores.store01}/pos`);
    expect(getRoleDefaultRoute(c2)).toBe(`/store/${SEED_IDS.stores.store02}/pos`);
    expect(getRoleDefaultRoute(b1)).toBe(`/store/${SEED_IDS.stores.store01}/kds`);
    expect(getRoleDefaultRoute(b2)).toBe(`/store/${SEED_IDS.stores.store02}/kds`);
  });

  it('5. canAccessStore grants SUPER_ADMIN universal access across Warehouse and all 4 Stores', () => {
    const admin = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.superAdmin)!;
    for (const storeId of Object.values(SEED_IDS.stores)) {
      expect(canAccessStore(admin, storeId)).toBe(true);
    }
  });

  it('6. canAccessStore restricts WAREHOUSE_MANAGER strictly to Central Warehouse', () => {
    const wh = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.warehouseManager)!;
    expect(canAccessStore(wh, SEED_IDS.stores.centralWarehouse)).toBe(true);
    expect(canAccessStore(wh, SEED_IDS.stores.store01)).toBe(false);
    expect(canAccessStore(wh, SEED_IDS.stores.store02)).toBe(false);
  });

  it('7. canAccessStore blocks Store 1 staff from accessing Store 2 or Central Warehouse', () => {
    const mgr1 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.storeManager01)!;
    const c1 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.cashier01)!;
    const b1 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.barista01)!;

    for (const staff of [mgr1, c1, b1]) {
      expect(canAccessStore(staff, SEED_IDS.stores.store01)).toBe(true);
      expect(canAccessStore(staff, SEED_IDS.stores.store02)).toBe(false);
      expect(canAccessStore(staff, SEED_IDS.stores.centralWarehouse)).toBe(false);
    }
  });

  it('8. canAccessStore blocks Store 2 Manager from accessing Store 1', () => {
    const mgr2 = SEED_ACTORS.find((a) => a.id === SEED_IDS.users.storeManager02)!;
    expect(canAccessStore(mgr2, SEED_IDS.stores.store02)).toBe(true);
    expect(canAccessStore(mgr2, SEED_IDS.stores.store01)).toBe(false);
  });

  it('9. useAuthStore switches between 8 accounts and clears state on logout', () => {
    const first = useAuthStore.getState().loginAsActorId(SEED_IDS.users.storeManager01);
    expect(first?.role).toBe('STORE_MANAGER');
    expect(useAuthStore.getState().currentActor?.assignedStoreId).toBe(
      SEED_IDS.stores.store01,
    );

    const second = useAuthStore.getState().loginAsActorId(SEED_IDS.users.barista02);
    expect(second?.role).toBe('BARISTA_KDS');
    expect(useAuthStore.getState().currentActor?.assignedStoreId).toBe(
      SEED_IDS.stores.store02,
    );

    expect(useAuthStore.getState().loginAsActorId('non-existent-id')).toBeNull();
    expect(useAuthStore.getState().currentActor).toBeNull();
  });

  it('10. frontend PIN schema validates exact 6-digit PINs before hitting API', () => {
    expect(ManagerPinSchema.safeParse('123456').success).toBe(true);
    expect(ManagerPinSchema.safeParse('654321').success).toBe(true);
    expect(ManagerPinSchema.safeParse('12345').success).toBe(false);
    expect(ManagerPinSchema.safeParse('12ab56').success).toBe(false);
  });

  it('11. offline fallback inventory exposes MAC to SUPER_ADMIN & WAREHOUSE_MANAGER but strips it for STORE_MANAGER', () => {
    const whItems = getFallbackInventoryForRole('WAREHOUSE_MANAGER');
    expect(whItems[0]?.moving_avg_cost_vnd).toBe(98000);

    const storeItems = getFallbackInventoryForRole('STORE_MANAGER');
    for (const item of storeItems) {
      for (const forbidden of SENSITIVE_COST_KEYS) {
        expect(item).not.toHaveProperty(forbidden);
      }
    }
  });

  it('12. offline fallback lots hide unit_cost_vnd & shipping_cost_vnd from STORE_MANAGER', () => {
    const storeLots = getFallbackLotsForRole(SEED_IDS.stores.store01, 'STORE_MANAGER');
    expect(storeLots).toHaveLength(1);
    expect(storeLots[0]).not.toHaveProperty('unit_cost_vnd');
    expect(storeLots[0]).not.toHaveProperty('shipping_cost_vnd');
  });

  it('13. offline fallback KDS tickets strip ALL financial fields for BARISTA_KDS', () => {
    const tickets = getFallbackKdsTickets(SEED_IDS.stores.store01, 'BARISTA_KDS');
    expect(tickets).toHaveLength(1);
    for (const key of KDS_FORBIDDEN_FINANCE_KEYS) {
      expect(tickets[0]).not.toHaveProperty(key);
    }
    expect(tickets[0]?.items[0]).not.toHaveProperty('unit_price_vnd');
    expect(tickets[0]?.items[0]).not.toHaveProperty('line_total_vnd');
  });

  it('14. offline fallback shift masks system_expected_cash_vnd to null for CASHIER_STAFF (Blind Close)', () => {
    const cashierShift = getFallbackCurrentShift(SEED_IDS.stores.store01, 'CASHIER_STAFF');
    expect(cashierShift.status).toBe('OPEN');
    expect(cashierShift.system_expected_cash_vnd).toBeNull();
    expect(cashierShift.variance_cash_vnd).toBeNull();

    const mgrShift = getFallbackCurrentShift(SEED_IDS.stores.store01, 'STORE_MANAGER');
    expect(mgrShift.system_expected_cash_vnd).toBe(2145000);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ cả 8 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh kiểm tra tồn tại file (`Test-Path`) ở mục 5 và báo cáo `@coordinator [done] M1.3 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx','C:\bib\cf_19\apps\web\src\App.tsx','C:\bib\cf_19\apps\web\src\main.tsx','C:\bib\cf_19\apps\web\src\__tests__\m1-role-routing.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
