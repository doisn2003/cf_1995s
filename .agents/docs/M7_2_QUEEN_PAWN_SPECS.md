# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M7.2 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M7.2 - Backend Multi-Entity OLAP P&L Consolidation Service (Kho Tổng vs 4 Quán) & 1-Click Franchise Cloner + Supertest Suite (@cf19/api)`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M7_2_KING_CHARTER.md` và `M7_1_QUEEN_PAWN_SPECS.md`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không bỏ `.js` trong import tương đối (`moduleResolution: "NodeNext"`).
  - Bảo toàn 100% **117/117 bài test hiện có của `@cf19/api`**.
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 2 files trong `@cf19/api`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\api\src\modules\analytics\analytics.service.ts` (Tạo mới)
  2. `C:\bib\cf_19\apps\api\src\modules\analytics\analytics.routes.ts` (Tạo mới)

### File 1: `C:\bib\cf_19\apps\api\src\modules\analytics\analytics.service.ts`

```ts
import { randomUUID } from 'node:crypto';
import {
  SEED_IDS,
  calculateCentralWarehousePnl,
  calculateOrderBomRequirementsAndCogs,
  calculateStoreNodePnl,
  consolidateEnterprisePnl,
  convertToKgForTierPricing,
  previewClonedStoreMenuPricing,
  type BomInventoryCostLookup,
  type CloneFranchiseStoreInput,
  type CloneFranchiseStoreResultDTO,
  type ClonedMenuProductPricePreviewDTO,
  type EnterpriseConsolidatedPnlDTO,
  type ExecutivePnlQueryDTO,
  type FranchiseMenuProductSourceInput,
  type InternalTransferDto,
  type InternalTransferItemDto,
  type PosShiftFullDto,
  type PreviewFranchisePricingInput,
  type StarterTransferSummaryDTO,
  type StoreDto,
  type StoreNodePnlDTO,
} from '@cf19/shared';
import { getInMemoryDb } from '../../db/inMemoryDb.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

function isWithinDateRange(
  isoOrDate: string | null | undefined,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }
  if (!isoOrDate) {
    return false;
  }
  const datePart = isoOrDate.slice(0, 10);
  if (from && datePart < from) {
    return false;
  }
  if (to && datePart > to) {
    return false;
  }
  return true;
}

/**
 * 1. Consolidated Executive OLAP P&L separating Central Warehouse vs. all Store Nodes
 *    with strict Intercompany Internal Transfer Revenue Elimination.
 */
