# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M7.3 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M7.3 - Frontend Executive P&L Command Center, Store Comparison Matrix & 1-Click Franchise Store Cloning Wizard + Vitest Suite (@cf19/web)`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M7_3_KING_CHARTER.md`, `M7_1_QUEEN_PAWN_SPECS.md`, `M7_2_QUEEN_PAWN_SPECS.md`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không để biến/import thừa (`noUnusedLocals: true`, `noUnusedParameters: true`), dùng import không đuôi `.js` trong `@cf19/web` (`moduleResolution: "bundler"`).
  - Bảo toàn 100% **88/88 bài test hiện có của `@cf19/web`**. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 3 files trong `@cf19/web`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\web\src\api\executiveAnalyticsApi.ts` (Tạo mới)
  2. `C:\bib\cf_19\apps\web\src\features\analytics\ExecutivePnlConsolidationPanel.tsx` (Tạo mới)
  3. `C:\bib\cf_19\apps\web\src\features\analytics\FranchiseStoreCloningWizard.tsx` (Tạo mới)

### File 1: `C:\bib\cf_19\apps\web\src\api\executiveAnalyticsApi.ts`

```ts
import {
  MAX_FRANCHISE_PRICE_MULTIPLIER,
  MIN_FRANCHISE_PRICE_MULTIPLIER,
  SEED_IDS,
  calculateCentralWarehousePnl,
  calculateStoreNodePnl,
  consolidateEnterprisePnl,
  convertToKgForTierPricing,
  previewClonedStoreMenuPricing,
  type CloneFranchiseStoreInput,
  type CloneFranchiseStoreResultDTO,
  type ClonedMenuProductPricePreviewDTO,
  type EnterpriseConsolidatedPnlDTO,
  type ExecutivePnlQueryInput,
  type FranchiseMenuProductSourceInput,
  type StarterTransferSummaryDTO,
  type StoreDto,
  type StoreNodePnlInputDTO,
} from '@cf19/shared';
import { ApiClientError, type ApiCallResult } from './apiClient';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

const OFFLINE_MASTER_MENU: FranchiseMenuProductSourceInput[] = [
  {
    product_id: SEED_IDS.menuProducts.caPheSuaDa,
    product_code: 'PRD-CF-SUA-DA',
    product_name: 'Cà Phê Sữa Đá Tây Nguyên',
    master_base_price_vnd: 29000,
    default_variant_bom_cogs_vnd: 6260,
  },
  {
    product_id: SEED_IDS.menuProducts.caPheDenDa,
    product_code: 'PRD-CF-DEN-DA',
    product_name: 'Cà Phê Đen Đá Nguyên Chất',
    master_base_price_vnd: 25000,
    default_variant_bom_cogs_vnd: 4730,
  },
  {
    product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
    product_code: 'PRD-BAC-XIU',
    product_name: 'Bạc Xỉu Tây Nguyên',
    master_base_price_vnd: 35000,
    default_variant_bom_cogs_vnd: 8650,
  },
];

interface OfflineExecutiveState {
  storeNodes: StoreNodePnlInputDTO[];
  existingStoreCodes: Set<string>;
}

function createInitialOfflineExecutiveState(): OfflineExecutiveState {
  return {
    storeNodes: [
      {
        store_id: SEED_IDS.stores.store01,
        store_code: 'STORE-01',
        store_name: 'CF19 Quán 1 — Trung Tâm Thị Trấn',
        store_type: 'RETAIL_STORE',
        price_multiplier: 1.0,
        paid_orders_count: 210,
        cash_revenue_vnd: 12_400_000,
        vietqr_revenue_vnd: 23_600_000,
        store_internal_bom_cogs_vnd: 10_800_000,
        labor_cost_vnd: 6_200_000,
        cash_shortage_loss_vnd: 45_000,
        stocktake_shrinkage_loss_vnd: 135_000,
      },
      {
        store_id: SEED_IDS.stores.store02,
        store_code: 'STORE-02',
        store_name: 'CF19 Quán 2 — Quảng Trường',
        store_type: 'RETAIL_STORE',
        price_multiplier: 1.0,
        paid_orders_count: 175,
        cash_revenue_vnd: 10_200_000,
        vietqr_revenue_vnd: 19_800_000,
        store_internal_bom_cogs_vnd: 9_100_000,
        labor_cost_vnd: 5_400_000,
        cash_shortage_loss_vnd: 0,
        stocktake_shrinkage_loss_vnd: 90_000,
      },
      {
        store_id: SEED_IDS.stores.store03,
        store_code: 'STORE-03',
        store_name: 'CF19 Quán 3 — Đại Lộ Đông Tây',
        store_type: 'RETAIL_STORE',
        price_multiplier: 1.05,
        paid_orders_count: 160,
        cash_revenue_vnd: 8_900_000,
        vietqr_revenue_vnd: 20_500_000,
        store_internal_bom_cogs_vnd: 8_500_000,
        labor_cost_vnd: 5_200_000,
        cash_shortage_loss_vnd: 20_000,
        stocktake_shrinkage_loss_vnd: 60_000,
      },
      {
        store_id: SEED_IDS.stores.store04,
        store_code: 'STORE-04',
        store_name: 'CF19 Quán 4 — Công Viên Hồ Điều Hòa',
        store_type: 'RETAIL_STORE',
        price_multiplier: 1.0,
        paid_orders_count: 120,
        cash_revenue_vnd: 7_500_000,
        vietqr_revenue_vnd: 12_500_000,
        store_internal_bom_cogs_vnd: 6_200_000,
        labor_cost_vnd: 4_800_000,
        cash_shortage_loss_vnd: 15_000,
        stocktake_shrinkage_loss_vnd: 45_000,
      },
    ],
    existingStoreCodes: new Set([
      'CW-TAYNGUYEN',
      'STORE-01',
      'STORE-02',
      'STORE-03',
      'STORE-04',
    ]),
  };
}

