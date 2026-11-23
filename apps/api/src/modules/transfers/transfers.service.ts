import {
  calculateInternalTransferTotalVnd,
  convertToKgForTierPricing,
  type BaseUnit,
  type CancelInternalTransferInput,
  type CreateInternalTransferRequest,
  type DispatchInternalTransferFifoDTO,
  type InternalTransferDispatchResultDTO,
  type InternalTransferDto,
  type InternalTransferItemDto,
  type InternalTransferReconcileResultDTO,
  type LotStatus,
  type ReconcileInternalTransferInput,
  type StoreSafeWarehouseLotDto,
  type TransferFilterQueryDTO,
  type TransferStatus,
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
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface TransferRow {
  id: string;
  transfer_code: string;
  from_warehouse_id: string;
  to_store_id: string;
  to_store_code?: string;
  to_store_name?: string;
  status: TransferStatus;
  total_internal_value_vnd: number;
  requested_by: string;
  dispatched_by: string | null;
  received_by: string | null;
  requested_at: Date | string;
  dispatched_at: Date | string | null;
  received_at: Date | string | null;
  notes: string | null;
}

interface TransferItemRow {
  id: string;
  transfer_id: string;
  item_id: string;
  item_sku?: string;
  item_name?: string;
  base_unit?: BaseUnit;
  source_lot_id: string | null;
  destination_lot_id: string | null;
  requested_qty: number;
  dispatched_qty: number;
  received_qty: number;
  internal_unit_price_vnd: number;
  line_total_vnd: number;
}

function mapTransfer(
  row: TransferRow,
  items: InternalTransferItemDto[],
): InternalTransferDto & { to_store_code?: string; to_store_name?: string } {
  return {
    id: row.id,
    transfer_code: row.transfer_code,
    from_warehouse_id: row.from_warehouse_id,
    to_store_id: row.to_store_id,
    to_store_code: row.to_store_code,
    to_store_name: row.to_store_name,
    status: row.status,
    total_internal_value_vnd: row.total_internal_value_vnd,
    requested_by: row.requested_by,
    dispatched_by: row.dispatched_by,
    received_by: row.received_by,
    requested_at: toIsoString(row.requested_at),
    dispatched_at: toNullableIsoString(row.dispatched_at),
    received_at: toNullableIsoString(row.received_at),
    notes: row.notes,
    items,
  };
}

export async function listTransfers(
  actor: AuthActor,
  query: TransferFilterQueryDTO = {},
): Promise<Array<InternalTransferDto & { to_store_code?: string; to_store_name?: string }>> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (actor.role === 'STORE_MANAGER') {
    params.push(actor.assignedStoreId);
    conditions.push(`t.to_store_id = $${params.length}`);
  } else if (query.store_id) {
    params.push(query.store_id);
    conditions.push(`t.to_store_id = $${params.length}`);
  }

  if (query.status) {
    params.push(query.status);
    conditions.push(`t.status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const transfersRes = await dbQuery<TransferRow>(
    `SELECT t.*, s.code AS to_store_code, s.name AS to_store_name
     FROM public.internal_transfers t
     JOIN public.stores s ON s.id = t.to_store_id
     ${where}
     ORDER BY t.requested_at DESC
     LIMIT 100`,
    params,
  );

  const ids = transfersRes.rows.map((r) => r.id);
  const itemsRes =
    ids.length > 0
      ? await dbQuery<TransferItemRow>(
          `SELECT ti.*, ii.sku AS item_sku, ii.name AS item_name, ii.base_unit
           FROM public.internal_transfer_items ti
           JOIN public.inventory_items ii ON ii.id = ti.item_id
           WHERE ti.transfer_id = ANY($1::uuid[])
           ORDER BY ti.id ASC`,
          [ids],
        )
      : { rows: [] };

  return transfersRes.rows.map((t) =>
    mapTransfer(
      t,
      itemsRes.rows.filter((it) => it.transfer_id === t.id),
    ),
  );
}

export async function requestTransfer(
  actor: AuthActor,
  input: CreateInternalTransferRequest,
): Promise<InternalTransferDto> {
  if (actor.role === 'STORE_MANAGER' && actor.assignedStoreId !== input.to_store_id) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      'Quản lý quán chỉ được tạo phiếu xin cấp hàng cho đúng chi nhánh của mình',
    );
  }

  return withTransaction(async (client) => {
    const wh = await dbQueryOne<{ id: string; type: string }>(
      `SELECT id, type FROM public.stores WHERE id = $1 AND is_active = TRUE`,
      [input.from_warehouse_id],
      client,
    );
    const dest = await dbQueryOne<{ id: string; type: string; code: string }>(
      `SELECT id, type, code FROM public.stores WHERE id = $1 AND is_active = TRUE`,
      [input.to_store_id],
      client,
    );

    if (!wh || wh.type !== 'CENTRAL_WAREHOUSE') {
      throw new WarehouseDomainError(400, 'INVALID_WAREHOUSE', 'Kho nguồn không phải Kho Tổng');
    }
    if (!dest || dest.type === 'CENTRAL_WAREHOUSE') {
      throw new WarehouseDomainError(400, 'INVALID_DESTINATION_STORE', 'Chi nhánh nhận phải là quán bán lẻ/nhượng quyền');
    }

    const lineSpecs: Array<{
      item_id: string;
      requested_qty: number;
      base_unit: BaseUnit;
      internal_unit_price_vnd: number;
      line_total_vnd: number;
    }> = [];

    for (const line of input.items) {
      const item = await dbQueryOne<{
        id: string;
        sku: string;
        base_unit: BaseUnit;
        internal_transfer_price_vnd: number;
      }>(
        `SELECT id, sku, base_unit, internal_transfer_price_vnd
         FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
        [line.item_id],
        client,
      );
      if (!item) {
        throw new WarehouseDomainError(404, 'NOT_FOUND', `Không tìm thấy vật tư ${line.item_id}`);
      }
      const billingQty = convertToKgForTierPricing(line.requested_qty, item.base_unit);
      lineSpecs.push({
        item_id: item.id,
        requested_qty: line.requested_qty,
        base_unit: item.base_unit,
        internal_unit_price_vnd: item.internal_transfer_price_vnd,
        line_total_vnd: Math.round(billingQty * item.internal_transfer_price_vnd),
      });
    }

    const totalInternalValue = calculateInternalTransferTotalVnd(
      lineSpecs.map((l) => ({
        qty_base_unit: l.requested_qty,
        base_unit: l.base_unit,
        internal_unit_price_vnd: l.internal_unit_price_vnd,
      })),
    );

    const transferCode = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const transfer = await dbQueryOne<TransferRow>(
      `INSERT INTO public.internal_transfers (
         transfer_code, from_warehouse_id, to_store_id, status,
         total_internal_value_vnd, requested_by, notes
       )
       VALUES ($1, $2, $3, 'REQUESTED', $4, $5, $6)
       RETURNING *`,
      [
        transferCode,
        input.from_warehouse_id,
        input.to_store_id,
        totalInternalValue,
        actor.id,
        input.notes ?? null,
      ],
      client,
    );

    const createdItems: InternalTransferItemDto[] = [];
    for (const spec of lineSpecs) {
      const row = await dbQueryOne<TransferItemRow>(
        `INSERT INTO public.internal_transfer_items (
           transfer_id, item_id, requested_qty, dispatched_qty, received_qty,
           internal_unit_price_vnd, line_total_vnd
         )
         VALUES ($1, $2, $3, 0, 0, $4, $5)
         RETURNING *`,
        [
          transfer!.id,
          spec.item_id,
          spec.requested_qty,
          spec.internal_unit_price_vnd,
          spec.line_total_vnd,
        ],
        client,
      );
      createdItems.push(row!);
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.to_store_id,
        action: 'INTERNAL_TRANSFER_REQUESTED',
        targetTable: 'internal_transfers',
        targetId: transfer!.id,
        reason: `Xin cấp hàng nội bộ ${transferCode} cho ${dest.code}`,
        payload: { transfer_code: transferCode, total_internal_value_vnd: totalInternalValue },
      },
      client,
    );

    return mapTransfer(transfer!, createdItems);
  });
}

