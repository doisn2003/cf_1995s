import { useState } from 'react';
import { Layers, Play, ShieldCheck } from 'lucide-react';
import {
  SEED_IDS,
  type FifoAllocationResultDTO,
  type WarehouseStockSummaryDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { allocateFifoStockApi } from '../../api/warehouseApi';

export interface FifoAllocationWorkbenchProps {
  stockSummaries: WarehouseStockSummaryDTO[];
  onMutated: () => Promise<void>;
}

export function FifoAllocationWorkbench({
  stockSummaries,
  onMutated,
}: FifoAllocationWorkbenchProps) {
  const [itemId, setItemId] = useState<string>(
    stockSummaries.find((s) => s.item_id === SEED_IDS.inventoryItems.roastedRobustaMed)?.item_id ??
      stockSummaries[0]?.item_id ??
      SEED_IDS.inventoryItems.roastedRobustaMed,
  );
  const [requestedQty, setRequestedQty] = useState<number>(10000);
  const [referenceCode, setReferenceCode] = useState<string>('FIFO-OUT-01');
  const [loading, setLoading] = useState<boolean>(false);
  const [lastDryRun, setLastDryRun] = useState<boolean>(true);
  const [result, setResult] = useState<FifoAllocationResultDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAllocation = async (dryRun: boolean) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await allocateFifoStockApi({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        item_id: itemId,
        requested_qty: requestedQty,
        reference_code: referenceCode.trim() || undefined,
        reason: dryRun ? 'Mô phỏng phân bổ lô FIFO' : 'Xuất kho FIFO thực tế',
        dry_run: dryRun,
      });
      setResult(res);
      setLastDryRun(dryRun);
      if (!dryRun) {
        await onMutated();
      }
    } catch (err) {
      setResult(null);
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể phân bổ FIFO.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-base">
            Phân Bổ &amp; Xuất Kho Đa Lô FIFO (Mô phỏng trước khi Xuất thực tế)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mặt hàng xuất kho FIFO
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {stockSummaries.map((s) => (
                <option key={s.item_id} value={s.item_id}>
                  {s.sku} — Tồn: {s.total_available_qty.toLocaleString('vi-VN')} {s.base_unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số lượng yêu cầu xuất (đơn vị cơ sở)
            </label>
            <input
              type="number"
              min={1}
              value={requestedQty}
              onChange={(e) => setRequestedQty(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mã phiếu tham chiếu
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAllocation(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-sm font-semibold hover:bg-indigo-100 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Xem trước Phân bổ FIFO
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAllocation(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            Xác nhận Trừ Kho Thực Tế
          </button>
        </div>
      </section>

      {result && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-base">
              Kết quả Phân bổ Đa Lô FIFO ({lastDryRun ? 'XEM TRƯỚC' : 'ĐÃ TRỪ KHO'})
            </h3>
            <div className="text-xs font-mono space-x-4">
              <span>
                Tổng xuất: <strong>{result.total_allocated_qty.toLocaleString('vi-VN')}</strong>
              </span>
              <span>
                Tổng giá vốn:{' '}
                <strong className="text-emerald-700">
                  {result.total_cogs_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </span>
              <span>
                Đơn giá bình quân:{' '}
                <strong className="text-indigo-700">
                  {result.weighted_unit_cost_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Lô FIFO</th>
                  <th className="px-3 py-2">Ngày rang</th>
                  <th className="px-3 py-2 text-right">Lượng cắt</th>
                  <th className="px-3 py-2 text-right">Còn lại sau cắt</th>
                  <th className="px-3 py-2 text-right">Đơn giá lô (VNĐ)</th>
                  <th className="px-3 py-2 text-right">Giá vốn lát cắt (VNĐ)</th>
                  <th className="px-3 py-2">Trạng thái sau cắt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {result.allocations.map((slice) => (
                  <tr key={slice.lot_id}>
                    <td className="px-3 py-2 font-mono text-xs font-semibold">
                      {slice.lot_code}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {slice.roast_date ?? 'Nguyên liệu thô'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold">
                      {slice.allocated_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {slice.remaining_after_qty.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {slice.unit_cost_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {slice.slice_cogs_vnd.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span
                        className={
                          slice.lot_status_after === 'DEPLETED'
                            ? 'text-red-600 font-bold'
                            : 'text-emerald-700 font-semibold'
                        }
                      >
                        {slice.lot_status_after}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
