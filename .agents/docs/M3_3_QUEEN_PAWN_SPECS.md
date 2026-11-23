# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M3.3 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **8 files (4 + 4)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1–M1.3, M2.1–M2.3, M3.1 (`b2bAndTransferMath.ts` + M3 schemas/types), M3.2 (`@cf19/api` `/api/v1/b2b/*` & `/api/v1/transfers/*`).
- **Cam kết tương thích ngược:** Giữ nguyên toàn bộ **28/28 Vitest tests của M1.3 + M2.3** PASS tuyệt đối!

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# TYPED B2B & TRANSFER API CLIENT + 3 WAREHOUSE PORTAL PANELS (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 4 file dưới đây cho tầng API Client và 3 panel B2B / AR Aging / Dispatch Pha 1 của `@cf19/web`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thêm import thừa gây lỗi `noUnusedLocals`, không đổi tên props hay hàm.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `StoreTransferReplenishmentPanel.tsx`, `WarehouseLayout.tsx`, `StoreManagerLayout.tsx`, hay `m3-b2b-transfers-ui.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M3.3 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\api\b2bAndTransferApi.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\features\b2b\B2bOrderTieredPricingPanel.tsx` (Tạo mới)
3. `C:\bib\cf_19\apps\web\src\features\b2b\B2bArAgingAndLedgerPanel.tsx` (Tạo mới)
4. `C:\bib\cf_19\apps\web\src\features\transfers\WarehouseTransferDispatchPanel.tsx` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\api\b2bAndTransferApi.ts`
```ts
import {
  SEED_IDS,
  calculateB2bCreditCheck,
  calculateInternalTransferTotalVnd,
  classifyArAgingBucket,
  compareFifoLots,
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
  type B2bPriceTierDto,
  type CreateB2bOrderDTO,
  type CreateB2bOrderResultDTO,
  type CreateInternalTransferRequest,
  type InternalTransferDispatchResultDTO,
  type InternalTransferDto,
  type InternalTransferItemDto,
  type InternalTransferReconcileResultDTO,
  type LotStatus,
  type PaymentStatus,
  type ReconcileInternalTransferInput,
  type RecordB2bDebtPaymentDTO,
  type RecordB2bDebtPaymentResultDTO,
  type StoreSafeWarehouseLotDto,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
} from '@cf19/shared';
import { ApiClientError, type ApiCallResult } from './apiClient';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

const BASE_TS = '2026-11-22T01:00:00.000Z';

const BUCKET_RANK: Record<ArAgingBucket, number> = {
  CURRENT: 0,
  OVERDUE_1_30: 1,
  OVERDUE_31_60: 2,
  OVERDUE_60_PLUS: 3,
};

