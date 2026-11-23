import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  Coffee,
  FileText,
  RefreshCw,
} from 'lucide-react';
import type { AuditLogDto } from '@cf19/shared';
import { fetchAuditLogs } from '../api/apiClient';
import { RoleShellHeader } from '../components/RoleGuard';
import { StoreAndStaffCrudPanel } from '../features/admin/StoreAndStaffCrudPanel';
import { ExecutiveCommandCenterView } from '../features/analytics/ExecutiveCommandCenterView';
import { MasterMenuBomCrudPanel } from '../features/catalog/MasterMenuBomCrudPanel';
import { WarehousePortalView } from '../features/warehouse/WarehousePortalView';

type ExecutiveTab = 'pnl_franchise' | 'stores_staff' | 'menu_bom' | 'warehouse_audit';

export function ExecutiveLayout() {
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('pnl_franchise');
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const logs = await fetchAuditLogs(50);
      setAuditLogs(logs);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'warehouse_audit') {
      void loadAudit();
    }
  }, [activeTab, loadAudit]);

  return (
    <div className="min-h-screen bg-stone-50">
      <RoleShellHeader
        title="Trung Tâm Điều Hành Chuỗi CF19"
        subtitle="Báo cáo Lãi-Lỗ Hợp nhất, Quản trị Chi nhánh & Nhân sự, Thực đơn Gốc BOM và Kho Tổng Tây Nguyên"
        badgeText="CHỦ CHUỖI"
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
            1. Báo Cáo P&amp;L &amp; Nhân Bản Chi Nhánh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stores_staff')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'stores_staff'
                ? 'bg-amber-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            2. Chi Nhánh &amp; Nhân Sự (CRUD)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menu_bom')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'menu_bom'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Coffee className="w-4 h-4" />
            3. Thực Đơn Gốc &amp; Công Thức BOM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('warehouse_audit')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'warehouse_audit'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            4. Kho Tổng Tây Nguyên &amp; Nhật Ký Audit
          </button>
        </div>

        {activeTab === 'pnl_franchise' && <ExecutiveCommandCenterView />}

        {activeTab === 'stores_staff' && <StoreAndStaffCrudPanel />}

        {activeTab === 'menu_bom' && <MasterMenuBomCrudPanel />}

        {activeTab === 'warehouse_audit' && (
          <div className="space-y-6">
            <WarehousePortalView />

            <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-700" />
                  <h2 className="font-bold text-base">
                    Nhật Ký Kiểm Toán Bất Biến ({auditLogs.length} bản ghi gần nhất)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAudit()}
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-stone-500">Chưa có bản ghi kiểm toán nào.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        <span className="text-stone-700">
                          {log.reason ?? log.target_table}
                        </span>
                      </div>
                      <div className="font-mono text-stone-500">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
