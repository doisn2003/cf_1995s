import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Flame,
  Layers,
  PackagePlus,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import type {
  RoastBatchDto,
  WarehouseLotFullDto,
  WarehouseOverviewDTO,
} from '@cf19/shared';
import {
  fetchRoastBatches,
  fetchWarehouseLots,
  fetchWarehouseOverview,
} from '../../api/warehouseApi';
import { FifoAllocationWorkbench } from './FifoAllocationWorkbench';
import { InventoryItemsCrudPanel } from './InventoryItemsCrudPanel';
import { LotIngestMacPanel } from './LotIngestMacPanel';
import { RoasteryBatchLifecyclePanel } from './RoasteryBatchLifecyclePanel';

type WarehouseTab = 'ingest' | 'roastery' | 'fifo' | 'items_crud';

export function WarehousePortalView() {
  const [activeTab, setActiveTab] = useState<WarehouseTab>('ingest');
  const [overview, setOverview] = useState<WarehouseOverviewDTO | null>(null);
  const [lots, setLots] = useState<WarehouseLotFullDto[]>([]);
  const [roastBatches, setRoastBatches] = useState<RoastBatchDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, lotList, batchList] = await Promise.all([
        fetchWarehouseOverview(),
        fetchWarehouseLots(),
        fetchRoastBatches(),
      ]);
      setOverview(ov);
      setLots(lotList);
      setRoastBatches(batchList);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <div className="text-[11px] text-stone-400 mt-1">
            Tính theo giá vốn thực tế từng lô (kg / lít / cái)
          </div>
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
            Định mức hao hụt chuẩn 12% – 20%
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
            Cần nhập bổ sung nguồn Tây Nguyên
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
                ? 'bg-amber-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            1. Nhập Lô &amp; Giá Vốn MAC
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
          <button
            type="button"
            onClick={() => setActiveTab('items_crud')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'items_crud'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            4. Danh Mục Vật Tư (SKU)
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
          stockSummaries={overview.stock_summaries}
          lots={lots}
          onMutated={loadAll}
        />
      )}

      {overview && activeTab === 'roastery' && (
        <RoasteryBatchLifecyclePanel
          stockSummaries={overview.stock_summaries}
          lots={lots}
          roastBatches={roastBatches}
          onMutated={loadAll}
        />
      )}

      {overview && activeTab === 'fifo' && (
        <FifoAllocationWorkbench
          stockSummaries={overview.stock_summaries}
          onMutated={loadAll}
        />
      )}

      {activeTab === 'items_crud' && (
        <InventoryItemsCrudPanel onItemsChanged={() => void loadAll()} />
      )}
    </div>
  );
}