interface OfflineM3State {
  items: WarehouseInventoryItemDto[];
  lots: WarehouseLotFullDto[];
  customers: B2bCustomerDto[];
  priceTiers: B2bPriceTierDto[];
  orders: B2bOrderDto[];
  orderItems: B2bOrderItemDto[];
  debtLedger: B2bDebtLedgerEntryDto[];
  transfers: InternalTransferDto[];
  transferItems: InternalTransferItemDto[];
}

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDaysIso(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function computeDaysOverdue(dueDateIso: string | null, asOfDateIso: string): number {
  if (!dueDateIso) {
    return 0;
  }
  const dueMs = Date.parse(`${dueDateIso}T00:00:00.000Z`);
  const asOfMs = Date.parse(`${asOfDateIso}T00:00:00.000Z`);
  if (Number.isNaN(dueMs) || Number.isNaN(asOfMs)) {
    return 0;
  }
  return Math.floor((asOfMs - dueMs) / 86_400_000);
}

function createOfflineM3Seed(): OfflineM3State {
  return {
    items: [
      {
        id: SEED_IDS.inventoryItems.roastedRobustaMed,
        organization_id: SEED_IDS.organization.cf19,
        sku: 'RC-ROB-MED',
        name: 'Cà phê hạt rang Robusta Medium (Kg)',
        category: 'ROASTED_COFFEE',
        base_unit: 'g',
        min_stock_threshold: 3000,
        moving_avg_cost_vnd: 125000,
        internal_transfer_price_vnd: 155000,
        retail_price_vnd: 210000,
        is_active: true,
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
      {
        id: SEED_IDS.inventoryItems.roastedSignatureBlend,
        organization_id: SEED_IDS.organization.cf19,
        sku: 'RC-BLEND-SIG',
        name: 'Cà phê hạt rang Signature Blend 70/30 (Kg)',
        category: 'ROASTED_COFFEE',
        base_unit: 'g',
        min_stock_threshold: 3000,
        moving_avg_cost_vnd: 158000,
        internal_transfer_price_vnd: 195000,
        retail_price_vnd: 265000,
        is_active: true,
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
      {
        id: SEED_IDS.inventoryItems.condensedMilk,
        organization_id: SEED_IDS.organization.cf19,
        sku: 'ING-COND-MILK',
        name: 'Sữa đặc có đường Ngôi Sao Phương Nam',
        category: 'INGREDIENT',
        base_unit: 'ml',
        min_stock_threshold: 2000,
        moving_avg_cost_vnd: 52,
        internal_transfer_price_vnd: 60,
        retail_price_vnd: 0,
        is_active: true,
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
    ],
    lots: [
      {
        id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
        store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-CW-RC-ROB-001',
        supplier_name: 'Xưởng Rang Nội Bộ CF19',
        moisture_pct: 3.1,
        roast_date: '2026-11-10',
        received_at: '2026-11-10T10:30:00.000Z',
        expiry_date: '2027-02-10',
        initial_qty: 24900,
        remaining_qty: 24900,
        unit_cost_vnd: 124500,
        shipping_cost_vnd: 0,
        status: 'AVAILABLE',
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
      {
        id: SEED_IDS.warehouseLots.cwRoastedRobusta02,
        store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_code: 'LOT-CW-RC-ROB-002',
        supplier_name: 'Xưởng Rang Nội Bộ CF19',
        moisture_pct: 3.0,
        roast_date: '2026-11-18',
        received_at: '2026-11-18T14:00:00.000Z',
        expiry_date: '2027-02-18',
        initial_qty: 20000,
        remaining_qty: 20000,
        unit_cost_vnd: 126000,
        shipping_cost_vnd: 0,
        status: 'AVAILABLE',
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
    ],
    customers: [
      {
        id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        organization_id: SEED_IDS.organization.cf19,
        code: 'B2B-001',
        name: 'Nguyễn Thành Nam',
        shop_name: 'Quán Cà Phê Phố Núi',
        phone: '0912345001',
        address: '42 Quang Trung, Thị Trấn',
        price_tier: 'TIER_2',
        credit_limit_vnd: 50000000,
        current_debt_vnd: 12500000,
        payment_term_days: 15,
        is_active: true,
      },
      {
        id: SEED_IDS.b2bCustomers.hoaDoBakery,
        organization_id: SEED_IDS.organization.cf19,
        code: 'B2B-002',
        name: 'Trần Mỹ Hạnh',
        shop_name: 'Tiệm Bánh & Trà Hoa Đỏ',
        phone: '0912345002',
        address: '77 Phan Bội Châu, Thị Trấn',
        price_tier: 'TIER_1',
        credit_limit_vnd: 20000000,
        current_debt_vnd: 0,
        payment_term_days: 7,
        is_active: true,
      },
    ],
    priceTiers: [
      {
        id: SEED_IDS.b2bPriceTiers.robustaTier1,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        price_tier: 'TIER_1',
        min_qty_kg: 0,
        unit_price_vnd: 185000,
      },
      {
        id: SEED_IDS.b2bPriceTiers.robustaTier2,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        price_tier: 'TIER_2',
        min_qty_kg: 10,
        unit_price_vnd: 172000,
      },
      {
        id: SEED_IDS.b2bPriceTiers.robustaTier3,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        price_tier: 'TIER_3',
        min_qty_kg: 50,
        unit_price_vnd: 160000,
      },
      {
        id: SEED_IDS.b2bPriceTiers.blendTier1,
        item_id: SEED_IDS.inventoryItems.roastedSignatureBlend,
        price_tier: 'TIER_1',
        min_qty_kg: 0,
        unit_price_vnd: 240000,
      },
    ],
    orders: [
      {
        id: '92000000-0000-4000-8000-000000000001',
        order_code: 'B2B-20261101-001',
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        created_by: SEED_IDS.users.warehouseManager,
        payment_method: 'VIETQR',
        payment_status: 'PENDING',
        total_amount_vnd: 18500000,
        paid_amount_vnd: 6000000,
        cogs_amount_vnd: 12450000,
        due_date: '2026-11-16',
        notes: 'Đơn sỉ đầu tháng 11 (gối đầu 15 ngày)',
        created_at: '2026-11-01T08:00:00.000Z',
        updated_at: '2026-11-01T08:00:00.000Z',
      },
    ],
    orderItems: [
      {
        id: '92100000-0000-4000-8000-000000000001',
        b2b_order_id: '92000000-0000-4000-8000-000000000001',
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        lot_id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
        quantity_base_unit: 100000,
        unit_price_vnd: 185000,
        unit_cost_vnd: 124500,
        line_total_vnd: 18500000,
        created_at: '2026-11-01T08:00:00.000Z',
      },
    ],
    debtLedger: [
      {
        id: '92200000-0000-4000-8000-000000000001',
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        b2b_order_id: '92000000-0000-4000-8000-000000000001',
        entry_type: 'DEBIT_INVOICE',
        amount_vnd: 18500000,
        balance_after_vnd: 18500000,
        recorded_by: SEED_IDS.users.warehouseManager,
        reference_note: 'Ghi nợ đơn bán sỉ B2B-20261101-001',
        created_at: '2026-11-01T08:00:00.000Z',
      },
      {
        id: '92200000-0000-4000-8000-000000000002',
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        b2b_order_id: '92000000-0000-4000-8000-000000000001',
        entry_type: 'CREDIT_PAYMENT',
        amount_vnd: 6000000,
        balance_after_vnd: 12500000,
        recorded_by: SEED_IDS.users.warehouseManager,
        reference_note: 'Thanh toán trước 6,000,000 đ khi nhận hàng',
        created_at: '2026-11-01T08:05:00.000Z',
      },
    ],
    transfers: [
      {
        id: SEED_IDS.internalTransfers.store01InitialRequest,
        transfer_code: 'TRF-20261122-001',
        from_warehouse_id: SEED_IDS.stores.centralWarehouse,
        to_store_id: SEED_IDS.stores.store01,
        status: 'REQUESTED',
        total_internal_value_vnd: 775000,
        requested_by: SEED_IDS.users.storeManager01,
        dispatched_by: null,
        received_by: null,
        requested_at: BASE_TS,
        dispatched_at: null,
        received_at: null,
        notes: 'Phiếu xin bổ sung 5kg Robusta rang cho Quán 1',
      },
    ],
    transferItems: [
      {
        id: '93000000-0000-4000-8000-000000000001',
        transfer_id: SEED_IDS.internalTransfers.store01InitialRequest,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        source_lot_id: null,
        destination_lot_id: null,
        requested_qty: 5000,
        dispatched_qty: 0,
        received_qty: 0,
        internal_unit_price_vnd: 155000,
        line_total_vnd: 775000,
      },
    ],
  };
}

let offlineM3: OfflineM3State = createOfflineM3Seed();

export function resetOfflineB2bAndTransfersState(): void {
  offlineM3 = createOfflineM3Seed();
}

export function getOfflineDebtLedger(): B2bDebtLedgerEntryDto[] {
  return [...offlineM3.debtLedger]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => structuredClone(e));
}

export function getOfflineM3Items(): WarehouseInventoryItemDto[] {
  return offlineM3.items.map((i) => structuredClone(i));
}

export function offlineGetB2bOverview(
  asOfDate: string = '2026-11-22',
): B2bCatalogOverviewDTO {
  let totalReceivables = 0;
  let totalCurrent = 0;
  let total1To30 = 0;
  let total31To60 = 0;
  let total60Plus = 0;

  const rows: ArCustomerAgingRowDTO[] = offlineM3.customers.map((customer) => {
    const pending = offlineM3.orders.filter(
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
      const bucket = classifyArAgingBucket(
        computeDaysOverdue(ord.due_date, asOfDate),
      );
      if (BUCKET_RANK[bucket] > BUCKET_RANK[worstBucket]) {
        worstBucket = bucket;
      }
      if (bucket === 'CURRENT') currentVnd += outstanding;
      else if (bucket === 'OVERDUE_1_30') overdue1To30 += outstanding;
      else if (bucket === 'OVERDUE_31_60') overdue31To60 += outstanding;
      else overdue60Plus += outstanding;
    }

    const totalOutstanding =
      currentVnd + overdue1To30 + overdue31To60 + overdue60Plus;
    totalReceivables += totalOutstanding;
    totalCurrent += currentVnd;
    total1To30 += overdue1To30;
    total31To60 += overdue31To60;
    total60Plus += overdue60Plus;

    return {
      customer: structuredClone(customer),
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
    customers: rows,
  };

  return {
    customers: offlineM3.customers.map((c) => structuredClone(c)),
    price_tiers: offlineM3.priceTiers.map((t) => structuredClone(t)),
    recent_orders: offlineM3.orders
      .map((o) => ({
        ...structuredClone(o),
        items: offlineM3.orderItems
          .filter((it) => it.b2b_order_id === o.id)
          .map((it) => structuredClone(it)),
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    aging_summary: agingSummary,
  };
}

export function offlineQuoteB2bPrice(
  query: B2bPriceQuoteQueryDTO,
): B2bPriceQuoteResultDTO {
  const customer = offlineM3.customers.find((c) => c.id === query.customer_id);
  const item = offlineM3.items.find((i) => i.id === query.item_id);
  if (!customer || !item) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Customer or item not found');
  }
  const resolved = resolveB2bTieredUnitPriceVnd({
    qtyBaseUnit: query.quantity_base_unit,
    baseUnit: item.base_unit,
    customerPriceTier: customer.price_tier,
    tiers: offlineM3.priceTiers.filter((t) => t.item_id === item.id),
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

export function offlineCreateB2bOrder(
  actorId: string,
  input: CreateB2bOrderDTO,
): CreateB2bOrderResultDTO {
  const customer = offlineM3.customers.find((c) => c.id === input.customer_id);
  if (!customer) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Customer not found');
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
  const deductions = new Map<string, number>();
  let totalAmount = 0;
  let totalCogs = 0;

  for (const line of input.items) {
    const item = offlineM3.items.find((i) => i.id === line.item_id);
    if (!item) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Inventory item not found');
    }
    const quote = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: line.quantity_base_unit,
      baseUnit: item.base_unit,
      customerPriceTier: customer.price_tier,
      tiers: offlineM3.priceTiers.filter((t) => t.item_id === item.id),
      fallbackRetailPriceVnd: item.retail_price_vnd,
      fallbackInternalTransferPriceVnd: item.internal_transfer_price_vnd,
    });

    const lots = offlineM3.lots
      .filter(
        (l) =>
          l.store_id === input.warehouse_store_id &&
          l.item_id === item.id &&
          l.status === 'AVAILABLE' &&
          l.remaining_qty > 0,
      )
      .sort(compareFifoLots);

    let rem = line.quantity_base_unit;
    for (const lot of lots) {
      if (rem <= 0) break;
      const used = deductions.get(lot.id) ?? 0;
      const avail = roundQty2(lot.remaining_qty - used);
      if (avail <= 0) continue;

      const take = roundQty2(Math.min(avail, rem));
      const billing = convertToKgForTierPricing(take, item.base_unit);
      const lineTotal = Math.round(billing * quote.unit_price_vnd);
      const cogs = Math.round(billing * lot.unit_cost_vnd);
      planned.push({
        itemId: item.id,
        lotId: lot.id,
        takeQty: take,
        unitPriceVnd: quote.unit_price_vnd,
        unitCostVnd: lot.unit_cost_vnd,
        lineTotal,
        cogs,
      });
      deductions.set(lot.id, roundQty2(used + take));
      totalAmount += lineTotal;
      totalCogs += cogs;
      rem = roundQty2(rem - take);
    }

    if (rem > 0) {
      throw new ApiClientError(409, 'INSUFFICIENT_FIFO_STOCK', 'Insufficient FIFO stock');
    }
  }

  const creditCheck = calculateB2bCreditCheck({
    currentDebtVnd: customer.current_debt_vnd,
    creditLimitVnd: customer.credit_limit_vnd,
    totalAmountVnd: totalAmount,
    paidAmountVnd: input.paid_amount_vnd,
  });
  if (creditCheck.exceeds_credit_limit) {
    throw new ApiClientError(409, 'CREDIT_LIMIT_EXCEEDED', 'Credit limit exceeded');
  }

  const nowIso = new Date().toISOString();
  for (const [lotId, qty] of deductions.entries()) {
    const lot = offlineM3.lots.find((l) => l.id === lotId)!;
    lot.remaining_qty = roundQty2(lot.remaining_qty - qty);
    lot.status = lot.remaining_qty === 0 ? 'DEPLETED' : 'AVAILABLE';
    lot.updated_at = nowIso;
  }

  const orderId = crypto.randomUUID();
  const orderCode =
    input.order_code?.trim() ??
    `B2B-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(offlineM3.orders.length + 1).padStart(3, '0')}`;
  const paymentStatus: PaymentStatus =
    input.paid_amount_vnd === totalAmount ? 'PAID' : 'PENDING';

  const order: B2bOrderDto = {
    id: orderId,
    order_code: orderCode,
    warehouse_store_id: input.warehouse_store_id,
    customer_id: customer.id,
    created_by: actorId,
    payment_method: input.payment_method,
    payment_status: paymentStatus,
    total_amount_vnd: totalAmount,
    paid_amount_vnd: input.paid_amount_vnd,
    cogs_amount_vnd: totalCogs,
    due_date: addDaysIso(nowIso.slice(0, 10), customer.payment_term_days),
    notes: input.notes ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };
  offlineM3.orders.push(order);

  const items: B2bOrderItemDto[] = planned.map((p) => {
    const rec: B2bOrderItemDto = {
      id: crypto.randomUUID(),
      b2b_order_id: orderId,
      item_id: p.itemId,
      lot_id: p.lotId,
      quantity_base_unit: p.takeQty,
      unit_price_vnd: p.unitPriceVnd,
      unit_cost_vnd: p.unitCostVnd,
      line_total_vnd: p.lineTotal,
      created_at: nowIso,
    };
    offlineM3.orderItems.push(rec);
    return rec;
  });

  const debitEntry: B2bDebtLedgerEntryDto = {
    id: crypto.randomUUID(),
    customer_id: customer.id,
    b2b_order_id: orderId,
    entry_type: 'DEBIT_INVOICE',
    amount_vnd: totalAmount,
    balance_after_vnd: customer.current_debt_vnd + totalAmount,
    recorded_by: actorId,
    reference_note: `Ghi nợ đơn bán sỉ ${orderCode}`,
    created_at: nowIso,
  };
  offlineM3.debtLedger.push(debitEntry);

  let finalLedger = debitEntry;
  if (input.paid_amount_vnd > 0) {
    const creditEntry: B2bDebtLedgerEntryDto = {
      id: crypto.randomUUID(),
      customer_id: customer.id,
      b2b_order_id: orderId,
      entry_type: 'CREDIT_PAYMENT',
      amount_vnd: input.paid_amount_vnd,
      balance_after_vnd: creditCheck.projected_debt_vnd,
      recorded_by: actorId,
      reference_note: `Thanh toán ngay đơn bán sỉ ${orderCode}`,
      created_at: nowIso,
    };
    offlineM3.debtLedger.push(creditEntry);
    finalLedger = creditEntry;
  }

  customer.current_debt_vnd = creditCheck.projected_debt_vnd;

  return {
    order: { ...structuredClone(order), items: items.map((i) => structuredClone(i)) },
    items: items.map((i) => structuredClone(i)),
    debt_added_vnd: creditCheck.debt_added_vnd,
    projected_debt_vnd: creditCheck.projected_debt_vnd,
    remaining_credit_vnd: creditCheck.remaining_credit_vnd,
    ledger_entry: structuredClone(finalLedger),
  };
}

export function offlineRecordB2bDebtPayment(
  actorId: string,
  input: RecordB2bDebtPaymentDTO,
): RecordB2bDebtPaymentResultDTO {
  const customer = offlineM3.customers.find((c) => c.id === input.customer_id);
  if (!customer) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Customer not found');
  }
  if (input.payment_amount_vnd > customer.current_debt_vnd) {
    throw new ApiClientError(
      409,
      'PAYMENT_EXCEEDS_CURRENT_DEBT',
      'Payment exceeds current debt',
    );
  }

  const pending = offlineM3.orders.filter(
    (o) =>
      o.customer_id === customer.id &&
      o.payment_status === 'PENDING' &&
      o.paid_amount_vnd < o.total_amount_vnd,
  );
  const settlement = settleFifoPendingInvoices(
    pending.map((o) => ({
      id: o.id,
      order_code: o.order_code,
      ordered_at: o.created_at,
      total_amount_vnd: o.total_amount_vnd,
      paid_amount_vnd: o.paid_amount_vnd,
      payment_status: o.payment_status,
    })),
    input.payment_amount_vnd,
  );

  const nowIso = new Date().toISOString();
  for (const slice of settlement.settled) {
    const ord = offlineM3.orders.find((o) => o.id === slice.order_id)!;
    ord.paid_amount_vnd = slice.new_paid_amount_vnd;
    ord.payment_status = slice.new_payment_status;
    ord.updated_at = nowIso;
  }

  const prevDebt = customer.current_debt_vnd;
  const newDebt = prevDebt - input.payment_amount_vnd;
  customer.current_debt_vnd = newDebt;

  const ledgerEntry: B2bDebtLedgerEntryDto = {
    id: crypto.randomUUID(),
    customer_id: customer.id,
    b2b_order_id: null,
    entry_type: 'CREDIT_PAYMENT',
    amount_vnd: input.payment_amount_vnd,
    balance_after_vnd: newDebt,
    recorded_by: actorId,
    reference_note: input.reference_note ?? 'Thu nợ khách sỉ FIFO',
    created_at: nowIso,
  };
  offlineM3.debtLedger.push(ledgerEntry);

  return {
    customer_id: customer.id,
    payment_amount_vnd: input.payment_amount_vnd,
    previous_debt_vnd: prevDebt,
    new_debt_vnd: newDebt,
    ledger_entry: structuredClone(ledgerEntry),
    settled_orders: settlement.settled,
  };
}

export function offlineListTransfers(storeId?: string): InternalTransferDto[] {
  return offlineM3.transfers
    .filter((t) => (!storeId ? true : t.to_store_id === storeId))
    .map((t) => ({
      ...structuredClone(t),
      items: offlineM3.transferItems
        .filter((it) => it.transfer_id === t.id)
        .map((it) => structuredClone(it)),
    }))
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
}

export function offlineRequestTransfer(
  actorId: string,
  input: CreateInternalTransferRequest,
): InternalTransferDto {
  const nowIso = new Date().toISOString();
  const transferId = crypto.randomUUID();
  const code = `TRF-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(offlineM3.transfers.length + 1).padStart(3, '0')}`;

  const createdItems: InternalTransferItemDto[] = [];
  const priceInputs: Array<{
    qty_base_unit: number;
    base_unit: 'g' | 'ml' | 'pcs';
    internal_unit_price_vnd: number;
  }> = [];

  for (const line of input.items) {
    const item = offlineM3.items.find((i) => i.id === line.item_id);
    if (!item) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Inventory item not found');
    }
    const billing = convertToKgForTierPricing(line.requested_qty, item.base_unit);
    const lineTotal = Math.round(billing * item.internal_transfer_price_vnd);
    priceInputs.push({
      qty_base_unit: line.requested_qty,
      base_unit: item.base_unit,
      internal_unit_price_vnd: item.internal_transfer_price_vnd,
    });
    createdItems.push({
      id: crypto.randomUUID(),
      transfer_id: transferId,
      item_id: item.id,
      source_lot_id: null,
      destination_lot_id: null,
      requested_qty: line.requested_qty,
      dispatched_qty: 0,
      received_qty: 0,
      internal_unit_price_vnd: item.internal_transfer_price_vnd,
      line_total_vnd: lineTotal,
    });
  }

  const totalVnd = calculateInternalTransferTotalVnd(priceInputs);
  const transfer: InternalTransferDto = {
    id: transferId,
    transfer_code: code,
    from_warehouse_id: input.from_warehouse_id,
    to_store_id: input.to_store_id,
    status: 'REQUESTED',
    total_internal_value_vnd: totalVnd,
    requested_by: actorId,
    dispatched_by: null,
    received_by: null,
    requested_at: nowIso,
    dispatched_at: null,
    received_at: null,
    notes: input.notes ?? null,
  };
  offlineM3.transfers.push(transfer);
  offlineM3.transferItems.push(...createdItems);

  return {
    ...structuredClone(transfer),
    items: createdItems.map((i) => structuredClone(i)),
  };
}

export function offlineDispatchTransferFifo(
  actorId: string,
  transferId: string,
  notes?: string,
): InternalTransferDispatchResultDTO {
  const transfer = offlineM3.transfers.find((t) => t.id === transferId);
  if (!transfer) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Transfer not found');
  }
  if (transfer.status !== 'REQUESTED') {
    throw new ApiClientError(409, 'INVALID_TRANSFER_STATE', 'Transfer is not REQUESTED');
  }

  const items = offlineM3.transferItems.filter((it) => it.transfer_id === transferId);
  const nowIso = new Date().toISOString();

  for (const titem of items) {
    const candidate = offlineM3.lots
      .filter(
        (l) =>
          l.store_id === transfer.from_warehouse_id &&
          l.item_id === titem.item_id &&
          l.status === 'AVAILABLE' &&
          l.remaining_qty >= titem.requested_qty,
      )
      .sort(compareFifoLots)[0];
    if (!candidate) {
      throw new ApiClientError(409, 'INSUFFICIENT_FIFO_STOCK', 'Insufficient FIFO stock');
    }
    candidate.remaining_qty = roundQty2(candidate.remaining_qty - titem.requested_qty);
    candidate.status = (candidate.remaining_qty === 0 ? 'DEPLETED' : 'AVAILABLE') as LotStatus;
    titem.source_lot_id = candidate.id;
    titem.dispatched_qty = titem.requested_qty;
  }

  transfer.status = 'IN_TRANSIT';
  transfer.dispatched_by = actorId;
  transfer.dispatched_at = nowIso;
  if (notes) transfer.notes = notes;

  return {
    transfer: {
      ...structuredClone(transfer),
      items: items.map((i) => structuredClone(i)),
    },
    items: items.map((i) => structuredClone(i)),
  };
}

export function offlineReconcileTransfer(
  actorId: string,
  input: ReconcileInternalTransferInput,
): InternalTransferReconcileResultDTO {
  const transfer = offlineM3.transfers.find((t) => t.id === input.transfer_id);
  if (!transfer) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Transfer not found');
  }
  if (transfer.status !== 'IN_TRANSIT') {
    throw new ApiClientError(409, 'INVALID_TRANSFER_STATE', 'Transfer is not IN_TRANSIT');
  }

  const nowIso = new Date().toISOString();
  const createdLots: StoreSafeWarehouseLotDto[] = [];
  const reconciledItems: InternalTransferItemDto[] = [];
  let totalVnd = 0;

  for (const rec of input.items) {
    const titem = offlineM3.transferItems.find(
      (it) => it.id === rec.transfer_item_id && it.transfer_id === transfer.id,
    );
    if (!titem) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Transfer item not found');
    }
    if (rec.received_qty < 0 || rec.received_qty > titem.dispatched_qty) {
      throw new ApiClientError(400, 'INVALID_RECEIVED_QTY', 'received_qty exceeds dispatched_qty');
    }

    const invItem = offlineM3.items.find((i) => i.id === titem.item_id)!;
    const sourceLot = offlineM3.lots.find((l) => l.id === titem.source_lot_id);
    const billing = convertToKgForTierPricing(rec.received_qty, invItem.base_unit);
    const lineVnd = Math.round(billing * titem.internal_unit_price_vnd);
    totalVnd += lineVnd;

    titem.received_qty = rec.received_qty;
    titem.line_total_vnd = lineVnd;

    if (rec.received_qty > 0) {
      const destId = crypto.randomUUID();
      const destLotFull: WarehouseLotFullDto = {
        id: destId,
        store_id: transfer.to_store_id,
        item_id: titem.item_id,
        lot_code: `STORE-${transfer.transfer_code}-${titem.id.slice(0, 6).toUpperCase()}`,
        supplier_name: 'Kho Tổng CF19 (Chuyển Nội Bộ)',
        moisture_pct: sourceLot?.moisture_pct ?? null,
        roast_date: sourceLot?.roast_date ?? null,
        received_at: nowIso,
        expiry_date: sourceLot?.expiry_date ?? null,
        initial_qty: rec.received_qty,
        remaining_qty: rec.received_qty,
        unit_cost_vnd: titem.internal_unit_price_vnd,
        shipping_cost_vnd: 0,
        status: 'AVAILABLE',
        created_at: nowIso,
        updated_at: nowIso,
      };
      offlineM3.lots.push(destLotFull);
      titem.destination_lot_id = destId;

      // Strip origin cost keys for store-safe DTO
      const { unit_cost_vnd: _u, shipping_cost_vnd: _s, ...storeSafeLot } = destLotFull;
      void _u;
      void _s;
      createdLots.push(storeSafeLot);
    }

    reconciledItems.push(structuredClone(titem));
  }

  transfer.status = 'RECONCILED';
  transfer.total_internal_value_vnd = totalVnd;
  transfer.received_by = actorId;
  transfer.received_at = nowIso;

  return {
    transfer: {
      ...structuredClone(transfer),
      items: reconciledItems,
    },
    items: reconciledItems,
    created_store_lots: createdLots,
  };
}

async function m3FetchJson<T>(
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
      body.error?.code ?? 'M3_API_ERROR',
      body.error?.message ?? `HTTP ${response.status}`,
    );
  }
  return body.data as T;
}

export async function fetchB2bOverviewApi(
  actorId: string,
): Promise<ApiCallResult<B2bCatalogOverviewDTO>> {
  try {
    const data = await m3FetchJson<B2bCatalogOverviewDTO>('/api/v1/b2b/overview', actorId);
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineGetB2bOverview(), source: 'offline_fallback' };
  }
}

export async function createB2bOrderApi(
  actorId: string,
  payload: CreateB2bOrderDTO,
): Promise<ApiCallResult<CreateB2bOrderResultDTO>> {
  try {
    const data = await m3FetchJson<CreateB2bOrderResultDTO>('/api/v1/b2b/orders', actorId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineCreateB2bOrder(actorId, payload), source: 'offline_fallback' };
  }
}

export async function recordB2bDebtPaymentApi(
  actorId: string,
  payload: RecordB2bDebtPaymentDTO,
): Promise<ApiCallResult<RecordB2bDebtPaymentResultDTO>> {
  try {
    const data = await m3FetchJson<RecordB2bDebtPaymentResultDTO>(
      '/api/v1/b2b/debt-payments',
      actorId,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineRecordB2bDebtPayment(actorId, payload), source: 'offline_fallback' };
  }
}

export async function fetchTransfersApi(
  actorId: string,
  storeId?: string,
): Promise<ApiCallResult<InternalTransferDto[]>> {
  const qs = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  try {
    const data = await m3FetchJson<InternalTransferDto[]>(`/api/v1/transfers${qs}`, actorId);
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineListTransfers(storeId), source: 'offline_fallback' };
  }
}

