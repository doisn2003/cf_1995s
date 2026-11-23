# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M4.3 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **8 files (4 + 4)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1–M1.3, M2.1–M2.3, M3.1–M3.3, M4.1 (`posBomAndReceiptMath.ts`), M4.2 (`@cf19/api` `/api/v1/catalog/*` & `/api/v1/pos/*`).
- **Cam kết tương thích ngược:** Giữ nguyên toàn bộ **42/42 Vitest tests của `@cf19/web`** PASS tuyệt đối!

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# POS CATALOG API CLIENT, ZUSTAND CART/OFFLINE STORE & 2 MODALS (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 4 file dưới đây cho tầng POS API Client, Zustand POS Cart + Offline Queue Store, Modifier Matrix Modal và ESC/POS 42-col Receipt Modal trong `@cf19/web`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thêm import thừa gây lỗi `noUnusedLocals`, không đổi tên props hay hàm.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `PosTerminalWorkbench.tsx`, `CashierPosLayout.tsx`, `StoreManagerLayout.tsx`, hay `m4-pos-terminal-offline.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M4.3 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\api\posCatalogApi.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\store\posTerminalStore.ts` (Tạo mới)
3. `C:\bib\cf_19\apps\web\src\features\pos\PosModifierMatrixModal.tsx` (Tạo mới)
4. `C:\bib\cf_19\apps\web\src\features\pos\EscPosThermalReceiptModal.tsx` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\api\posCatalogApi.ts`
```ts
import {
  SEED_IDS,
  buildEscPosThermalReceiptText,
  calculateBranchAdjustedBasePriceVnd,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BomInventoryCostLookup,
  type BomRecipeWithItemsDTO,
  type MenuCategoryDto,
  type MenuModifierDto,
  type MenuProductDto,
  type MenuVariantDto,
  type OfflinePosBatchSyncDTO,
  type OfflinePosBatchSyncResultDTO,
  type PaymentStatus,
  type PosOrderDetailResultDTO,
  type PosOrderFullDto,
  type PosOrderItemDto,
  type StorePosCatalogDTO,
  type SubmitPosOrderDTO,
} from '@cf19/shared';
import { ApiClientError, type ApiCallResult } from './apiClient';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

export const EXTRA_MODIFIER_IDS = {
  sugar0: '63000000-0000-4000-8000-000000000005',
  ice0: '63000000-0000-4000-8000-000000000006',
} as const;

interface OfflineStoreMeta {
  id: string;
  code: string;
  name: string;
  address: string;
  price_multiplier: number;
}

const OFFLINE_STORES: Record<string, OfflineStoreMeta> = {
  [SEED_IDS.stores.store01]: {
    id: SEED_IDS.stores.store01,
    code: 'STORE-01',
    name: 'CF19 Quan 1 - Trung Tam',
    address: '19 Tran Phu, Thi Tran',
    price_multiplier: 1.0,
  },
  [SEED_IDS.stores.store02]: {
    id: SEED_IDS.stores.store02,
    code: 'STORE-02',
    name: 'CF19 Quan 2 - Quang Truong',
    address: '88 Hung Vuong, Quang Truong',
    price_multiplier: 1.0,
  },
  [SEED_IDS.stores.store03]: {
    id: SEED_IDS.stores.store03,
    code: 'STORE-03',
    name: 'CF19 Quan 3 - Dai Lo Dong Tay',
    address: '120 Le Duan, Dai Lo Dong Tay',
    price_multiplier: 1.05,
  },
  [SEED_IDS.stores.store04]: {
    id: SEED_IDS.stores.store04,
    code: 'STORE-04',
    name: 'CF19 Quan 4 - Cong Vien',
    address: '05 Nguyen Tat Thanh',
    price_multiplier: 1.0,
  },
};

const OFFLINE_CATEGORIES: MenuCategoryDto[] = [
  {
    id: SEED_IDS.menuCategories.coffee,
    organization_id: SEED_IDS.organization.cf19,
    code: 'CAT-COFFEE',
    name: 'Cà Phê Tây Nguyên',
    sort_order: 1,
    is_active: true,
  },
  {
    id: SEED_IDS.menuCategories.milkAndTea,
    organization_id: SEED_IDS.organization.cf19,
    code: 'CAT-MILK',
    name: 'Cà Phê Sữa & Bạc Xỉu',
    sort_order: 2,
    is_active: true,
  },
];

const OFFLINE_PRODUCTS: MenuProductDto[] = [
  {
    id: SEED_IDS.menuProducts.caPheSuaDa,
    organization_id: SEED_IDS.organization.cf19,
    category_id: SEED_IDS.menuCategories.coffee,
    code: 'PRD-CF-SUA-DA',
    name: 'Cà Phê Sữa Đá Tây Nguyên',
    base_price_vnd: 29000,
    is_active: true,
  },
  {
    id: SEED_IDS.menuProducts.caPheDenDa,
    organization_id: SEED_IDS.organization.cf19,
    category_id: SEED_IDS.menuCategories.coffee,
    code: 'PRD-CF-DEN-DA',
    name: 'Cà Phê Đen Đá Nguyên Chất',
    base_price_vnd: 25000,
    is_active: true,
  },
  {
    id: SEED_IDS.menuProducts.bacXiuTayNguyen,
    organization_id: SEED_IDS.organization.cf19,
    category_id: SEED_IDS.menuCategories.milkAndTea,
    code: 'PRD-BAC-XIU',
    name: 'Bạc Xỉu Tây Nguyên',
    base_price_vnd: 35000,
    is_active: true,
  },
];

const OFFLINE_VARIANTS: MenuVariantDto[] = [
  {
    id: SEED_IDS.menuVariants.caPheSuaDaM,
    product_id: SEED_IDS.menuProducts.caPheSuaDa,
    size_code: 'M',
    name: 'Size M (Tiêu chuẩn)',
    price_delta_vnd: 0,
    is_default: true,
    is_active: true,
  },
  {
    id: SEED_IDS.menuVariants.caPheSuaDaL,
    product_id: SEED_IDS.menuProducts.caPheSuaDa,
    size_code: 'L',
    name: 'Size L (Lớn)',
    price_delta_vnd: 6000,
    is_default: false,
    is_active: true,
  },
  {
    id: SEED_IDS.menuVariants.caPheDenDaM,
    product_id: SEED_IDS.menuProducts.caPheDenDa,
    size_code: 'M',
    name: 'Size M (Tiêu chuẩn)',
    price_delta_vnd: 0,
    is_default: true,
    is_active: true,
  },
  {
    id: SEED_IDS.menuVariants.caPheDenDaL,
    product_id: SEED_IDS.menuProducts.caPheDenDa,
    size_code: 'L',
    name: 'Size L (Lớn)',
    price_delta_vnd: 6000,
    is_default: false,
    is_active: true,
  },
  {
    id: SEED_IDS.menuVariants.bacXiuM,
    product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
    size_code: 'M',
    name: 'Size M (Tiêu chuẩn)',
    price_delta_vnd: 0,
    is_default: true,
    is_active: true,
  },
  {
    id: SEED_IDS.menuVariants.bacXiuL,
    product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
    size_code: 'L',
    name: 'Size L (Lớn)',
    price_delta_vnd: 6000,
    is_default: false,
    is_active: true,
  },
];

