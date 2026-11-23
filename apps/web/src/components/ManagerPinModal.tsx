import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Loader2, ShieldAlert, X } from 'lucide-react';
import { ManagerPinSchema } from '@cf19/shared';
import {
  ApiClientError,
  fetchEligibleManagers,
  type ManagerOptionDto,
} from '../api/apiClient';

export interface ManagerPinSubmitPayload {
  manager_id: string;
  pin: string;
  reason: string;
}

export interface ManagerPinModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  storeId: string;
  onClose: () => void;
  onConfirm: (payload: ManagerPinSubmitPayload) => Promise<void>;
}

export function ManagerPinModal({
  isOpen,
  title,
  description,
  storeId,
  onClose,
  onConfirm,
}: ManagerPinModalProps) {
  const [managers, setManagers] = useState<ManagerOptionDto[]>([]);
  const [loadingManagers, setLoadingManagers] = useState<boolean>(false);
  const [managerId, setManagerId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setLoadingManagers(true);
    void fetchEligibleManagers(storeId)
      .then((list) => {
        setManagers(list);
        if (list.length > 0 && !list.some((m) => m.id === managerId)) {
          setManagerId(list[0]!.id);
        }
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof Error ? err.message : 'Không tải được danh sách Quản lý phê duyệt.',
        );
      })
      .finally(() => setLoadingManagers(false));
  }, [isOpen, storeId]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!managerId) {
      setErrorMessage('Vui lòng chọn người phê duyệt.');
      return;
    }

    const pinCheck = ManagerPinSchema.safeParse(pin);
    if (!pinCheck.success) {
      setErrorMessage('Mã PIN Quản lý bắt buộc gồm đúng 6 chữ số (0-9).');
      return;
    }

    if (reason.trim().length < 3) {
      setErrorMessage('Vui lòng nhập lý do hủy hóa đơn (tối thiểu 3 ký tự).');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        manager_id: managerId,
        pin: pinCheck.data,
        reason: reason.trim(),
      });
      setPin('');
      setReason('');
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Xác thực mã PIN thất bại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900">
            <KeyRound className="w-5 h-5" />
            <h2 className="font-bold text-base">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-stone-600">{description}</p>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quản lý phê duyệt
            </label>
            {loadingManagers ? (
              <div className="flex items-center gap-2 text-xs text-stone-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải danh sách quản lý...
              </div>
            ) : (
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role === 'SUPER_ADMIN' ? 'Chủ chuỗi' : 'Quản lý quán'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã PIN xác thực (6 chữ số)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm tracking-widest font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Lý do hủy hóa đơn
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Khách đổi món trước khi pha chế"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || loadingManagers || !managerId}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Đang xác thực...' : 'Xác nhận phê duyệt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
