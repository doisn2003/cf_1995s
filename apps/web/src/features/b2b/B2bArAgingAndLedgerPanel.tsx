import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, Clock, Wallet } from 'lucide-react';
import {
  SEED_IDS,
  settleFifoPendingInvoices,
  type ArAgingSummaryDTO,
  type B2bCustomerDto,
  type B2bDebtLedgerEntryDto,
  type B2bOrderDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { recordB2bDebtPaymentApi } from '../../api/b2bAndTransferApi';

export interface B2bArAgingAndLedgerPanelProps {
  customers: B2bCustomerDto[];
  orders: B2bOrderDto[];
  agingSummary: ArAgingSummaryDTO;
  ledgerEntries: B2bDebtLedgerEntryDto[];
  onPaymentRecorded: () => Promise<void>;
}

export function B2bArAgingAndLedgerPanel({
  customers,
  orders,
  agingSummary,
  ledgerEntries,
  onPaymentRecorded,
}: B2bArAgingAndLedgerPanelProps) {
  const [customerId, setCustomerId] = useState<string>(
    customers[0]?.id ?? SEED_IDS.b2bCustomers.phoNuiCoffee,
  );
  const [paymentAmountVnd, setPaymentAmountVnd] = useState<number>(2500000);
  const [referenceNote, setReferenceNote] = useState<string>('Chuyển khoản thu nợ định kỳ');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? customers[0];

  const fifoPreview = useMemo(() => {
    if (!selectedCustomer || paymentAmountVnd <= 0) {
      return null;
    }
    const pendingForCustomer = orders
      .filter(
        (o) =>
          o.customer_id === selectedCustomer.id &&
          o.payment_status === 'PENDING' &&
          o.paid_amount_vnd < o.total_amount_vnd,
      )
      .map((o) => ({
        id: o.id,
        order_code: o.order_code,
        ordered_at: o.created_at,
        total_amount_vnd: o.total_amount_vnd,
        paid_amount_vnd: o.paid_amount_vnd,
        payment_status: o.payment_status,
      }));
    return settleFifoPendingInvoices(pendingForCustomer, paymentAmountVnd);
  }, [orders, selectedCustomer, paymentAmountVnd]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await recordB2bDebtPaymentApi({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: selectedCustomer.id,
        payment_amount_vnd: Math.round(paymentAmountVnd),
        reference_note: referenceNote.trim() || undefined,
      });
      setSuccessMsg(
        `Đã thu ${res.payment_amount_vnd.toLocaleString('vi-VN')} đ (Gạch nợ ${res.settled_orders.length} hóa đơn FIFO, dư nợ mới: ${res.new_debt_vnd.toLocaleString('vi-VN')} đ)`,
      );
      await onPaymentRecorded();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể ghi nhận thu nợ.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Phân Tích Tuổi Nợ Khách Sỉ (Tính đến {agingSummary.as_of_date})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Khách sỉ</th>
                <th className="px-3 py-2 text-right">Trong hạn</th>
                <th className="px-3 py-2 text-right">Quá hạn 1–30d</th>
                <th className="px-3 py-2 text-right">Quá hạn 31–60d</th>
                <th className="px-3 py-2 text-right">Nợ xấu &gt;60d</th>
                <th className="px-3 py-2 text-right">Tổng nợ</th>
                <th className="px-3 py-2">Phân loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {agingSummary.customers.map((row) => (
                <tr key={row.customer.id}>
                  <td className="px-3 py-2 font-medium">
                    {row.customer.shop_name || row.customer.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {row.current_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700 font-semibold">
                    {row.overdue_1_30_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-orange-700">
                    {row.overdue_31_60_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-red-700 font-bold">
                    {row.overdue_60_plus_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {row.total_outstanding_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.worst_bucket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-emerald-700" />
          <h2 className="font-bold text-base">
            Thu Nợ Khách Sỉ &amp; Gạch Nợ Hóa Đơn Cũ Trước (FIFO)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Khách sỉ thanh toán
            </label>
            <select
              value={selectedCustomer?.id ?? ''}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shop_name || c.name} (Nợ: {c.current_debt_vnd.toLocaleString('vi-VN')} đ)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số tiền thu nợ (VNĐ)
            </label>
            <input
              type="number"
              min={1}
              step={100000}
              value={paymentAmountVnd}
              onChange={(e) => setPaymentAmountVnd(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ghi chú chứng từ
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          {fifoPreview && fifoPreview.settled.length > 0 && (
            <div className="md:col-span-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
              <div className="font-semibold mb-1">
                Phân bổ gạch nợ FIFO dự kiến ({fifoPreview.settled.length} hóa đơn):
              </div>
              <div className="flex flex-wrap gap-3 font-mono">
                {fifoPreview.settled.map((s) => (
                  <span
                    key={s.order_id}
                    className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200"
                  >
                    {s.order_code}: +{s.applied_vnd.toLocaleString('vi-VN')} đ → {s.new_payment_status}
                  </span>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !selectedCustomer}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Đang gạch nợ FIFO...' : 'Ghi nhận Thu Nợ & Cập nhật Sổ Cái'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-base">
            Sổ Cái Công Nợ Bất Biến ({ledgerEntries.length} bút toán)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Loại bút toán</th>
                <th className="px-3 py-2 text-right">Số tiền (VNĐ)</th>
                <th className="px-3 py-2 text-right">Dư nợ sau bút toán</th>
                <th className="px-3 py-2">Diễn giải</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 font-mono text-xs font-bold">
                    <span
                      className={
                        entry.entry_type === 'CREDIT_PAYMENT'
                          ? 'text-emerald-700'
                          : 'text-amber-800'
                      }
                    >
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {entry.amount_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {entry.balance_after_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-600">
                    {entry.reference_note ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
