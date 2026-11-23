import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  RefreshCw,
} from 'lucide-react';
import type {
  BaristaAlertSeverity,
  BaristaLowStockAlertDTO,
  KdsOrderCompletionResultDTO,
  KdsSlaLevel,
  KdsTicketBoardItemDTO,
} from '@cf19/shared';
import {
  ApiClientError,
  fetchStoreInventory,
  type StoreInventoryItemRecord,
} from '../../api/apiClient';
import {
  advanceKdsTicketApi,
  completeKdsOrderBomApi,
  fetchLowStockAlertsApi,
  fetchStoreKdsBoardApi,
  reportBaristaLowStockAlertApi,
} from '../../api/kdsAndShiftApi';

export interface BaristaKdsQueueWorkbenchProps {
  storeId: string;
}

function getSlaCardClass(level: KdsSlaLevel): string {
  if (level === 'CRITICAL_RED') {
    return 'border-red-500 bg-red-950/30 shadow-lg shadow-red-950/50';
  }
  if (level === 'WARNING_YELLOW') {
    return 'border-amber-400 bg-amber-950/20';
  }
  return 'border-emerald-500/70 bg-stone-900';
}

function getSlaBadgeClass(level: KdsSlaLevel): string {
  if (level === 'CRITICAL_RED') {
    return 'bg-red-500/20 text-red-300 border-red-400 animate-pulse';
  }
  if (level === 'WARNING_YELLOW') {
    return 'bg-amber-500/20 text-amber-300 border-amber-400';
  }
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-400';
}

