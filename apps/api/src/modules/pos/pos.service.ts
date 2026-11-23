import {
  buildEscPosThermalReceiptText,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BaseUnit,
  type BomInventoryCostLookup,
  type MenuModifierDto,
  type MenuProductDto,
  type MenuVariantDto,
  type OfflinePosBatchSyncDTO,
  type OfflinePosBatchSyncResultDTO,
  type PaymentStatus,
  type PosOrderDetailResultDTO,
  type PosOrderFullDto,
  type PosOrderItemDto,
  type PosOrdersFilterQueryDTO,
  type SubmitPosOrderDTO,
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

interface PosOrderRow {
  id: string;
  order_code: string;
  store_id: string;
  shift_id: string;
  cashier_id: string;
  customer_phone: string | null;
  payment_method: 'CASH' | 'VIETQR';
  payment_status: PaymentStatus;
  kds_status: 'QUEUED' | 'PREPARING' | 'COMPLETED';
  vietqr_ref_code: string | null;
  total_amount_vnd: number;
  cogs_amount_vnd: number;
  bom_deducted_at: Date | string | null;
  void_approved_by_manager_id: string | null;
  void_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PosOrderItemRow {
  id: string;
  order_id: string;
  store_id: string;
  product_id: string;
  variant_id: string;
  modifiers_json: Array<{ id: string; name: string; price_delta_vnd: number }>;
  quantity: number;
  unit_price_vnd: number;
  line_total_vnd: number;
  notes: string | null;
  created_at: Date | string;
}

function mapOrder(r: PosOrderRow, items?: PosOrderItemDto[]): PosOrderFullDto {
  return {
    ...r,
    bom_deducted_at: toNullableIsoString(r.bom_deducted_at),
    created_at: toIsoString(r.created_at),
    updated_at: toIsoString(r.updated_at),
    ...(items ? { items } : {}),
  };
}

function mapOrderItem(r: PosOrderItemRow): PosOrderItemDto {
  return {
    ...r,
    modifiers_json: Array.isArray(r.modifiers_json) ? r.modifiers_json : [],
    created_at: toIsoString(r.created_at),
  };
}

async function buildReceiptForOrder(
  order: PosOrderFullDto,
  items: PosOrderItemDto[],
): Promise<string> {
  const [store, cashier, productsRes, variantsRes] = await Promise.all([
    dbQueryOne<{ name: string; address: string | null }>(
      `SELECT name, address FROM public.stores WHERE id = $1`,
      [order.store_id],
    ),
    dbQueryOne<{ full_name: string }>(
      `SELECT full_name FROM public.user_profiles WHERE id = $1`,
      [order.cashier_id],
    ),
    dbQuery<{ id: string; name: string }>(`SELECT id, name FROM public.menu_products`),
    dbQuery<{ id: string; size_code: string }>(`SELECT id, size_code FROM public.menu_variants`),
  ]);

  return buildEscPosThermalReceiptText({
    store_name: store?.name ?? 'CF19 Coffee',
    store_address: store?.address ?? '',
    order_code: order.order_code,
    created_at: order.created_at,
    cashier_name: cashier?.full_name ?? 'Thu Ngân POS',
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    vietqr_ref_code: order.vietqr_ref_code,
    total_amount_vnd: order.total_amount_vnd,
    lines: items.map((it) => {
      const p = productsRes.rows.find((x) => x.id === it.product_id);
      const v = variantsRes.rows.find((x) => x.id === it.variant_id);
      return {
        product_name: p?.name ?? 'Đồ uống',
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

export async function listStoreOrders(
  storeId: string,
  filter: PosOrdersFilterQueryDTO = { limit: 50 },
): Promise<PosOrderFullDto[]> {
  const conditions: string[] = ['store_id = $1'];
  const params: unknown[] = [storeId];

  if (filter.payment_status) {
    params.push(filter.payment_status);
    conditions.push(`payment_status = $${params.length}`);
  }
  if (filter.kds_status) {
    params.push(filter.kds_status);
    conditions.push(`kds_status = $${params.length}`);
  }

  params.push(Math.min(200, Math.max(1, filter.limit ?? 50)));

  const ordersRes = await dbQuery<PosOrderRow>(
    `SELECT * FROM public.pos_orders
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  const ids = ordersRes.rows.map((o) => o.id);
  const itemsRes =
    ids.length > 0
      ? await dbQuery<PosOrderItemRow>(
          `SELECT * FROM public.pos_order_items WHERE order_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
          [ids],
        )
      : { rows: [] };

  return ordersRes.rows.map((ord) =>
    mapOrder(
      ord,
      itemsRes.rows.filter((it) => it.order_id === ord.id).map(mapOrderItem),
    ),
  );
}

export async function createPosOrder(
  actor: AuthActor,
  storeId: string,
  input: SubmitPosOrderDTO,
): Promise<PosOrderDetailResultDTO> {
  const bomRecipes = await loadActiveBomRecipes();

  const txResult = await withTransaction(async (client) => {
    const store = await dbQueryOne<{
      id: string;
      code: string;
      type: string;
      price_multiplier: number;
    }>(
      `SELECT id, code, type, price_multiplier FROM public.stores WHERE id = $1 AND is_active = TRUE`,
      [storeId],
      client,
    );
    if (!store || store.type === 'CENTRAL_WAREHOUSE') {
      throw new WarehouseDomainError(400, 'INVALID_POS_STORE', 'Chi nhánh POS không hợp lệ');
    }

    const shift = await dbQueryOne<{ id: string; status: string; store_id: string }>(
      `SELECT id, status, store_id FROM public.pos_shifts WHERE id = $1`,
      [input.shift_id],
      client,
    );
    if (!shift || shift.store_id !== storeId) {
      throw new WarehouseDomainError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy ca làm việc tại chi nhánh này');
    }
    if (shift.status !== 'OPEN') {
      throw new WarehouseDomainError(
        409,
        'SHIFT_ALREADY_CLOSED',
        'Ca làm việc đã đóng — Vui lòng mở ca mới trước khi tạo đơn POS',
      );
    }

    const clientCode = input.client_order_code?.trim();
    if (clientCode) {
      const existing = await dbQueryOne<PosOrderRow>(
        `SELECT * FROM public.pos_orders WHERE store_id = $1 AND order_code = $2`,
        [storeId, clientCode],
        client,
      );
      if (existing) {
        const exItems = await dbQuery<PosOrderItemRow>(
          `SELECT * FROM public.pos_order_items WHERE order_id = $1 ORDER BY created_at ASC`,
          [existing.id],
          client,
        );
        return {
          syncStatus: 'IDEMPOTENT_EXISTING' as const,
          order: mapOrder(existing, exItems.rows.map(mapOrderItem)),
          items: exItems.rows.map(mapOrderItem),
          bomRequirements: [],
        };
      }
    }

    const prodsRes = await dbQuery<MenuProductDto>(
      `SELECT * FROM public.menu_products WHERE is_active = TRUE`,
      [],
      client,
    );
    const varsRes = await dbQuery<MenuVariantDto>(
      `SELECT * FROM public.menu_variants WHERE is_active = TRUE`,
      [],
      client,
    );
    const modsRes = await dbQuery<MenuModifierDto>(
      `SELECT * FROM public.menu_modifiers WHERE is_active = TRUE`,
      [],
      client,
    );
    const invRes = await dbQuery<BomInventoryCostLookup & { base_unit: BaseUnit }>(
      `SELECT id, sku, name, base_unit, internal_transfer_price_vnd
       FROM public.inventory_items WHERE is_active = TRUE`,
      [],
      client,
    );

    const modifiersById: Record<string, MenuModifierDto> = {};
    for (const m of modsRes.rows) modifiersById[m.id] = m;

    const inventoryById: Record<string, BomInventoryCostLookup> = {};
    for (const inv of invRes.rows) inventoryById[inv.id] = inv;

    const preparedLines: Array<{
      product_id: string;
      variant_id: string;
      modifiers_json: Array<{ id: string; name: string; price_delta_vnd: number }>;
      quantity: number;
      unit_price_vnd: number;
      line_total_vnd: number;
      notes: string | null;
    }> = [];

    let totalAmountVnd = 0;

    for (const line of input.items) {
      const product = prodsRes.rows.find((p) => p.id === line.product_id);
      const variant = varsRes.rows.find(
        (v) => v.id === line.variant_id && v.product_id === line.product_id,
      );
      if (!product || !variant) {
        throw new WarehouseDomainError(404, 'NOT_FOUND', 'Món uống hoặc Size không tồn tại hoặc đã ngừng bán');
      }

      const selectedMods: MenuModifierDto[] = [];
      for (const modId of line.modifier_ids) {
        const mod = modifiersById[modId];
        if (!mod) {
          throw new WarehouseDomainError(404, 'NOT_FOUND', `Tùy chọn ${modId} không tồn tại`);
        }
        selectedMods.push(mod);
      }

      const check = validateModifierSelectionMatrix(selectedMods);
      if (!check.valid) {
        throw new WarehouseDomainError(400, 'INVALID_MODIFIER_MATRIX', check.errors.join('; '));
      }

      const pricing = calculatePosLinePricing({
        basePriceVnd: product.base_price_vnd,
        priceMultiplier: store.price_multiplier,
        variantPriceDeltaVnd: variant.price_delta_vnd,
        modifiers: selectedMods,
        quantity: line.quantity,
      });

      totalAmountVnd += pricing.line_total_vnd;
      preparedLines.push({
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
        notes: line.notes?.trim() || null,
      });
    }

    const bom = calculateOrderBomRequirementsAndCogs({
      lines: input.items,
      recipes: bomRecipes,
      modifiersById,
      inventoryItemsById: inventoryById,
    });

    const compactStore = store.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;
    const orderCode = clientCode ?? `POS-${compactStore}-${dateStamp}-${suffix}`;

    const paymentStatus: PaymentStatus =
      input.payment_method === 'CASH' ? 'PAID' : 'PENDING';
    const vietqrRefCode =
      input.payment_method === 'VIETQR'
        ? `CF19${compactStore}${suffix}`
        : null;

    const insertedOrder = await dbQueryOne<PosOrderRow>(
      `INSERT INTO public.pos_orders (
         order_code, store_id, shift_id, cashier_id, customer_phone,
         payment_method, payment_status, kds_status, vietqr_ref_code,
         total_amount_vnd, cogs_amount_vnd
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'QUEUED', $8, $9, $10)
       RETURNING *`,
      [
        orderCode,
        storeId,
        input.shift_id,
        actor.id,
        input.customer_phone?.trim() || null,
        input.payment_method,
        paymentStatus,
        vietqrRefCode,
        totalAmountVnd,
        bom.total_cogs_vnd,
      ],
      client,
    );

    const insertedItems: PosOrderItemDto[] = [];
    for (const pl of preparedLines) {
      const itemRow = await dbQueryOne<PosOrderItemRow>(
        `INSERT INTO public.pos_order_items (
           order_id, store_id, product_id, variant_id, modifiers_json,
           quantity, unit_price_vnd, line_total_vnd, notes
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
         RETURNING *`,
        [
          insertedOrder!.id,
          storeId,
          pl.product_id,
          pl.variant_id,
          JSON.stringify(pl.modifiers_json),
          pl.quantity,
          pl.unit_price_vnd,
          pl.line_total_vnd,
          pl.notes,
        ],
        client,
      );
      insertedItems.push(mapOrderItem(itemRow!));
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId,
        action: 'POS_ORDER_CREATED',
        targetTable: 'pos_orders',
        targetId: insertedOrder!.id,
        reason: `Tạo hóa đơn POS ${orderCode} (${input.payment_method})`,
        payload: {
          order_code: orderCode,
          payment_method: input.payment_method,
          payment_status: paymentStatus,
          total_amount_vnd: totalAmountVnd,
        },
      },
      client,
    );

    return {
      syncStatus: 'SYNCED_NEW' as const,
      order: mapOrder(insertedOrder!, insertedItems),
      items: insertedItems,
      bomRequirements: bom.requirements,
    };
  });

  const thermalReceiptText = await buildReceiptForOrder(
    txResult.order,
    txResult.items,
  );

  return {
    sync_status: txResult.syncStatus,
    order: txResult.order,
    items: txResult.items,
    bom_requirements: txResult.bomRequirements,
    thermal_receipt_text: thermalReceiptText,
  };
}

export async function syncOfflinePosOrders(
  actor: AuthActor,
  storeId: string,
  input: OfflinePosBatchSyncDTO,
): Promise<OfflinePosBatchSyncResultDTO> {
  const results: PosOrderDetailResultDTO[] = [];
  let syncedNew = 0;
  let existingCount = 0;

  for (const entry of input.orders) {
    const res = await createPosOrder(actor, storeId, {
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

export async function getOrderReceipt(
  storeId: string,
  orderId: string,
): Promise<{ order: PosOrderFullDto; thermal_receipt_text: string }> {
  const orderRow = await dbQueryOne<PosOrderRow>(
    `SELECT * FROM public.pos_orders WHERE id = $1 AND store_id = $2`,
    [orderId, storeId],
  );
  if (!orderRow) {
    throw new WarehouseDomainError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy hóa đơn POS');
  }

  const itemsRes = await dbQuery<PosOrderItemRow>(
    `SELECT * FROM public.pos_order_items WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId],
  );

  const items = itemsRes.rows.map(mapOrderItem);
  const order = mapOrder(orderRow, items);
  const thermalReceiptText = await buildReceiptForOrder(order, items);

  return {
    order,
    thermal_receipt_text: thermalReceiptText,
  };
}
