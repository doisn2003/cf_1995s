import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type {
  BaseUnit,
  InventoryCategory,
  WarehouseInventoryItemDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  createWarehouseItemApi,
  fetchWarehouseItems,
  updateWarehouseItemApi,
} from '../../api/warehouseApi';

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  GREEN_BEAN: 'Cà phê Nhân Xanh',
  ROASTED_COFFEE: 'Cà phê Hạt Rang',
  INGREDIENT: 'Sữa & Nguyên liệu pha chế',
  PACKAGING: 'Ly / Ống hút / Bao bì',
};

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} đ`;
}

export interface InventoryItemsCrudPanelProps {
  onItemsChanged?: () => void;
}

export function InventoryItemsCrudPanel({ onItemsChanged }: InventoryItemsCrudPanelProps) {
  const [items, setItems] = useState<WarehouseInventoryItemDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<InventoryCategory>('ROASTED_COFFEE');
  const [baseUnit, setBaseUnit] = useState<BaseUnit>('g');
  const [minThreshold, setMinThreshold] = useState<string>('5000');
  const [internalPrice, setInternalPrice] = useState<string>('150000');
  const [retailPrice, setRetailPrice] = useState<string>('210000');
  const [isActive, setIsActive] = useState<boolean>(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchWarehouseItems(true);
      setItems(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh mục vật tư.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setSku('');
    setName('');
    setCategory('ROASTED_COFFEE');
    setBaseUnit('g');
    setMinThreshold('5000');
    setInternalPrice('150000');
    setRetailPrice('210000');
    setIsActive(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (editingId) {
        await updateWarehouseItemApi(editingId, {
          name: name.trim(),
          category,
          min_stock_threshold: Number(minThreshold),
          internal_transfer_price_vnd: Math.round(Number(internalPrice)),
          retail_price_vnd: Math.round(Number(retailPrice)),
          is_active: isActive,
        });
        setSuccessMsg(`Đã cập nhật vật tư ${sku}.`);
      } else {
        const created = await createWarehouseItemApi({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          category,
          base_unit: baseUnit,
          min_stock_threshold: Number(minThreshold),
          moving_avg_cost_vnd: Math.round(Number(internalPrice)),
          internal_transfer_price_vnd: Math.round(Number(internalPrice)),
          retail_price_vnd: Math.round(Number(retailPrice)),
        });
        setSuccessMsg(`Đã tạo vật tư mới ${created.sku} — ${created.name}.`);
      }
      resetForm();
      await loadItems();
      onItemsChanged?.();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu vật tư thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-amber-700" />
              {editingId ? `Sửa vật tư ${sku}` : 'Thêm Vật tư / SKU mới'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-stone-500 underline"
              >
                Hủy
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mã SKU</label>
            <input
              type="text"
              required
              disabled={Boolean(editingId)}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="RB-CULI-DARK"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase disabled:bg-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Tên vật tư</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cà phê Culi Rang Đậm"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Phân loại</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full rounded-xl border border-stone-300 px-2.5 py-2 text-xs bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Đơn vị cơ sở</label>
              <select
                disabled={Boolean(editingId)}
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}
                className="w-full rounded-xl border border-stone-300 px-2.5 py-2 text-xs bg-white disabled:bg-stone-100"
              >
                <option value="g">gram (g) — Giá theo kg</option>
                <option value="ml">mililit (ml) — Giá theo lít</option>
                <option value="pcs">cái (pcs) — Giá theo cái</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ngưỡng cảnh báo tồn tối thiểu ({baseUnit})
            </label>
            <input
              type="number"
              min={0}
              required
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Giá chuyển nội bộ (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                required
                value={internalPrice}
                onChange={(e) => setInternalPrice(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Giá bán lẻ B2C (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                required
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {editingId && (
            <label className="flex items-center gap-2 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Đang sử dụng trong hệ thống
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingId ? 'Lưu cập nhật SKU' : 'Tạo vật tư mới'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900">
              Danh mục Vật tư Kho Tổng ({items.length} SKU)
            </h3>
            <button
              type="button"
              onClick={() => void loadItems()}
              className="text-xs text-stone-600 hover:text-stone-900 inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2.5">SKU / Tên vật tư</th>
                  <th className="px-4 py-2.5">Phân loại</th>
                  <th className="px-4 py-2.5 text-right">Giá vốn MAC</th>
                  <th className="px-4 py-2.5 text-right">Giá nội bộ</th>
                  <th className="px-4 py-2.5 text-right">Giá bán lẻ</th>
                  <th className="px-4 py-2.5 text-right">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-stone-900">{it.name}</div>
                      <div className="text-[11px] font-mono text-stone-500">
                        {it.sku} • ĐVT: {it.base_unit}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{CATEGORY_LABELS[it.category]}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-amber-900">
                      {formatVnd(it.moving_avg_cost_vnd)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatVnd(it.internal_transfer_price_vnd)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatVnd(it.retail_price_vnd)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(it.id);
                          setSku(it.sku);
                          setName(it.name);
                          setCategory(it.category);
                          setBaseUnit(it.base_unit);
                          setMinThreshold(String(it.min_stock_threshold));
                          setInternalPrice(String(it.internal_transfer_price_vnd));
                          setRetailPrice(String(it.retail_price_vnd));
                          setIsActive(it.is_active);
                        }}
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
      </div>
    </div>
  );
}
