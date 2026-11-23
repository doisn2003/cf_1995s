import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  PackagePlus,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  SEED_IDS,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  type WarehouseLotFullDto,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  ingestWarehouseLotApi,
  updateWarehouseLotStatusApi,
} from '../../api/warehouseApi';

export interface LotIngestMacPanelProps {
  stockSummaries: WarehouseStockSummaryDTO[];
  lots: WarehouseLotFullDto[];
  onMutated: () => Promise<void>;
}

export function LotIngestMacPanel({
  stockSummaries,
  lots,
  onMutated,
}: LotIngestMacPanelProps) {
  const defaultItemId =
    stockSummaries[0]?.item_id ?? SEED_IDS.inventoryItems.greenRobustaDakLak;
  const [itemId, setItemId] = useState<string>(defaultItemId);
  const [lotCode, setLotCode] = useState<string>(
    `LOT-CW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-01`,
  );
  const [supplierName, setSupplierName] = useState<string>('HTX Nông Sản Đắk Lắk');
  const [initialQty, setInitialQty] = useState<number>(30000);
  const [unitCostVnd, setUnitCostVnd] = useState<number>(102000);
  const [shippingCostVnd, setShippingCostVnd] = useState<number>(150000);
  const [moisturePct, setMoisturePct] = useState<number>(12.0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [busyLotId, setBusyLotId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => stockSummaries.find((s) => s.item_id === itemId),
    [stockSummaries, itemId],
  );

  const pricingUnitLabel =
    selectedSummary?.base_unit === 'g'
      ? 'kg'
      : selectedSummary?.base_unit === 'ml'
        ? 'lít'
        : 'cái';

  const macPreview = useMemo(() => {
    if (initialQty <= 0 || unitCostVnd < 0 || shippingCostVnd < 0) {
      return null;
    }
    const effectiveUnitCostVnd = calculateEffectiveLotUnitCostVnd(
      unitCostVnd,
      shippingCostVnd,
      initialQty,
      selectedSummary?.base_unit ?? 'g',
    );
    const oldQty = selectedSummary?.total_available_qty ?? 0;
    const oldMac = selectedSummary?.moving_avg_cost_vnd ?? 0;
    const projectedNewMacVnd = calculateMovingAverageCostVnd(
      oldQty,
      oldMac,
      initialQty,
      effectiveUnitCostVnd,
    );
    return { effectiveUnitCostVnd, projectedNewMacVnd, oldQty, oldMac };
  }, [initialQty, unitCostVnd, shippingCostVnd, selectedSummary]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await ingestWarehouseLotApi({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: itemId,
        lot_code: lotCode.trim().toUpperCase(),
        supplier_name: supplierName.trim() || undefined,
        moisture_pct: moisturePct,
        initial_qty: initialQty,
        unit_cost_vnd: Math.round(unitCostVnd),
        shipping_cost_vnd: Math.round(shippingCostVnd),
      });
      setSuccessMsg(
        `Đã nhập lô ${res.lot.lot_code}: Giá vốn thực tế ${res.effective_unit_cost_vnd.toLocaleString('vi-VN')} đ/${pricingUnitLabel} → MAC mới ${res.new_mac_vnd.toLocaleString('vi-VN')} đ/${pricingUnitLabel}`,
      );
      setLotCode(`LOT-CW-${Date.now().toString().slice(-5)}`);
      await onMutated();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể nhập lô hàng.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLotStatus = async (
    lot: WarehouseLotFullDto,
    nextStatus: 'EXPIRED' | 'AVAILABLE',
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyLotId(lot.id);
    try {
      await updateWarehouseLotStatusApi(lot.id, {
        status: nextStatus,
        reason:
          nextStatus === 'EXPIRED'
            ? 'Đánh dấu lô quá hạn / loại khỏi FIFO xuất kho'
            : 'Khôi phục trạng thái khả dụng cho lô hàng',
      });
      setSuccessMsg(`Đã chuyển trạng thái lô ${lot.lot_code} sang ${nextStatus}.`);
      await onMutated();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Cập nhật trạng thái lô thất bại.');
    } finally {
      setBusyLotId(null);
    }
  };

  const itemById = useMemo(() => {
    const m = new Map<string, WarehouseStockSummaryDTO>();
    for (const s of stockSummaries) m.set(s.item_id, s);
    return m;
  }, [stockSummaries]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-4">
          Tổng hợp Tồn Kho Tổng, Giá Vốn MAC &amp; Lô Ưu Tiên FIFO Kế Tiếp
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Tên mặt hàng</th>
                <th className="px-3 py-2.5 text-right">Tồn khả dụng</th>
                <th className="px-3 py-2.5 text-right">Giá vốn MAC</th>
                <th className="px-3 py-2.5">Lô FIFO kế tiếp</th>
                <th className="px-3 py-2.5">Cảnh báo tồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stockSummaries.map((row) => {
                const nextFifoLot = lots.find(
                  (l) =>
                    l.item_id === row.item_id &&
                    l.status === 'AVAILABLE' &&
                    l.remaining_qty > 0,
                );
                const unitLbl =
                  row.base_unit === 'g' ? 'kg' : row.base_unit === 'ml' ? 'lít' : 'cái';
                return (
                  <tr key={row.item_id}>
                    <td className="px-3 py-2.5 font-mono text-xs">{row.sku}</td>
                    <td className="px-3 py-2.5 font-medium">{row.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.total_available_qty.toLocaleString('vi-VN')} {row.base_unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {row.moving_avg_cost_vnd.toLocaleString('vi-VN')} đ/{unitLbl}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-amber-800">
                      {nextFifoLot?.lot_code ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Dưới ngưỡng ({row.min_stock_threshold.toLocaleString('vi-VN')})
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          An toàn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PackagePlus className="w-5 h-5 text-amber-700" />
          <h2 className="font-bold text-base">
            Nhập Lô Hàng Tây Nguyên &amp; Tính Toán Giá Vốn Bình Quân (MAC)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mặt hàng nhập kho
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {stockSummaries.map((s) => (
                <option key={s.item_id} value={s.item_id}>
                  {s.sku} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã Lô hàng
            </label>
            <input
              type="text"
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nhà cung cấp / Nông hộ
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số lượng nhập ({selectedSummary?.base_unit ?? 'g'})
            </label>
            <input
              type="number"
              min={1}
              step="1"
              value={initialQty}
              onChange={(e) => setInitialQty(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Đơn giá nhập gốc (VNĐ / {pricingUnitLabel})
            </label>
            <input
              type="number"
              min={0}
              step="1000"
              value={unitCostVnd}
              onChange={(e) => setUnitCostVnd(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cước vận chuyển (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step="1000"
                value={shippingCostVnd}
                onChange={(e) => setShippingCostVnd(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Độ ẩm (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={moisturePct}
                onChange={(e) => setMoisturePct(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {macPreview && (
            <div className="md:col-span-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Dự tính Giá Vốn Thực Tế (Đã phân bổ cước theo {pricingUnitLabel}):</span>
              </div>
              <div className="flex flex-wrap gap-6 font-mono">
                <span>
                  Đơn giá lô:{' '}
                  <strong className="text-emerald-800">
                    {macPreview.effectiveUnitCostVnd.toLocaleString('vi-VN')} đ/{pricingUnitLabel}
                  </strong>
                </span>
                <span>
                  MAC hiện tại: {macPreview.oldMac.toLocaleString('vi-VN')} đ → MAC mới:{' '}
                  <strong className="text-emerald-900">
                    {macPreview.projectedNewMacVnd.toLocaleString('vi-VN')} đ/{pricingUnitLabel}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-800 text-white text-sm font-semibold hover:bg-amber-900 disabled:opacity-50"
            >
              {submitting ? 'Đang nhập kho...' : 'Ghi nhận Lô nhập & Cập nhật MAC'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-3">
          Danh sách Toàn bộ Lô Hàng Kho Tổng (Sắp xếp FIFO chuẩn)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Mã Lô / Mặt hàng</th>
                <th className="px-3 py-2">Ngày rang</th>
                <th className="px-3 py-2 text-right">Còn lại / Ban đầu</th>
                <th className="px-3 py-2 text-right">Đơn giá vốn (VNĐ)</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Quản trị lô</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lots.map((lot) => {
                const itemMeta = itemById.get(lot.item_id);
                return (
                  <tr key={lot.id}>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs font-semibold text-stone-900">
                        {lot.lot_code}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {itemMeta ? `${itemMeta.sku} — ${itemMeta.name}` : lot.supplier_name ?? ''}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {lot.roast_date ?? 'Nguyên liệu thô'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {lot.remaining_qty.toLocaleString('vi-VN')} /{' '}
                      {lot.initial_qty.toLocaleString('vi-VN')} {itemMeta?.base_unit ?? ''}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {lot.unit_cost_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          lot.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lot.status === 'EXPIRED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {lot.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {lot.status === 'AVAILABLE' && lot.remaining_qty > 0 && (
                        <button
                          type="button"
                          disabled={busyLotId === lot.id}
                          onClick={() => void handleToggleLotStatus(lot, 'EXPIRED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold disabled:opacity-50"
                        >
                          <Ban className="w-3 h-3" />
                          Hết hạn
                        </button>
                      )}
                      {lot.status === 'EXPIRED' && lot.remaining_qty > 0 && (
                        <button
                          type="button"
                          disabled={busyLotId === lot.id}
                          onClick={() => void handleToggleLotStatus(lot, 'AVAILABLE')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-semibold disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Khôi phục
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
