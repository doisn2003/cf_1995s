import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  Coffee,
  RefreshCw,
  Store,
  Truck,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SEED_IDS, type StoreDto } from '@cf19/shared';
import {
  fetchCurrentShift,
  fetchStoreInventory,
  fetchStoreLots,
  fetchStores,
  type StoreInventoryItemRecord,
  type StoreLotRecord,
} from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { PosTerminalWorkbench } from '../features/pos/PosTerminalWorkbench';
import { StoreDailyStocktakePanel } from '../features/stocktake/StoreDailyStocktakePanel';
import { StoreTransferReplenishmentPanel } from '../features/transfers/StoreTransferReplenishmentPanel';
import { useAuthStore } from '../store/authStore';

type StoreManagerTab = 'inventory' | 'transfers' | 'pos_bom' | 'stocktake_kds';

export function StoreManagerLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const { storeId } = useParams<{ storeId: string }>();
  const activeStoreId =
    storeId ?? currentUser.assigned_store_id ?? SEED_IDS.stores.store01;

  const [activeTab, setActiveTab] = useState<StoreManagerTab>('inventory');
  const [storeInfo, setStoreInfo] = useState<StoreDto | null>(null);
  const [inventory, setInventory] = useState<StoreInventoryItemRecord[]>([]);
  const [lots, setLots] = useState<StoreLotRecord[]>([]);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadStoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [storesList, invList, lotList, currentShift] = await Promise.all([
        fetchStores(),
        fetchStoreInventory(activeStoreId),
        fetchStoreLots(activeStoreId),
        fetchCurrentShift(activeStoreId),
      ]);
      setStoreInfo(storesList.find((s) => s.id === activeStoreId) ?? null);
      setInventory(invList.filter((i) => i.category !== 'GREEN_BEAN'));
      setLots(lotList);
      setShiftId(currentShift?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void loadStoreData();
  }, [loadStoreData]);

  const storeTitle = storeInfo
    ? `${storeInfo.code} — ${storeInfo.name}`
    : 'Chi Nhánh Cửa Hàng';

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title={`Quản Lý Chi Nhánh — ${storeTitle}`}
        subtitle="Theo dõi tồn kho nguyên liệu tại quán, đặt hàng Kho Tổng 2 pha, giám sát POS và kiểm kho cuối ngày"
        badgeText="QUẢN LÝ QUÁN"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'inventory'
                  ? 'bg-amber-800 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Store className="w-4 h-4" />
              1. Tồn Kho &amp; Lô Tại Quán
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
              2. Xin Cấp &amp; Nhận Hàng Nội Bộ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pos_bom')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'pos_bom'
                  ? 'bg-indigo-700 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Coffee className="w-4 h-4" />
              3. Quầy POS &amp; Hóa Đơn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stocktake_kds')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'stocktake_kds'
                  ? 'bg-teal-700 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              4. Kiểm Kho Cuối Ngày &amp; Cảnh Báo Bar
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadStoreData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {activeTab === 'transfers' && (
          <StoreTransferReplenishmentPanel storeId={activeStoreId} />
        )}

        {activeTab === 'pos_bom' && (
          <PosTerminalWorkbench storeId={activeStoreId} shiftId={shiftId} />
        )}

        {activeTab === 'stocktake_kds' && (
          <StoreDailyStocktakePanel storeId={activeStoreId} />
        )}

        {activeTab === 'inventory' && (
          <>
            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-amber-700" />
                <h2 className="font-bold text-base">
                  Tồn Kho Nguyên Vật Liệu Tại Chi Nhánh
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Tên nguyên liệu</th>
                      <th className="px-4 py-2.5 text-right">Tồn khả dụng</th>
                      <th className="px-4 py-2.5 text-right">Giá hạch toán nội bộ</th>
                      <th className="px-4 py-2.5">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {inventory.map((item) => {
                      const avail = item.store_available_qty ?? 0;
                      const isLow = avail < item.min_stock_threshold;
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5 font-mono text-xs">{item.sku}</td>
                          <td className="px-4 py-2.5 font-medium">{item.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            {avail.toLocaleString('vi-VN')} {item.base_unit}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {item.internal_transfer_price_vnd.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-4 py-2.5">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3" />
                                Cần đặt bổ sung
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                Đủ định mức
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
              <h2 className="font-bold text-base mb-3">
                Chi Tiết Lô Hàng Đang Lưu Tại Quán ({lots.length} lô)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 text-stone-600 uppercase">
                    <tr>
                      <th className="px-3 py-2">Mã lô</th>
                      <th className="px-3 py-2">Nguyên liệu</th>
                      <th className="px-3 py-2">Ngày rang</th>
                      <th className="px-3 py-2 text-right">Còn lại / Ban đầu</th>
                      <th className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {lots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="px-3 py-2.5 font-mono font-semibold text-stone-900">
                          {lot.lot_code}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-stone-800">
                          {lot.item_name ?? lot.sku ?? lot.item_id}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-stone-600">
                          {lot.roast_date ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold">
                          {lot.remaining_qty.toLocaleString('vi-VN')} /{' '}
                          {lot.initial_qty.toLocaleString('vi-VN')} {lot.base_unit ?? ''}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold ${
                              lot.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {lot.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
