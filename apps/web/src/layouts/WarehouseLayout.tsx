import { useCallback, useEffect, useState } from 'react';
import { Boxes, ShoppingBag, Store, Truck } from 'lucide-react';
import type { WarehouseInventoryItemDto } from '@cf19/shared';
import {
  fetchB2bOverviewApi,
  fetchTransfersApi,
  type LiveB2bOverviewDTO,
  type LiveInternalTransferDto,
} from '../api/b2bAndTransferApi';
import { fetchWarehouseItems } from '../api/warehouseApi';
import { RoleShellHeader } from '../components/RoleGuard';
import { B2bArAgingAndLedgerPanel } from '../features/b2b/B2bArAgingAndLedgerPanel';
import { B2bCustomerAndTierCrudPanel } from '../features/b2b/B2bCustomerAndTierCrudPanel';
import { B2bOrderTieredPricingPanel } from '../features/b2b/B2bOrderTieredPricingPanel';
import { WarehouseTransferDispatchPanel } from '../features/transfers/WarehouseTransferDispatchPanel';
import { WarehousePortalView } from '../features/warehouse/WarehousePortalView';

type WarehouseSection = 'wms' | 'b2b' | 'b2c_customers' | 'transfers';

export function WarehouseLayout() {
  const [section, setSection] = useState<WarehouseSection>('wms');
  const [b2bOverview, setB2bOverview] = useState<LiveB2bOverviewDTO | null>(null);
  const [inventoryItems, setInventoryItems] = useState<WarehouseInventoryItemDto[]>([]);
  const [transfers, setTransfers] = useState<LiveInternalTransferDto[]>([]);

  const loadWarehouseOps = useCallback(async () => {
    const [b2bData, trList, itemsList] = await Promise.all([
      fetchB2bOverviewApi(),
      fetchTransfersApi(),
      fetchWarehouseItems(false),
    ]);
    setB2bOverview(b2bData);
    setTransfers(trList);
    setInventoryItems(itemsList);
  }, []);

  useEffect(() => {
    void loadWarehouseOps();
  }, [loadWarehouseOps]);

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Kho Tổng Rang Xay Tây Nguyên"
        subtitle="Quản trị Nhập nhân xanh MAC, Mẻ rang FIFO, Bán sỉ B2B, Bán lẻ B2C & Điều phối Nội bộ"
        badgeText="KHO TỔNG"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <button
            type="button"
            onClick={() => setSection('wms')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              section === 'wms'
                ? 'bg-amber-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            1. Nhập Kho, Mẻ Rang FIFO &amp; Danh Mục SKU
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
            2. Đơn Bán Sỉ B2B &amp; Sổ Cái Công Nợ
          </button>
          <button
            type="button"
            onClick={() => setSection('b2c_customers')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              section === 'b2c_customers'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Store className="w-4 h-4" />
            3. Bán Lẻ B2C, Khách Sỉ &amp; Bảng Giá
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
            4. Điều Phối Chuyển Kho Nội Bộ ({transfers.filter((t) => t.status === 'REQUESTED').length} chờ duyệt)
          </button>
        </div>

        {section === 'wms' && <WarehousePortalView />}

        {section === 'b2b' && b2bOverview && (
          <div className="space-y-6">
            <B2bOrderTieredPricingPanel
              customers={b2bOverview.customers}
              priceTiers={b2bOverview.price_tiers}
              orders={b2bOverview.recent_orders}
              inventoryItems={inventoryItems}
              onOrderCreated={loadWarehouseOps}
            />
            <B2bArAgingAndLedgerPanel
              customers={b2bOverview.customers}
              orders={b2bOverview.recent_orders}
              agingSummary={b2bOverview.aging_summary}
              ledgerEntries={b2bOverview.debt_ledger}
              onPaymentRecorded={loadWarehouseOps}
            />
          </div>
        )}

        {section === 'b2c_customers' && b2bOverview && (
          <B2bCustomerAndTierCrudPanel
            overview={b2bOverview}
            inventoryItems={inventoryItems}
            onRefresh={loadWarehouseOps}
          />
        )}

        {section === 'transfers' && (
          <WarehouseTransferDispatchPanel
            transfers={transfers}
            onDispatched={loadWarehouseOps}
          />
        )}
      </main>
    </div>
  );
}
