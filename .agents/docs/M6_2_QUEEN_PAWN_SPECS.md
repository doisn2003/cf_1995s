# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M6.2 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M6.2 - Backend KDS Queue Engine, Multi-level BOM Atomic FIFO Deduction, Blind Shift Cash Close & End-of-Day Stocktake Variance Service + Supertest Suite (@cf19/api)`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M6_2_KING_CHARTER.md`, `M6_1_QUEEN_PAWN_SPECS.md`, và ràng buộc tương thích ngược 97/97 tests hiện có của `@cf19/api`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi/sửa **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không bỏ `.js` trong import tương đối (`moduleResolution: "NodeNext"`).
  - **CẤM THAY ĐỔI** mảng `warehouseLots` mặc định trong `createInitialSeedState()` (`m1-rbac-security.test.ts` Test #10 assert cứng `store01` có đúng 1 lô mặc định!). Các lô nguyên phụ liệu bổ sung cho kiểm thử BOM được cấp phát qua helper `seedStoreBomAccessoryLots(storeId)` trong `inMemoryDb.ts`.
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 4 files trong `@cf19/api`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\api\src\db\seedData.ts` (Áp dụng chính xác 3 lệnh `edit_file` dưới đây — giữ nguyên 100% dữ liệu seed M1–M5!)
  2. `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts` (Overwrite)
  3. `C:\bib\cf_19\apps\api\src\modules\kds\kds.service.ts` (Tạo mới)
  4. `C:\bib\cf_19\apps\api\src\modules\kds\kds.routes.ts` (Tạo mới)

### File 1: `C:\bib\cf_19\apps\api\src\db\seedData.ts` (3 Edit Blocks — dùng `edit_file`)

#### Edit 1A — Bổ sung type imports `BaristaLowStockAlertDTO` và `StoreDailyStocktakeItemResultDTO`
**Target:**
```ts
  type AuditLogDto,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
  type B2bOrderItemDto,
  type B2bPriceTierDto,
  type BomRecipeWithItemsDTO,
```

**Replacement:**
```ts
  type AuditLogDto,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
  type B2bOrderItemDto,
  type B2bPriceTierDto,
  type BaristaLowStockAlertDTO,
  type BomRecipeWithItemsDTO,
  type StoreDailyStocktakeItemResultDTO,
```

#### Edit 1B — Bổ sung `storeDailyStocktakes` và `baristaLowStockAlerts` vào `InMemoryDatabaseState`
**Target:**
```ts
  posShifts: PosShiftFullDto[];
  posOrders: PosOrderFullDto[];
  posOrderItems: PosOrderItemDto[];
  paymentWebhookLogs: PaymentWebhookLogDto[];
  auditLogs: AuditLogDto[];
}
```

**Replacement:**
```ts
  posShifts: PosShiftFullDto[];
  posOrders: PosOrderFullDto[];
  posOrderItems: PosOrderItemDto[];
  paymentWebhookLogs: PaymentWebhookLogDto[];
  storeDailyStocktakes: StoreDailyStocktakeItemResultDTO[];
  baristaLowStockAlerts: BaristaLowStockAlertDTO[];
  auditLogs: AuditLogDto[];
}
```

#### Edit 1C — Khởi tạo `storeDailyStocktakes: []` và `baristaLowStockAlerts: []` trong `createInitialSeedState()`
**Target:**
```ts
  const paymentWebhookLogs: PaymentWebhookLogDto[] = [];
  const auditLogs: AuditLogDto[] = [];

  return {
    organizations,
    stores,
    users,
    inventoryItems,
    warehouseLots,
    roastBatches,
    b2bCustomers,
    b2bPriceTiers,
    b2bOrders,
    b2bOrderItems,
    b2bDebtLedger,
    internalTransfers,
    internalTransferItems,
    menuCategories,
    menuProducts,
    menuVariants,
    menuModifiers,
    bomRecipes,
    posShifts,
    posOrders,
    posOrderItems,
    paymentWebhookLogs,
    auditLogs,
  };
```

**Replacement:**
```ts
  const paymentWebhookLogs: PaymentWebhookLogDto[] = [];
  const storeDailyStocktakes: StoreDailyStocktakeItemResultDTO[] = [];
  const baristaLowStockAlerts: BaristaLowStockAlertDTO[] = [];
  const auditLogs: AuditLogDto[] = [];

  return {
    organizations,
    stores,
    users,
    inventoryItems,
    warehouseLots,
    roastBatches,
    b2bCustomers,
    b2bPriceTiers,
    b2bOrders,
    b2bOrderItems,
    b2bDebtLedger,
    internalTransfers,
    internalTransferItems,
    menuCategories,
    menuProducts,
    menuVariants,
    menuModifiers,
    bomRecipes,
    posShifts,
    posOrders,
    posOrderItems,
    paymentWebhookLogs,
    storeDailyStocktakes,
    baristaLowStockAlerts,
    auditLogs,
  };
