import { Router, type Request, type Response } from 'express';
import {
  BlindClosePosShiftRequestSchema,
  OpenShiftSchema,
  SubmitStoreDailyStocktakeSchema,
  calculateBlindShiftCloseVariance,
  calculateDailyStocktakeVariance,
  calculateOrderBomRequirementsAndCogs,
  type BaseUnit,
  type BlindClosePosShiftRequestInput,
  type BlindShiftCloseResultDTO,
  type BomInventoryCostLookup,
  type MenuModifierDto,
  type PaymentMethod,
  type PaymentStatus,
  type PosShiftFullDto,
  type StocktakePreviewRowDTO,
  type StoreDailyStocktakeBatchResultDTO,
  type StoreDailyStocktakeItemResultDTO,
  type SubmitStoreDailyStocktakeInput,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  toNullableIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import { authenticate, type AuthActor } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { loadActiveBomRecipes } from '../catalog/catalog.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

export const shiftStocktakeRouter = Router();

function roundQty2(v: number): number {
  return Math.round(v * 100) / 100;
}

function handleShiftStocktakeError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Lỗi xử lý Ca làm việc / Kiểm kho';
  res.status(500).json({
    error: { code: 'SHIFT_STOCKTAKE_INTERNAL_ERROR', message },
  });
}

interface ShiftRow {
  id: string;
  store_id: string;
  cashier_id: string;
  opened_at: Date | string;
  closed_at: Date | string | null;
  opening_cash_vnd: number;
  blind_counted_cash_vnd: number | null;
  system_expected_cash_vnd: number | null;
  variance_cash_vnd: number | null;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
}

