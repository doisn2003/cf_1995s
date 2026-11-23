import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CloudOff,
  Coffee,
  Printer,
  QrCode,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Wifi,
} from 'lucide-react';
import {
  SEED_IDS,
  type PaymentMethod,
  type PosOrderFullDto,
  type StoreCatalogProductDTO,
  type StorePosCatalogDTO,
  type VietQrWebhookProcessResultDTO,
} from '@cf19/shared';
import { ApiClientError, voidPosOrder } from '../../api/apiClient';
import {
  fetchOrderReceiptApi,
  fetchStorePosCatalogApi,
  fetchStorePosOrdersApi,
  submitPosOrderApi,
  syncOfflinePosOrdersApi,
} from '../../api/posCatalogApi';
import {
  ManagerPinModal,
  type ManagerPinSubmitPayload,
} from '../../components/ManagerPinModal';
import { usePosTerminalStore } from '../../store/posTerminalStore';
import { EscPosThermalReceiptModal } from './EscPosThermalReceiptModal';
import { PosDynamicVietQrModal } from './PosDynamicVietQrModal';
import {
  PosModifierMatrixModal,
  type PosModifierConfirmPayload,
} from './PosModifierMatrixModal';
import { VietQrWebhookMonitorPanel } from './VietQrWebhookMonitorPanel';

export interface PosTerminalWorkbenchProps {
  storeId: string;
  shiftId: string | null;
}