export async function getExecutivePnlConsolidation(
  query: ExecutivePnlQueryDTO,
): Promise<EnterpriseConsolidatedPnlDTO> {
  const db = getInMemoryDb();
  const warehouseStore = db.stores.find(
    (s) => s.type === 'CENTRAL_WAREHOUSE' && s.is_active,
  );
  if (!warehouseStore) {
    throw new WarehouseDomainError(
      404,
      'WAREHOUSE_NOT_FOUND',
      'Active CENTRAL_WAREHOUSE node not found',
    );
  }

  // 1A. Central Warehouse External B2B Revenue & Raw Origin COGS
  const activeB2bOrders = db.b2bOrders.filter(
    (o) =>
      o.warehouse_store_id === warehouseStore.id &&
      o.payment_status !== 'VOIDED' &&
      isWithinDateRange(o.created_at, query.period_from, query.period_to),
  );

  const b2bExternalRevenue = activeB2bOrders.reduce(
    (sum, o) => sum + o.total_amount_vnd,
    0,
  );
  const b2bRawCogs = activeB2bOrders.reduce(
    (sum, o) => sum + o.cogs_amount_vnd,
    0,
  );

  // 1B. Central Warehouse Reconciled Internal Transfers (Intercompany Revenue vs Raw Origin COGS)
  const reconciledTransfers = db.internalTransfers.filter(
    (t) =>
      t.from_warehouse_id === warehouseStore.id &&
      t.status === 'RECONCILED' &&
      isWithinDateRange(
        t.received_at ?? t.requested_at,
        query.period_from,
        query.period_to,
      ),
  );

  const internalTransferRevenue = reconciledTransfers.reduce(
    (sum, t) => sum + t.total_internal_value_vnd,
    0,
  );

  let internalTransferRawCogs = 0;
  for (const transfer of reconciledTransfers) {
    const items = db.internalTransferItems.filter(
      (it) => it.transfer_id === transfer.id,
    );
    for (const item of items) {
      const invItem = db.inventoryItems.find((i) => i.id === item.item_id);
      if (!invItem) continue;
      const sourceLot = item.source_lot_id
        ? db.warehouseLots.find((l) => l.id === item.source_lot_id)
        : undefined;
      const rawUnitCost =
        sourceLot?.unit_cost_vnd ?? invItem.moving_avg_cost_vnd;
      const billingQty = convertToKgForTierPricing(
        item.received_qty,
        invItem.base_unit,
      );
      internalTransferRawCogs += Math.round(billingQty * rawUnitCost);
    }
  }

  const warehousePnl = calculateCentralWarehousePnl({
    warehouse_store_id: warehouseStore.id,
    warehouse_code: warehouseStore.code,
    warehouse_name: warehouseStore.name,
    b2b_orders_count: activeB2bOrders.length,
    reconciled_transfers_count: reconciledTransfers.length,
    b2b_external_revenue_vnd: b2bExternalRevenue,
    b2b_raw_cogs_vnd: b2bRawCogs,
    internal_transfer_revenue_vnd: internalTransferRevenue,
    internal_transfer_raw_cogs_vnd: internalTransferRawCogs,
    warehouse_operating_expense_vnd: query.warehouse_operating_expense_vnd,
  });

  // 2. Individual Store Nodes (RETAIL_STORE & FRANCHISE_STORE)
  const branchStores = db.stores.filter(
    (s) =>
      (s.type === 'RETAIL_STORE' || s.type === 'FRANCHISE_STORE') &&
      s.is_active,
  );

  const storeNodePnls: StoreNodePnlDTO[] = branchStores.map((store) => {
    const paidOrders = db.posOrders.filter(
      (o) =>
        o.store_id === store.id &&
        o.payment_status === 'PAID' &&
        isWithinDateRange(o.created_at, query.period_from, query.period_to),
    );

    const cashRevenue = paidOrders
      .filter((o) => o.payment_method === 'CASH')
      .reduce((sum, o) => sum + o.total_amount_vnd, 0);

    const vietqrRevenue = paidOrders
      .filter((o) => o.payment_method === 'VIETQR')
      .reduce((sum, o) => sum + o.total_amount_vnd, 0);

    const internalBomCogs = paidOrders.reduce(
      (sum, o) => sum + o.cogs_amount_vnd,
      0,
    );

    // Cash shortage losses from CLOSED blind shifts (variance_cash_vnd < 0)
    const closedShifts = db.posShifts.filter(
      (sh) =>
        sh.store_id === store.id &&
        sh.status === 'CLOSED' &&
        isWithinDateRange(
          sh.closed_at ?? sh.opened_at,
          query.period_from,
          query.period_to,
        ),
    );

    const cashShortageLoss = closedShifts.reduce((sum, sh) => {
      if (sh.variance_cash_vnd !== null && sh.variance_cash_vnd < 0) {
        return sum + Math.abs(sh.variance_cash_vnd);
      }
      return sum;
    }, 0);

    // EOD stocktake shrinkage losses (variance_qty < 0 * internal_transfer_price_vnd)
    const shrinkageStocktakes = db.storeDailyStocktakes.filter(
      (st) =>
        st.store_id === store.id &&
        st.variance_qty < 0 &&
        isWithinDateRange(st.stocktake_date, query.period_from, query.period_to),
    );

    const stocktakeShrinkageLoss = shrinkageStocktakes.reduce((sum, st) => {
      const inv = db.inventoryItems.find((i) => i.id === st.inventory_item_id);
      if (!inv) return sum;
      const billingQty = convertToKgForTierPricing(
        Math.abs(st.variance_qty),
        inv.base_unit,
      );
      return sum + Math.round(billingQty * inv.internal_transfer_price_vnd);
    }, 0);

    return calculateStoreNodePnl({
      store_id: store.id,
      store_code: store.code,
      store_name: store.name,
      store_type: store.type as 'RETAIL_STORE' | 'FRANCHISE_STORE',
      price_multiplier: store.price_multiplier,
      paid_orders_count: paidOrders.length,
      cash_revenue_vnd: cashRevenue,
      vietqr_revenue_vnd: vietqrRevenue,
      store_internal_bom_cogs_vnd: internalBomCogs,
      labor_cost_vnd: 0,
      cash_shortage_loss_vnd: cashShortageLoss,
      stocktake_shrinkage_loss_vnd: stocktakeShrinkageLoss,
      franchise_royalty_pct: query.franchise_royalty_pct,
    });
  });

  return consolidateEnterprisePnl({
    warehouse: warehousePnl,
    stores: storeNodePnls,
    period_from: query.period_from ?? null,
    period_to: query.period_to ?? null,
  });
}

