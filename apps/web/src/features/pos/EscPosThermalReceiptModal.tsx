import { Ban, Printer, X } from 'lucide-react';

export interface EscPosThermalReceiptModalProps {
  isOpen: boolean;
  orderCode: string;
  receiptText: string;
  canVoid: boolean;
  onClose: () => void;
  onRequestVoid?: () => void;
}

export function EscPosThermalReceiptModal({
  isOpen,
  orderCode,
  receiptText,
  canVoid,
  onClose,
  onRequestVoid,
}: EscPosThermalReceiptModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden">
        <div className="px-5 py-4 bg-stone-900 text-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              Hóa Đơn Nhiệt ESC/POS 42 Cột — {orderCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 bg-stone-100 flex justify-center">
          <pre className="bg-white text-stone-900 font-mono text-[11px] leading-relaxed p-4 rounded-xl shadow border border-stone-300 overflow-x-auto whitespace-pre">
            {receiptText}
          </pre>
        </div>

        <div className="px-5 py-4 bg-white border-t border-stone-200 flex flex-wrap justify-between gap-2">
          {canVoid && onRequestVoid ? (
            <button
              type="button"
              onClick={onRequestVoid}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              <Ban className="w-4 h-4" />
              Hủy Hóa Đơn Đã In (PIN Quản Lý)
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
          >
            <Printer className="w-4 h-4" />
            In Hóa Đơn Nhiệt (ESC/POS)
          </button>
        </div>
      </div>
    </div>
  );
}