export async function openPosShift(
  actor: AuthActor,
  storeId: string,
  openingCashVnd: number,
  notes?: string,
): Promise<PosShiftFullDto> {
  return withTransaction(async (client) => {
    const store = await dbQueryOne<{ id: string; code: string; type: string }>(
      `SELECT id, code, type FROM public.stores WHERE id = $1 AND is_active = TRUE`,
      [storeId],
      client,
    );
    if (!store || store.type === 'CENTRAL_WAREHOUSE') {
      throw new WarehouseDomainError(400, 'INVALID_POS_STORE', 'Chi nhánh mở ca không hợp lệ');
    }

    const existingOpen = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.pos_shifts WHERE store_id = $1 AND status = 'OPEN' LIMIT 1`,
      [storeId],
      client,
    );
    if (existingOpen) {
      throw new WarehouseDomainError(
        409,
        'SHIFT_ALREADY_OPEN',
        `Chi nhánh ${store.code} đang có một ca làm việc đang mở`,
      );
    }

    const created = await dbQueryOne<ShiftRow>(
      `INSERT INTO public.pos_shifts (store_id, cashier_id, opening_cash_vnd, status, notes)
       VALUES ($1, $2, $3, 'OPEN', $4)
       RETURNING *`,
      [storeId, actor.id, openingCashVnd, notes?.trim() || null],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId,
        action: 'POS_SHIFT_OPENED',
        targetTable: 'pos_shifts',
        targetId: created!.id,
        reason: `Mở ca làm việc mới với quỹ tiền đầu ca ${openingCashVnd.toLocaleString('vi-VN')} đ`,
        payload: { opening_cash_vnd: openingCashVnd },
      },
      client,
    );

    return {
      ...created!,
      opened_at: toIsoString(created!.opened_at),
      closed_at: toNullableIsoString(created!.closed_at),
    };
  });
}

export async function blindClosePosShift(
  actor: AuthActor,
  input: BlindClosePosShiftRequestInput,
): Promise<BlindShiftCloseResultDTO> {
  return withTransaction(async (client) => {
    const shift = await dbQueryOne<ShiftRow>(
      `SELECT * FROM public.pos_shifts WHERE id = $1 FOR UPDATE`,
      [input.shift_id],
      client,
    );
    if (!shift) {
      throw new WarehouseDomainError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy ca làm việc');
    }
    if (shift.store_id !== input.store_id) {
      throw new WarehouseDomainError(403, 'FORBIDDEN_CROSS_TENANT_ACCESS', 'Ca làm việc không thuộc chi nhánh này');
    }
    if (shift.status === 'CLOSED') {
      throw new WarehouseDomainError(409, 'SHIFT_ALREADY_CLOSED', 'Ca làm việc này đã được chốt trước đó');
    }

    const ordersRes = await dbQuery<{
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      total_amount_vnd: number;
    }>(
      `SELECT payment_method, payment_status, total_amount_vnd
       FROM public.pos_orders
       WHERE shift_id = $1 AND store_id = $2`,
      [shift.id, input.store_id],
      client,
    );

    const calc = calculateBlindShiftCloseVariance({
      openingCashVnd: shift.opening_cash_vnd,
      blindCountedCashVnd: input.blind_counted_cash_vnd,
      orders: ordersRes.rows,
    });

    const nextNotes = input.notes?.trim() || shift.notes;
    const closedRow = await dbQueryOne<ShiftRow>(
      `UPDATE public.pos_shifts
       SET status = 'CLOSED',
           closed_at = NOW(),
           blind_counted_cash_vnd = $2,
           system_expected_cash_vnd = $3,
           variance_cash_vnd = $4,
           notes = $5
       WHERE id = $1
       RETURNING *`,
      [
        shift.id,
        calc.blind_counted_cash_vnd,
        calc.system_expected_cash_vnd,
        calc.variance_cash_vnd,
        nextNotes,
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.store_id,
        action: 'POS_SHIFT_BLIND_CLOSED',
        targetTable: 'pos_shifts',
        targetId: shift.id,
        reason: `Chốt ca đếm tiền mù: ${calc.variance_status} (lệch ${calc.variance_cash_vnd.toLocaleString('vi-VN')} đ)`,
        payload: {
          opening_cash_vnd: calc.opening_cash_vnd,
          cash_sales_vnd: calc.cash_sales_vnd,
          vietqr_sales_vnd: calc.vietqr_sales_vnd,
          system_expected_cash_vnd: calc.system_expected_cash_vnd,
          blind_counted_cash_vnd: calc.blind_counted_cash_vnd,
          variance_cash_vnd: calc.variance_cash_vnd,
          variance_status: calc.variance_status,
        },
      },
      client,
    );

    return {
      shift_id: shift.id,
      store_id: shift.store_id,
      cashier_id: shift.cashier_id,
      status: 'CLOSED',
      opened_at: toIsoString(shift.opened_at),
      closed_at: toIsoString(closedRow!.closed_at),
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
  });
}

/**
 * Computes REAL theoretical closing stock directly from PostgreSQL for EOD Stocktake:
 *   - Received in day = SUM(internal_transfer_items.received_qty) where status = 'RECONCILED' on stocktake_date
 *   - BOM consumed in day = Multi-level BOM expansion across all PAID orders on stocktake_date
 *   - Opening qty = Current available store lot stock + BOM consumed - Received in day (or previous day's actual closing)
 *   - Theoretical closing = Opening + Received - BOM Consumed
 * Manager ONLY inputs `actual_counted_qty` — anti-fraud!
 */
export async function previewStoreDailyStocktake(
  storeId: string,
  stocktakeDate: string,
): Promise<StocktakePreviewRowDTO[]> {
  const [itemsRes, lotsRes, receivedRes, orderItemsRes, modsRes, prevStockRes, todayStockRes, bomRecipes] =
    await Promise.all([
      dbQuery<BomInventoryCostLookup & { category: string }>(
        `SELECT id, sku, name, base_unit, internal_transfer_price_vnd, category
         FROM public.inventory_items
         WHERE is_active = TRUE AND category <> 'GREEN_BEAN'
         ORDER BY category ASC, sku ASC`,
      ),
      dbQuery<{ item_id: string; total_qty: number }>(
        `SELECT item_id, COALESCE(SUM(remaining_qty), 0)::numeric(12,2) AS total_qty
         FROM public.warehouse_lots
         WHERE store_id = $1 AND status = 'AVAILABLE' AND remaining_qty > 0
         GROUP BY item_id`,
        [storeId],
      ),
      dbQuery<{ item_id: string; received_qty: number }>(
        `SELECT ti.item_id, COALESCE(SUM(ti.received_qty), 0)::numeric(12,2) AS received_qty
         FROM public.internal_transfer_items ti
         JOIN public.internal_transfers t ON t.id = ti.transfer_id
         WHERE t.to_store_id = $1
           AND t.status = 'RECONCILED'
           AND (t.received_at AT TIME ZONE 'UTC')::date = $2::date
         GROUP BY ti.item_id`,
        [storeId, stocktakeDate],
      ),
      dbQuery<{
        product_id: string;
        variant_id: string;
        quantity: number;
        modifiers_json: Array<{ id: string }>;
      }>(
        `SELECT poi.product_id, poi.variant_id, poi.quantity, poi.modifiers_json
         FROM public.pos_order_items poi
         JOIN public.pos_orders po ON po.id = poi.order_id
         WHERE po.store_id = $1
           AND po.payment_status = 'PAID'
           AND (po.created_at AT TIME ZONE 'UTC')::date = $2::date`,
        [storeId, stocktakeDate],
      ),
      dbQuery<MenuModifierDto>(`SELECT * FROM public.menu_modifiers`),
      dbQuery<{ inventory_item_id: string; actual_counted_qty: number }>(
        `SELECT DISTINCT ON (inventory_item_id) inventory_item_id, actual_counted_qty
         FROM public.store_daily_stocktakes
         WHERE store_id = $1 AND stocktake_date < $2::date
         ORDER BY inventory_item_id, stocktake_date DESC`,
        [storeId, stocktakeDate],
      ),
      dbQuery<{ inventory_item_id: string; actual_counted_qty: number }>(
        `SELECT inventory_item_id, actual_counted_qty
         FROM public.store_daily_stocktakes
         WHERE store_id = $1 AND stocktake_date = $2::date`,
        [storeId, stocktakeDate],
      ),
      loadActiveBomRecipes(),
    ]);

  const modifiersById: Record<string, MenuModifierDto> = {};
  for (const m of modsRes.rows) modifiersById[m.id] = m;

  const invById: Record<string, BomInventoryCostLookup> = {};
  for (const inv of itemsRes.rows) invById[inv.id] = inv;

  const bomCalc =
    orderItemsRes.rows.length > 0
      ? calculateOrderBomRequirementsAndCogs({
          lines: orderItemsRes.rows.map((it) => ({
            product_id: it.product_id,
            variant_id: it.variant_id,
            modifier_ids: Array.isArray(it.modifiers_json)
              ? it.modifiers_json.map((m) => m.id)
              : [],
            quantity: it.quantity,
          })),
          recipes: bomRecipes,
          modifiersById,
          inventoryItemsById: invById,
        })
      : { requirements: [], total_cogs_vnd: 0 };

  const bomMap = new Map(
    bomCalc.requirements.map((r) => [r.inventory_item_id, r.total_required_qty]),
  );
  const lotMap = new Map(lotsRes.rows.map((l) => [l.item_id, l.total_qty]));
  const recvMap = new Map(receivedRes.rows.map((r) => [r.item_id, r.received_qty]));
  const prevMap = new Map(prevStockRes.rows.map((p) => [p.inventory_item_id, p.actual_counted_qty]));
  const todayMap = new Map(todayStockRes.rows.map((t) => [t.inventory_item_id, t.actual_counted_qty]));

  return itemsRes.rows.map((item): StocktakePreviewRowDTO => {
    const currentLotStock = roundQty2(lotMap.get(item.id) ?? 0);
    const receivedIn = roundQty2(recvMap.get(item.id) ?? 0);
    const bomConsumed = roundQty2(bomMap.get(item.id) ?? 0);
    const prevActual = prevMap.get(item.id);

    const openingQty =
      prevActual !== undefined
        ? roundQty2(prevActual)
        : roundQty2(Math.max(0, currentLotStock + bomConsumed - receivedIn));

    const theoreticalClosing = roundQty2(
      Math.max(0, openingQty + receivedIn - bomConsumed),
    );

    return {
      inventory_item_id: item.id,
      sku: item.sku,
      item_name: item.name,
      base_unit: item.base_unit,
      opening_qty: openingQty,
      received_in_qty: receivedIn,
      bom_consumed_qty: bomConsumed,
      theoretical_closing_qty: theoreticalClosing,
      current_lot_stock_qty: currentLotStock,
      last_counted_qty: todayMap.get(item.id) ?? null,
    };
  });
}

export async function submitStoreDailyStocktake(
  actor: AuthActor,
  input: SubmitStoreDailyStocktakeInput,
): Promise<StoreDailyStocktakeBatchResultDTO> {
  return withTransaction(async (client) => {
    const savedItems: StoreDailyStocktakeItemResultDTO[] = [];
    let abnormalCount = 0;

    for (const entry of input.items) {
      const invItem = await dbQueryOne<{
        id: string;
        sku: string;
        name: string;
        base_unit: BaseUnit;
      }>(
        `SELECT id, sku, name, base_unit FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
        [entry.inventory_item_id],
        client,
      );
      if (!invItem) {
        throw new WarehouseDomainError(404, 'INVENTORY_ITEM_NOT_FOUND', `Không tìm thấy vật tư ${entry.inventory_item_id}`);
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

      const row = await dbQueryOne<{
        id: string;
        updated_at: Date | string;
        notes: string | null;
      }>(
        `INSERT INTO public.store_daily_stocktakes (
           store_id, inventory_item_id, stocktake_date, opening_qty, received_in_qty,
           bom_consumed_qty, theoretical_closing_qty, actual_counted_qty, variance_qty,
           counted_by, notes
         )
         VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (store_id, inventory_item_id, stocktake_date) DO UPDATE SET
           opening_qty = EXCLUDED.opening_qty,
           received_in_qty = EXCLUDED.received_in_qty,
           bom_consumed_qty = EXCLUDED.bom_consumed_qty,
           theoretical_closing_qty = EXCLUDED.theoretical_closing_qty,
           actual_counted_qty = EXCLUDED.actual_counted_qty,
           variance_qty = EXCLUDED.variance_qty,
           counted_by = EXCLUDED.counted_by,
           notes = EXCLUDED.notes
         RETURNING id, updated_at, notes`,
        [
          input.store_id,
          invItem.id,
          input.stocktake_date,
          variance.opening_qty,
          variance.received_in_qty,
          variance.bom_consumed_qty,
          variance.theoretical_closing_qty,
          variance.actual_counted_qty,
          variance.variance_qty,
          actor.id,
          entry.notes?.trim() || input.notes?.trim() || null,
        ],
        client,
      );

      savedItems.push({
        id: row!.id,
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
        notes: row!.notes,
        updated_at: toIsoString(row!.updated_at),
      });
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.store_id,
        action: 'STORE_DAILY_STOCKTAKE_SUBMITTED',
        targetTable: 'store_daily_stocktakes',
        targetId: null,
        reason: `Chốt kiểm kho cuối ngày ${input.stocktake_date} (${savedItems.length} mặt hàng, ${abnormalCount} cảnh báo hao hụt >3%)`,
        payload: {
          stocktake_date: input.stocktake_date,
          total_items_counted: savedItems.length,
          abnormal_shrinkage_count: abnormalCount,
        },
      },
      client,
    );

    return {
      store_id: input.store_id,
      stocktake_date: input.stocktake_date,
      total_items_counted: savedItems.length,
      abnormal_shrinkage_count: abnormalCount,
      items: savedItems,
    };
  });
}