export function BaristaKdsQueueWorkbench({
  storeId,
}: BaristaKdsQueueWorkbenchProps) {
  const [tickets, setTickets] = useState<KdsTicketBoardItemDTO[]>([]);
  const [alerts, setAlerts] = useState<BaristaLowStockAlertDTO[]>([]);
  const [barItems, setBarItems] = useState<StoreInventoryItemRecord[]>([]);
  const [allowPartial, setAllowPartial] = useState<boolean>(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [lastDeduction, setLastDeduction] = useState<KdsOrderCompletionResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [alertItemId, setAlertItemId] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<BaristaAlertSeverity>('OUT_OF_STOCK');
  const [alertNote, setAlertNote] = useState<string>('');
  const [alertSubmitting, setAlertSubmitting] = useState<boolean>(false);

  const loadKdsData = useCallback(async () => {
    const [boardData, alertData, invData] = await Promise.all([
      fetchStoreKdsBoardApi(storeId, false),
      fetchLowStockAlertsApi(storeId),
      fetchStoreInventory(storeId),
    ]);
    setTickets(boardData);
    setAlerts(alertData);
    const eligible = invData.filter((i) => i.category !== 'GREEN_BEAN');
    setBarItems(eligible);
    if (!alertItemId && eligible.length > 0) {
      setAlertItemId(eligible[0]!.id);
    }
  }, [storeId, alertItemId]);

  useEffect(() => {
    void loadKdsData();
  }, [loadKdsData]);

  const handleStartPreparing = async (orderId: string) => {
    setBusyOrderId(orderId);
    setErrorMsg(null);
    try {
      await advanceKdsTicketApi(storeId, orderId, 'PREPARING', allowPartial);
      await loadKdsData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Cập nhật trạng thái pha chế thất bại.',
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCompleteWithBom = async (orderId: string) => {
    setBusyOrderId(orderId);
    setErrorMsg(null);
    try {
      const res = await completeKdsOrderBomApi(storeId, orderId, allowPartial);
      setLastDeduction(res);
      await loadKdsData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Hoàn tất đơn & trừ kho BOM thất bại.',
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSubmitLowStockAlert = async () => {
    if (!alertItemId || alertNote.trim().length < 2) {
      setErrorMsg('Vui lòng chọn nguyên liệu và nhập ghi chú cảnh báo (tối thiểu 2 ký tự).');
      return;
    }
    setAlertSubmitting(true);
    setErrorMsg(null);
    try {
      await reportBaristaLowStockAlertApi(storeId, {
        inventory_item_id: alertItemId,
        severity: alertSeverity,
        note: alertNote.trim(),
      });
      setAlertNote('');
      await loadKdsData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Gửi cảnh báo nguyên liệu thất bại.',
      );
    } finally {
      setAlertSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800">
        <div className="text-xs text-stone-300">
          Đang chờ pha chế: <strong className="text-amber-300">{tickets.length}</strong> đơn đã thanh toán
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2 text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPartial}
              onChange={(e) => setAllowPartial(e.target.checked)}
              className="rounded border-stone-600"
            />
            <span>Cho phép trừ phần tồn khả dụng nếu kho thiếu định mức</span>
          </label>
          <button
            type="button"
            onClick={() => void loadKdsData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-semibold hover:bg-stone-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới KDS
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500 text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {lastDeduction && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/60 text-emerald-100 text-xs space-y-2">
          <div className="font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Đã hoàn tất đơn {lastDeduction.order_code} &amp; Tự động trừ kho BOM theo FIFO (
              {lastDeduction.already_deducted ? 'Đã trừ trước đó' : `${lastDeduction.deductions.length} nguyên liệu`})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lastDeduction.deductions.map((ded) => (
              <div
                key={ded.inventory_item_id}
                className="p-2.5 rounded-xl bg-stone-900/90 border border-emerald-700/50 space-y-1"
              >
                <div className="flex justify-between font-mono font-bold">
                  <span>{ded.sku} • {ded.name}</span>
                  <span className="text-emerald-300">
                    -{ded.deducted_qty} {ded.base_unit}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 font-mono">
                  {ded.lot_slices.map((s) => `${s.lot_code} (-${s.deducted_qty}${s.depleted ? ' HẾT LÔ' : ''})`).join(' → ')}
                  {ded.shortage_qty > 0 && (
                    <span className="text-amber-300 ml-2">
                      Thiếu: {ded.shortage_qty} {ded.base_unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="p-10 rounded-2xl bg-stone-900 border border-stone-800 text-center text-stone-400 text-sm">
          Quầy Bar hiện trống — Chưa có đơn pha chế nào đang chờ.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className={`rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 ${getSlaCardClass(ticket.sla_level)}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-base text-white">
                        {ticket.order_code}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        {ticket.kds_status === 'QUEUED' ? 'Chờ pha chế' : 'Đang pha chế'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${getSlaBadgeClass(ticket.sla_level)}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {ticket.wait_minutes}p
                  </span>
                </div>

                <div className="space-y-2">
                  {ticket.items.map((line) => (
                    <div
                      key={line.id}
                      className="p-3 rounded-xl bg-stone-800/90 border border-stone-700 text-sm space-y-1"
                    >
                      <div className="flex justify-between font-bold text-stone-100">
                        <span>
                          {line.product_name} ({line.size_code})
                        </span>
                        <span className="font-mono text-amber-300">x{line.quantity}</span>
                      </div>
                      {line.modifiers_json.length > 0 && (
                        <div className="text-xs text-amber-200">
                          + {line.modifiers_json.map((m) => m.name).join(', ')}
                        </div>
                      )}
                      {line.notes && (
                        <div className="text-xs text-stone-400">Ghi chú: {line.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800 space-y-2">
                {ticket.kds_status === 'QUEUED' && (
                  <button
                    type="button"
                    disabled={busyOrderId === ticket.id}
                    onClick={() => void handleStartPreparing(ticket.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-40"
                  >
                    <Flame className="w-4 h-4" />
                    Bắt Đầu Pha Chế
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyOrderId === ticket.id}
                  onClick={() => void handleCompleteWithBom(ticket.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Hoàn Thành Món &amp; Trừ Kho BOM
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-2xl bg-stone-900 border border-stone-800 p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Báo Sắp Hết / Hết Nguyên Liệu Tại Quầy Bar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <select
            value={alertItemId}
            onChange={(e) => setAlertItemId(e.target.value)}
            className="rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
          >
            {barItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.base_unit})
              </option>
            ))}
          </select>

          <select
            value={alertSeverity}
            onChange={(e) => setAlertSeverity(e.target.value as BaristaAlertSeverity)}
            className="rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
          >
            <option value="OUT_OF_STOCK">HẾT HÀNG (OUT_OF_STOCK)</option>
            <option value="LOW">SẮP HẾT (LOW)</option>
          </select>

          <input
            type="text"
            value={alertNote}
            onChange={(e) => setAlertNote(e.target.value)}
            placeholder="Ghi chú gửi Quản lý Quán..."
            className="rounded-xl bg-stone-950 border border-stone-700 px-3 py-2 text-stone-100"
          />

          <button
            type="button"
            disabled={alertSubmitting}
            onClick={() => void handleSubmitLowStockAlert()}
            className="rounded-xl bg-amber-600 text-stone-950 font-bold px-4 py-2 hover:bg-amber-500 disabled:opacity-40"
          >
            Gửi Cảnh Báo Lên Quản Lý
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-amber-300">{al.sku}</span> •{' '}
                  <span className="font-semibold text-stone-100">{al.item_name}</span> —{' '}
                  <span className="text-stone-400">{al.note}</span>
                </div>
                <div className="flex items-center gap-2">
                  {al.resolved ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      Quản lý đã xử lý
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                      {al.severity}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
