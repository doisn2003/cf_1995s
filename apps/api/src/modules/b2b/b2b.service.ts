import {
  SEED_IDS,
  calculateB2bCreditCheck,
  calculateStockValueVnd,
  classifyArAgingBucket,
  convertToKgForTierPricing,
  resolveB2bTieredUnitPriceVnd,
  settleFifoPendingInvoices,
  type ArAgingBucket,
  type ArAgingSummaryDTO,
  type ArCustomerAgingRowDTO,
  type B2bCatalogOverviewDTO,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
  type B2bOrderItemDto,
  type B2bPriceQuoteQueryDTO,
  type B2bPriceQuoteResultDTO,
  type B2bPriceTier,
  type B2bPriceTierDto,
  type BaseUnit,
  type CreateB2bCustomerInput,
  type CreateB2bOrderDTO,
  type CreateB2bOrderResultDTO,
  type CreateB2cRetailOrderInput,
  type LotStatus,
  type PaymentMethod,
  type PaymentStatus,
  type RecordB2bDebtPaymentDTO,
  type RecordB2bDebtPaymentResultDTO,
  type UpdateB2bCustomerInput,
  type UpsertB2bPriceTierInput,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

const BUCKET_RANK: Record<ArAgingBucket, number> = {
  CURRENT: 0,
  OVERDUE_1_30: 1,
  OVERDUE_31_60: 2,
  OVERDUE_60_PLUS: 3,
};

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDaysIso(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function computeDaysOverdue(dueDateIso: string | null, asOfDateIso: string): number {
  if (!dueDateIso) return 0;
  const dueMs = Date.parse(`${dueDateIso}T00:00:00.000Z`);
  const asOfMs = Date.parse(`${asOfDateIso}T00:00:00.000Z`);
  if (Number.isNaN(dueMs) || Number.isNaN(asOfMs)) return 0;
  return Math.floor((asOfMs - dueMs) / 86_400_000);
}

interface B2bCustomerRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  shop_name: string;
  phone: string | null;
  address: string | null;
  price_tier: B2bPriceTier;
  credit_limit_vnd: number;
  current_debt_vnd: number;
  payment_term_days: number;
  is_active: boolean;
}

interface B2bOrderRow {
  id: string;
  order_code: string;
  warehouse_store_id: string;
  customer_id: string | null;
  created_by: string;
  sale_channel: 'B2B_WHOLESALE' | 'B2C_RETAIL';
  retail_customer_name: string | null;
  retail_customer_phone: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount_vnd: number;
  paid_amount_vnd: number;
  cogs_amount_vnd: number;
  due_date: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface B2bOrderItemRow {
  id: string;
  b2b_order_id: string;
  item_id: string;
  lot_id: string | null;
  quantity_base_unit: number;
  unit_price_vnd: number;
  unit_cost_vnd: number;
  line_total_vnd: number;
  created_at: Date | string;
}

interface B2bLedgerRow {
  id: string;
  customer_id: string;
  b2b_order_id: string | null;
  entry_type: 'DEBIT_INVOICE' | 'CREDIT_PAYMENT' | 'ADJUSTMENT';
  amount_vnd: number;
  balance_after_vnd: number;
  recorded_by: string;
  reference_note: string | null;
  created_at: Date | string;
}

function mapCustomer(r: B2bCustomerRow): B2bCustomerDto {
  return {
    ...r,
    phone: r.phone ?? '',
    address: r.address ?? '',
  };
}

// ============================================================================
// CUSTOMERS & PRICE TIERS FULL CRUD
// ============================================================================
export async function listCustomers(includeInactive = false): Promise<B2bCustomerDto[]> {
  const res = await dbQuery<B2bCustomerRow>(
    `SELECT * FROM public.b2b_customers
     ${includeInactive ? '' : 'WHERE is_active = TRUE'}
     ORDER BY code ASC`,
  );
  return res.rows.map(mapCustomer);
}

export async function createCustomer(
  actor: AuthActor,
  input: CreateB2bCustomerInput,
): Promise<B2bCustomerDto> {
  return withTransaction(async (client) => {
    const dup = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.b2b_customers WHERE UPPER(code) = UPPER($1)`,
      [input.code],
      client,
    );
    if (dup) {
      throw new WarehouseDomainError(409, 'DUPLICATE_CUSTOMER_CODE', `Mã khách hàng sỉ ${input.code} đã tồn tại`);
    }

    const row = await dbQueryOne<B2bCustomerRow>(
      `INSERT INTO public.b2b_customers (
         organization_id, code, name, shop_name, phone, address,
         price_tier, credit_limit_vnd, current_debt_vnd, payment_term_days, is_active
       )
       VALUES ($1, UPPER($2), $3, $4, $5, $6, $7, $8, 0, $9, TRUE)
       RETURNING *`,
      [
        SEED_IDS.organization.cf19,
        input.code,
        input.name,
        input.shop_name,
        input.phone ?? null,
        input.address ?? null,
        input.price_tier,
        input.credit_limit_vnd,
        input.payment_term_days,
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: SEED_IDS.stores.centralWarehouse,
        action: 'B2B_CUSTOMER_CREATED',
        targetTable: 'b2b_customers',
        targetId: row!.id,
        reason: `Thêm mới khách sỉ B2B ${row!.code} — ${row!.shop_name}`,
        payload: input,
      },
      client,
    );

    return mapCustomer(row!);
  });
}

export async function updateCustomer(
  actor: AuthActor,
  customerId: string,
  input: UpdateB2bCustomerInput,
): Promise<B2bCustomerDto> {
  return withTransaction(async (client) => {
    const existing = await dbQueryOne<B2bCustomerRow>(
      `SELECT * FROM public.b2b_customers WHERE id = $1 FOR UPDATE`,
      [customerId],
      client,
    );
    if (!existing) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng B2B');
    }
    if (
      input.credit_limit_vnd !== undefined &&
      input.credit_limit_vnd < existing.current_debt_vnd
    ) {
      throw new WarehouseDomainError(
        409,
        'CREDIT_LIMIT_BELOW_DEBT',
        `Hạn mức mới (${input.credit_limit_vnd.toLocaleString('vi-VN')} đ) không được nhỏ hơn dư nợ hiện tại (${existing.current_debt_vnd.toLocaleString('vi-VN')} đ)`,
      );
    }

    const updated = await dbQueryOne<B2bCustomerRow>(
      `UPDATE public.b2b_customers
       SET name = COALESCE($2, name),
           shop_name = COALESCE($3, shop_name),
           phone = CASE WHEN $4::boolean THEN $5 ELSE phone END,
           address = CASE WHEN $6::boolean THEN $7 ELSE address END,
           price_tier = COALESCE($8, price_tier),
           credit_limit_vnd = COALESCE($9, credit_limit_vnd),
           payment_term_days = COALESCE($10, payment_term_days),
           is_active = COALESCE($11, is_active)
       WHERE id = $1
       RETURNING *`,
      [
        customerId,
        input.name ?? null,
        input.shop_name ?? null,
        input.phone !== undefined,
        input.phone ?? null,
        input.address !== undefined,
        input.address ?? null,
        input.price_tier ?? null,
        input.credit_limit_vnd ?? null,
        input.payment_term_days ?? null,
        input.is_active ?? null,
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: SEED_IDS.stores.centralWarehouse,
        action: 'B2B_CUSTOMER_UPDATED',
        targetTable: 'b2b_customers',
        targetId: customerId,
        reason: `Cập nhật khách sỉ ${existing.code}`,
        payload: input,
      },
      client,
    );

    return mapCustomer(updated!);
  });
}

export async function listPriceTiers(): Promise<B2bPriceTierDto[]> {
  const res = await dbQuery<B2bPriceTierDto>(
    `SELECT id, item_id, price_tier, min_qty_kg, unit_price_vnd
     FROM public.b2b_price_tiers
     WHERE is_active = TRUE
     ORDER BY item_id ASC, min_qty_kg ASC`,
  );
  return res.rows;
}

export async function upsertPriceTier(
  actor: AuthActor,
  input: UpsertB2bPriceTierInput,
): Promise<B2bPriceTierDto> {
  return withTransaction(async (client) => {
    const item = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
      [input.item_id],
      client,
    );
    if (!item) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy mặt hàng vật tư');
    }

    const row = await dbQueryOne<B2bPriceTierDto>(
      `INSERT INTO public.b2b_price_tiers (item_id, price_tier, min_qty_kg, unit_price_vnd, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (item_id, price_tier, min_qty_kg) DO UPDATE SET
         unit_price_vnd = EXCLUDED.unit_price_vnd,
         is_active = EXCLUDED.is_active
       RETURNING id, item_id, price_tier, min_qty_kg, unit_price_vnd`,
      [input.item_id, input.price_tier, input.min_qty_kg, input.unit_price_vnd, input.is_active],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: SEED_IDS.stores.centralWarehouse,
        action: 'B2B_PRICE_TIER_UPSERTED',
        targetTable: 'b2b_price_tiers',
        targetId: row!.id,
        reason: `Cấu hình bậc giá ${input.price_tier} (>=${input.min_qty_kg}kg): ${input.unit_price_vnd.toLocaleString('vi-VN')} đ`,
        payload: input,
      },
      client,
    );

    return row!;
  });
}

export async function deletePriceTier(
  actor: AuthActor,
  tierId: string,
): Promise<{ deleted: boolean }> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `DELETE FROM public.b2b_price_tiers WHERE id = $1 RETURNING id`,
      [tierId],
    );
    if (res.rowCount === 0) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy cấu hình bậc giá');
    }
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: SEED_IDS.stores.centralWarehouse,
        action: 'B2B_PRICE_TIER_DELETED',
        targetTable: 'b2b_price_tiers',
        targetId: tierId,
        reason: 'Xóa bậc giá sỉ B2B',
      },
      client,
    );
    return { deleted: true };
  });
}

// ============================================================================
// OVERVIEW, AR AGING, LEDGER, PRICE QUOTE, B2B ORDER, B2C RETAIL ORDER & PAYMENT
// ============================================================================
export async function listDebtLedger(customerId?: string): Promise<B2bDebtLedgerEntryDto[]> {
  const res = await dbQuery<B2bLedgerRow>(
    `SELECT * FROM public.b2b_debt_ledger
     ${customerId ? 'WHERE customer_id = $1' : ''}
     ORDER BY created_at DESC
     LIMIT 100`,
    customerId ? [customerId] : [],
  );
  return res.rows.map((r) => ({
    ...r,
    created_at: toIsoString(r.created_at),
  }));
}

export async function getOverview(
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<B2bCatalogOverviewDTO & { debt_ledger: B2bDebtLedgerEntryDto[]; b2c_retail_orders: Array<B2bOrderRow & { items: B2bOrderItemDto[] }> }> {
  const [customersRes, tiersRes, ordersRes, itemsRes, ledgerRes] = await Promise.all([
    dbQuery<B2bCustomerRow>(`SELECT * FROM public.b2b_customers WHERE is_active = TRUE ORDER BY code ASC`),
    dbQuery<B2bPriceTierDto>(`SELECT id, item_id, price_tier, min_qty_kg, unit_price_vnd FROM public.b2b_price_tiers WHERE is_active = TRUE ORDER BY item_id ASC, min_qty_kg ASC`),
    dbQuery<B2bOrderRow>(`SELECT * FROM public.b2b_orders ORDER BY created_at DESC LIMIT 100`),
    dbQuery<B2bOrderItemRow>(`SELECT * FROM public.b2b_order_items ORDER BY created_at ASC`),
    dbQuery<B2bLedgerRow>(`SELECT * FROM public.b2b_debt_ledger ORDER BY created_at DESC LIMIT 100`),
  ]);

  const customers = customersRes.rows.map(mapCustomer);
  const allItems = itemsRes.rows.map((it) => ({ ...it, created_at: toIsoString(it.created_at) }));

  const b2bOrdersOnly = ordersRes.rows.filter((o) => o.sale_channel === 'B2B_WHOLESALE');
  const b2cRetailOrders = ordersRes.rows
    .filter((o) => o.sale_channel === 'B2C_RETAIL')
    .map((o) => ({
      ...o,
      created_at: toIsoString(o.created_at),
      updated_at: toIsoString(o.updated_at),
      items: allItems.filter((it) => it.b2b_order_id === o.id),
    }));

  let totalReceivables = 0;
  let totalCurrent = 0;
  let total1To30 = 0;
  let total31To60 = 0;
  let total60Plus = 0;

  const agingRows: ArCustomerAgingRowDTO[] = customers.map((customer) => {
    const pending = b2bOrdersOnly.filter(
      (o) =>
        o.customer_id === customer.id &&
        o.payment_status === 'PENDING' &&
        o.paid_amount_vnd < o.total_amount_vnd,
    );

    let currentVnd = 0;
    let overdue1To30 = 0;
    let overdue31To60 = 0;
    let overdue60Plus = 0;
    let worstBucket: ArAgingBucket = 'CURRENT';

    for (const ord of pending) {
      const outstanding = ord.total_amount_vnd - ord.paid_amount_vnd;
      const bucket = classifyArAgingBucket(computeDaysOverdue(ord.due_date, asOfDate));
      if (BUCKET_RANK[bucket] > BUCKET_RANK[worstBucket]) {
        worstBucket = bucket;
      }
      if (bucket === 'CURRENT') currentVnd += outstanding;
      else if (bucket === 'OVERDUE_1_30') overdue1To30 += outstanding;
      else if (bucket === 'OVERDUE_31_60') overdue31To60 += outstanding;
      else overdue60Plus += outstanding;
    }

    const totalOutstanding = currentVnd + overdue1To30 + overdue31To60 + overdue60Plus;
    totalReceivables += totalOutstanding;
    totalCurrent += currentVnd;
    total1To30 += overdue1To30;
    total31To60 += overdue31To60;
    total60Plus += overdue60Plus;

    return {
      customer,
      pending_invoice_count: pending.length,
      current_vnd: currentVnd,
      overdue_1_30_vnd: overdue1To30,
      overdue_31_60_vnd: overdue31To60,
      overdue_60_plus_vnd: overdue60Plus,
      total_outstanding_vnd: totalOutstanding,
      worst_bucket: worstBucket,
    };
  });

  const agingSummary: ArAgingSummaryDTO = {
    as_of_date: asOfDate,
    total_receivables_vnd: totalReceivables,
    current_vnd: totalCurrent,
    overdue_1_30_vnd: total1To30,
    overdue_31_60_vnd: total31To60,
    overdue_60_plus_vnd: total60Plus,
    customers: agingRows,
  };

  const recentOrders: B2bOrderDto[] = b2bOrdersOnly.map((o) => ({
    id: o.id,
    order_code: o.order_code,
    warehouse_store_id: o.warehouse_store_id,
    customer_id: o.customer_id ?? '',
    created_by: o.created_by,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    total_amount_vnd: o.total_amount_vnd,
    paid_amount_vnd: o.paid_amount_vnd,
    cogs_amount_vnd: o.cogs_amount_vnd,
    due_date: o.due_date,
    notes: o.notes,
    created_at: toIsoString(o.created_at),
    updated_at: toIsoString(o.updated_at),
    items: allItems.filter((it) => it.b2b_order_id === o.id),
  }));

  return {
    customers,
    price_tiers: tiersRes.rows,
    recent_orders: recentOrders,
    aging_summary: agingSummary,
    debt_ledger: ledgerRes.rows.map((l) => ({
      ...l,
      created_at: toIsoString(l.created_at),
    })),
    b2c_retail_orders: b2cRetailOrders,
  };
}

export async function quoteTieredPrice(
  query: B2bPriceQuoteQueryDTO,
): Promise<B2bPriceQuoteResultDTO> {
  const [customer, item, tiersRes] = await Promise.all([
    dbQueryOne<B2bCustomerRow>(
      `SELECT * FROM public.b2b_customers WHERE id = $1 AND is_active = TRUE`,
      [query.customer_id],
    ),
    dbQueryOne<{
      id: string;
      base_unit: BaseUnit;
      retail_price_vnd: number;
      internal_transfer_price_vnd: number;
    }>(
      `SELECT id, base_unit, retail_price_vnd, internal_transfer_price_vnd
       FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
      [query.item_id],
    ),
    dbQuery<B2bPriceTierDto>(
      `SELECT id, item_id, price_tier, min_qty_kg, unit_price_vnd
       FROM public.b2b_price_tiers WHERE item_id = $1 AND is_active = TRUE`,
      [query.item_id],
    ),
  ]);

  if (!customer) throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng B2B');
  if (!item) throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');

  const resolved = resolveB2bTieredUnitPriceVnd({
    qtyBaseUnit: query.quantity_base_unit,
    baseUnit: item.base_unit,
    customerPriceTier: customer.price_tier,
    tiers: tiersRes.rows,
    fallbackRetailPriceVnd: item.retail_price_vnd,
    fallbackInternalTransferPriceVnd: item.internal_transfer_price_vnd,
  });

  return {
    customer_id: customer.id,
    item_id: item.id,
    base_unit: item.base_unit,
    quantity_base_unit: query.quantity_base_unit,
    qty_kg: resolved.qty_kg,
    customer_price_tier: customer.price_tier,
    applied_price_tier: resolved.applied_price_tier,
    unit_price_vnd: resolved.unit_price_vnd,
    estimated_line_total_vnd: resolved.estimated_line_total_vnd,
    price_source: resolved.price_source,
  };
}

export async function createB2bOrder(
  actor: AuthActor,
  input: CreateB2bOrderDTO,
): Promise<CreateB2bOrderResultDTO> {
  return withTransaction(async (client) => {
    const customer = await dbQueryOne<B2bCustomerRow>(
      `SELECT * FROM public.b2b_customers WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
      [input.customer_id],
      client,
    );
    if (!customer) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng sỉ B2B');
    }

    const planned: Array<{
      itemId: string;
      lotId: string;
      takeQty: number;
      unitPriceVnd: number;
      unitCostVnd: number;
      lineTotal: number;
      cogs: number;
    }> = [];
    const lotDeductions = new Map<string, { remaining: number; status: LotStatus }>();
    let totalAmount = 0;
    let totalCogs = 0;

    for (const line of input.items) {
      const item = await dbQueryOne<{
        id: string;
        sku: string;
        base_unit: BaseUnit;
        retail_price_vnd: number;
        internal_transfer_price_vnd: number;
      }>(
        `SELECT id, sku, base_unit, retail_price_vnd, internal_transfer_price_vnd
         FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
        [line.item_id],
        client,
      );
      if (!item) {
        throw new WarehouseDomainError(404, 'NOT_FOUND', `Không tìm thấy sản phẩm ${line.item_id}`);
      }

      const tiersRes = await dbQuery<B2bPriceTierDto>(
        `SELECT id, item_id, price_tier, min_qty_kg, unit_price_vnd
         FROM public.b2b_price_tiers WHERE item_id = $1 AND is_active = TRUE`,
        [item.id],
        client,
      );

      const quote = resolveB2bTieredUnitPriceVnd({
        qtyBaseUnit: line.quantity_base_unit,
        baseUnit: item.base_unit,
        customerPriceTier: customer.price_tier,
        tiers: tiersRes.rows,
        fallbackRetailPriceVnd: item.retail_price_vnd,
        fallbackInternalTransferPriceVnd: item.internal_transfer_price_vnd,
      });

      const lotsRes = await dbQuery<{ id: string; remaining_qty: number; unit_cost_vnd: number }>(
        `SELECT id, remaining_qty, unit_cost_vnd
         FROM public.warehouse_lots
         WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0
         ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
                  received_at ASC, lot_code ASC, id ASC
         FOR UPDATE`,
        [input.warehouse_store_id, item.id],
        client,
      );

      let rem = line.quantity_base_unit;
      for (const lot of lotsRes.rows) {
        if (rem <= 0) break;
        const currentRemaining = lotDeductions.get(lot.id)?.remaining ?? lot.remaining_qty;
        if (currentRemaining <= 0) continue;

        const take = roundQty2(Math.min(currentRemaining, rem));
        const after = roundQty2(currentRemaining - take);
        const billingQty = convertToKgForTierPricing(take, item.base_unit);
        const lineTotal = Math.round(billingQty * quote.unit_price_vnd);
        const cogs = calculateStockValueVnd(take, lot.unit_cost_vnd, item.base_unit);

        planned.push({
          itemId: item.id,
          lotId: lot.id,
          takeQty: take,
          unitPriceVnd: quote.unit_price_vnd,
          unitCostVnd: lot.unit_cost_vnd,
          lineTotal,
          cogs,
        });
        lotDeductions.set(lot.id, {
          remaining: after,
          status: after === 0 ? 'DEPLETED' : 'AVAILABLE',
        });
        totalAmount += lineTotal;
        totalCogs += cogs;
        rem = roundQty2(rem - take);
      }

      if (rem > 0) {
        throw new WarehouseDomainError(
          409,
          'INSUFFICIENT_FIFO_STOCK',
          `Kho Tổng không đủ tồn FIFO cho ${item.sku} (còn thiếu ${rem} ${item.base_unit})`,
        );
      }
    }

    if (input.paid_amount_vnd > totalAmount) {
      throw new WarehouseDomainError(
        400,
        'PAID_EXCEEDS_TOTAL',
        `Số tiền thanh toán ngay (${input.paid_amount_vnd.toLocaleString('vi-VN')} đ) vượt quá tổng đơn (${totalAmount.toLocaleString('vi-VN')} đ)`,
      );
    }

    const creditCheck = calculateB2bCreditCheck({
      currentDebtVnd: customer.current_debt_vnd,
      creditLimitVnd: customer.credit_limit_vnd,
      totalAmountVnd: totalAmount,
      paidAmountVnd: input.paid_amount_vnd,
    });
    if (creditCheck.exceeds_credit_limit) {
      throw new WarehouseDomainError(
        409,
        'CREDIT_LIMIT_EXCEEDED',
        `Vượt hạn mức công nợ của ${customer.shop_name}: Dư nợ dự kiến ${creditCheck.projected_debt_vnd.toLocaleString('vi-VN')} đ > Hạn mức ${customer.credit_limit_vnd.toLocaleString('vi-VN')} đ`,
      );
    }

    for (const [lotId, mut] of lotDeductions.entries()) {
      await client.query(
        `UPDATE public.warehouse_lots SET remaining_qty = $2, status = $3 WHERE id = $1`,
        [lotId, mut.remaining, mut.status],
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const orderCode =
      input.order_code?.trim().toUpperCase() ??
      `B2B-${todayStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const paymentStatus: PaymentStatus =
      input.paid_amount_vnd === totalAmount ? 'PAID' : 'PENDING';
    const dueDate = addDaysIso(todayStr, customer.payment_term_days);

    const createdOrder = await dbQueryOne<B2bOrderRow>(
      `INSERT INTO public.b2b_orders (
         order_code, warehouse_store_id, customer_id, created_by, sale_channel,
         payment_method, payment_status, total_amount_vnd, paid_amount_vnd,
         cogs_amount_vnd, due_date, notes
       )
       VALUES ($1, $2, $3, $4, 'B2B_WHOLESALE', $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        orderCode,
        input.warehouse_store_id,
        customer.id,
        actor.id,
        input.payment_method,
        paymentStatus,
        totalAmount,
        input.paid_amount_vnd,
        totalCogs,
        dueDate,
        input.notes ?? null,
      ],
      client,
    );

    const createdItems: B2bOrderItemDto[] = [];
    for (const p of planned) {
      const it = await dbQueryOne<B2bOrderItemRow>(
        `INSERT INTO public.b2b_order_items (
           b2b_order_id, item_id, lot_id, quantity_base_unit,
           unit_price_vnd, unit_cost_vnd, line_total_vnd
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          createdOrder!.id,
          p.itemId,
          p.lotId,
          p.takeQty,
          p.unitPriceVnd,
          p.unitCostVnd,
          p.lineTotal,
        ],
        client,
      );
      createdItems.push({ ...it!, created_at: toIsoString(it!.created_at) });
    }

    const debitLedger = await dbQueryOne<B2bLedgerRow>(
      `INSERT INTO public.b2b_debt_ledger (
         customer_id, b2b_order_id, entry_type, amount_vnd, balance_after_vnd, recorded_by, reference_note
       )
       VALUES ($1, $2, 'DEBIT_INVOICE', $3, $4, $5, $6)
       RETURNING *`,
      [
        customer.id,
        createdOrder!.id,
        totalAmount,
        customer.current_debt_vnd + totalAmount,
        actor.id,
        `Ghi nợ đơn bán sỉ ${orderCode}`,
      ],
      client,
    );

    let finalLedgerRow = debitLedger!;
    if (input.paid_amount_vnd > 0) {
      const creditLedger = await dbQueryOne<B2bLedgerRow>(
        `INSERT INTO public.b2b_debt_ledger (
           customer_id, b2b_order_id, entry_type, amount_vnd, balance_after_vnd, recorded_by, reference_note
         )
         VALUES ($1, $2, 'CREDIT_PAYMENT', $3, $4, $5, $6)
         RETURNING *`,
        [
          customer.id,
          createdOrder!.id,
          input.paid_amount_vnd,
          creditCheck.projected_debt_vnd,
          actor.id,
          `Thanh toán ngay đơn bán sỉ ${orderCode}`,
        ],
        client,
      );
      finalLedgerRow = creditLedger!;
    }

    await client.query(
      `UPDATE public.b2b_customers SET current_debt_vnd = $2 WHERE id = $1`,
      [customer.id, creditCheck.projected_debt_vnd],
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.warehouse_store_id,
        action: 'B2B_ORDER_CREATED',
        targetTable: 'b2b_orders',
        targetId: createdOrder!.id,
        reason: `Tạo đơn bán sỉ ${orderCode} cho ${customer.shop_name}`,
        payload: {
          order_code: orderCode,
          total_amount_vnd: totalAmount,
          paid_amount_vnd: input.paid_amount_vnd,
          projected_debt_vnd: creditCheck.projected_debt_vnd,
        },
      },
      client,
    );

    return {
      order: {
        id: createdOrder!.id,
        order_code: createdOrder!.order_code,
        warehouse_store_id: createdOrder!.warehouse_store_id,
        customer_id: customer.id,
        created_by: createdOrder!.created_by,
        payment_method: createdOrder!.payment_method,
        payment_status: createdOrder!.payment_status,
        total_amount_vnd: createdOrder!.total_amount_vnd,
        paid_amount_vnd: createdOrder!.paid_amount_vnd,
        cogs_amount_vnd: createdOrder!.cogs_amount_vnd,
        due_date: createdOrder!.due_date,
        notes: createdOrder!.notes,
        created_at: toIsoString(createdOrder!.created_at),
        updated_at: toIsoString(createdOrder!.updated_at),
        items: createdItems,
      },
      items: createdItems,
      debt_added_vnd: creditCheck.debt_added_vnd,
      projected_debt_vnd: creditCheck.projected_debt_vnd,
      remaining_credit_vnd: creditCheck.remaining_credit_vnd,
      ledger_entry: {
        ...finalLedgerRow,
        created_at: toIsoString(finalLedgerRow.created_at),
      },
    };
  });
}

/**
 * B2C Retail Coffee Sale directly at Central Warehouse (Paid immediately, FIFO stock deduction)
 */
export async function createB2cRetailOrder(
  actor: AuthActor,
  input: CreateB2cRetailOrderInput,
): Promise<B2bOrderRow & { items: B2bOrderItemDto[] }> {
  return withTransaction(async (client) => {
    const planned: Array<{
      itemId: string;
      lotId: string;
      takeQty: number;
      unitPriceVnd: number;
      unitCostVnd: number;
      lineTotal: number;
      cogs: number;
    }> = [];
    const lotDeductions = new Map<string, { remaining: number; status: LotStatus }>();
    let totalAmount = 0;
    let totalCogs = 0;

    for (const line of input.items) {
      const item = await dbQueryOne<{
        id: string;
        sku: string;
        base_unit: BaseUnit;
        retail_price_vnd: number;
        internal_transfer_price_vnd: number;
      }>(
        `SELECT id, sku, base_unit, retail_price_vnd, internal_transfer_price_vnd
         FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
        [line.item_id],
        client,
      );
      if (!item) {
        throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm bán lẻ');
      }
      const unitPriceVnd =
        item.retail_price_vnd > 0
          ? item.retail_price_vnd
          : item.internal_transfer_price_vnd;
      if (unitPriceVnd <= 0) {
        throw new WarehouseDomainError(
          400,
          'NO_RETAIL_PRICE',
          `Sản phẩm ${item.sku} chưa được cấu hình giá bán lẻ B2C`,
        );
      }

      const lotsRes = await dbQuery<{ id: string; remaining_qty: number; unit_cost_vnd: number }>(
        `SELECT id, remaining_qty, unit_cost_vnd
         FROM public.warehouse_lots
         WHERE store_id = $1 AND item_id = $2 AND status = 'AVAILABLE' AND remaining_qty > 0
         ORDER BY COALESCE(roast_date, (received_at AT TIME ZONE 'UTC')::date) ASC,
                  received_at ASC, lot_code ASC, id ASC
         FOR UPDATE`,
        [input.warehouse_store_id, item.id],
        client,
      );

      let rem = line.quantity_base_unit;
      for (const lot of lotsRes.rows) {
        if (rem <= 0) break;
        const currentRemaining = lotDeductions.get(lot.id)?.remaining ?? lot.remaining_qty;
        if (currentRemaining <= 0) continue;

        const take = roundQty2(Math.min(currentRemaining, rem));
        const after = roundQty2(currentRemaining - take);
        const billingQty = convertToKgForTierPricing(take, item.base_unit);
        const lineTotal = Math.round(billingQty * unitPriceVnd);
        const cogs = calculateStockValueVnd(take, lot.unit_cost_vnd, item.base_unit);

        planned.push({
          itemId: item.id,
          lotId: lot.id,
          takeQty: take,
          unitPriceVnd,
          unitCostVnd: lot.unit_cost_vnd,
          lineTotal,
          cogs,
        });
        lotDeductions.set(lot.id, {
          remaining: after,
          status: after === 0 ? 'DEPLETED' : 'AVAILABLE',
        });
        totalAmount += lineTotal;
        totalCogs += cogs;
        rem = roundQty2(rem - take);
      }

      if (rem > 0) {
        throw new WarehouseDomainError(
          409,
          'INSUFFICIENT_FIFO_STOCK',
          `Kho Tổng không đủ tồn bán lẻ cho ${item.sku}`,
        );
      }
    }

    for (const [lotId, mut] of lotDeductions.entries()) {
      await client.query(
        `UPDATE public.warehouse_lots SET remaining_qty = $2, status = $3 WHERE id = $1`,
        [lotId, mut.remaining, mut.status],
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const orderCode = `B2C-${todayStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const createdOrder = await dbQueryOne<B2bOrderRow>(
      `INSERT INTO public.b2b_orders (
         order_code, warehouse_store_id, customer_id, created_by, sale_channel,
         retail_customer_name, retail_customer_phone, payment_method, payment_status,
         total_amount_vnd, paid_amount_vnd, cogs_amount_vnd, notes
       )
       VALUES ($1, $2, NULL, $3, 'B2C_RETAIL', $4, $5, $6, 'PAID', $7, $7, $8, $9)
       RETURNING *`,
      [
        orderCode,
        input.warehouse_store_id,
        actor.id,
        input.retail_customer_name,
        input.retail_customer_phone ?? null,
        input.payment_method,
        totalAmount,
        totalCogs,
        input.notes ?? null,
      ],
      client,
    );

    const createdItems: B2bOrderItemDto[] = [];
    for (const p of planned) {
      const it = await dbQueryOne<B2bOrderItemRow>(
        `INSERT INTO public.b2b_order_items (
           b2b_order_id, item_id, lot_id, quantity_base_unit,
           unit_price_vnd, unit_cost_vnd, line_total_vnd
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [createdOrder!.id, p.itemId, p.lotId, p.takeQty, p.unitPriceVnd, p.unitCostVnd, p.lineTotal],
        client,
      );
      createdItems.push({ ...it!, created_at: toIsoString(it!.created_at) });
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.warehouse_store_id,
        action: 'WAREHOUSE_B2C_RETAIL_ORDER_CREATED',
        targetTable: 'b2b_orders',
        targetId: createdOrder!.id,
        reason: `Bán lẻ B2C ${orderCode} cho ${input.retail_customer_name}`,
        payload: { order_code: orderCode, total_amount_vnd: totalAmount },
      },
      client,
    );

    return {
      ...createdOrder!,
      created_at: toIsoString(createdOrder!.created_at),
      updated_at: toIsoString(createdOrder!.updated_at),
      items: createdItems,
    };
  });
}

export async function recordDebtPayment(
  actor: AuthActor,
  input: RecordB2bDebtPaymentDTO,
): Promise<RecordB2bDebtPaymentResultDTO> {
  return withTransaction(async (client) => {
    const customer = await dbQueryOne<B2bCustomerRow>(
      `SELECT * FROM public.b2b_customers WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
      [input.customer_id],
      client,
    );
    if (!customer) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng sỉ B2B');
    }
    if (input.payment_amount_vnd > customer.current_debt_vnd) {
      throw new WarehouseDomainError(
        409,
        'PAYMENT_EXCEEDS_CURRENT_DEBT',
        `Số tiền thu (${input.payment_amount_vnd.toLocaleString('vi-VN')} đ) lớn hơn dư nợ hiện tại (${customer.current_debt_vnd.toLocaleString('vi-VN')} đ)`,
      );
    }

    const pendingRes = await dbQuery<B2bOrderRow>(
      `SELECT * FROM public.b2b_orders
       WHERE customer_id = $1 AND sale_channel = 'B2B_WHOLESALE'
         AND payment_status = 'PENDING' AND paid_amount_vnd < total_amount_vnd
       ORDER BY created_at ASC, order_code ASC, id ASC
       FOR UPDATE`,
      [customer.id],
      client,
    );

    const settlement = settleFifoPendingInvoices(
      pendingRes.rows.map((o) => ({
        id: o.id,
        order_code: o.order_code,
        ordered_at: toIsoString(o.created_at),
        total_amount_vnd: o.total_amount_vnd,
        paid_amount_vnd: o.paid_amount_vnd,
        payment_status: o.payment_status,
      })),
      input.payment_amount_vnd,
    );

    for (const slice of settlement.settled) {
      await client.query(
        `UPDATE public.b2b_orders
         SET paid_amount_vnd = $2, payment_status = $3
         WHERE id = $1`,
        [slice.order_id, slice.new_paid_amount_vnd, slice.new_payment_status],
      );
    }

    const previousDebtVnd = customer.current_debt_vnd;
    const newDebtVnd = previousDebtVnd - input.payment_amount_vnd;

    await client.query(
      `UPDATE public.b2b_customers SET current_debt_vnd = $2 WHERE id = $1`,
      [customer.id, newDebtVnd],
    );

    const ledgerEntry = await dbQueryOne<B2bLedgerRow>(
      `INSERT INTO public.b2b_debt_ledger (
         customer_id, b2b_order_id, entry_type, amount_vnd, balance_after_vnd, recorded_by, reference_note
       )
       VALUES ($1, NULL, 'CREDIT_PAYMENT', $2, $3, $4, $5)
       RETURNING *`,
      [
        customer.id,
        input.payment_amount_vnd,
        newDebtVnd,
        actor.id,
        input.reference_note ?? 'Thu nợ khách sỉ FIFO',
      ],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: input.warehouse_store_id,
        action: 'B2B_DEBT_PAYMENT_RECORDED',
        targetTable: 'b2b_debt_ledger',
        targetId: ledgerEntry!.id,
        reason: `Thu nợ ${input.payment_amount_vnd.toLocaleString('vi-VN')} đ của ${customer.shop_name}`,
        payload: {
          customer_id: customer.id,
          previous_debt_vnd: previousDebtVnd,
          new_debt_vnd: newDebtVnd,
          settled_invoices: settlement.settled.length,
        },
      },
      client,
    );

    return {
      customer_id: customer.id,
      payment_amount_vnd: input.payment_amount_vnd,
      previous_debt_vnd: previousDebtVnd,
      new_debt_vnd: newDebtVnd,
      ledger_entry: {
        ...ledgerEntry!,
        created_at: toIsoString(ledgerEntry!.created_at),
      },
      settled_orders: settlement.settled,
    };
  });
}
