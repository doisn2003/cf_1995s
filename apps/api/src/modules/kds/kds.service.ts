import {
  allocateStoreBomFifoDeduction,
  calculateOrderBomRequirementsAndCogs,
  classifyKdsWaitSla,
  type AdvanceKdsTicketStatusInput,
  type BaristaAlertSeverity,
  type BaristaLowStockAlertDTO,
  type BaseUnit,
  type BomInventoryCostLookup,
  type CompleteKdsBomDeductionInput,
  type KdsOrderCompletionResultDTO,
  type KdsQueueQueryInput,
  type KdsStatus,
  type KdsTicketBoardItemDTO,
  type KdsTicketBoardLineDTO,
  type MenuModifierDto,
  type PaymentStatus,
  type ReportBaristaLowStockAlertInput,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  toNullableIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { loadActiveBomRecipes } from '../catalog/catalog.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

/**
 * 1. Returns KDS Queue Board for a store sorted oldest-first (FIFO preparation).
 *    STRICT BUSINESS RULE (SRS 2.2.1): Only PAID, non-voided orders enter KDS!
 *    Unpaid VIETQR orders (PENDING) are never shown to Barista until Webhook confirms PAID.
 */
export async function getStoreKdsBoard(
  storeId: string,
  query: KdsQueueQueryInput = { include_completed: false, limit: 50 },
  referenceNowIso?: string,
): Promise<KdsTicketBoardItemDTO[]> {
  const nowMs = referenceNowIso ? Date.parse(referenceNowIso) : Date.now();
  const effectiveNowMs = Number.isNaN(nowMs) ? Date.now() : nowMs;

  const ordersRes = await dbQuery<{
    id: string;
    order_code: string;
    store_id: string;
    shift_id: string;
    kds_status: KdsStatus;
    payment_status: PaymentStatus;
    bom_deducted_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }>(
    `SELECT id, order_code, store_id, shift_id, kds_status, payment_status,
            bom_deducted_at, created_at, updated_at
     FROM public.pos_orders
     WHERE store_id = $1
       AND payment_status = 'PAID'
       ${query.include_completed ? '' : "AND kds_status <> 'COMPLETED'"}
     ORDER BY created_at ASC
     LIMIT $2`,
    [storeId, Math.min(100, Math.max(1, query.limit ?? 50))],
  );

  const ids = ordersRes.rows.map((o) => o.id);
  const linesRes =
    ids.length > 0
      ? await dbQuery<{
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          variant_id: string;
          size_code: 'S' | 'M' | 'L';
          quantity: number;
          modifiers_json: Array<{ id: string; name: string }>;
          notes: string | null;
        }>(
          `SELECT poi.id, poi.order_id, poi.product_id, mp.name AS product_name,
                  poi.variant_id, mv.size_code, poi.quantity, poi.modifiers_json, poi.notes
           FROM public.pos_order_items poi
           JOIN public.menu_products mp ON mp.id = poi.product_id
           JOIN public.menu_variants mv ON mv.id = poi.variant_id
           WHERE poi.order_id = ANY($1::uuid[])
           ORDER BY poi.created_at ASC`,
          [ids],
        )
      : { rows: [] };

  return ordersRes.rows.map((order): KdsTicketBoardItemDTO => {
    const createdAtIso = toIsoString(order.created_at);
    const sla = classifyKdsWaitSla(createdAtIso, effectiveNowMs);
    const orderLines: KdsTicketBoardLineDTO[] = linesRes.rows
      .filter((it) => it.order_id === order.id)
      .map((it) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name,
        variant_id: it.variant_id,
        size_code: it.size_code,
        quantity: it.quantity,
        modifiers_json: Array.isArray(it.modifiers_json)
          ? it.modifiers_json.map((m) => ({ id: m.id, name: m.name }))
          : [],
        notes: it.notes,
      }));

    return {
      id: order.id,
      order_code: order.order_code,
      store_id: order.store_id,
      shift_id: order.shift_id,
      kds_status: order.kds_status,
      payment_status: order.payment_status,
      bom_deducted_at: toNullableIsoString(order.bom_deducted_at),
      created_at: createdAtIso,
      updated_at: toIsoString(order.updated_at),
      wait_minutes: sla.wait_minutes,
      sla_level: sla.sla_level,
      items: orderLines,
    };
  });
}

/**
 * 2. Complete a KDS order and execute Atomic 2-Tier BOM Multi-Lot FIFO Deduction in PostgreSQL.
 */