export function PosTerminalWorkbench({
  storeId,
  shiftId,
}: PosTerminalWorkbenchProps) {
  const [catalog, setCatalog] = useState<StorePosCatalogDTO | null>(null);
  const [orders, setOrders] = useState<PosOrderFullDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [activeProduct, setActiveProduct] = useState<StoreCatalogProductDTO | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIETQR');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<{
    orderId: string;
    orderCode: string;
    text: string;
    canVoid: boolean;
  } | null>(null);
  const [voidTarget, setVoidTarget] = useState<{
    id: string;
    orderCode: string;
  } | null>(null);
  const [vietQrTarget, setVietQrTarget] = useState<PosOrderFullDto | null>(null);
  const [webhookRefreshSignal, setWebhookRefreshSignal] = useState<number>(0);

  const cartItems = usePosTerminalStore((s) => s.cartItems);
  const isOfflineMode = usePosTerminalStore((s) => s.isOfflineSimulationMode);
  const offlineQueue = usePosTerminalStore((s) => s.offlineOrderQueue);
  const addToCart = usePosTerminalStore((s) => s.addToCart);
  const updateCartLineQty = usePosTerminalStore((s) => s.updateCartLineQty);
  const removeCartLine = usePosTerminalStore((s) => s.removeCartLine);
  const clearCart = usePosTerminalStore((s) => s.clearCart);
  const setOfflineMode = usePosTerminalStore((s) => s.setOfflineSimulationMode);
  const enqueueOfflineOrder = usePosTerminalStore((s) => s.enqueueOfflineOrder);
  const removeSyncedOfflineOrders = usePosTerminalStore(
    (s) => s.removeSyncedOfflineOrders,
  );

  const loadData = useCallback(async () => {
    const [catData, ordData] = await Promise.all([
      fetchStorePosCatalogApi(storeId),
      fetchStorePosOrdersApi(storeId),
    ]);
    setCatalog(catData);
    setOrders(ordData);
  }, [storeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    if (selectedCategoryId === 'ALL') return catalog.products;
    return catalog.products.filter((p) => p.category_id === selectedCategoryId);
  }, [catalog, selectedCategoryId]);

  const cartTotalVnd = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotalVnd, 0),
    [cartItems],
  );

  const handleAddConfiguredDrink = (payload: PosModifierConfirmPayload) => {
    addToCart(payload);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!shiftId) {
      setErrorMsg('Chi nhánh chưa mở ca làm việc. Vui lòng mở ca mới trước khi tạo đơn POS.');
      return;
    }
    setErrorMsg(null);
    setStatusMessage(null);

    const itemsPayload = cartItems.map((line) => ({
      product_id: line.productId,
      variant_id: line.variantId,
      modifier_ids: line.modifierIds,
      quantity: line.quantity,
      notes: line.notes,
    }));

    if (isOfflineMode) {
      const offlineCode = `POS-OFF-${Date.now().toString().slice(-6)}`;
      enqueueOfflineOrder({
        client_order_code: offlineCode,
        payment_method: paymentMethod,
        customer_phone: customerPhone.trim() || undefined,
        created_offline_at: new Date().toISOString(),
        items: itemsPayload,
      });
      clearCart();
      setStatusMessage(
        `Đã lưu đơn ${offlineCode} vào hàng đợi cục bộ để đồng bộ lên máy chủ khi có mạng.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPosOrderApi(storeId, {
        shift_id: shiftId,
        payment_method: paymentMethod,
        customer_phone: customerPhone.trim() || undefined,
        items: itemsPayload,
      });
      clearCart();
      setCustomerPhone('');
      setStatusMessage(
        `Đã tạo hóa đơn ${res.order.order_code} (${res.order.payment_method} • ${res.order.total_amount_vnd.toLocaleString('vi-VN')} đ)`,
      );

      if (
        res.order.payment_method === 'VIETQR' &&
        res.order.payment_status === 'PENDING'
      ) {
        setVietQrTarget(res.order);
      } else {
        setReceiptModal({
          orderId: res.order.id,
          orderCode: res.order.order_code,
          text: res.thermal_receipt_text,
          canVoid: res.order.payment_status !== 'VOIDED',
        });
      }

      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể tạo đơn POS.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSyncOffline = async () => {
    if (offlineQueue.length === 0 || !shiftId) return;
    setErrorMsg(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const res = await syncOfflinePosOrdersApi(storeId, {
        shift_id: shiftId,
        orders: offlineQueue,
      });
      removeSyncedOfflineOrders(offlineQueue.map((o) => o.client_order_code));
      setStatusMessage(
        `Đồng bộ hoàn tất: ${res.synced_new_count} đơn mới, ${res.idempotent_existing_count} đơn đã tồn tại.`,
      );
      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Không thể đồng bộ lô đơn Offline.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceipt = async (ord: PosOrderFullDto) => {
    const res = await fetchOrderReceiptApi(storeId, ord.id);
    setReceiptModal({
      orderId: ord.id,
      orderCode: ord.order_code,
      text: res.thermal_receipt_text,
      canVoid: ord.payment_status !== 'VOIDED',
    });
  };

  const handleWebhookProcessed = (result: VietQrWebhookProcessResultDTO) => {
    if (result.order_id && result.payment_status) {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === result.order_id
            ? {
                ...ord,
                payment_status: result.payment_status ?? ord.payment_status,
                vietqr_ref_code: result.vietqr_ref_code ?? ord.vietqr_ref_code,
              }
            : ord,
        ),
      );
    }
    setWebhookRefreshSignal((n) => n + 1);
    void loadData();
  };

  const handleConfirmVoid = async (payload: ManagerPinSubmitPayload) => {
    if (!voidTarget) return;
    const res = await voidPosOrder(storeId, voidTarget.id, payload);
    setStatusMessage(`Đã hủy đơn ${res.order.order_code} thành công và lưu nhật ký kiểm toán.`);
    setReceiptModal(null);
    await loadData();
  };

  return (
    <div className="space-y-6">
      {!shiftId && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Chi nhánh hiện chưa có ca làm việc đang mở. Vui lòng mở ca làm việc ở mục trên để bắt đầu bán hàng.
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-stone-800">
            Hệ số giá chi nhánh:{' '}
            <span className="font-mono text-amber-800">
              {catalog?.store.price_multiplier.toFixed(2) ?? '1.00'}x
            </span>
          </span>
          <span className="text-stone-400">|</span>
          <button
            type="button"
            onClick={() => setOfflineMode(!isOfflineMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition ${
              isOfflineMode
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isOfflineMode ? (
              <>
                <CloudOff className="w-4 h-4" />
                Chế độ Lưu Đơn Ngoại Tuyến
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Kết nối Trực tuyến
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-stone-600">
            Hàng đợi Offline: <strong>{offlineQueue.length}</strong> đơn
          </span>
          <button
            type="button"
            disabled={offlineQueue.length === 0 || submitting || !shiftId}
            onClick={() => void handleBatchSyncOffline()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 text-white text-xs font-semibold hover:bg-indigo-800 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đồng Bộ Lô Đơn Offline
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-800 text-white'
                  : 'bg-white border border-stone-200 text-stone-700'
              }`}
            >
              Tất cả món
            </button>
            {catalog?.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  selectedCategoryId === cat.id
                    ? 'bg-amber-800 text-white'
                    : 'bg-white border border-stone-200 text-stone-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => setActiveProduct(prod)}
                className="bg-white rounded-2xl border border-stone-200 p-4 text-left hover:border-amber-600 hover:shadow-md transition"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                  <Coffee className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-stone-900">{prod.name}</div>
                <div className="text-xs font-mono text-amber-800 font-bold mt-1">
                  {prod.effective_base_price_vnd.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Chọn Size &amp; Topping
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingCart className="w-4 h-4 text-amber-700" />
                <span>Giỏ Hàng ({cartItems.length} món)</span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:underline"
                >
                  Xóa hết
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                Chạm vào đồ uống bên trái để thêm vào đơn hàng.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cartItems.map((line) => (
                  <div
                    key={line.cartLineId}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>
                        {line.productName} ({line.sizeCode})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCartLine(line.cartLineId)}
                        className="text-stone-400 hover:text-red-600"
                        aria-label="Xóa món"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {line.modifierNames.length > 0 && (
                      <div className="text-[11px] text-stone-500">
                        + {line.modifierNames.join(', ')}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartLineQty(line.cartLineId, line.quantity - 1)
                          }
                          className="px-2 py-0.5 rounded bg-white border border-stone-300"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartLineQty(line.cartLineId, line.quantity + 1)
                          }
                          className="px-2 py-0.5 rounded bg-white border border-stone-300"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-mono font-bold text-amber-800">
                        {line.lineTotalVnd.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('VIETQR')}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  paymentMethod === 'VIETQR'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                VietQR Động
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 rounded-xl text-xs font-bold border ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                Tiền Mặt
              </button>
            </div>

            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="SĐT khách hàng (tùy chọn)"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
            />

            <div className="flex justify-between items-center text-sm font-bold">
              <span>Tổng thanh toán:</span>
              <span className="font-mono text-lg text-amber-800">
                {cartTotalVnd.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <button
              type="button"
              disabled={cartItems.length === 0 || submitting || !shiftId}
              onClick={() => void handleCheckout()}
              className="w-full py-3 rounded-xl bg-amber-800 text-white text-sm font-bold hover:bg-amber-900 disabled:opacity-40"
            >
              {isOfflineMode
                ? 'Lưu Đơn Vào Hàng Đợi Offline'
                : paymentMethod === 'VIETQR'
                  ? 'Tạo Đơn & Hiện Mã VietQR'
                  : 'Thanh Toán Tiền Mặt & In Bill'}
            </button>
          </div>
        </aside>
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
        <h2 className="font-bold text-base">
          Hóa Đơn Gần Nhất Tại Chi Nhánh ({orders.length} đơn)
        </h2>
        <div className="space-y-2">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-stone-900">
                  {ord.order_code}
                </span>{' '}
                • <span className="font-semibold">{ord.payment_method}</span> •{' '}
                <span
                  className={`font-mono font-bold ${
                    ord.payment_status === 'PAID'
                      ? 'text-emerald-700'
                      : ord.payment_status === 'VOIDED'
                        ? 'text-red-600'
                        : 'text-amber-700'
                  }`}
                >
                  {ord.payment_status}
                </span>{' '}
                • KDS: <span className="font-mono">{ord.kds_status}</span> •{' '}
                <strong className="font-mono text-amber-800">
                  {ord.total_amount_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex flex-wrap gap-2">
                {ord.payment_method === 'VIETQR' && ord.payment_status !== 'VOIDED' && (
                  <button
                    type="button"
                    onClick={() => setVietQrTarget(ord)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-700 text-white font-semibold hover:bg-indigo-800"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {ord.payment_status === 'PENDING' ? 'Mở Mã VietQR / Xác Nhận' : 'Xem VietQR'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleOpenReceipt(ord)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 font-semibold hover:bg-stone-100"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Hóa Đơn
                </button>
                {ord.payment_status !== 'VOIDED' && (
                  <button
                    type="button"
                    onClick={() =>
                      setVoidTarget({ id: ord.id, orderCode: ord.order_code })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Hủy (PIN)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <VietQrWebhookMonitorPanel
        storeId={storeId}
        refreshSignal={webhookRefreshSignal}
      />

      <PosModifierMatrixModal
        product={activeProduct}
        priceMultiplier={catalog?.store.price_multiplier ?? 1}
        modifiers={catalog?.modifiers ?? []}
        onClose={() => setActiveProduct(null)}
        onConfirm={handleAddConfiguredDrink}
      />

      <PosDynamicVietQrModal
        isOpen={vietQrTarget !== null}
        storeId={storeId}
        order={vietQrTarget}
        onClose={() => setVietQrTarget(null)}
        onWebhookProcessed={handleWebhookProcessed}
      />

      <EscPosThermalReceiptModal
        isOpen={receiptModal !== null}
        orderCode={receiptModal?.orderCode ?? ''}
        receiptText={receiptModal?.text ?? ''}
        canVoid={receiptModal?.canVoid ?? false}
        onClose={() => setReceiptModal(null)}
        onRequestVoid={() => {
          if (receiptModal) {
            setVoidTarget({
              id: receiptModal.orderId,
              orderCode: receiptModal.orderCode,
            });
          }
        }}
      />

      <ManagerPinModal
        isOpen={voidTarget !== null}
        title="Phê duyệt Hủy Hóa Đơn Đã In"
        description={
          voidTarget
            ? `Hủy đơn ${voidTarget.orderCode} yêu cầu mã PIN 6 số của Quản lý chi nhánh hoặc Chủ chuỗi.`
            : ''
        }
        storeId={storeId || SEED_IDS.stores.store01}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
}
