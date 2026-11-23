import QRCode from 'qrcode';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  SEED_IDS,
  buildEmvCoDynamicVietQrPayload,
  calculateDailyStocktakeVariance,
  calculateEffectiveLotUnitCostVnd,
  calculateMovingAverageCostVnd,
  calculateStockValueVnd,
  classifyKdsWaitSla,
  verifyEmvCoPayloadCrc,
  type AuthenticatedUserDto,
} from '@cf19/shared';
import {
  canAccessStore,
  getRoleDefaultRoute,
  useAuthStore,
} from '../store/authStore';
import { usePosTerminalStore } from '../store/posTerminalStore';
import {
  clearSpeakerAnnouncementHistory,
  processWebhookSpeakerTrigger,
} from '../utils/voiceSpeakerAnnouncer';

function makeUser(
  role: AuthenticatedUserDto['role'],
  assignedStoreId: string | null,
): AuthenticatedUserDto {
  return {
    id: '00000000-0000-4000-8000-000000000099',
    organization_id: SEED_IDS.organization.cf19,
    email: `${role.toLowerCase()}@cf19.vn`,
    full_name: `User ${role}`,
    phone: '0901000001',
    role,
    assigned_store_id: assignedStoreId,
    hourly_rate_vnd: 30000,
    employment_type: 'FULL_TIME',
    is_active: true,
    has_manager_pin: role === 'SUPER_ADMIN' || role === 'STORE_MANAGER',
  };
}

