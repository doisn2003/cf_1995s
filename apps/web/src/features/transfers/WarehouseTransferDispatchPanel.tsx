import { useState } from 'react';
import { Ban, CheckCircle2, Truck } from 'lucide-react';
import { ApiClientError } from '../../api/apiClient';
import {
  cancelInternalTransferApi,
  dispatchInternalTransferApi,
  type LiveInternalTransferDto,
} from '../../api/b2bAndTransferApi';
import { Pagination, paginateList } from '../../components/Pagination';

export interface WarehouseTransferDispatchPanelProps {
  transfers: LiveInternalTransferDto[];
  onDispatched: () => Promise<void>;
}

export function WarehouseTransferDispatchPanel({
  transfers,
  onDispatched,
}: WarehouseTransferDispatchPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const handleDispatch = async (transferId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(transferId);
    try {
      const res = await dispatchInternalTransferApi(
        transferId,
        'Duyệt xuất kho nội bộ theo thứ tự FIFO',
      );
      setSuccessMsg(
        `Đã duyệt xuất phiếu ${res.transfer.transfer_code} sang trạng thái IN_TRANSIT (${res.items.length} lát cắt lô FIFO)`,
      );
      await onDispatched();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể duyệt xuất phiếu chuyển kho.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (transferId: string, transferCode: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(transferId);
    try {
      await cancelInternalTransferApi(transferId, 'Kho Tổng hủy phiếu chưa xuất kho');
      setSuccessMsg(`Đã hủy phiếu ${transferCode}.`);
      await onDispatched();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Hủy phiếu thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-amber-700" />
        <h2 className="font-bold text-base">
          Điều Phối Xuất Kho Nội Bộ Pha 1 (REQUESTED → IN_TRANSIT theo FIFO)
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
        {paginateList(transfers, page, pageSize).map((tr) => (
          <div
            key={tr.id}
            className="rounded-xl border border-stone-200 p-4 bg-stone-50 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">{tr.transfer_code}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    tr.status === 'RECONCILED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : tr.status === 'IN_TRANSIT'
                        ? 'bg-indigo-100 text-indigo-800'
                        : tr.status === 'CANCELLED'
                          ? 'bg-stone-200 text-stone-600'
                          : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {tr.status}
                </span>
              </div>
              <div className="text-xs text-stone-600">
                Chi nhánh nhận:{' '}
                <strong className="text-stone-900">
                  {tr.to_store_code ? `${tr.to_store_code} — ${tr.to_store_name}` : tr.to_store_id}
                </strong>{' '}
                • Giá trị nội bộ:{' '}
                <strong className="font-mono">
                  {tr.total_internal_value_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              {tr.items && tr.items.length > 0 && (
                <div className="text-[11px] font-mono text-stone-500 flex flex-wrap gap-3">
                  {tr.items.map((it) => {
                    const ext = it as typeof it & { item_sku?: string; base_unit?: string };
                    return (
                      <span key={it.id}>
                        {ext.item_sku ? `${ext.item_sku}: ` : ''}
                        YC {it.requested_qty.toLocaleString('vi-VN')} | Xuất{' '}
                        {it.dispatched_qty.toLocaleString('vi-VN')} | Nhận{' '}
                        {it.received_qty.toLocaleString('vi-VN')} {ext.base_unit ?? ''}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {tr.status === 'REQUESTED' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === tr.id}
                  onClick={() => void handleDispatch(tr.id)}
                  className="px-4 py-2 rounded-xl bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 disabled:opacity-50"
                >
                  {busyId === tr.id ? 'Đang xử lý...' : 'Duyệt Xuất Kho FIFO (IN_TRANSIT)'}
                </button>
                <button
                  type="button"
                  disabled={busyId === tr.id}
                  onClick={() => void handleCancel(tr.id, tr.transfer_code)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Hủy
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalItems={transfers.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20]}
      />
    </section>
  );
}