const OFFLINE_MODIFIERS: MenuModifierDto[] = [
  {
    id: SEED_IDS.menuModifiers.sugar50,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-SUGAR-50',
    modifier_group: 'SUGAR',
    name: 'Ít đường (50%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  {
    id: EXTRA_MODIFIER_IDS.sugar0,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-SUGAR-0',
    modifier_group: 'SUGAR',
    name: 'Không đường (0%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  {
    id: SEED_IDS.menuModifiers.ice50,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-ICE-50',
    modifier_group: 'ICE',
    name: 'Ít đá (50%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  {
    id: EXTRA_MODIFIER_IDS.ice0,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-ICE-0',
    modifier_group: 'ICE',
    name: 'Không đá (0%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  {
    id: SEED_IDS.menuModifiers.extraEspressoShot,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-TOP-SHOT',
    modifier_group: 'TOPPING',
    name: 'Thêm 1 Shot Espresso',
    price_delta_vnd: 10000,
    inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
    bom_qty_base_unit: 18,
    is_active: true,
  },
  {
    id: SEED_IDS.menuModifiers.extraCondensedMilk,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-TOP-MILK',
    modifier_group: 'TOPPING',
    name: 'Thêm Sữa Đặc',
    price_delta_vnd: 5000,
    inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
    bom_qty_base_unit: 15,
    is_active: true,
  },
];

const OFFLINE_BOM_RECIPES: BomRecipeWithItemsDTO[] = [
  {
    id: SEED_IDS.bomRecipes.caPheSuaDaM,
    product_id: SEED_IDS.menuProducts.caPheSuaDa,
    variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
    version: 1,
    is_active: true,
    items: [
      {
        inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        sku: 'RC-ROB-MED',
        name: 'Cà phê hạt rang Robusta Medium',
        base_unit: 'g',
        quantity_per_cup_base_unit: 20,
        wastage_allowance_pct: 2,
        internal_transfer_price_vnd: 155000,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
        sku: 'ING-COND-MILK',
        name: 'Sữa đặc có đường',
        base_unit: 'ml',
        quantity_per_cup_base_unit: 25,
        wastage_allowance_pct: 2,
        internal_transfer_price_vnd: 60,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
        sku: 'PKG-CUP-500',
        name: 'Ly nhựa PET 500ml',
        base_unit: 'pcs',
        quantity_per_cup_base_unit: 1,
        wastage_allowance_pct: 0,
        internal_transfer_price_vnd: 1350,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
        sku: 'PKG-STRAW-BIO',
        name: 'Ống hút sinh học',
        base_unit: 'pcs',
        quantity_per_cup_base_unit: 1,
        wastage_allowance_pct: 0,
        internal_transfer_price_vnd: 220,
      },
    ],
  },
];

const OFFLINE_INV_LOOKUP: Record<string, BomInventoryCostLookup> = {
  [SEED_IDS.inventoryItems.roastedRobustaMed]: {
    id: SEED_IDS.inventoryItems.roastedRobustaMed,
    sku: 'RC-ROB-MED',
    name: 'Cà phê hạt rang Robusta Medium',
    base_unit: 'g',
    internal_transfer_price_vnd: 155000,
  },
  [SEED_IDS.inventoryItems.condensedMilk]: {
    id: SEED_IDS.inventoryItems.condensedMilk,
    sku: 'ING-COND-MILK',
    name: 'Sữa đặc có đường',
    base_unit: 'ml',
    internal_transfer_price_vnd: 60,
  },
  [SEED_IDS.inventoryItems.plasticCup500ml]: {
    id: SEED_IDS.inventoryItems.plasticCup500ml,
    sku: 'PKG-CUP-500',
    name: 'Ly nhựa PET 500ml',
    base_unit: 'pcs',
    internal_transfer_price_vnd: 1350,
  },
  [SEED_IDS.inventoryItems.bioStraw]: {
    id: SEED_IDS.inventoryItems.bioStraw,
    sku: 'PKG-STRAW-BIO',
    name: 'Ống hút sinh học',
    base_unit: 'pcs',
    internal_transfer_price_vnd: 220,
  },
};

interface OfflinePosOrderStoreState {
  orders: PosOrderFullDto[];
  items: PosOrderItemDto[];
}

function createInitialOfflinePosOrders(): OfflinePosOrderStoreState {
  return {
    orders: [],
    items: [],
  };
}

let offlinePosState: OfflinePosOrderStoreState = createInitialOfflinePosOrders();

export function resetOfflinePosCatalogState(): void {
  offlinePosState = createInitialOfflinePosOrders();
}

function renderOfflineReceipt(
  store: OfflineStoreMeta,
  order: PosOrderFullDto,
  items: PosOrderItemDto[],
): string {
  return buildEscPosThermalReceiptText({
    store_name: store.name,
    store_address: store.address,
    order_code: order.order_code,
    created_at: order.created_at,
    cashier_name: 'Thu Ngan POS',
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    vietqr_ref_code: order.vietqr_ref_code,
    total_amount_vnd: order.total_amount_vnd,
    lines: items.map((it) => {
      const p = OFFLINE_PRODUCTS.find((x) => x.id === it.product_id);
      const v = OFFLINE_VARIANTS.find((x) => x.id === it.variant_id);
      return {
        product_name: p?.name ?? 'Do uong',
        size_code: v?.size_code ?? 'M',
        modifier_names: it.modifiers_json.map((m) => m.name),
        quantity: it.quantity,
        unit_price_vnd: it.unit_price_vnd,
        line_total_vnd: it.line_total_vnd,
        notes: it.notes,
      };
    }),
  });
}

export function offlineGetStorePosCatalog(storeId: string): StorePosCatalogDTO {
  const store =
    OFFLINE_STORES[storeId] ?? OFFLINE_STORES[SEED_IDS.stores.store01]!;
  return {
    store: {
      id: store.id,
      code: store.code,
      name: store.name,
      price_multiplier: store.price_multiplier,
    },
    categories: OFFLINE_CATEGORIES.map((c) => structuredClone(c)),
    products: OFFLINE_PRODUCTS.map((p) => ({
      ...structuredClone(p),
      effective_base_price_vnd: calculateBranchAdjustedBasePriceVnd(
        p.base_price_vnd,
        store.price_multiplier,
      ),
      variants: OFFLINE_VARIANTS.filter((v) => v.product_id === p.id).map((v) =>
        structuredClone(v),
      ),
    })),
    modifiers: OFFLINE_MODIFIERS.map((m) => structuredClone(m)),
    bom_recipes: OFFLINE_BOM_RECIPES.map((r) => structuredClone(r)),
  };
}