export async function dispatchTransferFifo(
  actor: AuthActor,
  input: DispatchInternalTransferFifoDTO,
): Promise<InternalTransferDispatchResultDTO> {
  return withTransaction(async (client) => {
    const transfer = await dbQueryOne<TransferRow>(
      `SELECT * FROM public.internal_transfers WHERE id = $1 FOR UPDATE`,
      [input.transfer_id],
      client,
    );
    if (!transfer) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy phiếu chuyển kho nội bộ');
    }
    if (transfer.status !== 'REQUESTED') {
      throw new WarehouseDomainError(
        409,
        'INVALID_TRANSFER_STATE',
        `Chỉ được duyệt xuất phiếu ở trạng thái REQUESTED (hiện tại: ${transfer.status})`,
      );
    }

    const reqItemsRes = await dbQuery<TransferItemRow & { base_unit: BaseUnit; sku: string }>(
      `SELECT ti.*, ii.base_unit, ii.sku
       FROM public.internal_transfer_items ti
       JOIN public.inventory_items ii ON ii.id = ti.item_id
       WHERE ti.transfer_id = $1
       ORDER BY ti.id ASC`,
      [transfer.id],
      client,
    );

    // Replace requested lines with exact FIFO lot slices
    await client.query(`DELETE FROM public.internal_transfer_items WHERE transfer_id = $1`, [
      transfer.id,
    ]);

    const dispatchedItems: InternalTransferItemDto[] = [];
    let totalDispatchedValue = 0;

    for (const reqLine of reqItemsRes.rows) {
      const lotsRes = await dbQuery<{
        id: string;
        remaining_qty: number;
      }>(
        `SELECT id, remaining_qty
         FROM public.warehouse_lots
         WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0
         ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
                  received_at ASC, lot_code ASC, id ASC
         FOR UPDATE`,
        [transfer.from_warehouse_id, reqLine.item_id],
        client,
      );

      let rem = reqLine.requested_qty;
      for (const lot of lotsRes.rows) {
        if (rem <= 0) break;
        const take = roundQty2(Math.min(lot.remaining_qty, rem));
        const after = roundQty2(lot.remaining_qty - take);
        const statusAfter: LotStatus = after === 0 ? 'DEPLETED' : 'AVAILABLE';

        await client.query(
          `UPDATE public.warehouse_lots SET remaining_qty = $2, status = $3 WHERE id = $1`,
          [lot.id, after, statusAfter],
        );

        const billingQty = convertToKgForTierPricing(take, reqLine.base_unit);
        const lineTotal = Math.round(billingQty * reqLine.internal_unit_price_vnd);
        totalDispatchedValue += lineTotal;

        const inserted = await dbQueryOne<TransferItemRow>(
          `INSERT INTO public.internal_transfer_items (
             transfer_id, item_id, source_lot_id, requested_qty,
             dispatched_qty, received_qty, internal_unit_price_vnd, line_total_vnd
           )
           VALUES ($1, $2, $3, $4, $4, 0, $5, $6)
           RETURNING *`,
          [
            transfer.id,
            reqLine.item_id,
            lot.id,
            take,
            reqLine.internal_unit_price_vnd,
            lineTotal,
          ],
          client,
        );
        dispatchedItems.push(inserted!);
        rem = roundQty2(rem - take);
      }

      if (rem > 0) {
        throw new WarehouseDomainError(
          409,
          'INSUFFICIENT_FIFO_STOCK',
          `Kho Tổng không đủ tồn FIFO cho ${reqLine.sku} (còn thiếu ${rem} ${reqLine.base_unit})`,
        );
      }
    }

    const updated = await dbQueryOne<TransferRow>(
      `UPDATE public.internal_transfers
       SET status = 'IN_TRANSIT',
           dispatched_by = $2,
           dispatched_at = NOW(),
           total_internal_value_vnd = $3,
           notes = COALESCE($4, notes)
       WHERE id = $1
       RETURNING *`,
      [transfer.id, actor.id, totalDispatchedValue, input.notes ?? null],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: transfer.from_warehouse_id,
        action: 'INTERNAL_TRANSFER_DISPATCHED',
        targetTable: 'internal_transfers',
        targetId: transfer.id,
        reason: `Xuất kho nội bộ Pha 1 (FIFO) phiếu ${transfer.transfer_code}`,
        payload: {
          transfer_code: transfer.transfer_code,
          to_store_id: transfer.to_store_id,
          fifo_slices: dispatchedItems.length,
          total_internal_value_vnd: totalDispatchedValue,
        },
      },
      client,
    );

    return {
      transfer: mapTransfer(updated!, dispatchedItems),
      items: dispatchedItems,
    };
  });
}

