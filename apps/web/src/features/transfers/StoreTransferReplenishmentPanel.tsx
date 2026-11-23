import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Ban, CheckCircle2, PackageCheck, Send } from 'lucide-react';
import {
  SEED_IDS,
  calculateInternalTransferTotalVnd,
} from '@cf19/shared';
import {
  ApiClientError,
  fetchStoreInventory,
  type StoreInventoryItemRecord,
} from '../../api/apiClient';
import {
  cancelInternalTransferApi,
  fetchTransfersApi,
  reconcileInternalTransferApi,
  requestInternalTransferApi,
  type LiveInternalTransferDto,
} from '../../api/b2bAndTransferApi';
import { Pagination, paginateList } from '../../components/Pagination';

export interface StoreTransferReplenishmentPanelProps {
  storeId: string;
}

export function StoreTransferReplenishmentPanel({
  storeId,
}: StoreTransferReplenishmentPanelProps) {
  const [catalogItems, setCatalogItems] = useState<StoreInventoryItemRecord[]>([]);
  const [transfers, setTransfers] = useState<LiveInternalTransferDto[]>([]);
  const [itemId, setItemId] = useState<string>('');
  const [requestedQty, setRequestedQty] = useState<number>(5000);
  const [notes, setNotes] = useState<string>('Xin cấp bổ sung nguyên liệu cho chi nhánh');
  const [receivedDrafts, setReceivedDrafts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [transferPage, setTransferPage] = useState<number>(1);
  const [transferPageSize, setTransferPageSize] = useState<number>(5);

  const loadData = useCallback(async () => {
    const [invList, trList] = await Promise.all([
      fetchStoreInventory(storeId),
      fetchTransfersApi(storeId),
    ]);
    const orderable = invList.filter((i) => i.category !== 'GREEN_BEAN');
    setCatalogItems(orderable);
    setTransfers(trList);
    if (!itemId && orderable.length > 0) {
      setItemId(orderable[0]!.id);
    }
  }, [storeId, itemId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedItem = useMemo(
    () => catalogItems.find((i) => i.id === itemId) ?? catalogItems[0],
    [catalogItems, itemId],
  );

  const estimatedTotalVnd = useMemo(() => {
    if (!selectedItem || requestedQty <= 0) return 0;
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
    if (!selectedItem) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await requestInternalTransferApi({
        from_warehouse_id: SEED_IDS.stores.centralWarehouse,
        to_store_id: storeId,
        notes: notes.trim() || undefined,
        items: [{ item_id: selectedItem.id, requested_qty: requestedQty }],
      });
      setSuccessMsg(
        `Đã gửi Phiếu Xin Cấp Hàng ${res.transfer_code} (Giá trị nội bộ: ${res.total_internal_value_vnd.toLocaleString('vi-VN')} đ)`,
      );
      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể tạo phiếu xin cấp hàng.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (transfer: LiveInternalTransferDto) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const itemsPayload = (transfer.items ?? []).map((it) => ({
        transfer_item_id: it.id,
        received_qty: receivedDrafts[it.id] ?? it.dispatched_qty,
      }));
      const res = await reconcileInternalTransferApi({
        transfer_id: transfer.id,
        items: itemsPayload,
        notes: 'Quản lý quán xác nhận kiểm nhận thực tế Pha 2',
      });
      setSuccessMsg(
        `Đã kiểm nhận thành công ${res.transfer.transfer_code} → RECONCILED (Nhập ${res.created_store_lots.length} lô mới vào kho Quán)`,
      );
      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể xác nhận nhận hàng.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (transfer: LiveInternalTransferDto) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await cancelInternalTransferApi(transfer.id, 'Chi nhánh hủy yêu cầu bổ sung hàng');
      setSuccessMsg(`Đã hủy phiếu ${transfer.transfer_code}.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Hủy phiếu thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Tạo Phiếu Xin Cấp Nguyên Liệu Từ Kho Tổng
          </h2>
        </div>

        <form onSubmit={handleRequestSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nguyên liệu cần bổ sung
            </label>
            <select
              value={selectedItem?.id ?? ''}
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
              Số lượng xin cấp ({selectedItem?.base_unit ?? 'g'})
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
              disabled={submitting || !selectedItem}
              className="px-5 py-2.5 rounded-xl bg-amber-800 text-white text-sm font-semibold hover:bg-amber-900 disabled:opacity-50"
            >
              Gửi Phiếu Xin Cấp Hàng
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

        {paginateList(transfers, transferPage, transferPageSize).map((tr) => (
          <div key={tr.id} className="rounded-xl border border-stone-200 p-4 bg-stone-50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">{tr.transfer_code}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-900">
                  {tr.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold">
                  Giá trị nội bộ: {tr.total_internal_value_vnd.toLocaleString('vi-VN')} đ
                </span>
                {tr.status === 'REQUESTED' && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleCancel(tr)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100"
                  >
                    <Ban className="w-3 h-3" />
                    Hủy phiếu
                  </button>
                )}
              </div>
            </div>

            {tr.status === 'IN_TRANSIT' && tr.items && (
              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2">
                <div className="text-xs font-semibold text-emerald-900">
                  Hàng đang trên đường giao — Nhập số lượng thực nhận để cộng tồn kho quán:
                </div>
                {tr.items.map((it) => {
                  const ext = it as typeof it & { item_name?: string; base_unit?: string };
                  return (
                    <div key={it.id} className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      <span className="font-sans font-semibold text-stone-800">
                        {ext.item_name ?? it.item_id}
                      </span>
                      <span>
                        Đã xuất: {it.dispatched_qty.toLocaleString('vi-VN')} {ext.base_unit ?? ''}
                      </span>
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
                  );
                })}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleReconcile(tr)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-50"
                >
                  Xác Nhận Kiểm Nhận Thực Tế &amp; Nhập Kho Quán
                </button>
              </div>
            )}
          </div>
        ))}

        <Pagination
          currentPage={transferPage}
          totalItems={transfers.length}
          pageSize={transferPageSize}
          onPageChange={setTransferPage}
          onPageSizeChange={setTransferPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </section>
    </div>
  );
}