```

### File 2: `C:\bib\cf_19\apps\api\src\db\inMemoryDb.ts`

```ts
import { randomUUID } from 'node:crypto';
import {
  SEED_IDS,
  type VietQrBankAccountConfigDto,
  type WarehouseLotFullDto,
} from '@cf19/shared';
import {
  DEFAULT_STORE_BANK_ACCOUNT,
  STORE_BANK_ACCOUNTS,
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

export function getStoreBankAccountConfig(
  storeId: string,
): VietQrBankAccountConfigDto {
  const configured = STORE_BANK_ACCOUNTS[storeId] ?? DEFAULT_STORE_BANK_ACCOUNT;
  return structuredClone(configured);
}

/**
 * Provisions accessory ingredient & packaging lots (condensed milk, fresh milk, cups, straws)
 * for a retail store on demand without altering default seedData.warehouseLots counts
 * asserted by M1.2 regression tests.
 */
export function seedStoreBomAccessoryLots(storeId: string): WarehouseLotFullDto[] {
  const db = getInMemoryDb();
  const nowIso = new Date().toISOString();
  const specs: Array<{
    itemId: string;
    lotCodeSuffix: string;
    qty: number;
    unitCostVnd: number;
  }> = [
    {
      itemId: SEED_IDS.inventoryItems.condensedMilk,
      lotCodeSuffix: 'COND-MILK-01',
      qty: 5000,
      unitCostVnd: 60,
    },
    {
      itemId: SEED_IDS.inventoryItems.freshMilk,
      lotCodeSuffix: 'FRESH-MILK-01',
      qty: 5000,
      unitCostVnd: 39,
    },
    {
      itemId: SEED_IDS.inventoryItems.plasticCup500ml,
      lotCodeSuffix: 'CUP-500-01',
      qty: 500,
      unitCostVnd: 1350,
    },
    {
      itemId: SEED_IDS.inventoryItems.bioStraw,
      lotCodeSuffix: 'STRAW-BIO-01',
      qty: 500,
      unitCostVnd: 220,
    },
  ];

  const added: WarehouseLotFullDto[] = [];
  for (const spec of specs) {
    const alreadyExists = db.warehouseLots.some(
      (lot) =>
        lot.store_id === storeId &&
        lot.item_id === spec.itemId &&
        lot.status === 'AVAILABLE' &&
        lot.remaining_qty > 0,
    );
    if (alreadyExists) {
      continue;
    }

    const lot: WarehouseLotFullDto = {
      id: randomUUID(),
      store_id: storeId,
      item_id: spec.itemId,
      lot_code: `LOT-${storeId.slice(-4).toUpperCase()}-${spec.lotCodeSuffix}`,
      supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
      moisture_pct: null,
      roast_date: null,
      received_at: '2026-11-15T08:00:00.000Z',
      expiry_date: '2027-05-15',
      initial_qty: spec.qty,
      remaining_qty: spec.qty,
      unit_cost_vnd: spec.unitCostVnd,
      shipping_cost_vnd: 0,
      status: 'AVAILABLE',
      created_at: nowIso,
      updated_at: nowIso,
    };
    db.warehouseLots.push(lot);
    added.push(structuredClone(lot));
  }

  return added;
}
```

### File 3: `C:\bib\cf_19\apps\api\src\modules\kds\kds.service.ts`

```ts
import { randomUUID } from 'node:crypto';
import {
  allocateStoreBomFifoDeduction,
  calculateOrderBomRequirementsAndCogs,
  classifyKdsWaitSla,
  type AdvanceKdsTicketStatusInput,
  type BaristaLowStockAlertDTO,
  type BomInventoryCostLookup,
  type CompleteKdsBomDeductionInput,
  type KdsOrderCompletionResultDTO,
  type KdsQueueQueryInput,
  type KdsTicketBoardItemDTO,
  type KdsTicketBoardLineDTO,
  type MenuModifierDto,
  type ReportBaristaLowStockAlertInput,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

/**
 * 1. Returns KDS Queue Board for a store sorted oldest-first (FIFO preparation)
 *    with SRS SLA classification (NORMAL_GREEN / WARNING_YELLOW / CRITICAL_RED).
 *    Strictly omits all financial/price/revenue fields for BARISTA_KDS safety.
 */
export async function getStoreKdsBoard(
  storeId: string,
  query: KdsQueueQueryInput = { include_completed: false, limit: 50 },
  referenceNowIso?: string,
): Promise<KdsTicketBoardItemDTO[]> {
  const db = getInMemoryDb();
  const nowMs = referenceNowIso ? Date.parse(referenceNowIso) : Date.now();
  const effectiveNowMs = Number.isNaN(nowMs) ? Date.now() : nowMs;

  return db.posOrders
    .filter((order) => {
      if (order.store_id !== storeId) {
        return false;
      }
      if (order.payment_status === 'VOIDED') {
        return false;
      }
      if (!query.include_completed && order.kds_status === 'COMPLETED') {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, query.limit)
    .map((order): KdsTicketBoardItemDTO => {
      const sla = classifyKdsWaitSla(order.created_at, effectiveNowMs);
      const orderLines: KdsTicketBoardLineDTO[] = db.posOrderItems
        .filter((it) => it.order_id === order.id)
        .map((it) => {
          const product = db.menuProducts.find((p) => p.id === it.product_id);
          const variant = db.menuVariants.find((v) => v.id === it.variant_id);
          return {
            id: it.id,
            product_id: it.product_id,
            product_name: product?.name ?? 'Đồ uống CF19',
            variant_id: it.variant_id,
            size_code: variant?.size_code ?? 'M',
            quantity: it.quantity,
            modifiers_json: it.modifiers_json.map((m) => ({
              id: m.id,
              name: m.name,
            })),
            notes: it.notes,
          };
        });

      return {
        id: order.id,
        order_code: order.order_code,
        store_id: order.store_id,
        shift_id: order.shift_id,
        kds_status: order.kds_status,
        payment_status: order.payment_status,
        bom_deducted_at: order.bom_deducted_at,
        created_at: order.created_at,
        updated_at: order.updated_at,
        wait_minutes: sla.wait_minutes,
        sla_level: sla.sla_level,
        items: orderLines,
      };
    });
}

/**
 * 2. Complete a KDS order and execute Atomic 2-Tier BOM Multi-Lot FIFO Deduction.
 *    Idempotent on pos_orders.bom_deducted_at (never double-deducts stock).
 */
export async function completeKdsOrderWithBomDeduction(
  actor: AuthActor,
  input: CompleteKdsBomDeductionInput,
): Promise<KdsOrderCompletionResultDTO> {
  const db = getInMemoryDb();
  const order = db.posOrders.find((o) => o.id === input.order_id);

  if (!order) {
    throw new WarehouseDomainError(
      404,
      'ORDER_NOT_FOUND',
      `POS order ${input.order_id} not found`,
    );
  }

  if (order.store_id !== input.store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS order ${input.order_id} does not belong to store ${input.store_id}`,
    );
  }

  if (order.payment_status === 'VOIDED') {
    throw new WarehouseDomainError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot complete KDS or deduct BOM for voided order ${order.order_code}`,
    );
  }

  // Strictly Idempotent Guard
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

  const orderItems = db.posOrderItems.filter((it) => it.order_id === order.id);

  const modifiersById: Record<string, MenuModifierDto> = {};
  for (const mod of db.menuModifiers) {
    modifiersById[mod.id] = mod;
  }

  const inventoryItemsById: Record<string, BomInventoryCostLookup> = {};
  for (const item of db.inventoryItems) {
    inventoryItemsById[item.id] = {
      id: item.id,
      sku: item.sku,
      name: item.name,
      base_unit: item.base_unit,
      internal_transfer_price_vnd: item.internal_transfer_price_vnd,
    };
  }

  const bomCalc = calculateOrderBomRequirementsAndCogs({
    lines: orderItems.map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id,
      modifier_ids: it.modifiers_json.map((m) => m.id),
      quantity: it.quantity,
    })),
    recipes: db.bomRecipes,
    modifiersById,
    inventoryItemsById,
  });

  let allocationResult;
  try {
    allocationResult = allocateStoreBomFifoDeduction({
      storeId: input.store_id,
      requirements: bomCalc.requirements.map((req) => ({
        inventory_item_id: req.inventory_item_id,
        sku: req.sku,
        name: req.name,
        base_unit: req.base_unit,
        required_qty: req.total_required_qty,
      })),
      availableLots: db.warehouseLots.map((lot) => ({
        id: lot.id,
        store_id: lot.store_id,
        item_id: lot.item_id,
        lot_code: lot.lot_code,
        roast_date: lot.roast_date,
        received_at: lot.received_at,
        remaining_qty: lot.remaining_qty,
        status: lot.status,
      })),
      allowPartialOnShortage: input.allow_partial_on_shortage,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Insufficient store BOM stock';
    if (message.includes('INSUFFICIENT_STORE_BOM_STOCK')) {
      throw new WarehouseDomainError(409, 'INSUFFICIENT_STORE_BOM_STOCK', message);
    }
    throw err;
  }

  // Commit atomic lot mutations + order completion
  const nowIso = new Date().toISOString();
  const updatedByLotId = new Map(
    allocationResult.updated_lots.map((l) => [l.id, l]),
  );

  for (const lot of db.warehouseLots) {
    const mutated = updatedByLotId.get(lot.id);
    if (
      mutated &&
      (mutated.remaining_qty !== lot.remaining_qty ||
        mutated.status !== lot.status)
    ) {
      lot.remaining_qty = mutated.remaining_qty;
      lot.status = mutated.status;
      lot.updated_at = nowIso;
    }
  }

  order.kds_status = 'COMPLETED';
  order.bom_deducted_at = nowIso;
  order.updated_at = nowIso;

  recordAuditLog({
    actorId: actor.id,
    storeId: order.store_id,
    action: 'KDS_ORDER_BOM_DEDUCTED',
    targetTable: 'pos_orders',
    targetId: order.id,
    reason: `Completed KDS order ${order.order_code} with atomic FIFO BOM deduction`,
    payload: {
      order_code: order.order_code,
      has_shortage: allocationResult.has_shortage,
      allow_partial_on_shortage: input.allow_partial_on_shortage,
      deductions: allocationResult.deductions,
    },
  });

  return {
    order_id: order.id,
    order_code: order.order_code,
    store_id: order.store_id,
    kds_status: 'COMPLETED',
    bom_deducted_at: nowIso,
    already_deducted: false,
    has_shortage: allocationResult.has_shortage,
    deductions: allocationResult.deductions,
  };
}

/**
 * 3. Advance KDS Ticket Status (QUEUED -> PREPARING, or delegate COMPLETED to BOM deduction).
 */
export async function advanceKdsTicketStatus(
  actor: AuthActor,
  input: AdvanceKdsTicketStatusInput,
): Promise<KdsOrderCompletionResultDTO> {
  if (input.target_status === 'COMPLETED') {
    return completeKdsOrderWithBomDeduction(actor, {
      store_id: input.store_id,
      order_id: input.order_id,
      allow_partial_on_shortage: input.allow_partial_on_shortage,
    });
  }

  const db = getInMemoryDb();
  const order = db.posOrders.find((o) => o.id === input.order_id);

  if (!order) {
    throw new WarehouseDomainError(
      404,
      'ORDER_NOT_FOUND',
      `POS order ${input.order_id} not found`,
    );
  }

  if (order.store_id !== input.store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS order ${input.order_id} does not belong to store ${input.store_id}`,
    );
  }

  if (order.payment_status === 'VOIDED') {
    throw new WarehouseDomainError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot advance KDS status for voided order ${order.order_code}`,
    );
  }

  if (order.kds_status === 'COMPLETED') {
    throw new WarehouseDomainError(
      409,
      'KDS_INVALID_TRANSITION',
      `Completed order ${order.order_code} cannot revert to ${input.target_status}`,
    );
  }

  const previousStatus = order.kds_status;
  const nowIso = new Date().toISOString();
  order.kds_status = input.target_status;
  order.updated_at = nowIso;

  recordAuditLog({
    actorId: actor.id,
    storeId: order.store_id,
    action:
      input.target_status === 'PREPARING'
        ? 'KDS_ORDER_PREPARING'
        : 'KDS_STATUS_ADVANCED',
    targetTable: 'pos_orders',
    targetId: order.id,
    reason: `KDS status changed from ${previousStatus} to ${input.target_status}`,
    payload: {
      order_code: order.order_code,
      previous_status: previousStatus,
      kds_status: input.target_status,
    },
  });

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

/**
 * 4. Barista reports low/out-of-stock ingredient at the bar counter.
 */
export async function reportBaristaLowStockAlert(
  actor: AuthActor,
  input: ReportBaristaLowStockAlertInput,
): Promise<BaristaLowStockAlertDTO> {
  const db = getInMemoryDb();
  const item = db.inventoryItems.find(
    (i) => i.id === input.inventory_item_id && i.is_active,
  );
  if (!item) {
    throw new WarehouseDomainError(
      404,
      'INVENTORY_ITEM_NOT_FOUND',
      `Inventory item ${input.inventory_item_id} not found`,
    );
  }

  const nowIso = new Date().toISOString();
  const alert: BaristaLowStockAlertDTO = {
    id: randomUUID(),
    store_id: input.store_id,
    inventory_item_id: item.id,
    sku: item.sku,
    item_name: item.name,
    reported_by: actor.id,
    reported_by_name: actor.fullName,
    severity: input.severity,
    note: input.note,
    resolved: false,
    created_at: nowIso,
  };

  db.baristaLowStockAlerts.unshift(alert);

  recordAuditLog({
    actorId: actor.id,
    storeId: input.store_id,
    action: 'BARISTA_LOW_STOCK_REPORTED',
    targetTable: 'inventory_items',
    targetId: item.id,
    reason: input.note,
    payload: {
      alert_id: alert.id,
      sku: item.sku,
      item_name: item.name,
      severity: input.severity,
    },
  });

  return structuredClone(alert);
}

/**
 * 5. Lists low-stock alerts reported at a retail store (newest-first).
 */
export async function listLowStockAlerts(
  storeId: string,
): Promise<BaristaLowStockAlertDTO[]> {
  return getInMemoryDb()
    .baristaLowStockAlerts.filter((a) => a.store_id === storeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((a) => structuredClone(a));
}
```

### File 4: `C:\bib\cf_19\apps\api\src\modules\kds\kds.routes.ts`

```ts
import { Router, type Request, type Response } from 'express';
import {
  AdvanceKdsTicketStatusSchema,
  CompleteKdsBomDeductionSchema,
  KdsQueueQuerySchema,
  ReportBaristaLowStockAlertSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  advanceKdsTicketStatus,
  completeKdsOrderWithBomDeduction,
  getStoreKdsBoard,
  listLowStockAlerts,
  reportBaristaLowStockAlert,
} from './kds.service.js';

export const kdsRouter = Router();

function handleKdsError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected KDS error';
  res.status(500).json({
    error: {
      code: 'KDS_INTERNAL_ERROR',
      message,
    },
  });
}

/**
 * GET /api/v1/kds/stores/:storeId/board
 */
kdsRouter.get(
  '/stores/:storeId/board',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = KdsQueueQuerySchema.safeParse({
      ...req.query,
      store_id: req.params.storeId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_KDS_QUEUE_QUERY',
          message: 'Invalid KDS queue query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const referenceNowIso =
      typeof req.query.reference_now_iso === 'string'
        ? req.query.reference_now_iso
        : undefined;

    try {
      const tickets = await getStoreKdsBoard(
        req.params.storeId,
        parsed.data,
        referenceNowIso,
      );
      res.status(200).json({ data: tickets });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

/**
 * POST /api/v1/kds/stores/:storeId/orders/:orderId/advance
 */
kdsRouter.post(
  '/stores/:storeId/orders/:orderId/advance',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = AdvanceKdsTicketStatusSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_KDS_ADVANCE_PAYLOAD',
          message: 'Invalid KDS status advance payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await advanceKdsTicketStatus(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

/**
 * POST /api/v1/kds/stores/:storeId/orders/:orderId/complete-bom
 */
kdsRouter.post(
  '/stores/:storeId/orders/:orderId/complete-bom',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = CompleteKdsBomDeductionSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_KDS_COMPLETE_PAYLOAD',
          message: 'Invalid KDS BOM completion payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await completeKdsOrderWithBomDeduction(
        req.actor!,
        parsed.data,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

/**
 * GET /api/v1/kds/stores/:storeId/low-stock-alerts
 */
kdsRouter.get(
  '/stores/:storeId/low-stock-alerts',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const alerts = await listLowStockAlerts(req.params.storeId);
      res.status(200).json({ data: alerts });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

/**
 * POST /api/v1/kds/stores/:storeId/low-stock-alerts
 */
kdsRouter.post(
  '/stores/:storeId/low-stock-alerts',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = ReportBaristaLowStockAlertSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_LOW_STOCK_ALERT_PAYLOAD',
          message: 'Invalid barista low-stock alert payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const alert = await reportBaristaLowStockAlert(req.actor!, parsed.data);
      res.status(201).json({ data: alert });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 3 files trong `@cf19/api`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\api\src\modules\pos\shiftStocktake.routes.ts` (Tạo mới — Blind Shift Close & EOD Stocktake Variance Service + Express Router)
  2. `C:\bib\cf_19\apps\api\src\index.ts` (Overwrite — mount `/api/v1/kds` và `/api/v1/shifts-stocktakes`)
  3. `C:\bib\cf_19\apps\api\src\__tests__\m6-kds-bom-blindclose.test.ts` (Tạo mới — 20 Vitest + Supertest integration tests)

### File 1: `C:\bib\cf_19\apps\api\src\modules\pos\shiftStocktake.routes.ts`

```ts
import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import {
  BlindClosePosShiftRequestSchema,
  OpenShiftSchema,
  SubmitStoreDailyStocktakeSchema,
  calculateBlindShiftCloseVariance,
  calculateDailyStocktakeVariance,
  type BlindClosePosShiftRequestInput,
  type BlindShiftCloseResultDTO,
  type PosShiftFullDto,
  type StoreDailyStocktakeBatchResultDTO,
  type StoreDailyStocktakeItemResultDTO,
  type SubmitStoreDailyStocktakeInput,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import { authenticate, type AuthActor } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

export const shiftStocktakeRouter = Router();

function handleShiftStocktakeError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Unexpected shift/stocktake error';
  res.status(500).json({
    error: {
      code: 'SHIFT_STOCKTAKE_INTERNAL_ERROR',
      message,
    },
  });
}

export async function openPosShift(
  actor: AuthActor,
  storeId: string,
  openingCashVnd: number,
  notes?: string,
): Promise<PosShiftFullDto> {
  const db = getInMemoryDb();
  const store = db.stores.find((s) => s.id === storeId && s.is_active);
  if (!store || store.type === 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_POS_STORE',
      'Target store must be an active retail or franchise store',
    );
  }

  const existingOpen = db.posShifts.find(
    (sh) => sh.store_id === storeId && sh.status === 'OPEN',
  );
  if (existingOpen) {
    throw new WarehouseDomainError(
      409,
      'SHIFT_ALREADY_OPEN',
      `Store ${store.code} already has an open shift (${existingOpen.id})`,
    );
  }

  const nowIso = new Date().toISOString();
  const created: PosShiftFullDto = {
    id: randomUUID(),
    store_id: storeId,
    cashier_id: actor.id,
    opened_at: nowIso,
    closed_at: null,
    opening_cash_vnd: openingCashVnd,
    blind_counted_cash_vnd: null,
    system_expected_cash_vnd: openingCashVnd,
    variance_cash_vnd: null,
    status: 'OPEN',
    notes: notes?.trim() || null,
  };

  db.posShifts.unshift(created);

  recordAuditLog({
    actorId: actor.id,
    storeId,
    action: 'POS_SHIFT_OPENED',
    targetTable: 'pos_shifts',
    targetId: created.id,
    reason: `Opened POS shift with ${openingCashVnd} VND float`,
    payload: {
      opening_cash_vnd: openingCashVnd,
      cashier_id: actor.id,
    },
  });

  return structuredClone(created);
}

export async function blindClosePosShift(
  actor: AuthActor,
  input: BlindClosePosShiftRequestInput,
): Promise<BlindShiftCloseResultDTO> {
  const db = getInMemoryDb();
  const shift = db.posShifts.find((s) => s.id === input.shift_id);

  if (!shift) {
    throw new WarehouseDomainError(
      404,
      'SHIFT_NOT_FOUND',
      `POS shift ${input.shift_id} not found`,
    );
  }

  if (shift.store_id !== input.store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS shift ${input.shift_id} does not belong to store ${input.store_id}`,
    );
  }

  if (shift.status === 'CLOSED') {
    throw new WarehouseDomainError(
      409,
      'SHIFT_ALREADY_CLOSED',
      `POS shift ${input.shift_id} is already closed`,
    );
  }

  const shiftOrders = db.posOrders.filter(
    (o) => o.shift_id === shift.id && o.store_id === input.store_id,
  );

  const calc = calculateBlindShiftCloseVariance({
    openingCashVnd: shift.opening_cash_vnd,
    blindCountedCashVnd: input.blind_counted_cash_vnd,
    orders: shiftOrders.map((o) => ({
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      total_amount_vnd: o.total_amount_vnd,
    })),
  });

  const closedAtIso = new Date().toISOString();
  const nextNotes = input.notes?.trim() || shift.notes;

  shift.status = 'CLOSED';
  shift.closed_at = closedAtIso;
  shift.blind_counted_cash_vnd = calc.blind_counted_cash_vnd;
  shift.system_expected_cash_vnd = calc.system_expected_cash_vnd;
  shift.variance_cash_vnd = calc.variance_cash_vnd;
  shift.notes = nextNotes;

  recordAuditLog({
    actorId: actor.id,
    storeId: input.store_id,
    action: 'POS_SHIFT_BLIND_CLOSED',
    targetTable: 'pos_shifts',
    targetId: shift.id,
    reason: `Blind shift close reconciled with status ${calc.variance_status}`,
    payload: {
      opening_cash_vnd: calc.opening_cash_vnd,
      cash_sales_vnd: calc.cash_sales_vnd,
      vietqr_sales_vnd: calc.vietqr_sales_vnd,
      system_expected_cash_vnd: calc.system_expected_cash_vnd,
      blind_counted_cash_vnd: calc.blind_counted_cash_vnd,
      variance_cash_vnd: calc.variance_cash_vnd,
      variance_status: calc.variance_status,
      paid_cash_orders_count: calc.paid_cash_orders_count,
      voided_orders_count: calc.voided_orders_count,
    },
  });

  return {
    shift_id: shift.id,
    store_id: shift.store_id,
    cashier_id: shift.cashier_id,
    status: 'CLOSED',
    opened_at: shift.opened_at,
    closed_at: closedAtIso,
    opening_cash_vnd: calc.opening_cash_vnd,
    cash_sales_vnd: calc.cash_sales_vnd,
    vietqr_sales_vnd: calc.vietqr_sales_vnd,
    paid_cash_orders_count: calc.paid_cash_orders_count,
    voided_orders_count: calc.voided_orders_count,
    system_expected_cash_vnd: calc.system_expected_cash_vnd,
    blind_counted_cash_vnd: calc.blind_counted_cash_vnd,
    variance_cash_vnd: calc.variance_cash_vnd,
    variance_status: calc.variance_status,
    notes: nextNotes,
  };
}

export async function submitStoreDailyStocktake(
  actor: AuthActor,
  input: SubmitStoreDailyStocktakeInput,
): Promise<StoreDailyStocktakeBatchResultDTO> {
  const db = getInMemoryDb();
  const nowIso = new Date().toISOString();
  const savedItems: StoreDailyStocktakeItemResultDTO[] = [];
  let abnormalCount = 0;

  for (const entry of input.items) {
    const invItem = db.inventoryItems.find(
      (i) => i.id === entry.inventory_item_id && i.is_active,
    );
    if (!invItem) {
      throw new WarehouseDomainError(
        404,
        'INVENTORY_ITEM_NOT_FOUND',
        `Inventory item ${entry.inventory_item_id} not found`,
      );
    }

    const variance = calculateDailyStocktakeVariance({
      openingQty: entry.opening_qty,
      receivedInQty: entry.received_in_qty,
      bomConsumedQty: entry.bom_consumed_qty,
      actualCountedQty: entry.actual_counted_qty,
    });

    if (variance.is_abnormal_shrinkage) {
      abnormalCount += 1;
    }

    const existingIdx = db.storeDailyStocktakes.findIndex(
      (st) =>
        st.store_id === input.store_id &&
        st.inventory_item_id === invItem.id &&
        st.stocktake_date === input.stocktake_date,
    );

    const record: StoreDailyStocktakeItemResultDTO = {
      id:
        existingIdx >= 0
          ? db.storeDailyStocktakes[existingIdx]!.id
          : randomUUID(),
      store_id: input.store_id,
      inventory_item_id: invItem.id,
      sku: invItem.sku,
      item_name: invItem.name,
      base_unit: invItem.base_unit,
      stocktake_date: input.stocktake_date,
      opening_qty: variance.opening_qty,
      received_in_qty: variance.received_in_qty,
      bom_consumed_qty: variance.bom_consumed_qty,
      theoretical_closing_qty: variance.theoretical_closing_qty,
      actual_counted_qty: variance.actual_counted_qty,
      variance_qty: variance.variance_qty,
      variance_pct: variance.variance_pct,
      is_abnormal_shrinkage: variance.is_abnormal_shrinkage,
      counted_by: actor.id,
      notes: entry.notes?.trim() || input.notes?.trim() || null,
      updated_at: nowIso,
    };

    if (existingIdx >= 0) {
      db.storeDailyStocktakes[existingIdx] = record;
    } else {
      db.storeDailyStocktakes.unshift(record);
    }

    savedItems.push(structuredClone(record));
  }

  recordAuditLog({
    actorId: actor.id,
    storeId: input.store_id,
    action: 'STORE_DAILY_STOCKTAKE_SUBMITTED',
    targetTable: 'store_daily_stocktakes',
    targetId: null,
    reason: `Submitted daily stocktake for ${input.stocktake_date} (${savedItems.length} items, ${abnormalCount} abnormal)`,
    payload: {
      stocktake_date: input.stocktake_date,
      total_items_counted: savedItems.length,
      abnormal_shrinkage_count: abnormalCount,
    },
  });

  return {
    store_id: input.store_id,
    stocktake_date: input.stocktake_date,
    total_items_counted: savedItems.length,
    abnormal_shrinkage_count: abnormalCount,
    items: savedItems,
  };
}

export async function listStoreDailyStocktakes(
  storeId: string,
  stocktakeDate?: string,
): Promise<StoreDailyStocktakeItemResultDTO[]> {
  return getInMemoryDb()
    .storeDailyStocktakes.filter((st) => {
      if (st.store_id !== storeId) return false;
      if (stocktakeDate && st.stocktake_date !== stocktakeDate) return false;
      return true;
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((st) => structuredClone(st));
}

/**
 * POST /api/v1/shifts-stocktakes/stores/:storeId/shifts/open
 */
shiftStocktakeRouter.post(
  '/stores/:storeId/shifts/open',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = OpenShiftSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_OPEN_SHIFT_PAYLOAD',
          message: 'Invalid open shift payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const shift = await openPosShift(
        req.actor!,
        parsed.data.store_id,
        parsed.data.opening_cash_vnd,
        parsed.data.notes,
      );
      res.status(201).json({ data: shift });
    } catch (err) {
      handleShiftStocktakeError(res, err);
    }
  },
);

/**
 * POST /api/v1/shifts-stocktakes/stores/:storeId/shifts/:shiftId/blind-close
 */
shiftStocktakeRouter.post(
  '/stores/:storeId/shifts/:shiftId/blind-close',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = BlindClosePosShiftRequestSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      shift_id: req.params.shiftId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_BLIND_CLOSE_PAYLOAD',
          message: 'Invalid blind shift close payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await blindClosePosShift(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleShiftStocktakeError(res, err);
    }
  },
);

/**
 * GET /api/v1/shifts-stocktakes/stores/:storeId/stocktakes
 */
shiftStocktakeRouter.get(
  '/stores/:storeId/stocktakes',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const dateFilter =
      typeof req.query.stocktake_date === 'string'
        ? req.query.stocktake_date
        : undefined;
    try {
      const records = await listStoreDailyStocktakes(
        req.params.storeId,
        dateFilter,
      );
      res.status(200).json({ data: records });
    } catch (err) {
      handleShiftStocktakeError(res, err);
    }
  },
);

/**
 * POST /api/v1/shifts-stocktakes/stores/:storeId/stocktakes
 */
shiftStocktakeRouter.post(
  '/stores/:storeId/stocktakes',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = SubmitStoreDailyStocktakeSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_STOCKTAKE_PAYLOAD',
          message: 'Invalid daily stocktake payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await submitStoreDailyStocktake(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleShiftStocktakeError(res, err);
    }
  },
);
```

### File 2: `C:\bib\cf_19\apps\api\src\index.ts`

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
import { b2bRouter } from './modules/b2b/b2b.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { kdsRouter } from './modules/kds/kds.routes.js';
import { posRouter } from './modules/pos/pos.routes.js';
import { shiftStocktakeRouter } from './modules/pos/shiftStocktake.routes.js';
import { vietqrRouter } from './modules/pos/vietqr.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';
import { transfersRouter } from './modules/transfers/transfers.routes.js';
import { warehouseRouter } from './modules/warehouse/warehouse.routes.js';

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
  app.use('/api/v1/warehouse', warehouseRouter);
  app.use('/api/v1/b2b', b2bRouter);
  app.use('/api/v1/transfers', transfersRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/pos', posRouter);
  app.use('/api/v1/vietqr', vietqrRouter);
  app.use('/api/v1/kds', kdsRouter);
  app.use('/api/v1/shifts-stocktakes', shiftStocktakeRouter);

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

### File 3: `C:\bib\cf_19\apps\api\src\__tests__\m6-kds-bom-blindclose.test.ts`

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  KDS_FORBIDDEN_FINANCE_KEYS,
  SEED_IDS,
  SENSITIVE_COST_KEYS,
} from '@cf19/shared';
import {
  getInMemoryDb,
  resetInMemoryDb,
  seedStoreBomAccessoryLots,
} from '../db/inMemoryDb.js';
import { SEED_EXTRA_SHIFT_IDS, SEED_ORDER_IDS } from '../db/seedData.js';
import { app } from '../index.js';

function authAs(userId: string): Record<string, string> {
  return { Authorization: `Bearer dev:${userId}` };
}

describe('M6.2 — @cf19/api KDS Queue, Atomic 2-Tier BOM FIFO Deduction, Blind Shift Close & EOD Stocktake', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. RBAC blocks WAREHOUSE_MANAGER from KDS board and BOM completion (403 FORBIDDEN_ROLE)', async () => {
    const boardRes = await request(app)
      .get(`/api/v1/kds/stores/${SEED_IDS.stores.store01}/board`)
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(boardRes.status).toBe(403);
    expect(boardRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const bomRes = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({});
    expect(bomRes.status).toBe(403);
    expect(bomRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('2. RBAC blocks CASHIER_STAFF from completing KDS orders (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('3. Multi-Tenant Isolation blocks Store 1 BARISTA_KDS from accessing Store 2 KDS board (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/kds/stores/${SEED_IDS.stores.store02}/board`)
      .set(authAs(SEED_IDS.users.barista01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  it('4. RBAC blocks CASHIER_STAFF and BARISTA_KDS from submitting daily stocktakes (403 FORBIDDEN_ROLE)', async () => {
    const payload = {
      stocktake_date: '2026-11-22',
      items: [
        {
          inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
          opening_qty: 5000,
          received_in_qty: 0,
          bom_consumed_qty: 500,
          actual_counted_qty: 4500,
        },
      ],
    };

    const cashierRes = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send(payload);
    expect(cashierRes.status).toBe(403);
    expect(cashierRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const baristaRes = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes`)
      .set(authAs(SEED_IDS.users.barista01))
      .send(payload);
    expect(baristaRes.status).toBe(403);
    expect(baristaRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('5. RBAC blocks BARISTA_KDS and WAREHOUSE_MANAGER from blind-closing a POS shift (403 FORBIDDEN_ROLE)', async () => {
    const baristaRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ blind_counted_cash_vnd: 2000000 });
    expect(baristaRes.status).toBe(403);

    const whRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({ blind_counted_cash_vnd: 2000000 });
    expect(whRes.status).toBe(403);
  });

  it('6. KDS Board computes SLA tiers accurately and strips ALL financial/cost fields for BARISTA_KDS', async () => {
    // Seed order created_at is 2026-11-22T01:00:00.000Z -> +7 min = WARNING_YELLOW
    const res = await request(app)
      .get(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/board?reference_now_iso=2026-11-22T01:07:00.000Z`,
      )
      .set(authAs(SEED_IDS.users.barista01));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const ticket = res.body.data[0] as Record<string, unknown>;
    expect(ticket.wait_minutes).toBe(7);
    expect(ticket.sla_level).toBe('WARNING_YELLOW');

    for (const key of [...KDS_FORBIDDEN_FINANCE_KEYS, ...SENSITIVE_COST_KEYS]) {
      expect(ticket).not.toHaveProperty(key);
    }

    // +12 min -> CRITICAL_RED
    const redRes = await request(app)
      .get(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/board?reference_now_iso=2026-11-22T01:12:00.000Z`,
      )
      .set(authAs(SEED_IDS.users.barista01));
    expect(redRes.status).toBe(200);
    expect(redRes.body.data[0].sla_level).toBe('CRITICAL_RED');
  });

  it('7. KDS Advance transitions QUEUED -> PREPARING without deducting BOM and writes audit log', async () => {
    const res = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/advance`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ target_status: 'PREPARING' });

    expect(res.status).toBe(200);
    expect(res.body.data.kds_status).toBe('PREPARING');

    const db = getInMemoryDb();
    const order = db.posOrders.find(
      (o) => o.id === SEED_ORDER_IDS.store01SampleOrder,
    );
    expect(order?.kds_status).toBe('PREPARING');
    expect(order?.bom_deducted_at).toBeNull();
    expect(
      db.auditLogs.some(
        (a) =>
          a.action === 'KDS_ORDER_PREPARING' &&
          a.target_id === SEED_ORDER_IDS.store01SampleOrder,
      ),
    ).toBe(true);
  });

  it('8. KDS Complete executes Atomic 2-Tier BOM Multi-Lot FIFO Deduction (recipe wastage + modifier espresso shot)', async () => {
    seedStoreBomAccessoryLots(SEED_IDS.stores.store01);
    const db = getInMemoryDb();

    // Make Store 1 existing Robusta lot (roast_date 2026-11-10) have only 40g left,
    // and add a newer lot (roast_date 2026-11-18) with 1000g to prove 2-lot FIFO cascade!
    const oldestLot = db.warehouseLots.find(
      (l) => l.id === SEED_IDS.warehouseLots.store01RoastedRobusta01,
    )!;
    oldestLot.remaining_qty = 40;
    db.warehouseLots.push({
      ...structuredClone(oldestLot),
      id: '50000000-0000-4000-8000-000000000099',
      lot_code: 'LOT-S01-RC-ROB-002',
      roast_date: '2026-11-18',
      received_at: '2026-11-19T08:00:00.000Z',
      initial_qty: 1000,
      remaining_qty: 1000,
    });

    // Create 2x Ca Phe Sua Da Size M + Extra Espresso Shot (18g/cup)
    // Robusta required = 2 * 20g * 1.02 (40.8g) + 2 * 18g (36g) = 76.8g
    // Condensed milk required = 2 * 25ml * 1.02 = 51ml
    // Plastic cup = 2 pcs, Bio straw = 2 pcs
    const orderRes = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [SEED_IDS.menuModifiers.extraEspressoShot],
            quantity: 2,
          },
        ],
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.order.id as string;

    const completeRes = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${orderId}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ allow_partial_on_shortage: false });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.kds_status).toBe('COMPLETED');
    expect(completeRes.body.data.already_deducted).toBe(false);
    expect(completeRes.body.data.has_shortage).toBe(false);

    const robustaDed = (
      completeRes.body.data.deductions as Array<{
        sku: string;
        required_qty: number;
        deducted_qty: number;
        lot_slices: Array<{ lot_code: string; deducted_qty: number; depleted: boolean }>;
      }>
    ).find((d) => d.sku === 'RC-ROB-MED');

    expect(robustaDed?.required_qty).toBe(76.8);
    expect(robustaDed?.deducted_qty).toBe(76.8);
    expect(robustaDed?.lot_slices).toHaveLength(2);
    expect(robustaDed?.lot_slices[0]?.lot_code).toBe('LOT-S01-RC-ROB-001');
    expect(robustaDed?.lot_slices[0]?.deducted_qty).toBe(40);
    expect(robustaDed?.lot_slices[0]?.depleted).toBe(true);
    expect(robustaDed?.lot_slices[1]?.lot_code).toBe('LOT-S01-RC-ROB-002');
    expect(robustaDed?.lot_slices[1]?.deducted_qty).toBe(36.8);

    // Verify persisted lots in DB
    expect(oldestLot.remaining_qty).toBe(0);
    expect(oldestLot.status).toBe('DEPLETED');
    const newerLot = db.warehouseLots.find(
      (l) => l.lot_code === 'LOT-S01-RC-ROB-002',
    );
    expect(newerLot?.remaining_qty).toBe(963.2);
    const milkLot = db.warehouseLots.find(
      (l) =>
        l.store_id === SEED_IDS.stores.store01 &&
        l.item_id === SEED_IDS.inventoryItems.condensedMilk,
    );
    expect(milkLot?.remaining_qty).toBe(4949);

    expect(
      db.auditLogs.some(
        (a) => a.action === 'KDS_ORDER_BOM_DEDUCTED' && a.target_id === orderId,
      ),
    ).toBe(true);
  });

  it('9. KDS BOM Idempotency Guard: 2nd complete-bom call returns already_deducted=true without deducting twice', async () => {
    seedStoreBomAccessoryLots(SEED_IDS.stores.store01);
    const db = getInMemoryDb();
    const initialRobusta = db.warehouseLots.find(
      (l) => l.id === SEED_IDS.warehouseLots.store01RoastedRobusta01,
    )!.remaining_qty;

    const first = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({});
    expect(first.status).toBe(200);
    expect(first.body.data.already_deducted).toBe(false);

    const afterFirst = db.warehouseLots.find(
      (l) => l.id === SEED_IDS.warehouseLots.store01RoastedRobusta01,
    )!.remaining_qty;
    expect(afterFirst).toBe(initialRobusta - 40.8);

    const second = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({});
    expect(second.status).toBe(200);
    expect(second.body.data.already_deducted).toBe(true);
    expect(second.body.data.deductions).toEqual([]);

    const afterSecond = db.warehouseLots.find(
      (l) => l.id === SEED_IDS.warehouseLots.store01RoastedRobusta01,
    )!.remaining_qty;
    expect(afterSecond).toBe(afterFirst);
  });

  it('10. KDS BOM Strict Mode rejects 409 INSUFFICIENT_STORE_BOM_STOCK and rolls back Robusta deduction', async () => {
    // Do NOT seed accessory lots -> condensed milk / cup / straw are missing
    const db = getInMemoryDb();
    const robustaBefore = db.warehouseLots.find(
      (l) => l.id === SEED_IDS.warehouseLots.store01RoastedRobusta01,
    )!.remaining_qty;

    const res = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ allow_partial_on_shortage: false });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STORE_BOM_STOCK');

    // Atomic rollback: Robusta lot remains untouched and order stays QUEUED
    expect(
      db.warehouseLots.find(
        (l) => l.id === SEED_IDS.warehouseLots.store01RoastedRobusta01,
      )!.remaining_qty,
    ).toBe(robustaBefore);
    expect(
      db.posOrders.find((o) => o.id === SEED_ORDER_IDS.store01SampleOrder)
        ?.bom_deducted_at,
    ).toBeNull();
  });

  it('11. KDS BOM Partial Mode (allow_partial_on_shortage=true) deducts available stock and reports exact shortage_qty', async () => {
    const res = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ allow_partial_on_shortage: true });

    expect(res.status).toBe(200);
    expect(res.body.data.kds_status).toBe('COMPLETED');
    expect(res.body.data.has_shortage).toBe(true);

    const milkDed = (
      res.body.data.deductions as Array<{
        sku: string;
        deducted_qty: number;
        shortage_qty: number;
      }>
    ).find((d) => d.sku === 'ING-COND-MILK');
    expect(milkDed?.deducted_qty).toBe(0);
    expect(milkDed?.shortage_qty).toBe(51);
  });

  it('12. KDS BOM Void Guard blocks completing a VOIDED order (409 ORDER_ALREADY_VOIDED)', async () => {
    const voidRes = await request(app)
      .post(
        `/api/v1/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/void`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        manager_id: SEED_IDS.users.storeManager01,
        pin: '123456',
        reason: 'Khach huy mon truoc khi pha',
      });
    expect(voidRes.status).toBe(200);

    const kdsRes = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ allow_partial_on_shortage: true });

    expect(kdsRes.status).toBe(409);
    expect(kdsRes.body.error.code).toBe('ORDER_ALREADY_VOIDED');
  });

  it('13. KDS Advance Guard rejects reverting COMPLETED order back to PREPARING (409 KDS_INVALID_TRANSITION)', async () => {
    seedStoreBomAccessoryLots(SEED_IDS.stores.store01);

    await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/complete-bom`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({});

    const revertRes = await request(app)
      .post(
        `/api/v1/kds/stores/${SEED_IDS.stores.store01}/orders/${SEED_ORDER_IDS.store01SampleOrder}/advance`,
      )
      .set(authAs(SEED_IDS.users.barista01))
      .send({ target_status: 'PREPARING' });

    expect(revertRes.status).toBe(409);
    expect(revertRes.body.error.code).toBe('KDS_INVALID_TRANSITION');
  });

  it('14. Barista Low-Stock Alert creates alert, writes audit log, and is visible to Store Manager', async () => {
    const createRes = await request(app)
      .post(`/api/v1/kds/stores/${SEED_IDS.stores.store01}/low-stock-alerts`)
      .set(authAs(SEED_IDS.users.barista01))
      .send({
        inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
        severity: 'OUT_OF_STOCK',
        note: 'Quầy bar vừa hết hộp sữa đặc cuối cùng',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.sku).toBe('ING-COND-MILK');
    expect(createRes.body.data.severity).toBe('OUT_OF_STOCK');

    const listRes = await request(app)
      .get(`/api/v1/kds/stores/${SEED_IDS.stores.store01}/low-stock-alerts`)
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(
      getInMemoryDb().auditLogs.some(
        (a) => a.action === 'BARISTA_LOW_STOCK_REPORTED',
      ),
    ).toBe(true);
  });

  it('15. Blind Shift Close (BALANCED): OPEN shift hides expected cash from CASHIER_STAFF, closing reveals exact cash reconciliation (excludes VIETQR)', async () => {
    // 1) While OPEN, cashier sees system_expected_cash_vnd === null
    const openRes = await request(app)
      .get(`/api/v1/stores/${SEED_IDS.stores.store01}/shifts/current`)
      .set(authAs(SEED_IDS.users.cashier01));
    expect(openRes.status).toBe(200);
    expect(openRes.body.data.system_expected_cash_vnd).toBeNull();

    // 2) Create 1 PAID CASH order (29,000 VND). Seeded VIETQR order (58,000 VND) must NOT count into cash drawer!
    const cashOrderRes = await request(app)
      .post(`/api/v1/pos/stores/${SEED_IDS.stores.store01}/orders`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
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
      });
    expect(cashOrderRes.status).toBe(201);

    // Opening float = 2,000,000 + CASH sales = 29,000 -> Expected = 2,029,000
    const closeRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({
        blind_counted_cash_vnd: 2029000,
        notes: 'Đếm tiền cuối ca sáng Quán 1 khớp tuyệt đối',
      });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('CLOSED');
    expect(closeRes.body.data.opening_cash_vnd).toBe(2000000);
    expect(closeRes.body.data.cash_sales_vnd).toBe(29000);
    expect(closeRes.body.data.vietqr_sales_vnd).toBe(58000);
    expect(closeRes.body.data.system_expected_cash_vnd).toBe(2029000);
    expect(closeRes.body.data.variance_cash_vnd).toBe(0);
    expect(closeRes.body.data.variance_status).toBe('BALANCED');
    expect(
      getInMemoryDb().auditLogs.some(
        (a) => a.action === 'POS_SHIFT_BLIND_CLOSED',
      ),
    ).toBe(true);
  });

  it('16. Blind Shift Close detects SHORTAGE, SURPLUS, and blocks double-closing (409 SHIFT_ALREADY_CLOSED)', async () => {
    // Store 1 has opening 2,000,000 + 0 CASH orders -> expected 2,000,000; count 1,960,000 -> SHORTAGE -40,000
    const shortageRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({ blind_counted_cash_vnd: 1960000 });
    expect(shortageRes.status).toBe(200);
    expect(shortageRes.body.data.variance_cash_vnd).toBe(-40000);
    expect(shortageRes.body.data.variance_status).toBe('SHORTAGE');

    // Re-closing same shift must fail 409 SHIFT_ALREADY_CLOSED
    const doubleCloseRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({ blind_counted_cash_vnd: 2000000 });
    expect(doubleCloseRes.status).toBe(409);
    expect(doubleCloseRes.body.error.code).toBe('SHIFT_ALREADY_CLOSED');

    // Store 2 has opening 1,500,000 + seeded CASH PAID order 70,000 -> expected 1,570,000; count 1,595,000 -> SURPLUS +25,000
    const surplusRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store02}/shifts/${SEED_EXTRA_SHIFT_IDS.store02OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.cashier02))
      .send({ blind_counted_cash_vnd: 1595000 });
    expect(surplusRes.status).toBe(200);
    expect(surplusRes.body.data.system_expected_cash_vnd).toBe(1570000);
    expect(surplusRes.body.data.variance_cash_vnd).toBe(25000);
    expect(surplusRes.body.data.variance_status).toBe('SURPLUS');
  });

  it('17. Open Shift rejects duplicate OPEN shift (409 SHIFT_ALREADY_OPEN) and succeeds after closing previous shift', async () => {
    const dupRes = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/open`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({ opening_cash_vnd: 1500000 });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('SHIFT_ALREADY_OPEN');

    await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({ blind_counted_cash_vnd: 2000000 });

    const newOpenRes = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/open`)
      .set(authAs(SEED_IDS.users.cashier01))
      .send({ opening_cash_vnd: 1800000, notes: 'Ca chiều Quán 1' });
    expect(newOpenRes.status).toBe(201);
    expect(newOpenRes.body.data.status).toBe('OPEN');
    expect(newOpenRes.body.data.opening_cash_vnd).toBe(1800000);
    // Blind close guard still masks system_expected_cash_vnd to null for CASHIER_STAFF on OPEN shift!
    expect(newOpenRes.body.data.system_expected_cash_vnd).toBeNull();
  });

  it('18. EOD Store Daily Stocktake calculates BOM theoretical closing, variance & flags >3% abnormal shrinkage', async () => {
    const res = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        stocktake_date: '2026-11-22',
        notes: 'Kiểm kho cuối ngày Quán 1',
        items: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            opening_qty: 5000,
            received_in_qty: 1000,
            bom_consumed_qty: 1000,
            actual_counted_qty: 4750, // theoretical 5000, variance -250 (-5.0% -> abnormal!)
          },
          {
            inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
            opening_qty: 3000,
            received_in_qty: 0,
            bom_consumed_qty: 500,
            actual_counted_qty: 2475, // theoretical 2500, variance -25 (-1.0% -> normal)
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.total_items_counted).toBe(2);
    expect(res.body.data.abnormal_shrinkage_count).toBe(1);

    const items = res.body.data.items as Array<{
      sku: string;
      theoretical_closing_qty: number;
      variance_qty: number;
      variance_pct: number;
      is_abnormal_shrinkage: boolean;
    }>;

    const robusta = items.find((i) => i.sku === 'RC-ROB-MED');
    expect(robusta?.theoretical_closing_qty).toBe(5000);
    expect(robusta?.variance_qty).toBe(-250);
    expect(robusta?.variance_pct).toBe(-5);
    expect(robusta?.is_abnormal_shrinkage).toBe(true);

    const milk = items.find((i) => i.sku === 'ING-COND-MILK');
    expect(milk?.is_abnormal_shrinkage).toBe(false);
    expect(
      getInMemoryDb().auditLogs.some(
        (a) => a.action === 'STORE_DAILY_STOCKTAKE_SUBMITTED',
      ),
    ).toBe(true);
  });

  it('19. EOD Daily Stocktake performs idempotent upsert per (store, item, date) and strips confidential cost keys', async () => {
    await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        stocktake_date: '2026-11-22',
        items: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            opening_qty: 5000,
            received_in_qty: 0,
            bom_consumed_qty: 500,
            actual_counted_qty: 4400,
          },
        ],
      });

    // Re-submit corrected count for the same date -> upserts instead of duplicating
    await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        stocktake_date: '2026-11-22',
        items: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            opening_qty: 5000,
            received_in_qty: 0,
            bom_consumed_qty: 500,
            actual_counted_qty: 4490,
          },
        ],
      });

    const listRes = await request(app)
      .get(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes?stocktake_date=2026-11-22`,
      )
      .set(authAs(SEED_IDS.users.storeManager01));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].actual_counted_qty).toBe(4490);
    expect(JSON.stringify(listRes.body)).not.toContain('moving_avg_cost_vnd');
  });

  it('20. Multi-Tenant Isolation blocks Store 1 STORE_MANAGER from submitting stocktakes or closing Store 2 shift (403)', async () => {
    const stocktakeRes = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store02}/stocktakes`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        stocktake_date: '2026-11-22',
        items: [
          {
            inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
            opening_qty: 5000,
            received_in_qty: 0,
            bom_consumed_qty: 200,
            actual_counted_qty: 4800,
          },
        ],
      });
    expect(stocktakeRes.status).toBe(403);
    expect(stocktakeRes.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');

    const closeRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store02}/shifts/${SEED_EXTRA_SHIFT_IDS.store02OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({ blind_counted_cash_vnd: 1570000 });
    expect(closeRes.status).toBe(403);
    expect(closeRes.body.error.code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
  });
});
```