export async function reconcileTransfer(
  actor: AuthActor,
  input: ReconcileInternalTransferInput,
): Promise<InternalTransferReconcileResultDTO> {
  return withTransaction(async (client) => {
    const transfer = await dbQueryOne<TransferRow>(
      `SELECT * FROM public.internal_transfers WHERE id = $1 FOR UPDATE`,
      [input.transfer_id],
      client,
    );
    if (!transfer) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy phiếu chuyển kho');
    }
    if (actor.role === 'STORE_MANAGER' && actor.assignedStoreId !== transfer.to_store_id) {
      throw new WarehouseDomainError(
        403,
        'FORBIDDEN_CROSS_TENANT_ACCESS',
        'Bạn chỉ được xác nhận nhận hàng cho phiếu chuyển đến đúng chi nhánh của mình',
      );
    }
    if (transfer.status !== 'IN_TRANSIT') {
      throw new WarehouseDomainError(
        409,
        'INVALID_TRANSFER_STATE',
        `Chỉ được đối soát nhận hàng phiếu ở trạng thái IN_TRANSIT (hiện tại: ${transfer.status})`,
      );
    }

    const store = await dbQueryOne<{ code: string }>(
      `SELECT code FROM public.stores WHERE id = $1`,
      [transfer.to_store_id],
      client,
    );

    const itemsRes = await dbQuery<TransferItemRow & { base_unit: BaseUnit; sku: string }>(
      `SELECT ti.*, ii.base_unit, ii.sku
       FROM public.internal_transfer_items ti
       JOIN public.inventory_items ii ON ii.id = ti.item_id
       WHERE ti.transfer_id = $1
       ORDER BY ti.id ASC
       FOR UPDATE OF ti`,
      [transfer.id],
      client,
    );

    const createdStoreLots: StoreSafeWarehouseLotDto[] = [];
    const updatedItems: InternalTransferItemDto[] = [];
    let totalReceivedValue = 0;

    for (let idx = 0; idx < itemsRes.rows.length; idx += 1) {
      const ti = itemsRes.rows[idx]!;
      const override = input.items?.find((x) => x.transfer_item_id === ti.id);
      const receivedQty = roundQty2(override?.received_qty ?? ti.dispatched_qty);

      if (receivedQty < 0 || receivedQty > ti.dispatched_qty) {
        throw new WarehouseDomainError(
          400,
          'INVALID_RECEIVED_QTY',
          `Số lượng thực nhận (${receivedQty}) không hợp lệ (đã xuất: ${ti.dispatched_qty})`,
        );
      }

      const sourceLot = ti.source_lot_id
        ? await dbQueryOne<{
            roast_date: string | null;
            expiry_date: string | null;
            moisture_pct: number | null;
          }>(
            `SELECT roast_date, expiry_date, moisture_pct FROM public.warehouse_lots WHERE id = $1`,
            [ti.source_lot_id],
            client,
          )
        : null;

      let destLotId: string | null = null;
      if (receivedQty > 0) {
        const destLotCode = `LOT-${(store?.code ?? 'ST').replace(/-/g, '')}-${transfer.transfer_code.slice(-6)}-${idx + 1}`;
        const destLot = await dbQueryOne<{
          id: string;
          store_id: string;
          item_id: string;
          lot_code: string;
          supplier_name: string | null;
          moisture_pct: number | null;
          roast_date: string | null;
          received_at: Date | string;
          expiry_date: string | null;
          initial_qty: number;
          remaining_qty: number;
          status: LotStatus;
          created_at: Date | string;
          updated_at: Date | string;
        }>(
          `INSERT INTO public.warehouse_lots (
             store_id, item_id, lot_code, supplier_name, moisture_pct,
             roast_date, expiry_date, initial_qty, remaining_qty,
             unit_cost_vnd, shipping_cost_vnd, status
           )
           VALUES ($1, $2, $3, 'Kho Tổng CF19 (Chuyển Nội Bộ)', $4, $5, $6, $7, $7, $8, 0, 'AVAILABLE')
           RETURNING id, store_id, item_id, lot_code, supplier_name, moisture_pct,
                     roast_date, received_at, expiry_date, initial_qty, remaining_qty,
                     status, created_at, updated_at`,
          [
            transfer.to_store_id,
            ti.item_id,
            destLotCode,
            sourceLot?.moisture_pct ?? null,
            sourceLot?.roast_date ?? null,
            sourceLot?.expiry_date ?? null,
            receivedQty,
            ti.internal_unit_price_vnd,
          ],
          client,
        );
        destLotId = destLot!.id;
        createdStoreLots.push({
          ...destLot!,
          received_at: toIsoString(destLot!.received_at),
          created_at: toIsoString(destLot!.created_at),
          updated_at: toIsoString(destLot!.updated_at),
        });
      }

      const billingQty = convertToKgForTierPricing(receivedQty, ti.base_unit);
      const lineTotal = Math.round(billingQty * ti.internal_unit_price_vnd);
      totalReceivedValue += lineTotal;

      const updatedItem = await dbQueryOne<TransferItemRow>(
        `UPDATE public.internal_transfer_items
         SET received_qty = $2, destination_lot_id = $3, line_total_vnd = $4
         WHERE id = $1
         RETURNING *`,
        [ti.id, receivedQty, destLotId, lineTotal],
        client,
      );
      updatedItems.push(updatedItem!);
    }

    const updatedTransfer = await dbQueryOne<TransferRow>(
      `UPDATE public.internal_transfers
       SET status = 'RECONCILED',
           received_by = $2,
           received_at = NOW(),
           total_internal_value_vnd = $3,
           notes = COALESCE($4, notes)
       WHERE id = $1
       RETURNING *`,
      [transfer.id, actor.id, totalReceivedValue, input.notes ?? null],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: transfer.to_store_id,
        action: 'INTERNAL_TRANSFER_RECONCILED',
        targetTable: 'internal_transfers',
        targetId: transfer.id,
        reason: `Xác nhận nhận hàng Pha 2 phiếu ${transfer.transfer_code}`,
        payload: {
          transfer_code: transfer.transfer_code,
          created_store_lots: createdStoreLots.length,
          total_internal_value_vnd: totalReceivedValue,
        },
      },
      client,
    );

    return {
      transfer: mapTransfer(updatedTransfer!, updatedItems),
      items: updatedItems,
      created_store_lots: createdStoreLots,
    };
  });
}