let offlineState: OfflineExecutiveState = createInitialOfflineExecutiveState();

export function resetOfflineExecutiveAnalyticsState(): void {
  offlineState = createInitialOfflineExecutiveState();
}

export function offlineGetExecutivePnlConsolidation(
  query: Partial<ExecutivePnlQueryInput> = {},
): EnterpriseConsolidatedPnlDTO {
  const warehouseOpex = query.warehouse_operating_expense_vnd ?? 4_000_000;
  const royaltyPct = query.franchise_royalty_pct ?? 5.0;

  const warehouse = calculateCentralWarehousePnl({
    warehouse_store_id: SEED_IDS.stores.centralWarehouse,
    warehouse_code: 'CW-TAYNGUYEN',
    warehouse_name: 'Kho Tổng Rang Xay Tây Nguyên',
    b2b_orders_count: 14,
    reconciled_transfers_count: 12,
    b2b_external_revenue_vnd: 42_500_000,
    b2b_raw_cogs_vnd: 26_800_000,
    internal_transfer_revenue_vnd: 15_500_000,
    internal_transfer_raw_cogs_vnd: 12_450_000,
    warehouse_operating_expense_vnd: warehouseOpex,
  });

  const stores = offlineState.storeNodes.map((node) =>
    calculateStoreNodePnl({
      ...node,
      franchise_royalty_pct: royaltyPct,
    }),
  );

  return consolidateEnterprisePnl({
    warehouse,
    stores,
    period_from: query.period_from ?? null,
    period_to: query.period_to ?? null,
  });
}

export function offlinePreviewFranchisePricing(
  priceMultiplier: number,
): ClonedMenuProductPricePreviewDTO[] {
  if (
    !Number.isFinite(priceMultiplier) ||
    priceMultiplier < MIN_FRANCHISE_PRICE_MULTIPLIER ||
    priceMultiplier > MAX_FRANCHISE_PRICE_MULTIPLIER
  ) {
    throw new ApiClientError(
      400,
      'INVALID_PRICE_MULTIPLIER',
      'price_multiplier must be between 0.50 and 3.00',
    );
  }
  return previewClonedStoreMenuPricing(priceMultiplier, OFFLINE_MASTER_MENU);
}

export function offlineCloneFranchiseStore(
  input: CloneFranchiseStoreInput,
  initialDemoPosRevenueVnd: number = 0,
): CloneFranchiseStoreResultDTO {
  const cleanCode = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(cleanCode)) {
    throw new ApiClientError(
      400,
      'INVALID_STORE_CODE',
      'Store code must be 3-32 uppercase alphanumeric/hyphen/underscore characters',
    );
  }
  if (
    !Number.isFinite(input.price_multiplier) ||
    input.price_multiplier < MIN_FRANCHISE_PRICE_MULTIPLIER ||
    input.price_multiplier > MAX_FRANCHISE_PRICE_MULTIPLIER
  ) {
    throw new ApiClientError(
      400,
      'INVALID_PRICE_MULTIPLIER',
      'price_multiplier must be between 0.50 and 3.00',
    );
  }
  if (offlineState.existingStoreCodes.has(cleanCode)) {
    throw new ApiClientError(
      409,
      'DUPLICATE_STORE_CODE',
      `Store code ${cleanCode} already exists`,
    );
  }

  const nowIso = new Date().toISOString();
  const newStoreId = crypto.randomUUID();
  const openingShiftId = crypto.randomUUID();

  const newStore: StoreDto = {
    id: newStoreId,
    organization_id: SEED_IDS.organization.cf19,
    code: cleanCode,
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    phone: input.phone?.trim() ?? null,
    price_multiplier: input.price_multiplier,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  let starterTransfer: StarterTransferSummaryDTO | null = null;
  if (input.create_starter_transfer) {
    const kg = convertToKgForTierPricing(input.starter_coffee_qty_g, 'g');
    const totalInternalValue = Math.round(kg * 155_000);
    starterTransfer = {
      transfer_id: crypto.randomUUID(),
      transfer_code: `TRF-INIT-${cleanCode}-${nowIso.slice(0, 10).replace(/-/g, '')}`,
      status: 'REQUESTED',
      total_internal_value_vnd: totalInternalValue,
    };
  }

  offlineState.existingStoreCodes.add(cleanCode);
  offlineState.storeNodes.push({
    store_id: newStore.id,
    store_code: newStore.code,
    store_name: newStore.name,
    store_type: input.type,
    price_multiplier: input.price_multiplier,
    paid_orders_count: initialDemoPosRevenueVnd > 0 ? 10 : 0,
    cash_revenue_vnd: initialDemoPosRevenueVnd,
    vietqr_revenue_vnd: 0,
    store_internal_bom_cogs_vnd: Math.round(initialDemoPosRevenueVnd * 0.3),
    labor_cost_vnd: 0,
    cash_shortage_loss_vnd: 0,
    stocktake_shrinkage_loss_vnd: 0,
  });

  const clonedMenuPreview = offlinePreviewFranchisePricing(input.price_multiplier);

  return {
    store: newStore,
    opening_shift_id: openingShiftId,
    starter_transfer: starterTransfer,
    cloned_menu_preview: clonedMenuPreview,
    cloned_at: nowIso,
  };
}