export async function listStoreDailyStocktakes(
  storeId: string,
  stocktakeDate?: string,
): Promise<StoreDailyStocktakeItemResultDTO[]> {
  const res = await dbQuery<{
    id: string;
    store_id: string;
    inventory_item_id: string;
    sku: string;
    item_name: string;
    base_unit: BaseUnit;
    stocktake_date: string;
    opening_qty: number;
    received_in_qty: number;
    bom_consumed_qty: number;
    theoretical_closing_qty: number;
    actual_counted_qty: number;
    variance_qty: number;
    counted_by: string;
    notes: string | null;
    updated_at: Date | string;
  }>(
    `SELECT st.id, st.store_id, st.inventory_item_id, ii.sku, ii.name AS item_name,
            ii.base_unit, st.stocktake_date, st.opening_qty, st.received_in_qty,
            st.bom_consumed_qty, st.theoretical_closing_qty, st.actual_counted_qty,
            st.variance_qty, st.counted_by, st.notes, st.updated_at
     FROM public.store_daily_stocktakes st
     JOIN public.inventory_items ii ON ii.id = st.inventory_item_id
     WHERE st.store_id = $1
       ${stocktakeDate ? 'AND st.stocktake_date = $2::date' : ''}
     ORDER BY st.stocktake_date DESC, st.updated_at DESC
     LIMIT 100`,
    stocktakeDate ? [storeId, stocktakeDate] : [storeId],
  );

  return res.rows.map((r) => {
    const calc = calculateDailyStocktakeVariance({
      openingQty: r.opening_qty,
      receivedInQty: r.received_in_qty,
      bomConsumedQty: r.bom_consumed_qty,
      actualCountedQty: r.actual_counted_qty,
    });
    return {
      id: r.id,
      store_id: r.store_id,
      inventory_item_id: r.inventory_item_id,
      sku: r.sku,
      item_name: r.item_name,
      base_unit: r.base_unit,
      stocktake_date: r.stocktake_date,
      opening_qty: r.opening_qty,
      received_in_qty: r.received_in_qty,
      bom_consumed_qty: r.bom_consumed_qty,
      theoretical_closing_qty: r.theoretical_closing_qty,
      actual_counted_qty: r.actual_counted_qty,
      variance_qty: r.variance_qty,
      variance_pct: calc.variance_pct,
      is_abnormal_shrinkage: calc.is_abnormal_shrinkage,
      counted_by: r.counted_by,
      notes: r.notes,
      updated_at: toIsoString(r.updated_at),
    };
  });
}