/**
 * 2. Preview cloned Master Menu pricing & estimated BOM gross margin for a target regional multiplier.
 */
export async function previewFranchisePricing(
  query: PreviewFranchisePricingInput,
): Promise<ClonedMenuProductPricePreviewDTO[]> {
  const db = getInMemoryDb();

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

  const productSources: FranchiseMenuProductSourceInput[] = db.menuProducts
    .filter((p) => p.is_active)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((product) => {
      const defaultVariant =
        db.menuVariants.find(
          (v) => v.product_id === product.id && v.is_default && v.is_active,
        ) ??
        db.menuVariants.find(
          (v) => v.product_id === product.id && v.is_active,
        );

      let defaultBomCogsVnd = 0;
      if (defaultVariant) {
        const bom = calculateOrderBomRequirementsAndCogs({
          lines: [
            {
              product_id: product.id,
              variant_id: defaultVariant.id,
              modifier_ids: [],
              quantity: 1,
            },
          ],
          recipes: db.bomRecipes,
          modifiersById: {},
          inventoryItemsById,
        });
        defaultBomCogsVnd = bom.total_cogs_vnd;
      }

      return {
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        master_base_price_vnd: product.base_price_vnd,
        default_variant_bom_cogs_vnd: defaultBomCogsVnd,
      };
    });

  return previewClonedStoreMenuPricing(query.price_multiplier, productSources);
}

/**
 * 3. 1-Click Atomic Franchise Store Cloning Engine (SUPER_ADMIN only).
 *    Creates Store -> Inaugural OPEN Shift -> Optional Starter Transfer -> Menu Preview -> Audit Log.
 */