describe('CF19 Production Webapp Test Suite', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    usePosTerminalStore.getState().clearCart();
    clearSpeakerAnnouncementHistory();
  });

  it('1. Auth Store manages real JWT session, 5-role default routes & multi-tenant store isolation', () => {
    const admin = makeUser('SUPER_ADMIN', null);
    const wh = makeUser('WAREHOUSE_MANAGER', SEED_IDS.stores.centralWarehouse);
    const mgr1 = makeUser('STORE_MANAGER', SEED_IDS.stores.store01);
    const cashier1 = makeUser('CASHIER_STAFF', SEED_IDS.stores.store01);
    const barista1 = makeUser('BARISTA_KDS', SEED_IDS.stores.store01);

    expect(getRoleDefaultRoute(admin)).toBe('/executive');
    expect(getRoleDefaultRoute(wh)).toBe('/warehouse');
    expect(getRoleDefaultRoute(mgr1)).toBe(`/store/${SEED_IDS.stores.store01}/manage`);
    expect(getRoleDefaultRoute(cashier1)).toBe(`/store/${SEED_IDS.stores.store01}/pos`);
    expect(getRoleDefaultRoute(barista1)).toBe(`/store/${SEED_IDS.stores.store01}/kds`);

    expect(canAccessStore(admin, SEED_IDS.stores.store02)).toBe(true);
    expect(canAccessStore(mgr1, SEED_IDS.stores.store01)).toBe(true);
    expect(canAccessStore(mgr1, SEED_IDS.stores.store02)).toBe(false);
    expect(canAccessStore(barista1, SEED_IDS.stores.store02)).toBe(false);

    useAuthStore.getState().setSession({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
      user: mgr1,
    });
    expect(useAuthStore.getState().currentUser?.email).toBe('store_manager@cf19.vn');
    expect(useAuthStore.getState().accessToken).toContain('.');

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('2. Exact kg/g Warehouse Math prevents 1000x valuation inflation', () => {
    const effective = calculateEffectiveLotUnitCostVnd(100000, 150000, 30000, 'g');
    expect(effective).toBe(105000);

    const stockVal = calculateStockValueVnd(50000, 95000, 'g');
    expect(stockVal).toBe(4_750_000);

    const nextMac = calculateMovingAverageCostVnd(50000, 95000, 30000, 105000);
    expect(nextMac).toBe(98750);
  });

  it('3. POS Terminal Store manages cart items & idempotent offline queue', () => {
    const store = usePosTerminalStore.getState();
    store.addToCart({
      productId: SEED_IDS.menuProducts.caPheSuaDa,
      productName: 'Cà Phê Sữa Đá',
      variantId: SEED_IDS.menuVariants.caPheSuaDaM,
      sizeCode: 'M',
      modifierIds: [SEED_IDS.menuModifiers.sugar50],
      modifierNames: ['50% Đường'],
      quantity: 2,
      unitPriceVnd: 29000,
    });

    expect(usePosTerminalStore.getState().cartItems).toHaveLength(1);
    expect(usePosTerminalStore.getState().cartItems[0]!.lineTotalVnd).toBe(58000);

    const lineId = usePosTerminalStore.getState().cartItems[0]!.cartLineId;
    usePosTerminalStore.getState().updateCartLineQty(lineId, 3);
    expect(usePosTerminalStore.getState().cartItems[0]!.lineTotalVnd).toBe(87000);

    usePosTerminalStore.getState().enqueueOfflineOrder({
      client_order_code: 'POS-OFF-TEST01',
      payment_method: 'CASH',
      created_offline_at: new Date().toISOString(),
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [],
          quantity: 1,
        },
      ],
    });
    expect(usePosTerminalStore.getState().offlineOrderQueue).toHaveLength(1);
    usePosTerminalStore.getState().removeSyncedOfflineOrders(['POS-OFF-TEST01']);
    expect(usePosTerminalStore.getState().offlineOrderQueue).toHaveLength(0);
  });

  it('4. Real ISO/IEC 18004 VietQR Data URL generation & Idempotent Voice Speaker Announcer', async () => {
    const qr = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970422',
      account_number: '1900191919',
      amount_vnd: 58000,
      order_code: 'POS-ST01-01',
      vietqr_ref_code: 'CF19ST010099',
      merchant_name: 'CF19 COFFEE CHAIN',
      merchant_city: 'BUON MA THUOT',
    });
    expect(verifyEmvCoPayloadCrc(qr.emvco_payload)).toBe(true);

    const dataUrl = await QRCode.toDataURL(qr.emvco_payload, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(500);

    const nowIso = new Date().toISOString();
    const first = processWebhookSpeakerTrigger(
      {
        status: 'RECONCILED_PAID',
        already_processed: false,
        webhook_log_id: 'log-1',
        idempotency_key: 'ipn-1',
        bank_tx_id: 'FT001',
        store_id: SEED_IDS.stores.store01,
        order_id: 'ord-1',
        order_code: 'POS-ST01-01',
        vietqr_ref_code: 'CF19ST010099',
        amount_vnd: 58000,
        order_total_vnd: 58000,
        payment_status: 'PAID',
        processed_at: nowIso,
        should_trigger_speaker: true,
        speaker_announcement: {
          order_id: 'ord-1',
          order_code: 'POS-ST01-01',
          store_id: SEED_IDS.stores.store01,
          vietqr_ref_code: 'CF19ST010099',
          amount_vnd: 58000,
          formatted_amount_vnd: '58.000',
          message_vi: 'Đã nhận thanh toán năm mươi tám nghìn đồng',
          lang: 'vi-VN',
          chime_frequencies_hz: [523, 659, 784, 1046],
          chime_duration_ms: 560,
          generated_at: nowIso,
        },
      },
      { muted: false },
    );
    expect(first.announced).toBe(true);

    const replay = processWebhookSpeakerTrigger(
      {
        status: 'IDEMPOTENT_REPLAY',
        already_processed: true,
        webhook_log_id: 'log-1',
        idempotency_key: 'ipn-1',
        bank_tx_id: 'FT001',
        store_id: SEED_IDS.stores.store01,
        order_id: 'ord-1',
        order_code: 'POS-ST01-01',
        vietqr_ref_code: 'CF19ST010099',
        amount_vnd: 58000,
        order_total_vnd: 58000,
        payment_status: 'PAID',
        processed_at: nowIso,
        should_trigger_speaker: false,
        speaker_announcement: null,
      },
      { muted: false },
    );
    expect(replay.announced).toBe(false);
  });

  it('5. KDS SLA thresholds & EOD Stocktake Variance (> 3% abnormal shrinkage)', () => {
    const now = Date.parse('2026-11-22T10:15:00.000Z');
    expect(classifyKdsWaitSla('2026-11-22T10:12:00.000Z', now).sla_level).toBe('NORMAL_GREEN');
    expect(classifyKdsWaitSla('2026-11-22T10:08:00.000Z', now).sla_level).toBe('WARNING_YELLOW');
    expect(classifyKdsWaitSla('2026-11-22T10:02:00.000Z', now).sla_level).toBe('CRITICAL_RED');

    const variance = calculateDailyStocktakeVariance({
      openingQty: 5000,
      receivedInQty: 0,
      bomConsumedQty: 1000,
      actualCountedQty: 3800,
    });
    expect(variance.theoretical_closing_qty).toBe(4000);
    expect(variance.variance_qty).toBe(-200);
    expect(variance.is_abnormal_shrinkage).toBe(true);
  });
});