async function analyticsFetchJson<T>(
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
      body.error?.code ?? 'ANALYTICS_API_ERROR',
      body.error?.message ?? `HTTP ${response.status}`,
    );
  }
  return body.data as T;
}

export async function fetchExecutivePnlConsolidationApi(
  actorId: string,
  query: Partial<ExecutivePnlQueryInput> = {},
): Promise<ApiCallResult<EnterpriseConsolidatedPnlDTO>> {
  const params = new URLSearchParams();
  if (query.period_from) params.set('period_from', query.period_from);
  if (query.period_to) params.set('period_to', query.period_to);
  if (query.warehouse_operating_expense_vnd !== undefined) {
    params.set(
      'warehouse_operating_expense_vnd',
      String(query.warehouse_operating_expense_vnd),
    );
  }
  if (query.franchise_royalty_pct !== undefined) {
    params.set('franchise_royalty_pct', String(query.franchise_royalty_pct));
  }

  const qs = params.toString();
  try {
    const data = await analyticsFetchJson<EnterpriseConsolidatedPnlDTO>(
      `/api/v1/analytics/pnl-consolidation${qs ? `?${qs}` : ''}`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineGetExecutivePnlConsolidation(query),
      source: 'offline_fallback',
    };
  }
}

export async function previewFranchisePricingApi(
  actorId: string,
  priceMultiplier: number,
): Promise<ApiCallResult<ClonedMenuProductPricePreviewDTO[]>> {
  try {
    const data = await analyticsFetchJson<ClonedMenuProductPricePreviewDTO[]>(
      `/api/v1/analytics/franchise/preview-pricing?price_multiplier=${encodeURIComponent(String(priceMultiplier))}`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlinePreviewFranchisePricing(priceMultiplier),
      source: 'offline_fallback',
    };
  }
}

