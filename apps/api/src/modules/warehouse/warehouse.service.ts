import {
  SEED_IDS,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  calculateRoastYieldLossPct,
  calculateRoastedOutputUnitCostVnd,
  calculateStockValueVnd,
  isAbnormalRoastYieldLoss,
  type BaseUnit,
  type CompleteRoastBatchDTO,
  type CompleteRoastBatchResultDTO,
  type CreateWarehouseInventoryItemInput,
  type FifoAllocationRequestDTO,
  type FifoAllocationResultDTO,
  type FifoLotAllocationSliceDTO,
  type IngestWarehouseLotDTO,
  type InventoryCategory,
  type LotStatus,
  type RoastBatchDto,
  type UpdateLotStatusInput,
  type UpdateWarehouseInventoryItemInput,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
  type WarehouseLotIngestResultDTO,
  type WarehouseLotQueryDTO,
  type WarehouseOverviewDTO,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from './warehouse.errors.js';

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface InventoryItemRow {
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
  created_at: Date | string;
  updated_at: Date | string;
}

interface WarehouseLotRow {
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
  unit_cost_vnd: number;
  shipping_cost_vnd: number;
  status: LotStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

interface RoastBatchRow {
  id: string;
  warehouse_store_id: string;
  batch_code: string;
  source_green_lot_id: string;
  output_lot_id: string;
  green_input_weight_g: number;
  roasted_output_weight_g: number;
  weight_loss_pct: number;
  roast_profile: string | null;
  roasted_by: string;
  roasted_at: Date | string;
  notes: string | null;
}

function mapItem(r: InventoryItemRow): WarehouseInventoryItemDto {
  return {
    ...r,
    created_at: toIsoString(r.created_at),
    updated_at: toIsoString(r.updated_at),
  };
}

function mapLot(r: WarehouseLotRow): WarehouseLotFullDto {
  return {
    ...r,
    received_at: toIsoString(r.received_at),
    created_at: toIsoString(r.created_at),
    updated_at: toIsoString(r.updated_at),
  };
}

function mapBatch(r: RoastBatchRow): RoastBatchDto {
  return {
    ...r,
    roasted_at: toIsoString(r.roasted_at),
  };
}

async function assertCentralWarehouseAccess(
  actor: AuthActor,
  warehouseStoreId: string,
): Promise<void> {
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'WAREHOUSE_MANAGER') {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      `Vai trò ${actor.role} không có quyền thao tác nghiệp vụ Kho Tổng`,
    );
  }

  const store = await dbQueryOne<{ id: string; code: string; type: string; is_active: boolean }>(
    `SELECT id, code, type, is_active FROM public.stores WHERE id = $1 AND is_active = TRUE`,
    [warehouseStoreId],
  );
  if (!store) {
    throw new WarehouseDomainError(404, 'NOT_FOUND', `Không tìm thấy Kho Tổng ${warehouseStoreId}`);
  }
  if (store.type !== 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(
      400,
      'INVALID_WAREHOUSE_STORE',
      `Chi nhánh ${store.code} không phải là Kho Tổng trung tâm`,
    );
  }
  if (actor.role === 'WAREHOUSE_MANAGER' && actor.assignedStoreId !== warehouseStoreId) {
    throw new WarehouseDomainError(
      403,
      'FORBIDDEN_ROLE',
      'Quản lý Kho Tổng chỉ được thao tác tại Kho Tổng được phân công',
    );
  }
}

// ============================================================================
// INVENTORY ITEMS CRUD (M2)
// ============================================================================
export async function listInventoryItems(
  includeInactive = false,
): Promise<WarehouseInventoryItemDto[]> {
  const res = await dbQuery<InventoryItemRow>(
    `SELECT * FROM public.inventory_items
     ${includeInactive ? '' : 'WHERE is_active = TRUE'}
     ORDER BY category ASC, sku ASC`,
  );
  return res.rows.map(mapItem);
}