export async function completeKdsOrderWithBomDeduction(
  actor: AuthActor,
  input: CompleteKdsBomDeductionInput,
): Promise<KdsOrderCompletionResultDTO> {
  const bomRecipes = await loadActiveBomRecipes();

  return withTransaction(async (client) => {
    const order = await dbQueryOne<{
      id: string;
      order_code: string;
      store_id: string;
      payment_status: PaymentStatus;
      kds_status: KdsStatus;
      bom_deducted_at: Date | string | null;
    }>(
      `SELECT id, order_code, store_id, payment_status, kds_status, bom_deducted_at
       FROM public.pos_orders
       WHERE id = $1 FOR UPDATE`,
      [input.order_id],
      client,
    );

    if (!order) {
      throw new WarehouseDomainError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
    }
    if (order.store_id !== input.store_id) {
      throw new WarehouseDomainError(403, 'FORBIDDEN_CROSS_TENANT_ACCESS', 'Đơn hàng không thuộc chi nhánh này');
    }
    if (order.payment_status === 'VOIDED') {
      throw new WarehouseDomainError(409, 'ORDER_ALREADY_VOIDED', 'Không thể hoàn tất đơn đã hủy');
    }
    if (order.payment_status !== 'PAID') {
      throw new WarehouseDomainError(
        409,
        'ORDER_NOT_PAID',
        'Đơn thanh toán VietQR chưa nhận tiền xác nhận từ ngân hàng',
      );
    }

    if (order.bom_deducted_at !== null) {
      return {
        order_id: order.id,
        order_code: order.order_code,
        store_id: order.store_id,
        kds_status: order.kds_status,
        bom_deducted_at: toIsoString(order.bom_deducted_at),
        already_deducted: true,
        has_shortage: false,
        deductions: [],
      };
    }

    const orderItemsRes = await dbQuery<{
      product_id: string;
      variant_id: string;
      quantity: number;
      modifiers_json: Array<{ id: string }>;
    }>(
      `SELECT product_id, variant_id, quantity, modifiers_json
       FROM public.pos_order_items WHERE order_id = $1`,
      [order.id],
      client,
    );
    const modsRes = await dbQuery<MenuModifierDto>(`SELECT * FROM public.menu_modifiers`, [], client);
    const invRes = await dbQuery<BomInventoryCostLookup & { base_unit: BaseUnit }>(
      `SELECT id, sku, name, base_unit, internal_transfer_price_vnd
       FROM public.inventory_items WHERE is_active = TRUE`,
      [],
      client,
    );
    const lotsRes = await dbQuery<{
      id: string;
      store_id: string;
      item_id: string;
      lot_code: string;
      roast_date: string | null;
      received_at: Date | string;
      remaining_qty: number;
      status: 'AVAILABLE' | 'DEPLETED' | 'EXPIRED';
    }>(
      `SELECT id, store_id, item_id, lot_code, roast_date, received_at, remaining_qty, status
       FROM public.warehouse_lots
       WHERE store_id = $1 AND status = 'AVAILABLE' AND remaining_qty > 0
       ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
                received_at ASC, lot_code ASC, id ASC
       FOR UPDATE`,
      [input.store_id],
      client,
    );

    const modifiersById: Record<string, MenuModifierDto> = {};
    for (const m of modsRes.rows) modifiersById[m.id] = m;

    const inventoryById: Record<string, BomInventoryCostLookup> = {};
    for (const inv of invRes.rows) inventoryById[inv.id] = inv;

    const bomCalc = calculateOrderBomRequirementsAndCogs({
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
      inventoryItemsById: inventoryById,
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
        availableLots: lotsRes.rows.map((l) => ({
          ...l,
          received_at: toIsoString(l.received_at),
        })),
        allowPartialOnShortage: input.allow_partial_on_shortage,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kho quán không đủ nguyên liệu theo BOM';
      throw new WarehouseDomainError(409, 'INSUFFICIENT_STORE_BOM_STOCK', msg);
    }

    const updatedById = new Map(allocationResult.updated_lots.map((l) => [l.id, l]));
    for (const orig of lotsRes.rows) {
      const next = updatedById.get(orig.id);
      if (next && (next.remaining_qty !== orig.remaining_qty || next.status !== orig.status)) {
        await client.query(
          `UPDATE public.warehouse_lots SET remaining_qty = $2, status = $3 WHERE id = $1`,
          [orig.id, next.remaining_qty, next.status],
        );
      }
    }

    const completedRow = await dbQueryOne<{ bom_deducted_at: Date | string }>(
      `UPDATE public.pos_orders
       SET kds_status = 'COMPLETED', bom_deducted_at = NOW()
       WHERE id = $1
       RETURNING bom_deducted_at`,
      [order.id],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: order.store_id,
        action: 'KDS_ORDER_BOM_DEDUCTED',
        targetTable: 'pos_orders',
        targetId: order.id,
        reason: `Hoàn tất pha chế & trừ kho BOM FIFO cho đơn ${order.order_code}`,
        payload: {
          order_code: order.order_code,
          has_shortage: allocationResult.has_shortage,
          deductions_count: allocationResult.deductions.length,
        },
      },
      client,
    );

    return {
      order_id: order.id,
      order_code: order.order_code,
      store_id: order.store_id,
      kds_status: 'COMPLETED',
      bom_deducted_at: toIsoString(completedRow!.bom_deducted_at),
      already_deducted: false,
      has_shortage: allocationResult.has_shortage,
      deductions: allocationResult.deductions,
    };
  });
}

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

  return withTransaction(async (client) => {
    const order = await dbQueryOne<{
      id: string;
      order_code: string;
      store_id: string;
      payment_status: PaymentStatus;
      kds_status: KdsStatus;
    }>(
      `SELECT id, order_code, store_id, payment_status, kds_status
       FROM public.pos_orders WHERE id = $1 FOR UPDATE`,
      [input.order_id],
      client,
    );
    if (!order || order.store_id !== input.store_id) {
      throw new WarehouseDomainError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy thẻ món KDS');
    }
    if (order.payment_status !== 'PAID') {
      throw new WarehouseDomainError(409, 'ORDER_NOT_PAID', 'Đơn hàng chưa được thanh toán');
    }
    if (order.kds_status === 'COMPLETED') {
      throw new WarehouseDomainError(409, 'KDS_INVALID_TRANSITION', 'Đơn đã hoàn tất không thể chuyển ngược trạng thái');
    }

    await client.query(
      `UPDATE public.pos_orders SET kds_status = $2 WHERE id = $1`,
      [order.id, input.target_status],
    );

    return {
      order_id: order.id,
      order_code: order.order_code,
      store_id: order.store_id,
      kds_status: input.target_status,
      bom_deducted_at: '',
      already_deducted: false,
      has_shortage: false,
      deductions: [],
    };
  });
}

