import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CopyPlus,
  Rocket,
  SlidersHorizontal,
  Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type {
  ClonableStoreType,
  CloneFranchiseStoreResultDTO,
  ClonedMenuProductPricePreviewDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  cloneFranchiseStoreApi,
  previewFranchisePricingApi,
} from '../../api/executiveAnalyticsApi';

export interface FranchiseStoreCloningWizardProps {
  onStoreCloned: (result: CloneFranchiseStoreResultDTO) => void;
}

export function FranchiseStoreCloningWizard({
  onStoreCloned,
}: FranchiseStoreCloningWizardProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState<string>('STORE-05-DALAT');
  const [name, setName] = useState<string>('CF19 Nhượng Quyền Đà Lạt Center');
  const [storeType, setStoreType] = useState<ClonableStoreType>('FRANCHISE_STORE');
  const [address, setAddress] = useState<string>('22 Hòa Bình, Phường 1, TP. Đà Lạt');
  const [phone, setPhone] = useState<string>('02633888105');
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1.15);
  const [openingCashVnd, setOpeningCashVnd] = useState<string>('2500000');
  const [createStarterTransfer, setCreateStarterTransfer] = useState<boolean>(true);
  const [starterCoffeeQtyG, setStarterCoffeeQtyG] = useState<string>('10000');

  const [pricingPreview, setPricingPreview] = useState<ClonedMenuProductPricePreviewDTO[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [clonedResult, setClonedResult] = useState<CloneFranchiseStoreResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void previewFranchisePricingApi(priceMultiplier)
      .then((data) => {
        if (active) setPricingPreview(data);
      })
      .catch(() => {
        if (active) setPricingPreview([]);
      });

    return () => {
      active = false;
    };
  }, [priceMultiplier]);

  const handleCloneStore = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await cloneFranchiseStoreApi({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type: storeType,
        address: address.trim(),
        phone: phone.trim() || undefined,
        price_multiplier: priceMultiplier,
        opening_cash_vnd: Math.max(0, Math.round(Number(openingCashVnd) || 2000000)),
        create_starter_transfer: createStarterTransfer,
        starter_coffee_qty_g: Math.max(1000, Number(starterCoffeeQtyG) || 10000),
      });
      setClonedResult(res);
      onStoreCloned(res);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể nhân bản chi nhánh mới.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <CopyPlus className="w-5 h-5 text-indigo-700" />
        <div>
          <h3 className="font-bold text-base text-stone-900">
            Nhân Bản Chi Nhánh / Nhượng Quyền 1-Click
          </h3>
          <p className="text-xs text-stone-500">
            Khởi tạo điểm bán mới, áp dụng hệ số giá vùng, mở ca khai trương và tự động tạo phiếu xin cấp hàng Kho Tổng
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {clonedResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-3">
          <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Đã khởi tạo thành công {clonedResult.store.code} — {clonedResult.store.name} ({clonedResult.store.price_multiplier.toFixed(2)}x)
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[11px]">
              {clonedResult.starter_transfer ? (
                <span className="inline-flex items-center gap-1 text-indigo-800 font-bold">
                  <Truck className="w-3.5 h-3.5" />
                  Phiếu cấp hàng khai trương: {clonedResult.starter_transfer.transfer_code} (
                  {clonedResult.starter_transfer.total_internal_value_vnd.toLocaleString('vi-VN')} đ)
                </span>
              ) : (
                'Đã mở ca khai trương sẵn sàng bán hàng.'
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/store/${clonedResult.store.id}/manage`)}
                className="px-3 py-1.5 rounded-lg bg-amber-800 text-white font-semibold hover:bg-amber-900"
              >
                Mở Quản lý Quán
              </button>
              <button
                type="button"
                onClick={() => navigate(`/store/${clonedResult.store.id}/pos`)}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
              >
                Mở POS Quầy
              </button>
              <button
                type="button"
                onClick={() => navigate(`/store/${clonedResult.store.id}/kds`)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-amber-300 font-semibold hover:bg-stone-800"
              >
                Mở KDS Bar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Mã chi nhánh</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Mô hình vận hành</span>
              <select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value as ClonableStoreType)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 bg-white"
              >
                <option value="FRANCHISE_STORE">Quán Nhượng Quyền</option>
                <option value="RETAIL_STORE">Quán Tự Sở Hữu</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="font-semibold text-stone-700">Tên chi nhánh</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="sm:col-span-2 space-y-1 block">
              <span className="font-semibold text-stone-700">Địa chỉ mặt bằng</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">SĐT hotline</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono"
              />
            </label>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-950">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-700" />
                <span>Hệ số giá vùng</span>
              </span>
              <span className="font-mono text-base text-indigo-800">
                {priceMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={priceMultiplier}
              onChange={(e) => setPriceMultiplier(Number(e.target.value))}
              className="w-full accent-indigo-700"
            />
            <div className="flex justify-between text-[10px] font-mono text-indigo-700">
              <span>0.50x</span>
              <span>1.00x (Chuẩn)</span>
              <span>1.15x–1.50x (Thành phố/Du lịch)</span>
              <span>2.00x</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Quỹ tiền đầu ca khai trương (VNĐ)</span>
              <input
                type="number"
                min={0}
                step={100000}
                value={openingCashVnd}
                onChange={(e) => setOpeningCashVnd(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono"
              />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Cà phê hạt khai trương (gram)</span>
              <input
                type="number"
                min={1000}
                step={1000}
                disabled={!createStarterTransfer}
                value={starterCoffeeQtyG}
                onChange={(e) => setStarterCoffeeQtyG(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono disabled:opacity-40"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-stone-700 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={createStarterTransfer}
              onChange={(e) => setCreateStarterTransfer(e.target.checked)}
              className="rounded border-stone-400"
            />
            <span>
              Tự động tạo Phiếu xin cấp cà phê khai trương từ Kho Tổng
            </span>
          </label>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleCloneStore()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-700 text-white font-bold text-xs hover:bg-indigo-800 disabled:opacity-40"
          >
            <Rocket className="w-4 h-4" />
            Khởi Tạo Chi Nhánh Mới &amp; Đồng Bộ Thực Đơn BOM
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="text-xs font-bold text-stone-800">
            Xem trước Bảng Giá Thực Đơn &amp; Biên Lợi Nhuận BOM ({priceMultiplier.toFixed(2)}x)
          </div>
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-100 text-stone-600 uppercase">
                <tr>
                  <th className="px-3 py-2">Món uống</th>
                  <th className="px-3 py-2 text-right">Giá gốc</th>
                  <th className="px-3 py-2 text-right">Giá mới</th>
                  <th className="px-3 py-2 text-right">BOM COGS</th>
                  <th className="px-3 py-2 text-right">Biên gộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pricingPreview.map((item) => (
                  <tr key={item.product_id}>
                    <td className="px-3 py-2 font-medium text-stone-900">
                      {item.product_name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-500">
                      {item.master_base_price_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-indigo-800">
                      {item.cloned_base_price_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-600">
                      {item.default_variant_bom_cogs_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {item.estimated_gross_margin_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
