import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  verifyEmvCoPayloadCrc,
  type EmvCoVietQrPayloadDTO,
  type PosOrderFullDto,
  type VietQrWebhookProcessResultDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  generateOrderVietQrApi,
  simulateOrderWebhookApi,
} from '../../api/vietqrApi';
import {
  isSpeakerMuted,
  processWebhookSpeakerTrigger,
} from '../../utils/voiceSpeakerAnnouncer';

export interface PosDynamicVietQrModalProps {
  isOpen: boolean;
  storeId: string;
  order: PosOrderFullDto | null;
  onClose: () => void;
  onWebhookProcessed: (result: VietQrWebhookProcessResultDTO) => void;
}

export function PosDynamicVietQrModal({
  isOpen,
  storeId,
  order,
  onClose,
  onWebhookProcessed,
}: PosDynamicVietQrModalProps) {
  const [qrData, setQrData] = useState<EmvCoVietQrPayloadDTO | null>(null);
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [webhookBanner, setWebhookBanner] = useState<{
    kind: 'success' | 'replay';
    title: string;
    detail: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !order) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setWebhookBanner(null);
    setCopied(false);
    setQrImageDataUrl(null);

    void generateOrderVietQrApi(storeId, order.id)
      .then(async (data) => {
        if (cancelled) return;
        setQrData(data);
        const dataUrl = await QRCode.toDataURL(data.emvco_payload, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#1c1917',
            light: '#ffffff',
          },
        });
        if (!cancelled) {
          setQrImageDataUrl(dataUrl);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Không thể sinh mã VietQR động.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, storeId, order]);

  const crcVerified = useMemo(
    () => (qrData ? verifyEmvCoPayloadCrc(qrData.emvco_payload) : false),
    [qrData],
  );

  if (!isOpen || !order) {
    return null;
  }

  const handleCopyPayload = async () => {
    if (!qrData || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(qrData.emvco_payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleSimulateWebhook = async (simulateDuplicate: boolean) => {
    setSimulating(true);
    setErrorMsg(null);
    try {
      const result = await simulateOrderWebhookApi(storeId, order.id, {
        simulate_duplicate: simulateDuplicate,
      });

      const speakerOutcome = processWebhookSpeakerTrigger(result, {
        muted: isSpeakerMuted(),
      });

      if (result.status === 'RECONCILED_PAID') {
        setQrData((prev) => (prev ? { ...prev, payment_status: 'PAID' } : prev));
        setWebhookBanner({
          kind: 'success',
          title: `Đã xác nhận thanh toán thành công (${result.bank_tx_id}) — Đơn đã đẩy sang Quầy Pha Chế KDS!`,
          detail: speakerOutcome.script
            ? `Loa thu ngân (${speakerOutcome.mode}): "${speakerOutcome.script}"`
            : 'Đã xác nhận tiền vào tài khoản.',
        });
      } else {
        setWebhookBanner({
          kind: 'replay',
          title: 'Giao dịch đã được gạch nợ trước đó (Chống gạch nợ trùng lặp)',
          detail: `Mã giao dịch ${result.bank_tx_id} đã xử lý — không cộng trùng doanh thu và không phát lại loa.`,
        });
      }

      onWebhookProcessed(result);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể gửi tín hiệu xác nhận thanh toán.',
      );
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-indigo-300" />
            <div>
              <h3 className="font-bold text-base">
                Thanh Toán VietQR Động NAPAS247 — {order.order_code}
              </h3>
              <p className="text-xs text-indigo-200">
                Mã QR chuẩn ISO/IEC 18004 định danh chính xác số tiền &amp; mã hóa đơn (Đơn chỉ sang KDS sau khi xác nhận tiền vào)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-indigo-200 hover:text-white"
            aria-label="Đóng modal VietQR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {loading && (
            <div className="py-10 text-center text-sm text-stone-500">
              Đang khởi tạo mã VietQR động EMVCo...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {webhookBanner && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                webhookBanner.kind === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {webhookBanner.kind === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                )}
                <span>{webhookBanner.title}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>{webhookBanner.detail}</span>
              </div>
            </div>
          )}

          {qrData && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="flex flex-col items-center p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 space-y-3">
                {qrImageDataUrl ? (
                  <img
                    src={qrImageDataUrl}
                    alt={`Mã VietQR ${qrData.vietqr_ref_code}`}
                    className="w-56 h-56 bg-white p-2 rounded-xl border border-stone-200 shadow-sm object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-400">
                    Đang vẽ mã QR...
                  </div>
                )}

                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
                    crcVerified
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    CRC16-CCITT: {qrData.crc16_hex} ({crcVerified ? 'HỢP LỆ' : 'LỖI'})
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-stone-900">
                      {qrData.bank_short_name} ({qrData.bank_bin})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Số tài khoản:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {qrData.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tên tài khoản:</span>
                    <span className="font-bold text-stone-900">{qrData.account_name}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                    <span className="text-stone-500">Số tiền cố định:</span>
                    <span className="font-mono font-extrabold text-base text-indigo-800">
                      {qrData.amount_vnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Nội dung CK bắt buộc:</span>
                    <span className="font-mono font-bold text-amber-800">
                      {qrData.vietqr_ref_code}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Trạng thái hóa đơn:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold ${
                        qrData.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {qrData.payment_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-600">
                      Chuỗi chuẩn EMVCo (Tag 00–63)
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyPayload()}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 text-emerald-300 font-mono text-[10px] break-all leading-relaxed">
                    {qrData.emvco_payload}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3">
            <div className="text-xs font-bold text-indigo-950">
              Xác Nhận Tín Hiệu Chuyển Khoản Ngân Hàng (Webhook IPN)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={simulating || loading || qrData === null}
                onClick={() => void handleSimulateWebhook(false)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-40"
              >
                <Zap className="w-4 h-4 shrink-0" />
                Xác Nhận Khách Đã Chuyển Khoản (Webhook IPN)
              </button>
              <button
                type="button"
                disabled={simulating || loading || qrData === null}
                onClick={() => void handleSimulateWebhook(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                Gửi Lại Tín Hiệu Trùng (Kiểm Chứng Idempotent)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
