import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import type { PaymentWebhookLogDto } from '@cf19/shared';
import { fetchStoreWebhookLogsApi } from '../../api/vietqrApi';
import { Pagination, paginateList } from '../../components/Pagination';
import {
  getSpeakerAnnouncementHistory,
  isSpeakerMuted,
  setSpeakerMuted,
  type SpeakerHistoryEntry,
} from '../../utils/voiceSpeakerAnnouncer';

export interface VietQrWebhookMonitorPanelProps {
  storeId: string;
  refreshSignal: number;
}

export function VietQrWebhookMonitorPanel({
  storeId,
  refreshSignal,
}: VietQrWebhookMonitorPanelProps) {
  const [logs, setLogs] = useState<PaymentWebhookLogDto[]>([]);
  const [speakerLogs, setSpeakerLogs] = useState<SpeakerHistoryEntry[]>([]);
  const [muted, setMuted] = useState<boolean>(() => isSpeakerMuted());
  const [logPage, setLogPage] = useState<number>(1);
  const [speakerPage, setSpeakerPage] = useState<number>(1);
  const pageSize = 5;

  const loadLogs = useCallback(async () => {
    try {
      const data = await fetchStoreWebhookLogsApi(storeId, undefined, 25);
      setLogs(data);
    } catch {
      setLogs([]);
    }
    setSpeakerLogs(getSpeakerAnnouncementHistory());
  }, [storeId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshSignal]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSpeakerMuted(next);
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-700" />
          <div>
            <h2 className="font-bold text-base text-stone-900">
              Nhật Ký Thanh Toán VietQR &amp; Loa Thông Báo Thu Ngân
            </h2>
            <p className="text-xs text-stone-500">
              Theo dõi các giao dịch chuyển khoản ngân hàng đã đối soát tự động tại quầy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              muted
                ? 'bg-stone-100 text-stone-600 border-stone-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {muted ? (
              <>
                <VolumeX className="w-4 h-4" />
                Loa Thu Ngân: Tắt
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                Loa Thu Ngân: Đang Bật
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void loadLogs()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wide text-stone-600">
            Giao Dịch Chuyển Khoản Đã Nhận ({logs.length})
          </h3>
          {logs.length === 0 ? (
            <p className="text-xs text-stone-400 p-4 rounded-xl border border-dashed border-stone-200 text-center">
              Chưa có giao dịch chuyển khoản VietQR nào tại chi nhánh.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="space-y-2 min-h-[160px]">
                {paginateList(logs, logPage, pageSize).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-mono font-bold text-stone-900">
                      <span>{log.bank_tx_id}</span>
                      <span className="text-emerald-700">
                        +{log.amount_vnd.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono truncate">
                      Mã đối soát: {log.idempotency_key}
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={logPage}
                totalItems={logs.length}
                pageSize={pageSize}
                onPageChange={setLogPage}
                compact
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wide text-stone-600">
            Lịch Sử Loa Thông Báo ({speakerLogs.length} lượt)
          </h3>
          {speakerLogs.length === 0 ? (
            <p className="text-xs text-stone-400 p-4 rounded-xl border border-dashed border-stone-200 text-center">
              Chưa có thông báo âm thanh nào được phát trong phiên làm việc này.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="space-y-2 min-h-[160px]">
                {paginateList(speakerLogs, speakerPage, pageSize).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-indigo-900">
                        {entry.order_code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-[10px] font-mono">
                        {entry.mode}
                      </span>
                    </div>
                    <p className="text-stone-700 leading-snug">{entry.script}</p>
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={speakerPage}
                totalItems={speakerLogs.length}
                pageSize={pageSize}
                onPageChange={setSpeakerPage}
                compact
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