export async function cloneFranchiseStore(
  actor: AuthActor,
  input: CloneFranchiseStoreInput,
): Promise<CloneFranchiseStoreResultDTO> {
  const db = getInMemoryDb();
  const normalizedCode = input.code.trim().toUpperCase();

  const duplicate = db.stores.find(
    (s) => s.code.toUpperCase() === normalizedCode,
  );
  if (duplicate) {
    throw new WarehouseDomainError(
      409,
      'DUPLICATE_STORE_CODE',
      `Store code ${normalizedCode} already exists`,
    );
  }

  const nowIso = new Date().toISOString();
  const newStore: StoreDto = {
    id: randomUUID(),
    organization_id: SEED_IDS.organization.cf19,
    code: normalizedCode,
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    phone: input.phone?.trim() ?? null,
    price_multiplier: input.price_multiplier,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  db.stores.push(newStore);

  // Inaugural OPEN POS shift for the newly cloned branch
  const openingShift: PosShiftFullDto = {
    id: randomUUID(),
    store_id: newStore.id,
    cashier_id: actor.id,
    opened_at: nowIso,
    closed_at: null,
    opening_cash_vnd: input.opening_cash_vnd,
    blind_counted_cash_vnd: null,
    system_expected_cash_vnd: input.opening_cash_vnd,
    variance_cash_vnd: null,
    status: 'OPEN',
    notes:
      input.notes?.trim() ||
      `Ca khai trương khởi tạo tự động (1-Click Clone ${normalizedCode})`,
  };

  db.posShifts.unshift(openingShift);

  // Optional Starter Replenishment Transfer Request from Central Warehouse
  let starterTransferSummary: StarterTransferSummaryDTO | null = null;
  if (input.create_starter_transfer) {
    const warehouseStore = db.stores.find(
      (s) => s.type === 'CENTRAL_WAREHOUSE' && s.is_active,
    );
    const starterCoffeeItem = db.inventoryItems.find(
      (i) => i.id === SEED_IDS.inventoryItems.roastedRobustaMed && i.is_active,
    );

    if (warehouseStore && starterCoffeeItem) {
      const transferId = randomUUID();
      const transferCode = `TRF-INIT-${normalizedCode}-${nowIso.slice(0, 10).replace(/-/g, '')}`;
      const billingQty = convertToKgForTierPricing(
        input.starter_coffee_qty_g,
        starterCoffeeItem.base_unit,
      );
      const totalInternalValue = Math.round(
        billingQty * starterCoffeeItem.internal_transfer_price_vnd,
      );

      const newTransfer: InternalTransferDto = {
        id: transferId,
        transfer_code: transferCode,
        from_warehouse_id: warehouseStore.id,
        to_store_id: newStore.id,
        status: 'REQUESTED',
        total_internal_value_vnd: totalInternalValue,
        requested_by: actor.id,
        dispatched_by: null,
        received_by: null,
        requested_at: nowIso,
        dispatched_at: null,
        received_at: null,
        notes: `Phiếu xin cấp hàng khai trương tự động cho ${normalizedCode}`,
      };

      const newTransferItem: InternalTransferItemDto = {
        id: randomUUID(),
        transfer_id: transferId,
        item_id: starterCoffeeItem.id,
        source_lot_id: null,
        destination_lot_id: null,
        requested_qty: input.starter_coffee_qty_g,
        dispatched_qty: 0,
        received_qty: 0,
        internal_unit_price_vnd: starterCoffeeItem.internal_transfer_price_vnd,
        line_total_vnd: totalInternalValue,
      };

      db.internalTransfers.unshift(newTransfer);
      db.internalTransferItems.push(newTransferItem);

      starterTransferSummary = {
        transfer_id: transferId,
        transfer_code: transferCode,
        status: 'REQUESTED',
        total_internal_value_vnd: totalInternalValue,
      };
    }
  }

  const clonedMenuPreview = await previewFranchisePricing({
    price_multiplier: input.price_multiplier,
  });

  recordAuditLog({
    actorId: actor.id,
    storeId: newStore.id,
    action: 'FRANCHISE_STORE_CLONED',
    targetTable: 'stores',
    targetId: newStore.id,
    reason: `1-Click cloned ${newStore.type} branch ${newStore.code} (${input.price_multiplier}x)`,
    payload: {
      store_code: newStore.code,
      store_type: newStore.type,
      price_multiplier: newStore.price_multiplier,
      opening_shift_id: openingShift.id,
      starter_transfer_id: starterTransferSummary?.transfer_id ?? null,
      starter_transfer_code: starterTransferSummary?.transfer_code ?? null,
    },
  });

  return {
    store: structuredClone(newStore),
    opening_shift_id: openingShift.id,
    starter_transfer: starterTransferSummary,
    cloned_menu_preview: clonedMenuPreview,
    cloned_at: nowIso,
  };
}
```

### File 2: `C:\bib\cf_19\apps\api\src\modules\analytics\analytics.routes.ts`

```ts
import { Router, type Request, type Response } from 'express';
import {
  CloneFranchiseStoreSchema,
  ExecutivePnlQuerySchema,
  PreviewFranchisePricingSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  cloneFranchiseStore,
  getExecutivePnlConsolidation,
  previewFranchisePricing,
} from './analytics.service.js';

export const analyticsRouter = Router();

// Strictly SUPER_ADMIN ONLY across all Executive P&L and Franchise Cloning routes
analyticsRouter.use(
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
);

function handleAnalyticsError(res: Response, err: unknown): void {
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
    err instanceof Error ? err.message : 'Unexpected executive analytics error';
  res.status(500).json({
    error: {
      code: 'ANALYTICS_INTERNAL_ERROR',
      message,
    },
  });
}

/**
 * GET /api/v1/analytics/pnl-consolidation
 */
analyticsRouter.get('/pnl-consolidation', async (req: Request, res: Response) => {
  const parsed = ExecutivePnlQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_PNL_QUERY',
        message: 'Invalid Executive P&L query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const report = await getExecutivePnlConsolidation(parsed.data);
    res.status(200).json({ data: report });
  } catch (err) {
    handleAnalyticsError(res, err);
  }
});

/**
 * GET /api/v1/analytics/franchise/preview-pricing
 */