export async function cancelTransfer(
  actor: AuthActor,
  transferId: string,
  input: CancelInternalTransferInput,
): Promise<InternalTransferDto> {
  return withTransaction(async (client) => {
    const transfer = await dbQueryOne<TransferRow>(
      `SELECT * FROM public.internal_transfers WHERE id = $1 FOR UPDATE`,
      [transferId],
      client,
    );
    if (!transfer) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy phiếu chuyển kho');
    }
    if (actor.role === 'STORE_MANAGER' && actor.assignedStoreId !== transfer.to_store_id) {
      throw new WarehouseDomainError(
        403,
        'FORBIDDEN_CROSS_TENANT_ACCESS',
        'Không có quyền hủy phiếu của chi nhánh khác',
      );
    }
    if (transfer.status !== 'REQUESTED') {
      throw new WarehouseDomainError(
        409,
        'INVALID_TRANSFER_STATE',
        `Chỉ được hủy phiếu khi đang ở trạng thái REQUESTED (hiện tại: ${transfer.status})`,
      );
    }

    const updated = await dbQueryOne<TransferRow>(
      `UPDATE public.internal_transfers
       SET status = 'CANCELLED',
           notes = CONCAT(COALESCE(notes, ''), ' [Hủy: ', $2::text, ']')
       WHERE id = $1
       RETURNING *`,
      [transferId, input.reason],
      client,
    );

    const itemsRes = await dbQuery<TransferItemRow>(
      `SELECT * FROM public.internal_transfer_items WHERE transfer_id = $1`,
      [transferId],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: transfer.to_store_id,
        action: 'INTERNAL_TRANSFER_CANCELLED',
        targetTable: 'internal_transfers',
        targetId: transfer.id,
        reason: input.reason,
        payload: { transfer_code: transfer.transfer_code },
      },
      client,
    );

    return mapTransfer(updated!, itemsRes.rows);
  });
}