// ============================================================================
// ROUTES
// ============================================================================
shiftStocktakeRouter.get(
  '/stores/:storeId/shifts',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const rows = await dbQuery<ShiftRow>(
        `SELECT * FROM public.pos_shifts
         WHERE store_id = $1
         ORDER BY opened_at DESC
         LIMIT 30`,
        [req.params.storeId],
      );
      res.status(200).json({
        data: rows.rows.map((r) => ({
          ...r,
          opened_at: toIsoString(r.opened_at),
          closed_at: toNullableIsoString(r.closed_at),
        })),
      });
    } catch (err) {
      handleShiftStocktakeError(res, err);
    }
  },
);

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
          message: 'Dữ liệu mở ca làm việc chưa hợp lệ',
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
          message: 'Dữ liệu chốt ca đếm tiền mù chưa hợp lệ',
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

shiftStocktakeRouter.get(
  '/stores/:storeId/stocktakes/preview',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const dateStr =
        typeof req.query.stocktake_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(req.query.stocktake_date)
          ? req.query.stocktake_date
          : new Date().toISOString().slice(0, 10);
      const preview = await previewStoreDailyStocktake(req.params.storeId, dateStr);
      res.status(200).json({ data: preview, meta: { stocktake_date: dateStr } });
    } catch (err) {
      handleShiftStocktakeError(res, err);
    }
  },
);

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
          message: 'Dữ liệu kiểm kho cuối ngày chưa hợp lệ',
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