analyticsRouter.get(
  '/franchise/preview-pricing',
  async (req: Request, res: Response) => {
    const parsed = PreviewFranchisePricingSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PREVIEW_PRICING_QUERY',
          message: 'Invalid franchise pricing preview parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const preview = await previewFranchisePricing(parsed.data);
      res.status(200).json({ data: preview });
    } catch (err) {
      handleAnalyticsError(res, err);
    }
  },
);

/**
 * POST /api/v1/analytics/franchise/clone-store
 */
analyticsRouter.post(
  '/franchise/clone-store',
  async (req: Request, res: Response) => {
    const parsed = CloneFranchiseStoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CLONE_STORE_PAYLOAD',
          message: 'Invalid franchise store cloning payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await cloneFranchiseStore(req.actor!, parsed.data);
      res.status(201).json({ data: result });
    } catch (err) {
      handleAnalyticsError(res, err);
    }
  },
);
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 2 files trong `@cf19/api`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\api\src\index.ts` (Overwrite — mount `/api/v1/analytics`)
  2. `C:\bib\cf_19\apps\api\src\__tests__\m7-executive-pnl-franchise.test.ts` (Tạo mới — 18 Vitest + Supertest integration tests)

### File 1: `C:\bib\cf_19\apps\api\src\index.ts`

```ts
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { dbMode, env } from './config/env.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
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
  app.use('/api/v1/analytics', analyticsRouter);

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

### File 2: `C:\bib\cf_19\apps\api\src\__tests__\m7-executive-pnl-franchise.test.ts`

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS } from '@cf19/shared';
import { getInMemoryDb, resetInMemoryDb } from '../db/inMemoryDb.js';
import { SEED_TRANSFER_ITEM_IDS } from '../db/seedData.js';
import { app } from '../index.js';

function authAs(userId: string): Record<string, string> {
  return { Authorization: `Bearer dev:${userId}` };
}

