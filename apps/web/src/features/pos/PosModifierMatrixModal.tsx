import { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import {
  calculatePosLinePricing,
  type MenuModifierDto,
  type StoreCatalogProductDTO,
} from '@cf19/shared';

export interface PosModifierConfirmPayload {
  productId: string;
  productName: string;
  variantId: string;
  sizeCode: string;
  modifierIds: string[];
  modifierNames: string[];
  quantity: number;
  notes?: string;
  unitPriceVnd: number;
}

export interface PosModifierMatrixModalProps {
  product: StoreCatalogProductDTO | null;
  priceMultiplier: number;
  modifiers: MenuModifierDto[];
  onClose: () => void;
  onConfirm: (payload: PosModifierConfirmPayload) => void;
}

export function PosModifierMatrixModal({
  product,
  priceMultiplier,
  modifiers,
  onClose,
  onConfirm,
}: PosModifierMatrixModalProps) {
  const defaultVariant =
    product?.variants.find((v) => v.is_default) ?? product?.variants[0];

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant?.id ?? '',
  );
  const [selectedSugarId, setSelectedSugarId] = useState<string | null>(null);
  const [selectedIceId, setSelectedIceId] = useState<string | null>(null);
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const sugarMods = useMemo(
    () => modifiers.filter((m) => m.modifier_group === 'SUGAR'),
    [modifiers],
  );
  const iceMods = useMemo(
    () => modifiers.filter((m) => m.modifier_group === 'ICE'),
    [modifiers],
  );
  const toppingMods = useMemo(
    () => modifiers.filter((m) => m.modifier_group === 'TOPPING'),
    [modifiers],
  );

  const activeVariant =
    product?.variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;

  const chosenModifiers = useMemo(() => {
    const ids = [
      ...(selectedSugarId ? [selectedSugarId] : []),
      ...(selectedIceId ? [selectedIceId] : []),
      ...selectedToppingIds,
    ];
    return modifiers.filter((m) => ids.includes(m.id));
  }, [modifiers, selectedSugarId, selectedIceId, selectedToppingIds]);

  const pricing = useMemo(() => {
    if (!product || !activeVariant) {
      return null;
    }
    return calculatePosLinePricing({
      basePriceVnd: product.base_price_vnd,
      priceMultiplier,
      variantPriceDeltaVnd: activeVariant.price_delta_vnd,
      modifiers: chosenModifiers,
      quantity,
    });
  }, [product, activeVariant, priceMultiplier, chosenModifiers, quantity]);

  if (!product || !activeVariant || !pricing) {
    return null;
  }

  const toggleTopping = (id: string) => {
    setSelectedToppingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    onConfirm({
      productId: product.id,
      productName: product.name,
      variantId: activeVariant.id,
      sizeCode: activeVariant.size_code,
      modifierIds: chosenModifiers.map((m) => m.id),
      modifierNames: chosenModifiers.map((m) => m.name),
      quantity,
      notes: notes.trim() || undefined,
      unitPriceVnd: pricing.unit_price_vnd,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-amber-950">{product.name}</h2>
            <p className="text-xs text-amber-800">
              Giá cơ sở chi nhánh: {pricing.effective_base_price_vnd.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-stone-500 hover:text-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              1. Chọn Size (Bắt buộc)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    activeVariant.id === v.id
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-stone-50 text-stone-800 border-stone-200 hover:border-amber-500'
                  }`}
                >
                  <div>{v.name}</div>
                  <div className="font-mono mt-0.5 opacity-80">
                    +{v.price_delta_vnd.toLocaleString('vi-VN')} đ
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              2. Mức Đường (Tối đa 1 lựa chọn — SUGAR)
            </div>
            <div className="flex flex-wrap gap-2">
              {sugarMods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setSelectedSugarId((prev) => (prev === m.id ? null : m.id))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
                    selectedSugarId === m.id
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              3. Mức Đá (Tối đa 1 lựa chọn — ICE)
            </div>
            <div className="flex flex-wrap gap-2">
              {iceMods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setSelectedIceId((prev) => (prev === m.id ? null : m.id))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
                    selectedIceId === m.id
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-700 uppercase mb-2">
              4. Topping Thêm (Chọn nhiều — Tự động tính BOM tầng 2)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toppingMods.map((m) => {
                const checked = selectedToppingIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleTopping(m.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold ${
                      checked
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-stone-50 text-stone-800 border-stone-200'
                    }`}
                  >
                    <div>{m.name}</div>
                    <div className="font-mono mt-0.5 opacity-80">
                      +{m.price_delta_vnd.toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Số lượng ly
              </label>
              <div className="inline-flex items-center gap-3 bg-stone-100 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-base w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ghi chú pha chế
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Mang đi, ít đá riêng"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-4">
          <div className="text-xs">
            <div className="text-stone-500">
              Đơn giá: {pricing.unit_price_vnd.toLocaleString('vi-VN')} đ / ly
            </div>
            <div className="text-base font-mono font-bold text-amber-800">
              Thành tiền: {pricing.line_total_vnd.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-3 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800"
          >
            Thêm vào Giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
}