export async function createInventoryItem(
  actor: AuthActor,
  input: CreateWarehouseInventoryItemInput,
): Promise<WarehouseInventoryItemDto> {
  return withTransaction(async (client) => {
    const dup = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.inventory_items WHERE UPPER(sku) = UPPER($1)`,
      [input.sku],
      client,
    );
    if (dup) {
      throw new WarehouseDomainError(409, 'DUPLICATE_SKU', `Mã vật tư ${input.sku} đã tồn tại`);
    }

    const row = await dbQueryOne<InventoryItemRow>(
      `INSERT INTO public.inventory_items (
         organization_id, sku, name, category, base_unit, min_stock_threshold,
         moving_avg_cost_vnd, internal_transfer_price_vnd, retail_price_vnd, is_active
       )
       VALUES ($1, UPPER($2), $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING *`,
      [
        SEED_IDS.organization.cf19,
        input.sku,
        input.name,
        input.category,
        input.base_unit,
        input.min_stock_threshold,
        input.moving_avg_cost_vnd,
        input.internal_transfer_price_vnd,
        input.retail_price_vnd,
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: SEED_IDS.stores.centralWarehouse,
        action: 'INVENTORY_ITEM_CREATED',
        targetTable: 'inventory_items',
        targetId: row!.id,
        reason: `Thêm mới vật tư ${row!.sku} — ${row!.name}`,
        payload: input,
      },
      client,
    );

    return mapItem(row!);
  });
}

export async function updateInventoryItem(
  actor: AuthActor,
  itemId: string,
  input: UpdateWarehouseInventoryItemInput,
): Promise<WarehouseInventoryItemDto> {
  return withTransaction(async (client) => {
    const existing = await dbQueryOne<InventoryItemRow>(
      `SELECT * FROM public.inventory_items WHERE id = $1 FOR UPDATE`,
      [itemId],
      client,
    );
    if (!existing) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng vật tư');
    }

    const updated = await dbQueryOne<InventoryItemRow>(
      `UPDATE public.inventory_items
       SET name = COALESCE($2, name),
           category = COALESCE($3, category),
           min_stock_threshold = COALESCE($4, min_stock_threshold),
           moving_avg_cost_vnd = COALESCE($5, moving_avg_cost_vnd),
           internal_transfer_price_vnd = COALESCE($6, internal_transfer_price_vnd),
           retail_price_vnd = COALESCE($7, retail_price_vnd),
           is_active = COALESCE($8, is_active)
       WHERE id = $1
       RETURNING *`,
      [
        itemId,
        input.name ?? null,
        input.category ?? null,
        input.min_stock_threshold ?? null,
        input.moving_avg_cost_vnd ?? null,
        input.internal_transfer_price_vnd ?? null,
        input.retail_price_vnd ?? null,
        input.is_active ?? null,
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: SEED_IDS.stores.centralWarehouse,
        action: 'INVENTORY_ITEM_UPDATED',
        targetTable: 'inventory_items',
        targetId: itemId,
        reason: `Cập nhật danh mục vật tư ${existing.sku}`,
        payload: input,
      },
      client,
    );

    return mapItem(updated!);
  });
}

// ============================================================================
// OVERVIEW, LOTS, INGEST MAC, ROASTERY FIFO & ALLOCATION (Exact kg/g unit math)
// ============================================================================
export async function getOverview(
  warehouseStoreId: string = SEED_IDS.stores.centralWarehouse,
): Promise<WarehouseOverviewDTO> {
  const warehouse = await dbQueryOne<{ id: string; code: string; name: string; type: string }>(
    `SELECT id, code, name, type FROM public.stores WHERE id = $1 AND is_active = TRUE`,
    [warehouseStoreId],
  );
  if (!warehouse || warehouse.type !== 'CENTRAL_WAREHOUSE') {
    throw new WarehouseDomainError(404, 'NOT_FOUND', `Không tìm thấy Kho Tổng ${warehouseStoreId}`);
  }

  const [itemsRes, lotsRes, batchesCountRes] = await Promise.all([
    dbQuery<InventoryItemRow>(
      `SELECT * FROM public.inventory_items WHERE is_active = TRUE ORDER BY category ASC, sku ASC`,
    ),
    dbQuery<WarehouseLotRow>(
      `SELECT * FROM public.warehouse_lots
       WHERE store_id = $1 AND status = 'AVAILABLE' AND remaining_qty > 0`,
      [warehouseStoreId],
    ),
    dbQueryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.roast_batches WHERE warehouse_store_id = $1`,
      [warehouseStoreId],
    ),
  ]);

  let totalInventoryValueVnd = 0;
  let lowStockSkuCount = 0;

  const stockSummaries: WarehouseStockSummaryDTO[] = itemsRes.rows.map((item) => {
    const itemLots = lotsRes.rows.filter((l) => l.item_id === item.id);
    const totalAvailableQty = roundQty2(
      itemLots.reduce((sum, lot) => sum + lot.remaining_qty, 0),
    );
    // Exact unit-aware valuation: 'g' converts to kg before multiplying by VND/kg MAC!
    const estimatedStockValueVnd = calculateStockValueVnd(
      totalAvailableQty,
      item.moving_avg_cost_vnd,
      item.base_unit,
    );
    const isLowStock = totalAvailableQty < item.min_stock_threshold;

    totalInventoryValueVnd += estimatedStockValueVnd;
    if (isLowStock) {
      lowStockSkuCount += 1;
    }

    return {
      item_id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      base_unit: item.base_unit,
      min_stock_threshold: item.min_stock_threshold,
      total_available_qty: totalAvailableQty,
      available_lot_count: itemLots.length,
      moving_avg_cost_vnd: item.moving_avg_cost_vnd,
      estimated_stock_value_vnd: estimatedStockValueVnd,
      is_low_stock: isLowStock,
    };
  });

  return {
    warehouse_store_id: warehouse.id,
    warehouse_code: warehouse.code,
    warehouse_name: warehouse.name,
    total_skus: stockSummaries.length,
    total_available_lots: lotsRes.rows.length,
    low_stock_sku_count: lowStockSkuCount,
    total_inventory_value_vnd: totalInventoryValueVnd,
    recent_roast_batches_count: batchesCountRes?.count ?? 0,
    stock_summaries: stockSummaries,
  };
}

