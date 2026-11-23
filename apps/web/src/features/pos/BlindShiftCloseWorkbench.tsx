import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Lock,
  PlusCircle,
} from 'lucide-react';
import type { BlindShiftCloseResultDTO } from '@cf19/shared';
import { ApiClientError, type ShiftRecord } from '../../api/apiClient';
import {
  blindClosePosShiftApi,
  openPosShiftApi,
} from '../../api/kdsAndShiftApi';

export interface BlindShiftCloseWorkbenchProps {
  storeId: string;
  shift: ShiftRecord | null;
  onShiftChanged: () => void;
}

export function BlindShiftCloseWorkbench({
  storeId,
  shift,
  onShiftChanged,
}: BlindShiftCloseWorkbenchProps) {
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [newOpeningCash, setNewOpeningCash] = useState<string>('2000000');
  const [openNotes, setOpenNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [closedResult, setClosedResult] = useState<BlindShiftCloseResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBlindClose = async () => {
    if (!shift) return;
    const counted = Number(countedCashInput);
    if (!Number.isInteger(counted) || counted < 0) {
      setErrorMsg('Số tiền mặt thực đếm phải là số nguyên VNĐ không âm.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await blindClosePosShiftApi(
        storeId,
        shift.id,
        counted,
        closeNotes.trim() || undefined,
      );
      setClosedResult(res);
      setCountedCashInput('');
      setCloseNotes('');
      onShiftChanged();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể chốt ca đếm tiền mù.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNewShift = async () => {
    const floatCash = Number(newOpeningCash);
    if (!Number.isInteger(floatCash) || floatCash < 0) {
      setErrorMsg('Tiền quỹ đầu ca phải là số nguyên VNĐ không âm.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await openPosShiftApi(storeId, floatCash, openNotes.trim() || undefined);
      setClosedResult(null);
      setOpenNotes('');
      onShiftChanged();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể mở ca mới.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-amber-700" />
          <div>
            <h2 className="font-bold text-sm text-stone-900">
              Quản Lý Ca Làm Việc &amp; Đóng Ca Đếm Tiền Mù
            </h2>
            <p className="text-xs text-stone-500">
              Thu ngân nhập số tiền mặt thực đếm tại két trước khi hệ thống đối soát số tiền lý thuyết
            </p>
          </div>
        </div>
        {shift && (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
            Ca hiện tại: {shift.status}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {shift && shift.status === 'OPEN' && !closedResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div className="text-stone-500">Tiền quỹ đầu ca</div>
              <div className="font-mono font-bold text-sm text-stone-900 mt-0.5">
                {shift.opening_cash_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 md:col-span-2">
              <div className="text-amber-800 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Tiền mặt lý thuyết hệ thống</span>
              </div>
              <div className="font-mono font-bold text-amber-900 mt-0.5">
                •••••• (Ẩn đến khi Thu ngân xác nhận đếm két)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <input
              type="number"
              min={0}
              value={countedCashInput}
              onChange={(e) => setCountedCashInput(e.target.value)}
              placeholder="Nhập tiền mặt thực tế đếm được (VNĐ)"
              className="rounded-xl border border-stone-300 px-3 py-2.5 font-mono"
            />
            <input
              type="text"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Ghi chú bàn giao ca (tùy chọn)"
              className="rounded-xl border border-stone-300 px-3 py-2.5"
            />
            <button
              type="button"
              disabled={submitting || countedCashInput.trim().length === 0}
              onClick={() => void handleBlindClose()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-800 text-white font-bold px-4 py-2.5 hover:bg-amber-900 disabled:opacity-40"
            >
              <Lock className="w-4 h-4" />
              Xác Nhận Chốt Ca Đếm Tiền Mù
            </button>
          </div>
        </div>
      )}

      {closedResult && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            closedResult.variance_status === 'SHORTAGE'
              ? 'bg-red-50 border-red-300 text-red-900'
              : closedResult.variance_status === 'SURPLUS'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-sm">
            <span className="flex items-center gap-1.5">
              {closedResult.variance_status === 'SHORTAGE' ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              )}
              <span>Kết Quả Đối Soát Chốt Ca</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-mono text-xs bg-white border">
              {closedResult.variance_status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div>
              <div className="opacity-70">Tiền đầu ca + Doanh thu Tiền mặt</div>
              <div className="font-mono font-bold">
                {closedResult.system_expected_cash_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <div className="opacity-70">Thu ngân thực đếm</div>
              <div className="font-mono font-bold">
                {closedResult.blind_counted_cash_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <div className="opacity-70">Chênh lệch két tiền</div>
              <div className="font-mono font-extrabold">
                {closedResult.variance_cash_vnd >= 0 ? '+' : ''}
                {closedResult.variance_cash_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <div className="opacity-70">Doanh thu VietQR (ngoài két)</div>
              <div className="font-mono font-bold">
                {closedResult.vietqr_sales_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
        </div>
      )}

      {(!shift || shift.status === 'CLOSED' || closedResult) && (
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
          <div className="text-xs font-bold text-stone-800">
            Mở Ca Làm Việc Mới
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <input
              type="number"
              min={0}
              value={newOpeningCash}
              onChange={(e) => setNewOpeningCash(e.target.value)}
              placeholder="Tiền quỹ đầu ca (VNĐ)"
              className="rounded-xl border border-stone-300 px-3 py-2 bg-white font-mono"
            />
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="Ghi chú mở ca (vd: Ca chiều)"
              className="rounded-xl border border-stone-300 px-3 py-2 bg-white"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleOpenNewShift()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-white font-bold px-4 py-2 hover:bg-emerald-800 disabled:opacity-40"
            >
              <PlusCircle className="w-4 h-4" />
              Mở Ca Mới
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
