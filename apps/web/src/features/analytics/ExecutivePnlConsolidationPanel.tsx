import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  BarChart3,
  Boxes,
  Building2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EnterpriseConsolidatedPnlDTO } from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import { fetchExecutivePnlConsolidationApi } from '../../api/executiveAnalyticsApi';

export interface ExecutivePnlConsolidationPanelProps {
  refreshSignal: number;
}

export function ExecutivePnlConsolidationPanel({
  refreshSignal,
}: ExecutivePnlConsolidationPanelProps) {
  const navigate = useNavigate();
  const [report, setReport] = useState<EnterpriseConsolidatedPnlDTO | null>(null);
  const [warehouseOpexInput, setWarehouseOpexInput] = useState<string>('4000000');
  const [royaltyPctInput, setRoyaltyPctInput] = useState<string>('5');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPnl = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const parsedOpex = Math.max(0, Math.round(Number(warehouseOpexInput) || 0));
    const parsedRoyalty = Math.min(50, Math.max(0, Number(royaltyPctInput) || 5));

    try {
      const data = await fetchExecutivePnlConsolidationApi({
        warehouse_operating_expense_vnd: parsedOpex,
        franchise_royalty_pct: parsedRoyalty,
      });
      setReport(data);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể tải báo cáo Lãi - Lỗ Hợp nhất.',
      );
    } finally {
      setLoading(false);
    }
  }, [warehouseOpexInput, royaltyPctInput]);

  useEffect(() => {
    void loadPnl();
  }, [loadPnl, refreshSignal]);

  const consolidatedGross = useMemo(() => {
    if (!report) {
      return { profit: 0, marginPct: 0 };
    }
    const storeGrossTotal = report.stores.reduce(
      (sum, s) => sum + s.store_gross_profit_vnd,
      0,
    );
    const totalGrossProfit =
      report.warehouse.warehouse_total_gross_profit_vnd + storeGrossTotal;
    const marginPct =
      report.consolidated_external_revenue_vnd <= 0
        ? 0
        : Math.round(
            (totalGrossProfit / report.consolidated_external_revenue_vnd) *
              10000,
          ) / 100;
    return { profit: totalGrossProfit, marginPct };
  }, [report]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-amber-800" />
          <div>
            <h2 className="font-bold text-base text-stone-900">
              Báo Cáo Lãi - Lỗ Hợp Nhất Đa Thực Thể (Real-Time P&amp;L)
            </h2>
            <p className="text-xs text-stone-500">
              Tách biệt hoàn toàn Mảng Cung Ứng Kho Tổng Tây Nguyên vs. Chuỗi Cửa Hàng &amp; Loại trừ Chuyển kho Nội bộ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-stone-500">Chi phí Kho Tổng (đ):</span>
            <input
              type="number"
              min={0}
              step={100000}
              value={warehouseOpexInput}
              onChange={(e) => setWarehouseOpexInput(e.target.value)}
              className="w-28 rounded-xl border border-stone-300 px-2.5 py-1.5 font-mono"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-stone-500">Royalty Nhượng quyền (%):</span>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={royaltyPctInput}
              onChange={(e) => setRoyaltyPctInput(e.target.value)}
              className="w-20 rounded-xl border border-stone-300 px-2.5 py-1.5 font-mono"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadPnl()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-800 text-white font-semibold hover:bg-amber-900 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Tính Lại P&amp;L
          </button>
        </div>
      </section>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-1">
              <div className="text-xs text-stone-500 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Doanh Thu Ngoại Chuỗi Hợp Nhất</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-stone-900">
                {report.consolidated_external_revenue_vnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-stone-500">
                B2B/B2C ngoài + Bán nước POS ({report.stores.length} quán)
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-sm space-y-1">
              <div className="text-xs text-amber-900 font-semibold flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-amber-700" />
                <span>Loại Trừ Chuyển Kho Nội Bộ</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-amber-900">
                -{report.intercompany_eliminated_revenue_vnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-amber-800">
                Chống tính trùng doanh thu Kho Tổng ↔ Quán nhà
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-1">
              <div className="text-xs text-stone-500 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Lợi Nhuận Gộp Hợp Nhất</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-emerald-800">
                {consolidatedGross.profit.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] font-mono text-emerald-700">
                Biên gộp: {consolidatedGross.marginPct.toFixed(2)}%
              </div>
            </div>

            <div className="bg-emerald-950 text-white rounded-2xl border border-emerald-800 p-5 shadow-sm space-y-1">
              <div className="text-xs text-emerald-200 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <span>Lợi Nhuận Ròng Toàn Chuỗi</span>
              </div>
              <div className="font-mono font-extrabold text-xl text-emerald-300">
                {report.consolidated_net_profit_vnd.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] font-mono text-emerald-200">
                Biên ròng: {report.consolidated_net_margin_pct.toFixed(2)}% • Royalty: +
                {report.total_franchise_royalty_income_vnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-800" />
              <div>
                <h3 className="font-bold text-sm text-stone-900">
                  Khối 1 — Lãi Lỗ Mảng Cung Ứng Kho Tổng Tây Nguyên ({report.warehouse.warehouse_code})
                </h3>
                <p className="text-xs text-stone-500">
                  Đối chiếu giá vốn gốc Tây Nguyên cho bán sỉ B2B, bán lẻ B2C và cung ứng nội bộ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500">Doanh thu Sỉ B2B &amp; Lẻ B2C</div>
                <div className="font-mono font-bold text-sm text-stone-900">
                  {report.warehouse.b2b_external_revenue_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-stone-500">
                  Giá vốn gốc: {report.warehouse.b2b_raw_cogs_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="text-stone-500">Lãi gộp Bán ngoài Kho</div>
                <div className="font-mono font-bold text-sm text-emerald-700">
                  +{report.warehouse.b2b_external_gross_profit_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-stone-500">
                  {report.warehouse.b2b_orders_count} đơn ngoại chuỗi
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="text-amber-900">Chuyển kho Nội bộ (Đã đối soát)</div>
                <div className="font-mono font-bold text-sm text-amber-900">
                  {report.warehouse.internal_transfer_revenue_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-amber-800">
                  Chênh lệch nội bộ: +
                  {report.warehouse.internal_markup_profit_vnd.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="text-emerald-900">Lợi nhuận ròng Kho Tổng</div>
                <div className="font-mono font-extrabold text-sm text-emerald-800">
                  {report.warehouse.warehouse_net_profit_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] font-mono text-emerald-700">
                  Biên ròng Kho: {report.warehouse.warehouse_net_margin_pct.toFixed(2)}%
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-700" />
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Khối 2 — Ma Trận So Sánh &amp; Xếp Hạng Hiệu Quả Từng Chi Nhánh ({report.stores.length} điểm)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Xếp hạng tự động theo Lợi nhuận Ròng • Tích hợp chi phí lương ca, lệch két Đóng ca mù &amp; hao hụt BOM
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 text-stone-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Hạng</th>
                    <th className="px-3 py-2.5">Chi nhánh</th>
                    <th className="px-3 py-2.5 text-right">Doanh thu POS</th>
                    <th className="px-3 py-2.5 text-right">Giá vốn BOM</th>
                    <th className="px-3 py-2.5 text-right">Nhân sự</th>
                    <th className="px-3 py-2.5 text-right">Lệch két / Hao hụt</th>
                    <th className="px-3 py-2.5 text-right">Lợi nhuận ròng</th>
                    <th className="px-3 py-2.5 text-right">Truy cập nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {report.stores.map((st) => (
                    <tr key={st.store_id} className="hover:bg-stone-50">
                      <td className="px-3 py-2.5 font-mono font-extrabold text-amber-800">
                        #{st.rank ?? '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-stone-900">{st.store_name}</div>
                        <div className="text-[11px] font-mono text-stone-500">
                          {st.store_code} • {st.store_type} • {st.price_multiplier.toFixed(2)}x
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div className="font-bold text-stone-900">
                          {st.pos_gross_revenue_vnd.toLocaleString('vi-VN')}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          TM {st.cash_revenue_vnd.toLocaleString('vi-VN')} / QR{' '}
                          {st.vietqr_revenue_vnd.toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-stone-700">
                        {st.store_internal_bom_cogs_vnd.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-stone-700">
                        {st.labor_cost_vnd.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-700">
                        -
                        {(
                          st.cash_shortage_loss_vnd +
                          st.stocktake_shrinkage_loss_vnd
                        ).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <div
                          className={`font-extrabold ${
                            st.store_net_profit_vnd >= 0
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {st.store_net_profit_vnd.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {st.net_margin_pct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/store/${st.store_id}/manage`)}
                            className="px-2 py-1 rounded bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold"
                          >
                            QL
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/store/${st.store_id}/pos`)}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold"
                          >
                            POS
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/store/${st.store_id}/kds`)}
                            className="px-2 py-1 rounded bg-stone-900 text-amber-300 hover:bg-stone-800 font-semibold"
                          >
                            KDS
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
