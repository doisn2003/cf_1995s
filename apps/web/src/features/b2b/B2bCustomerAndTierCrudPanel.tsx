import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import {
  SEED_IDS,
  type B2bCustomerDto,
  type B2bPriceTier,
  type WarehouseInventoryItemDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  createB2bCustomerApi,
  createB2cRetailOrderApi,
  deleteB2bPriceTierApi,
  updateB2bCustomerApi,
  upsertB2bPriceTierApi,
  type LiveB2bOverviewDTO,
} from '../../api/b2bAndTransferApi';

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} đ`;
}

export interface B2bCustomerAndTierCrudPanelProps {
  overview: LiveB2bOverviewDTO;
  inventoryItems: WarehouseInventoryItemDto[];
  onRefresh: () => Promise<void>;
}

export function B2bCustomerAndTierCrudPanel({
  overview,
  inventoryItems,
  onRefresh,
}: B2bCustomerAndTierCrudPanelProps) {
  const [section, setSection] = useState<'b2c' | 'customers' | 'tiers'>('b2c');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // B2C Retail coffee sale at Central Warehouse
  const roastedItems = inventoryItems.filter(
    (i) => i.category === 'ROASTED_COFFEE' && i.is_active,
  );
  const [retailCustomerName, setRetailCustomerName] = useState<string>('Khách lẻ tại Kho');
  const [retailCustomerPhone, setRetailCustomerPhone] = useState<string>('');
  const [retailPaymentMethod, setRetailPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [retailItemId, setRetailItemId] = useState<string>(roastedItems[0]?.id ?? '');
  const [retailKg, setRetailKg] = useState<string>('2');
  const [retailNotes, setRetailNotes] = useState<string>('');

  // B2B Customer CRUD
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [custCode, setCustCode] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custShopName, setCustShopName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custTier, setCustTier] = useState<B2bPriceTier>('TIER_2');
  const [custCreditLimit, setCustCreditLimit] = useState<string>('20000000');
  const [custTermDays, setCustTermDays] = useState<string>('15');
  const [custActive, setCustActive] = useState<boolean>(true);

  // B2B Price Tier CRUD
  const [tierItemId, setTierItemId] = useState<string>(roastedItems[0]?.id ?? '');
  const [tierCode, setTierCode] = useState<B2bPriceTier>('TIER_2');
  const [tierMinKg, setTierMinKg] = useState<string>('10');
  const [tierUnitPrice, setTierUnitPrice] = useState<string>('175000');

  const selectedRetailItem =
    roastedItems.find((i) => i.id === retailItemId) ?? roastedItems[0];
  const estimatedRetailTotal =
    selectedRetailItem && Number(retailKg) > 0
      ? Math.round(Number(retailKg) * selectedRetailItem.retail_price_vnd)
      : 0;

  const handleCreateB2cOrder = async (e: FormEvent) => {
    e.preventDefault();
    const targetItem = selectedRetailItem;
    if (!targetItem) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const order = await createB2cRetailOrderApi({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        retail_customer_name: retailCustomerName.trim(),
        retail_customer_phone: retailCustomerPhone.trim() || undefined,
        payment_method: retailPaymentMethod,
        notes: retailNotes.trim() || undefined,
        items: [
          {
            item_id: targetItem.id,
            quantity_base_unit: Math.round(Number(retailKg) * 1000),
          },
        ],
      });
      setSuccessMsg(
        `Đã xuất bán lẻ ${order.order_code} (${retailKg} kg ${targetItem.name}) — Thu ngay ${formatVnd(order.total_amount_vnd)}!`,
      );
      setRetailNotes('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Tạo đơn bán lẻ B2C thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const resetCustomerForm = () => {
    setEditingCustomerId(null);
    setCustCode('');
    setCustName('');
    setCustShopName('');
    setCustPhone('');
    setCustAddress('');
    setCustTier('TIER_2');
    setCustCreditLimit('20000000');
    setCustTermDays('15');
    setCustActive(true);
  };

  const startEditCustomer = (c: B2bCustomerDto) => {
    setEditingCustomerId(c.id);
    setCustCode(c.code);
    setCustName(c.name);
    setCustShopName(c.shop_name ?? '');
    setCustPhone(c.phone);
    setCustAddress(c.address ?? '');
    setCustTier(c.price_tier);
    setCustCreditLimit(String(c.credit_limit_vnd));
    setCustTermDays(String(c.payment_term_days));
    setCustActive(c.is_active);
  };

  const handleSaveCustomer = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (editingCustomerId) {
        await updateB2bCustomerApi(editingCustomerId, {
          name: custName.trim(),
          shop_name: custShopName.trim() || custName.trim(),
          phone: custPhone.trim() || null,
          address: custAddress.trim() || null,
          price_tier: custTier,
          credit_limit_vnd: Math.round(Number(custCreditLimit)),
          payment_term_days: Math.round(Number(custTermDays)),
          is_active: custActive,
        });
        setSuccessMsg(`Đã cập nhật khách hàng sỉ ${custCode}.`);
      } else {
        await createB2bCustomerApi({
          code: custCode.trim().toUpperCase(),
          name: custName.trim(),
          shop_name: custShopName.trim() || custName.trim(),
          phone: custPhone.trim() || undefined,
          address: custAddress.trim() || undefined,
          price_tier: custTier,
          credit_limit_vnd: Math.round(Number(custCreditLimit)),
          payment_term_days: Math.round(Number(custTermDays)),
        });
        setSuccessMsg(`Đã tạo khách hàng sỉ B2B ${custCode.trim().toUpperCase()}.`);
      }
      resetCustomerForm();
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu khách sỉ B2B thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePriceTier = async (e: FormEvent) => {
    e.preventDefault();
    const itemId = tierItemId || roastedItems[0]?.id;
    if (!itemId) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      await upsertB2bPriceTierApi({
        item_id: itemId,
        price_tier: tierCode,
        min_qty_kg: Number(tierMinKg),
        unit_price_vnd: Math.round(Number(tierUnitPrice)),
        is_active: true,
      });
      setSuccessMsg('Đã lưu cấu hình giá bậc thang B2B.');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu bảng giá thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex flex-wrap rounded-xl bg-stone-200/70 p-1 gap-1">
        <button
          type="button"
          onClick={() => setSection('b2c')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
            section === 'b2c' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Bán lẻ B2C tại Kho ({overview.b2c_retail_orders.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('customers')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
            section === 'customers' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Khách sỉ B2B ({overview.customers.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('tiers')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
            section === 'tiers' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Bảng giá bậc thang ({overview.price_tiers.length})
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {section === 'b2c' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateB2cOrder}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit"
          >
            <h3 className="font-bold text-sm text-stone-900">
              Tạo Đơn Bán Lẻ Hạt/Bột (B2C)
            </h3>
            <p className="text-xs text-stone-500">
              Thu tiền ngay, tự động xuất FIFO từ Kho Tổng và ghi nhận vào Doanh thu Bán lẻ Kho (tách biệt B2B và nội bộ).
            </p>
            <input
              type="text"
              required
              value={retailCustomerName}
              onChange={(e) => setRetailCustomerName(e.target.value)}
              placeholder="Tên khách lẻ"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={retailCustomerPhone}
              onChange={(e) => setRetailCustomerPhone(e.target.value)}
              placeholder="Số điện thoại (tùy chọn)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <select
              value={selectedRetailItem?.id ?? ''}
              onChange={(e) => setRetailItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {roastedItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name} ({formatVnd(it.retail_price_vnd)}/kg)
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={retailKg}
                  onChange={(e) => setRetailKg(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Thanh toán
                </label>
                <select
                  value={retailPaymentMethod}
                  onChange={(e) =>
                    setRetailPaymentMethod(e.target.value as 'CASH' | 'VIETQR')
                  }
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="VIETQR">Chuyển khoản VietQR</option>
                </select>
              </div>
            </div>
            <input
              type="text"
              value={retailNotes}
              onChange={(e) => setRetailNotes(e.target.value)}
              placeholder="Ghi chú (VD: Xay pha phin)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">Thành tiền thu ngay</span>
              <span className="text-base font-bold font-mono text-amber-900">
                {formatVnd(estimatedRetailTotal)}
              </span>
            </div>
            <button
              type="submit"
              disabled={saving || !selectedRetailItem}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Xuất kho &amp; Thu tiền B2C
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-200 font-bold text-sm text-stone-900">
              Lịch sử Đơn Bán Lẻ B2C tại Kho Tổng
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-2.5">Mã đơn</th>
                    <th className="px-4 py-2.5">Khách lẻ</th>
                    <th className="px-4 py-2.5">Thanh toán</th>
                    <th className="px-4 py-2.5 text-right">Doanh thu</th>
                    <th className="px-4 py-2.5 text-right">Giá vốn FIFO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {overview.b2c_retail_orders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="px-4 py-3 font-mono font-semibold text-stone-900">
                        {ord.order_code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">
                          {ord.retail_customer_name ?? 'Khách lẻ'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {ord.retail_customer_phone ?? ord.notes ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">{ord.payment_method}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                        {formatVnd(ord.total_amount_vnd)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-stone-600">
                        {formatVnd(ord.cogs_amount_vnd)}
                      </td>
                    </tr>
                  ))}
                  {overview.b2c_retail_orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                        Chưa có đơn bán lẻ B2C nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900">
                {editingCustomerId ? `Sửa khách sỉ ${custCode}` : 'Thêm Khách sỉ B2B mới'}
              </h3>
              {editingCustomerId && (
                <button
                  type="button"
                  onClick={resetCustomerForm}
                  className="text-xs text-stone-500 underline"
                >
                  Hủy
                </button>
              )}
            </div>
            <input
              type="text"
              required
              disabled={Boolean(editingCustomerId)}
              value={custCode}
              onChange={(e) => setCustCode(e.target.value)}
              placeholder="Mã KH (VD: B2B-003)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase disabled:bg-stone-100"
            />
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Tên người đại diện"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={custShopName}
              onChange={(e) => setCustShopName(e.target.value)}
              placeholder="Tên quán / đại lý"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
              placeholder="Địa chỉ giao hàng"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={custTier}
                onChange={(e) => setCustTier(e.target.value as B2bPriceTier)}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="TIER_1">TIER_1 (Đại lý lớn)</option>
                <option value="TIER_2">TIER_2 (Quán đối tác)</option>
                <option value="TIER_3">TIER_3 (Mua lẻ sỉ)</option>
              </select>
              <input
                type="number"
                min={0}
                value={custTermDays}
                onChange={(e) => setCustTermDays(e.target.value)}
                placeholder="Hạn nợ (ngày)"
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hạn mức công nợ tối đa (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step={1000000}
                required
                value={custCreditLimit}
                onChange={(e) => setCustCreditLimit(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold"
            >
              {editingCustomerId ? 'Lưu cập nhật' : 'Tạo khách sỉ B2B'}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2.5">Khách hàng / Đại lý</th>
                  <th className="px-4 py-2.5">Hạng</th>
                  <th className="px-4 py-2.5 text-right">Hạn mức nợ</th>
                  <th className="px-4 py-2.5 text-right">Đang nợ</th>
                  <th className="px-4 py-2.5 text-right">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {overview.customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">
                        {c.code} — {c.shop_name || c.name}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {c.name} • {c.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">{c.price_tier}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatVnd(c.credit_limit_vnd)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-700">
                      {formatVnd(c.current_debt_vnd)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEditCustomer(c)}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'tiers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSavePriceTier}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit"
          >
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-700" />
              Cấu hình Bậc giá Sỉ theo Sản lượng (kg)
            </h3>
            <select
              value={tierItemId || roastedItems[0]?.id || ''}
              onChange={(e) => setTierItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {roastedItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.sku} — {it.name}
                </option>
              ))}
            </select>
            <select
              value={tierCode}
              onChange={(e) => setTierCode(e.target.value as B2bPriceTier)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              <option value="TIER_1">TIER_1</option>
              <option value="TIER_2">TIER_2</option>
              <option value="TIER_3">TIER_3</option>
            </select>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Sản lượng tối thiểu (kg)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={tierMinKg}
                onChange={(e) => setTierMinKg(e.target.value)}
                placeholder="Từ (kg)"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              type="number"
              step="1000"
              min="1000"
              required
              value={tierUnitPrice}
              onChange={(e) => setTierUnitPrice(e.target.value)}
              placeholder="Đơn giá VNĐ/kg"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold"
            >
              Lưu Bậc giá
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2.5">Sản phẩm</th>
                  <th className="px-4 py-2.5">Hạng</th>
                  <th className="px-4 py-2.5">Ngưỡng sản lượng</th>
                  <th className="px-4 py-2.5 text-right">Đơn giá / kg</th>
                  <th className="px-4 py-2.5 text-right">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {overview.price_tiers.map((pt) => {
                  const inv = inventoryItems.find((i) => i.id === pt.item_id);
                  return (
                    <tr key={pt.id}>
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {inv ? `${inv.sku} — ${inv.name}` : pt.item_id}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{pt.price_tier}</td>
                      <td className="px-4 py-3 font-mono">
                        Từ {pt.min_qty_kg} kg trở lên
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-900">
                        {formatVnd(pt.unit_price_vnd)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteB2bPriceTierApi(pt.id);
                            await onRefresh();
                          }}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          title="Xóa bậc giá"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
