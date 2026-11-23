import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Flame, ShieldAlert } from 'lucide-react';
import {
  SEED_IDS,
  calculateRoastYieldLossPct,
  calculateRoastedOutputUnitCostVnd,
  compareFifoLots,
  isAbnormalRoastYieldLoss,
  type RoastBatchDto,
  type WarehouseLotFullDto,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { completeRoastBatchApi } from '../../api/warehouseApi';

export interface RoasteryBatchLifecyclePanelProps {
  stockSummaries: WarehouseStockSummaryDTO[];
  lots: WarehouseLotFullDto[];
  roastBatches: RoastBatchDto[];
  onMutated: () => Promise<void>;
}

export function RoasteryBatchLifecyclePanel({
  stockSummaries,
  lots,
  roastBatches,
  onMutated,
}: RoasteryBatchLifecyclePanelProps) {
  const greenItemIds = useMemo(
    () =>
      new Set(
        stockSummaries
          .filter((s) => s.category === 'GREEN_BEAN')
          .map((s) => s.item_id),
      ),
    [stockSummaries],
  );

  const availableGreenLots = useMemo(
    () =>
      lots
        .filter(
          (l) =>
            greenItemIds.has(l.item_id) &&
            l.status === 'AVAILABLE' &&
            l.remaining_qty > 0,
        )
        .sort(compareFifoLots),
    [lots, greenItemIds],
  );

  const roastedItems = useMemo(
    () => stockSummaries.filter((s) => s.category === 'ROASTED_COFFEE'),
    [stockSummaries],
  );

  const [sourceGreenLotId, setSourceGreenLotId] = useState<string>(
    availableGreenLots[0]?.id ?? SEED_IDS.warehouseLots.cwGreenRobusta01,
  );
  const [outputItemId, setOutputItemId] = useState<string>(
    roastedItems[0]?.item_id ?? SEED_IDS.inventoryItems.roastedRobustaMed,
  );
  const [batchCode, setBatchCode] = useState<string>(
    `RB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-3)}`,
  );
  const [outputLotCode, setOutputLotCode] = useState<string>(
    `LOT-CW-RC-${Date.now().toString().slice(-4)}`,
  );
  const [greenInputG, setGreenInputG] = useState<number>(20000);
  const [roastedOutputG, setRoastedOutputG] = useState<number>(16600);
  const [roastProfile, setRoastProfile] = useState<string>('Medium Full City 212C');
  const [enforceFifo, setEnforceFifo] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedSourceLot = useMemo(
    () => availableGreenLots.find((l) => l.id === sourceGreenLotId),
    [availableGreenLots, sourceGreenLotId],
  );

  const fifoWarningLot = useMemo(() => {
    if (!selectedSourceLot) return null;
    const oldestForItem = availableGreenLots.find(
      (l) => l.item_id === selectedSourceLot.item_id,
    );
    if (oldestForItem && oldestForItem.id !== selectedSourceLot.id) {
      return oldestForItem;
    }
    return null;
  }, [availableGreenLots, selectedSourceLot]);

  const preview = useMemo(() => {
    if (greenInputG <= 0 || roastedOutputG <= 0 || roastedOutputG > greenInputG) {
      return null;
    }
    const lossPct = calculateRoastYieldLossPct(greenInputG, roastedOutputG);
    const abnormal = isAbnormalRoastYieldLoss(lossPct);
    const sourceCost = selectedSourceLot?.unit_cost_vnd ?? 95000;
    const outputUnitCostVnd = calculateRoastedOutputUnitCostVnd(
      greenInputG,
      sourceCost,
      roastedOutputG,
    );
    return { lossPct, abnormal, outputUnitCostVnd };
  }, [greenInputG, roastedOutputG, selectedSourceLot]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await completeRoastBatchApi({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        batch_code: batchCode.trim().toUpperCase(),
        source_green_lot_id: sourceGreenLotId,
        output_item_id: outputItemId,
        output_lot_code: outputLotCode.trim().toUpperCase(),
        green_input_weight_g: greenInputG,
        roasted_output_weight_g: roastedOutputG,
        roast_profile: roastProfile.trim() || undefined,
        enforce_fifo: enforceFifo,
      });
      setSuccessMsg(
        `Hoàn tất mẻ rang ${res.roast_batch.batch_code}: Hao hụt ${res.weight_loss_pct}% | Giá vốn hạt rang ${res.output_unit_cost_vnd.toLocaleString('vi-VN')} đ/kg`,
      );
      const suffix = Date.now().toString().slice(-4);
      setBatchCode(`RB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`);
      setOutputLotCode(`LOT-CW-RC-${suffix}`);
      await onMutated();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể hoàn tất mẻ rang.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-600" />
          <h2 className="font-bold text-base">
            Kết Chuyển Mẻ Rang Xay (Khóa FIFO Nhân Xanh, Hao Hụt &amp; Giá Vốn Thành Phẩm)
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Lô Nhân Xanh nguồn
            </label>
            <select
              value={sourceGreenLotId}
              onChange={(e) => setSourceGreenLotId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {availableGreenLots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code} (Còn {lot.remaining_qty.toLocaleString('vi-VN')}g)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Thành phẩm Hạt Rang đích
            </label>
            <select
              value={outputItemId}
              onChange={(e) => setOutputItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {roastedItems.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã mẻ rang
            </label>
            <input
              type="text"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã lô hạt rang đầu ra
            </label>
            <input
              type="text"
              value={outputLotCode}
              onChange={(e) => setOutputLotCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nhân xanh đầu vào (gram)
            </label>
            <input
              type="number"
              min={1}
              value={greenInputG}
              onChange={(e) => setGreenInputG(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Hạt rang thành phẩm thu được (gram)
            </label>
            <input
              type="number"
              min={1}
              value={roastedOutputG}
              onChange={(e) => setRoastedOutputG(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Hồ sơ rang (Roast Profile)
            </label>
            <input
              type="text"
              value={roastProfile}
              onChange={(e) => setRoastProfile(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 pb-2">
              <input
                type="checkbox"
                checked={enforceFifo}
                onChange={(e) => setEnforceFifo(e.target.checked)}
                className="rounded border-stone-300"
              />
              Bắt buộc rang lô nhân xanh nhập trước (FIFO)
            </label>
          </div>

          {fifoWarningLot && enforceFifo && (
            <div className="md:col-span-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                Cảnh báo FIFO: Lô nhân xanh cũ hơn{' '}
                <strong className="font-mono">{fifoWarningLot.lot_code}</strong> vẫn còn tồn và cần được xuất rang trước.
              </span>
            </div>
          )}

          {preview && (
            <div
              className={`md:col-span-3 p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-4 ${
                preview.abnormal
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {preview.abnormal ? (
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                )}
                <span>
                  {preview.abnormal
                    ? 'Cảnh báo hao hụt bất thường (Ngoài chuẩn 12.00% – 20.00%)'
                    : 'Tỷ lệ hao hụt nằm trong định mức chuẩn [12% – 20%]'}
                </span>
              </div>
              <div className="font-mono flex gap-6">
                <span>
                  Hao hụt: <strong>{preview.lossPct.toFixed(2)}%</strong>
                </span>
                <span>
                  Giá vốn hạt rang:{' '}
                  <strong>{preview.outputUnitCostVnd.toLocaleString('vi-VN')} đ/kg</strong>
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
            <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? 'Đang kết chuyển mẻ rang...' : 'Hoàn tất Mẻ Rang & Sinh Lô FIFO'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-bold text-base mb-3">
          Lịch sử Mẻ Rang Xay ({roastBatches.length} mẻ)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Mã mẻ</th>
                <th className="px-3 py-2 text-right">Nhân xanh (g)</th>
                <th className="px-3 py-2 text-right">Hạt rang (g)</th>
                <th className="px-3 py-2 text-right">Hao hụt (%)</th>
                <th className="px-3 py-2">Hồ sơ rang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {roastBatches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {batch.batch_code}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {batch.green_input_weight_g.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {batch.roasted_output_weight_g.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    <span
                      className={
                        isAbnormalRoastYieldLoss(batch.weight_loss_pct)
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }
                    >
                      {batch.weight_loss_pct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-600">
                    {batch.roast_profile ?? '—'}
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