export async function reportBaristaLowStockAlert(
  actor: AuthActor,
  input: ReportBaristaLowStockAlertInput,
): Promise<BaristaLowStockAlertDTO> {
  return withTransaction(async (client) => {
    const item = await dbQueryOne<{ id: string; sku: string; name: string }>(
      `SELECT id, sku, name FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
      [input.inventory_item_id],
      client,
    );
    if (!item) {
      throw new WarehouseDomainError(404, 'INVENTORY_ITEM_NOT_FOUND', 'Không tìm thấy nguyên liệu');
    }

    const inserted = await dbQueryOne<{
      id: string;
      store_id: string;
      inventory_item_id: string;
      reported_by: string;
      severity: BaristaAlertSeverity;
      note: string;
      resolved: boolean;
      created_at: Date | string;
    }>(
      `INSERT INTO public.barista_low_stock_alerts (
         store_id, inventory_item_id, reported_by, severity, note, resolved
       )
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
      [input.store_id, item.id, actor.id, input.severity, input.note.trim()],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.store_id,
        action: 'BARISTA_LOW_STOCK_ALERT_REPORTED',
        targetTable: 'barista_low_stock_alerts',
        targetId: inserted!.id,
        reason: `Quầy Bar báo ${input.severity} cho ${item.sku}: ${input.note.trim()}`,
      },
      client,
    );

    return {
      id: inserted!.id,
      store_id: inserted!.store_id,
      inventory_item_id: item.id,
      sku: item.sku,
      item_name: item.name,
      reported_by: actor.id,
      reported_by_name: actor.fullName,
      severity: inserted!.severity,
      note: inserted!.note,
      resolved: inserted!.resolved,
      created_at: toIsoString(inserted!.created_at),
    };
  });
}

export async function listLowStockAlerts(
  storeId: string,
): Promise<BaristaLowStockAlertDTO[]> {
  const res = await dbQuery<{
    id: string;
    store_id: string;
    inventory_item_id: string;
    sku: string;
    item_name: string;
    reported_by: string;
    reported_by_name: string;
    severity: BaristaAlertSeverity;
    note: string;
    resolved: boolean;
    created_at: Date | string;
  }>(
    `SELECT a.id, a.store_id, a.inventory_item_id, ii.sku, ii.name AS item_name,
            a.reported_by, up.full_name AS reported_by_name,
            a.severity, a.note, a.resolved, a.created_at
     FROM public.barista_low_stock_alerts a
     JOIN public.inventory_items ii ON ii.id = a.inventory_item_id
     JOIN public.user_profiles up ON up.id = a.reported_by
     WHERE a.store_id = $1
     ORDER BY a.resolved ASC, a.created_at DESC
     LIMIT 50`,
    [storeId],
  );

  return res.rows.map((r) => ({
    ...r,
    created_at: toIsoString(r.created_at),
  }));
}

export async function resolveLowStockAlert(
  actor: AuthActor,
  storeId: string,
  alertId: string,
): Promise<{ id: string; resolved: boolean }> {
  return withTransaction(async (client) => {
    const res = await dbQueryOne<{ id: string }>(
      `UPDATE public.barista_low_stock_alerts
       SET resolved = TRUE, resolved_by = $3, resolved_at = NOW()
       WHERE id = $1 AND store_id = $2
       RETURNING id`,
      [alertId, storeId, actor.id],
      client,
    );
    if (!res) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy cảnh báo nguyên liệu');
    }
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId,
        action: 'BARISTA_LOW_STOCK_ALERT_RESOLVED',
        targetTable: 'barista_low_stock_alerts',
        targetId: alertId,
        reason: 'Quản lý quán đã xác nhận xử lý cảnh báo nguyên liệu',
      },
      client,
    );
    return { id: alertId, resolved: true };
  });
}
