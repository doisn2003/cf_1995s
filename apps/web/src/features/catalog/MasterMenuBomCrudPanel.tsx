import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Coffee,
  FlaskConical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  SEED_IDS,
  type MenuCategoryDto,
  type MenuModifierDto,
  type MenuSizeCode,
  type ModifierGroup,
  type StoreCatalogProductDTO,
  type StorePosCatalogDTO,
  type WarehouseInventoryItemDto,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  createMenuCategoryApi,
  createMenuModifierApi,
  createMenuProductApi,
  fetchStorePosCatalogApi,
  updateMenuCategoryApi,
  updateMenuModifierApi,
  updateMenuProductApi,
  upsertBomRecipeApi,
  upsertMenuVariantApi,
} from '../../api/posCatalogApi';
import { fetchWarehouseItems } from '../../api/warehouseApi';
import { Pagination, paginateList } from '../../components/Pagination';

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} đ`;
}

interface BomDraftRow {
  inventory_item_id: string;
  quantity_per_cup_base_unit: string;
  wastage_allowance_pct: string;
}

export function MasterMenuBomCrudPanel() {
  const [subTab, setSubTab] = useState<'products' | 'categories' | 'modifiers' | 'bom'>('products');
  const [catalog, setCatalog] = useState<StorePosCatalogDTO | null>(null);
  const [inventoryItems, setInventoryItems] = useState<WarehouseInventoryItemDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination states
  const [prodPage, setProdPage] = useState<number>(1);
  const [prodPageSize, setProdPageSize] = useState<number>(10);
  const [modPage, setModPage] = useState<number>(1);
  const [modPageSize, setModPageSize] = useState<number>(10);
  const [catPage, setCatPage] = useState<number>(1);
  const [catPageSize, setCatPageSize] = useState<number>(10);

  // Category form
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catCode, setCatCode] = useState<string>('');
  const [catName, setCatName] = useState<string>('');
  const [catSortOrder, setCatSortOrder] = useState<string>('10');
  const [catActive, setCatActive] = useState<boolean>(true);

  // Product form
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodCategoryId, setProdCategoryId] = useState<string>('');
  const [prodCode, setProdCode] = useState<string>('');
  const [prodName, setProdName] = useState<string>('');
  const [prodBasePrice, setProdBasePrice] = useState<string>('35000');
  const [prodSizeLDelta, setProdSizeLDelta] = useState<string>('8000');
  const [prodActive, setProdActive] = useState<boolean>(true);

  // Variant quick upsert
  const [variantProdId, setVariantProdId] = useState<string>('');
  const [variantSize, setVariantSize] = useState<MenuSizeCode>('L');
  const [variantDelta, setVariantDelta] = useState<string>('8000');

  // Modifier form
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [modCode, setModCode] = useState<string>('');
  const [modGroup, setModGroup] = useState<ModifierGroup>('TOPPING');
  const [modName, setModName] = useState<string>('');
  const [modDelta, setModDelta] = useState<string>('10000');
  const [modBomItemId, setModBomItemId] = useState<string>('');
  const [modBomQty, setModBomQty] = useState<string>('0');
  const [modActive, setModActive] = useState<boolean>(true);

  // BOM Editor state
  const [bomProductId, setBomProductId] = useState<string>('');
  const [bomVariantId, setBomVariantId] = useState<string>('');
  const [bomRows, setBomRows] = useState<BomDraftRow[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [catData, invData] = await Promise.all([
        fetchStorePosCatalogApi(SEED_IDS.stores.store01, true),
        fetchWarehouseItems(false),
      ]);
      setCatalog(catData);
      setInventoryItems(invData);

      if (!prodCategoryId && catData.categories.length > 0) {
        setProdCategoryId(catData.categories[0]!.id);
      }
      if (!bomProductId && catData.products.length > 0) {
        const firstProd = catData.products[0]!;
        setBomProductId(firstProd.id);
        const firstVar = firstProd.variants[0];
        if (firstVar) setBomVariantId(firstVar.id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được thực đơn gốc.');
    } finally {
      setLoading(false);
    }
  }, [bomProductId, prodCategoryId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!catalog || !bomProductId || !bomVariantId) return;
    const existing = catalog.bom_recipes.find(
      (r) => r.product_id === bomProductId && r.variant_id === bomVariantId,
    );
    if (existing && existing.items.length > 0) {
      setBomRows(
        existing.items.map((it) => ({
          inventory_item_id: it.inventory_item_id,
          quantity_per_cup_base_unit: String(it.quantity_per_cup_base_unit),
          wastage_allowance_pct: String(it.wastage_allowance_pct),
        })),
      );
    } else {
      const firstEligible = inventoryItems.find((i) => i.category !== 'GREEN_BEAN');
      setBomRows(
        firstEligible
          ? [
              {
                inventory_item_id: firstEligible.id,
                quantity_per_cup_base_unit: '20',
                wastage_allowance_pct: '2',
              },
            ]
          : [],
      );
    }
  }, [catalog, bomProductId, bomVariantId, inventoryItems]);

  const bomEligibleItems = inventoryItems.filter((i) => i.category !== 'GREEN_BEAN');

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (editingCatId) {
        await updateMenuCategoryApi(editingCatId, {
          name: catName.trim(),
          sort_order: Number(catSortOrder),
          is_active: catActive,
        });
        setSuccessMsg('Đã cập nhật danh mục thực đơn.');
      } else {
        await createMenuCategoryApi({
          code: (catCode.trim() || `CAT-${Date.now().toString().slice(-4)}`).toUpperCase(),
          name: catName.trim(),
          sort_order: Number(catSortOrder),
        });
        setSuccessMsg('Đã thêm danh mục mới.');
      }
      setEditingCatId(null);
      setCatCode('');
      setCatName('');
      setCatSortOrder('10');
      setCatActive(true);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu danh mục thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (editingProdId) {
        await updateMenuProductApi(editingProdId, {
          category_id: prodCategoryId,
          name: prodName.trim(),
          base_price_vnd: Math.round(Number(prodBasePrice)),
          is_active: prodActive,
        });
        setSuccessMsg(`Đã cập nhật món ${prodName}.`);
      } else {
        await createMenuProductApi({
          category_id: prodCategoryId,
          code: prodCode.trim().toUpperCase(),
          name: prodName.trim(),
          base_price_vnd: Math.round(Number(prodBasePrice)),
          create_default_variants: true,
          size_l_delta_vnd: Math.round(Number(prodSizeLDelta)),
        });
        setSuccessMsg(`Đã thêm món ${prodName} cùng Size M & Size L mặc định.`);
      }
      setEditingProdId(null);
      setProdCode('');
      setProdName('');
      setProdBasePrice('35000');
      setProdActive(true);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu món uống thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsertVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!variantProdId) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      await upsertMenuVariantApi(variantProdId, {
        size_code: variantSize,
        name: `Size ${variantSize}`,
        price_delta_vnd: Math.max(0, Math.round(Number(variantDelta))),
        is_default: variantSize === 'M',
        is_active: true,
      });
      setSuccessMsg(`Đã cập nhật Size ${variantSize} cho món đã chọn.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Cập nhật Size thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModifier = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (editingModId) {
        await updateMenuModifierApi(editingModId, {
          name: modName.trim(),
          price_delta_vnd: Math.max(0, Math.round(Number(modDelta))),
          inventory_item_id: modBomItemId || null,
          bom_qty_base_unit: modBomItemId ? Number(modBomQty) : 0,
          is_active: modActive,
        });
        setSuccessMsg('Đã cập nhật tùy chọn.');
      } else {
        await createMenuModifierApi({
          code: (modCode.trim() || `MOD-${Date.now().toString().slice(-4)}`).toUpperCase(),
          modifier_group: modGroup,
          name: modName.trim(),
          price_delta_vnd: Math.max(0, Math.round(Number(modDelta))),
          inventory_item_id: modBomItemId || null,
          bom_qty_base_unit: modBomItemId ? Number(modBomQty) : 0,
        });
        setSuccessMsg('Đã thêm tùy chọn / topping mới.');
      }
      setEditingModId(null);
      setModCode('');
      setModName('');
      setModDelta('10000');
      setModBomItemId('');
      setModBomQty('0');
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu tùy chọn thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBom = async (e: FormEvent) => {
    e.preventDefault();
    if (!bomProductId || !bomVariantId || bomRows.length === 0) {
      setErrorMsg('Công thức BOM phải có ít nhất 1 nguyên liệu.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      await upsertBomRecipeApi({
        product_id: bomProductId,
        variant_id: bomVariantId,
        items: bomRows.map((r) => ({
          inventory_item_id: r.inventory_item_id,
          quantity_per_cup_base_unit: Number(r.quantity_per_cup_base_unit),
          wastage_allowance_pct: Number(r.wastage_allowance_pct),
        })),
      });
      setSuccessMsg('Đã lưu công thức định lượng BOM vào Supabase thành công.');
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu công thức BOM thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const selectedBomProduct = catalog?.products.find((p) => p.id === bomProductId);
  const variantsOfSelectedBomProduct = selectedBomProduct?.variants ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl bg-stone-200/70 p-1 gap-1">
          {[
            { id: 'products', label: 'Món uống & Size', icon: Coffee },
            { id: 'bom', label: 'Công thức BOM (Định lượng)', icon: FlaskConical },
            { id: 'modifiers', label: 'Topping / Đường / Đá', icon: SlidersHorizontal },
            { id: 'categories', label: 'Danh mục', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as typeof subTab)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                  subTab === tab.id
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
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

      {subTab === 'products' && catalog && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <form
              onSubmit={handleSaveProduct}
              className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900">
                  {editingProdId ? 'Chỉnh sửa Món uống' : 'Thêm Món uống mới'}
                </h3>
                {editingProdId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProdId(null);
                      setProdCode('');
                      setProdName('');
                    }}
                    className="text-xs text-stone-500 underline"
                  >
                    Hủy
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Danh mục</label>
                <select
                  required
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  {catalog.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {!editingProdId && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mã món (VD: PRD-LATTE-01)
                  </label>
                  <input
                    type="text"
                    required
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    placeholder="PRD-..."
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tên món</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Latte Hạnh Nhân"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Giá gốc Size M (VNĐ)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={prodBasePrice}
                    onChange={(e) => setProdBasePrice(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                {!editingProdId && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phụ thu Size L (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={prodSizeLDelta}
                      onChange={(e) => setProdSizeLDelta(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              {editingProdId && (
                <label className="flex items-center gap-2 text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={prodActive}
                    onChange={(e) => setProdActive(e.target.checked)}
                  />
                  Đang mở bán trên POS toàn chuỗi
                </label>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                {editingProdId ? 'Lưu cập nhật món' : 'Tạo món uống mới'}
              </button>
            </form>

            <form
              onSubmit={handleUpsertVariant}
              className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3"
            >
              <h3 className="font-bold text-sm text-stone-900">Cấu hình Biến thể Size (S / M / L)</h3>
              <select
                required
                value={variantProdId}
                onChange={(e) => setVariantProdId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Chọn món --</option>
                {catalog.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={variantSize}
                  onChange={(e) => setVariantSize(e.target.value as MenuSizeCode)}
                  className="rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="S">Size S</option>
                  <option value="M">Size M</option>
                  <option value="L">Size L</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={variantDelta}
                  onChange={(e) => setVariantDelta(e.target.value)}
                  placeholder="Phụ thu VNĐ"
                  className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !variantProdId}
                className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold disabled:opacity-50"
              >
                Lưu Size cho món
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-200 font-bold text-sm text-stone-900">
              Danh sách Thực đơn Gốc Toàn chuỗi ({catalog.products.length} món)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Món uống</th>
                    <th className="px-4 py-2.5 font-semibold">Danh mục</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Giá gốc</th>
                    <th className="px-4 py-2.5 font-semibold">Các Size</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginateList(catalog.products, prodPage, prodPageSize).map((p: StoreCatalogProductDTO) => {
                    const cat = catalog.categories.find((c) => c.id === p.category_id);
                    return (
                      <tr key={p.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">
                            {p.name}{' '}
                            {!p.is_active && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
                                Ngưng bán
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500">{p.code}</div>
                        </td>
                        <td className="px-4 py-3 text-stone-700">{cat?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatVnd(p.base_price_vnd)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.variants.map((v) => (
                              <span
                                key={v.id}
                                className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-mono text-[11px]"
                              >
                                {v.size_code}: +{formatVnd(v.price_delta_vnd)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProdId(p.id);
                              setProdCategoryId(p.category_id);
                              setProdCode(p.code);
                              setProdName(p.name);
                              setProdBasePrice(String(p.base_price_vnd));
                              setProdActive(p.is_active);
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={prodPage}
              totalItems={catalog.products.length}
              pageSize={prodPageSize}
              onPageChange={setProdPage}
              onPageSizeChange={setProdPageSize}
            />
          </div>
        </div>
      )}

      {subTab === 'bom' && catalog && (
        <form
          onSubmit={handleSaveBom}
          className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5"
        >
          <div>
            <h3 className="font-bold text-base text-stone-900">
              Trình Thiết Lập Công Thức Định Lượng Nguyên Liệu (BOM)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Khi Barista hoàn tất món trên KDS, hệ thống tự động trừ tồn kho FIFO tại quán theo đúng định mức nguyên liệu + % hao hụt dưới đây.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Chọn Món uống
              </label>
              <select
                value={bomProductId}
                onChange={(e) => {
                  const nextProdId = e.target.value;
                  setBomProductId(nextProdId);
                  const nextProd = catalog.products.find((p) => p.id === nextProdId);
                  setBomVariantId(nextProd?.variants[0]?.id ?? '');
                }}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                {catalog.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Chọn Biến thể Size
              </label>
              <select
                value={bomVariantId}
                onChange={(e) => setBomVariantId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                {variantsOfSelectedBomProduct.map((v) => (
                  <option key={v.id} value={v.id}>
                    Size {v.size_code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">
                Danh sách nguyên vật liệu tiêu hao mỗi ly
              </span>
              <button
                type="button"
                onClick={() => {
                  const first = bomEligibleItems[0];
                  if (!first) return;
                  setBomRows((prev) => [
                    ...prev,
                    {
                      inventory_item_id: first.id,
                      quantity_per_cup_base_unit: '10',
                      wastage_allowance_pct: '0',
                    },
                  ]);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm nguyên liệu
              </button>
            </div>

            {bomRows.map((row, idx) => {
              const itemMeta = bomEligibleItems.find((i) => i.id === row.inventory_item_id);
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-200"
                >
                  <div className="col-span-12 md:col-span-6">
                    <select
                      value={row.inventory_item_id}
                      onChange={(e) =>
                        setBomRows((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, inventory_item_id: e.target.value } : r,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs"
                    >
                      {bomEligibleItems.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.sku} — {inv.name} ({inv.base_unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        required
                        value={row.quantity_per_cup_base_unit}
                        onChange={(e) =>
                          setBomRows((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, quantity_per_cup_base_unit: e.target.value }
                                : r,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-mono"
                      />
                      <span className="text-xs text-stone-500 font-semibold w-8">
                        {itemMeta?.base_unit ?? ''}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-5 md:col-span-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={row.wastage_allowance_pct}
                        onChange={(e) =>
                          setBomRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, wastage_allowance_pct: e.target.value } : r,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-mono"
                      />
                      <span className="text-[11px] text-stone-500">% HH</span>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setBomRows((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !bomVariantId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu Công thức BOM
            </button>
          </div>
        </form>
      )}

      {subTab === 'modifiers' && catalog && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveModifier}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit"
          >
            <h3 className="font-bold text-sm text-stone-900">
              {editingModId ? 'Chỉnh sửa Tùy chọn' : 'Thêm Tùy chọn / Topping'}
            </h3>
            {!editingModId && (
              <input
                type="text"
                required
                value={modCode}
                onChange={(e) => setModCode(e.target.value)}
                placeholder="Mã tùy chọn (VD: TOP-KEM-MUOI)"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase"
              />
            )}
            <select
              disabled={Boolean(editingModId)}
              value={modGroup}
              onChange={(e) => setModGroup(e.target.value as ModifierGroup)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white disabled:bg-stone-100"
            >
              <option value="TOPPING">TOPPING (Chọn nhiều)</option>
              <option value="SUGAR">SUGAR (Mức đường - Chọn 1)</option>
              <option value="ICE">ICE (Mức đá - Chọn 1)</option>
            </select>
            <input
              type="text"
              required
              value={modName}
              onChange={(e) => setModName(e.target.value)}
              placeholder="Tên tùy chọn (VD: Kem muối)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step={1000}
              value={modDelta}
              onChange={(e) => setModDelta(e.target.value)}
              placeholder="Phụ thu VNĐ"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <select
              value={modBomItemId}
              onChange={(e) => setModBomItemId(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">-- Không trừ kho BOM thêm --</option>
              {bomEligibleItems.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  Trừ thêm: {inv.sku} ({inv.base_unit})
                </option>
              ))}
            </select>
            {modBomItemId && (
              <input
                type="number"
                step="0.5"
                min="0"
                value={modBomQty}
                onChange={(e) => setModBomQty(e.target.value)}
                placeholder="Định lượng trừ thêm"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold"
            >
              {editingModId ? 'Lưu cập nhật' : 'Thêm tùy chọn'}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-200 font-bold text-sm text-stone-900">
              Danh sách Tùy chọn POS ({catalog.modifiers.length})
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2.5">Nhóm</th>
                  <th className="px-4 py-2.5">Tên tùy chọn</th>
                  <th className="px-4 py-2.5 text-right">Phụ thu</th>
                  <th className="px-4 py-2.5 text-right">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginateList(catalog.modifiers, modPage, modPageSize).map((m: MenuModifierDto) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-amber-900">
                      {m.modifier_group}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-stone-900">{m.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      +{formatVnd(m.price_delta_vnd)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingModId(m.id);
                          setModCode(m.code);
                          setModGroup(m.modifier_group);
                          setModName(m.name);
                          setModDelta(String(m.price_delta_vnd));
                          setModBomItemId(m.inventory_item_id ?? '');
                          setModBomQty(String(m.bom_qty_base_unit));
                          setModActive(m.is_active);
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
          <Pagination
            currentPage={modPage}
            totalItems={catalog.modifiers.length}
            pageSize={modPageSize}
            onPageChange={setModPage}
            onPageSizeChange={setModPageSize}
          />
        </div>
      )}

      {subTab === 'categories' && catalog && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveCategory}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 h-fit"
          >
            <h3 className="font-bold text-sm text-stone-900">
              {editingCatId ? 'Sửa Danh mục' : 'Thêm Danh mục mới'}
            </h3>
            {!editingCatId && (
              <input
                type="text"
                required
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                placeholder="Mã danh mục (VD: CAT-TEA)"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm uppercase"
              />
            )}
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Tên danh mục (VD: Trà Trái Cây)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={catSortOrder}
              onChange={(e) => setCatSortOrder(e.target.value)}
              placeholder="Thứ tự hiển thị"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold"
            >
              {editingCatId ? 'Lưu danh mục' : 'Tạo danh mục'}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-2.5">Thứ tự</th>
                  <th className="px-4 py-2.5">Tên danh mục</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right">Sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginateList(catalog.categories, catPage, catPageSize).map((c: MenuCategoryDto) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 font-mono">{c.sort_order}</td>
                    <td className="px-4 py-2.5 font-bold text-stone-900">{c.name}</td>
                    <td className="px-4 py-2.5">
                      {c.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(c.id);
                          setCatCode(c.code);
                          setCatName(c.name);
                          setCatSortOrder(String(c.sort_order));
                          setCatActive(c.is_active);
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
          <Pagination
            currentPage={catPage}
            totalItems={catalog.categories.length}
            pageSize={catPageSize}
            onPageChange={setCatPage}
            onPageSizeChange={setCatPageSize}
          />
        </div>
      )}
    </div>
  );
}