export async function listLots(
  query: WarehouseLotQueryDTO = {},
): Promise<WarehouseLotFullDto[]> {
  const storeId = query.warehouse_store_id ?? SEED_IDS.stores.centralWarehouse;
  const conditions: string[] = ['store_id = $1'];
  const params: unknown[] = [storeId];

  if (query.item_id) {
    params.push(query.item_id);
    conditions.push(`item_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    conditions.push(`status = $${params.length}`);
  }
  if (query.only_available) {
    conditions.push(`status = 'AVAILABLE' AND remaining_qty > 0`);
  }

  const res = await dbQuery<WarehouseLotRow>(
    `SELECT * FROM public.warehouse_lots
     WHERE ${conditions.join(' AND ')}
     ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
              received_at ASC, lot_code ASC, id ASC`,
    params,
  );

  return res.rows.map(mapLot);
}

export async function updateLotStatus(
  actor: AuthActor,
  lotId: string,
  input: UpdateLotStatusInput,
): Promise<WarehouseLotFullDto> {
  return withTransaction(async (client) => {
    const existing = await dbQueryOne<WarehouseLotRow>(
      `SELECT * FROM public.warehouse_lots WHERE id = $1 FOR UPDATE`,
      [lotId],
      client,
    );
    if (!existing) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy lô hàng');
    }

    const updated = await dbQueryOne<WarehouseLotRow>(
      `UPDATE public.warehouse_lots
       SET status = $2,
           remaining_qty = CASE WHEN $2 IN ('DEPLETED', 'EXPIRED') THEN 0 ELSE remaining_qty END
       WHERE id = $1
       RETURNING *`,
      [lotId, input.status],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: existing.store_id,
        action: 'WAREHOUSE_LOT_STATUS_UPDATED',
        targetTable: 'warehouse_lots',
        targetId: lotId,
        reason: input.reason,
        payload: {
          lot_code: existing.lot_code,
          previous_status: existing.status,
          new_status: input.status,
          previous_qty: existing.remaining_qty,
        },
      },
      client,
    );

    return mapLot(updated!);
  });
}

export async function listRoastBatches(
  warehouseStoreId: string = SEED_IDS.stores.centralWarehouse,
): Promise<RoastBatchDto[]> {
  const res = await dbQuery<RoastBatchRow>(
    `SELECT * FROM public.roast_batches
     WHERE warehouse_store_id = $1
     ORDER BY roasted_at DESC`,
    [warehouseStoreId],
  );
  return res.rows.map(mapBatch);
}

export async function ingestLot(
  actor: AuthActor,
  input: IngestWarehouseLotDTO,
): Promise<WarehouseLotIngestResultDTO> {
  await assertCentralWarehouseAccess(actor, input.warehouse_store_id);

  return withTransaction(async (client) => {
    const item = await dbQueryOne<InventoryItemRow>(
      `SELECT * FROM public.inventory_items WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
      [input.item_id],
      client,
    );
    if (!item) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng vật tư');
    }

    const normalizedCode = input.lot_code.trim().toUpperCase();
    const dupLot = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.warehouse_lots WHERE store_id = $1 AND UPPER(lot_code) = $2`,
      [input.warehouse_store_id, normalizedCode],
      client,
    );
    if (dupLot) {
      throw new WarehouseDomainError(
        409,
        'DUPLICATE_LOT_CODE',
        `Mã lô ${normalizedCode} đã tồn tại tại Kho Tổng`,
      );
    }

    const qtyRes = await dbQueryOne<{ total_qty: number }>(
      `SELECT COALESCE(SUM(remaining_qty), 0)::numeric(12,2) AS total_qty
       FROM public.warehouse_lots
       WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0`,
      [input.warehouse_store_id, input.item_id],
      client,
    );
    const previousQty = roundQty2(qtyRes?.total_qty ?? 0);
    const previousMacVnd = item.moving_avg_cost_vnd;

    // Exact unit-aware shipping amortization (divides by kg for 'g' items!)
    const effectiveUnitCostVnd = calculateEffectiveLotUnitCostVnd(
      input.unit_cost_vnd,
      input.shipping_cost_vnd,
      input.initial_qty,
      item.base_unit,
    );

    const newMacVnd = calculateMovingAverageCostVnd(
      previousQty,
      previousMacVnd,
      input.initial_qty,
      effectiveUnitCostVnd,
    );

    const createdLot = await dbQueryOne<WarehouseLotRow>(
      `INSERT INTO public.warehouse_lots (
         store_id, item_id, lot_code, supplier_name, moisture_pct,
         roast_date, expiry_date, initial_qty, remaining_qty,
         unit_cost_vnd, shipping_cost_vnd, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, 'AVAILABLE')
       RETURNING *`,
      [
        input.warehouse_store_id,
        input.item_id,
        normalizedCode,
        input.supplier_name ?? null,
        input.moisture_pct ?? null,
        input.roast_date ?? null,
        input.expiry_date ?? null,
        input.initial_qty,
        effectiveUnitCostVnd,
        input.shipping_cost_vnd,
      ],
      client,
    );

    await client.query(
      `UPDATE public.inventory_items SET moving_avg_cost_vnd = $2 WHERE id = $1`,
      [item.id, newMacVnd],
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.warehouse_store_id,
        action: 'WAREHOUSE_LOT_INGESTED',
        targetTable: 'warehouse_lots',
        targetId: createdLot!.id,
        reason: `Nhập kho lô ${normalizedCode} (${input.initial_qty} ${item.base_unit}) & cập nhật MAC`,
        payload: {
          lot_code: normalizedCode,
          item_id: item.id,
          initial_qty: input.initial_qty,
          previous_mac_vnd: previousMacVnd,
          effective_unit_cost_vnd: effectiveUnitCostVnd,
          new_mac_vnd: newMacVnd,
        },
      },
      client,
    );

    return {
      lot: mapLot(createdLot!),
      item_id: item.id,
      previous_qty: previousQty,
      previous_mac_vnd: previousMacVnd,
      effective_unit_cost_vnd: effectiveUnitCostVnd,
      new_mac_vnd: newMacVnd,
    };
  });
}

export async function completeRoastBatch(
  actor: AuthActor,
  input: CompleteRoastBatchDTO,
): Promise<CompleteRoastBatchResultDTO> {
  await assertCentralWarehouseAccess(actor, input.warehouse_store_id);

  return withTransaction(async (client) => {
    const normalizedBatchCode = input.batch_code.trim().toUpperCase();
    const normalizedOutputLotCode = input.output_lot_code.trim().toUpperCase();

    const dupBatch = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.roast_batches WHERE UPPER(batch_code) = $1`,
      [normalizedBatchCode],
      client,
    );
    if (dupBatch) {
      throw new WarehouseDomainError(409, 'DUPLICATE_BATCH_CODE', `Mã mẻ rang ${normalizedBatchCode} đã tồn tại`);
    }

    const dupOutputLot = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.warehouse_lots WHERE store_id = $1 AND UPPER(lot_code) = $2`,
      [input.warehouse_store_id, normalizedOutputLotCode],
      client,
    );
    if (dupOutputLot) {
      throw new WarehouseDomainError(409, 'DUPLICATE_LOT_CODE', `Mã lô thành phẩm ${normalizedOutputLotCode} đã tồn tại`);
    }

    const sourceLot = await dbQueryOne<WarehouseLotRow>(
      `SELECT * FROM public.warehouse_lots WHERE id = $1 AND store_id = $2 FOR UPDATE`,
      [input.source_green_lot_id, input.warehouse_store_id],
      client,
    );
    if (!sourceLot) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy lô nhân xanh nguồn tại Kho Tổng');
    }

    const sourceItem = await dbQueryOne<InventoryItemRow>(
      `SELECT * FROM public.inventory_items WHERE id = $1`,
      [sourceLot.item_id],
      client,
    );
    if (!sourceItem || sourceItem.category !== 'GREEN_BEAN') {
      throw new WarehouseDomainError(
        400,
        'INVALID_SOURCE_ITEM_CATEGORY',
        'Lô đầu vào mẻ rang bắt buộc phải thuộc nhóm Cà phê nhân xanh (GREEN_BEAN)',
      );
    }

    if (sourceLot.status !== 'AVAILABLE' || sourceLot.remaining_qty < input.green_input_weight_g) {
      throw new WarehouseDomainError(
        409,
        'INSUFFICIENT_GREEN_BEAN_STOCK',
        `Lô ${sourceLot.lot_code} chỉ còn ${sourceLot.remaining_qty}g, không đủ cho mẻ rang ${input.green_input_weight_g}g`,
      );
    }

    const outputItem = await dbQueryOne<InventoryItemRow>(
      `SELECT * FROM public.inventory_items WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
      [input.output_item_id],
      client,
    );
    if (!outputItem || outputItem.category !== 'ROASTED_COFFEE') {
      throw new WarehouseDomainError(
        400,
        'INVALID_OUTPUT_ITEM_CATEGORY',
        'Sản phẩm đầu ra mẻ rang bắt buộc phải thuộc nhóm Cà phê hạt rang (ROASTED_COFFEE)',
      );
    }

    if (input.enforce_fifo !== false) {
      const oldest = await dbQueryOne<{ id: string; lot_code: string }>(
        `SELECT id, lot_code
         FROM public.warehouse_lots
         WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0
         ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
                  received_at ASC, lot_code ASC, id ASC
         LIMIT 1`,
        [input.warehouse_store_id, sourceLot.item_id],
        client,
      );
      if (oldest && oldest.id !== sourceLot.id) {
        throw new WarehouseDomainError(
          409,
          'FIFO_VIOLATION_OLDER_LOT_EXISTS',
          `Vi phạm khóa FIFO: Lô nhân xanh cũ hơn (${oldest.lot_code}) vẫn còn tồn, bắt buộc xuất rang trước`,
        );
      }
    }

    const weightLossPct = calculateRoastYieldLossPct(
      input.green_input_weight_g,
      input.roasted_output_weight_g,
    );
    const isAbnormalLoss = isAbnormalRoastYieldLoss(weightLossPct);
    const outputUnitCostVnd = calculateRoastedOutputUnitCostVnd(
      input.green_input_weight_g,
      sourceLot.unit_cost_vnd,
      input.roasted_output_weight_g,
    );

    const newSourceRemaining = roundQty2(
      sourceLot.remaining_qty - input.green_input_weight_g,
    );
    const newSourceStatus: LotStatus =
      newSourceRemaining === 0 ? 'DEPLETED' : 'AVAILABLE';

    await client.query(
      `UPDATE public.warehouse_lots SET remaining_qty = $2, status = $3 WHERE id = $1`,
      [sourceLot.id, newSourceRemaining, newSourceStatus],
    );

    const oldOutputRes = await dbQueryOne<{ total_qty: number }>(
      `SELECT COALESCE(SUM(remaining_qty), 0)::numeric(12,2) AS total_qty
       FROM public.warehouse_lots
       WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0`,
      [input.warehouse_store_id, outputItem.id],
      client,
    );
    const newOutputItemMacVnd = calculateMovingAverageCostVnd(
      roundQty2(oldOutputRes?.total_qty ?? 0),
      outputItem.moving_avg_cost_vnd,
      input.roasted_output_weight_g,
      outputUnitCostVnd,
    );

    const roastDate = input.roast_date ?? new Date().toISOString().slice(0, 10);
    const expiryDate = input.expiry_date ?? addDaysToIsoDate(roastDate, 90);

    const outputLot = await dbQueryOne<WarehouseLotRow>(
      `INSERT INTO public.warehouse_lots (
         store_id, item_id, lot_code, supplier_name, moisture_pct,
         roast_date, expiry_date, initial_qty, remaining_qty,
         unit_cost_vnd, shipping_cost_vnd, status
       )
       VALUES ($1, $2, $3, 'Xưởng Rang Nội Bộ CF19', $4, $5, $6, $7, $7, $8, 0, 'AVAILABLE')
       RETURNING *`,
      [
        input.warehouse_store_id,
        outputItem.id,
        normalizedOutputLotCode,
        input.moisture_pct ?? null,
        roastDate,
        expiryDate,
        input.roasted_output_weight_g,
        outputUnitCostVnd,
      ],
      client,
    );

    await client.query(
      `UPDATE public.inventory_items SET moving_avg_cost_vnd = $2 WHERE id = $1`,
      [outputItem.id, newOutputItemMacVnd],
    );

    const roastBatch = await dbQueryOne<RoastBatchRow>(
      `INSERT INTO public.roast_batches (
         warehouse_store_id, batch_code, source_green_lot_id, output_lot_id,
         green_input_weight_g, roasted_output_weight_g, weight_loss_pct,
         roast_profile, roasted_by, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.warehouse_store_id,
        normalizedBatchCode,
        sourceLot.id,
        outputLot!.id,
        input.green_input_weight_g,
        input.roasted_output_weight_g,
        weightLossPct,
        input.roast_profile ?? null,
        actor.id,
        input.notes ?? null,
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.warehouse_store_id,
        action: isAbnormalLoss ? 'ROAST_BATCH_ABNORMAL_LOSS' : 'ROAST_BATCH_COMPLETED',
        targetTable: 'roast_batches',
        targetId: roastBatch!.id,
        reason: `Hoàn tất mẻ rang ${normalizedBatchCode} (hao hụt ${weightLossPct}%)`,
        payload: {
          batch_code: normalizedBatchCode,
          source_lot_code: sourceLot.lot_code,
          output_lot_code: normalizedOutputLotCode,
          green_input_weight_g: input.green_input_weight_g,
          roasted_output_weight_g: input.roasted_output_weight_g,
          weight_loss_pct: weightLossPct,
          output_unit_cost_vnd: outputUnitCostVnd,
        },
      },
      client,
    );

    return {
      roast_batch: mapBatch(roastBatch!),
      output_lot: mapLot(outputLot!),
      source_lot_id: sourceLot.id,
      source_lot_remaining_qty: newSourceRemaining,
      source_lot_status: newSourceStatus,
      weight_loss_pct: weightLossPct,
      is_abnormal_yield_loss: isAbnormalLoss,
      output_unit_cost_vnd: outputUnitCostVnd,
      new_output_item_mac_vnd: newOutputItemMacVnd,
    };
  });
}

export async function allocateFifoStock(
  actor: AuthActor,
  input: FifoAllocationRequestDTO,
  dryRun = false,
): Promise<FifoAllocationResultDTO> {
  await assertCentralWarehouseAccess(actor, input.warehouse_store_id);

  return withTransaction(async (client) => {
    const item = await dbQueryOne<InventoryItemRow>(
      `SELECT * FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
      [input.item_id],
      client,
    );
    if (!item) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng vật tư');
    }

    const candidatesRes = await dbQuery<WarehouseLotRow>(
      `SELECT * FROM public.warehouse_lots
       WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0
       ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
                received_at ASC, lot_code ASC, id ASC
       ${dryRun ? '' : 'FOR UPDATE'}`,
      [input.warehouse_store_id, input.item_id],
      client,
    );

    const totalAvailable = roundQty2(
      candidatesRes.rows.reduce((sum, l) => sum + l.remaining_qty, 0),
    );
    if (totalAvailable < input.requested_qty) {
      throw new WarehouseDomainError(
        409,
        'INSUFFICIENT_FIFO_STOCK',
        `Tồn kho khả dụng chỉ còn ${totalAvailable} ${item.base_unit}, không đủ xuất ${input.requested_qty} ${item.base_unit}`,
      );
    }

    let remainingNeeded = input.requested_qty;
    let totalCogsVnd = 0;
    const allocations: FifoLotAllocationSliceDTO[] = [];

    for (const lot of candidatesRes.rows) {
      if (remainingNeeded <= 0) break;
      const takeQty = roundQty2(Math.min(lot.remaining_qty, remainingNeeded));
      const remainingAfter = roundQty2(lot.remaining_qty - takeQty);
      const statusAfter: LotStatus = remainingAfter === 0 ? 'DEPLETED' : 'AVAILABLE';

      // Exact unit-aware COGS calculation!
      const sliceCogsVnd = calculateStockValueVnd(
        takeQty,
        lot.unit_cost_vnd,
        item.base_unit,
      );

      if (!dryRun) {
        await client.query(
          `UPDATE public.warehouse_lots SET remaining_qty = $2, status = $3 WHERE id = $1`,
          [lot.id, remainingAfter, statusAfter],
        );
      }

      totalCogsVnd += sliceCogsVnd;
      allocations.push({
        lot_id: lot.id,
        lot_code: lot.lot_code,
        roast_date: lot.roast_date,
        received_at: toIsoString(lot.received_at),
        allocated_qty: takeQty,
        remaining_after_qty: remainingAfter,
        lot_status_after: statusAfter,
        unit_cost_vnd: lot.unit_cost_vnd,
        slice_cogs_vnd: sliceCogsVnd,
      });

      remainingNeeded = roundQty2(remainingNeeded - takeQty);
    }

    const totalBillingQty =
      item.base_unit === 'g' ? input.requested_qty / 1000 : input.requested_qty;
    const weightedUnitCostVnd = Math.round(totalCogsVnd / totalBillingQty);

    if (!dryRun) {
      await recordAuditLog(
        {
          actorId: actor.id,
          storeId: input.warehouse_store_id,
          action: 'WAREHOUSE_FIFO_ALLOCATED',
          targetTable: 'warehouse_lots',
          targetId: null,
          reason: input.reason ?? 'Xuất phân bổ đa lô FIFO Kho Tổng',
          payload: {
            item_id: item.id,
            requested_qty: input.requested_qty,
            total_cogs_vnd: totalCogsVnd,
            reference_code: input.reference_code ?? null,
            allocations_count: allocations.length,
          },
        },
        client,
      );
    }

    return {
      warehouse_store_id: input.warehouse_store_id,
      item_id: item.id,
      requested_qty: input.requested_qty,
      total_allocated_qty: input.requested_qty,
      total_cogs_vnd: totalCogsVnd,
      weighted_unit_cost_vnd: weightedUnitCostVnd,
      reference_code: input.reference_code ?? null,
      allocations,
    };
  });
}