export async function requestInternalTransferApi(
  actorId: string,
  payload: CreateInternalTransferRequest,
): Promise<ApiCallResult<InternalTransferDto>> {
  try {
    const data = await m3FetchJson<InternalTransferDto>('/api/v1/transfers/request', actorId, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineRequestTransfer(actorId, payload), source: 'offline_fallback' };
  }
}

export async function dispatchInternalTransferApi(
  actorId: string,
  transferId: string,
  notes?: string,
): Promise<ApiCallResult<InternalTransferDispatchResultDTO>> {
  try {
    const data = await m3FetchJson<InternalTransferDispatchResultDTO>(
      `/api/v1/transfers/${transferId}/dispatch`,
      actorId,
      { method: 'POST', body: JSON.stringify({ notes }) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineDispatchTransferFifo(actorId, transferId, notes),
      source: 'offline_fallback',
    };
  }
}

export async function reconcileInternalTransferApi(
  actorId: string,
  payload: ReconcileInternalTransferInput,
): Promise<ApiCallResult<InternalTransferReconcileResultDTO>> {
  try {
    const data = await m3FetchJson<InternalTransferReconcileResultDTO>(
      `/api/v1/transfers/${payload.transfer_id}/reconcile`,
      actorId,
      { method: 'POST', body: JSON.stringify({ items: payload.items, notes: payload.notes }) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return { data: offlineReconcileTransfer(actorId, payload), source: 'offline_fallback' };
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\src\features\b2b\B2bOrderTieredPricingPanel.tsx`
```tsx
import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ShoppingBag, Users } from 'lucide-react';
import {
  SEED_IDS,
  calculateB2bCreditCheck,
  resolveB2bTieredUnitPriceVnd,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
  type B2bPriceTierDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { createB2bOrderApi, getOfflineM3Items } from '../../api/b2bAndTransferApi';

export interface B2bOrderTieredPricingPanelProps {
  actorId: string;
  customers: B2bCustomerDto[];
  priceTiers: B2bPriceTierDto[];
  orders: B2bOrderDto[];
  onOrderCreated: (ledgerEntry: B2bDebtLedgerEntryDto | null) => Promise<void>;
}

export function B2bOrderTieredPricingPanel({
  actorId,
  customers,
  priceTiers,
  orders,
  onOrderCreated,
}: B2bOrderTieredPricingPanelProps) {
  const catalogItems = useMemo(() => getOfflineM3Items(), []);
  const [customerId, setCustomerId] = useState<string>(
    customers[0]?.id ?? SEED_IDS.b2bCustomers.phoNuiCoffee,
  );
  const [itemId, setItemId] = useState<string>(
    SEED_IDS.inventoryItems.roastedRobustaMed,
  );
  const [quantityG, setQuantityG] = useState<number>(15000);
  const [paidAmountVnd, setPaidAmountVnd] = useState<number>(500000);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );
  const selectedItem = useMemo(
    () => catalogItems.find((i) => i.id === itemId),
    [catalogItems, itemId],
  );

  const livePreview = useMemo(() => {
    if (!selectedCustomer || !selectedItem || quantityG <= 0) {
      return null;
    }
    const quote = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: quantityG,
      baseUnit: selectedItem.base_unit,
      customerPriceTier: selectedCustomer.price_tier,
      tiers: priceTiers.filter((t) => t.item_id === selectedItem.id),
      fallbackRetailPriceVnd: selectedItem.retail_price_vnd,
      fallbackInternalTransferPriceVnd: selectedItem.internal_transfer_price_vnd,
    });
    const safePaid = Math.min(Math.max(0, paidAmountVnd), quote.estimated_line_total_vnd);
    const credit = calculateB2bCreditCheck({
      currentDebtVnd: selectedCustomer.current_debt_vnd,
      creditLimitVnd: selectedCustomer.credit_limit_vnd,
      totalAmountVnd: quote.estimated_line_total_vnd,
      paidAmountVnd: safePaid,
    });
    return { quote, credit };
  }, [selectedCustomer, selectedItem, quantityG, paidAmountVnd, priceTiers]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await createB2bOrderApi(actorId, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: customerId,
        payment_method: 'VIETQR',
        paid_amount_vnd: Math.round(paidAmountVnd),
        items: [{ item_id: itemId, quantity_base_unit: quantityG }],
      });
      setSuccessMsg(
        `Đã tạo đơn sỉ ${res.data.order.order_code}: Tổng ${res.data.order.total_amount_vnd.toLocaleString('vi-VN')} đ (${res.data.items.length} lát cắt FIFO)`,
      );
      await onOrderCreated(res.data.ledger_entry);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể tạo đơn bán sỉ B2B.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Khách Sỉ F&amp;B Thị Trấn &amp; Hạn Mức Công Nợ Gối Đầu
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c) => {
            const usagePct =
              c.credit_limit_vnd > 0
                ? Math.min(100, Math.round((c.current_debt_vnd / c.credit_limit_vnd) * 100))
                : 0;
            return (
              <div key={c.id} className="rounded-xl border border-stone-200 p-4 bg-stone-50">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm">{c.shop_name}</div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800">
                    {c.price_tier}
                  </span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {c.code} • {c.name} • {c.phone}
                </div>
                <div className="mt-3 flex justify-between text-xs font-mono">
                  <span>Nợ hiện tại: {c.current_debt_vnd.toLocaleString('vi-VN')} đ</span>
                  <span>Hạn mức: {c.credit_limit_vnd.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={usagePct >= 80 ? 'h-full bg-red-600' : 'h-full bg-emerald-600'}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-base">
            Tạo Đơn Bán Sỉ B2B (Tự Động Tra Bậc Giá + Kiểm Soát Hạn Mức + Trừ FIFO)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Khách hàng sỉ B2B
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shop_name} ({c.price_tier})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Sản phẩm cà phê hạt rang
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {catalogItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Khối lượng (gram / đơn vị cơ sở)
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={quantityG}
              onChange={(e) => setQuantityG(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Thanh toán ngay (VNĐ)
            </label>
            <input
              type="number"
              min={0}
              step={100000}
              value={paidAmountVnd}
              onChange={(e) => setPaidAmountVnd(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          {livePreview && (
            <div
              className={`md:col-span-4 p-4 rounded-xl border text-xs flex flex-wrap justify-between gap-4 ${
                livePreview.credit.exceeds_credit_limit
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {livePreview.credit.exceeds_credit_limit ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
                <span>
                  {livePreview.credit.exceeds_credit_limit
                    ? 'VƯỢT HẠN MỨC CÔNG NỢ (Sẽ bị chặn 409 CREDIT_LIMIT_EXCEEDED)'
                    : `Bậc giá áp dụng: ${livePreview.quote.applied_price_tier ?? livePreview.quote.price_source} (${livePreview.quote.qty_kg} kg)`}
                </span>
              </div>
              <div className="font-mono flex flex-wrap gap-5">
                <span>
                  Đơn giá: <strong>{livePreview.quote.unit_price_vnd.toLocaleString('vi-VN')} đ/kg</strong>
                </span>
                <span>
                  Tổng đơn: <strong>{livePreview.quote.estimated_line_total_vnd.toLocaleString('vi-VN')} đ</strong>
                </span>
                <span>
                  Dư nợ sau đơn:{' '}
                  <strong>{livePreview.credit.projected_debt_vnd.toLocaleString('vi-VN')} đ</strong>
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="md:col-span-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="md:col-span-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </div>
          )}

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 disabled:opacity-50"
            >
              {submitting ? 'Đang xuất FIFO & tạo đơn...' : 'Xác nhận Đơn Bán Sỉ B2B'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-3">
          Danh sách Đơn Hàng B2B &amp; Lát Cắt Lô FIFO ({orders.length} đơn)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Mã đơn</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Tổng tiền (VNĐ)</th>
                <th className="px-3 py-2 text-right">Đã trả (VNĐ)</th>
                <th className="px-3 py-2 text-right">Số dòng FIFO</th>
                <th className="px-3 py-2">Hạn thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((ord) => (
                <tr key={ord.id}>
                  <td className="px-3 py-2 font-mono text-xs font-bold">{ord.order_code}</td>
                  <td className="px-3 py-2 font-mono text-xs">{ord.payment_status}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {ord.total_amount_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">
                    {ord.paid_amount_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {ord.items?.length ?? 0}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{ord.due_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\features\b2b\B2bArAgingAndLedgerPanel.tsx`
```tsx
import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, Clock, Wallet } from 'lucide-react';
import {
  SEED_IDS,
  settleFifoPendingInvoices,
  type ArAgingSummaryDTO,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { recordB2bDebtPaymentApi } from '../../api/b2bAndTransferApi';

export interface B2bArAgingAndLedgerPanelProps {
  actorId: string;
  customers: B2bCustomerDto[];
  orders: B2bOrderDto[];
  agingSummary: ArAgingSummaryDTO;
  ledgerEntries: B2bDebtLedgerEntryDto[];
  onPaymentRecorded: (ledgerEntry: B2bDebtLedgerEntryDto) => Promise<void>;
}

export function B2bArAgingAndLedgerPanel({
  actorId,
  customers,
  orders,
  agingSummary,
  ledgerEntries,
  onPaymentRecorded,
}: B2bArAgingAndLedgerPanelProps) {
  const [customerId, setCustomerId] = useState<string>(
    customers[0]?.id ?? SEED_IDS.b2bCustomers.phoNuiCoffee,
  );
  const [paymentAmountVnd, setPaymentAmountVnd] = useState<number>(2500000);
  const [referenceNote, setReferenceNote] = useState<string>('CK VietQR thu nợ định kỳ');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fifoPreview = useMemo(() => {
    if (paymentAmountVnd <= 0) {
      return null;
    }
    const pendingForCustomer = orders
      .filter(
        (o) =>
          o.customer_id === customerId &&
          o.payment_status === 'PENDING' &&
          o.paid_amount_vnd < o.total_amount_vnd,
      )
      .map((o) => ({
        id: o.id,
        order_code: o.order_code,
        ordered_at: o.created_at,
        total_amount_vnd: o.total_amount_vnd,
        paid_amount_vnd: o.paid_amount_vnd,
        payment_status: o.payment_status,
      }));
    return settleFifoPendingInvoices(pendingForCustomer, paymentAmountVnd);
  }, [orders, customerId, paymentAmountVnd]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await recordB2bDebtPaymentApi(actorId, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: customerId,
        payment_amount_vnd: Math.round(paymentAmountVnd),
        reference_note: referenceNote.trim() || undefined,
      });
      setSuccessMsg(
        `Đã thu ${res.data.payment_amount_vnd.toLocaleString('vi-VN')} đ (Gạch nợ ${res.data.settled_orders.length} hóa đơn FIFO, dư nợ mới: ${res.data.new_debt_vnd.toLocaleString('vi-VN')} đ)`,
      );
      await onPaymentRecorded(res.data.ledger_entry);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể ghi nhận thu nợ.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Phân Tích Tuổi Nợ Khách Sỉ (AR Aging tính đến {agingSummary.as_of_date})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Khách sỉ</th>
                <th className="px-3 py-2 text-right">Trong hạn</th>
                <th className="px-3 py-2 text-right">Quá hạn 1–30d</th>
                <th className="px-3 py-2 text-right">Quá hạn 31–60d</th>
                <th className="px-3 py-2 text-right">Nợ xấu &gt;60d</th>
                <th className="px-3 py-2 text-right">Tổng nợ</th>
                <th className="px-3 py-2">Phân loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {agingSummary.customers.map((row) => (
                <tr key={row.customer.id}>
                  <td className="px-3 py-2 font-medium">{row.customer.shop_name}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {row.current_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700 font-semibold">
                    {row.overdue_1_30_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-orange-700">
                    {row.overdue_31_60_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-red-700 font-bold">
                    {row.overdue_60_plus_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {row.total_outstanding_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.worst_bucket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-emerald-700" />
          <h2 className="font-bold text-base">
            Thu Nợ Khách Sỉ &amp; Gạch Nợ Hóa Đơn Cũ Trước (FIFO Debt Settlement)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Khách sỉ thanh toán
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shop_name} (Nợ: {c.current_debt_vnd.toLocaleString('vi-VN')} đ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số tiền thu nợ (VNĐ)
            </label>
            <input
              type="number"
              min={1}
              step={100000}
              value={paymentAmountVnd}
              onChange={(e) => setPaymentAmountVnd(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ghi chú chứng từ
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          {fifoPreview && fifoPreview.settled.length > 0 && (
            <div className="md:col-span-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
              <div className="font-semibold mb-1">
                Live Preview Gạch Nợ FIFO ({fifoPreview.settled.length} hóa đơn được phân bổ):
              </div>
              <div className="flex flex-wrap gap-3 font-mono">
                {fifoPreview.settled.map((s) => (
                  <span key={s.order_id} className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                    {s.order_code}: +{s.applied_vnd.toLocaleString('vi-VN')} đ → {s.new_payment_status}
                  </span>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Đang gạch nợ FIFO...' : 'Ghi nhận Thu Nợ & Cập nhật Sổ Cái'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-base">
            Sổ Cái Công Nợ Bất Biến (`b2b_debt_ledger` — {ledgerEntries.length} bút toán)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Loại bút toán</th>
                <th className="px-3 py-2 text-right">Số tiền (VNĐ)</th>
                <th className="px-3 py-2 text-right">Dư nợ sau bút toán</th>
                <th className="px-3 py-2">Diễn giải</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 font-mono text-xs font-bold">
                    <span
                      className={
                        entry.entry_type === 'CREDIT_PAYMENT'
                          ? 'text-emerald-700'
                          : 'text-amber-800'
                      }
                    >
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {entry.amount_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {entry.balance_after_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-600">
                    {entry.reference_note ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

### File 4: `C:\bib\cf_19\apps\web\src\features\transfers\WarehouseTransferDispatchPanel.tsx`
```tsx
import { useState } from 'react';
import { CheckCircle2, Truck } from 'lucide-react';
import type { InternalTransferDto } from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { dispatchInternalTransferApi } from '../../api/b2bAndTransferApi';

export interface WarehouseTransferDispatchPanelProps {
  actorId: string;
  transfers: InternalTransferDto[];
  onDispatched: () => Promise<void>;
}

export function WarehouseTransferDispatchPanel({
  actorId,
  transfers,
  onDispatched,
}: WarehouseTransferDispatchPanelProps) {
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDispatch = async (transferId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDispatchingId(transferId);
    try {
      const res = await dispatchInternalTransferApi(
        actorId,
        transferId,
        'Duyệt xuất kho nội bộ theo thứ tự FIFO',
      );
      setSuccessMsg(
        `Đã duyệt xuất phiếu ${res.data.transfer.transfer_code} sang trạng thái IN_TRANSIT (${res.data.items.length} lát cắt lô FIFO)`,
      );
      await onDispatched();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể duyệt xuất phiếu chuyển kho.');
      }
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-amber-700" />
        <h2 className="font-bold text-base">
          Điều Phối Xuất Kho Nội Bộ Pha 1 (REQUESTED → IN_TRANSIT theo Multi-Lot FIFO)
        </h2>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-3">
        {transfers.map((tr) => (
          <div
            key={tr.id}
            className="rounded-xl border border-stone-200 p-4 bg-stone-50 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">{tr.transfer_code}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900">
                  {tr.status}
                </span>
              </div>
              <div className="text-xs text-stone-600">
                Đích đến: <span className="font-mono">{tr.to_store_id}</span> • Giá trị nội bộ:{' '}
                <strong className="font-mono">
                  {tr.total_internal_value_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              {tr.items && tr.items.length > 0 && (
                <div className="text-[11px] font-mono text-stone-500">
                  {tr.items.map((it) => (
                    <span key={it.id} className="mr-3">
                      SL yêu cầu: {it.requested_qty} | Đã xuất: {it.dispatched_qty} | Thực nhận:{' '}
                      {it.received_qty}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {tr.status === 'REQUESTED' && (
              <button
                type="button"
                disabled={dispatchingId === tr.id}
                onClick={() => void handleDispatch(tr.id)}
                className="px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 disabled:opacity-50"
              >
                {dispatchingId === tr.id
                  ? 'Đang trừ FIFO...'
                  : 'Duyệt Xuất Kho Theo Lô FIFO (Chuyển sang IN_TRANSIT)'}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M3.3 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\api\b2bAndTransferApi.ts','C:\bib\cf_19\apps\web\src\features\b2b\B2bOrderTieredPricingPanel.tsx','C:\bib\cf_19\apps\web\src\features\b2b\B2bArAgingAndLedgerPanel.tsx','C:\bib\cf_19\apps\web\src\features\transfers\WarehouseTransferDispatchPanel.tsx') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# STORE 2-PHASE REPLENISHMENT PANEL, LAYOUTS & 14 VITEST TESTS (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây: `StoreTransferReplenishmentPanel.tsx`, cập nhật `WarehouseLayout.tsx`, cập nhật `StoreManagerLayout.tsx`, và tạo bộ 14 Vitest Frontend Tests `m3-b2b-transfers-ui.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thêm import thừa, không rút gọn test cases.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M3.3 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\features\transfers\StoreTransferReplenishmentPanel.tsx` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\apps\web\src\__tests__\m3-b2b-transfers-ui.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\features\transfers\StoreTransferReplenishmentPanel.tsx`
```tsx
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, EyeOff, PackageCheck, Send } from 'lucide-react';
import {
  SEED_IDS,
  calculateInternalTransferTotalVnd,
  type InternalTransferDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  fetchTransfersApi,
  getOfflineM3Items,
  reconcileInternalTransferApi,
  requestInternalTransferApi,
} from '../../api/b2bAndTransferApi';

export interface StoreTransferReplenishmentPanelProps {
  actorId: string;
  storeId: string;
}

export function StoreTransferReplenishmentPanel({
  actorId,
  storeId,
}: StoreTransferReplenishmentPanelProps) {
  const catalogItems = useMemo(() => getOfflineM3Items(), []);
  const [transfers, setTransfers] = useState<InternalTransferDto[]>([]);
  const [itemId, setItemId] = useState<string>(SEED_IDS.inventoryItems.roastedRobustaMed);
  const [requestedQty, setRequestedQty] = useState<number>(5000);
  const [notes, setNotes] = useState<string>('Xin cấp bổ sung nguyên liệu cho chi nhánh');
  const [receivedDrafts, setReceivedDrafts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadTransfers = useCallback(async () => {
    const res = await fetchTransfersApi(actorId, storeId);
    setTransfers(res.data);
  }, [actorId, storeId]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  const selectedItem = useMemo(
    () => catalogItems.find((i) => i.id === itemId),
    [catalogItems, itemId],
  );

  const estimatedTotalVnd = useMemo(() => {
    if (!selectedItem || requestedQty <= 0) {
      return 0;
    }
    return calculateInternalTransferTotalVnd([
      {
        qty_base_unit: requestedQty,
        base_unit: selectedItem.base_unit,
        internal_unit_price_vnd: selectedItem.internal_transfer_price_vnd,
      },
    ]);
  }, [selectedItem, requestedQty]);

  const handleRequestSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await requestInternalTransferApi(actorId, {
        from_warehouse_id: SEED_IDS.stores.centralWarehouse,
        to_store_id: storeId,
        notes: notes.trim() || undefined,
        items: [{ item_id: itemId, requested_qty: requestedQty }],
      });
      setSuccessMsg(
        `Đã gửi Phiếu Xin Cấp Hàng ${res.data.transfer_code} (Pha 0 REQUESTED • Giá trị nội bộ: ${res.data.total_internal_value_vnd.toLocaleString('vi-VN')} đ)`,
      );
      await loadTransfers();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể tạo phiếu xin cấp hàng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (transfer: InternalTransferDto) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const itemsPayload = (transfer.items ?? []).map((it) => ({
        transfer_item_id: it.id,
        received_qty: receivedDrafts[it.id] ?? it.dispatched_qty,
      }));
      const res = await reconcileInternalTransferApi(actorId, {
        transfer_id: transfer.id,
        items: itemsPayload,
        notes: 'Quản lý quán xác nhận kiểm nhận thực tế Pha 2',
      });
      setSuccessMsg(
        `Đã đối soát thành công ${res.data.transfer.transfer_code} → RECONCILED (Sinh ${res.data.created_store_lots.length} lô mới tại kho Quán theo giá nội bộ)`,
      );
      await loadTransfers();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể xác nhận nhận hàng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
        <EyeOff className="w-4 h-4 shrink-0" />
        <span>
          Luồng Chuyển Kho Nội Bộ 2 Pha bảo mật: Chỉ hiển thị <strong>Giá hạch toán nội bộ</strong> (
          <code>internal_transfer_price_vnd</code>); tuyệt đối ẩn giá vốn nhập Tây Nguyên của Kho Tổng.
        </span>
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Pha 0 (REQUESTED) — Tạo Phiếu Xin Cấp Nguyên Liệu Từ Kho Tổng
          </h2>
        </div>

        <form onSubmit={handleRequestSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nguyên liệu cần bổ sung
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {catalogItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name} ({it.internal_transfer_price_vnd.toLocaleString('vi-VN')} đ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số lượng xin cấp (đơn vị cơ sở)
            </label>
            <input
              type="number"
              min={1}
              value={requestedQty}
              onChange={(e) => setRequestedQty(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ghi chú gửi Kho Tổng
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs font-mono text-stone-700">
              Giá trị hạch toán nội bộ dự kiến:{' '}
              <strong className="text-amber-800">
                {estimatedTotalVnd.toLocaleString('vi-VN')} đ
              </strong>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50"
            >
              Gửi Phiếu Xin Cấp Hàng (REQUESTED)
            </button>
          </div>
        </form>
      </section>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-emerald-700" />
          <h2 className="font-bold text-base">
            Danh Sách Phiếu Chuyển Kho Của Chi Nhánh ({transfers.length} phiếu)
          </h2>
        </div>

        {transfers.map((tr) => (
          <div key={tr.id} className="rounded-xl border border-stone-200 p-4 bg-stone-50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">{tr.transfer_code}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-900">
                  {tr.status}
                </span>
              </div>
              <div className="font-mono text-xs font-bold">
                Giá trị nội bộ: {tr.total_internal_value_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>

            {tr.status === 'IN_TRANSIT' && tr.items && (
              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2">
                <div className="text-xs font-semibold text-emerald-900">
                  Hàng đang giao (IN_TRANSIT) — Nhập số lượng thực nhận để hoàn tất Pha 2:
                </div>
                {tr.items.map((it) => (
                  <div key={it.id} className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span>Đã xuất từ Kho Tổng: {it.dispatched_qty}</span>
                    <input
                      type="number"
                      min={0}
                      max={it.dispatched_qty}
                      value={receivedDrafts[it.id] ?? it.dispatched_qty}
                      onChange={(e) =>
                        setReceivedDrafts((prev) => ({
                          ...prev,
                          [it.id]: Number(e.target.value),
                        }))
                      }
                      className="w-28 rounded-lg border border-stone-300 px-2 py-1"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleReconcile(tr)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50"
                >
                  Pha 2: Kiểm Nhận Thực Tế &amp; Cộng Tồn Kho Quán (Chuyển sang RECONCILED)
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react';
import { Boxes, Lock, ShoppingBag, Truck } from 'lucide-react';
import type {
  B2bCatalogOverviewDTO,
  B2bDebtLedgerEntryDto,
  InternalTransferDto,
} from '@cf19/shared';
import {
  fetchB2bOverviewApi,
  fetchTransfersApi,
  getOfflineDebtLedger,
} from '../api/b2bAndTransferApi';
import { RoleShellHeader } from '../components/RoleGuard';
import { B2bArAgingAndLedgerPanel } from '../features/b2b/B2bArAgingAndLedgerPanel';
import { B2bOrderTieredPricingPanel } from '../features/b2b/B2bOrderTieredPricingPanel';
import { WarehouseTransferDispatchPanel } from '../features/transfers/WarehouseTransferDispatchPanel';
import { WarehousePortalView } from '../features/warehouse/WarehousePortalView';
import { useAuthStore } from '../store/authStore';

type WarehouseSection = 'wms' | 'b2b' | 'transfers';

export function WarehouseLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const [section, setSection] = useState<WarehouseSection>('wms');
  const [b2bOverview, setB2bOverview] = useState<B2bCatalogOverviewDTO | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<B2bDebtLedgerEntryDto[]>(() =>
    getOfflineDebtLedger(),
  );
  const [transfers, setTransfers] = useState<InternalTransferDto[]>([]);

  const loadM3Data = useCallback(async () => {
    const [b2bRes, trRes] = await Promise.all([
      fetchB2bOverviewApi(actor.id),
      fetchTransfersApi(actor.id),
    ]);
    setB2bOverview(b2bRes.data);
    setTransfers(trRes.data);
  }, [actor.id]);

  useEffect(() => {
    void loadM3Data();
  }, [loadM3Data]);

  const handleLedgerAppend = async (entry: B2bDebtLedgerEntryDto | null) => {
    if (entry) {
      setLedgerEntries((prev) => [entry, ...prev]);
    }
    await loadM3Data();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Kho Tổng Rang Xay Tây Nguyên (WMS, B2B & Điều Phối Nội Bộ)"
        subtitle="Nhập nhân xanh MAC, Mẻ rang FIFO, Bán sỉ B2B bậc thang & Chuyển kho 2 pha"
        badgeText="WAREHOUSE_MANAGER"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Phân vùng bảo mật RBAC: Quản lý Kho Tổng quản trị WMS FIFO, Bán sỉ B2B và Xuất nội bộ Pha 1;
            tuyệt đối không truy cập doanh thu bán nước hay két tiền của 4 Quán.
          </span>
        </div>

        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <button
            type="button"
            onClick={() => setSection('wms')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              section === 'wms'
                ? 'bg-amber-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            1. Kho Tổng &amp; Mẻ Rang FIFO
          </button>
          <button
            type="button"
            onClick={() => setSection('b2b')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              section === 'b2b'
                ? 'bg-indigo-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            2. Bán Sỉ B2B &amp; Sổ Cái Công Nợ AR
          </button>
          <button
            type="button"
            onClick={() => setSection('transfers')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              section === 'transfers'
                ? 'bg-emerald-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            3. Điều Phối Chuyển Kho Nội Bộ Pha 1
          </button>
        </div>

        {section === 'wms' && <WarehousePortalView actorId={actor.id} />}

        {section === 'b2b' && b2bOverview && (
          <div className="space-y-6">
            <B2bOrderTieredPricingPanel
              actorId={actor.id}
              customers={b2bOverview.customers}
              priceTiers={b2bOverview.price_tiers}
              orders={b2bOverview.recent_orders}
              onOrderCreated={handleLedgerAppend}
            />
            <B2bArAgingAndLedgerPanel
              actorId={actor.id}
              customers={b2bOverview.customers}
              orders={b2bOverview.recent_orders}
              agingSummary={b2bOverview.aging_summary}
              ledgerEntries={ledgerEntries}
              onPaymentRecorded={handleLedgerAppend}
            />
          </div>
        )}

        {section === 'transfers' && (
          <WarehouseTransferDispatchPanel
            actorId={actor.id}
            transfers={transfers}
            onDispatched={loadM3Data}
          />
        )}
      </main>
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { EyeOff, ShieldAlert, Store, Truck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEED_IDS } from '@cf19/shared';
import {
  fetchStoreInventory,
  fetchStoreLots,
  type AnyInventoryItemRecord,
  type AnyLotRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { StoreTransferReplenishmentPanel } from '../features/transfers/StoreTransferReplenishmentPanel';
import { useAuthStore } from '../store/authStore';

type StoreManagerTab = 'inventory' | 'transfers';

export function StoreManagerLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const activeStoreId = storeId ?? actor.assignedStoreId ?? SEED_IDS.stores.store01;

  const [activeTab, setActiveTab] = useState<StoreManagerTab>('inventory');
  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [lots, setLots] = useState<AnyLotRecord[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [invRes, lotsRes] = await Promise.all([
        fetchStoreInventory(actor.id, activeStoreId, actor.role),
        fetchStoreLots(actor.id, activeStoreId, actor.role),
      ]);
      if (!active) {
        return;
      }
      setInventory(invRes.data);
      setLots(lotsRes.data);
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
        subtitle={`Cách ly Multi-Tenant, Cost-Masking & Chuyển Kho Nội Bộ 2 Pha (${source})`}
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
        </div>

        {activeTab === 'transfers' ? (
          <StoreTransferReplenishmentPanel
            actorId={actor.id}
            storeId={activeStoreId}
          />
        ) : (
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

### File 4: `C:\bib\cf_19\apps\web\src\__tests__\m3-b2b-transfers-ui.test.ts`
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS, SENSITIVE_COST_KEYS } from '@cf19/shared';
import { ApiClientError } from '../api/apiClient';
import {
  getOfflineDebtLedger,
  offlineCreateB2bOrder,
  offlineDispatchTransferFifo,
  offlineGetB2bOverview,
  offlineListTransfers,
  offlineQuoteB2bPrice,
  offlineReconcileTransfer,
  offlineRecordB2bDebtPayment,
  offlineRequestTransfer,
  resetOfflineB2bAndTransfersState,
} from '../api/b2bAndTransferApi';

describe('M3.3 — @cf19/web B2B Tiered Pricing, AR Aging & 2-Phase Store Transfer UI Engine', () => {
  beforeEach(() => {
    resetOfflineB2bAndTransfersState();
  });

  it('1. offlineGetB2bOverview returns 2 customers, 4 tiers, 1 pending order & exact AR aging summary', () => {
    const overview = offlineGetB2bOverview('2026-11-22');
    expect(overview.customers).toHaveLength(2);
    expect(overview.price_tiers).toHaveLength(4);
    expect(overview.recent_orders).toHaveLength(1);
    expect(overview.aging_summary.total_receivables_vnd).toBe(12500000);
    expect(overview.aging_summary.overdue_1_30_vnd).toBe(12500000);
  });

  it('2. offlineQuoteB2bPrice unlocks tiered volume discounts for TIER_1 customer (5kg/15kg/50kg)', () => {
    expect(
      offlineQuoteB2bPrice({
        customer_id: SEED_IDS.b2bCustomers.hoaDoBakery,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        quantity_base_unit: 5000,
      }).unit_price_vnd,
    ).toBe(185000);

    expect(
      offlineQuoteB2bPrice({
        customer_id: SEED_IDS.b2bCustomers.hoaDoBakery,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        quantity_base_unit: 15000,
      }).unit_price_vnd,
    ).toBe(172000);

    expect(
      offlineQuoteB2bPrice({
        customer_id: SEED_IDS.b2bCustomers.hoaDoBakery,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        quantity_base_unit: 50000,
      }).unit_price_vnd,
    ).toBe(160000);
  });

  it('3. offlineQuoteB2bPrice honors contracted VIP TIER_2 rate (172,000) for phoNuiCoffee on 5kg', () => {
    const quote = offlineQuoteB2bPrice({
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      quantity_base_unit: 5000,
    });
    expect(quote.unit_price_vnd).toBe(172000);
    expect(quote.applied_price_tier).toBe('TIER_2');
  });

  it('4. offlineCreateB2bOrder splits 30kg across 2 FIFO lots, updates debt & records double-entry ledger', () => {
    const res = offlineCreateB2bOrder(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      payment_method: 'VIETQR',
      paid_amount_vnd: 1160000,
      items: [
        { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, quantity_base_unit: 30000 },
      ],
    });
    expect(res.order.total_amount_vnd).toBe(5160000);
    expect(res.items).toHaveLength(2);
    expect(res.projected_debt_vnd).toBe(16500000);
    expect(getOfflineDebtLedger().length).toBe(4);
  });

  it('5. offlineCreateB2bOrder marks fully paid order PAID with zero debt added', () => {
    const res = offlineCreateB2bOrder(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.hoaDoBakery,
      payment_method: 'CASH',
      paid_amount_vnd: 925000,
      items: [
        { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, quantity_base_unit: 5000 },
      ],
    });
    expect(res.order.payment_status).toBe('PAID');
    expect(res.debt_added_vnd).toBe(0);
  });

  it('6. offlineCreateB2bOrder throws 409 INSUFFICIENT_FIFO_STOCK when order exceeds warehouse stock', () => {
    expect(() =>
      offlineCreateB2bOrder(SEED_IDS.users.warehouseManager, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_method: 'VIETQR',
        paid_amount_vnd: 0,
        items: [
          { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, quantity_base_unit: 60000 },
        ],
      }),
    ).toThrow(ApiClientError);
  });

  it('7. offlineRecordB2bDebtPayment settles oldest pending invoice first (FIFO) and reduces debt', () => {
    offlineCreateB2bOrder(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      order_code: 'B2B-SECOND-002',
      payment_method: 'VIETQR',
      paid_amount_vnd: 0,
      items: [
        { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, quantity_base_unit: 10000 },
      ],
    });

    const pay = offlineRecordB2bDebtPayment(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
      payment_amount_vnd: 13000000,
    });
    expect(pay.settled_orders).toHaveLength(2);
    expect(pay.settled_orders[0]?.order_code).toBe('B2B-20261101-001');
    expect(pay.settled_orders[0]?.new_payment_status).toBe('PAID');
    expect(pay.settled_orders[1]?.order_code).toBe('B2B-SECOND-002');
    expect(pay.new_debt_vnd).toBe(1220000);
  });

  it('8. offlineRecordB2bDebtPayment throws 409 PAYMENT_EXCEEDS_CURRENT_DEBT on overpayment', () => {
    expect(() =>
      offlineRecordB2bDebtPayment(SEED_IDS.users.warehouseManager, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: SEED_IDS.b2bCustomers.phoNuiCoffee,
        payment_amount_vnd: 13000000,
      }),
    ).toThrow(ApiClientError);
  });

  it('9. offlineListTransfers isolates Store 1 transfers from Store 2', () => {
    expect(offlineListTransfers(SEED_IDS.stores.store01)).toHaveLength(1);
    expect(offlineListTransfers(SEED_IDS.stores.store02)).toHaveLength(0);
  });

  it('10. offlineRequestTransfer creates Phase 0 REQUESTED transfer priced at internal_transfer_price_vnd', () => {
    const tr = offlineRequestTransfer(SEED_IDS.users.storeManager01, {
      from_warehouse_id: SEED_IDS.stores.centralWarehouse,
      to_store_id: SEED_IDS.stores.store01,
      items: [
        { item_id: SEED_IDS.inventoryItems.roastedRobustaMed, requested_qty: 10000 },
      ],
    });
    expect(tr.status).toBe('REQUESTED');
    expect(tr.total_internal_value_vnd).toBe(1550000);
  });

  it('11. offlineDispatchTransferFifo transitions REQUESTED -> IN_TRANSIT and blocks double dispatch', () => {
    const dispatched = offlineDispatchTransferFifo(
      SEED_IDS.users.warehouseManager,
      SEED_IDS.internalTransfers.store01InitialRequest,
    );
    expect(dispatched.transfer.status).toBe('IN_TRANSIT');
    expect(dispatched.items[0]?.source_lot_id).toBe(
      SEED_IDS.warehouseLots.cwRoastedRobusta01,
    );

    expect(() =>
      offlineDispatchTransferFifo(
        SEED_IDS.users.warehouseManager,
        SEED_IDS.internalTransfers.store01InitialRequest,
      ),
    ).toThrow(ApiClientError);
  });

  it('12. offlineReconcileTransfer transitions IN_TRANSIT -> RECONCILED and strips origin costs from store lot DTO', () => {
    offlineDispatchTransferFifo(
      SEED_IDS.users.warehouseManager,
      SEED_IDS.internalTransfers.store01InitialRequest,
    );
    const rec = offlineReconcileTransfer(SEED_IDS.users.storeManager01, {
      transfer_id: SEED_IDS.internalTransfers.store01InitialRequest,
      items: [
        { transfer_item_id: '93000000-0000-4000-8000-000000000001', received_qty: 4800 },
      ],
    });
    expect(rec.transfer.status).toBe('RECONCILED');
    expect(rec.transfer.total_internal_value_vnd).toBe(744000);
    expect(rec.created_store_lots).toHaveLength(1);
    for (const key of SENSITIVE_COST_KEYS) {
      expect(rec.created_store_lots[0]).not.toHaveProperty(key);
    }
  });

  it('13. offlineReconcileTransfer rejects received_qty exceeding dispatched_qty', () => {
    offlineDispatchTransferFifo(
      SEED_IDS.users.warehouseManager,
      SEED_IDS.internalTransfers.store01InitialRequest,
    );
    expect(() =>
      offlineReconcileTransfer(SEED_IDS.users.storeManager01, {
        transfer_id: SEED_IDS.internalTransfers.store01InitialRequest,
        items: [
          { transfer_item_id: '93000000-0000-4000-8000-000000000001', received_qty: 6000 },
        ],
      }),
    ).toThrow(ApiClientError);
  });

  it('14. resetOfflineB2bAndTransfersState cleanly resets debt and transfer statuses', () => {
    offlineDispatchTransferFifo(
      SEED_IDS.users.warehouseManager,
      SEED_IDS.internalTransfers.store01InitialRequest,
    );
    resetOfflineB2bAndTransfersState();
    const list = offlineListTransfers(SEED_IDS.stores.store01);
    expect(list[0]?.status).toBe('REQUESTED');
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M3.3 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\features\transfers\StoreTransferReplenishmentPanel.tsx','C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\StoreManagerLayout.tsx','C:\bib\cf_19\apps\web\src\__tests__\m3-b2b-transfers-ui.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
