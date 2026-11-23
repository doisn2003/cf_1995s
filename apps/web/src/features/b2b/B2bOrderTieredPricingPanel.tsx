import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ShoppingBag, Users } from 'lucide-react';
import {
  SEED_IDS,
  calculateB2bCreditCheck,
  resolveB2bTieredUnitPriceVnd,
  type B2bCustomerDto,
  type B2bOrderDto,
  type B2bPriceTierDto,
  type WarehouseInventoryItemDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { createB2bOrderApi } from '../../api/b2bAndTransferApi';

export interface B2bOrderTieredPricingPanelProps {
  customers: B2bCustomerDto[];
  priceTiers: B2bPriceTierDto[];
  orders: B2bOrderDto[];
  inventoryItems: WarehouseInventoryItemDto[];
  onOrderCreated: () => Promise<void>;
}

export function B2bOrderTieredPricingPanel({
  customers,
  priceTiers,
  orders,
  inventoryItems,
  onOrderCreated,
}: B2bOrderTieredPricingPanelProps) {
  const catalogItems = useMemo(
    () =>
      inventoryItems.filter(
        (i) => i.is_active && i.category !== 'GREEN_BEAN',
      ),
    [inventoryItems],
  );
  const [customerId, setCustomerId] = useState<string>(
    customers[0]?.id ?? SEED_IDS.b2bCustomers.phoNuiCoffee,
  );
  const [itemId, setItemId] = useState<string>(
    catalogItems.find((i) => i.id === SEED_IDS.inventoryItems.roastedRobustaMed)?.id ??
      catalogItems[0]?.id ??
      SEED_IDS.inventoryItems.roastedRobustaMed,
  );
  const [quantityG, setQuantityG] = useState<number>(15000);
  const [paidAmountVnd, setPaidAmountVnd] = useState<number>(500000);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? customers[0],
    [customers, customerId],
  );
  const selectedItem = useMemo(
    () => catalogItems.find((i) => i.id === itemId) ?? catalogItems[0],
    [catalogItems, itemId],
  );

  const livePreview = useMemo(() => {
    if (!selectedCustomer || !selectedItem || quantityG <= 0) {
      return null;
    }
    const quote = resolveB2bTieredUnitPriceVnd({
      qtyBaseUnit: quantityG,
      baseUnit: selectedItem.base_unit,
      customerPriceTier: selectedCustomer.price_tier,
      tiers: priceTiers.filter((t) => t.item_id === selectedItem.id),
      fallbackRetailPriceVnd: selectedItem.retail_price_vnd,
      fallbackInternalTransferPriceVnd: selectedItem.internal_transfer_price_vnd,
    });
    const safePaid = Math.min(Math.max(0, paidAmountVnd), quote.estimated_line_total_vnd);
    const credit = calculateB2bCreditCheck({
      currentDebtVnd: selectedCustomer.current_debt_vnd,
      creditLimitVnd: selectedCustomer.credit_limit_vnd,
      totalAmountVnd: quote.estimated_line_total_vnd,
      paidAmountVnd: safePaid,
    });
    return { quote, credit };
  }, [selectedCustomer, selectedItem, quantityG, paidAmountVnd, priceTiers]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedItem) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await createB2bOrderApi({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        customer_id: selectedCustomer.id,
        payment_method: 'VIETQR',
        paid_amount_vnd: Math.round(paidAmountVnd),
        items: [{ item_id: selectedItem.id, quantity_base_unit: quantityG }],
      });
      setSuccessMsg(
        `Đã tạo đơn sỉ ${res.order.order_code}: Tổng ${res.order.total_amount_vnd.toLocaleString('vi-VN')} đ (${res.items.length} lát cắt lô FIFO)`,
      );
      await onOrderCreated();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể tạo đơn bán sỉ B2B.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Khách Sỉ F&amp;B Thị Trấn &amp; Hạn Mức Công Nợ Gối Đầu
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c) => {
            const usagePct =
              c.credit_limit_vnd > 0
                ? Math.min(100, Math.round((c.current_debt_vnd / c.credit_limit_vnd) * 100))
                : 0;
            return (
              <div key={c.id} className="rounded-xl border border-stone-200 p-4 bg-stone-50">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm">{c.shop_name || c.name}</div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800">
                    {c.price_tier}
                  </span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {c.code} • {c.name} • {c.phone}
                </div>
                <div className="mt-3 flex justify-between text-xs font-mono">
                  <span>Nợ hiện tại: {c.current_debt_vnd.toLocaleString('vi-VN')} đ</span>
                  <span>Hạn mức: {c.credit_limit_vnd.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={usagePct >= 80 ? 'h-full bg-red-600' : 'h-full bg-emerald-600'}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-base">
            Tạo Đơn Bán Sỉ B2B (Tự Động Tra Bậc Giá + Kiểm Soát Hạn Mức + Trừ FIFO)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Khách hàng sỉ B2B
            </label>
            <select
              value={selectedCustomer?.id ?? ''}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shop_name || c.name} ({c.price_tier})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Sản phẩm xuất sỉ
            </label>
            <select
              value={selectedItem?.id ?? ''}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {catalogItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số lượng ({selectedItem?.base_unit ?? 'g'})
            </label>
            <input
              type="number"
              min={1}
              step={selectedItem?.base_unit === 'g' ? 1000 : 1}
              value={quantityG}
              onChange={(e) => setQuantityG(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Thanh toán ngay (VNĐ)
            </label>
            <input
              type="number"
              min={0}
              step={100000}
              value={paidAmountVnd}
              onChange={(e) => setPaidAmountVnd(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          {livePreview && (
            <div
              className={`md:col-span-4 p-4 rounded-xl border text-xs flex flex-wrap justify-between gap-4 ${
                livePreview.credit.exceeds_credit_limit
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {livePreview.credit.exceeds_credit_limit ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
                <span>
                  {livePreview.credit.exceeds_credit_limit
                    ? 'Đơn hàng vượt hạn mức công nợ cho phép của khách hàng này.'
                    : `Bậc giá áp dụng: ${livePreview.quote.applied_price_tier ?? livePreview.quote.price_source} (${livePreview.quote.qty_kg} kg)`}
                </span>
              </div>
              <div className="font-mono flex flex-wrap gap-5">
                <span>
                  Đơn giá: <strong>{livePreview.quote.unit_price_vnd.toLocaleString('vi-VN')} đ</strong>
                </span>
                <span>
                  Tổng đơn: <strong>{livePreview.quote.estimated_line_total_vnd.toLocaleString('vi-VN')} đ</strong>
                </span>
                <span>
                  Dư nợ sau đơn:{' '}
                  <strong>{livePreview.credit.projected_debt_vnd.toLocaleString('vi-VN')} đ</strong>
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="md:col-span-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="md:col-span-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </div>
          )}

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !selectedCustomer || !selectedItem}
              className="px-5 py-2.5 rounded-xl bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 disabled:opacity-50"
            >
              {submitting ? 'Đang xuất FIFO & tạo đơn...' : 'Xác nhận Đơn Bán Sỉ B2B'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-3">
          Danh sách Đơn Hàng B2B &amp; Lát Cắt Lô FIFO ({orders.length} đơn)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Mã đơn</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Tổng tiền (VNĐ)</th>
                <th className="px-3 py-2 text-right">Đã trả (VNĐ)</th>
                <th className="px-3 py-2 text-right">Số dòng FIFO</th>
                <th className="px-3 py-2">Hạn thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((ord) => (
                <tr key={ord.id}>
                  <td className="px-3 py-2 font-mono text-xs font-bold">{ord.order_code}</td>
                  <td className="px-3 py-2 font-mono text-xs">{ord.payment_status}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {ord.total_amount_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">
                    {ord.paid_amount_vnd.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {ord.items?.length ?? 0}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{ord.due_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
