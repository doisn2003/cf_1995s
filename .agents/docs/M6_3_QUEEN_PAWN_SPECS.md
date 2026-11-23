# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M6.3 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M6.3 - Frontend Barista KDS Board (SLA Timer Xanh/Vàng/Đỏ), Blind Shift Cash Close & Store EOD BOM Stocktake UI + Vitest Suite (@cf19/web)`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M6_3_KING_CHARTER.md`, `M6_1_QUEEN_PAWN_SPECS.md`, `M6_2_QUEEN_PAWN_SPECS.md`.
- **Phân bổ cân bằng 8 files (`4 + 4`, không trùng lặp file):**
  - **PHIẾU TỐT #1 (`pawn-flash-1` — 4 files):** `kdsAndShiftApi.ts`, `BaristaKdsQueueWorkbench.tsx`, `BlindShiftCloseWorkbench.tsx`, `BaristaKdsLayout.tsx`.
  - **PHIẾU TỐT #2 (`pawn-flash-2` — 4 files):** `StoreDailyStocktakePanel.tsx`, `CashierPosLayout.tsx`, `StoreManagerLayout.tsx`, `m6-kds-blindclose-stocktake-ui.test.ts` (16 Vitest Frontend test cases).
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không để biến/import thừa (`noUnusedLocals: true`, `noUnusedParameters: true`), dùng import không đuôi `.js` trong `@cf19/web` (`moduleResolution: "bundler"`).
  - Bảo toàn 100% **72/72 bài test hiện có của `@cf19/web`**. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 4 files trong `@cf19/web`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\web\src\api\kdsAndShiftApi.ts` (Tạo mới)
  2. `C:\bib\cf_19\apps\web\src\features\kds\BaristaKdsQueueWorkbench.tsx` (Tạo mới)
  3. `C:\bib\cf_19\apps\web\src\features\pos\BlindShiftCloseWorkbench.tsx` (Tạo mới)
  4. `C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx` (Overwrite)

### File 1: `C:\bib\cf_19\apps\web\src\api\kdsAndShiftApi.ts`

```ts
import {
  SEED_IDS,
  allocateStoreBomFifoDeduction,
  calculateBlindShiftCloseVariance,
  calculateDailyStocktakeVariance,
  calculateOrderBomRequirementsAndCogs,
  classifyKdsWaitSla,
  type BaristaAlertSeverity,
  type BaristaLowStockAlertDTO,
  type BlindShiftCloseResultDTO,
  type BomInventoryCostLookup,
  type BomRecipeWithItemsDTO,
  type KdsOrderCompletionResultDTO,
  type KdsStatus,
  type KdsTicketBoardItemDTO,
  type MenuModifierDto,
  type PaymentMethod,
  type PaymentStatus,
  type PosShiftFullDto,
  type StoreBomLotSnapshotInput,
  type StoreDailyStocktakeBatchResultDTO,
  type StoreDailyStocktakeItemResultDTO,
  type SubmitStoreDailyStocktakeInput,
} from '@cf19/shared';
import { ApiClientError, type ApiCallResult } from './apiClient';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

interface OfflineKdsOrderRecord {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  kds_status: KdsStatus;
  total_amount_vnd: number;
  bom_deducted_at: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    variant_id: string;
    size_code: 'S' | 'M' | 'L';
    quantity: number;
    modifiers_json: Array<{ id: string; name: string }>;
    notes: string | null;
  }>;
}

interface OfflineKdsAndShiftState {
  orders: OfflineKdsOrderRecord[];
  lots: StoreBomLotSnapshotInput[];
  shifts: PosShiftFullDto[];
  alerts: BaristaLowStockAlertDTO[];
  stocktakes: StoreDailyStocktakeItemResultDTO[];
}