export async function cloneFranchiseStoreApi(
  actorId: string,
  payload: CloneFranchiseStoreInput,
): Promise<ApiCallResult<CloneFranchiseStoreResultDTO>> {
  try {
    const data = await analyticsFetchJson<CloneFranchiseStoreResultDTO>(
      '/api/v1/analytics/franchise/clone-store',
      actorId,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineCloneFranchiseStore(payload),
      source: 'offline_fallback',
    };
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\src\features\analytics\ExecutivePnlConsolidationPanel.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  BarChart3,
  Boxes,
  Building2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { EnterpriseConsolidatedPnlDTO } from '@cf19/shared';
import { ApiClientError, type DataSourceMode } from '../../api/apiClient';
import { fetchExecutivePnlConsolidationApi } from '../../api/executiveAnalyticsApi';

export interface ExecutivePnlConsolidationPanelProps {
  actorId: string;
  refreshSignal: number;
}

export function ExecutivePnlConsolidationPanel({
  actorId,
  refreshSignal,
}: ExecutivePnlConsolidationPanelProps) {
  const [report, setReport] = useState<EnterpriseConsolidatedPnlDTO | null>(null);
  const [source, setSource] = useState<DataSourceMode>('live_api');
  const [warehouseOpexInput, setWarehouseOpexInput] = useState<string>('4000000');
  const [royaltyPctInput, setRoyaltyPctInput] = useState<string>('5');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPnl = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const parsedOpex = Math.max(0, Math.round(Number(warehouseOpexInput) || 0));
    const parsedRoyalty = Math.min(50, Math.max(0, Number(royaltyPctInput) || 5));

    try {
      const res = await fetchExecutivePnlConsolidationApi(actorId, {
        warehouse_operating_expense_vnd: parsedOpex,
        franchise_royalty_pct: parsedRoyalty,
      });
      setReport(res.data);
      setSource(res.source);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể tải báo cáo Lãi - Lỗ Hợp nhất.');
      }
    } finally {
      setLoading(false);
    }
  }, [actorId, warehouseOpexInput, royaltyPctInput]);

  useEffect(() => {
    void loadPnl();
  }, [loadPnl, refreshSignal]);

  const consolidatedGross = useMemo(() => {
    if (!report) {
      return { profit: 0, marginPct: 0 };
    }
    const storeGrossTotal = report.stores.reduce(
      (sum, s) => sum + s.store_gross_profit_vnd,
      0,
    );
    const totalGrossProfit =
      report.warehouse.warehouse_total_gross_profit_vnd + storeGrossTotal;
    const marginPct =
      report.consolidated_external_revenue_vnd <= 0
        ? 0
        : Math.round(
            (totalGrossProfit / report.consolidated_external_revenue_vnd) *
              10000,
          ) / 100;
    return { profit: totalGrossProfit, marginPct };
  }, [report]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-amber-800" />
          <div>
            <h2 className="font-bold text-base text-stone-900">
              Báo Cáo Lãi - Lỗ Hợp Nhất Đa Thực Thể (Real-Time OLAP P&amp;L)
            </h2>
            <p className="text-xs text-stone-500">
              Tách biệt hoàn toàn Mảng Cung Ứng Kho Tổng Tây Nguyên vs. Chuỗi Quán Cà Phê &amp; Loại trừ Chuyển kho Nội bộ ({source})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-stone-500">Chi phí Kho Tổng (đ):</span>
            <input
              type="number"
              min={0}
              step={100000}
              value={warehouseOpexInput}
              onChange={(e) => setWarehouseOpexInput(e.target.value)}
              className="w-28 rounded-xl border border-stone-300 px-2.5 py-1.5 font-mono"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-stone-500">Royalty Nhượng quyền (%):</span>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={royaltyPctInput}
              onChange={(e) => setRoyaltyPctInput(e.target.value)}
              className="w-20 rounded-xl border border-stone-300 px-2.5 py-1.5 font-mono"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadPnl()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-800 text-white font-semibold hover:bg-amber-900 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tính Lại P&amp;L
          </button>
        </div>
      </section>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-1">
              <div className="text-xs text-stone-500 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Doanh Thu Ngoại Chuỗi Hợp Nhất</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-stone-900">
                {report.consolidated_external_revenue_vnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-stone-500">
                B2B ngoài + Bán nước POS ({report.stores.length} quán)
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-sm space-y-1">
              <div className="text-xs text-amber-900 font-semibold flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-amber-700" />
                <span>Loại Trừ Chuyển Kho Nội Bộ</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-amber-900">
                -{report.intercompany_eliminated_revenue_vnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-amber-800">
                Chống tính trùng doanh thu Kho Tổng ↔ Quán nhà
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-1">
              <div className="text-xs text-stone-500 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Lợi Nhuận Gộp Hợp Nhất</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-emerald-800">
                {consolidatedGross.profit.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] font-mono text-emerald-700">
                Biên gộp: {consolidatedGross.marginPct.toFixed(2)}%
              </div>
            </div>

            <div className="bg-emerald-950 text-white rounded-2xl border border-emerald-800 p-5 shadow-sm space-y-1">
              <div className="text-xs text-emerald-200 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <span>Lợi Nhuận Ròng Toàn Chuỗi</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-emerald-300">
                {report.consolidated_net_profit_vnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] font-mono text-emerald-200">
                Biên ròng: {report.consolidated_net_margin_pct.toFixed(2)}% • Royalty: +
                {report.total_franchise_royalty_income_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-800" />
              <div>
                <h3 className="font-bold text-sm text-stone-900">
                  Khối 1 — Báo Cáo Lãi - Lỗ Mảng Cung Ứng Kho Tổng Tây Nguyên ({report.warehouse.warehouse_code})
                </h3>
                <p className="text-xs text-stone-500">
                  Dữ liệu bí mật cấp SUPER_ADMIN • Đối chiếu Giá vốn Gốc Tây Nguyên (Raw Origin COGS)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500">Doanh thu Bán sỉ B2B</div>
                <div className="font-mono font-bold text-sm text-stone-900">
                  {report.warehouse.b2b_external_revenue_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-stone-500">
                  Giá vốn gốc: {report.warehouse.b2b_raw_cogs_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500">Lãi gộp Bán sỉ B2B</div>
                <div className="font-mono font-bold text-sm text-emerald-700">
                  +{report.warehouse.b2b_external_gross_profit_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-stone-500">
                  {report.warehouse.b2b_orders_count} đơn sỉ ngoại chuỗi
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="text-amber-900">Chuyển kho Nội bộ (Đã đối soát)</div>
                <div className="font-mono font-bold text-sm text-amber-900">
                  {report.warehouse.internal_transfer_revenue_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-amber-800">
                  Chênh lệch nội bộ: +
                  {report.warehouse.internal_markup_profit_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="text-emerald-900">Lợi nhuận ròng Kho Tổng</div>
                <div className="font-mono font-extrabold text-sm text-emerald-800">
                  {report.warehouse.warehouse_net_profit_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] font-mono text-emerald-700">
                  Biên ròng Kho: {report.warehouse.warehouse_net_margin_pct.toFixed(2)}%
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-700" />
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Khối 2 — Ma Trận So Sánh &amp; Xếp Hạng Hiệu Quả Từng Quán Cà Phê ({report.stores.length} điểm)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Xếp hạng tự động theo Lợi nhuận Ròng giảm dần • Tích hợp tổn thất lệch két Đóng ca mù &amp; Hao hụt kiểm kho BOM
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 text-stone-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Hạng</th>
                    <th className="px-3 py-2.5">Chi nhánh</th>
                    <th className="px-3 py-2.5 text-right">Doanh thu POS</th>
                    <th className="px-3 py-2.5 text-right">Giá vốn BOM</th>
                    <th className="px-3 py-2.5 text-right">Nhân sự</th>
                    <th className="px-3 py-2.5 text-right">Lệch két / Hao hụt</th>
                    <th className="px-3 py-2.5 text-right">Royalty</th>
                    <th className="px-3 py-2.5 text-right">Lợi nhuận ròng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {report.stores.map((st) => (
                    <tr key={st.store_id} className="hover:bg-stone-50">
                      <td className="px-3 py-2.5 font-mono font-extrabold text-amber-800">
                        #{st.rank ?? '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-stone-900">{st.store_name}</div>
                        <div className="text-[11px] font-mono text-stone-500">
                          {st.store_code} • {st.store_type} • {st.price_multiplier.toFixed(2)}x
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div className="font-bold text-stone-900">
                          {st.pos_gross_revenue_vnd.toLocaleString('vi-VN')}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          TM {st.cash_revenue_vnd.toLocaleString('vi-VN')} / QR{' '}
                          {st.vietqr_revenue_vnd.toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-stone-700">
                        {st.store_internal_bom_cogs_vnd.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-stone-700">
                        {st.labor_cost_vnd.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-700">
                        -
                        {(
                          st.cash_shortage_loss_vnd +
                          st.stocktake_shrinkage_loss_vnd
                        ).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-indigo-700">
                        {st.franchise_royalty_fee_vnd > 0
                          ? `-${st.franchise_royalty_fee_vnd.toLocaleString('vi-VN')}`
                          : '0'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div
                          className={`font-extrabold ${
                            st.store_net_profit_vnd >= 0
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {st.store_net_profit_vnd.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {st.net_margin_pct.toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
```

### File 3: `C:\bib\cf_19\apps\web\src\features\analytics\FranchiseStoreCloningWizard.tsx`

```tsx
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CopyPlus,
  Rocket,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import type {
  ClonableStoreType,
  CloneFranchiseStoreResultDTO,
  ClonedMenuProductPricePreviewDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  cloneFranchiseStoreApi,
  previewFranchisePricingApi,
} from '../../api/executiveAnalyticsApi';

export interface FranchiseStoreCloningWizardProps {
  actorId: string;
  onStoreCloned: (result: CloneFranchiseStoreResultDTO) => void;
}

export function FranchiseStoreCloningWizard({
  actorId,
  onStoreCloned,
}: FranchiseStoreCloningWizardProps) {
  const [code, setCode] = useState<string>('STORE-05-DALAT');
  const [name, setName] = useState<string>('CF19 Nhượng Quyền Đà Lạt Center');
  const [storeType, setStoreType] = useState<ClonableStoreType>('FRANCHISE_STORE');
  const [address, setAddress] = useState<string>('22 Hòa Bình, Phường 1, TP. Đà Lạt');
  const [phone, setPhone] = useState<string>('02633888105');
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1.15);
  const [openingCashVnd, setOpeningCashVnd] = useState<string>('2500000');
  const [createStarterTransfer, setCreateStarterTransfer] = useState<boolean>(true);
  const [starterCoffeeQtyG, setStarterCoffeeQtyG] = useState<string>('10000');

  const [pricingPreview, setPricingPreview] = useState<ClonedMenuProductPricePreviewDTO[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [clonedResult, setClonedResult] = useState<CloneFranchiseStoreResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void previewFranchisePricingApi(actorId, priceMultiplier)
      .then((res) => {
        if (active) {
          setPricingPreview(res.data);
        }
      })
      .catch(() => {
        if (active) {
          setPricingPreview([]);
        }
      });

    return () => {
      active = false;
    };
  }, [actorId, priceMultiplier]);

  const handleCloneStore = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await cloneFranchiseStoreApi(actorId, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type: storeType,
        address: address.trim(),
        phone: phone.trim() || undefined,
        price_multiplier: priceMultiplier,
        opening_cash_vnd: Math.max(0, Math.round(Number(openingCashVnd) || 2000000)),
        create_starter_transfer: createStarterTransfer,
        starter_coffee_qty_g: Math.max(1000, Number(starterCoffeeQtyG) || 10000),
      });
      setClonedResult(res.data);
      onStoreCloned(res.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể nhân bản chi nhánh mới.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <CopyPlus className="w-5 h-5 text-indigo-700" />
        <div>
          <h3 className="font-bold text-base text-stone-900">
            1-Click Franchise Store Cloning Wizard (Nhân Bản Chi Nhánh / Nhượng Quyền)
          </h3>
          <p className="text-xs text-stone-500">
            Sao chép toàn bộ Master Menu, Định mức BOM, mở ca khai trương và tự động tạo phiếu xin cấp hàng Kho Tổng trong 1 giao dịch nguyên tử
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {clonedResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-2">
          <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Đã nhân bản thành công chi nhánh {clonedResult.store.code} — {clonedResult.store.name} ({clonedResult.store.price_multiplier.toFixed(2)}x)!
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
            <div>Store ID: {clonedResult.store.id.slice(0, 13)}...</div>
            <div>Ca khai trương: {clonedResult.opening_shift_id.slice(0, 13)}...</div>
            <div>
              {clonedResult.starter_transfer ? (
                <span className="inline-flex items-center gap-1 text-indigo-800 font-bold">
                  <Truck className="w-3.5 h-3.5" />
                  {clonedResult.starter_transfer.transfer_code} (
                  {clonedResult.starter_transfer.total_internal_value_vnd.toLocaleString('vi-VN')} đ)
                </span>
              ) : (
                'Không tạo phiếu cấp hàng khai trương'
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Mã chi nhánh (UPPERCASE)</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Mô hình vận hành</span>
              <select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value as ClonableStoreType)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 bg-white"
              >
                <option value="FRANCHISE_STORE">Quán Nhượng Quyền (FRANCHISE_STORE)</option>
                <option value="RETAIL_STORE">Quán Tự Sở Hữu (RETAIL_STORE)</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="font-semibold text-stone-700">Tên chi nhánh</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="sm:col-span-2 space-y-1 block">
              <span className="font-semibold text-stone-700">Địa chỉ mặt bằng</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">SĐT hotline</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono"
              />
            </label>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-950">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-700" />
                <span>Hệ số giá vùng (price_multiplier)</span>
              </span>
              <span className="font-mono text-base text-indigo-800">
                {priceMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={priceMultiplier}
              onChange={(e) => setPriceMultiplier(Number(e.target.value))}
              className="w-full accent-indigo-700"
            />
            <div className="flex justify-between text-[10px] font-mono text-indigo-700">
              <span>0.50x (Khuyến mãi)</span>
              <span>1.00x (Chuẩn Tây Nguyên)</span>
              <span>1.15x–1.50x (Thành phố/Du lịch)</span>
              <span>2.00x</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Quỹ tiền đầu ca khai trương (VNĐ)</span>
              <input
                type="number"
                min={0}
                step={100000}
                value={openingCashVnd}
                onChange={(e) => setOpeningCashVnd(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Cà phê hạt khai trương (gram)</span>
              <input
                type="number"
                min={1000}
                step={1000}
                disabled={!createStarterTransfer}
                value={starterCoffeeQtyG}
                onChange={(e) => setStarterCoffeeQtyG(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono disabled:opacity-40"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-stone-700 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={createStarterTransfer}
              onChange={(e) => setCreateStarterTransfer(e.target.checked)}
              className="rounded border-stone-400"
            />
            <span>
              Tự động tạo Phiếu xin cấp cà phê khai trương từ Kho Tổng (REQUESTED)
            </span>
          </label>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleCloneStore()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-700 text-white font-bold text-xs hover:bg-indigo-800 disabled:opacity-40"
          >
            <Rocket className="w-4 h-4" />
            1-Click Nhân Bản Chi Nhánh Mới &amp; Sao Chép Toàn Bộ Master Menu/BOM
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="text-xs font-bold text-stone-800">
            Live Preview Bảng Giá Thực Đơn &amp; Biên Lợi Nhuận BOM ({priceMultiplier.toFixed(2)}x)
          </div>
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-100 text-stone-600 uppercase">
                <tr>
                  <th className="px-3 py-2">Món uống</th>
                  <th className="px-3 py-2 text-right">Giá gốc</th>
                  <th className="px-3 py-2 text-right">Giá mới</th>
                  <th className="px-3 py-2 text-right">BOM COGS</th>
                  <th className="px-3 py-2 text-right">Biên gộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pricingPreview.map((item) => (
                  <tr key={item.product_id}>
                    <td className="px-3 py-2 font-medium text-stone-900">
                      {item.product_name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-500">
                      {item.master_base_price_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-indigo-800">
                      {item.cloned_base_price_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-600">
                      {item.default_variant_bom_cogs_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {item.estimated_gross_margin_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 3 files trong `@cf19/web`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\web\src\features\analytics\ExecutiveCommandCenterView.tsx` (Tạo mới)
  2. `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx` (Overwrite — 3 phân khu hoàn chỉnh M7 + M2 + M1)
  3. `C:\bib\cf_19\apps\web\src\__tests__\m7-executive-pnl-franchise-ui.test.ts` (Tạo mới — 16 Vitest Frontend test cases)

### File 1: `C:\bib\cf_19\apps\web\src\features\analytics\ExecutiveCommandCenterView.tsx`

```tsx
import { useState } from 'react';
import type { CloneFranchiseStoreResultDTO } from '@cf19/shared';
import { ExecutivePnlConsolidationPanel } from './ExecutivePnlConsolidationPanel';
import { FranchiseStoreCloningWizard } from './FranchiseStoreCloningWizard';

export interface ExecutiveCommandCenterViewProps {
  actorId: string;
  onBranchAdded?: (result: CloneFranchiseStoreResultDTO) => void;
}

export function ExecutiveCommandCenterView({
  actorId,
  onBranchAdded,
}: ExecutiveCommandCenterViewProps) {
  const [pnlRefreshSignal, setPnlRefreshSignal] = useState<number>(0);

  const handleStoreCloned = (result: CloneFranchiseStoreResultDTO) => {
    setPnlRefreshSignal((n) => n + 1);
    onBranchAdded?.(result);
  };

  return (
    <div className="space-y-6">
      <ExecutivePnlConsolidationPanel
        actorId={actorId}
        refreshSignal={pnlRefreshSignal}
      />

      <FranchiseStoreCloningWizard
        actorId={actorId}
        onStoreCloned={handleStoreCloned}
      />
    </div>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\layouts\ExecutiveLayout.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Boxes, Building2, FileText, ShieldCheck } from 'lucide-react';
import { SEED_IDS, type AuditLogDto, type StoreDto } from '@cf19/shared';
import {
  fetchAuditLogs,
  fetchStoreInventory,
  fetchStores,
  type AnyInventoryItemRecord,
  type DataSourceMode,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { ExecutiveCommandCenterView } from '../features/analytics/ExecutiveCommandCenterView';
import { WarehousePortalView } from '../features/warehouse/WarehousePortalView';
import { useAuthStore } from '../store/authStore';

type ExecutiveTab = 'pnl_franchise' | 'warehouse' | 'overview';

export function ExecutiveLayout() {
  const actor = useAuthStore((s) => s.currentActor)!;
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('pnl_franchise');
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [inventory, setInventory] = useState<AnyInventoryItemRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [source, setSource] = useState<DataSourceMode>('live_api');

  const loadExecutiveMasterData = useCallback(async () => {
    const [storesRes, invRes, auditRes] = await Promise.all([
      fetchStores(actor.id, actor.role, actor.assignedStoreId),
      fetchStoreInventory(actor.id, SEED_IDS.stores.centralWarehouse, actor.role),
      fetchAuditLogs(actor.id),
    ]);
    setStores(storesRes.data);
    setInventory(invRes.data);
    setAuditLogs(auditRes.data);
    setSource(storesRes.source);
  }, [actor.id, actor.role, actor.assignedStoreId]);

  useEffect(() => {
    void loadExecutiveMasterData();
  }, [loadExecutiveMasterData]);

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Executive Command Center — Chủ Chuỗi CF19"
        subtitle={`Hợp nhất P&L Đa Thực Thể, Nhân Bản Nhượng Quyền 1-Click, Kho Tổng MAC/FIFO & Audit Logs (${source})`}
        badgeText="SUPER_ADMIN"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('pnl_franchise')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'pnl_franchise'
                ? 'bg-indigo-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Báo Cáo Lãi - Lỗ Hợp Nhất (OLAP P&amp;L) &amp; Nhân Bản Nhượng Quyền (M7)
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
            Giám Sát Kho Tổng Tây Nguyên &amp; Mẻ Rang FIFO (M2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Danh Mục Giá Vốn Gốc &amp; Nhật Ký Audit Logs Bất Biến (M1)
          </button>
        </div>

        {activeTab === 'pnl_franchise' && (
          <ExecutiveCommandCenterView
            actorId={actor.id}
            onBranchAdded={() => void loadExecutiveMasterData()}
          />
        )}

        {activeTab === 'warehouse' && <WarehousePortalView actorId={actor.id} />}

        {activeTab === 'overview' && (
          <>
            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-amber-700" />
                <h2 className="font-bold text-base">
                  Hệ thống {stores.length} Điểm Vận Hành (Kho Tổng &amp; Chuỗi Quán Cà Phê)
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
                    <div className="text-xs text-stone-500 mt-1">
                      {store.type} ({store.price_multiplier.toFixed(2)}x)
                    </div>
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
                  Chưa có thao tác phê duyệt PIN hoặc nhân bản chi nhánh nào trong phiên hiện tại.
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

### File 3: `C:\bib\cf_19\apps\web\src\__tests__\m7-executive-pnl-franchise-ui.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiClientError } from '../api/apiClient';
import {
  offlineCloneFranchiseStore,
  offlineGetExecutivePnlConsolidation,
  offlinePreviewFranchisePricing,
  resetOfflineExecutiveAnalyticsState,
} from '../api/executiveAnalyticsApi';

describe('M7.3 — @cf19/web Executive OLAP P&L Command Center & 1-Click Franchise Store Cloning', () => {
  beforeEach(() => {
    resetOfflineExecutiveAnalyticsState();
  });

  it('1. offlineGetExecutivePnlConsolidation separates Central Warehouse P&L from 4 Retail Store Nodes', () => {
    const report = offlineGetExecutivePnlConsolidation();
    expect(report.warehouse.warehouse_code).toBe('CW-TAYNGUYEN');
    expect(report.warehouse.b2b_external_revenue_vnd).toBe(42_500_000);
    expect(report.warehouse.b2b_external_gross_profit_vnd).toBe(15_700_000);
    expect(report.warehouse.internal_markup_profit_vnd).toBe(3_050_000);
    expect(report.stores).toHaveLength(4);
  });

  it('2. offlineGetExecutivePnlConsolidation eliminates intercompany internal transfer revenue from consolidated external top-line', () => {
    const report = offlineGetExecutivePnlConsolidation();
    expect(report.intercompany_eliminated_revenue_vnd).toBe(15_500_000);
    expect(report.consolidated_external_revenue_vnd).toBe(
      report.warehouse.b2b_external_revenue_vnd +
        report.total_store_pos_revenue_vnd,
    );
    expect(report.consolidated_external_revenue_vnd).toBe(
      42_500_000 + 36_000_000 + 30_000_000 + 29_400_000 + 20_000_000,
    );
  });

  it('3. offlineGetExecutivePnlConsolidation ranks stores descending by store_net_profit_vnd with 1-based rank', () => {
    const report = offlineGetExecutivePnlConsolidation();
    expect(report.stores.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < report.stores.length; i += 1) {
      expect(report.stores[i - 1]!.store_net_profit_vnd).toBeGreaterThanOrEqual(
        report.stores[i]!.store_net_profit_vnd,
      );
    }
    expect(report.stores[0]?.store_code).toBe('STORE-01');
  });

  it('4. warehouse_operating_expense_vnd reduces warehouse_net_profit_vnd and consolidated_net_profit_vnd accurately', () => {
    const base = offlineGetExecutivePnlConsolidation({
      warehouse_operating_expense_vnd: 4_000_000,
    });
    const higherOpex = offlineGetExecutivePnlConsolidation({
      warehouse_operating_expense_vnd: 6_500_000,
    });

    expect(higherOpex.warehouse.warehouse_net_profit_vnd).toBe(
      base.warehouse.warehouse_net_profit_vnd - 2_500_000,
    );
    expect(higherOpex.consolidated_net_profit_vnd).toBe(
      base.consolidated_net_profit_vnd - 2_500_000,
    );
  });

  it('5. aggregates blind-close cash shortage losses and EOD stocktake shrinkage losses across all stores', () => {
    const report = offlineGetExecutivePnlConsolidation();
    expect(report.total_cash_shortage_loss_vnd).toBe(80_000);
    expect(report.total_stocktake_shrinkage_loss_vnd).toBe(330_000);
  });

  it('6. offlinePreviewFranchisePricing applies 1.15x regional multiplier and calculates BOM gross margin %', () => {
    const preview = offlinePreviewFranchisePricing(1.15);
    expect(preview).toHaveLength(3);
    const suaDa = preview.find((p) => p.product_code === 'PRD-CF-SUA-DA');
    expect(suaDa?.master_base_price_vnd).toBe(29000);
    expect(suaDa?.cloned_base_price_vnd).toBe(33350);
    expect(suaDa?.price_diff_vnd).toBe(4350);
    expect(suaDa?.estimated_gross_margin_pct).toBeGreaterThan(75);
  });

  it('7. offlinePreviewFranchisePricing supports 0.90x discounted rural tier multiplier', () => {
    const preview = offlinePreviewFranchisePricing(0.9);
    const denDa = preview.find((p) => p.product_code === 'PRD-CF-DEN-DA');
    expect(denDa?.cloned_base_price_vnd).toBe(22500);
    expect(denDa?.price_diff_vnd).toBe(-2500);
  });

  it('8. offlinePreviewFranchisePricing rejects multipliers outside [0.50, 3.00] with 400', () => {
    expect(() => offlinePreviewFranchisePricing(0.4)).toThrow(ApiClientError);
    expect(() => offlinePreviewFranchisePricing(3.5)).toThrow(ApiClientError);
  });

  it('9. offlineCloneFranchiseStore clones Store 5 with opening shift, REQUESTED starter transfer & 1.15x menu preview', () => {
    const res = offlineCloneFranchiseStore({
      code: 'STORE-05-DALAT',
      name: 'CF19 Nhượng Quyền Đà Lạt',
      type: 'FRANCHISE_STORE',
      address: '22 Hòa Bình, TP. Đà Lạt',
      phone: '02633888105',
      price_multiplier: 1.15,
      opening_cash_vnd: 2500000,
      create_starter_transfer: true,
      starter_coffee_qty_g: 10000,
    });

    expect(res.store.code).toBe('STORE-05-DALAT');
    expect(res.store.type).toBe('FRANCHISE_STORE');
    expect(res.store.price_multiplier).toBe(1.15);
    expect(res.opening_shift_id).toBeTruthy();
    expect(res.starter_transfer?.status).toBe('REQUESTED');
    expect(res.starter_transfer?.total_internal_value_vnd).toBe(1_550_000);
    expect(res.cloned_menu_preview).toHaveLength(3);
  });

  it('10. Newly cloned Store 5 immediately appears in subsequent Executive P&L Consolidation', () => {
    offlineCloneFranchiseStore({
      code: 'STORE-05-BMT',
      name: 'CF19 Nhượng Quyền Buôn Hồ',
      type: 'FRANCHISE_STORE',
      address: '45 Hùng Vương, Buôn Hồ',
      price_multiplier: 1.1,
      opening_cash_vnd: 2000000,
      create_starter_transfer: true,
      starter_coffee_qty_g: 10000,
    });

    const report = offlineGetExecutivePnlConsolidation();
    expect(report.stores).toHaveLength(5);
    expect(report.stores.some((s) => s.store_code === 'STORE-05-BMT')).toBe(true);
  });

  it('11. Cloned FRANCHISE_STORE incurs 5% franchise_royalty_fee_vnd on POS revenue while RETAIL_STORE incurs 0', () => {
    offlineCloneFranchiseStore(
      {
        code: 'FRAN-ROYALTY',
        name: 'CF19 Quán Nhượng Quyền Test',
        type: 'FRANCHISE_STORE',
        address: '01 Đường A',
        price_multiplier: 1.15,
        opening_cash_vnd: 2000000,
        create_starter_transfer: false,
        starter_coffee_qty_g: 10000,
      },
      10_000_000,
    );

    const report = offlineGetExecutivePnlConsolidation({ franchise_royalty_pct: 5 });
    const fran = report.stores.find((s) => s.store_code === 'FRAN-ROYALTY');
    const retail = report.stores.find((s) => s.store_code === 'STORE-01');

    expect(fran?.franchise_royalty_fee_vnd).toBe(500_000);
    expect(retail?.franchise_royalty_fee_vnd).toBe(0);
    expect(report.total_franchise_royalty_income_vnd).toBe(500_000);
  });

  it('12. offlineCloneFranchiseStore with create_starter_transfer=false omits starter_transfer', () => {
    const res = offlineCloneFranchiseStore({
      code: 'STORE-06-OWNED',
      name: 'CF19 Quán 6',
      type: 'RETAIL_STORE',
      address: '99 Lê Hồng Phong',
      price_multiplier: 1.0,
      opening_cash_vnd: 2000000,
      create_starter_transfer: false,
      starter_coffee_qty_g: 10000,
    });
    expect(res.starter_transfer).toBeNull();
  });

  it('13. offlineCloneFranchiseStore blocks duplicate store code (409 DUPLICATE_STORE_CODE)', () => {
    try {
      offlineCloneFranchiseStore({
        code: 'STORE-01',
        name: 'Duplicate 1',
        type: 'FRANCHISE_STORE',
        address: '19 Trần Phú',
        price_multiplier: 1.0,
        opening_cash_vnd: 2000000,
        create_starter_transfer: false,
        starter_coffee_qty_g: 10000,
      });
      expect.unreachable('Expected duplicate store code error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('DUPLICATE_STORE_CODE');
    }
  });

  it('14. offlineCloneFranchiseStore rejects invalid store code or out-of-range multiplier (400)', () => {
    try {
      offlineCloneFranchiseStore({
        code: 'BAD CODE!',
        name: 'Invalid',
        type: 'FRANCHISE_STORE',
        address: '123 Test',
        price_multiplier: 1.0,
        opening_cash_vnd: 2000000,
        create_starter_transfer: false,
        starter_coffee_qty_g: 10000,
      });
      expect.unreachable('Expected invalid code error');
    } catch (err) {
      expect((err as ApiClientError).status).toBe(400);
    }
  });

  it('15. resetOfflineExecutiveAnalyticsState restores baseline 4 stores cleanly', () => {
    offlineCloneFranchiseStore({
      code: 'STORE-TEMP-99',
      name: 'Temporary Branch',
      type: 'FRANCHISE_STORE',
      address: 'Temp Address',
      price_multiplier: 1.1,
      opening_cash_vnd: 2000000,
      create_starter_transfer: false,
      starter_coffee_qty_g: 10000,
    });
    expect(offlineGetExecutivePnlConsolidation().stores).toHaveLength(5);

    resetOfflineExecutiveAnalyticsState();
    expect(offlineGetExecutivePnlConsolidation().stores).toHaveLength(4);
  });

  it('16. Consolidated net profit accounting identity holds exactly', () => {
    const report = offlineGetExecutivePnlConsolidation();
    expect(report.consolidated_net_profit_vnd).toBe(
      report.warehouse.warehouse_net_profit_vnd +
        report.total_store_net_profit_vnd +
        report.total_franchise_royalty_income_vnd,
    );
  });
});
```