export function offlineListStoreOrders(storeId: string): PosOrderFullDto[] {
  return offlinePosState.orders
    .filter((o) => o.store_id === storeId)
    .map((o) => ({
      ...structuredClone(o),
      items: offlinePosState.items
        .filter((it) => it.order_id === o.id)
        .map((it) => structuredClone(it)),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function offlineCreatePosOrder(
  actorId: string,
  storeId: string,
  input: SubmitPosOrderDTO,
): PosOrderDetailResultDTO {
  const store =
    OFFLINE_STORES[storeId] ?? OFFLINE_STORES[SEED_IDS.stores.store01]!;

  const clientCode = input.client_order_code?.trim();
  if (clientCode) {
    const existing = offlinePosState.orders.find(
      (o) => o.order_code === clientCode && o.store_id === storeId,
    );
    if (existing) {
      const existingItems = offlinePosState.items
        .filter((it) => it.order_id === existing.id)
        .map((it) => structuredClone(it));
      return {
        sync_status: 'IDEMPOTENT_EXISTING',
        order: { ...structuredClone(existing), items: existingItems },
        items: existingItems,
        bom_requirements: [],
        thermal_receipt_text: renderOfflineReceipt(store, existing, existingItems),
      };
    }
  }

  const modifiersById: Record<string, MenuModifierDto> = {};
  for (const mod of OFFLINE_MODIFIERS) {
    modifiersById[mod.id] = mod;
  }

  const nowIso = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const createdItems: PosOrderItemDto[] = [];
  let totalAmount = 0;

  for (const line of input.items) {
    const product = OFFLINE_PRODUCTS.find((p) => p.id === line.product_id);
    const variant = OFFLINE_VARIANTS.find(
      (v) => v.id === line.variant_id && v.product_id === line.product_id,
    );
    if (!product || !variant) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Product or variant not found');
    }

    const selectedMods = line.modifier_ids
      .map((id) => modifiersById[id])
      .filter((m): m is MenuModifierDto => m !== undefined);
    const matrix = validateModifierSelectionMatrix(selectedMods);
    if (!matrix.valid) {
      throw new ApiClientError(400, 'INVALID_MODIFIER_MATRIX', matrix.errors.join('; '));
    }

    const pricing = calculatePosLinePricing({
      basePriceVnd: product.base_price_vnd,
      priceMultiplier: store.price_multiplier,
      variantPriceDeltaVnd: variant.price_delta_vnd,
      modifiers: selectedMods,
      quantity: line.quantity,
    });
    totalAmount += pricing.line_total_vnd;

    createdItems.push({
      id: crypto.randomUUID(),
      order_id: orderId,
      store_id: storeId,
      product_id: product.id,
      variant_id: variant.id,
      modifiers_json: selectedMods.map((m) => ({
        id: m.id,
        name: m.name,
        price_delta_vnd: m.price_delta_vnd,
      })),
      quantity: line.quantity,
      unit_price_vnd: pricing.unit_price_vnd,
      line_total_vnd: pricing.line_total_vnd,
      notes: line.notes ?? null,
      created_at: nowIso,
    });
  }

  const bom = calculateOrderBomRequirementsAndCogs({
    lines: input.items,
    recipes: OFFLINE_BOM_RECIPES,
    modifiersById,
    inventoryItemsById: OFFLINE_INV_LOOKUP,
  });

  const compactStore = store.code.replace(/-/g, '');
  const orderCode =
    clientCode ??
    `POS-${compactStore}-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(offlinePosState.orders.length + 1).padStart(3, '0')}`;
  const paymentStatus: PaymentStatus =
    input.payment_method === 'CASH' ? 'PAID' : 'PENDING';
  const vietqrRef =
    input.payment_method === 'VIETQR'
      ? `CF19${compactStore}${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
      : null;

  const order: PosOrderFullDto = {
    id: orderId,
    order_code: orderCode,
    store_id: storeId,
    shift_id: input.shift_id,
    cashier_id: actorId,
    customer_phone: input.customer_phone ?? null,
    payment_method: input.payment_method,
    payment_status: paymentStatus,
    kds_status: 'QUEUED',
    vietqr_ref_code: vietqrRef,
    total_amount_vnd: totalAmount,
    cogs_amount_vnd: bom.total_cogs_vnd,
    bom_deducted_at: null,
    void_approved_by_manager_id: null,
    void_reason: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  offlinePosState.orders.push(order);
  offlinePosState.items.push(...createdItems);

  const receiptText = renderOfflineReceipt(store, order, createdItems);
  return {
    sync_status: 'SYNCED_NEW',
    order: { ...structuredClone(order), items: createdItems.map((i) => structuredClone(i)) },
    items: createdItems.map((i) => structuredClone(i)),
    bom_requirements: bom.requirements,
    thermal_receipt_text: receiptText,
  };
}

export function offlineSyncOfflinePosOrders(
  actorId: string,
  storeId: string,
  input: OfflinePosBatchSyncDTO,
): OfflinePosBatchSyncResultDTO {
  const results: PosOrderDetailResultDTO[] = [];
  let syncedNew = 0;
  let existingCount = 0;

  for (const entry of input.orders) {
    const res = offlineCreatePosOrder(actorId, storeId, {
      shift_id: input.shift_id,
      payment_method: entry.payment_method,
      customer_phone: entry.customer_phone,
      client_order_code: entry.client_order_code,
      items: entry.items,
    });
    if (res.sync_status === 'SYNCED_NEW') {
      syncedNew += 1;
    } else {
      existingCount += 1;
    }
    results.push(res);
  }

  return {
    total_received: input.orders.length,
    synced_new_count: syncedNew,
    idempotent_existing_count: existingCount,
    results,
  };
}

export function offlineGetOrderReceipt(
  storeId: string,
  orderId: string,
): { order: PosOrderFullDto; thermal_receipt_text: string } {
  const store =
    OFFLINE_STORES[storeId] ?? OFFLINE_STORES[SEED_IDS.stores.store01]!;
  const order = offlinePosState.orders.find(
    (o) => o.id === orderId && o.store_id === storeId,
  );
  if (!order) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Order not found');
  }
  const items = offlinePosState.items.filter((it) => it.order_id === order.id);
  return {
    order: { ...structuredClone(order), items: items.map((i) => structuredClone(i)) },
    thermal_receipt_text: renderOfflineReceipt(store, order, items),
  };
}

async function posFetchJson<T>(
  path: string,
  actorId: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer dev:${actorId}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const body = (await response.json()) as {
    data?: T;
    error?: { code?: string; message?: string };
  };

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      body.error?.code ?? 'POS_API_ERROR',
      body.error?.message ?? `HTTP ${response.status}`,
    );
  }
  return body.data as T;
}

export async function fetchStorePosCatalogApi(
  actorId: string,
  storeId: string,
): Promise<ApiCallResult<StorePosCatalogDTO>> {
  try {
    const data = await posFetchJson<StorePosCatalogDTO>(
      `/api/v1/catalog/stores/${storeId}`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineGetStorePosCatalog(storeId), source: 'offline_fallback' };
  }
}

export async function fetchStorePosOrdersApi(
  actorId: string,
  storeId: string,
): Promise<ApiCallResult<PosOrderFullDto[]>> {
  try {
    const data = await posFetchJson<PosOrderFullDto[]>(
      `/api/v1/pos/stores/${storeId}/orders`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineListStoreOrders(storeId), source: 'offline_fallback' };
  }
}

export async function submitPosOrderApi(
  actorId: string,
  storeId: string,
  payload: SubmitPosOrderDTO,
): Promise<ApiCallResult<PosOrderDetailResultDTO>> {
  try {
    const data = await posFetchJson<PosOrderDetailResultDTO>(
      `/api/v1/pos/stores/${storeId}/orders`,
      actorId,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineCreatePosOrder(actorId, storeId, payload),
      source: 'offline_fallback',
    };
  }
}

export async function syncOfflinePosOrdersApi(
  actorId: string,
  storeId: string,
  payload: OfflinePosBatchSyncDTO,
): Promise<ApiCallResult<OfflinePosBatchSyncResultDTO>> {
  try {
    const data = await posFetchJson<OfflinePosBatchSyncResultDTO>(
      `/api/v1/pos/stores/${storeId}/orders/offline-sync`,
      actorId,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineSyncOfflinePosOrders(actorId, storeId, payload),
      source: 'offline_fallback',
    };
  }
}

export async function fetchOrderReceiptApi(
  actorId: string,
  storeId: string,
  orderId: string,
): Promise<ApiCallResult<{ order: PosOrderFullDto; thermal_receipt_text: string }>> {
  try {
    const data = await posFetchJson<{
      order: PosOrderFullDto;
      thermal_receipt_text: string;
    }>(`/api/v1/pos/stores/${storeId}/orders/${orderId}/receipt`, actorId);
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineGetOrderReceipt(storeId, orderId),
      source: 'offline_fallback',
    };
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\src\store\posTerminalStore.ts`
```ts
import { create } from 'zustand';
import type { OfflinePosOrderEntryDTO } from '@cf19/shared';

export interface PosCartLine {
  cartLineId: string;
  productId: string;
  productName: string;
  variantId: string;
  sizeCode: string;
  modifierIds: string[];
  modifierNames: string[];
  quantity: number;
  notes?: string;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

interface PosTerminalStoreState {
  cartItems: PosCartLine[];
  isOfflineSimulationMode: boolean;
  offlineOrderQueue: OfflinePosOrderEntryDTO[];
  addToCart: (line: Omit<PosCartLine, 'cartLineId' | 'lineTotalVnd'>) => void;
  updateCartLineQty: (cartLineId: string, nextQty: number) => void;
  removeCartLine: (cartLineId: string) => void;
  clearCart: () => void;
  setOfflineSimulationMode: (enabled: boolean) => void;
  enqueueOfflineOrder: (entry: OfflinePosOrderEntryDTO) => void;
  removeSyncedOfflineOrders: (clientOrderCodes: readonly string[]) => void;
  resetPosTerminalStore: () => void;
}

export const usePosTerminalStore = create<PosTerminalStoreState>((set) => ({
  cartItems: [],
  isOfflineSimulationMode: false,
  offlineOrderQueue: [],

  addToCart: (line) =>
    set((state) => {
      const sortedModKey = [...line.modifierIds].sort().join(',');
      const existing = state.cartItems.find(
        (c) =>
          c.productId === line.productId &&
          c.variantId === line.variantId &&
          [...c.modifierIds].sort().join(',') === sortedModKey &&
          (c.notes ?? '') === (line.notes ?? ''),
      );

      if (existing) {
        const nextQty = existing.quantity + line.quantity;
        return {
          cartItems: state.cartItems.map((c) =>
            c.cartLineId === existing.cartLineId
              ? { ...c, quantity: nextQty, lineTotalVnd: c.unitPriceVnd * nextQty }
              : c,
          ),
        };
      }

      const created: PosCartLine = {
        ...line,
        cartLineId: crypto.randomUUID(),
        lineTotalVnd: line.unitPriceVnd * line.quantity,
      };
      return {
        cartItems: [...state.cartItems, created],
      };
    }),

  updateCartLineQty: (cartLineId, nextQty) =>
    set((state) => {
      if (nextQty <= 0) {
        return {
          cartItems: state.cartItems.filter((c) => c.cartLineId !== cartLineId),
        };
      }
      return {
        cartItems: state.cartItems.map((c) =>
          c.cartLineId === cartLineId
            ? { ...c, quantity: nextQty, lineTotalVnd: c.unitPriceVnd * nextQty }
            : c,
        ),
      };
    }),

  removeCartLine: (cartLineId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((c) => c.cartLineId !== cartLineId),
    })),

  clearCart: () => set({ cartItems: [] }),

  setOfflineSimulationMode: (enabled) =>
    set({ isOfflineSimulationMode: enabled }),

  enqueueOfflineOrder: (entry) =>
    set((state) => ({
      offlineOrderQueue: [...state.offlineOrderQueue, entry],
    })),

  removeSyncedOfflineOrders: (clientOrderCodes) =>
    set((state) => {
      const syncedSet = new Set(clientOrderCodes);
      return {
        offlineOrderQueue: state.offlineOrderQueue.filter(
          (entry) => !syncedSet.has(entry.client_order_code),
        ),
      };
    }),

  resetPosTerminalStore: () =>
    set({
      cartItems: [],
      isOfflineSimulationMode: false,
      offlineOrderQueue: [],
    }),
}));
```

### File 3: `C:\bib\cf_19\apps\web\src\features\pos\PosModifierMatrixModal.tsx`
```tsx
import { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import {
  calculatePosLinePricing,
  type MenuModifierDto,
  type StoreCatalogProductDTO,
} from '@cf19/shared';

export interface PosModifierConfirmPayload {
  productId: string;
  productName: string;
  variantId: string;
  sizeCode: string;
  modifierIds: string[];
  modifierNames: string[];
  quantity: number;
  notes?: string;
  unitPriceVnd: number;
}

export interface PosModifierMatrixModalProps {
  product: StoreCatalogProductDTO | null;
  priceMultiplier: number;
  modifiers: MenuModifierDto[];
  onClose: () => void;
  onConfirm: (payload: PosModifierConfirmPayload) => void;
}

export function PosModifierMatrixModal({
  product,
  priceMultiplier,
  modifiers,
  onClose,
  onConfirm,
}: PosModifierMatrixModalProps) {
  const defaultVariant =
    product?.variants.find((v) => v.is_default) ?? product?.variants[0];

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant?.id ?? '',
  );
  const [selectedSugarId, setSelectedSugarId] = useState<string | null>(null);
  const [selectedIceId, setSelectedIceId] = useState<string | null>(null);
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const sugarMods = useMemo(
    () => modifiers.filter((m) => m.modifier_group === 'SUGAR'),
    [modifiers],
  );
  const iceMods = useMemo(
    () => modifiers.filter((m) => m.modifier_group === 'ICE'),
    [modifiers],
  );
  const toppingMods = useMemo(
    () => modifiers.filter((m) => m.modifier_group === 'TOPPING'),
    [modifiers],
  );

  const activeVariant =
    product?.variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;

  const chosenModifiers = useMemo(() => {
    const ids = [
      ...(selectedSugarId ? [selectedSugarId] : []),
      ...(selectedIceId ? [selectedIceId] : []),
      ...selectedToppingIds,
    ];
    return modifiers.filter((m) => ids.includes(m.id));
  }, [modifiers, selectedSugarId, selectedIceId, selectedToppingIds]);

  const pricing = useMemo(() => {
    if (!product || !activeVariant) {
      return null;
    }
    return calculatePosLinePricing({
      basePriceVnd: product.base_price_vnd,
      priceMultiplier,
      variantPriceDeltaVnd: activeVariant.price_delta_vnd,
      modifiers: chosenModifiers,
      quantity,
    });
  }, [product, activeVariant, priceMultiplier, chosenModifiers, quantity]);

  if (!product || !activeVariant || !pricing) {
    return null;
  }

  const toggleTopping = (id: string) => {
    setSelectedToppingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    onConfirm({
      productId: product.id,
      productName: product.name,
      variantId: activeVariant.id,
      sizeCode: activeVariant.size_code,
      modifierIds: chosenModifiers.map((m) => m.id),
      modifierNames: chosenModifiers.map((m) => m.name),
      quantity,
      notes: notes.trim() || undefined,
      unitPriceVnd: pricing.unit_price_vnd,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-amber-950">{product.name}</h2>
            <p className="text-xs text-amber-800">
              Giá cơ sở chi nhánh: {pricing.effective_base_price_vnd.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-stone-500 hover:text-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              1. Chọn Size (Bắt buộc)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    activeVariant.id === v.id
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-stone-50 text-stone-800 border-stone-200 hover:border-amber-500'
                  }`}
                >
                  <div>{v.name}</div>
                  <div className="font-mono mt-0.5 opacity-80">
                    +{v.price_delta_vnd.toLocaleString('vi-VN')} đ
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              2. Mức Đường (Tối đa 1 lựa chọn — SUGAR)
            </div>
            <div className="flex flex-wrap gap-2">
              {sugarMods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setSelectedSugarId((prev) => (prev === m.id ? null : m.id))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
                    selectedSugarId === m.id
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              3. Mức Đá (Tối đa 1 lựa chọn — ICE)
            </div>
            <div className="flex flex-wrap gap-2">
              {iceMods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setSelectedIceId((prev) => (prev === m.id ? null : m.id))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
                    selectedIceId === m.id
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              4. Topping Thêm (Chọn nhiều — Tự động tính BOM tầng 2)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toppingMods.map((m) => {
                const checked = selectedToppingIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleTopping(m.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold ${
                      checked
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-stone-50 text-stone-800 border-stone-200'
                    }`}
                  >
                    <div>{m.name}</div>
                    <div className="font-mono mt-0.5 opacity-80">
                      +{m.price_delta_vnd.toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Số lượng ly
              </label>
              <div className="inline-flex items-center gap-3 bg-stone-100 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-base w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ghi chú pha chế
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Mang đi, ít đá riêng"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-4">
          <div className="text-xs">
            <div className="text-stone-500">
              Đơn giá: {pricing.unit_price_vnd.toLocaleString('vi-VN')} đ / ly
            </div>
            <div className="text-base font-mono font-bold text-amber-800">
              Thành tiền: {pricing.line_total_vnd.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-3 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800"
          >
            Thêm vào Giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
}
```

### File 4: `C:\bib\cf_19\apps\web\src\features\pos\EscPosThermalReceiptModal.tsx`
```tsx
import { Ban, Printer, X } from 'lucide-react';

export interface EscPosThermalReceiptModalProps {
  isOpen: boolean;
  orderCode: string;
  receiptText: string;
  canVoid: boolean;
  onClose: () => void;
  onRequestVoid?: () => void;
}

export function EscPosThermalReceiptModal({
  isOpen,
  orderCode,
  receiptText,
  canVoid,
  onClose,
  onRequestVoid,
}: EscPosThermalReceiptModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
        <div className="px-5 py-4 bg-stone-900 text-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              Hóa Đơn Nhiệt ESC/POS 42 Cột — {orderCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 bg-stone-100 flex justify-center">
          <pre className="bg-white text-stone-900 font-mono text-[11px] leading-relaxed p-4 rounded-xl shadow border border-stone-300 overflow-x-auto whitespace-pre">
            {receiptText}
          </pre>
        </div>

        <div className="px-5 py-4 bg-white border-t border-stone-200 flex flex-wrap justify-between gap-2">
          {canVoid && onRequestVoid ? (
            <button
              type="button"
              onClick={onRequestVoid}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              <Ban className="w-4 h-4" />
              Hủy Hóa Đơn Đã In (PIN Quản Lý)
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
          >
            <Printer className="w-4 h-4" />
            In Hóa Đơn Nhiệt (ESC/POS)
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M4.3 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\api\posCatalogApi.ts','C:\bib\cf_19\apps\web\src\store\posTerminalStore.ts','C:\bib\cf_19\apps\web\src\features\pos\PosModifierMatrixModal.tsx','C:\bib\cf_19\apps\web\src\features\pos\EscPosThermalReceiptModal.tsx') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# POS TERMINAL WORKBENCH, LAYOUT INTEGRATION & 14 VITEST TESTS (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây: `PosTerminalWorkbench.tsx`, cập nhật `CashierPosLayout.tsx`, cập nhật `StoreManagerLayout.tsx`, và tạo bộ 14 Vitest Frontend Tests `m4-pos-terminal-offline.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thêm import thừa, không rút gọn test cases.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M4.3 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\apps\web\src\__tests__\m4-pos-terminal-offline.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx`
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  CloudOff,
  Coffee,
  Printer,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Wifi,
} from 'lucide-react';
import {
  SEED_IDS,
  type PaymentMethod,
  type PosOrderFullDto,
  type StoreCatalogProductDTO,
  type StorePosCatalogDTO,
} from '@cf19/shared';
import { ApiClientError, voidPosOrder } from '../../api/apiClient';
import {
  fetchOrderReceiptApi,
  fetchStorePosCatalogApi,
  fetchStorePosOrdersApi,
  submitPosOrderApi,
  syncOfflinePosOrdersApi,
} from '../../api/posCatalogApi';
import {
  ManagerPinModal,
  type ManagerPinSubmitPayload,
} from '../../components/ManagerPinModal';
import { usePosTerminalStore } from '../../store/posTerminalStore';
import { EscPosThermalReceiptModal } from './EscPosThermalReceiptModal';
import {
  PosModifierMatrixModal,
  type PosModifierConfirmPayload,
} from './PosModifierMatrixModal';

export interface PosTerminalWorkbenchProps {
  actorId: string;
  storeId: string;
  shiftId: string;
}

export function PosTerminalWorkbench({
  actorId,
  storeId,
  shiftId,
}: PosTerminalWorkbenchProps) {
  const [catalog, setCatalog] = useState<StorePosCatalogDTO | null>(null);
  const [orders, setOrders] = useState<PosOrderFullDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [activeProduct, setActiveProduct] = useState<StoreCatalogProductDTO | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIETQR');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<{
    orderId: string;
    orderCode: string;
    text: string;
    canVoid: boolean;
  } | null>(null);
  const [voidTarget, setVoidTarget] = useState<{
    id: string;
    orderCode: string;
  } | null>(null);

  const cartItems = usePosTerminalStore((s) => s.cartItems);
  const isOfflineMode = usePosTerminalStore((s) => s.isOfflineSimulationMode);
  const offlineQueue = usePosTerminalStore((s) => s.offlineOrderQueue);
  const addToCart = usePosTerminalStore((s) => s.addToCart);
  const updateCartLineQty = usePosTerminalStore((s) => s.updateCartLineQty);
  const removeCartLine = usePosTerminalStore((s) => s.removeCartLine);
  const clearCart = usePosTerminalStore((s) => s.clearCart);
  const setOfflineMode = usePosTerminalStore((s) => s.setOfflineSimulationMode);
  const enqueueOfflineOrder = usePosTerminalStore((s) => s.enqueueOfflineOrder);
  const removeSyncedOfflineOrders = usePosTerminalStore(
    (s) => s.removeSyncedOfflineOrders,
  );

  const loadData = useCallback(async () => {
    const [catRes, ordRes] = await Promise.all([
      fetchStorePosCatalogApi(actorId, storeId),
      fetchStorePosOrdersApi(actorId, storeId),
    ]);
    setCatalog(catRes.data);
    setOrders(ordRes.data);
  }, [actorId, storeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    if (selectedCategoryId === 'ALL') return catalog.products;
    return catalog.products.filter((p) => p.category_id === selectedCategoryId);
  }, [catalog, selectedCategoryId]);

  const cartTotalVnd = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotalVnd, 0),
    [cartItems],
  );

  const handleAddConfiguredDrink = (payload: PosModifierConfirmPayload) => {
    addToCart(payload);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setErrorMsg(null);
    setStatusMessage(null);

    const itemsPayload = cartItems.map((line) => ({
      product_id: line.productId,
      variant_id: line.variantId,
      modifier_ids: line.modifierIds,
      quantity: line.quantity,
      notes: line.notes,
    }));

    if (isOfflineMode) {
      const offlineCode = `POS-OFF-${Date.now().toString().slice(-6)}`;
      enqueueOfflineOrder({
        client_order_code: offlineCode,
        payment_method: paymentMethod,
        customer_phone: customerPhone.trim() || undefined,
        created_offline_at: new Date().toISOString(),
        items: itemsPayload,
      });
      clearCart();
      setStatusMessage(
        `Chế độ Offline: Đã lưu đơn ${offlineCode} vào hàng đợi cục bộ (sẵn sàng đồng bộ Idempotent khi có mạng).`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPosOrderApi(actorId, storeId, {
        shift_id: shiftId,
        payment_method: paymentMethod,
        customer_phone: customerPhone.trim() || undefined,
        items: itemsPayload,
      });
      clearCart();
      setCustomerPhone('');
      setStatusMessage(
        `Đã tạo đơn ${res.data.order.order_code} (${res.data.order.payment_method} • ${res.data.order.total_amount_vnd.toLocaleString('vi-VN')} đ)`,
      );
      setReceiptModal({
        orderId: res.data.order.id,
        orderCode: res.data.order.order_code,
        text: res.data.thermal_receipt_text,
        canVoid: res.data.order.payment_status !== 'VOIDED',
      });
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể tạo đơn POS.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSyncOffline = async () => {
    if (offlineQueue.length === 0) return;
    setErrorMsg(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const res = await syncOfflinePosOrdersApi(actorId, storeId, {
        shift_id: shiftId,
        orders: offlineQueue,
      });
      removeSyncedOfflineOrders(offlineQueue.map((o) => o.client_order_code));
      setStatusMessage(
        `Đồng bộ Offline hoàn tất: ${res.data.synced_new_count} đơn mới, ${res.data.idempotent_existing_count} đơn đã tồn tại (Idempotent).`,
      );
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể đồng bộ lô đơn Offline.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceipt = async (ord: PosOrderFullDto) => {
    const res = await fetchOrderReceiptApi(actorId, storeId, ord.id);
    setReceiptModal({
      orderId: ord.id,
      orderCode: ord.order_code,
      text: res.data.thermal_receipt_text,
      canVoid: ord.payment_status !== 'VOIDED',
    });
  };

  const handleConfirmVoid = async (payload: ManagerPinSubmitPayload) => {
    if (!voidTarget) return;
    const res = await voidPosOrder(actorId, storeId, voidTarget.id, payload);
    setStatusMessage(
      `Đã hủy đơn ${res.order.order_code} thành công (Audit ID: ${res.approval_audit_id})`,
    );
    setReceiptModal(null);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-stone-800">
            Hệ số giá vùng chi nhánh:{' '}
            <span className="font-mono text-amber-800">
              {catalog?.store.price_multiplier.toFixed(2) ?? '1.00'}x
            </span>
          </span>
          <span className="text-stone-400">|</span>
          <button
            type="button"
            onClick={() => setOfflineMode(!isOfflineMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition ${
              isOfflineMode
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isOfflineMode ? (
              <>
                <CloudOff className="w-4 h-4" />
                Đang giả lập MẤT MẠNG (Offline Queue)
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Trực tuyến (Online Sync)
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-stone-600">
            Hàng đợi Offline: <strong>{offlineQueue.length}</strong> đơn
          </span>
          <button
            type="button"
            disabled={offlineQueue.length === 0 || submitting}
            onClick={() => void handleBatchSyncOffline()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 text-white text-xs font-semibold hover:bg-indigo-800 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đồng Bộ Lô Đơn Offline Lên Server (Idempotent)
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-700 text-white'
                  : 'bg-white border border-stone-200 text-stone-700'
              }`}
            >
              Tất cả món
            </button>
            {catalog?.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  selectedCategoryId === cat.id
                    ? 'bg-amber-700 text-white'
                    : 'bg-white border border-stone-200 text-stone-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => setActiveProduct(prod)}
                className="bg-white rounded-2xl border border-stone-200 p-4 text-left hover:border-amber-600 hover:shadow-md transition"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <Coffee className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-stone-900">{prod.name}</div>
                <div className="text-xs font-mono text-amber-800 font-bold mt-1">
                  {prod.effective_base_price_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Chạm để chọn Size &amp; Topping
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingCart className="w-4 h-4 text-amber-700" />
                <span>Giỏ Hàng POS ({cartItems.length} dòng)</span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:underline"
                >
                  Xóa hết
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                Chạm vào đồ uống bên trái để thêm vào đơn hàng.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cartItems.map((line) => (
                  <div
                    key={line.cartLineId}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>
                        {line.productName} ({line.sizeCode})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCartLine(line.cartLineId)}
                        className="text-stone-400 hover:text-red-600"
                        aria-label="Xóa món"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {line.modifierNames.length > 0 && (
                      <div className="text-[11px] text-stone-500">
                        + {line.modifierNames.join(', ')}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartLineQty(line.cartLineId, line.quantity - 1)
                          }
                          className="px-2 py-0.5 rounded bg-white border border-stone-300"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartLineQty(line.cartLineId, line.quantity + 1)
                          }
                          className="px-2 py-0.5 rounded bg-white border border-stone-300"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono font-bold text-amber-800">
                        {line.lineTotalVnd.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('VIETQR')}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  paymentMethod === 'VIETQR'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                VietQR Động
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                Tiền Mặt (CASH)
              </button>
            </div>

            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="SĐT khách tích điểm (tùy chọn)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />

            <div className="flex justify-between items-center text-sm font-bold">
              <span>Tổng thanh toán:</span>
              <span className="font-mono text-lg text-amber-800">
                {cartTotalVnd.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <button
              type="button"
              disabled={cartItems.length === 0 || submitting}
              onClick={() => void handleCheckout()}
              className="w-full py-3 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800 disabled:opacity-40"
            >
              {isOfflineMode
                ? 'Lưu Đơn Vào Hàng Đợi Offline'
                : 'Thanh Toán & In Hóa Đơn ESC/POS'}
            </button>
          </div>
        </aside>
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
        <h2 className="font-bold text-base">
          Hóa Đơn Gần Nhất Tại Chi Nhánh ({orders.length} đơn)
        </h2>
        <div className="space-y-2">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-stone-900">
                  {ord.order_code}
                </span>{' '}
                • <span className="font-semibold">{ord.payment_method}</span> •{' '}
                <span className="font-mono">{ord.payment_status}</span> •{' '}
                <strong className="font-mono text-amber-800">
                  {ord.total_amount_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleOpenReceipt(ord)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 font-semibold hover:bg-stone-100"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Bill ESC/POS
                </button>
                {ord.payment_status !== 'VOIDED' && (
                  <button
                    type="button"
                    onClick={() =>
                      setVoidTarget({ id: ord.id, orderCode: ord.order_code })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Hủy (PIN)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <PosModifierMatrixModal
        product={activeProduct}
        priceMultiplier={catalog?.store.price_multiplier ?? 1}
        modifiers={catalog?.modifiers ?? []}
        onClose={() => setActiveProduct(null)}
        onConfirm={handleAddConfiguredDrink}
      />

      <EscPosThermalReceiptModal
        isOpen={receiptModal !== null}
        orderCode={receiptModal?.orderCode ?? ''}
        receiptText={receiptModal?.text ?? ''}
        canVoid={receiptModal?.canVoid ?? false}
        onClose={() => setReceiptModal(null)}
        onRequestVoid={() => {
          if (receiptModal) {
            setVoidTarget({
              id: receiptModal.orderId,
              orderCode: receiptModal.orderCode,
            });
          }
        }}
      />

      <ManagerPinModal
        isOpen={voidTarget !== null}
        title="Phê duyệt Hủy Hóa Đơn Đã In"
        description={
          voidTarget
            ? `Hủy đơn ${voidTarget.orderCode} yêu cầu mã PIN 6 số của Quản lý chi nhánh hoặc Chủ chuỗi.`
            : ''
        }
        storeId={storeId || SEED_IDS.stores.store01}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchCurrentShift,
  type AnyShiftRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { PosTerminalWorkbench } from '../features/pos/PosTerminalWorkbench';
import { useAuthStore } from '../store/authStore';

export function CashierPosLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [shift, setShift] = useState<AnyShiftRecord | null>(null);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const loadShift = async () => {
      const res = await fetchCurrentShift(actor.id, activeStoreId, actor.role);
      if (!active) return;
      setShift(res.data);
      setSource(res.source);
    };
    void loadShift();
    return () => {
      active = false;
    };
  }, [actor.id, actor.role, activeStoreId]);

  const activeShiftId = shift?.id ?? SEED_IDS.posShifts.store01OpenShift;

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title={`Quầy Thu Ngân POS Cảm Ứng — ${actor.storeLabel}`}
        subtitle={`Modifier Matrix, Offline-First Sync, ESC/POS 42 cột & Blind Shift Close (${source})`}
        badgeText="CASHIER_STAFF"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <EyeOff className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-sm">
              Ca Làm Việc Hiện Tại (Chế độ Đóng Ca Đếm Tiền Mù — Blind Shift Close)
            </h2>
          </div>
          {shift ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-stone-500">Trạng thái</div>
                <div className="font-bold text-emerald-700 mt-0.5">{shift.status}</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-stone-500">Tiền đầu ca</div>
                <div className="font-mono font-bold mt-0.5">
                  {shift.opening_cash_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-amber-800">Tiền lý thuyết (Blind Mask)</div>
                <div className="font-mono font-bold text-amber-900 mt-0.5">
                  {shift.system_expected_cash_vnd === null
                    ? 'ĐÃ ẨN (NULL — BLIND CLOSE)'
                    : String(shift.system_expected_cash_vnd)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-amber-800">Độ lệch tiền mặt</div>
                <div className="font-mono font-bold text-amber-900 mt-0.5">
                  {shift.variance_cash_vnd === null
                    ? 'ĐÃ ẨN (NULL)'
                    : String(shift.variance_cash_vnd)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500">Đang tải thông tin ca...</p>
          )}
        </section>

        <PosTerminalWorkbench
          actorId={actor.id}
          storeId={activeStoreId}
          shiftId={activeShiftId}
        />
      </main>
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { Coffee, EyeOff, ShieldAlert, Store, Truck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchCurrentShift,
  fetchStoreInventory,
  fetchStoreLots,
  type AnyInventoryItemRecord,
  type AnyLotRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { PosTerminalWorkbench } from '../features/pos/PosTerminalWorkbench';
import { StoreTransferReplenishmentPanel } from '../features/transfers/StoreTransferReplenishmentPanel';
import { useAuthStore } from '../store/authStore';

type StoreManagerTab = 'inventory' | 'transfers' | 'pos_bom';

export function StoreManagerLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [activeTab, setActiveTab] = useState<StoreManagerTab>('inventory');
  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [lots, setLots] = useState<AnyLotRecord[]>([]);
  const [shiftId, setShiftId] = useState<string>(SEED_IDS.posShifts.store01OpenShift);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [invRes, lotsRes, shiftRes] = await Promise.all([
        fetchStoreInventory(actor.id, activeStoreId, actor.role),
        fetchStoreLots(actor.id, activeStoreId, actor.role),
        fetchCurrentShift(actor.id, activeStoreId, actor.role),
      ]);
      if (!active) {
        return;
      }
      setInventory(invRes.data);
      setLots(lotsRes.data);
      setShiftId(shiftRes.data.id);
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
        subtitle={`Cách ly Multi-Tenant, Cost-Masking, Chuyển Kho 2 Pha & Giám Sát POS (${source})`}
        badgeText="STORE_MANAGER"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'inventory'
                ? 'bg-amber-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Store className="w-4 h-4" />
            Tồn Kho Tại Quán &amp; Kiểm Thử Cách Ly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'transfers'
                ? 'bg-emerald-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            Xin Cấp Hàng &amp; Nhận Kho Nội Bộ 2 Pha (M3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pos_bom')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'pos_bom'
                ? 'bg-indigo-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Thực Đơn, Định Mức BOM &amp; Giám Sát Đơn POS (M4)
          </button>
        </div>

        {activeTab === 'transfers' && (
          <StoreTransferReplenishmentPanel
            actorId={actor.id}
            storeId={activeStoreId}
          />
        )}

        {activeTab === 'pos_bom' && (
          <PosTerminalWorkbench
            actorId={actor.id}
            storeId={activeStoreId}
            shiftId={shiftId}
          />
        )}

        {activeTab === 'inventory' && (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
```

### File 4: `C:\bib\cf_19\apps\web\src\__tests__\m4-pos-terminal-offline.test.ts`
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ESC_POS_RECEIPT_WIDTH, SEED_IDS } from '@cf19/shared';
import { ApiClientError } from '../api/apiClient';
import {
  EXTRA_MODIFIER_IDS,
  offlineCreatePosOrder,
  offlineGetOrderReceipt,
  offlineGetStorePosCatalog,
  offlineListStoreOrders,
  offlineSyncOfflinePosOrders,
  resetOfflinePosCatalogState,
} from '../api/posCatalogApi';
import { usePosTerminalStore } from '../store/posTerminalStore';

describe('M4.3 — @cf19/web Touch POS Terminal, Modifier Matrix, Offline Queue & ESC/POS Receipt', () => {
  beforeEach(() => {
    resetOfflinePosCatalogState();
    usePosTerminalStore.getState().resetPosTerminalStore();
  });

  it('1. offlineGetStorePosCatalog applies Store 1 (1.00x) vs Store 3 (1.05x) regional multiplier', () => {
    const s1 = offlineGetStorePosCatalog(SEED_IDS.stores.store01);
    const s3 = offlineGetStorePosCatalog(SEED_IDS.stores.store03);
    expect(s1.products[0]?.effective_base_price_vnd).toBe(29000);
    expect(s3.products[0]?.effective_base_price_vnd).toBe(30450);
  });

  it('2. posTerminalStore merges identical product+variant+modifiers lines in cart', () => {
    const store = usePosTerminalStore.getState();
    store.addToCart({
      productId: SEED_IDS.menuProducts.caPheSuaDa,
      productName: 'Cà Phê Sữa Đá',
      variantId: SEED_IDS.menuVariants.caPheSuaDaM,
      sizeCode: 'M',
      modifierIds: [SEED_IDS.menuModifiers.sugar50],
      modifierNames: ['Ít đường (50%)'],
      quantity: 1,
      unitPriceVnd: 29000,
    });
    store.addToCart({
      productId: SEED_IDS.menuProducts.caPheSuaDa,
      productName: 'Cà Phê Sữa Đá',
      variantId: SEED_IDS.menuVariants.caPheSuaDaM,
      sizeCode: 'M',
      modifierIds: [SEED_IDS.menuModifiers.sugar50],
      modifierNames: ['Ít đường (50%)'],
      quantity: 2,
      unitPriceVnd: 29000,
    });

    const items = usePosTerminalStore.getState().cartItems;
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(3);
    expect(items[0]?.lineTotalVnd).toBe(87000);
  });

  it('3. posTerminalStore updateCartLineQty recalculates total and removes line at qty 0', () => {
    const store = usePosTerminalStore.getState();
    store.addToCart({
      productId: SEED_IDS.menuProducts.caPheDenDa,
      productName: 'Cà Phê Đen Đá',
      variantId: SEED_IDS.menuVariants.caPheDenDaM,
      sizeCode: 'M',
      modifierIds: [],
      modifierNames: [],
      quantity: 2,
      unitPriceVnd: 25000,
    });
    const lineId = usePosTerminalStore.getState().cartItems[0]!.cartLineId;
    usePosTerminalStore.getState().updateCartLineQty(lineId, 4);
    expect(usePosTerminalStore.getState().cartItems[0]?.lineTotalVnd).toBe(100000);

    usePosTerminalStore.getState().updateCartLineQty(lineId, 0);
    expect(usePosTerminalStore.getState().cartItems).toHaveLength(0);
  });

  it('4. posTerminalStore removeCartLine and clearCart empty the cart cleanly', () => {
    const store = usePosTerminalStore.getState();
    store.addToCart({
      productId: SEED_IDS.menuProducts.caPheDenDa,
      productName: 'Cà Phê Đen Đá',
      variantId: SEED_IDS.menuVariants.caPheDenDaM,
      sizeCode: 'M',
      modifierIds: [],
      modifierNames: [],
      quantity: 1,
      unitPriceVnd: 25000,
    });
    usePosTerminalStore.getState().clearCart();
    expect(usePosTerminalStore.getState().cartItems).toHaveLength(0);
  });

  it('5. posTerminalStore manages offline simulation flag and offline order queue', () => {
    const store = usePosTerminalStore.getState();
    store.setOfflineSimulationMode(true);
    expect(usePosTerminalStore.getState().isOfflineSimulationMode).toBe(true);

    store.enqueueOfflineOrder({
      client_order_code: 'POS-OFF-001',
      payment_method: 'CASH',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [],
          quantity: 1,
        },
      ],
    });
    expect(usePosTerminalStore.getState().offlineOrderQueue).toHaveLength(1);

    usePosTerminalStore.getState().removeSyncedOfflineOrders(['POS-OFF-001']);
    expect(usePosTerminalStore.getState().offlineOrderQueue).toHaveLength(0);
  });

  it('6. offlineCreatePosOrder creates PAID CASH order with Size L + Extra Shot & 42-col ESC/POS bill', () => {
    const res = offlineCreatePosOrder(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
            modifier_ids: [
              SEED_IDS.menuModifiers.extraEspressoShot,
              SEED_IDS.menuModifiers.sugar50,
            ],
            quantity: 2,
          },
        ],
      },
    );
    expect(res.sync_status).toBe('SYNCED_NEW');
    expect(res.order.payment_status).toBe('PAID');
    expect(res.order.total_amount_vnd).toBe(90000);
    for (const line of res.thermal_receipt_text.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(ESC_POS_RECEIPT_WIDTH);
    }
  });

  it('7. offlineCreatePosOrder creates PENDING VIETQR order with dynamic vietqr_ref_code on receipt', () => {
    const res = offlineCreatePosOrder(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'VIETQR',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheDenDa,
            variant_id: SEED_IDS.menuVariants.caPheDenDaM,
            modifier_ids: [],
            quantity: 1,
          },
        ],
      },
    );
    expect(res.order.payment_status).toBe('PENDING');
    expect(res.order.vietqr_ref_code).toMatch(/^CF19STORE01/);
    expect(res.thermal_receipt_text).toContain('Ma VietQR:');
  });

  it('8. offlineCreatePosOrder rejects 2 SUGAR modifiers with 400 INVALID_MODIFIER_MATRIX', () => {
    expect(() =>
      offlineCreatePosOrder(SEED_IDS.users.cashier01, SEED_IDS.stores.store01, {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [
              SEED_IDS.menuModifiers.sugar50,
              EXTRA_MODIFIER_IDS.sugar0,
            ],
            quantity: 1,
          },
        ],
      }),
    ).toThrow(ApiClientError);
  });

  it('9. offlineCreatePosOrder rejects 2 ICE modifiers with 400 INVALID_MODIFIER_MATRIX', () => {
    expect(() =>
      offlineCreatePosOrder(SEED_IDS.users.cashier01, SEED_IDS.stores.store01, {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [
              SEED_IDS.menuModifiers.ice50,
              EXTRA_MODIFIER_IDS.ice0,
            ],
            quantity: 1,
          },
        ],
      }),
    ).toThrow(ApiClientError);
  });

  it('10. offlineCreatePosOrder applies Store 3 1.05x multiplier + Size L delta (36,450đ)', () => {
    const res = offlineCreatePosOrder(
      SEED_IDS.users.superAdmin,
      SEED_IDS.stores.store03,
      {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
            modifier_ids: [],
            quantity: 1,
          },
        ],
      },
    );
    expect(res.order.total_amount_vnd).toBe(36450);
  });

  it('11. offlineCreatePosOrder returns IDEMPOTENT_EXISTING when replayed with same client_order_code', () => {
    const first = offlineCreatePosOrder(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        client_order_code: 'POS-S01-REPLAY-01',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheDenDa,
            variant_id: SEED_IDS.menuVariants.caPheDenDaM,
            modifier_ids: [],
            quantity: 1,
          },
        ],
      },
    );
    const second = offlineCreatePosOrder(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        client_order_code: 'POS-S01-REPLAY-01',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheDenDa,
            variant_id: SEED_IDS.menuVariants.caPheDenDaM,
            modifier_ids: [],
            quantity: 1,
          },
        ],
      },
    );
    expect(first.sync_status).toBe('SYNCED_NEW');
    expect(second.sync_status).toBe('IDEMPOTENT_EXISTING');
    expect(second.order.id).toBe(first.order.id);
  });

  it('12. offlineSyncOfflinePosOrders syncs 3 offline orders idempotently without duplicating on replay', () => {
    const payload = {
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      orders: [
        {
          client_order_code: 'POS-S01-OFF-A',
          payment_method: 'CASH' as const,
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheSuaDa,
              variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
              modifier_ids: [],
              quantity: 1,
            },
          ],
        },
        {
          client_order_code: 'POS-S01-OFF-B',
          payment_method: 'VIETQR' as const,
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheDenDa,
              variant_id: SEED_IDS.menuVariants.caPheDenDaM,
              modifier_ids: [],
              quantity: 2,
            },
          ],
        },
        {
          client_order_code: 'POS-S01-OFF-C',
          payment_method: 'CASH' as const,
          items: [
            {
              product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
              variant_id: SEED_IDS.menuVariants.bacXiuM,
              modifier_ids: [],
              quantity: 1,
            },
          ],
        },
      ],
    };

    const first = offlineSyncOfflinePosOrders(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      payload,
    );
    expect(first.synced_new_count).toBe(3);
    expect(first.idempotent_existing_count).toBe(0);

    const replay = offlineSyncOfflinePosOrders(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      payload,
    );
    expect(replay.synced_new_count).toBe(0);
    expect(replay.idempotent_existing_count).toBe(3);
    expect(offlineListStoreOrders(SEED_IDS.stores.store01)).toHaveLength(3);
  });

  it('13. offlineGetOrderReceipt returns formatted ESC/POS receipt for created order', () => {
    const created = offlineCreatePosOrder(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      {
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [],
            quantity: 1,
          },
        ],
      },
    );
    const receipt = offlineGetOrderReceipt(
      SEED_IDS.stores.store01,
      created.order.id,
    );
    expect(receipt.thermal_receipt_text).toContain(created.order.order_code);
    expect(receipt.thermal_receipt_text).toContain('29,000d');
  });

  it('14. resetOfflinePosCatalogState clears offline orders cleanly', () => {
    offlineCreatePosOrder(SEED_IDS.users.cashier01, SEED_IDS.stores.store01, {
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'CASH',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheDenDa,
          variant_id: SEED_IDS.menuVariants.caPheDenDaM,
          modifier_ids: [],
          quantity: 1,
        },
      ],
    });
    resetOfflinePosCatalogState();
    expect(offlineListStoreOrders(SEED_IDS.stores.store01)).toHaveLength(0);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M4.3 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx','C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx','C:\bib\cf_19\apps\web\src\__tests__\m4-pos-terminal-offline.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
