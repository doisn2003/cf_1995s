import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import {
  calculateDailyStocktakeVariance,
  type BaristaLowStockAlertDTO,
  type StocktakePreviewRowDTO,
  type StoreDailyStocktakeItemResultDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  fetchLowStockAlertsApi,
  fetchStocktakePreviewApi,
  fetchStoreDailyStocktakesApi,
  resolveLowStockAlertApi,
  submitStoreDailyStocktakeApi,
} from '../../api/kdsAndShiftApi';
import { Pagination, paginateList } from '../../components/Pagination';

export interface StoreDailyStocktakePanelProps {
  storeId: string;
}

interface StocktakeRowDraft extends StocktakePreviewRowDTO {
  actual_counted_qty: string;
}

export function StoreDailyStocktakePanel({
  storeId,
}: StoreDailyStocktakePanelProps) {
  const [stocktakeDate, setStocktakeDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [drafts, setDrafts] = useState<StocktakeRowDraft[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [history, setHistory] = useState<StoreDailyStocktakeItemResultDTO[]>([]);
  const [barAlerts, setBarAlerts] = useState<BaristaLowStockAlertDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [alertPage, setAlertPage] = useState<number>(1);
  const pageSize = 5;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [previewRows, historyRows, alertRows] = await Promise.all([
        fetchStocktakePreviewApi(storeId, stocktakeDate),
        fetchStoreDailyStocktakesApi(storeId),
        fetchLowStockAlertsApi(storeId),
      ]);
      setDrafts(
        previewRows.map((r) => ({
          ...r,
          actual_counted_qty: String(r.theoretical_closing_qty),
        })),
      );
      setHistory(historyRows);
      setBarAlerts(alertRows);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không tải được dữ liệu kiểm kho.',
      );
    } finally {
      setLoading(false);
    }
  }, [storeId, stocktakeDate]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const updateActualQty = (itemId: string, nextVal: string) => {
    setDrafts((prev) =>
      prev.map((row) =>
        row.inventory_item_id === itemId
          ? { ...row, actual_counted_qty: nextVal }
          : row,
      ),
    );
  };

  const handleSubmitStocktake = async () => {
    if (drafts.length === 0) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const parsedItems = drafts.map((row) => {
      const actual = Number(row.actual_counted_qty);
      return {
        inventory_item_id: row.inventory_item_id,
        opening_qty: row.opening_qty,
        received_in_qty: row.received_in_qty,
        bom_consumed_qty: row.bom_consumed_qty,
        actual_counted_qty: Number.isFinite(actual) && actual >= 0 ? actual : 0,
      };
    });

    setSubmitting(true);
    try {
      const res = await submitStoreDailyStocktakeApi({
        store_id: storeId,
        stocktake_date: stocktakeDate,
        notes: notes.trim() || undefined,
        items: parsedItems,
      });
      setStatusMsg(
        `Đã lưu phiếu kiểm kho ngày ${res.stocktake_date} (${res.total_items_counted} nguyên liệu, ${res.abnormal_shrinkage_count} cảnh báo hao hụt bất thường > 3%).`,
      );
      await loadAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể lưu phiếu kiểm kho cuối ngày.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveLowStockAlertApi(storeId, alertId);
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Cập nhật cảnh báo thất bại.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-base text-stone-900">
                Kiểm Kho Cuối Ngày Đối Chiếu Định Mức BOM
              </h2>
              <p className="text-xs text-stone-500">
                Hệ thống tự động tổng hợp Tồn đầu ngày + Nhập nội bộ - Tiêu hao BOM từ dữ liệu thực tế; Quản lý chỉ cần nhập số lượng thực đếm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={stocktakeDate}
              onChange={(e) => setStocktakeDate(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-1.5 font-mono"
            />
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Tính lại tồn lý thuyết
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-100 text-stone-600 uppercase">
              <tr>
                <th className="px-3 py-2.5">Nguyên liệu</th>
                <th className="px-3 py-2.5 text-right">Đầu ngày</th>
                <th className="px-3 py-2.5 text-right">Nhập nội bộ</th>
                <th className="px-3 py-2.5 text-right">BOM trừ</th>
                <th className="px-3 py-2.5 text-right">Lý thuyết</th>
                <th className="px-3 py-2.5 text-right">Thực đếm</th>
                <th className="px-3 py-2.5 text-right">Chênh lệch</th>
                <th className="px-3 py-2.5">Đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {drafts.map((row) => {
                const actualNum = Number(row.actual_counted_qty);
                const preview = calculateDailyStocktakeVariance({
                  openingQty: row.opening_qty,
                  receivedInQty: row.received_in_qty,
                  bomConsumedQty: row.bom_consumed_qty,
                  actualCountedQty:
                    Number.isFinite(actualNum) && actualNum >= 0 ? actualNum : 0,
                });

                return (
                  <tr key={row.inventory_item_id}>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-stone-900">{row.item_name}</div>
                      <div className="font-mono text-[11px] text-stone-500">
                        {row.sku} ({row.base_unit})
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.opening_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-700">
                      +{row.received_in_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-800">
                      -{row.bom_consumed_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">
                      {preview.theoretical_closing_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.actual_counted_qty}
                        onChange={(e) =>
                          updateActualQty(row.inventory_item_id, e.target.value)
                        }
                        className="w-24 text-right rounded-lg border border-stone-300 px-2 py-1 font-mono"
                      />
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono font-bold ${
                        preview.variance_qty < 0
                          ? 'text-red-700'
                          : preview.variance_qty > 0
                            ? 'text-emerald-700'
                            : 'text-stone-700'
                      }`}
                    >
                      {preview.variance_qty >= 0 ? '+' : ''}
                      {preview.variance_qty} ({preview.variance_pct}%)
                    </td>
                    <td className="px-3 py-2.5">
                      {preview.is_abnormal_shrinkage ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          Hao hụt &gt; 3%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          Đạt chuẩn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between pt-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú giải trình chênh lệch kiểm kho cuối ngày..."
            className="flex-1 min-w-[240px] rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
          <button
            type="button"
            disabled={submitting || drafts.length === 0}
            onClick={() => void handleSubmitStocktake()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-40"
          >
            <ClipboardCheck className="w-4 h-4" />
            Lưu Phiếu Kiểm Kho Cuối Ngày
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-stone-900">
            Lịch Sử Kiểm Kho ({history.length} bản ghi)
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-stone-400">Chưa có phiếu kiểm kho nào được lưu.</p>
          ) : (
            <div className="space-y-2">
              <div className="space-y-2 min-h-[160px]">
                {paginateList(history, historyPage, pageSize).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex justify-between items-center gap-2"
                  >
                    <div>
                      <div className="font-bold text-stone-900">
                        {item.stocktake_date} • {item.item_name}
                      </div>
                      <div className="text-[11px] font-mono text-stone-500">
                        Lý thuyết: {item.theoretical_closing_qty} | Thực đếm: {item.actual_counted_qty} {item.base_unit}
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded ${
                        item.is_abnormal_shrinkage
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.variance_qty} ({item.variance_pct}%)
                    </span>
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={historyPage}
                totalItems={history.length}
                pageSize={pageSize}
                onPageChange={setHistoryPage}
                compact
              />
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-stone-900">
            Cảnh Báo Thiếu Nguyên Liệu Từ Quầy Bar ({barAlerts.filter((a) => !a.resolved).length} chưa xử lý)
          </h3>
          {barAlerts.length === 0 ? (
            <p className="text-xs text-stone-400">
              Chưa có cảnh báo thiếu nguyên liệu nào từ quầy Bar.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="space-y-2 min-h-[160px]">
                {paginateList(barAlerts, alertPage, pageSize).map((al) => (
                  <div
                    key={al.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      al.resolved
                        ? 'bg-stone-50 border-stone-200 opacity-70'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 font-bold text-amber-950">
                      <span>{al.sku} • {al.item_name}</span>
                      {al.resolved ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px]">
                          Đã xử lý
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleResolveAlert(al.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800"
                        >
                          Đánh dấu đã xử lý
                        </button>
                      )}
                    </div>
                    <div className="text-amber-900">{al.note}</div>
                    <div className="text-[11px] text-stone-500">
                      Báo bởi: {al.reported_by_name} • Mức độ: {al.severity}
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={alertPage}
                totalItems={barAlerts.length}
                pageSize={pageSize}
                onPageChange={setAlertPage}
                compact
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
