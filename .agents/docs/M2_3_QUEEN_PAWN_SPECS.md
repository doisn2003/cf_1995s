# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M2.3 (ZERO-REASONING PAWN SPECS)

- **Soạn thảo bởi:** Quân Hậu (`queen-neon` — `gemini-4-neon-high`)
- **Phê duyệt & Điều phối:** Quân Vua (`@coordinator` — `gemini-4-argon-high`)
- **Đối tượng thực thi:** 2 Quân Tốt (`pawn-flash-1` và `pawn-flash-2` — `gemini-3.8-flash-high`) chạy song song, tách bạch hoàn toàn **8 files (4 + 4)**.
- **Tiền đề đã hoàn thành:** Tiểu phân hệ M1.1–M1.3 (`@cf19/shared`, `@cf19/api`, `@cf19/web`), M2.1 (`warehouseMath.ts` + M2 schemas/types), M2.2 (`@cf19/api` `/api/v1/warehouse/*`).
- **Cam kết tương thích ngược:** Giữ nguyên toàn bộ **14/14 Vitest tests của M1.3** (`m1-role-routing.test.ts`) PASS tuyệt đối!

---

# ============================================================================
# PHIẾU TỐT #1 (`pawn-flash-1` — `gemini-3.8-flash-high`)
# TYPED WAREHOUSE API CLIENT & 3 MODULAR FEATURE PANELS (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #1 (`pawn-flash-1` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo **100% chính xác từng ký tự** 4 file dưới đây cho tầng API Client và 3 panel chuyên biệt của Kho Tổng Tây Nguyên trong `@cf19/web`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thêm import thừa gây lỗi `noUnusedLocals`, không đổi tên props hay hàm.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được tạo đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào `WarehousePortalView.tsx`, `WarehouseLayout.tsx`, `ExecutiveLayout.tsx`, hay `m2-warehouse-workbench.test.ts` (thuộc quyền sở hữu của `pawn-flash-2`).
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M2.3 Pawn 1`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\api\warehouseApi.ts` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\features\warehouse\LotIngestMacPanel.tsx` (Tạo mới)
3. `C:\bib\cf_19\apps\web\src\features\warehouse\RoasteryBatchLifecyclePanel.tsx` (Tạo mới)
4. `C:\bib\cf_19\apps\web\src\features\warehouse\FifoAllocationWorkbench.tsx` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\api\warehouseApi.ts`
```ts
import {
  SEED_IDS,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  calculateRoastYieldLossPct,
  calculateRoastedOutputUnitCostVnd,
  compareFifoLots,
  isAbnormalRoastYieldLoss,
  type CompleteRoastBatchDTO,
  type CompleteRoastBatchResultDTO,
  type FifoAllocationRequestDTO,
  type FifoAllocationResultDTO,
  type FifoLotAllocationSliceDTO,
  type IngestWarehouseLotDTO,
  type LotStatus,
  type RoastBatchDto,
  type WarehouseInventoryItemDto,
  type WarehouseLotFullDto,
  type WarehouseLotIngestResultDTO,
  type WarehouseOverviewDTO,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import {
  ApiClientError,
  type ApiCallResult,
} from './apiClient';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

interface OfflineWarehouseState {
  items: WarehouseInventoryItemDto[];
  lots: WarehouseLotFullDto[];
  roastBatches: RoastBatchDto[];
}

const BASE_TS = '2026-11-22T01:00:00.000Z';

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDaysIso(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function createOfflineWarehouseSeed(): OfflineWarehouseState {
  return {
    items: [
      {
        id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        organization_id: SEED_IDS.organization.cf19,
        sku: 'GB-ROB-TN',
        name: 'Cà phê nhân xanh Robusta Đắk Lắk S18',
        category: 'GREEN_BEAN',
        base_unit: 'g',
        min_stock_threshold: 60000,
        moving_avg_cost_vnd: 98000,
        internal_transfer_price_vnd: 0,
        retail_price_vnd: 0,
        is_active: true,
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
      {
        id: SEED_IDS.inventoryItems.greenArabicaCauDat,
        organization_id: SEED_IDS.organization.cf19,
        sku: 'GB-ARA-CD',
        name: 'Cà phê nhân xanh Arabica Cầu Đất Washed',
        category: 'GREEN_BEAN',
        base_unit: 'g',
        min_stock_threshold: 30000,
        moving_avg_cost_vnd: 165000,
        internal_transfer_price_vnd: 0,
        retail_price_vnd: 0,
        is_active: true,
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
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
    ],
    lots: [
      {
        id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-ROB-001',
        supplier_name: 'HTX Nông Sản Cư Mgar Đắk Lắk',
        moisture_pct: 12.2,
        roast_date: null,
        received_at: '2026-11-01T08:00:00.000Z',
        expiry_date: '2027-11-01',
        initial_qty: 120000,
        remaining_qty: 90000,
        unit_cost_vnd: 95000,
        shipping_cost_vnd: 360000,
        status: 'AVAILABLE',
        created_at: BASE_TS,
        updated_at: BASE_TS,
      },
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
    roastBatches: [
      {
        id: SEED_IDS.roastBatches.batchRobusta001,
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-20261110-001',
        source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
        output_lot_id: SEED_IDS.warehouseLots.cwRoastedRobusta01,
        green_input_weight_g: 30000,
        roasted_output_weight_g: 24900,
        weight_loss_pct: 17,
        roast_profile: 'Medium Full City 212C - 14 phút',
        roasted_by: SEED_IDS.users.warehouseManager,
        roasted_at: '2026-11-10T10:30:00.000Z',
        notes: 'Mẻ rang chuẩn định mức hao hụt 17%',
      },
    ],
  };
}

let offlineState: OfflineWarehouseState = createOfflineWarehouseSeed();

export function resetOfflineWarehouseState(): void {
  offlineState = createOfflineWarehouseSeed();
}

export function offlineGetWarehouseOverview(): WarehouseOverviewDTO {
  const availableLots = offlineState.lots.filter(
    (lot) => lot.status === 'AVAILABLE' && lot.remaining_qty > 0,
  );

  let totalInventoryValueVnd = 0;
  let lowStockSkuCount = 0;

  const stockSummaries: WarehouseStockSummaryDTO[] = offlineState.items.map(
    (item) => {
      const itemLots = availableLots.filter((lot) => lot.item_id === item.id);
      const totalAvailableQty = roundQty2(
        itemLots.reduce((sum, lot) => sum + lot.remaining_qty, 0),
      );
      const estimatedStockValueVnd = Math.round(
        totalAvailableQty * item.moving_avg_cost_vnd,
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
    },
  );

  return {
    warehouse_store_id: SEED_IDS.stores.centralWarehouse,
    warehouse_code: 'CW-TAYNGUYEN',
    warehouse_name: 'Kho Tổng Rang Xay Tây Nguyên',
    total_skus: stockSummaries.length,
    total_available_lots: availableLots.length,
    low_stock_sku_count: lowStockSkuCount,
    total_inventory_value_vnd: totalInventoryValueVnd,
    recent_roast_batches_count: offlineState.roastBatches.length,
    stock_summaries: stockSummaries,
  };
}

export function offlineListWarehouseLots(): WarehouseLotFullDto[] {
  return [...offlineState.lots]
    .sort(compareFifoLots)
    .map((lot) => structuredClone(lot));
}

export function offlineListRoastBatches(): RoastBatchDto[] {
  return [...offlineState.roastBatches]
    .sort((a, b) => b.roasted_at.localeCompare(a.roasted_at))
    .map((b) => structuredClone(b));
}

export function offlineIngestWarehouseLot(
  input: IngestWarehouseLotDTO,
): WarehouseLotIngestResultDTO {
  const item = offlineState.items.find((i) => i.id === input.item_id);
  if (!item) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Inventory item not found');
  }
  if (offlineState.lots.some((l) => l.lot_code === input.lot_code.trim())) {
    throw new ApiClientError(409, 'DUPLICATE_LOT_CODE', `Duplicate lot ${input.lot_code}`);
  }

  const previousQty = roundQty2(
    offlineState.lots
      .filter(
        (l) =>
          l.item_id === input.item_id &&
          l.status === 'AVAILABLE' &&
          l.remaining_qty > 0,
      )
      .reduce((sum, l) => sum + l.remaining_qty, 0),
  );
  const previousMacVnd = item.moving_avg_cost_vnd;
  const effectiveUnitCostVnd = calculateEffectiveLotUnitCostVnd(
    input.unit_cost_vnd,
    input.shipping_cost_vnd,
    input.initial_qty,
  );
  const newMacVnd = calculateMovingAverageCostVnd(
    previousQty,
    previousMacVnd,
    input.initial_qty,
    effectiveUnitCostVnd,
  );

  const nowIso = new Date().toISOString();
  const newLot: WarehouseLotFullDto = {
    id: crypto.randomUUID(),
    store_id: input.warehouse_store_id,
    item_id: input.item_id,
    lot_code: input.lot_code.trim(),
    supplier_name: input.supplier_name ?? null,
    moisture_pct: input.moisture_pct ?? null,
    roast_date: input.roast_date ?? null,
    received_at: nowIso,
    expiry_date: input.expiry_date ?? null,
    initial_qty: input.initial_qty,
    remaining_qty: input.initial_qty,
    unit_cost_vnd: effectiveUnitCostVnd,
    shipping_cost_vnd: input.shipping_cost_vnd,
    status: 'AVAILABLE',
    created_at: nowIso,
    updated_at: nowIso,
  };

  offlineState.lots.push(newLot);
  item.moving_avg_cost_vnd = newMacVnd;
  item.updated_at = nowIso;

  return {
    lot: structuredClone(newLot),
    item_id: item.id,
    previous_qty: previousQty,
    previous_mac_vnd: previousMacVnd,
    effective_unit_cost_vnd: effectiveUnitCostVnd,
    new_mac_vnd: newMacVnd,
  };
}

export function offlineCompleteRoastBatch(
  actorId: string,
  input: CompleteRoastBatchDTO,
): CompleteRoastBatchResultDTO {
  if (offlineState.roastBatches.some((b) => b.batch_code === input.batch_code.trim())) {
    throw new ApiClientError(409, 'DUPLICATE_BATCH_CODE', 'Duplicate batch_code');
  }

  const sourceLot = offlineState.lots.find((l) => l.id === input.source_green_lot_id);
  if (!sourceLot) {
    throw new ApiClientError(404, 'NOT_FOUND', 'Source green bean lot not found');
  }
  if (sourceLot.status !== 'AVAILABLE' || sourceLot.remaining_qty < input.green_input_weight_g) {
    throw new ApiClientError(409, 'INSUFFICIENT_GREEN_BEAN_STOCK', 'Insufficient green bean lot stock');
  }

  const outputItem = offlineState.items.find((i) => i.id === input.output_item_id);
  if (!outputItem || outputItem.category !== 'ROASTED_COFFEE') {
    throw new ApiClientError(400, 'INVALID_OUTPUT_ITEM_CATEGORY', 'Output item must be ROASTED_COFFEE');
  }

  if (input.enforce_fifo !== false) {
    const oldest = offlineState.lots
      .filter(
        (l) =>
          l.item_id === sourceLot.item_id &&
          l.status === 'AVAILABLE' &&
          l.remaining_qty > 0,
      )
      .sort(compareFifoLots)[0];

    if (oldest && oldest.id !== sourceLot.id) {
      throw new ApiClientError(
        409,
        'FIFO_VIOLATION_OLDER_LOT_EXISTS',
        `FIFO violation: older lot ${oldest.lot_code} must be roasted first`,
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

  const nowIso = new Date().toISOString();
  const roastDate = input.roast_date ?? nowIso.slice(0, 10);
  const expiryDate = input.expiry_date ?? addDaysIso(roastDate, 90);

  const sourceRemaining = roundQty2(
    sourceLot.remaining_qty - input.green_input_weight_g,
  );
  const sourceStatus: LotStatus = sourceRemaining === 0 ? 'DEPLETED' : 'AVAILABLE';
  sourceLot.remaining_qty = sourceRemaining;
  sourceLot.status = sourceStatus;
  sourceLot.updated_at = nowIso;

  const oldOutputQty = roundQty2(
    offlineState.lots
      .filter(
        (l) =>
          l.item_id === outputItem.id &&
          l.status === 'AVAILABLE' &&
          l.remaining_qty > 0,
      )
      .reduce((sum, l) => sum + l.remaining_qty, 0),
  );
  const newMacVnd = calculateMovingAverageCostVnd(
    oldOutputQty,
    outputItem.moving_avg_cost_vnd,
    input.roasted_output_weight_g,
    outputUnitCostVnd,
  );

  const outputLot: WarehouseLotFullDto = {
    id: crypto.randomUUID(),
    store_id: input.warehouse_store_id,
    item_id: outputItem.id,
    lot_code: input.output_lot_code.trim(),
    supplier_name: 'Xưởng Rang Nội Bộ CF19',
    moisture_pct: input.moisture_pct ?? null,
    roast_date: roastDate,
    received_at: nowIso,
    expiry_date: expiryDate,
    initial_qty: input.roasted_output_weight_g,
    remaining_qty: input.roasted_output_weight_g,
    unit_cost_vnd: outputUnitCostVnd,
    shipping_cost_vnd: 0,
    status: 'AVAILABLE',
    created_at: nowIso,
    updated_at: nowIso,
  };

  offlineState.lots.push(outputLot);
  outputItem.moving_avg_cost_vnd = newMacVnd;
  outputItem.updated_at = nowIso;

  const batch: RoastBatchDto = {
    id: crypto.randomUUID(),
    warehouse_store_id: input.warehouse_store_id,
    batch_code: input.batch_code.trim(),
    source_green_lot_id: sourceLot.id,
    output_lot_id: outputLot.id,
    green_input_weight_g: input.green_input_weight_g,
    roasted_output_weight_g: input.roasted_output_weight_g,
    weight_loss_pct: weightLossPct,
    roast_profile: input.roast_profile ?? null,
    roasted_by: actorId,
    roasted_at: nowIso,
    notes: input.notes ?? null,
  };
  offlineState.roastBatches.push(batch);

  return {
    roast_batch: structuredClone(batch),
    output_lot: structuredClone(outputLot),
    source_lot_id: sourceLot.id,
    source_lot_remaining_qty: sourceRemaining,
    source_lot_status: sourceStatus,
    weight_loss_pct: weightLossPct,
    is_abnormal_yield_loss: isAbnormalLoss,
    output_unit_cost_vnd: outputUnitCostVnd,
    new_output_item_mac_vnd: newMacVnd,
  };
}

export function offlineAllocateFifoStock(
  input: FifoAllocationRequestDTO & { dry_run?: boolean },
): FifoAllocationResultDTO {
  const candidates = offlineState.lots
    .filter(
      (l) =>
        l.item_id === input.item_id &&
        l.status === 'AVAILABLE' &&
        l.remaining_qty > 0,
    )
    .sort(compareFifoLots);

  const totalAvailable = roundQty2(
    candidates.reduce((sum, l) => sum + l.remaining_qty, 0),
  );
  if (totalAvailable < input.requested_qty) {
    throw new ApiClientError(
      409,
      'INSUFFICIENT_FIFO_STOCK',
      `Requested ${input.requested_qty}, available ${totalAvailable}`,
    );
  }

  let remaining = input.requested_qty;
  let totalCogsVnd = 0;
  const allocations: FifoLotAllocationSliceDTO[] = [];
  const dryRun = Boolean(input.dry_run);
  const nowIso = new Date().toISOString();

  for (const lot of candidates) {
    if (remaining <= 0) {
      break;
    }
    const take = roundQty2(Math.min(lot.remaining_qty, remaining));
    const after = roundQty2(lot.remaining_qty - take);
    const statusAfter: LotStatus = after === 0 ? 'DEPLETED' : 'AVAILABLE';
    const sliceCogs = Math.round(take * lot.unit_cost_vnd);

    if (!dryRun) {
      lot.remaining_qty = after;
      lot.status = statusAfter;
      lot.updated_at = nowIso;
    }

    totalCogsVnd += sliceCogs;
    allocations.push({
      lot_id: lot.id,
      lot_code: lot.lot_code,
      roast_date: lot.roast_date,
      received_at: lot.received_at,
      allocated_qty: take,
      remaining_after_qty: after,
      lot_status_after: statusAfter,
      unit_cost_vnd: lot.unit_cost_vnd,
      slice_cogs_vnd: sliceCogs,
    });

    remaining = roundQty2(remaining - take);
  }

  return {
    warehouse_store_id: input.warehouse_store_id,
    item_id: input.item_id,
    requested_qty: input.requested_qty,
    total_allocated_qty: input.requested_qty,
    total_cogs_vnd: totalCogsVnd,
    weighted_unit_cost_vnd: Math.round(totalCogsVnd / input.requested_qty),
    reference_code: input.reference_code ?? null,
    allocations,
  };
}

async function warehouseFetchJson<T>(
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
      body.error?.code ?? 'WAREHOUSE_API_ERROR',
      body.error?.message ?? `HTTP ${response.status}`,
    );
  }

  return body.data as T;
}

export async function fetchWarehouseOverview(
  actorId: string,
): Promise<ApiCallResult<WarehouseOverviewDTO>> {
  try {
    const data = await warehouseFetchJson<WarehouseOverviewDTO>(
      '/api/v1/warehouse/overview',
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return { data: offlineGetWarehouseOverview(), source: 'offline_fallback' };
  }
}

export async function fetchWarehouseLots(
  actorId: string,
): Promise<ApiCallResult<WarehouseLotFullDto[]>> {
  try {
    const data = await warehouseFetchJson<WarehouseLotFullDto[]>(
      '/api/v1/warehouse/lots',
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return { data: offlineListWarehouseLots(), source: 'offline_fallback' };
  }
}

export async function fetchRoastBatches(
  actorId: string,
): Promise<ApiCallResult<RoastBatchDto[]>> {
  try {
    const data = await warehouseFetchJson<RoastBatchDto[]>(
      '/api/v1/warehouse/roast-batches',
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return { data: offlineListRoastBatches(), source: 'offline_fallback' };
  }
}

export async function ingestWarehouseLotApi(
  actorId: string,
  payload: IngestWarehouseLotDTO,
): Promise<ApiCallResult<WarehouseLotIngestResultDTO>> {
  try {
    const data = await warehouseFetchJson<WarehouseLotIngestResultDTO>(
      '/api/v1/warehouse/lots/ingest',
      actorId,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return { data: offlineIngestWarehouseLot(payload), source: 'offline_fallback' };
  }
}

export async function completeRoastBatchApi(
  actorId: string,
  payload: CompleteRoastBatchDTO,
): Promise<ApiCallResult<CompleteRoastBatchResultDTO>> {
  try {
    const data = await warehouseFetchJson<CompleteRoastBatchResultDTO>(
      '/api/v1/warehouse/roast-batches',
      actorId,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return {
      data: offlineCompleteRoastBatch(actorId, payload),
      source: 'offline_fallback',
    };
  }
}

export async function allocateFifoStockApi(
  actorId: string,
  payload: FifoAllocationRequestDTO & { dry_run: boolean },
): Promise<ApiCallResult<FifoAllocationResultDTO>> {
  try {
    const data = await warehouseFetchJson<FifoAllocationResultDTO>(
      '/api/v1/warehouse/fifo/allocate',
      actorId,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    return { data: offlineAllocateFifoStock(payload), source: 'offline_fallback' };
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\src\features\warehouse\LotIngestMacPanel.tsx`
```tsx
import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, PackagePlus, TrendingUp } from 'lucide-react';
import {
  SEED_IDS,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  type WarehouseLotFullDto,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { ingestWarehouseLotApi } from '../../api/warehouseApi';

export interface LotIngestMacPanelProps {
  actorId: string;
  stockSummaries: WarehouseStockSummaryDTO[];
  lots: WarehouseLotFullDto[];
  onMutated: () => Promise<void>;
}

export function LotIngestMacPanel({
  actorId,
  stockSummaries,
  lots,
  onMutated,
}: LotIngestMacPanelProps) {
  const defaultItemId =
    stockSummaries[0]?.item_id ?? SEED_IDS.inventoryItems.greenRobustaDakLak;
  const [itemId, setItemId] = useState<string>(defaultItemId);
  const [lotCode, setLotCode] = useState<string>('LOT-CW-GB-ROB-NEW01');
  const [supplierName, setSupplierName] = useState<string>('HTX Nông Sản Đắk Lắk');
  const [initialQty, setInitialQty] = useState<number>(30000);
  const [unitCostVnd, setUnitCostVnd] = useState<number>(102000);
  const [shippingCostVnd, setShippingCostVnd] = useState<number>(150000);
  const [moisturePct, setMoisturePct] = useState<number>(12.0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => stockSummaries.find((s) => s.item_id === itemId),
    [stockSummaries, itemId],
  );

  const macPreview = useMemo(() => {
    if (initialQty <= 0 || unitCostVnd < 0 || shippingCostVnd < 0) {
      return null;
    }
    const effectiveUnitCostVnd = calculateEffectiveLotUnitCostVnd(
      unitCostVnd,
      shippingCostVnd,
      initialQty,
    );
    const oldQty = selectedSummary?.total_available_qty ?? 0;
    const oldMac = selectedSummary?.moving_avg_cost_vnd ?? 0;
    const projectedNewMacVnd = calculateMovingAverageCostVnd(
      oldQty,
      oldMac,
      initialQty,
      effectiveUnitCostVnd,
    );
    return { effectiveUnitCostVnd, projectedNewMacVnd, oldQty, oldMac };
  }, [initialQty, unitCostVnd, shippingCostVnd, selectedSummary]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await ingestWarehouseLotApi(actorId, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: itemId,
        lot_code: lotCode.trim().toUpperCase(),
        supplier_name: supplierName.trim() || undefined,
        moisture_pct: moisturePct,
        initial_qty: initialQty,
        unit_cost_vnd: Math.round(unitCostVnd),
        shipping_cost_vnd: Math.round(shippingCostVnd),
      });
      setSuccessMsg(
        `Đã nhập lô ${res.data.lot.lot_code}: Giá vốn thực tế ${res.data.effective_unit_cost_vnd.toLocaleString('vi-VN')} đ → MAC mới ${res.data.new_mac_vnd.toLocaleString('vi-VN')} đ`,
      );
      setLotCode(`LOT-CW-${Date.now().toString().slice(-5)}`);
      await onMutated();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể nhập lô hàng.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-4">
          Tổng hợp Tồn Kho Tổng, Giá Vốn MAC &amp; Lô Ưu Tiên FIFO Kế Tiếp
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Tên mặt hàng</th>
                <th className="px-3 py-2.5 text-right">Tồn khả dụng</th>
                <th className="px-3 py-2.5 text-right">Giá vốn MAC (VNĐ)</th>
                <th className="px-3 py-2.5">Lô FIFO kế tiếp</th>
                <th className="px-3 py-2.5">Cảnh báo tồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stockSummaries.map((row) => {
                const nextFifoLot = lots.find(
                  (l) =>
                    l.item_id === row.item_id &&
                    l.status === 'AVAILABLE' &&
                    l.remaining_qty > 0,
                );
                return (
                  <tr key={row.item_id}>
                    <td className="px-3 py-2.5 font-mono text-xs">{row.sku}</td>
                    <td className="px-3 py-2.5 font-medium">{row.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.total_available_qty.toLocaleString('vi-VN')} {row.base_unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {row.moving_avg_cost_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-amber-800">
                      {nextFifoLot?.lot_code ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Dưới ngưỡng ({row.min_stock_threshold.toLocaleString('vi-VN')})
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          An toàn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PackagePlus className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Nhập Lô Hàng Tây Nguyên &amp; Tính Toán Live Preview MAC
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mặt hàng nhập kho
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {stockSummaries.map((s) => (
                <option key={s.item_id} value={s.item_id}>
                  {s.sku} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã Lô (`lot_code`)
            </label>
            <input
              type="text"
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nhà cung cấp Tây Nguyên
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Khối lượng nhập (đơn vị cơ sở)
            </label>
            <input
              type="number"
              min={1}
              step="1"
              value={initialQty}
              onChange={(e) => setInitialQty(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Đơn giá nhập gốc (VNĐ nguyên)
            </label>
            <input
              type="number"
              min={0}
              step="1"
              value={unitCostVnd}
              onChange={(e) => setUnitCostVnd(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cước vận chuyển (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={shippingCostVnd}
                onChange={(e) => setShippingCostVnd(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Độ ẩm (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={moisturePct}
                onChange={(e) => setMoisturePct(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {macPreview && (
            <div className="md:col-span-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Live Preview MAC (Phân bổ cước vận chuyển):</span>
              </div>
              <div className="flex flex-wrap gap-6 font-mono">
                <span>
                  Đơn giá vốn thực tế:{' '}
                  <strong className="text-emerald-800">
                    {macPreview.effectiveUnitCostVnd.toLocaleString('vi-VN')} đ
                  </strong>
                </span>
                <span>
                  MAC hiện tại: {macPreview.oldMac.toLocaleString('vi-VN')} đ → MAC dự kiến:{' '}
                  <strong className="text-emerald-900">
                    {macPreview.projectedNewMacVnd.toLocaleString('vi-VN')} đ
                  </strong>
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50"
            >
              {submitting ? 'Đang nhập kho...' : 'Ghi nhận Lô nhập & Cập nhật MAC'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-3">
          Danh sách Toàn bộ Lô Hàng Kho Tổng (Sắp xếp FIFO chuẩn)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Mã Lô</th>
                <th className="px-3 py-2">Ngày rang</th>
                <th className="px-3 py-2 text-right">Còn lại / Ban đầu</th>
                <th className="px-3 py-2 text-right">Đơn giá vốn (VNĐ)</th>
                <th className="px-3 py-2">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lots.map((lot) => (
                <tr key={lot.id}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{lot.lot_code}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {lot.roast_date ?? 'Nhân xanh'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {lot.remaining_qty.toLocaleString('vi-VN')} /{' '}
                    {lot.initial_qty.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                    {lot.unit_cost_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">{lot.status}</td>
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

### File 3: `C:\bib\cf_19\apps\web\src\features\warehouse\RoasteryBatchLifecyclePanel.tsx`
```tsx
import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Flame, ShieldAlert } from 'lucide-react';
import {
  SEED_IDS,
  calculateRoastYieldLossPct,
  calculateRoastedOutputUnitCostVnd,
  compareFifoLots,
  isAbnormalRoastYieldLoss,
  type RoastBatchDto,
  type WarehouseLotFullDto,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { completeRoastBatchApi } from '../../api/warehouseApi';

export interface RoasteryBatchLifecyclePanelProps {
  actorId: string;
  stockSummaries: WarehouseStockSummaryDTO[];
  lots: WarehouseLotFullDto[];
  roastBatches: RoastBatchDto[];
  onMutated: () => Promise<void>;
}

export function RoasteryBatchLifecyclePanel({
  actorId,
  stockSummaries,
  lots,
  roastBatches,
  onMutated,
}: RoasteryBatchLifecyclePanelProps) {
  const greenItemIds = useMemo(
    () =>
      new Set(
        stockSummaries
          .filter((s) => s.category === 'GREEN_BEAN')
          .map((s) => s.item_id),
      ),
    [stockSummaries],
  );

  const availableGreenLots = useMemo(
    () =>
      lots
        .filter(
          (l) =>
            greenItemIds.has(l.item_id) &&
            l.status === 'AVAILABLE' &&
            l.remaining_qty > 0,
        )
        .sort(compareFifoLots),
    [lots, greenItemIds],
  );

  const roastedItems = useMemo(
    () => stockSummaries.filter((s) => s.category === 'ROASTED_COFFEE'),
    [stockSummaries],
  );

  const [sourceGreenLotId, setSourceGreenLotId] = useState<string>(
    availableGreenLots[0]?.id ?? SEED_IDS.warehouseLots.cwGreenRobusta01,
  );
  const [outputItemId, setOutputItemId] = useState<string>(
    roastedItems[0]?.item_id ?? SEED_IDS.inventoryItems.roastedRobustaMed,
  );
  const [batchCode, setBatchCode] = useState<string>('RB-20261122-001');
  const [outputLotCode, setOutputLotCode] = useState<string>('LOT-CW-RC-ROB-003');
  const [greenInputG, setGreenInputG] = useState<number>(20000);
  const [roastedOutputG, setRoastedOutputG] = useState<number>(16600);
  const [roastProfile, setRoastProfile] = useState<string>('Medium Full City 212C');
  const [enforceFifo, setEnforceFifo] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedSourceLot = useMemo(
    () => availableGreenLots.find((l) => l.id === sourceGreenLotId),
    [availableGreenLots, sourceGreenLotId],
  );

  const fifoWarningLot = useMemo(() => {
    if (!selectedSourceLot) {
      return null;
    }
    const oldestForItem = availableGreenLots.find(
      (l) => l.item_id === selectedSourceLot.item_id,
    );
    if (oldestForItem && oldestForItem.id !== selectedSourceLot.id) {
      return oldestForItem;
    }
    return null;
  }, [availableGreenLots, selectedSourceLot]);

  const preview = useMemo(() => {
    if (greenInputG <= 0 || roastedOutputG <= 0 || roastedOutputG > greenInputG) {
      return null;
    }
    const lossPct = calculateRoastYieldLossPct(greenInputG, roastedOutputG);
    const abnormal = isAbnormalRoastYieldLoss(lossPct);
    const sourceCost = selectedSourceLot?.unit_cost_vnd ?? 95000;
    const outputUnitCostVnd = calculateRoastedOutputUnitCostVnd(
      greenInputG,
      sourceCost,
      roastedOutputG,
    );
    return { lossPct, abnormal, outputUnitCostVnd };
  }, [greenInputG, roastedOutputG, selectedSourceLot]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await completeRoastBatchApi(actorId, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: batchCode.trim().toUpperCase(),
        source_green_lot_id: sourceGreenLotId,
        output_item_id: outputItemId,
        output_lot_code: outputLotCode.trim().toUpperCase(),
        green_input_weight_g: greenInputG,
        roasted_output_weight_g: roastedOutputG,
        roast_profile: roastProfile.trim() || undefined,
        enforce_fifo: enforceFifo,
      });
      setSuccessMsg(
        `Hoàn tất mẻ rang ${res.data.roast_batch.batch_code}: Hao hụt ${res.data.weight_loss_pct}% | Giá vốn hạt rang ${res.data.output_unit_cost_vnd.toLocaleString('vi-VN')} đ`,
      );
      const suffix = Date.now().toString().slice(-4);
      setBatchCode(`RB-20261122-${suffix}`);
      setOutputLotCode(`LOT-CW-RC-${suffix}`);
      await onMutated();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể hoàn tất mẻ rang.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-600" />
          <h2 className="font-bold text-base">
            Kết Chuyển Mẻ Rang Xay (FIFO Lock, Hao Hụt &amp; Giá Vốn Thành Phẩm)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Lô Nhân Xanh nguồn (`GREEN_BEAN`)
            </label>
            <select
              value={sourceGreenLotId}
              onChange={(e) => setSourceGreenLotId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {availableGreenLots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code} (Còn {lot.remaining_qty.toLocaleString('vi-VN')}g)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mặt hàng Hạt Rang đích (`ROASTED_COFFEE`)
            </label>
            <select
              value={outputItemId}
              onChange={(e) => setOutputItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {roastedItems.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã mẻ rang (`batch_code`)
            </label>
            <input
              type="text"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã lô thành phẩm (`output_lot_code`)
            </label>
            <input
              type="text"
              value={outputLotCode}
              onChange={(e) => setOutputLotCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nhân xanh đầu vào (gram)
            </label>
            <input
              type="number"
              min={1}
              value={greenInputG}
              onChange={(e) => setGreenInputG(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Hạt rang thành phẩm thu được (gram)
            </label>
            <input
              type="number"
              min={1}
              value={roastedOutputG}
              onChange={(e) => setRoastedOutputG(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Hồ sơ rang (`roast_profile`)
            </label>
            <input
              type="text"
              value={roastProfile}
              onChange={(e) => setRoastProfile(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 pb-2">
              <input
                type="checkbox"
                checked={enforceFifo}
                onChange={(e) => setEnforceFifo(e.target.checked)}
                className="rounded border-stone-300"
              />
              Khóa bắt buộc FIFO lô nhân xanh cũ trước (`enforce_fifo`)
            </label>
          </div>

          {fifoWarningLot && enforceFifo && (
            <div className="md:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                Cảnh báo khóa FIFO: Lô nhân xanh cũ hơn{' '}
                <strong className="font-mono">{fifoWarningLot.lot_code}</strong> vẫn còn tồn!
                Nếu gửi lệnh với <code>enforce_fifo = true</code>, hệ thống sẽ từ chối (409 FIFO_VIOLATION).
              </span>
            </div>
          )}

          {preview && (
            <div
              className={`md:col-span-3 p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-4 ${
                preview.abnormal
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {preview.abnormal ? (
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
                <span>
                  {preview.abnormal
                    ? 'CẢNH BÁO HAO HỤT BẤT THƯỜNG (Ngoài chuẩn 12.00% – 20.00%)'
                    : 'Hao hụt nằm trong định mức chuẩn Tây Nguyên [12% – 20%]'}
                </span>
              </div>
              <div className="font-mono flex gap-6">
                <span>
                  Hao hụt: <strong>{preview.lossPct.toFixed(2)}%</strong>
                </span>
                <span>
                  Giá vốn hạt rang kết chuyển:{' '}
                  <strong>{preview.outputUnitCostVnd.toLocaleString('vi-VN')} đ</strong>
                </span>
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
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? 'Đang kết chuyển mẻ rang...' : 'Hoàn tất Mẻ Rang & Sinh Lô FIFO'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-3">
          Lịch sử Mẻ Rang Xay ({roastBatches.length} mẻ)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Mã mẻ</th>
                <th className="px-3 py-2 text-right">Nhân xanh (g)</th>
                <th className="px-3 py-2 text-right">Hạt rang (g)</th>
                <th className="px-3 py-2 text-right">Hao hụt (%)</th>
                <th className="px-3 py-2">Hồ sơ rang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {roastBatches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {batch.batch_code}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {batch.green_input_weight_g.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {batch.roasted_output_weight_g.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    <span
                      className={
                        isAbnormalRoastYieldLoss(batch.weight_loss_pct)
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }
                    >
                      {batch.weight_loss_pct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-600">
                    {batch.roast_profile ?? '—'}
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

### File 4: `C:\bib\cf_19\apps\web\src\features\warehouse\FifoAllocationWorkbench.tsx`
```tsx
import { useState } from 'react';
import { Layers, Play, ShieldCheck } from 'lucide-react';
import {
  SEED_IDS,
  type FifoAllocationResultDTO,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { allocateFifoStockApi } from '../../api/warehouseApi';

export interface FifoAllocationWorkbenchProps {
  actorId: string;
  stockSummaries: WarehouseStockSummaryDTO[];
  onMutated: () => Promise<void>;
}

export function FifoAllocationWorkbench({
  actorId,
  stockSummaries,
  onMutated,
}: FifoAllocationWorkbenchProps) {
  const [itemId, setItemId] = useState<string>(
    SEED_IDS.inventoryItems.roastedRobustaMed,
  );
  const [requestedQty, setRequestedQty] = useState<number>(30000);
  const [referenceCode, setReferenceCode] = useState<string>('TRF-FIFO-DEMO-01');
  const [loading, setLoading] = useState<boolean>(false);
  const [lastDryRun, setLastDryRun] = useState<boolean>(true);
  const [result, setResult] = useState<FifoAllocationResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAllocation = async (dryRun: boolean) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await allocateFifoStockApi(actorId, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: itemId,
        requested_qty: requestedQty,
        reference_code: referenceCode.trim() || undefined,
        reason: dryRun ? 'FIFO dry-run simulation' : 'Atomic FIFO commit allocation',
        dry_run: dryRun,
      });
      setResult(res.data);
      setLastDryRun(dryRun);
      if (!dryRun) {
        await onMutated();
      }
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể phân bổ FIFO.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-base">
            Bàn Phân Bổ &amp; Vét Cạn Đa Lô FIFO (Dry-Run vs Atomic Commit)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mặt hàng xuất kho FIFO
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {stockSummaries.map((s) => (
                <option key={s.item_id} value={s.item_id}>
                  {s.sku} — Tồn: {s.total_available_qty.toLocaleString('vi-VN')} {s.base_unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số lượng yêu cầu xuất (đơn vị cơ sở)
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
              Mã phiếu tham chiếu (`reference_code`)
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAllocation(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-sm font-semibold hover:bg-indigo-100 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Mô phỏng Phân bổ FIFO (Dry-Run)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAllocation(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            Khóa &amp; Trừ Kho Thực Tế (Atomic Commit)
          </button>
        </div>
      </section>

      {result && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-base">
              Kết quả Phân bổ Đa Lô FIFO ({lastDryRun ? 'MÔ PHỎNG DRY-RUN' : 'ĐÃ TRỪ KHO ATOMIC'})
            </h3>
            <div className="text-xs font-mono space-x-4">
              <span>
                Tổng xuất: <strong>{result.total_allocated_qty.toLocaleString('vi-VN')}</strong>
              </span>
              <span>
                Tổng COGS:{' '}
                <strong className="text-emerald-700">
                  {result.total_cogs_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </span>
              <span>
                Đơn giá bình quân xuất:{' '}
                <strong className="text-indigo-700">
                  {result.weighted_unit_cost_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Lô FIFO</th>
                  <th className="px-3 py-2">Ngày rang</th>
                  <th className="px-3 py-2 text-right">Lượng cắt</th>
                  <th className="px-3 py-2 text-right">Còn lại sau cắt</th>
                  <th className="px-3 py-2 text-right">Đơn giá lô (VNĐ)</th>
                  <th className="px-3 py-2 text-right">COGS lát cắt (VNĐ)</th>
                  <th className="px-3 py-2">Trạng thái sau cắt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {result.allocations.map((slice) => (
                  <tr key={slice.lot_id}>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">
                      {slice.lot_code}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {slice.roast_date ?? 'Nhân xanh'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold">
                      {slice.allocated_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {slice.remaining_after_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {slice.unit_cost_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {slice.slice_cogs_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span
                        className={
                          slice.lot_status_after === 'DEPLETED'
                            ? 'text-red-600 font-bold'
                            : 'text-emerald-700 font-semibold'
                        }
                      >
                        {slice.lot_status_after}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M2.3 Pawn 1`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\api\warehouseApi.ts','C:\bib\cf_19\apps\web\src\features\warehouse\LotIngestMacPanel.tsx','C:\bib\cf_19\apps\web\src\features\warehouse\RoasteryBatchLifecyclePanel.tsx','C:\bib\cf_19\apps\web\src\features\warehouse\FifoAllocationWorkbench.tsx') | ForEach-Object { "$_ => $(Test-Path $_)" }
```

---

# ============================================================================
# PHIẾU TỐT #2 (`pawn-flash-2` — `gemini-3.8-flash-high`)
# CONTAINER ORCHESTRATOR, TÍCH HỢP LAYOUT & VITEST FRONTEND TESTS (4 FILES)
# ============================================================================

# CHỈ THỊ THỰC THI CODE (CHẾ ĐỘ QUÂN TỐT - ZERO REASONING)

Bạn là **Quân Tốt #2 (`pawn-flash-2` — Code Worker - Gemini 3.8 Flash High)**.
Nhiệm vụ của bạn là tạo/cập nhật **100% chính xác từng ký tự** 4 file dưới đây: `WarehousePortalView.tsx`, cập nhật `WarehouseLayout.tsx`, cập nhật `ExecutiveLayout.tsx`, và tạo bộ 14 Vitest Frontend Tests `m2-warehouse-workbench.test.ts`.

## 1. KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)
- **CẤM SUY LUẬN / CẤM SÁNG TẠO:** Ghi nguyên văn toàn bộ nội dung code đã được Quân Hậu biên soạn sẵn trong mục 3. Không thêm import thừa, không rút gọn test cases.
- **CẤM MỞ RỘNG PHẠM VI:** Chỉ được chạm đúng 4 file trong mục 2. Tuyệt đối KHÔNG chạm vào 4 file của `pawn-flash-1`.
- **KHÔNG CHẠY `npm install`:** Chỉ ghi 4 file và chạy `Test-Path` ở mục 5, sau đó báo cáo `@coordinator [done] M2.3 Pawn 2`.

## 2. DANH SÁCH FILE ĐƯỢC PHÉP CHẠM VÀO (4 TARGET FILES)
1. `C:\bib\cf_19\apps\web\src\features\warehouse\WarehousePortalView.tsx` (Tạo mới)
2. `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx` (Cập nhật — Overwrite)
3. `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (Cập nhật — Overwrite)
4. `C:\bib\cf_19\apps\web\src\__tests__\m2-warehouse-workbench.test.ts` (Tạo mới)

## 3. HỢP ĐỒNG KIỂU DỮ LIỆU & NỘI DUNG FILE NGUYÊN VĂN (VERBATIM CONTRACTS)

### File 1: `C:\bib\cf_19\apps\web\src\features\warehouse\WarehousePortalView.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Flame,
  Layers,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import type {
  RoastBatchDto,
  WarehouseLotFullDto,
  WarehouseOverviewDTO,
} from '@cf19/shared';
import type { DataSourceMode } from '../../api/apiClient';
import {
  fetchRoastBatches,
  fetchWarehouseLots,
  fetchWarehouseOverview,
} from '../../api/warehouseApi';
import { FifoAllocationWorkbench } from './FifoAllocationWorkbench';
import { LotIngestMacPanel } from './LotIngestMacPanel';
import { RoasteryBatchLifecyclePanel } from './RoasteryBatchLifecyclePanel';

type WarehouseTab = 'ingest' | 'roastery' | 'fifo';

export interface WarehousePortalViewProps {
  actorId: string;
}

export function WarehousePortalView({ actorId }: WarehousePortalViewProps) {
  const [activeTab, setActiveTab] = useState<WarehouseTab>('ingest');
  const [overview, setOverview] = useState<WarehouseOverviewDTO | null>(null);
  const [lots, setLots] = useState<WarehouseLotFullDto[]>([]);
  const [roastBatches, setRoastBatches] = useState<RoastBatchDto[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');
  const [loading, setLoading] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, lotsRes, batchesRes] = await Promise.all([
        fetchWarehouseOverview(actorId),
        fetchWarehouseLots(actorId),
        fetchRoastBatches(actorId),
      ]);
      setOverview(ovRes.data);
      setLots(lotsRes.data);
      setRoastBatches(batchesRes.data);
      setSource(ovRes.source);
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Tổng giá trị tồn Kho Tổng</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-mono font-bold text-emerald-700 mt-2">
            {(overview?.total_inventory_value_vnd ?? 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Nguồn: {source}</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Lô hàng khả dụng FIFO</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-mono font-bold text-stone-900 mt-2">
            {overview?.total_available_lots ?? 0} lô
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Tổng {overview?.total_skus ?? 0} mặt hàng SKU
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Mẻ rang đã kết chuyển</span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-lg font-mono font-bold text-stone-900 mt-2">
            {overview?.recent_roast_batches_count ?? 0} mẻ
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Chuẩn hao hụt 12% – 20%
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>SKU dưới ngưỡng an toàn</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-lg font-mono font-bold text-red-700 mt-2">
            {overview?.low_stock_sku_count ?? 0} SKU
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Cần nhập bổ sung Tây Nguyên
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ingest')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'ingest'
                ? 'bg-amber-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            1. Nhập Kho &amp; MAC
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roastery')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'roastery'
                ? 'bg-orange-600 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Flame className="w-4 h-4" />
            2. Mẻ Rang &amp; Hao Hụt FIFO
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fifo')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'fifo'
                ? 'bg-indigo-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            3. Phân Bổ Đa Lô FIFO
          </button>
        </div>

        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {overview && activeTab === 'ingest' && (
        <LotIngestMacPanel
          actorId={actorId}
          stockSummaries={overview.stock_summaries}
          lots={lots}
          onMutated={loadAll}
        />
      )}

      {overview && activeTab === 'roastery' && (
        <RoasteryBatchLifecyclePanel
          actorId={actorId}
          stockSummaries={overview.stock_summaries}
          lots={lots}
          roastBatches={roastBatches}
          onMutated={loadAll}
        />
      )}

      {overview && activeTab === 'fifo' && (
        <FifoAllocationWorkbench
          actorId={actorId}
          stockSummaries={overview.stock_summaries}
          onMutated={loadAll}
        />
      )}
    </div>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx`
```tsx
import { Lock } from 'lucide-react';
import { RoleShellHeader } from '../components/RoleGuard';
import { WarehousePortalView } from '../features/warehouse/WarehousePortalView';
import { useAuthStore } from '../store/authStore';

export function WarehouseLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Kho Tổng Rang Xay Tây Nguyên (WMS & FIFO Workbench)"
        subtitle="Nhập nhân xanh MAC, kết chuyển mẻ rang hao hụt & vét cạn đa lô FIFO"
        badgeText="WAREHOUSE_MANAGER"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Phân vùng bảo mật RBAC: Quản lý Kho Tổng xem đầy đủ giá vốn MAC và lô hàng FIFO Tây Nguyên;
            tuyệt đối không có quyền truy cập doanh thu bán nước hay két tiền của 4 Quán.
          </span>
        </div>

        <WarehousePortalView actorId={actor.id} />
      </main>
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx`
```tsx
import { useEffect, useState } from 'react';
import { Boxes, Building2, FileText, ShieldCheck } from 'lucide-react';
import { SEED_IDS, type AuditLogDto, type StoreDto } from '@cf19/shared';
import {
  fetchAuditLogs,
  fetchStoreInventory,
  fetchStores,
  type AnyInventoryItemRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { WarehousePortalView } from '../features/warehouse/WarehousePortalView';
import { useAuthStore } from '../store/authStore';

type ExecutiveTab = 'overview' | 'warehouse';

export function ExecutiveLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('overview');
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [storesRes, invRes, auditRes] = await Promise.all([
        fetchStores(actor.id, actor.role, actor.assignedStoreId),
        fetchStoreInventory(actor.id, SEED_IDS.stores.centralWarehouse, actor.role),
        fetchAuditLogs(actor.id),
      ]);
      if (!active) {
        return;
      }
      setStores(storesRes.data);
      setInventory(invRes.data);
      setAuditLogs(auditRes.data);
      setSource(storesRes.source);
    };
    void load();
    return () => {
      active = false;
    };
  }, [actor.id, actor.role, actor.assignedStoreId]);

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Executive Command Center — Chủ Chuỗi CF19"
        subtitle={`Toàn quyền P&L, Kho Tổng MAC/FIFO & Nhật ký bất biến (${source})`}
        badgeText="SUPER_ADMIN"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-amber-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Tổng quan Chuỗi &amp; Audit Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('warehouse')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'warehouse'
                ? 'bg-amber-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Kho Tổng &amp; Mẻ Rang FIFO
          </button>
        </div>

        {activeTab === 'warehouse' ? (
          <WarehousePortalView actorId={actor.id} />
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-amber-700" />
                <h2 className="font-bold text-base">
                  Hệ thống 5 Điểm Vận Hành (1 Kho Tổng + 4 Quán Cà Phê)
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="rounded-xl border border-stone-200 p-4 bg-stone-50"
                  >
                    <div className="text-xs font-mono font-bold text-amber-800">
                      {store.code}
                    </div>
                    <div className="text-sm font-semibold mt-1">{store.name}</div>
                    <div className="text-xs text-stone-500 mt-1">{store.type}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h2 className="font-bold text-base">
                  Danh mục Vật tư &amp; Giá vốn MAC Tây Nguyên (Chỉ Chủ Chuỗi &amp; Kho Tổng thấy)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Tên vật tư</th>
                      <th className="px-4 py-2.5">Đơn vị</th>
                      <th className="px-4 py-2.5 text-right">Giá vốn MAC (VNĐ)</th>
                      <th className="px-4 py-2.5 text-right">Giá chuyển nội bộ (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 font-mono text-xs">{item.sku}</td>
                        <td className="px-4 py-2.5 font-medium">{item.name}</td>
                        <td className="px-4 py-2.5">{item.base_unit}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                          {item.moving_avg_cost_vnd !== undefined
                            ? item.moving_avg_cost_vnd.toLocaleString('vi-VN')
                            : 'MASKED'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {item.internal_transfer_price_vnd.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-700" />
                <h2 className="font-bold text-base">
                  Nhật ký Audit Logs Bất Biến ({auditLogs.length} bản ghi)
                </h2>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-stone-500">
                  Chưa có thao tác phê duyệt PIN hoặc hủy đơn nào trong phiên hiện tại.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex flex-wrap justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-800">
                          {log.action}
                        </span>{' '}
                        —{' '}
                        <span className="text-stone-600">
                          {log.reason ?? log.target_table}
                        </span>
                      </div>
                      <div className="font-mono text-stone-500">
                        {log.created_at}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
```

### File 4: `C:\bib\cf_19\apps\web\src\__tests__\m2-warehouse-workbench.test.ts`
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_IDS } from '@cf19/shared';
import { ApiClientError } from '../api/apiClient';
import {
  offlineAllocateFifoStock,
  offlineCompleteRoastBatch,
  offlineGetWarehouseOverview,
  offlineIngestWarehouseLot,
  offlineListRoastBatches,
  offlineListWarehouseLots,
  resetOfflineWarehouseState,
} from '../api/warehouseApi';

describe('M2.3 — @cf19/web Warehouse Workbench Engine (MAC, Roastery FIFO & Multi-Lot Allocation)', () => {
  beforeEach(() => {
    resetOfflineWarehouseState();
  });

  it('1. offlineGetWarehouseOverview computes total SKUs, available lots & inventory value', () => {
    const overview = offlineGetWarehouseOverview();
    expect(overview.warehouse_code).toBe('CW-TAYNGUYEN');
    expect(overview.total_skus).toBe(4);
    expect(overview.total_available_lots).toBe(3);
    expect(overview.recent_roast_batches_count).toBe(1);
    expect(overview.total_inventory_value_vnd).toBeGreaterThan(0);
  });

  it('2. offlineListWarehouseLots returns lots strictly sorted in FIFO priority order', () => {
    const lots = offlineListWarehouseLots();
    expect(lots.map((l) => l.lot_code)).toEqual([
      'LOT-CW-GB-ROB-001',
      'LOT-CW-RC-ROB-001',
      'LOT-CW-RC-ROB-002',
    ]);
  });

  it('3. offlineListRoastBatches returns seeded roast batch RB-20261110-001', () => {
    const batches = offlineListRoastBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0]?.batch_code).toBe('RB-20261110-001');
  });

  it('4. offlineIngestWarehouseLot amortizes shipping cost and recalculates MAC identically to backend', () => {
    const res = offlineIngestWarehouseLot({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-GB-ROB-002',
      initial_qty: 30000,
      unit_cost_vnd: 105000,
      shipping_cost_vnd: 150000,
    });
    expect(res.effective_unit_cost_vnd).toBe(105005);
    expect(res.new_mac_vnd).toBe(99751);
  });

  it('5. offlineIngestWarehouseLot rejects duplicate lot_code with 409 DUPLICATE_LOT_CODE', () => {
    expect(() =>
      offlineIngestWarehouseLot({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
        lot_code: 'LOT-CW-GB-ROB-001',
        initial_qty: 10000,
        unit_cost_vnd: 95000,
        shipping_cost_vnd: 0,
      }),
    ).toThrow(ApiClientError);
  });

  it('6. offlineCompleteRoastBatch enforces FIFO lock blocking newer green bean lot while older lot has stock', () => {
    const newer = offlineIngestWarehouseLot({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-GB-NEWER',
      initial_qty: 20000,
      unit_cost_vnd: 100000,
      shipping_cost_vnd: 0,
    });

    expect(() =>
      offlineCompleteRoastBatch(SEED_IDS.users.warehouseManager, {
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: 'RB-FIFO-BLOCK',
        source_green_lot_id: newer.lot.id,
        output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        output_lot_code: 'LOT-CW-RC-BLOCK',
        green_input_weight_g: 10000,
        roasted_output_weight_g: 8300,
        enforce_fifo: true,
      }),
    ).toThrow(ApiClientError);
  });

  it('7. offlineCompleteRoastBatch permits FIFO override when enforce_fifo is false', () => {
    const newer = offlineIngestWarehouseLot({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.greenRobustaDakLak,
      lot_code: 'LOT-CW-GB-OVR',
      initial_qty: 20000,
      unit_cost_vnd: 100000,
      shipping_cost_vnd: 0,
    });

    const res = offlineCompleteRoastBatch(SEED_IDS.users.superAdmin, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-FIFO-OVR',
      source_green_lot_id: newer.lot.id,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-OVR',
      green_input_weight_g: 10000,
      roasted_output_weight_g: 8400,
      enforce_fifo: false,
    });
    expect(res.weight_loss_pct).toBe(16);
    expect(res.is_abnormal_yield_loss).toBe(false);
  });

  it('8. offlineCompleteRoastBatch transfers cost and updates roasted MAC for normal 17% batch', () => {
    const res = offlineCompleteRoastBatch(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-NORMAL-17',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-003',
      green_input_weight_g: 30000,
      roasted_output_weight_g: 24900,
      enforce_fifo: true,
    });
    expect(res.weight_loss_pct).toBe(17);
    expect(res.is_abnormal_yield_loss).toBe(false);
    expect(res.output_unit_cost_vnd).toBe(114458);
    expect(res.new_output_item_mac_vnd).toBe(121239);
  });

  it('9. offlineCompleteRoastBatch flags abnormal yield loss when loss exceeds 20%', () => {
    const res = offlineCompleteRoastBatch(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-ABNORM-25',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-ABN',
      green_input_weight_g: 10000,
      roasted_output_weight_g: 7500,
      enforce_fifo: true,
    });
    expect(res.weight_loss_pct).toBe(25);
    expect(res.is_abnormal_yield_loss).toBe(true);
  });

  it('10. offlineCompleteRoastBatch depletes source green lot when remaining reaches 0', () => {
    const res = offlineCompleteRoastBatch(SEED_IDS.users.warehouseManager, {
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      batch_code: 'RB-DEPLETE',
      source_green_lot_id: SEED_IDS.warehouseLots.cwGreenRobusta01,
      output_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      output_lot_code: 'LOT-CW-RC-DEP',
      green_input_weight_g: 90000,
      roasted_output_weight_g: 74700,
      enforce_fifo: true,
    });
    expect(res.source_lot_remaining_qty).toBe(0);
    expect(res.source_lot_status).toBe('DEPLETED');
  });

  it('11. offlineAllocateFifoStock dry_run computes 2-lot slices without mutating remaining_qty', () => {
    const res = offlineAllocateFifoStock({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      requested_qty: 30000,
      dry_run: true,
    });
    expect(res.allocations).toHaveLength(2);
    expect(res.allocations[0]?.allocated_qty).toBe(24900);
    expect(res.allocations[1]?.allocated_qty).toBe(5100);
    expect(res.weighted_unit_cost_vnd).toBe(124755);

    const lots = offlineListWarehouseLots();
    expect(lots.find((l) => l.lot_code === 'LOT-CW-RC-ROB-001')?.remaining_qty).toBe(24900);
  });

  it('12. offlineAllocateFifoStock commit depletes oldest lot and deducts remainder from second lot', () => {
    const res = offlineAllocateFifoStock({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      requested_qty: 30000,
      dry_run: false,
    });
    expect(res.total_cogs_vnd).toBe(3742650000);
    expect(res.allocations[0]?.lot_status_after).toBe('DEPLETED');
    expect(res.allocations[1]?.remaining_after_qty).toBe(14900);

    const lots = offlineListWarehouseLots();
    expect(lots.find((l) => l.lot_code === 'LOT-CW-RC-ROB-001')?.status).toBe('DEPLETED');
    expect(lots.find((l) => l.lot_code === 'LOT-CW-RC-ROB-002')?.remaining_qty).toBe(14900);
  });

  it('13. offlineAllocateFifoStock rejects over-allocation with 409 INSUFFICIENT_FIFO_STOCK atomically', () => {
    expect(() =>
      offlineAllocateFifoStock({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        requested_qty: 60000,
        dry_run: false,
      }),
    ).toThrow(ApiClientError);

    const lots = offlineListWarehouseLots();
    expect(lots.find((l) => l.lot_code === 'LOT-CW-RC-ROB-001')?.remaining_qty).toBe(24900);
  });

  it('14. resetOfflineWarehouseState cleanly restores baseline inventory after mutations', () => {
    offlineAllocateFifoStock({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
      requested_qty: 10000,
      dry_run: false,
    });
    resetOfflineWarehouseState();
    const lots = offlineListWarehouseLots();
    expect(lots.find((l) => l.lot_code === 'LOT-CW-RC-ROB-001')?.remaining_qty).toBe(24900);
  });
});
```

## 4. ĐẶC TẢ LOGIC TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION SPEC)
1. Ghi đủ 4 file theo đúng đường dẫn tuyệt đối và đúng nguyên văn nội dung ở mục 3.
2. Chạy lệnh `Test-Path` ở mục 5 và báo cáo `@coordinator [done] M2.3 Pawn 2`.

## 5. LỆNH KIỂM TRA SAU KHI VIẾT XONG (VERIFICATION COMMAND)
```powershell
@('C:\bib\cf_19\apps\web\src\features\warehouse\WarehousePortalView.tsx','C:\bib\cf_19\apps\web\src\layouts\WarehouseLayout.tsx','C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx','C:\bib\cf_19\apps\web\src\__tests__\m2-warehouse-workbench.test.ts') | ForEach-Object { "$_ => $(Test-Path $_)" }
```