const OFFLINE_INVENTORY_CATALOG: Record<string, BomInventoryCostLookup> = {
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
  [SEED_IDS.inventoryItems.freshMilk]: {
    id: SEED_IDS.inventoryItems.freshMilk,
    sku: 'ING-FRESH-MILK',
    name: 'Sữa tươi thanh trùng',
    base_unit: 'ml',
    internal_transfer_price_vnd: 39,
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

const OFFLINE_MODIFIERS_BY_ID: Record<string, MenuModifierDto> = {
  [SEED_IDS.menuModifiers.sugar50]: {
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
  [SEED_IDS.menuModifiers.extraEspressoShot]: {
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
  [SEED_IDS.menuModifiers.extraCondensedMilk]: {
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
};

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

export const OFFLINE_M6_ORDER_IDS = {
  store01GreenOrder: '90000000-0000-4000-8000-000000000001',
  store01YellowOrder: '90000000-0000-4000-8000-000000000011',
  store01RedOrder: '90000000-0000-4000-8000-000000000012',
} as const;

export const OFFLINE_M6_SHIFT_IDS = {
  store01OpenShift: SEED_IDS.posShifts.store01OpenShift,
  store02OpenShift: '80000000-0000-4000-8000-000000000002',
} as const;

function createInitialOfflineKdsAndShiftState(): OfflineKdsAndShiftState {
  const nowMs = Date.now();
  const minAgo = (mins: number) => new Date(nowMs - mins * 60_000).toISOString();

  return {
    orders: [
      {
        id: OFFLINE_M6_ORDER_IDS.store01RedOrder,
        order_code: 'POS-S01-KDS-RED01',
        store_id: SEED_IDS.stores.store01,
        shift_id: OFFLINE_M6_SHIFT_IDS.store01OpenShift,
        payment_method: 'CASH',
        payment_status: 'PAID',
        kds_status: 'QUEUED',
        total_amount_vnd: 78000,
        bom_deducted_at: null,
        created_at: minAgo(12),
        updated_at: minAgo(12),
        items: [
          {
            id: '91000000-0000-4000-8000-000000000012',
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            product_name: 'Cà Phê Sữa Đá Tây Nguyên',
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            size_code: 'M',
            quantity: 2,
            modifiers_json: [
              {
                id: SEED_IDS.menuModifiers.extraEspressoShot,
                name: 'Thêm 1 Shot Espresso',
              },
            ],
            notes: 'Ít đá, gấp cho khách mang đi',
          },
        ],
      },
      {
        id: OFFLINE_M6_ORDER_IDS.store01YellowOrder,
        order_code: 'POS-S01-KDS-YEL02',
        store_id: SEED_IDS.stores.store01,
        shift_id: OFFLINE_M6_SHIFT_IDS.store01OpenShift,
        payment_method: 'CASH',
        payment_status: 'PAID',
        kds_status: 'PREPARING',
        total_amount_vnd: 67000,
        bom_deducted_at: null,
        created_at: minAgo(7),
        updated_at: minAgo(6),
        items: [
          {
            id: '91000000-0000-4000-8000-000000000011',
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            product_name: 'Cà Phê Sữa Đá Tây Nguyên',
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            size_code: 'M',
            quantity: 2,
            modifiers_json: [
              { id: SEED_IDS.menuModifiers.sugar50, name: 'Ít đường (50%)' },
            ],
            notes: null,
          },
        ],
      },
      {
        id: OFFLINE_M6_ORDER_IDS.store01GreenOrder,
        order_code: 'POS-S01-KDS-GRN03',
        store_id: SEED_IDS.stores.store01,
        shift_id: OFFLINE_M6_SHIFT_IDS.store01OpenShift,
        payment_method: 'VIETQR',
        payment_status: 'PAID',
        kds_status: 'QUEUED',
        total_amount_vnd: 58000,
        bom_deducted_at: null,
        created_at: minAgo(2),
        updated_at: minAgo(2),
        items: [
          {
            id: '91000000-0000-4000-8000-000000000001',
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            product_name: 'Cà Phê Sữa Đá Tây Nguyên',
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            size_code: 'M',
            quantity: 2,
            modifiers_json: [],
            notes: 'Uống tại chỗ',
          },
        ],
      },
    ],
    lots: [
      {
        id: SEED_IDS.warehouseLots.store01RoastedRobusta01,
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-S01-RC-ROB-001',
        roast_date: '2026-11-10',
        received_at: '2026-11-12T07:30:00.000Z',
        remaining_qty: 50,
        status: 'AVAILABLE',
      },
      {
        id: '50000000-0000-4000-8000-000000000099',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-S01-RC-ROB-002',
        roast_date: '2026-11-18',
        received_at: '2026-11-19T08:00:00.000Z',
        remaining_qty: 2000,
        status: 'AVAILABLE',
      },
      {
        id: '50000000-0000-4000-8000-000000000101',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.condensedMilk,
        lot_code: 'LOT-S01-COND-MILK-01',
        roast_date: null,
        received_at: '2026-11-15T08:00:00.000Z',
        remaining_qty: 3000,
        status: 'AVAILABLE',
      },
      {
        id: '50000000-0000-4000-8000-000000000102',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.plasticCup500ml,
        lot_code: 'LOT-S01-CUP-500-01',
        roast_date: null,
        received_at: '2026-11-15T08:00:00.000Z',
        remaining_qty: 500,
        status: 'AVAILABLE',
      },
      {
        id: '50000000-0000-4000-8000-000000000103',
        store_id: SEED_IDS.stores.store01,
        item_id: SEED_IDS.inventoryItems.bioStraw,
        lot_code: 'LOT-S01-STRAW-BIO-01',
        roast_date: null,
        received_at: '2026-11-15T08:00:00.000Z',
        remaining_qty: 500,
        status: 'AVAILABLE',
      },
    ],
    shifts: [
      {
        id: OFFLINE_M6_SHIFT_IDS.store01OpenShift,
        store_id: SEED_IDS.stores.store01,
        cashier_id: SEED_IDS.users.cashier01,
        opened_at: minAgo(180),
        closed_at: null,
        opening_cash_vnd: 2000000,
        blind_counted_cash_vnd: null,
        system_expected_cash_vnd: 2145000,
        variance_cash_vnd: null,
        status: 'OPEN',
        notes: 'Ca sáng Quán 1 (Offline Preview)',
      },
      {
        id: OFFLINE_M6_SHIFT_IDS.store02OpenShift,
        store_id: SEED_IDS.stores.store02,
        cashier_id: SEED_IDS.users.cashier02,
        opened_at: minAgo(180),
        closed_at: null,
        opening_cash_vnd: 1500000,
        blind_counted_cash_vnd: null,
        system_expected_cash_vnd: 1500000,
        variance_cash_vnd: null,
        status: 'OPEN',
        notes: 'Ca sáng Quán 2 (Offline Preview)',
      },
    ],
    alerts: [],
    stocktakes: [],
  };
}

let offlineState: OfflineKdsAndShiftState = createInitialOfflineKdsAndShiftState();

export function resetOfflineKdsAndShiftState(): void {
  offlineState = createInitialOfflineKdsAndShiftState();
}

export function getOfflineStoreLotsSnapshot(
  storeId: string,
): StoreBomLotSnapshotInput[] {
  return offlineState.lots
    .filter((l) => l.store_id === storeId)
    .map((l) => ({ ...l }));
}

export function offlineGetStoreKdsBoard(
  storeId: string,
  options: { includeCompleted?: boolean; referenceNowMs?: number } = {},
): KdsTicketBoardItemDTO[] {
  const nowMs = options.referenceNowMs ?? Date.now();
  return offlineState.orders
    .filter((o) => {
      if (o.store_id !== storeId) return false;
      if (o.payment_status === 'VOIDED') return false;
      if (!options.includeCompleted && o.kds_status === 'COMPLETED') return false;
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((o): KdsTicketBoardItemDTO => {
      const sla = classifyKdsWaitSla(o.created_at, nowMs);
      return {
        id: o.id,
        order_code: o.order_code,
        store_id: o.store_id,
        shift_id: o.shift_id,
        kds_status: o.kds_status,
        payment_status: o.payment_status,
        bom_deducted_at: o.bom_deducted_at,
        created_at: o.created_at,
        updated_at: o.updated_at,
        wait_minutes: sla.wait_minutes,
        sla_level: sla.sla_level,
        items: o.items.map((it) => structuredClone(it)),
      };
    });
}

export function offlineCompleteKdsOrderBomDeduction(
  storeId: string,
  orderId: string,
  allowPartialOnShortage: boolean = false,
): KdsOrderCompletionResultDTO {
  const order = offlineState.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new ApiClientError(404, 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
  }
  if (order.store_id !== storeId) {
    throw new ApiClientError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `Order ${orderId} does not belong to store ${storeId}`,
    );
  }
  if (order.payment_status === 'VOIDED') {
    throw new ApiClientError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot complete voided order ${order.order_code}`,
    );
  }
  if (order.bom_deducted_at !== null) {
    return {
      order_id: order.id,
      order_code: order.order_code,
      store_id: order.store_id,
      kds_status: order.kds_status,
      bom_deducted_at: order.bom_deducted_at,
      already_deducted: true,
      has_shortage: false,
      deductions: [],
    };
  }

  const bom = calculateOrderBomRequirementsAndCogs({
    lines: order.items.map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id,
      modifier_ids: it.modifiers_json.map((m) => m.id),
      quantity: it.quantity,
    })),
    recipes: OFFLINE_BOM_RECIPES,
    modifiersById: OFFLINE_MODIFIERS_BY_ID,
    inventoryItemsById: OFFLINE_INVENTORY_CATALOG,
  });

  let allocation;
  try {
    allocation = allocateStoreBomFifoDeduction({
      storeId,
      requirements: bom.requirements.map((r) => ({
        inventory_item_id: r.inventory_item_id,
        sku: r.sku,
        name: r.name,
        base_unit: r.base_unit,
        required_qty: r.total_required_qty,
      })),
      availableLots: offlineState.lots,
      allowPartialOnShortage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Insufficient store BOM stock';
    throw new ApiClientError(409, 'INSUFFICIENT_STORE_BOM_STOCK', msg);
  }

  offlineState.lots = allocation.updated_lots;
  const nowIso = new Date().toISOString();
  order.kds_status = 'COMPLETED';
  order.bom_deducted_at = nowIso;
  order.updated_at = nowIso;

  return {
    order_id: order.id,
    order_code: order.order_code,
    store_id: order.store_id,
    kds_status: 'COMPLETED',
    bom_deducted_at: nowIso,
    already_deducted: false,
    has_shortage: allocation.has_shortage,
    deductions: allocation.deductions,
  };
}

export function offlineAdvanceKdsTicketStatus(
  storeId: string,
  orderId: string,
  targetStatus: KdsStatus,
  allowPartialOnShortage: boolean = false,
): KdsOrderCompletionResultDTO {
  if (targetStatus === 'COMPLETED') {
    return offlineCompleteKdsOrderBomDeduction(
      storeId,
      orderId,
      allowPartialOnShortage,
    );
  }
  const order = offlineState.orders.find(
    (o) => o.id === orderId && o.store_id === storeId,
  );
  if (!order) {
    throw new ApiClientError(404, 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
  }
  if (order.kds_status === 'COMPLETED') {
    throw new ApiClientError(
      409,
      'KDS_INVALID_TRANSITION',
      `Completed order ${order.order_code} cannot revert to ${targetStatus}`,
    );
  }
  order.kds_status = targetStatus;
  order.updated_at = new Date().toISOString();

  return {
    order_id: order.id,
    order_code: order.order_code,
    store_id: order.store_id,
    kds_status: order.kds_status,
    bom_deducted_at: order.bom_deducted_at ?? '',
    already_deducted: false,
    has_shortage: false,
    deductions: [],
  };
}

export function offlineReportBaristaLowStockAlert(
  actorId: string,
  actorName: string,
  storeId: string,
  input: {
    inventory_item_id: string;
    severity: BaristaAlertSeverity;
    note: string;
  },
): BaristaLowStockAlertDTO {
  const item = OFFLINE_INVENTORY_CATALOG[input.inventory_item_id];
  if (!item) {
    throw new ApiClientError(
      404,
      'INVENTORY_ITEM_NOT_FOUND',
      `Inventory item ${input.inventory_item_id} not found`,
    );
  }
  const alert: BaristaLowStockAlertDTO = {
    id: crypto.randomUUID(),
    store_id: storeId,
    inventory_item_id: item.id,
    sku: item.sku,
    item_name: item.name,
    reported_by: actorId,
    reported_by_name: actorName,
    severity: input.severity,
    note: input.note,
    resolved: false,
    created_at: new Date().toISOString(),
  };
  offlineState.alerts.unshift(alert);
  return structuredClone(alert);
}

export function offlineListLowStockAlerts(storeId: string): BaristaLowStockAlertDTO[] {
  return offlineState.alerts
    .filter((a) => a.store_id === storeId)
    .map((a) => structuredClone(a));
}

export function offlineOpenPosShift(
  actorId: string,
  storeId: string,
  openingCashVnd: number,
  notes?: string,
): PosShiftFullDto {
  const existingOpen = offlineState.shifts.find(
    (sh) => sh.store_id === storeId && sh.status === 'OPEN',
  );
  if (existingOpen) {
    throw new ApiClientError(
      409,
      'SHIFT_ALREADY_OPEN',
      'Store already has an open shift',
    );
  }
  const shift: PosShiftFullDto = {
    id: crypto.randomUUID(),
    store_id: storeId,
    cashier_id: actorId,
    opened_at: new Date().toISOString(),
    closed_at: null,
    opening_cash_vnd: openingCashVnd,
    blind_counted_cash_vnd: null,
    system_expected_cash_vnd: null,
    variance_cash_vnd: null,
    status: 'OPEN',
    notes: notes?.trim() || null,
  };
  offlineState.shifts.unshift(shift);
  return structuredClone(shift);
}

export function offlineBlindClosePosShift(
  storeId: string,
  shiftId: string,
  blindCountedCashVnd: number,
  notes?: string,
): BlindShiftCloseResultDTO {
  const shift = offlineState.shifts.find(
    (s) => s.id === shiftId && s.store_id === storeId,
  );
  if (!shift) {
    throw new ApiClientError(404, 'SHIFT_NOT_FOUND', `Shift ${shiftId} not found`);
  }
  if (shift.status === 'CLOSED') {
    throw new ApiClientError(
      409,
      'SHIFT_ALREADY_CLOSED',
      `Shift ${shiftId} is already closed`,
    );
  }

  const shiftOrders = offlineState.orders.filter(
    (o) => o.shift_id === shift.id && o.store_id === storeId,
  );

  const calc = calculateBlindShiftCloseVariance({
    openingCashVnd: shift.opening_cash_vnd,
    blindCountedCashVnd,
    orders: shiftOrders.map((o) => ({
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      total_amount_vnd: o.total_amount_vnd,
    })),
  });

  const closedAt = new Date().toISOString();
  shift.status = 'CLOSED';
  shift.closed_at = closedAt;
  shift.blind_counted_cash_vnd = calc.blind_counted_cash_vnd;
  shift.system_expected_cash_vnd = calc.system_expected_cash_vnd;
  shift.variance_cash_vnd = calc.variance_cash_vnd;
  shift.notes = notes?.trim() || shift.notes;

  return {
    shift_id: shift.id,
    store_id: shift.store_id,
    cashier_id: shift.cashier_id,
    status: 'CLOSED',
    opened_at: shift.opened_at,
    closed_at: closedAt,
    opening_cash_vnd: calc.opening_cash_vnd,
    cash_sales_vnd: calc.cash_sales_vnd,
    vietqr_sales_vnd: calc.vietqr_sales_vnd,
    paid_cash_orders_count: calc.paid_cash_orders_count,
    voided_orders_count: calc.voided_orders_count,
    system_expected_cash_vnd: calc.system_expected_cash_vnd,
    blind_counted_cash_vnd: calc.blind_counted_cash_vnd,
    variance_cash_vnd: calc.variance_cash_vnd,
    variance_status: calc.variance_status,
    notes: shift.notes,
  };
}

export function offlineSubmitStoreDailyStocktake(
  actorId: string,
  input: SubmitStoreDailyStocktakeInput,
): StoreDailyStocktakeBatchResultDTO {
  const nowIso = new Date().toISOString();
  const saved: StoreDailyStocktakeItemResultDTO[] = [];
  let abnormalCount = 0;

  for (const entry of input.items) {
    const inv = OFFLINE_INVENTORY_CATALOG[entry.inventory_item_id];
    if (!inv) {
      throw new ApiClientError(
        404,
        'INVENTORY_ITEM_NOT_FOUND',
        `Inventory item ${entry.inventory_item_id} not found`,
      );
    }

    const calc = calculateDailyStocktakeVariance({
      openingQty: entry.opening_qty,
      receivedInQty: entry.received_in_qty,
      bomConsumedQty: entry.bom_consumed_qty,
      actualCountedQty: entry.actual_counted_qty,
    });
    if (calc.is_abnormal_shrinkage) {
      abnormalCount += 1;
    }

    const existingIdx = offlineState.stocktakes.findIndex(
      (st) =>
        st.store_id === input.store_id &&
        st.inventory_item_id === inv.id &&
        st.stocktake_date === input.stocktake_date,
    );

    const record: StoreDailyStocktakeItemResultDTO = {
      id:
        existingIdx >= 0
          ? offlineState.stocktakes[existingIdx]!.id
          : crypto.randomUUID(),
      store_id: input.store_id,
      inventory_item_id: inv.id,
      sku: inv.sku,
      item_name: inv.name,
      base_unit: inv.base_unit,
      stocktake_date: input.stocktake_date,
      opening_qty: calc.opening_qty,
      received_in_qty: calc.received_in_qty,
      bom_consumed_qty: calc.bom_consumed_qty,
      theoretical_closing_qty: calc.theoretical_closing_qty,
      actual_counted_qty: calc.actual_counted_qty,
      variance_qty: calc.variance_qty,
      variance_pct: calc.variance_pct,
      is_abnormal_shrinkage: calc.is_abnormal_shrinkage,
      counted_by: actorId,
      notes: entry.notes?.trim() || input.notes?.trim() || null,
      updated_at: nowIso,
    };

    if (existingIdx >= 0) {
      offlineState.stocktakes[existingIdx] = record;
    } else {
      offlineState.stocktakes.unshift(record);
    }
    saved.push(structuredClone(record));
  }

  return {
    store_id: input.store_id,
    stocktake_date: input.stocktake_date,
    total_items_counted: saved.length,
    abnormal_shrinkage_count: abnormalCount,
    items: saved,
  };
}

export function offlineListStoreDailyStocktakes(
  storeId: string,
  stocktakeDate?: string,
): StoreDailyStocktakeItemResultDTO[] {
  return offlineState.stocktakes
    .filter((st) => {
      if (st.store_id !== storeId) return false;
      if (stocktakeDate && st.stocktake_date !== stocktakeDate) return false;
      return true;
    })
    .map((st) => structuredClone(st));
}

async function m6FetchJson<T>(
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
      body.error?.code ?? 'M6_API_ERROR',
      body.error?.message ?? `HTTP ${response.status}`,
    );
  }
  return body.data as T;
}

export async function fetchStoreKdsBoardApi(
  actorId: string,
  storeId: string,
  includeCompleted: boolean = false,
): Promise<ApiCallResult<KdsTicketBoardItemDTO[]>> {
  try {
    const data = await m6FetchJson<KdsTicketBoardItemDTO[]>(
      `/api/v1/kds/stores/${storeId}/board?include_completed=${includeCompleted ? 'true' : 'false'}`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineGetStoreKdsBoard(storeId, { includeCompleted }),
      source: 'offline_fallback',
    };
  }
}

export async function advanceKdsTicketApi(
  actorId: string,
  storeId: string,
  orderId: string,
  targetStatus: KdsStatus,
  allowPartialOnShortage: boolean = false,
): Promise<ApiCallResult<KdsOrderCompletionResultDTO>> {
  try {
    const data = await m6FetchJson<KdsOrderCompletionResultDTO>(
      `/api/v1/kds/stores/${storeId}/orders/${orderId}/advance`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify({
          target_status: targetStatus,
          allow_partial_on_shortage: allowPartialOnShortage,
        }),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineAdvanceKdsTicketStatus(
        storeId,
        orderId,
        targetStatus,
        allowPartialOnShortage,
      ),
      source: 'offline_fallback',
    };
  }
}

export async function completeKdsOrderBomApi(
  actorId: string,
  storeId: string,
  orderId: string,
  allowPartialOnShortage: boolean = false,
): Promise<ApiCallResult<KdsOrderCompletionResultDTO>> {
  try {
    const data = await m6FetchJson<KdsOrderCompletionResultDTO>(
      `/api/v1/kds/stores/${storeId}/orders/${orderId}/complete-bom`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify({
          allow_partial_on_shortage: allowPartialOnShortage,
        }),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineCompleteKdsOrderBomDeduction(
        storeId,
        orderId,
        allowPartialOnShortage,
      ),
      source: 'offline_fallback',
    };
  }
}

export async function fetchLowStockAlertsApi(
  actorId: string,
  storeId: string,
): Promise<ApiCallResult<BaristaLowStockAlertDTO[]>> {
  try {
    const data = await m6FetchJson<BaristaLowStockAlertDTO[]>(
      `/api/v1/kds/stores/${storeId}/low-stock-alerts`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineListLowStockAlerts(storeId),
      source: 'offline_fallback',
    };
  }
}

export async function reportBaristaLowStockAlertApi(
  actorId: string,
  actorName: string,
  storeId: string,
  payload: {
    inventory_item_id: string;
    severity: BaristaAlertSeverity;
    note: string;
  },
): Promise<ApiCallResult<BaristaLowStockAlertDTO>> {
  try {
    const data = await m6FetchJson<BaristaLowStockAlertDTO>(
      `/api/v1/kds/stores/${storeId}/low-stock-alerts`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineReportBaristaLowStockAlert(actorId, actorName, storeId, payload),
      source: 'offline_fallback',
    };
  }
}

export async function openPosShiftApi(
  actorId: string,
  storeId: string,
  openingCashVnd: number,
  notes?: string,
): Promise<ApiCallResult<PosShiftFullDto>> {
  try {
    const data = await m6FetchJson<PosShiftFullDto>(
      `/api/v1/shifts-stocktakes/stores/${storeId}/shifts/open`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify({
          opening_cash_vnd: openingCashVnd,
          notes,
        }),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineOpenPosShift(actorId, storeId, openingCashVnd, notes),
      source: 'offline_fallback',
    };
  }
}

export async function blindClosePosShiftApi(
  actorId: string,
  storeId: string,
  shiftId: string,
  blindCountedCashVnd: number,
  notes?: string,
): Promise<ApiCallResult<BlindShiftCloseResultDTO>> {
  try {
    const data = await m6FetchJson<BlindShiftCloseResultDTO>(
      `/api/v1/shifts-stocktakes/stores/${storeId}/shifts/${shiftId}/blind-close`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify({
          blind_counted_cash_vnd: blindCountedCashVnd,
          notes,
        }),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineBlindClosePosShift(storeId, shiftId, blindCountedCashVnd, notes),
      source: 'offline_fallback',
    };
  }
}

export async function fetchStoreDailyStocktakesApi(
  actorId: string,
  storeId: string,
  stocktakeDate?: string,
): Promise<ApiCallResult<StoreDailyStocktakeItemResultDTO[]>> {
  const qs = stocktakeDate ? `?stocktake_date=${encodeURIComponent(stocktakeDate)}` : '';
  try {
    const data = await m6FetchJson<StoreDailyStocktakeItemResultDTO[]>(
      `/api/v1/shifts-stocktakes/stores/${storeId}/stocktakes${qs}`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineListStoreDailyStocktakes(storeId, stocktakeDate),
      source: 'offline_fallback',
    };
  }
}

export async function submitStoreDailyStocktakeApi(
  actorId: string,
  payload: SubmitStoreDailyStocktakeInput,
): Promise<ApiCallResult<StoreDailyStocktakeBatchResultDTO>> {
  try {
    const data = await m6FetchJson<StoreDailyStocktakeBatchResultDTO>(
      `/api/v1/shifts-stocktakes/stores/${payload.store_id}/stocktakes`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineSubmitStoreDailyStocktake(actorId, payload),
      source: 'offline_fallback',
    };
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\src\features\kds\BaristaKdsQueueWorkbench.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  SEED_IDS,
  type BaristaAlertSeverity,
  type BaristaLowStockAlertDTO,
  type KdsOrderCompletionResultDTO,
  type KdsSlaLevel,
  type KdsTicketBoardItemDTO,
} from '@cf19/shared';
import { ApiClientError, type DataSourceMode } from '../../api/apiClient';
import {
  advanceKdsTicketApi,
  completeKdsOrderBomApi,
  fetchLowStockAlertsApi,
  fetchStoreKdsBoardApi,
  reportBaristaLowStockAlertApi,
} from '../../api/kdsAndShiftApi';

export interface BaristaKdsQueueWorkbenchProps {
  actorId: string;
  actorName: string;
  storeId: string;
}

const BAR_ALERT_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: SEED_IDS.inventoryItems.condensedMilk, label: 'Sữa đặc có đường (ml)' },
  { id: SEED_IDS.inventoryItems.roastedRobustaMed, label: 'Cà phê hạt Robusta Medium (g)' },
  { id: SEED_IDS.inventoryItems.freshMilk, label: 'Sữa tươi thanh trùng (ml)' },
  { id: SEED_IDS.inventoryItems.plasticCup500ml, label: 'Ly nhựa PET 500ml (cái)' },
  { id: SEED_IDS.inventoryItems.bioStraw, label: 'Ống hút sinh học (cái)' },
];

function getSlaCardClass(level: KdsSlaLevel): string {
  if (level === 'CRITICAL_RED') {
    return 'border-red-500 bg-red-950/30 shadow-lg shadow-red-950/50';
  }
  if (level === 'WARNING_YELLOW') {
    return 'border-amber-400 bg-amber-950/20';
  }
  return 'border-emerald-500/70 bg-stone-900';
}

function getSlaBadgeClass(level: KdsSlaLevel): string {
  if (level === 'CRITICAL_RED') {
    return 'bg-red-500/20 text-red-300 border-red-400 animate-pulse';
  }
  if (level === 'WARNING_YELLOW') {
    return 'bg-amber-500/20 text-amber-300 border-amber-400';
  }
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-400';
}

export function BaristaKdsQueueWorkbench({
  actorId,
  actorName,
  storeId,
}: BaristaKdsQueueWorkbenchProps) {
  const [tickets, setTickets] = useState<KdsTicketBoardItemDTO[]>([]);
  const [alerts, setAlerts] = useState<BaristaLowStockAlertDTO[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');
  const [allowPartial, setAllowPartial] = useState<boolean>(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [lastDeduction, setLastDeduction] = useState<KdsOrderCompletionResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [alertItemId, setAlertItemId] = useState<string>(
    SEED_IDS.inventoryItems.condensedMilk,
  );
  const [alertSeverity, setAlertSeverity] = useState<BaristaAlertSeverity>('OUT_OF_STOCK');
  const [alertNote, setAlertNote] = useState<string>('');
  const [alertSubmitting, setAlertSubmitting] = useState<boolean>(false);

  const loadKdsData = useCallback(async () => {
    const [boardRes, alertRes] = await Promise.all([
      fetchStoreKdsBoardApi(actorId, storeId, false),
      fetchLowStockAlertsApi(actorId, storeId),
    ]);
    setTickets(boardRes.data);
    setAlerts(alertRes.data);
    setSource(boardRes.source);
  }, [actorId, storeId]);

  useEffect(() => {
    void loadKdsData();
  }, [loadKdsData]);

  const handleStartPreparing = async (orderId: string) => {
    setBusyOrderId(orderId);
    setErrorMsg(null);
    try {
      await advanceKdsTicketApi(actorId, storeId, orderId, 'PREPARING', allowPartial);
      await loadKdsData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCompleteWithBom = async (orderId: string) => {
    setBusyOrderId(orderId);
    setErrorMsg(null);
    try {
      const res = await completeKdsOrderBomApi(actorId, storeId, orderId, allowPartial);
      setLastDeduction(res.data);
      await loadKdsData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSubmitLowStockAlert = async () => {
    if (alertNote.trim().length < 2) {
      setErrorMsg('Vui lòng nhập ghi chú cảnh báo nguyên liệu (tối thiểu 2 ký tự).');
      return;
    }
    setAlertSubmitting(true);
    setErrorMsg(null);
    try {
      await reportBaristaLowStockAlertApi(actorId, actorName, storeId, {
        inventory_item_id: alertItemId,
        severity: alertSeverity,
        note: alertNote.trim(),
      });
      setAlertNote('');
      await loadKdsData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setAlertSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            KDS Finance-Masking đang bật ({source}): Tuyệt đối không hiển thị giá bán, doanh thu hay tiền mặt.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2 text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPartial}
              onChange={(e) => setAllowPartial(e.target.checked)}
              className="rounded border-stone-600"
            />
            <span>Cho phép trừ kho phần khả dụng nếu thiếu nguyên liệu</span>
          </label>
          <button
            type="button"
            onClick={() => void loadKdsData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-semibold hover:bg-stone-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới KDS
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500 text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {lastDeduction && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/60 text-emerald-100 text-xs space-y-2">
          <div className="font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Đã hoàn tất đơn {lastDeduction.order_code} &amp; Tự động trừ kho BOM theo FIFO (
              {lastDeduction.already_deducted ? 'IDEMPOTENT' : `${lastDeduction.deductions.length} nguyên liệu`})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lastDeduction.deductions.map((ded) => (
              <div
                key={ded.inventory_item_id}
                className="p-2.5 rounded-xl bg-stone-900/90 border border-emerald-700/50 space-y-1"
              >
                <div className="flex justify-between font-mono font-bold">
                  <span>{ded.sku} • {ded.name}</span>
                  <span className="text-emerald-300">
                    -{ded.deducted_qty} {ded.base_unit}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 font-mono">
                  {ded.lot_slices.map((s) => `${s.lot_code} (-${s.deducted_qty}${s.depleted ? ' DEPLETED' : ''})`).join(' → ')}
                  {ded.shortage_qty > 0 && (
                    <span className="text-amber-300 ml-2">
                      Thiếu: {ded.shortage_qty} {ded.base_unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="p-10 rounded-2xl bg-stone-900 border border-stone-800 text-center text-stone-400 text-sm">
          Quầy Bar hiện trống — Chưa có đơn pha chế nào đang chờ.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className={`rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 ${getSlaCardClass(ticket.sla_level)}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-base text-white">
                        {ticket.order_code}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        Trạng thái: {ticket.kds_status}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${getSlaBadgeClass(ticket.sla_level)}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {ticket.wait_minutes}p • {ticket.sla_level}
                  </span>
                </div>

                <div className="space-y-2">
                  {ticket.items.map((line) => (
                    <div
                      key={line.id}
                      className="p-3 rounded-xl bg-stone-800/90 border border-stone-700 text-sm space-y-1"
                    >
                      <div className="flex justify-between font-bold text-stone-100">
                        <span>
                          {line.product_name} ({line.size_code})
                        </span>
                        <span className="font-mono text-amber-300">x{line.quantity}</span>
                      </div>
                      {line.modifiers_json.length > 0 && (
                        <div className="text-xs text-amber-200">
                          + {line.modifiers_json.map((m) => m.name).join(', ')}
                        </div>
                      )}
                      {line.notes && (
                        <div className="text-xs text-stone-400">Ghi chú: {line.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800 space-y-2">
                {ticket.kds_status === 'QUEUED' && (
                  <button
                    type="button"
                    disabled={busyOrderId === ticket.id}
                    onClick={() => void handleStartPreparing(ticket.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-40"
                  >
                    <Flame className="w-4 h-4" />
                    Bắt Đầu Pha Chế (QUEUED → PREPARING)
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyOrderId === ticket.id}
                  onClick={() => void handleCompleteWithBom(ticket.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Hoàn Thành Món &amp; Tự Động Trừ Kho BOM Theo FIFO
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-2xl bg-stone-900 border border-stone-800 p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Báo Sắp Hết / Hết Nguyên Liệu Tại Quầy Bar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <select
            value={alertItemId}
            onChange={(e) => setAlertItemId(e.target.value)}
            className="rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
          >
            {BAR_ALERT_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={alertSeverity}
            onChange={(e) => setAlertSeverity(e.target.value as BaristaAlertSeverity)}
            className="rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
          >
            <option value="OUT_OF_STOCK">HẾT HÀNG (OUT_OF_STOCK)</option>
            <option value="LOW">SẮP HẾT (LOW)</option>
          </select>

          <input
            type="text"
            value={alertNote}
            onChange={(e) => setAlertNote(e.target.value)}
            placeholder="Ghi chú gửi Quản lý Quán..."
            className="rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
          />

          <button
            type="button"
            disabled={alertSubmitting}
            onClick={() => void handleSubmitLowStockAlert()}
            className="rounded-xl bg-amber-600 text-stone-950 font-bold px-4 py-2 hover:bg-amber-500 disabled:opacity-40"
          >
            Gửi Cảnh Báo Lên Quản Lý
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-amber-300">{al.sku}</span> •{' '}
                  <span className="font-semibold text-stone-100">{al.item_name}</span> —{' '}
                  <span className="text-stone-400">{al.note}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                  {al.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\features\pos\BlindShiftCloseWorkbench.tsx`

```tsx
import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Lock,
  PlusCircle,
} from 'lucide-react';
import type { BlindShiftCloseResultDTO } from '@cf19/shared';
import { ApiClientError, type AnyShiftRecord } from '../../api/apiClient';
import {
  blindClosePosShiftApi,
  openPosShiftApi,
} from '../../api/kdsAndShiftApi';

export interface BlindShiftCloseWorkbenchProps {
  actorId: string;
  storeId: string;
  shift: AnyShiftRecord | null;
  onShiftChanged: () => void;
}

export function BlindShiftCloseWorkbench({
  actorId,
  storeId,
  shift,
  onShiftChanged,
}: BlindShiftCloseWorkbenchProps) {
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [newOpeningCash, setNewOpeningCash] = useState<string>('2000000');
  const [openNotes, setOpenNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [closedResult, setClosedResult] = useState<BlindShiftCloseResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBlindClose = async () => {
    if (!shift) return;
    const counted = Number(countedCashInput);
    if (!Number.isInteger(counted) || counted < 0) {
      setErrorMsg('Số tiền mặt thực đếm phải là số nguyên VNĐ không âm.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await blindClosePosShiftApi(
        actorId,
        storeId,
        shift.id,
        counted,
        closeNotes.trim() || undefined,
      );
      setClosedResult(res.data);
      setCountedCashInput('');
      setCloseNotes('');
      onShiftChanged();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể chốt ca đếm tiền mù.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNewShift = async () => {
    const floatCash = Number(newOpeningCash);
    if (!Number.isInteger(floatCash) || floatCash < 0) {
      setErrorMsg('Tiền quỹ đầu ca phải là số nguyên VNĐ không âm.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await openPosShiftApi(
        actorId,
        storeId,
        floatCash,
        openNotes.trim() || undefined,
      );
      setClosedResult(null);
      setOpenNotes('');
      onShiftChanged();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể mở ca mới.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-amber-700" />
          <div>
            <h2 className="font-bold text-sm text-stone-900">
              Đóng Ca Đếm Tiền Mù (Blind Shift Cash Close)
            </h2>
            <p className="text-xs text-stone-500">
              Thu ngân bắt buộc nhập số tiền mặt thực đếm tại két trước khi hệ thống mở khóa số tiền lý thuyết
            </p>
          </div>
        </div>
        {shift && (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
            Ca: {shift.status}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {shift && shift.status === 'OPEN' && !closedResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div className="text-stone-500">Tiền quỹ đầu ca</div>
              <div className="font-mono font-bold text-sm text-stone-900 mt-0.5">
                {shift.opening_cash_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 md:col-span-2">
              <div className="text-amber-800 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Số tiền mặt lý thuyết hệ thống</span>
              </div>
              <div className="font-mono font-bold text-amber-900 mt-0.5">
                •••••• (ĐÃ KHÓA MÙ — BLIND GUARD)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <input
              type="number"
              min={0}
              value={countedCashInput}
              onChange={(e) => setCountedCashInput(e.target.value)}
              placeholder="Nhập tiền mặt thực tế đếm được (VNĐ)"
              className="rounded-xl border border-stone-300 px-3 py-2.5 font-mono"
            />
            <input
              type="text"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Ghi chú bàn giao ca (tùy chọn)"
              className="rounded-xl border border-stone-300 px-3 py-2.5"
            />
            <button
              type="button"
              disabled={submitting || countedCashInput.trim().length === 0}
              onClick={() => void handleBlindClose()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-700 text-white font-bold px-4 py-2.5 hover:bg-amber-800 disabled:opacity-40"
            >
              <Lock className="w-4 h-4" />
              Xác Nhận Chốt Ca Đếm Tiền Mù
            </button>
          </div>
        </div>
      )}

      {closedResult && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              closedResult.variance_status === 'SHORTAGE'
                ? 'bg-red-50 border-red-300 text-red-900'
                : closedResult.variance_status === 'SURPLUS'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-sm">
              <span className="flex items-center gap-1.5">
                {closedResult.variance_status === 'SHORTAGE' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
                <span>Kết Quả Đối Soát Chốt Ca (ĐÃ KHÓA CLOSED)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-mono text-xs bg-white border">
                {closedResult.variance_status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <div className="opacity-70">Tiền đầu ca + Doanh thu CASH</div>
                <div className="font-mono font-bold">
                  {closedResult.system_expected_cash_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div>
                <div className="opacity-70">Thu ngân thực đếm</div>
                <div className="font-mono font-bold">
                  {closedResult.blind_counted_cash_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div>
                <div className="opacity-70">Độ lệch két tiền</div>
                <div className="font-mono font-extrabold">
                  {closedResult.variance_cash_vnd >= 0 ? '+' : ''}
                  {closedResult.variance_cash_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div>
                <div className="opacity-70">Doanh thu VietQR (ngoài két)</div>
                <div className="font-mono font-bold">
                  {closedResult.vietqr_sales_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="text-xs font-bold text-stone-800">
              Mở Ca Làm Việc Mới
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <input
                type="number"
                min={0}
                value={newOpeningCash}
                onChange={(e) => setNewOpeningCash(e.target.value)}
                placeholder="Tiền quỹ đầu ca (VNĐ)"
                className="rounded-xl border border-stone-300 px-3 py-2 bg-white font-mono"
              />
              <input
                type="text"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="Ghi chú mở ca (vd: Ca chiều)"
                className="rounded-xl border border-stone-300 px-3 py-2 bg-white"
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleOpenNewShift()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-white font-bold px-4 py-2 hover:bg-emerald-800 disabled:opacity-40"
              >
                <PlusCircle className="w-4 h-4" />
                Mở Ca Mới
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

### File 4: `C:\bib\cf_19\apps\web\src\layouts\BaristaKdsLayout.tsx`

```tsx
import { useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import { RoleShellHeader } from '../components/RoleGuard';
import { BaristaKdsQueueWorkbench } from '../features/kds/BaristaKdsQueueWorkbench';
import { useAuthStore } from '../store/authStore';

export function BaristaKdsLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <RoleShellHeader
        title={`Màn Hình Quầy Pha Chế KDS — ${actor.storeLabel}`}
        subtitle="High-Contrast Dark Mode • Đồng hồ SLA Xanh/Vàng/Đỏ • Tự Động Trừ Kho BOM FIFO • Ẩn 100% Doanh Thu"
        badgeText="BARISTA_KDS"
        dark
      />

      <main className="max-w-7xl mx-auto p-6">
        <BaristaKdsQueueWorkbench
          actorId={actor.id}
          actorName={actor.fullName}
          storeId={activeStoreId}
        />
      </main>
    </div>
  );
}
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 4 files trong `@cf19/web`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\web\src\features\stocktake\StoreDailyStocktakePanel.tsx` (Tạo mới)
  2. `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx` (Overwrite — nhúng `BlindShiftCloseWorkbench`, giữ nguyên `PosTerminalWorkbench`)
  3. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (Overwrite — thêm Tab 4 Kiểm Kho Cuối Ngày BOM & Cảnh Báo Quầy Bar, bảo toàn 100% 3 tabs M1.3 / M3.3 / M4.3)
  4. `C:\bib\cf_19\apps\web\src\__tests__\m6-kds-blindclose-stocktake-ui.test.ts` (Tạo mới — 16 Vitest Frontend test cases)

### File 1: `C:\bib\cf_19\apps\web\src\features\stocktake\StoreDailyStocktakePanel.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import {
  SEED_IDS,
  calculateDailyStocktakeVariance,
  type BaristaLowStockAlertDTO,
  type StoreDailyStocktakeItemResultDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  fetchLowStockAlertsApi,
  fetchStoreDailyStocktakesApi,
  submitStoreDailyStocktakeApi,
} from '../../api/kdsAndShiftApi';

export interface StoreDailyStocktakePanelProps {
  actorId: string;
  storeId: string;
}

interface StocktakeRowDraft {
  inventory_item_id: string;
  sku: string;
  name: string;
  base_unit: string;
  opening_qty: number;
  received_in_qty: number;
  bom_consumed_qty: number;
  actual_counted_qty: string;
}

const INITIAL_DRAFTS: StocktakeRowDraft[] = [
  {
    inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
    sku: 'RC-ROB-MED',
    name: 'Cà phê hạt rang Robusta Medium',
    base_unit: 'g',
    opening_qty: 5000,
    received_in_qty: 0,
    bom_consumed_qty: 1000,
    actual_counted_qty: '3920',
  },
  {
    inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
    sku: 'ING-COND-MILK',
    name: 'Sữa đặc có đường',
    base_unit: 'ml',
    opening_qty: 3000,
    received_in_qty: 0,
    bom_consumed_qty: 500,
    actual_counted_qty: '2350',
  },
  {
    inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
    sku: 'PKG-CUP-500',
    name: 'Ly nhựa PET 500ml',
    base_unit: 'pcs',
    opening_qty: 500,
    received_in_qty: 0,
    bom_consumed_qty: 40,
    actual_counted_qty: '460',
  },
];

export function StoreDailyStocktakePanel({
  actorId,
  storeId,
}: StoreDailyStocktakePanelProps) {
  const [stocktakeDate, setStocktakeDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [drafts, setDrafts] = useState<StocktakeRowDraft[]>(INITIAL_DRAFTS);
  const [notes, setNotes] = useState<string>('');
  const [history, setHistory] = useState<StoreDailyStocktakeItemResultDTO[]>([]);
  const [barAlerts, setBarAlerts] = useState<BaristaLowStockAlertDTO[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const [stRes, alRes] = await Promise.all([
      fetchStoreDailyStocktakesApi(actorId, storeId),
      fetchLowStockAlertsApi(actorId, storeId),
    ]);
    setHistory(stRes.data);
    setBarAlerts(alRes.data);
  }, [actorId, storeId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const updateActualQty = (itemId: string, nextVal: string) => {
    setDrafts((prev) =>
      prev.map((row) =>
        row.inventory_item_id === itemId
          ? { ...row, actual_counted_qty: nextVal }
          : row,
      ),
    );
  };

  const handleSubmitStocktake = async () => {
    setErrorMsg(null);
    setStatusMsg(null);

    const parsedItems = drafts.map((row) => {
      const actual = Number(row.actual_counted_qty);
      return {
        inventory_item_id: row.inventory_item_id,
        opening_qty: row.opening_qty,
        received_in_qty: row.received_in_qty,
        bom_consumed_qty: row.bom_consumed_qty,
        actual_counted_qty: Number.isFinite(actual) && actual >= 0 ? actual : 0,
      };
    });

    setSubmitting(true);
    try {
      const res = await submitStoreDailyStocktakeApi(actorId, {
        store_id: storeId,
        stocktake_date: stocktakeDate,
        notes: notes.trim() || undefined,
        items: parsedItems,
      });
      setStatusMsg(
        `Đã lưu phiếu kiểm kho ngày ${res.data.stocktake_date} (${res.data.total_items_counted} nguyên liệu, ${res.data.abnormal_shrinkage_count} cảnh báo hao hụt bất thường > 3%).`,
      );
      await loadHistory();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể lưu phiếu kiểm kho cuối ngày.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-base text-stone-900">
                Kiểm Kho Cuối Ngày Đối Chiếu Định Mức BOM (EOD Variance Engine)
              </h2>
              <p className="text-xs text-stone-500">
                Tự động đối chiếu Tồn lý thuyết (Đầu ngày + Nhập - BOM tiêu hao) với Tồn thực đếm • Cảnh báo đỏ nếu hao hụt &gt; 3.0%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={stocktakeDate}
              onChange={(e) => setStocktakeDate(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-1.5 font-mono"
            />
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-100 text-stone-600 uppercase">
              <tr>
                <th className="px-3 py-2.5">Nguyên liệu</th>
                <th className="px-3 py-2.5 text-right">Đầu ngày</th>
                <th className="px-3 py-2.5 text-right">BOM trừ</th>
                <th className="px-3 py-2.5 text-right">Lý thuyết</th>
                <th className="px-3 py-2.5 text-right">Thực đếm</th>
                <th className="px-3 py-2.5 text-right">Chênh lệch</th>
                <th className="px-3 py-2.5">Cảnh báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {drafts.map((row) => {
                const actualNum = Number(row.actual_counted_qty);
                const preview = calculateDailyStocktakeVariance({
                  openingQty: row.opening_qty,
                  receivedInQty: row.received_in_qty,
                  bomConsumedQty: row.bom_consumed_qty,
                  actualCountedQty:
                    Number.isFinite(actualNum) && actualNum >= 0 ? actualNum : 0,
                });

                return (
                  <tr key={row.inventory_item_id}>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-stone-900">{row.name}</div>
                      <div className="font-mono text-[11px] text-stone-500">
                        {row.sku} ({row.base_unit})
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.opening_qty}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-800">
                      -{row.bom_consumed_qty}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      {preview.theoretical_closing_qty}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.actual_counted_qty}
                        onChange={(e) =>
                          updateActualQty(row.inventory_item_id, e.target.value)
                        }
                        className="w-24 text-right rounded-lg border border-stone-300 px-2 py-1 font-mono"
                      />
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono font-bold ${
                        preview.variance_qty < 0
                          ? 'text-red-700'
                          : preview.variance_qty > 0
                            ? 'text-emerald-700'
                            : 'text-stone-700'
                      }`}
                    >
                      {preview.variance_qty >= 0 ? '+' : ''}
                      {preview.variance_qty} ({preview.variance_pct}%)
                    </td>
                    <td className="px-3 py-2.5">
                      {preview.is_abnormal_shrinkage ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          HAO HỤT BẤT THƯỜNG (&gt; 3.0%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          Trong ngưỡng chuẩn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between pt-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú giải trình chênh lệch kiểm kho cuối ngày..."
            className="flex-1 min-w-[240px] rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmitStocktake()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-40"
          >
            <ClipboardCheck className="w-4 h-4" />
            Lưu Phiếu Kiểm Kho Cuối Ngày
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-stone-900">
            Lịch Sử Đối Soát Kiểm Kho ({history.length} bản ghi)
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-stone-400">Chưa có phiếu kiểm kho nào được lưu.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex justify-between items-center gap-2"
                >
                  <div>
                    <div className="font-bold text-stone-900">
                      {item.stocktake_date} • {item.item_name}
                    </div>
                    <div className="text-[11px] font-mono text-stone-500">
                      Lý thuyết: {item.theoretical_closing_qty} | Thực đếm: {item.actual_counted_qty} {item.base_unit}
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded ${
                      item.is_abnormal_shrinkage
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.variance_qty} ({item.variance_pct}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-stone-900">
            Cảnh Báo Hết Nguyên Liệu Từ Quầy Pha Chế KDS ({barAlerts.length})
          </h3>
          {barAlerts.length === 0 ? (
            <p className="text-xs text-stone-400">
              Chưa có cảnh báo thiếu nguyên liệu nào từ quầy Bar.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {barAlerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1"
                >
                  <div className="flex justify-between font-bold text-amber-950">
                    <span>{al.sku} • {al.item_name}</span>
                    <span className="font-mono text-red-700">{al.severity}</span>
                  </div>
                  <div className="text-amber-900">{al.note}</div>
                  <div className="text-[11px] text-stone-500">
                    Báo bởi: {al.reported_by_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\layouts\CashierPosLayout.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchCurrentShift,
  type AnyShiftRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { BlindShiftCloseWorkbench } from '../features/pos/BlindShiftCloseWorkbench';
import { PosTerminalWorkbench } from '../features/pos/PosTerminalWorkbench';
import { useAuthStore } from '../store/authStore';

export function CashierPosLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [shift, setShift] = useState<AnyShiftRecord | null>(null);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  const loadShift = useCallback(async () => {
    try {
      const res = await fetchCurrentShift(actor.id, activeStoreId, actor.role);
      setShift(res.data);
      setSource(res.source);
    } catch {
      setShift(null);
    }
  }, [actor.id, actor.role, activeStoreId]);

  useEffect(() => {
    void loadShift();
  }, [loadShift]);

  const activeShiftId = shift?.id ?? SEED_IDS.posShifts.store01OpenShift;

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title={`Quầy Thu Ngân POS Cảm Ứng — ${actor.storeLabel}`}
        subtitle={`Modifier Matrix, VietQR Động, Offline-First Sync, ESC/POS 42 cột & Blind Shift Close (${source})`}
        badgeText="CASHIER_STAFF"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <BlindShiftCloseWorkbench
          actorId={actor.id}
          storeId={activeStoreId}
          shift={shift}
          onShiftChanged={() => void loadShift()}
        />

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
import {
  ClipboardCheck,
  Coffee,
  EyeOff,
  ShieldAlert,
  Store,
  Truck,
} from 'lucide-react';
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
import { StoreDailyStocktakePanel } from '../features/stocktake/StoreDailyStocktakePanel';
import { StoreTransferReplenishmentPanel } from '../features/transfers/StoreTransferReplenishmentPanel';
import { useAuthStore } from '../store/authStore';

type StoreManagerTab = 'inventory' | 'transfers' | 'pos_bom' | 'stocktake_kds';

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
        subtitle={`Cách ly Multi-Tenant, Cost-Masking, Chuyển Kho 2 Pha, POS & Kiểm Kho BOM (${source})`}
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
            Thực Đơn, Định Mức BOM &amp; Giám Sát Đơn POS (M4–M5)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stocktake_kds')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'stocktake_kds'
                ? 'bg-teal-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Kiểm Kho Cuối Ngày Đối Chiếu BOM &amp; Cảnh Báo Quầy Bar (M6)
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

        {activeTab === 'stocktake_kds' && (
          <StoreDailyStocktakePanel
            actorId={actor.id}
            storeId={activeStoreId}
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

### File 4: `C:\bib\cf_19\apps\web\src\__tests__\m6-kds-blindclose-stocktake-ui.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  KDS_FORBIDDEN_FINANCE_KEYS,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
} from '@cf19/shared';
import { ApiClientError } from '../api/apiClient';
import {
  OFFLINE_M6_ORDER_IDS,
  OFFLINE_M6_SHIFT_IDS,
  getOfflineStoreLotsSnapshot,
  offlineAdvanceKdsTicketStatus,
  offlineBlindClosePosShift,
  offlineCompleteKdsOrderBomDeduction,
  offlineGetStoreKdsBoard,
  offlineListLowStockAlerts,
  offlineListStoreDailyStocktakes,
  offlineOpenPosShift,
  offlineReportBaristaLowStockAlert,
  offlineSubmitStoreDailyStocktake,
  resetOfflineKdsAndShiftState,
} from '../api/kdsAndShiftApi';

describe('M6.3 — @cf19/web Barista KDS SLA Queue, FIFO BOM Deduction, Blind Shift Close & EOD Stocktake', () => {
  beforeEach(() => {
    resetOfflineKdsAndShiftState();
  });

  it('1. offlineGetStoreKdsBoard returns oldest-first KDS tickets with CRITICAL_RED, WARNING_YELLOW & NORMAL_GREEN SLA levels', () => {
    const tickets = offlineGetStoreKdsBoard(SEED_IDS.stores.store01);
    expect(tickets).toHaveLength(3);
    expect(tickets[0]?.id).toBe(OFFLINE_M6_ORDER_IDS.store01RedOrder);
    expect(tickets[0]?.sla_level).toBe('CRITICAL_RED');
    expect(tickets[1]?.id).toBe(OFFLINE_M6_ORDER_IDS.store01YellowOrder);
    expect(tickets[1]?.sla_level).toBe('WARNING_YELLOW');
    expect(tickets[2]?.id).toBe(OFFLINE_M6_ORDER_IDS.store01GreenOrder);
    expect(tickets[2]?.sla_level).toBe('NORMAL_GREEN');
  });

  it('2. offlineGetStoreKdsBoard strictly strips all financial and warehouse cost fields for BARISTA_KDS', () => {
    const tickets = offlineGetStoreKdsBoard(SEED_IDS.stores.store01);
    for (const ticket of tickets) {
      const rec = ticket as unknown as Record<string, unknown>;
      for (const forbidden of [...KDS_FORBIDDEN_FINANCE_KEYS, ...SENSITIVE_COST_KEYS]) {
        expect(rec).not.toHaveProperty(forbidden);
      }
      for (const line of ticket.items) {
        const lineRec = line as unknown as Record<string, unknown>;
        expect(lineRec).not.toHaveProperty('unit_price_vnd');
        expect(lineRec).not.toHaveProperty('line_total_vnd');
      }
    }
  });

  it('3. offlineAdvanceKdsTicketStatus transitions QUEUED -> PREPARING without deducting store BOM inventory', () => {
    const lotsBefore = getOfflineStoreLotsSnapshot(SEED_IDS.stores.store01);
    const res = offlineAdvanceKdsTicketStatus(
      SEED_IDS.stores.store01,
      OFFLINE_M6_ORDER_IDS.store01RedOrder,
      'PREPARING',
    );
    expect(res.kds_status).toBe('PREPARING');
    expect(res.deductions).toEqual([]);
    expect(getOfflineStoreLotsSnapshot(SEED_IDS.stores.store01)).toEqual(lotsBefore);
  });

  it('4. offlineCompleteKdsOrderBomDeduction executes 2-tier BOM deduction (recipe + extra espresso shot) across 2 FIFO Robusta lots', () => {
    // Red order: 2x Ca Phe Sua Da M + 1 Extra Shot -> Robusta = 40.8g + 36g = 76.8g
    // Oldest lot has 50g -> DEPLETED (0g); Newer lot 2000g -> 1973.2g
    const res = offlineCompleteKdsOrderBomDeduction(
      SEED_IDS.stores.store01,
      OFFLINE_M6_ORDER_IDS.store01RedOrder,
      false,
    );

    expect(res.kds_status).toBe('COMPLETED');
    expect(res.already_deducted).toBe(false);
    expect(res.has_shortage).toBe(false);

    const robusta = res.deductions.find((d) => d.sku === 'RC-ROB-MED');
    expect(robusta?.required_qty).toBe(76.8);
    expect(robusta?.deducted_qty).toBe(76.8);
    expect(robusta?.lot_slices).toHaveLength(2);
    expect(robusta?.lot_slices[0]?.lot_code).toBe('LOT-S01-RC-ROB-001');
    expect(robusta?.lot_slices[0]?.depleted).toBe(true);
    expect(robusta?.lot_slices[1]?.lot_code).toBe('LOT-S01-RC-ROB-002');
    expect(robusta?.lot_slices[1]?.deducted_qty).toBe(26.8);

    const lotsAfter = getOfflineStoreLotsSnapshot(SEED_IDS.stores.store01);
    expect(lotsAfter.find((l) => l.lot_code === 'LOT-S01-RC-ROB-001')?.status).toBe('DEPLETED');
    expect(lotsAfter.find((l) => l.lot_code === 'LOT-S01-RC-ROB-002')?.remaining_qty).toBe(1973.2);
  });

  it('5. offlineCompleteKdsOrderBomDeduction enforces idempotency on repeated completion calls', () => {
    const first = offlineCompleteKdsOrderBomDeduction(
      SEED_IDS.stores.store01,
      OFFLINE_M6_ORDER_IDS.store01GreenOrder,
      false,
    );
    expect(first.already_deducted).toBe(false);

    const lotsAfterFirst = getOfflineStoreLotsSnapshot(SEED_IDS.stores.store01);

    const second = offlineCompleteKdsOrderBomDeduction(
      SEED_IDS.stores.store01,
      OFFLINE_M6_ORDER_IDS.store01GreenOrder,
      false,
    );
    expect(second.already_deducted).toBe(true);
    expect(second.deductions).toEqual([]);
    expect(getOfflineStoreLotsSnapshot(SEED_IDS.stores.store01)).toEqual(lotsAfterFirst);
  });

  it('6. offlineAdvanceKdsTicketStatus blocks reverting COMPLETED order back to PREPARING (409)', () => {
    offlineCompleteKdsOrderBomDeduction(
      SEED_IDS.stores.store01,
      OFFLINE_M6_ORDER_IDS.store01GreenOrder,
      false,
    );

    try {
      offlineAdvanceKdsTicketStatus(
        SEED_IDS.stores.store01,
        OFFLINE_M6_ORDER_IDS.store01GreenOrder,
        'PREPARING',
      );
      expect.unreachable('Expected transition error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('KDS_INVALID_TRANSITION');
    }
  });

  it('7. offlineCompleteKdsOrderBomDeduction blocks cross-store order completion (403 FORBIDDEN_CROSS_TENANT_ACCESS)', () => {
    try {
      offlineCompleteKdsOrderBomDeduction(
        SEED_IDS.stores.store02,
        OFFLINE_M6_ORDER_IDS.store01GreenOrder,
        false,
      );
      expect.unreachable('Expected cross-store error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(403);
      expect((err as ApiClientError).code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  });

  it('8. offlineReportBaristaLowStockAlert records bar counter alert and lists scoped by storeId', () => {
    const created = offlineReportBaristaLowStockAlert(
      SEED_IDS.users.barista01,
      'Barista Quán 1',
      SEED_IDS.stores.store01,
      {
        inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
        severity: 'OUT_OF_STOCK',
        note: 'Hết sữa đặc tại quầy pha chế',
      },
    );

    expect(created.sku).toBe('ING-COND-MILK');
    expect(created.severity).toBe('OUT_OF_STOCK');
    expect(offlineListLowStockAlerts(SEED_IDS.stores.store01)).toHaveLength(1);
    expect(offlineListLowStockAlerts(SEED_IDS.stores.store02)).toHaveLength(0);
  });

  it('9. offlineBlindClosePosShift reconciles BALANCED when counted cash equals opening + CASH PAID orders (excluding VIETQR)', () => {
    // Store 1 shift: opening 2,000,000 + CASH orders (78,000 + 67,000 = 145,000) = 2,145,000
    // VIETQR order (58,000) is excluded from drawer cash!
    const res = offlineBlindClosePosShift(
      SEED_IDS.stores.store01,
      OFFLINE_M6_SHIFT_IDS.store01OpenShift,
      2145000,
      'Khớp két tuyệt đối',
    );

    expect(res.status).toBe('CLOSED');
    expect(res.cash_sales_vnd).toBe(145000);
    expect(res.vietqr_sales_vnd).toBe(58000);
    expect(res.system_expected_cash_vnd).toBe(2145000);
    expect(res.variance_cash_vnd).toBe(0);
    expect(res.variance_status).toBe('BALANCED');
  });

  it('10. offlineBlindClosePosShift detects SHORTAGE when cashier counts less cash than expected', () => {
    const res = offlineBlindClosePosShift(
      SEED_IDS.stores.store01,
      OFFLINE_M6_SHIFT_IDS.store01OpenShift,
      2100000,
    );
    expect(res.variance_cash_vnd).toBe(-45000);
    expect(res.variance_status).toBe('SHORTAGE');
  });

  it('11. offlineBlindClosePosShift detects SURPLUS and blocks double-closing (409 SHIFT_ALREADY_CLOSED)', () => {
    const res = offlineBlindClosePosShift(
      SEED_IDS.stores.store02,
      OFFLINE_M6_SHIFT_IDS.store02OpenShift,
      1525000,
    );
    expect(res.variance_cash_vnd).toBe(25000);
    expect(res.variance_status).toBe('SURPLUS');

    try {
      offlineBlindClosePosShift(
        SEED_IDS.stores.store02,
        OFFLINE_M6_SHIFT_IDS.store02OpenShift,
        1500000,
      );
      expect.unreachable('Expected already closed error');
    } catch (err) {
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('SHIFT_ALREADY_CLOSED');
    }
  });

  it('12. offlineOpenPosShift rejects duplicate OPEN shift (409) and succeeds after closing current shift', () => {
    try {
      offlineOpenPosShift(SEED_IDS.users.cashier01, SEED_IDS.stores.store01, 2000000);
      expect.unreachable('Expected already open error');
    } catch (err) {
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('SHIFT_ALREADY_OPEN');
    }

    offlineBlindClosePosShift(
      SEED_IDS.stores.store01,
      OFFLINE_M6_SHIFT_IDS.store01OpenShift,
      2145000,
    );

    const newShift = offlineOpenPosShift(
      SEED_IDS.users.cashier01,
      SEED_IDS.stores.store01,
      1800000,
      'Ca chiều',
    );
    expect(newShift.status).toBe('OPEN');
    expect(newShift.opening_cash_vnd).toBe(1800000);
    expect(newShift.system_expected_cash_vnd).toBeNull();
  });

  it('13. offlineSubmitStoreDailyStocktake flags abnormal shrinkage (>3.0%) vs normal tolerance', () => {
    const res = offlineSubmitStoreDailyStocktake(SEED_IDS.users.storeManager01, {
      store_id: SEED_IDS.stores.store01,
      stocktake_date: '2026-11-22',
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          opening_qty: 5000,
          received_in_qty: 0,
          bom_consumed_qty: 1000,
          actual_counted_qty: 3800, // theoretical 4000, variance -200 (-5%) -> ABNORMAL!
        },
        {
          inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
          opening_qty: 3000,
          received_in_qty: 0,
          bom_consumed_qty: 500,
          actual_counted_qty: 2450, // theoretical 2500, variance -50 (-2%) -> NORMAL
        },
      ],
    });

    expect(res.total_items_counted).toBe(2);
    expect(res.abnormal_shrinkage_count).toBe(1);
    expect(res.items[0]?.is_abnormal_shrinkage).toBe(true);
    expect(res.items[1]?.is_abnormal_shrinkage).toBe(false);
  });

  it('14. offlineSubmitStoreDailyStocktake performs idempotent upsert per (store, item, date)', () => {
    offlineSubmitStoreDailyStocktake(SEED_IDS.users.storeManager01, {
      store_id: SEED_IDS.stores.store01,
      stocktake_date: '2026-11-22',
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          opening_qty: 5000,
          received_in_qty: 0,
          bom_consumed_qty: 1000,
          actual_counted_qty: 3800,
        },
      ],
    });

    offlineSubmitStoreDailyStocktake(SEED_IDS.users.storeManager01, {
      store_id: SEED_IDS.stores.store01,
      stocktake_date: '2026-11-22',
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          opening_qty: 5000,
          received_in_qty: 0,
          bom_consumed_qty: 1000,
          actual_counted_qty: 3960,
        },
      ],
    });

    const list = offlineListStoreDailyStocktakes(SEED_IDS.stores.store01, '2026-11-22');
    expect(list).toHaveLength(1);
    expect(list[0]?.actual_counted_qty).toBe(3960);
    expect(list[0]?.is_abnormal_shrinkage).toBe(false);
  });

  it('15. offlineListStoreDailyStocktakes isolates records strictly by storeId', () => {
    offlineSubmitStoreDailyStocktake(SEED_IDS.users.storeManager01, {
      store_id: SEED_IDS.stores.store01,
      stocktake_date: '2026-11-22',
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
          opening_qty: 500,
          received_in_qty: 0,
          bom_consumed_qty: 50,
          actual_counted_qty: 450,
        },
      ],
    });

    expect(offlineListStoreDailyStocktakes(SEED_IDS.stores.store01)).toHaveLength(1);
    expect(offlineListStoreDailyStocktakes(SEED_IDS.stores.store02)).toHaveLength(0);
  });

  it('16. Completed KDS orders disappear from default active queue but appear when includeCompleted=true', () => {
    expect(offlineGetStoreKdsBoard(SEED_IDS.stores.store01)).toHaveLength(3);

    offlineCompleteKdsOrderBomDeduction(
      SEED_IDS.stores.store01,
      OFFLINE_M6_ORDER_IDS.store01GreenOrder,
      false,
    );

    expect(offlineGetStoreKdsBoard(SEED_IDS.stores.store01)).toHaveLength(2);
    expect(
      offlineGetStoreKdsBoard(SEED_IDS.stores.store01, { includeCompleted: true }),
    ).toHaveLength(3);
  });
});
```