describe('M7.2 — @cf19/api Executive OLAP P&L Consolidation & 1-Click Franchise Store Cloning', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('1. RBAC blocks WAREHOUSE_MANAGER from Executive P&L Consolidation (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set(authAs(SEED_IDS.users.warehouseManager));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('2. RBAC blocks STORE_MANAGER from Executive P&L and Franchise Cloning (403 FORBIDDEN_ROLE)', async () => {
    const pnlRes = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set(authAs(SEED_IDS.users.storeManager01));
    expect(pnlRes.status).toBe(403);
    expect(pnlRes.body.error.code).toBe('FORBIDDEN_ROLE');

    const cloneRes = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        code: 'STORE-05',
        name: 'Unauthorized Clone',
        address: '123 Test St',
      });
    expect(cloneRes.status).toBe(403);
    expect(cloneRes.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('3. RBAC blocks CASHIER_STAFF from /api/v1/analytics/* (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/franchise/preview-pricing?price_multiplier=1.1')
      .set(authAs(SEED_IDS.users.cashier01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('4. RBAC blocks BARISTA_KDS from /api/v1/analytics/* (403 FORBIDDEN_ROLE)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set(authAs(SEED_IDS.users.barista01));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('5. Rejects unauthenticated requests to /api/v1/analytics/pnl-consolidation (401)', async () => {
    const res = await request(app).get('/api/v1/analytics/pnl-consolidation');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('6. SUPER_ADMIN retrieves separated Central Warehouse P&L vs. 4 Store Nodes with ranked leaderboard', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set(authAs(SEED_IDS.users.superAdmin));

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.warehouse.warehouse_code).toBe('CW-TAYNGUYEN');
    expect(data.warehouse.b2b_external_revenue_vnd).toBe(18500000);
    expect(data.warehouse.b2b_raw_cogs_vnd).toBe(12450000);
    expect(data.warehouse.b2b_external_gross_profit_vnd).toBe(6050000);

    expect(data.stores).toHaveLength(4);
    expect(data.stores[0].rank).toBe(1);
    // Store 2 (70k rev - 19.2k cogs = 50.8k) ranks ahead of Store 1 (58k rev - 16.5k cogs = 41.5k)
    expect(data.stores[0].store_code).toBe('STORE-02');
    expect(data.stores[1].store_code).toBe('STORE-01');
    expect(data.total_store_pos_revenue_vnd).toBe(128000);
    expect(data.consolidated_external_revenue_vnd).toBe(18500000 + 128000);
  });

  it('7. Intercompany Elimination: RECONCILED internal transfer counts in Warehouse markup profit but is eliminated from consolidated external revenue', async () => {
    // Dispatch seeded 5kg Robusta transfer (775,000 VND internal value) -> IN_TRANSIT
    const dispatchRes = await request(app)
      .post(
        `/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/dispatch`,
      )
      .set(authAs(SEED_IDS.users.warehouseManager))
      .send({ notes: 'Xuất 5kg Robusta FIFO về Quán 1' });
    expect(dispatchRes.status).toBe(200);

    // Reconcile 5000g received at Store 1 -> RECONCILED
    const reconcileRes = await request(app)
      .post(
        `/api/v1/transfers/${SEED_IDS.internalTransfers.store01InitialRequest}/reconcile`,
      )
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
        items: [
          {
            transfer_item_id: SEED_TRANSFER_ITEM_IDS.store01InitialItem01,
            received_qty: 5000,
          },
        ],
      });
    expect(reconcileRes.status).toBe(200);

    const pnlRes = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(pnlRes.status).toBe(200);
    const data = pnlRes.body.data;

    // 5kg * 155,000 internal = 775,000 revenue; 5kg * 124,500 raw cost = 622,500 COGS -> 152,500 markup profit
    expect(data.warehouse.internal_transfer_revenue_vnd).toBe(775000);
    expect(data.warehouse.internal_transfer_raw_cogs_vnd).toBe(622500);
    expect(data.warehouse.internal_markup_profit_vnd).toBe(152500);
    expect(data.intercompany_eliminated_revenue_vnd).toBe(775000);
    // Consolidated external revenue MUST NOT double-count the 775,000 internal transfer!
    expect(data.consolidated_external_revenue_vnd).toBe(18500000 + 128000);
  });

  it('8. Store P&L live integration reflects new POS sales, blind-close cash shortage, and EOD stocktake shrinkage loss', async () => {
    // 1) Create 1 PAID CASH POS order at Store 1 (29,000 VND)
    const posRes = await request(app)
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
    expect(posRes.status).toBe(201);

    // 2) Blind-close Store 1 shift with -40,000 VND cash shortage (expected 2,029,000; counted 1,989,000)
    const closeRes = await request(app)
      .post(
        `/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/shifts/${SEED_IDS.posShifts.store01OpenShift}/blind-close`,
      )
      .set(authAs(SEED_IDS.users.cashier01))
      .send({ blind_counted_cash_vnd: 1989000 });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.variance_cash_vnd).toBe(-40000);

    // 3) Submit Store 1 EOD stocktake with -200g Robusta shrinkage (0.2kg * 155,000 = 31,000 VND)
    const stRes = await request(app)
      .post(`/api/v1/shifts-stocktakes/stores/${SEED_IDS.stores.store01}/stocktakes`)
      .set(authAs(SEED_IDS.users.storeManager01))
      .send({
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
    expect(stRes.status).toBe(200);

    const pnlRes = await request(app)
      .get('/api/v1/analytics/pnl-consolidation')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(pnlRes.status).toBe(200);

    const store1 = (
      pnlRes.body.data.stores as Array<{
        store_code: string;
        cash_revenue_vnd: number;
        vietqr_revenue_vnd: number;
        pos_gross_revenue_vnd: number;
        cash_shortage_loss_vnd: number;
        stocktake_shrinkage_loss_vnd: number;
      }>
    ).find((s) => s.store_code === 'STORE-01');

    expect(store1?.cash_revenue_vnd).toBe(29000);
    expect(store1?.vietqr_revenue_vnd).toBe(58000);
    expect(store1?.pos_gross_revenue_vnd).toBe(87000);
    expect(store1?.cash_shortage_loss_vnd).toBe(40000);
    expect(store1?.stocktake_shrinkage_loss_vnd).toBe(31000);
    expect(pnlRes.body.data.total_cash_shortage_loss_vnd).toBe(40000);
    expect(pnlRes.body.data.total_stocktake_shrinkage_loss_vnd).toBe(31000);
  });

  it('9. Supports warehouse_operating_expense_vnd deduction and empty future period filtering without NaN', async () => {
    const withOpex = await request(app)
      .get(
        '/api/v1/analytics/pnl-consolidation?warehouse_operating_expense_vnd=2000000',
      )
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(withOpex.status).toBe(200);
    expect(withOpex.body.data.warehouse.warehouse_operating_expense_vnd).toBe(
      2000000,
    );
    expect(withOpex.body.data.warehouse.warehouse_net_profit_vnd).toBe(
      6050000 - 2000000,
    );

    const futureRes = await request(app)
      .get(
        '/api/v1/analytics/pnl-consolidation?period_from=2099-01-01&period_to=2099-12-31',
      )
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(futureRes.status).toBe(200);
    expect(futureRes.body.data.consolidated_external_revenue_vnd).toBe(0);
    expect(futureRes.body.data.consolidated_net_margin_pct).toBe(0);
  });

  it('10. Rejects inverted date range (period_to < period_from) with 400 INVALID_PNL_QUERY', async () => {
    const res = await request(app)
      .get(
        '/api/v1/analytics/pnl-consolidation?period_from=2026-11-30&period_to=2026-11-01',
      )
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PNL_QUERY');
  });

  it('11. Franchise pricing preview multiplies Master Menu by 1.15x with BOM gross margin', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/franchise/preview-pricing?price_multiplier=1.15')
      .set(authAs(SEED_IDS.users.superAdmin));

    expect(res.status).toBe(200);
    const items = res.body.data as Array<{
      product_code: string;
      master_base_price_vnd: number;
      cloned_base_price_vnd: number;
      estimated_gross_margin_pct: number;
    }>;
    expect(items.length).toBeGreaterThanOrEqual(3);

    const suaDa = items.find((p) => p.product_code === 'PRD-CF-SUA-DA');
    expect(suaDa?.master_base_price_vnd).toBe(29000);
    expect(suaDa?.cloned_base_price_vnd).toBe(33350);
    expect(suaDa?.estimated_gross_margin_pct).toBeGreaterThan(50);
  });

  it('12. Franchise pricing preview rejects out-of-range multiplier with 400', async () => {
    const low = await request(app)
      .get('/api/v1/analytics/franchise/preview-pricing?price_multiplier=0.2')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(low.status).toBe(400);

    const high = await request(app)
      .get('/api/v1/analytics/franchise/preview-pricing?price_multiplier=5.0')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(high.status).toBe(400);
  });

  it('13. 1-Click Clone Store creates FRANCHISE_STORE #5, opens inaugural shift, creates starter transfer & writes audit log', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        code: 'STORE-05-FRANCHISE',
        name: 'CF19 Nhượng Quyền Buôn Hồ',
        type: 'FRANCHISE_STORE',
        address: '45 Hùng Vương, TX. Buôn Hồ, Đắk Lắk',
        phone: '02623888105',
        price_multiplier: 1.15,
        opening_cash_vnd: 2500000,
        create_starter_transfer: true,
        starter_coffee_qty_g: 10000,
      });

    expect(res.status).toBe(201);
    const data = res.body.data;
    expect(data.store.code).toBe('STORE-05-FRANCHISE');
    expect(data.store.type).toBe('FRANCHISE_STORE');
    expect(data.store.price_multiplier).toBe(1.15);
    expect(data.opening_shift_id).toBeTruthy();
    expect(data.starter_transfer).not.toBeNull();
    expect(data.starter_transfer.status).toBe('REQUESTED');
    // 10kg * 155,000 VND/kg = 1,550,000 VND
    expect(data.starter_transfer.total_internal_value_vnd).toBe(1550000);
    expect(data.cloned_menu_preview.length).toBeGreaterThanOrEqual(3);

    const db = getInMemoryDb();
    expect(
      db.auditLogs.some(
        (a) =>
          a.action === 'FRANCHISE_STORE_CLONED' &&
          a.target_id === data.store.id,
      ),
    ).toBe(true);
  });

  it('14. Newly cloned Store 5 immediately appears in GET /api/v1/stores and serves 1.15x catalog prices', async () => {
    const cloneRes = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        code: 'STORE-05-FRAN',
        name: 'CF19 Quán 5 Nhượng Quyền',
        type: 'FRANCHISE_STORE',
        address: '10 Phan Chu Trinh, TP. BMT',
        price_multiplier: 1.15,
      });
    expect(cloneRes.status).toBe(201);
    const newStoreId = cloneRes.body.data.store.id as string;

    const storesRes = await request(app)
      .get('/api/v1/stores')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(storesRes.status).toBe(200);
    expect(storesRes.body.data).toHaveLength(6);

    const catalogRes = await request(app)
      .get(`/api/v1/catalog/stores/${newStoreId}`)
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.data.store.price_multiplier).toBe(1.15);
    const suaDa = (
      catalogRes.body.data.products as Array<{
        code: string;
        effective_base_price_vnd: number;
      }>
    ).find((p) => p.code === 'PRD-CF-SUA-DA');
    expect(suaDa?.effective_base_price_vnd).toBe(33350);
  });

  it('15. Cloned FRANCHISE_STORE POS revenue triggers 5% franchise_royalty_fee_vnd in Executive P&L Consolidation', async () => {
    const cloneRes = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        code: 'STORE-05-ROYALTY',
        name: 'CF19 Quán 5 Royalty',
        type: 'FRANCHISE_STORE',
        address: '88 Nguyễn Công Trứ, TP. BMT',
        price_multiplier: 1.0,
      });
    expect(cloneRes.status).toBe(201);
    const newStoreId = cloneRes.body.data.store.id as string;
    const shiftId = cloneRes.body.data.opening_shift_id as string;

    // Create 10x Bac Xiu M (10 * 35,000 = 350,000 VND) PAID CASH at Store 5
    const posRes = await request(app)
      .post(`/api/v1/pos/stores/${newStoreId}/orders`)
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        shift_id: shiftId,
        payment_method: 'CASH',
        items: [
          {
            product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
            variant_id: SEED_IDS.menuVariants.bacXiuM,
            modifier_ids: [],
            quantity: 10,
          },
        ],
      });
    expect(posRes.status).toBe(201);

    const pnlRes = await request(app)
      .get('/api/v1/analytics/pnl-consolidation?franchise_royalty_pct=5')
      .set(authAs(SEED_IDS.users.superAdmin));
    expect(pnlRes.status).toBe(200);
    expect(pnlRes.body.data.stores).toHaveLength(5);

    const store5 = (
      pnlRes.body.data.stores as Array<{
        store_code: string;
        pos_gross_revenue_vnd: number;
        franchise_royalty_fee_vnd: number;
      }>
    ).find((s) => s.store_code === 'STORE-05-ROYALTY');

    expect(store5?.pos_gross_revenue_vnd).toBe(350000);
    // 5% of 350,000 = 17,500 VND
    expect(store5?.franchise_royalty_fee_vnd).toBe(17500);
    expect(pnlRes.body.data.total_franchise_royalty_income_vnd).toBe(17500);
  });

  it('16. Cloning with create_starter_transfer=false omits starter transfer cleanly', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        code: 'STORE-06-OWNED',
        name: 'CF19 Quán 6 Tự Sở Hữu',
        type: 'RETAIL_STORE',
        address: '15 Lý Tự Trọng, TP. BMT',
        price_multiplier: 1.0,
        create_starter_transfer: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.starter_transfer).toBeNull();
    expect(getInMemoryDb().internalTransfers).toHaveLength(1);
  });

  it('17. Rejects duplicate store code with 409 DUPLICATE_STORE_CODE', async () => {
    const existingRes = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        code: 'STORE-01',
        name: 'Duplicate Store 1',
        address: '19 Trần Phú',
      });
    expect(existingRes.status).toBe(409);
    expect(existingRes.body.error.code).toBe('DUPLICATE_STORE_CODE');
  });

  it('18. Rejects invalid clone payload (CENTRAL_WAREHOUSE type or out-of-range multiplier) with 400', async () => {
    const badType = await request(app)
      .post('/api/v1/analytics/franchise/clone-store')
      .set(authAs(SEED_IDS.users.superAdmin))
      .send({
        code: 'CW-INVALID',
        name: 'Kho 2',
        type: 'CENTRAL_WAREHOUSE',
        address: 'KCN Tân An',
      });
    expect(badType.status).toBe(400);
    expect(badType.body.error.code).toBe('INVALID_CLONE_STORE_PAYLOAD');
  });
});
```
