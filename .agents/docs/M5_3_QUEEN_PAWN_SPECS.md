# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M5.3 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M5.3 - Frontend POS Dynamic VietQR Payment Modal, Idempotent Webhook Simulator & Web Audio Voice Payment Announcer + Vitest Suite (@cf19/web)`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M5_3_KING_CHARTER.md`, `M5_1_QUEEN_PAWN_SPECS.md`, `M5_2_QUEEN_PAWN_SPECS.md`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không dùng `any`, không để biến/import thừa (`noUnusedLocals: true`, `noUnusedParameters: true`), dùng import không đuôi `.js` trong `@cf19/web` (`moduleResolution: "bundler"`).
  - Bảo toàn 100% **56/56 bài test hiện có của `@cf19/web`**.
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại. Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 3 files trong `@cf19/web`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\web\src\api\vietqrApi.ts` (Tạo mới)
  2. `C:\bib\cf_19\apps\web\src\utils\voiceSpeakerAnnouncer.ts` (Tạo mới)
  3. `C:\bib\cf_19\apps\web\src\features\pos\PosDynamicVietQrModal.tsx` (Tạo mới)

### File 1: `C:\bib\cf_19\apps\web\src\api\vietqrApi.ts`

```ts
import {
  SEED_IDS,
  buildEmvCoDynamicVietQrPayload,
  buildVoiceAnnouncementScript,
  extractVietQrRefFromTransferContent,
  verifyEmvCoPayloadCrc,
  type EmvCoVietQrPayloadDTO,
  type PaymentWebhookLogDto,
  type PosOrderFullDto,
  type SimulateVietQrWebhookInput,
  type VietQrBankAccountConfigDto,
  type VietQrBankingWebhookPayloadInput,
  type VietQrWebhookProcessResultDTO,
} from '@cf19/shared';
import { ApiClientError, type ApiCallResult } from './apiClient';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '';

export interface GenerateVietQrOverrides {
  bank_bin?: string;
  account_number?: string;
  account_name?: string;
  merchant_city?: string;
}

const DEFAULT_OFFLINE_BANK_ACCOUNT: VietQrBankAccountConfigDto = {
  bank_bin: '970436',
  bank_short_name: 'Vietcombank',
  account_number: '1019001919',
  account_name: 'CF19 TAY NGUYEN COFFEE',
  merchant_city: 'BUON MA THUOT',
};

const OFFLINE_STORE_BANK_ACCOUNTS: Readonly<Record<string, VietQrBankAccountConfigDto>> = {
  [SEED_IDS.stores.store01]: {
    bank_bin: '970436',
    bank_short_name: 'Vietcombank',
    account_number: '1019001901',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
  [SEED_IDS.stores.store02]: {
    bank_bin: '970422',
    bank_short_name: 'MB Bank',
    account_number: '1900191902',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
  [SEED_IDS.stores.store03]: {
    bank_bin: '970436',
    bank_short_name: 'Vietcombank',
    account_number: '1019001903',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
  [SEED_IDS.stores.store04]: {
    bank_bin: '970422',
    bank_short_name: 'MB Bank',
    account_number: '1900191904',
    account_name: 'CF19 TAY NGUYEN COFFEE',
    merchant_city: 'BUON MA THUOT',
  },
};

interface OfflineVietQrState {
  ordersById: Map<string, PosOrderFullDto>;
  webhookLogs: PaymentWebhookLogDto[];
}

function createInitialOfflineVietQrState(): OfflineVietQrState {
  return {
    ordersById: new Map<string, PosOrderFullDto>(),
    webhookLogs: [],
  };
}

let offlineState: OfflineVietQrState = createInitialOfflineVietQrState();

export function resetOfflineVietQrState(): void {
  offlineState = createInitialOfflineVietQrState();
}

export function registerOfflinePosOrderForVietQr(order: PosOrderFullDto): void {
  offlineState.ordersById.set(order.id, structuredClone(order));
}

export function getOfflineVietQrOrderById(orderId: string): PosOrderFullDto | null {
  const found = offlineState.ordersById.get(orderId);
  return found ? structuredClone(found) : null;
}

function resolveBankShortName(bankBin: string, fallback: string): string {
  if (bankBin === '970436') return 'Vietcombank';
  if (bankBin === '970422') return 'MB Bank';
  if (bankBin === '970415') return 'VietinBank';
  if (bankBin === '970418') return 'BIDV';
  if (bankBin === '970407') return 'Techcombank';
  return fallback;
}

function buildFallbackRefCode(orderCode: string): string {
  return `VQR-${orderCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
}

export function offlineGenerateOrderVietQr(
  storeId: string,
  orderId: string,
  overrides: GenerateVietQrOverrides = {},
): EmvCoVietQrPayloadDTO {
  const order = offlineState.ordersById.get(orderId);
  if (!order) {
    throw new ApiClientError(404, 'ORDER_NOT_FOUND', `POS order ${orderId} not found`);
  }
  if (order.store_id !== storeId) {
    throw new ApiClientError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS order ${orderId} does not belong to store ${storeId}`,
    );
  }
  if (order.payment_status === 'VOIDED') {
    throw new ApiClientError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot generate VietQR for voided order ${order.order_code}`,
    );
  }
  if (order.total_amount_vnd <= 0) {
    throw new ApiClientError(
      400,
      'EMVCO_INVALID_AMOUNT',
      `Order ${order.order_code} total_amount_vnd must be greater than zero`,
    );
  }

  const nowIso = new Date().toISOString();
  if (!order.vietqr_ref_code || order.vietqr_ref_code.trim().length === 0) {
    order.vietqr_ref_code = buildFallbackRefCode(order.order_code);
    order.updated_at = nowIso;
  }

  const baseBank =
    OFFLINE_STORE_BANK_ACCOUNTS[order.store_id] ?? DEFAULT_OFFLINE_BANK_ACCOUNT;
  const bankBin = overrides.bank_bin ?? baseBank.bank_bin;
  const accountNumber = overrides.account_number ?? baseBank.account_number;
  const accountName = overrides.account_name ?? baseBank.account_name;
  const merchantCity = overrides.merchant_city ?? baseBank.merchant_city;
  const bankShortName = resolveBankShortName(bankBin, baseBank.bank_short_name);

  const built = buildEmvCoDynamicVietQrPayload({
    bank_bin: bankBin,
    account_number: accountNumber,
    amount_vnd: order.total_amount_vnd,
    order_code: order.order_code,
    vietqr_ref_code: order.vietqr_ref_code,
    merchant_name: accountName,
    merchant_city: merchantCity,
  });

  if (!verifyEmvCoPayloadCrc(built.emvco_payload)) {
    throw new ApiClientError(
      500,
      'EMVCO_CRC_GENERATION_FAILED',
      'Generated EMVCo payload failed internal CRC16-CCITT verification',
    );
  }

  return {
    order_id: order.id,
    store_id: order.store_id,
    order_code: order.order_code,
    vietqr_ref_code: order.vietqr_ref_code,
    amount_vnd: order.total_amount_vnd,
    payment_status: order.payment_status,
    bank_bin: bankBin,
    bank_short_name: bankShortName,
    account_number: accountNumber,
    account_name: built.merchant_name,
    merchant_city: built.merchant_city,
    emvco_payload: built.emvco_payload,
    crc16_hex: built.crc16_hex,
    is_dynamic: true,
    generated_at: nowIso,
  };
}

export function offlineProcessBankingWebhook(
  input: VietQrBankingWebhookPayloadInput,
): VietQrWebhookProcessResultDTO {
  const idempotencyKey = input.idempotency_key.trim();
  const bankTxId = input.bank_tx_id.trim();

  const existingLog = offlineState.webhookLogs.find(
    (log) =>
      log.idempotency_key === idempotencyKey || log.bank_tx_id === bankTxId,
  );
  if (existingLog) {
    const existingOrder = existingLog.order_id
      ? offlineState.ordersById.get(existingLog.order_id)
      : undefined;
    return {
      status: 'IDEMPOTENT_REPLAY',
      already_processed: true,
      should_trigger_speaker: false,
      webhook_log_id: existingLog.id,
      idempotency_key: existingLog.idempotency_key,
      bank_tx_id: existingLog.bank_tx_id,
      store_id: existingLog.store_id,
      order_id: existingLog.order_id,
      order_code: existingOrder?.order_code ?? null,
      vietqr_ref_code: existingOrder?.vietqr_ref_code ?? null,
      amount_vnd: existingLog.amount_vnd,
      order_total_vnd: existingOrder?.total_amount_vnd ?? null,
      payment_status: existingOrder?.payment_status ?? null,
      processed_at: existingLog.processed_at,
      speaker_announcement: null,
    };
  }

  const extractedRef =
    input.vietqr_ref_code?.trim().toUpperCase() ??
    extractVietQrRefFromTransferContent(input.transfer_content);

  const allOrders = Array.from(offlineState.ordersById.values());
  let order: PosOrderFullDto | undefined;

  if (input.order_id) {
    order = offlineState.ordersById.get(input.order_id);
  }
  if (!order && extractedRef) {
    order = allOrders.find(
      (o) =>
        o.vietqr_ref_code?.toUpperCase() === extractedRef ||
        o.order_code.toUpperCase() === extractedRef ||
        buildFallbackRefCode(o.order_code) === extractedRef,
    );
  }
  if (!order) {
    const upperMemo = input.transfer_content.toUpperCase();
    order = allOrders.find(
      (o) =>
        (o.vietqr_ref_code && upperMemo.includes(o.vietqr_ref_code.toUpperCase())) ||
        upperMemo.includes(o.order_code.toUpperCase()),
    );
  }

  if (!order) {
    throw new ApiClientError(
      404,
      'ORDER_NOT_FOUND_FOR_WEBHOOK',
      `No matching POS order found for transfer content "${input.transfer_content}"`,
    );
  }

  if (order.payment_status === 'VOIDED') {
    throw new ApiClientError(
      409,
      'ORDER_ALREADY_VOIDED',
      `Cannot reconcile payment for voided order ${order.order_code}`,
    );
  }

  if (order.payment_status === 'PAID') {
    throw new ApiClientError(
      409,
      'ORDER_ALREADY_PAID',
      `Order ${order.order_code} is already paid`,
    );
  }

  if (input.amount_vnd < order.total_amount_vnd) {
    throw new ApiClientError(
      409,
      'WEBHOOK_AMOUNT_MISMATCH',
      `Received ${input.amount_vnd} VND is less than order total ${order.total_amount_vnd} VND for ${order.order_code}`,
    );
  }

  const nowIso = new Date().toISOString();
  const resolvedRef =
    order.vietqr_ref_code ?? extractedRef ?? buildFallbackRefCode(order.order_code);

  const logEntry: PaymentWebhookLogDto = {
    id: crypto.randomUUID(),
    idempotency_key: idempotencyKey,
    store_id: order.store_id,
    order_id: order.id,
    amount_vnd: input.amount_vnd,
    bank_tx_id: bankTxId,
    raw_payload: {
      ...input,
      resolved_vietqr_ref_code: resolvedRef,
    },
    processed_at: nowIso,
    created_at: nowIso,
  };

  offlineState.webhookLogs.unshift(logEntry);

  order.payment_status = 'PAID';
  order.payment_method = 'VIETQR';
  order.vietqr_ref_code = resolvedRef;
  order.updated_at = nowIso;

  const speakerAnnouncement = buildVoiceAnnouncementScript({
    order_id: order.id,
    order_code: order.order_code,
    store_id: order.store_id,
    amount_vnd: input.amount_vnd,
    vietqr_ref_code: resolvedRef,
    generated_at: nowIso,
  });

  return {
    status: 'RECONCILED_PAID',
    already_processed: false,
    should_trigger_speaker: true,
    webhook_log_id: logEntry.id,
    idempotency_key: logEntry.idempotency_key,
    bank_tx_id: logEntry.bank_tx_id,
    store_id: order.store_id,
    order_id: order.id,
    order_code: order.order_code,
    vietqr_ref_code: resolvedRef,
    amount_vnd: input.amount_vnd,
    order_total_vnd: order.total_amount_vnd,
    payment_status: order.payment_status,
    processed_at: nowIso,
    speaker_announcement: speakerAnnouncement,
  };
}

export function offlineSimulateOrderWebhook(
  storeId: string,
  orderId: string,
  options: Partial<SimulateVietQrWebhookInput> = {},
): VietQrWebhookProcessResultDTO {
  const order = offlineState.ordersById.get(orderId);
  if (!order) {
    throw new ApiClientError(404, 'ORDER_NOT_FOUND', `POS order ${orderId} not found`);
  }
  if (order.store_id !== storeId) {
    throw new ApiClientError(
      403,
      'FORBIDDEN_CROSS_TENANT_ACCESS',
      `POS order ${orderId} does not belong to store ${storeId}`,
    );
  }

  const refCode = order.vietqr_ref_code ?? buildFallbackRefCode(order.order_code);
  const amountVnd = options.amount_vnd ?? order.total_amount_vnd;
  const transferContent =
    options.transfer_content ?? `MBVCB.SIM.${refCode} thanh toan ${order.order_code}`;

  if (options.simulate_duplicate) {
    const existingForOrder = offlineState.webhookLogs.find(
      (log) => log.order_id === order.id,
    );
    if (existingForOrder) {
      return offlineProcessBankingWebhook({
        idempotency_key: existingForOrder.idempotency_key,
        bank_tx_id: existingForOrder.bank_tx_id,
        amount_vnd: existingForOrder.amount_vnd,
        transfer_content: transferContent,
        order_id: order.id,
        vietqr_ref_code: refCode,
      });
    }

    const sharedKey = options.idempotency_key ?? `SIM-DUP-${order.order_code}`;
    const sharedTx = options.bank_tx_id ?? `FTSIMDUP${Date.now().toString().slice(-8)}`;

    offlineProcessBankingWebhook({
      idempotency_key: sharedKey,
      bank_tx_id: sharedTx,
      amount_vnd: amountVnd,
      transfer_content: transferContent,
      order_id: order.id,
      vietqr_ref_code: refCode,
    });

    return offlineProcessBankingWebhook({
      idempotency_key: sharedKey,
      bank_tx_id: sharedTx,
      amount_vnd: amountVnd,
      transfer_content: transferContent,
      order_id: order.id,
      vietqr_ref_code: refCode,
    });
  }

  return offlineProcessBankingWebhook({
    idempotency_key:
      options.idempotency_key ?? `SIM-${order.order_code}-${crypto.randomUUID().slice(0, 8)}`,
    bank_tx_id:
      options.bank_tx_id ?? `FTSIM${Date.now().toString().slice(-8)}${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    amount_vnd: amountVnd,
    transfer_content: transferContent,
    order_id: order.id,
    vietqr_ref_code: refCode,
  });
}

export function offlineListWebhookLogs(
  storeId: string,
  orderId?: string,
  limit: number = 50,
): PaymentWebhookLogDto[] {
  return offlineState.webhookLogs
    .filter((log) => {
      if (log.store_id !== storeId) return false;
      if (orderId && log.order_id !== orderId) return false;
      return true;
    })
    .sort((a, b) => b.processed_at.localeCompare(a.processed_at))
    .slice(0, limit)
    .map((log) => structuredClone(log));
}

async function vietqrFetchJson<T>(
  path: string,
  actorId: string | null,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (actorId) {
    headers.set('Authorization', `Bearer dev:${actorId}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const body = (await response.json()) as {
    data?: T;
    error?: { code?: string; message?: string };
  };

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      body.error?.code ?? 'VIETQR_API_ERROR',
      body.error?.message ?? `HTTP ${response.status}`,
    );
  }
  return body.data as T;
}

export async function generateOrderVietQrApi(
  actorId: string,
  storeId: string,
  orderId: string,
  overrides: GenerateVietQrOverrides = {},
): Promise<ApiCallResult<EmvCoVietQrPayloadDTO>> {
  try {
    const data = await vietqrFetchJson<EmvCoVietQrPayloadDTO>(
      `/api/v1/vietqr/stores/${storeId}/orders/${orderId}/generate`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify(overrides),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineGenerateOrderVietQr(storeId, orderId, overrides),
      source: 'offline_fallback',
    };
  }
}

export async function sendBankingWebhookIpnApi(
  payload: VietQrBankingWebhookPayloadInput,
  webhookSecret?: string,
): Promise<ApiCallResult<VietQrWebhookProcessResultDTO>> {
  try {
    const headers: Record<string, string> = {};
    if (webhookSecret && webhookSecret.trim().length > 0) {
      headers['x-webhook-secret'] = webhookSecret.trim();
    }
    const data = await vietqrFetchJson<VietQrWebhookProcessResultDTO>(
      '/api/v1/vietqr/webhook/ipn',
      null,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineProcessBankingWebhook(payload),
      source: 'offline_fallback',
    };
  }
}

export async function simulateOrderWebhookApi(
  actorId: string,
  storeId: string,
  orderId: string,
  options: Partial<SimulateVietQrWebhookInput> = {},
): Promise<ApiCallResult<VietQrWebhookProcessResultDTO>> {
  try {
    const data = await vietqrFetchJson<VietQrWebhookProcessResultDTO>(
      `/api/v1/vietqr/stores/${storeId}/orders/${orderId}/simulate-webhook`,
      actorId,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineSimulateOrderWebhook(storeId, orderId, options),
      source: 'offline_fallback',
    };
  }
}

export async function fetchStoreWebhookLogsApi(
  actorId: string,
  storeId: string,
  orderId?: string,
  limit: number = 50,
): Promise<ApiCallResult<PaymentWebhookLogDto[]>> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (orderId) {
    params.set('order_id', orderId);
  }

  try {
    const data = await vietqrFetchJson<PaymentWebhookLogDto[]>(
      `/api/v1/vietqr/stores/${storeId}/webhook-logs?${params.toString()}`,
      actorId,
    );
    return { data, source: 'live_api' };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    return {
      data: offlineListWebhookLogs(storeId, orderId, limit),
      source: 'offline_fallback',
    };
  }
}
```

### File 2: `C:\bib\cf_19\apps\web\src\utils\voiceSpeakerAnnouncer.ts`

```ts
import type {
  SpeakerAnnouncementPayloadDTO,
  VietQrWebhookProcessResultDTO,
} from '@cf19/shared';

export type SpeakerAnnouncementMode =
  | 'WEB_SPEECH_API'
  | 'SIMULATED_CONSOLE'
  | 'MUTED';

export interface SpeakerAnnouncementResult {
  announced: boolean;
  script: string;
  mode: SpeakerAnnouncementMode;
  chimePlayed: boolean;
}

export interface SpeakerHistoryEntry {
  id: string;
  order_id: string;
  order_code: string;
  store_id: string;
  amount_vnd: number;
  formatted_amount_vnd: string;
  script: string;
  mode: SpeakerAnnouncementMode;
  announced: boolean;
  chime_played: boolean;
  announced_at: string;
}

export interface WebhookSpeakerTriggerOutcome {
  triggered: boolean;
  announced: boolean;
  script: string | null;
  mode: SpeakerAnnouncementMode | 'SKIPPED_IDEMPOTENT';
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const MAX_HISTORY_ENTRIES = 50;
let speakerHistory: SpeakerHistoryEntry[] = [];
let globalSpeakerMuted = false;

export function isSpeakerMuted(): boolean {
  return globalSpeakerMuted;
}

export function setSpeakerMuted(muted: boolean): void {
  globalSpeakerMuted = muted;
}

export function getSpeakerAnnouncementHistory(): SpeakerHistoryEntry[] {
  return speakerHistory.map((entry) => ({ ...entry }));
}

export function clearSpeakerAnnouncementHistory(): void {
  speakerHistory = [];
}

/**
 * Play a 4-note payment success chime via Web Audio API.
 * Safe in headless/Node/Vitest environments: returns false without throwing.
 */
export function playPaymentSuccessChime(frequenciesHz: readonly number[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const win = window as WindowWithWebkitAudio;
  const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
  if (typeof AudioCtx !== 'function' || frequenciesHz.length === 0) {
    return false;
  }

  try {
    const ctx = new AudioCtx();
    const startBase = ctx.currentTime;
    const noteDurationSec = 0.14;

    frequenciesHz.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = startBase + idx * noteDurationSec;
      const noteEnd = noteStart + noteDurationSec;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.01);
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Announce a confirmed VietQR payment in Vietnamese via Web Audio chime + SpeechSynthesis API.
 * Records every attempt to in-memory speaker history for Cashier UI visibility and Vitest assertions.
 */
export function announceVietQrPaymentVoice(
  announcement: SpeakerAnnouncementPayloadDTO,
  options: { muted?: boolean } = {},
): SpeakerAnnouncementResult {
  const isMuted = options.muted ?? globalSpeakerMuted;
  const script = announcement.message_vi;
  const nowIso = new Date().toISOString();

  if (isMuted) {
    speakerHistory.unshift({
      id: crypto.randomUUID(),
      order_id: announcement.order_id,
      order_code: announcement.order_code,
      store_id: announcement.store_id,
      amount_vnd: announcement.amount_vnd,
      formatted_amount_vnd: announcement.formatted_amount_vnd,
      script,
      mode: 'MUTED',
      announced: false,
      chime_played: false,
      announced_at: nowIso,
    });
    speakerHistory = speakerHistory.slice(0, MAX_HISTORY_ENTRIES);

    return {
      announced: false,
      script,
      mode: 'MUTED',
      chimePlayed: false,
    };
  }

  const chimePlayed = playPaymentSuccessChime(announcement.chime_frequencies_hz);
  let mode: SpeakerAnnouncementMode = 'SIMULATED_CONSOLE';

  if (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof SpeechSynthesisUtterance === 'function'
  ) {
    try {
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = announcement.lang;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      mode = 'WEB_SPEECH_API';
    } catch {
      mode = 'SIMULATED_CONSOLE';
    }
  }

  speakerHistory.unshift({
    id: crypto.randomUUID(),
    order_id: announcement.order_id,
    order_code: announcement.order_code,
    store_id: announcement.store_id,
    amount_vnd: announcement.amount_vnd,
    formatted_amount_vnd: announcement.formatted_amount_vnd,
    script,
    mode,
    announced: true,
    chime_played: chimePlayed,
    announced_at: nowIso,
  });
  speakerHistory = speakerHistory.slice(0, MAX_HISTORY_ENTRIES);

  return {
    announced: true,
    script,
    mode,
    chimePlayed,
  };
}

/**
 * Strictly honors `result.should_trigger_speaker` so IDEMPOTENT_REPLAY webhooks
 * NEVER re-announce a payment on the cashier speaker.
 */
export function processWebhookSpeakerTrigger(
  result: VietQrWebhookProcessResultDTO,
  options: { muted?: boolean } = {},
): WebhookSpeakerTriggerOutcome {
  if (!result.should_trigger_speaker || !result.speaker_announcement) {
    return {
      triggered: false,
      announced: false,
      script: null,
      mode: 'SKIPPED_IDEMPOTENT',
    };
  }

  const outcome = announceVietQrPaymentVoice(result.speaker_announcement, options);
  return {
    triggered: true,
    announced: outcome.announced,
    script: outcome.script,
    mode: outcome.mode,
  };
}
```

### File 3: `C:\bib\cf_19\apps\web\src\features\pos\PosDynamicVietQrModal.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  verifyEmvCoPayloadCrc,
  type EmvCoVietQrPayloadDTO,
  type PosOrderFullDto,
  type VietQrWebhookProcessResultDTO,
} from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  generateOrderVietQrApi,
  registerOfflinePosOrderForVietQr,
  simulateOrderWebhookApi,
} from '../../api/vietqrApi';
import {
  isSpeakerMuted,
  processWebhookSpeakerTrigger,
} from '../../utils/voiceSpeakerAnnouncer';

export interface PosDynamicVietQrModalProps {
  isOpen: boolean;
  actorId: string;
  storeId: string;
  order: PosOrderFullDto | null;
  onClose: () => void;
  onWebhookProcessed: (result: VietQrWebhookProcessResultDTO) => void;
}

const QR_GRID_SIZE = 21;

function isFinderModule(row: number, col: number): boolean {
  const inBox = (r0: number, c0: number): boolean => {
    const dr = row - r0;
    const dc = col - c0;
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return false;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    return dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
  };
  return inBox(0, 0) || inBox(0, QR_GRID_SIZE - 7) || inBox(QR_GRID_SIZE - 7, 0);
}

function isFinderQuietZone(row: number, col: number): boolean {
  const inZone = (r0: number, c0: number): boolean =>
    row >= r0 - 1 && row <= r0 + 7 && col >= c0 - 1 && col <= c0 + 7;
  return (
    inZone(0, 0) ||
    inZone(0, QR_GRID_SIZE - 7) ||
    inZone(QR_GRID_SIZE - 7, 0)
  );
}

function buildDeterministicQrMatrix(payload: string): boolean[][] {
  let seed = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  const matrix: boolean[][] = [];
  for (let r = 0; r < QR_GRID_SIZE; r += 1) {
    const rowArr: boolean[] = [];
    for (let c = 0; c < QR_GRID_SIZE; c += 1) {
      if (isFinderModule(r, c)) {
        rowArr.push(true);
      } else if (isFinderQuietZone(r, c)) {
        rowArr.push(false);
      } else {
        const idx = (r * QR_GRID_SIZE + c) % Math.max(1, payload.length);
        const charVal = payload.charCodeAt(idx);
        const bit = ((seed >>> ((r + c) % 24)) ^ (charVal + r * 31 + c * 17)) & 1;
        rowArr.push(bit === 1);
      }
    }
    matrix.push(rowArr);
  }
  return matrix;
}

export function PosDynamicVietQrModal({
  isOpen,
  actorId,
  storeId,
  order,
  onClose,
  onWebhookProcessed,
}: PosDynamicVietQrModalProps) {
  const [qrData, setQrData] = useState<EmvCoVietQrPayloadDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [webhookBanner, setWebhookBanner] = useState<{
    kind: 'success' | 'replay';
    title: string;
    detail: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !order) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setWebhookBanner(null);
    setCopied(false);

    registerOfflinePosOrderForVietQr(order);

    void generateOrderVietQrApi(actorId, storeId, order.id)
      .then((res) => {
        if (!cancelled) {
          setQrData(res.data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
        } else if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg('Không thể sinh mã EMVCo Dynamic VietQR.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, actorId, storeId, order]);

  const crcVerified = useMemo(
    () => (qrData ? verifyEmvCoPayloadCrc(qrData.emvco_payload) : false),
    [qrData],
  );

  const qrMatrix = useMemo(
    () => (qrData ? buildDeterministicQrMatrix(qrData.emvco_payload) : []),
    [qrData],
  );

  if (!isOpen || !order) {
    return null;
  }

  const handleCopyPayload = async () => {
    if (!qrData || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(qrData.emvco_payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleSimulateWebhook = async (simulateDuplicate: boolean) => {
    setSimulating(true);
    setErrorMsg(null);
    try {
      const res = await simulateOrderWebhookApi(actorId, storeId, order.id, {
        simulate_duplicate: simulateDuplicate,
      });

      const speakerOutcome = processWebhookSpeakerTrigger(res.data, {
        muted: isSpeakerMuted(),
      });

      if (res.data.status === 'RECONCILED_PAID') {
        setQrData((prev) =>
          prev ? { ...prev, payment_status: 'PAID' } : prev,
        );
        setWebhookBanner({
          kind: 'success',
          title: `RECONCILED_PAID • Đã gạch nợ thành công (${res.data.bank_tx_id})`,
          detail: speakerOutcome.script
            ? `Loa thu ngân (${speakerOutcome.mode}): "${speakerOutcome.script}"`
            : 'Đã xác nhận tiền vào tài khoản.',
        });
      } else {
        setWebhookBanner({
          kind: 'replay',
          title: 'IDEMPOTENT_REPLAY — Đã chặn gạch nợ trùng & không phát lại loa!',
          detail: `Idempotency Key ${res.data.idempotency_key} / Bank TX ${res.data.bank_tx_id} đã được xử lý trước đó.`,
        });
      }

      onWebhookProcessed(res.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể gửi tín hiệu giả lập Webhook ngân hàng.');
      }
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-indigo-300" />
            <div>
              <h3 className="font-bold text-base">
                Mã VietQR Động EMVCo NAPAS247 — {order.order_code}
              </h3>
              <p className="text-xs text-indigo-200">
                Mỗi hóa đơn POS có 1 mã QR riêng định danh số tiền + CRC16-CCITT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-indigo-200 hover:text-white"
            aria-label="Đóng modal VietQR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {loading && (
            <div className="py-10 text-center text-sm text-stone-500">
              Đang sinh chuỗi EMVCo NAPAS247 và tính checksum CRC16-CCITT...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {webhookBanner && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                webhookBanner.kind === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {webhookBanner.kind === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                )}
                <span>{webhookBanner.title}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>{webhookBanner.detail}</span>
              </div>
            </div>
          )}

          {qrData && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="flex flex-col items-center p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 space-y-3">
                <svg
                  viewBox={`0 0 ${QR_GRID_SIZE} ${QR_GRID_SIZE}`}
                  className="w-48 h-48 bg-white p-2 rounded-xl border border-stone-200 shadow-sm"
                  role="img"
                  aria-label={`Dynamic VietQR ${qrData.vietqr_ref_code}`}
                >
                  {qrMatrix.map((rowArr, r) =>
                    rowArr.map((filled, c) =>
                      filled ? (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width={1}
                          height={1}
                          fill="#1e1b4b"
                        />
                      ) : null,
                    ),
                  )}
                </svg>

                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
                    crcVerified
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    CRC16-CCITT: {qrData.crc16_hex} ({crcVerified ? 'VERIFIED' : 'INVALID'})
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-stone-900">
                      {qrData.bank_short_name} ({qrData.bank_bin})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Số tài khoản:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {qrData.account_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tên tài khoản:</span>
                    <span className="font-bold text-stone-900">{qrData.account_name}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                    <span className="text-stone-500">Số tiền cố định:</span>
                    <span className="font-mono font-extrabold text-base text-indigo-800">
                      {qrData.amount_vnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Nội dung CK bắt buộc:</span>
                    <span className="font-mono font-bold text-amber-800">
                      {qrData.vietqr_ref_code}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Trạng thái hóa đơn:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold ${
                        qrData.payment_status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {qrData.payment_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-600">
                      EMVCo Raw Payload (Tag 00–63)
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyPayload()}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? 'Đã copy' : 'Copy payload'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 text-emerald-300 font-mono text-[10px] break-all leading-relaxed">
                    {qrData.emvco_payload}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3">
            <div className="text-xs font-bold text-indigo-950">
              Giả Lập Tín Hiệu Ngân Hàng (Banking IPN Webhook Simulator)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={simulating || loading || qrData === null}
                onClick={() => void handleSimulateWebhook(false)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-40"
              >
                <Zap className="w-4 h-4 shrink-0" />
                Giả Lập Khách Quét QR Chuyển Khoản Thành Công (Webhook IPN)
              </button>
              <button
                type="button"
                disabled={simulating || loading || qrData === null}
                onClick={() => void handleSimulateWebhook(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                Bắn Lại Gói Tin Webhook Trùng (Test Chống Gạch Nợ Kép)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 3 files trong `@cf19/web`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\apps\web\src\features\pos\VietQrWebhookMonitorPanel.tsx` (Tạo mới)
  2. `C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx` (Overwrite — tích hợp `PosDynamicVietQrModal` & `VietQrWebhookMonitorPanel`, bảo toàn 100% tính năng M4.3)
  3. `C:\bib\cf_19\apps\web\src\__tests__\m5-vietqr-announcer-ui.test.ts` (Tạo mới — 16 Vitest Frontend test cases)

### File 1: `C:\bib\cf_19\apps\web\src\features\pos\VietQrWebhookMonitorPanel.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { PaymentWebhookLogDto } from '@cf19/shared';
import { ApiClientError } from '../../api/apiClient';
import {
  fetchStoreWebhookLogsApi,
  sendBankingWebhookIpnApi,
} from '../../api/vietqrApi';
import {
  getSpeakerAnnouncementHistory,
  isSpeakerMuted,
  processWebhookSpeakerTrigger,
  setSpeakerMuted,
  type SpeakerHistoryEntry,
} from '../../utils/voiceSpeakerAnnouncer';

export interface VietQrWebhookMonitorPanelProps {
  actorId: string;
  storeId: string;
  refreshSignal: number;
  onReconciled?: () => void;
}

export function VietQrWebhookMonitorPanel({
  actorId,
  storeId,
  refreshSignal,
  onReconciled,
}: VietQrWebhookMonitorPanelProps) {
  const [logs, setLogs] = useState<PaymentWebhookLogDto[]>([]);
  const [speakerLogs, setSpeakerLogs] = useState<SpeakerHistoryEntry[]>([]);
  const [muted, setMuted] = useState<boolean>(() => isSpeakerMuted());
  const [transferContent, setTransferContent] = useState<string>('');
  const [amountVnd, setAmountVnd] = useState<string>('58000');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [bankTxId, setBankTxId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetchStoreWebhookLogsApi(actorId, storeId, undefined, 25);
      setLogs(res.data);
    } catch {
      setLogs([]);
    }
    setSpeakerLogs(getSpeakerAnnouncementHistory());
  }, [actorId, storeId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshSignal]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSpeakerMuted(next);
  };

  const handleSendCustomIpn = async () => {
    const parsedAmount = Number(amountVnd);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Số tiền chuyển khoản IPN phải là số nguyên VNĐ lớn hơn 0.');
      return;
    }
    if (transferContent.trim().length < 3) {
      setErrorMsg('Vui lòng nhập nội dung chuyển khoản có chứa mã tham chiếu VQR.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    try {
      const key =
        idempotencyKey.trim() || `IPN-UI-${Date.now().toString().slice(-6)}`;
      const txId =
        bankTxId.trim() || `FTUI${Date.now().toString().slice(-8)}`;

      const res = await sendBankingWebhookIpnApi({
        idempotency_key: key,
        bank_tx_id: txId,
        amount_vnd: parsedAmount,
        transfer_content: transferContent.trim(),
      });

      const speakerOutcome = processWebhookSpeakerTrigger(res.data, { muted });
      setSpeakerLogs(getSpeakerAnnouncementHistory());

      if (res.data.status === 'RECONCILED_PAID') {
        setFeedbackMsg(
          `RECONCILED_PAID (${res.data.order_code ?? 'ORDER'}) • Loa: ${speakerOutcome.mode}`,
        );
        onReconciled?.();
      } else {
        setFeedbackMsg(
          `IDEMPOTENT_REPLAY • Gói tin ${res.data.idempotency_key} đã xử lý trước đó (không phát lại loa).`,
        );
      }

      await loadLogs();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Gửi gói tin IPN thất bại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-700" />
          <div>
            <h2 className="font-bold text-base text-stone-900">
              Giám Sát Webhook/IPN Ngân Hàng &amp; Loa Thông Báo Thanh Toán
            </h2>
            <p className="text-xs text-stone-500">
              Theo dõi nhật ký gạch nợ bất biến (`payment_webhook_logs`) và lịch sử phát loa Web Audio thu ngân
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              muted
                ? 'bg-stone-100 text-stone-600 border-stone-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {muted ? (
              <>
                <VolumeX className="w-4 h-4" />
                Loa Thu Ngân: Đang Tắt Tiếng
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                Loa Thu Ngân: Đang Bật
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void loadLogs()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
        <div className="text-xs font-bold text-stone-800">
          Công Cụ Kiểm Thử Gói Tin IPN Tùy Chỉnh (Test Đúng Tiền / Thiếu Tiền 409)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
          <input
            type="text"
            value={transferContent}
            onChange={(e) => setTransferContent(e.target.value)}
            placeholder="Nội dung CK (vd: MBVCB.998.VQR-...)"
            className="md:col-span-2 rounded-xl border border-stone-300 px-3 py-2 bg-white"
          />
          <input
            type="number"
            value={amountVnd}
            onChange={(e) => setAmountVnd(e.target.value)}
            placeholder="Số tiền VNĐ"
            className="rounded-xl border border-stone-300 px-3 py-2 bg-white font-mono"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSendCustomIpn()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-700 text-white font-bold px-3 py-2 hover:bg-indigo-800 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            Bắn IPN Ngân Hàng
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <input
            type="text"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            placeholder="Idempotency Key (tùy chọn — để trống tự sinh)"
            className="rounded-xl border border-stone-300 px-3 py-1.5 bg-white font-mono"
          />
          <input
            type="text"
            value={bankTxId}
            onChange={(e) => setBankTxId(e.target.value)}
            placeholder="Mã GD Ngân hàng bank_tx_id (tùy chọn)"
            className="rounded-xl border border-stone-300 px-3 py-1.5 bg-white font-mono"
          />
        </div>

        {feedbackMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wide text-stone-600">
            Nhật Ký Webhook Ngân Hàng ({logs.length} giao dịch)
          </h3>
          {logs.length === 0 ? (
            <p className="text-xs text-stone-400 p-4 rounded-xl border border-dashed border-stone-200 text-center">
              Chưa có gói tin Webhook/IPN ngân hàng nào được ghi nhận tại chi nhánh.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs space-y-1"
                >
                  <div className="flex justify-between font-mono font-bold text-stone-900">
                    <span>{log.bank_tx_id}</span>
                    <span className="text-emerald-700">
                      +{log.amount_vnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono truncate">
                    Key: {log.idempotency_key}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wide text-stone-600">
            Nhật Ký Loa Thông Báo Thu Ngân ({speakerLogs.length} lượt)
          </h3>
          {speakerLogs.length === 0 ? (
            <p className="text-xs text-stone-400 p-4 rounded-xl border border-dashed border-stone-200 text-center">
              Chưa có thông báo âm thanh nào được phát trong phiên làm việc này.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {speakerLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-indigo-900">
                      {entry.order_code}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-[10px] font-mono">
                      {entry.mode}
                    </span>
                  </div>
                  <p className="text-stone-700 leading-snug">{entry.script}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
```

### File 2: `C:\bib\cf_19\apps\web\src\features\pos\PosTerminalWorkbench.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { registerOfflinePosOrderForVietQr } from '../../api/vietqrApi';
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
  actorId: string;
  storeId: string;
  shiftId: string;
}

export function PosTerminalWorkbench({
  actorId,
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
    const [catRes, ordRes] = await Promise.all([
      fetchStorePosCatalogApi(actorId, storeId),
      fetchStorePosOrdersApi(actorId, storeId),
    ]);
    setCatalog(catRes.data);
    setOrders(ordRes.data);
  }, [actorId, storeId]);

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
        `Chế độ Offline: Đã lưu đơn ${offlineCode} vào hàng đợi cục bộ (sẵn sàng đồng bộ Idempotent khi có mạng).`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPosOrderApi(actorId, storeId, {
        shift_id: shiftId,
        payment_method: paymentMethod,
        customer_phone: customerPhone.trim() || undefined,
        items: itemsPayload,
      });
      clearCart();
      setCustomerPhone('');
      registerOfflinePosOrderForVietQr(res.data.order);
      setStatusMessage(
        `Đã tạo đơn ${res.data.order.order_code} (${res.data.order.payment_method} • ${res.data.order.total_amount_vnd.toLocaleString('vi-VN')} đ)`,
      );

      if (
        res.data.order.payment_method === 'VIETQR' &&
        res.data.order.payment_status === 'PENDING'
      ) {
        setVietQrTarget(res.data.order);
      } else {
        setReceiptModal({
          orderId: res.data.order.id,
          orderCode: res.data.order.order_code,
          text: res.data.thermal_receipt_text,
          canVoid: res.data.order.payment_status !== 'VOIDED',
        });
      }

      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể tạo đơn POS.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSyncOffline = async () => {
    if (offlineQueue.length === 0) return;
    setErrorMsg(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const res = await syncOfflinePosOrdersApi(actorId, storeId, {
        shift_id: shiftId,
        orders: offlineQueue,
      });
      removeSyncedOfflineOrders(offlineQueue.map((o) => o.client_order_code));
      setStatusMessage(
        `Đồng bộ Offline hoàn tất: ${res.data.synced_new_count} đơn mới, ${res.data.idempotent_existing_count} đơn đã tồn tại (Idempotent).`,
      );
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(`[${err.status} ${err.code}] ${err.message}`);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể đồng bộ lô đơn Offline.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceipt = async (ord: PosOrderFullDto) => {
    const res = await fetchOrderReceiptApi(actorId, storeId, ord.id);
    setReceiptModal({
      orderId: ord.id,
      orderCode: ord.order_code,
      text: res.data.thermal_receipt_text,
      canVoid: ord.payment_status !== 'VOIDED',
    });
  };

  const handleOpenVietQr = (ord: PosOrderFullDto) => {
    registerOfflinePosOrderForVietQr(ord);
    setVietQrTarget(ord);
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
    const res = await voidPosOrder(actorId, storeId, voidTarget.id, payload);
    setStatusMessage(
      `Đã hủy đơn ${res.order.order_code} thành công (Audit ID: ${res.approval_audit_id})`,
    );
    setReceiptModal(null);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-stone-800">
            Hệ số giá vùng chi nhánh:{' '}
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
                Đang giả lập MẤT MẠNG (Offline Queue)
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Trực tuyến (Online Sync)
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
            disabled={offlineQueue.length === 0 || submitting}
            onClick={() => void handleBatchSyncOffline()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 text-white text-xs font-semibold hover:bg-indigo-800 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đồng Bộ Lô Đơn Offline Lên Server (Idempotent)
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
                  ? 'bg-amber-700 text-white'
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
                    ? 'bg-amber-700 text-white'
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
                  Chạm để chọn Size &amp; Topping
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
                <span>Giỏ Hàng POS ({cartItems.length} dòng)</span>
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
                Tiền Mặt (CASH)
              </button>
            </div>

            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="SĐT khách tích điểm (tùy chọn)"
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
              disabled={cartItems.length === 0 || submitting}
              onClick={() => void handleCheckout()}
              className="w-full py-3 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800 disabled:opacity-40"
            >
              {isOfflineMode
                ? 'Lưu Đơn Vào Hàng Đợi Offline'
                : paymentMethod === 'VIETQR'
                  ? 'Tạo Đơn & Mở Mã VietQR Động'
                  : 'Thanh Toán & In Hóa Đơn ESC/POS'}
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
                <span className="font-mono">{ord.payment_status}</span> •{' '}
                <strong className="font-mono text-amber-800">
                  {ord.total_amount_vnd.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex flex-wrap gap-2">
                {ord.payment_method === 'VIETQR' && ord.payment_status !== 'VOIDED' && (
                  <button
                    type="button"
                    onClick={() => handleOpenVietQr(ord)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-700 text-white font-semibold hover:bg-indigo-800"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Hiện Mã VietQR Động / Gạch Nợ IPN
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleOpenReceipt(ord)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 font-semibold hover:bg-stone-100"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Bill ESC/POS
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
        actorId={actorId}
        storeId={storeId}
        refreshSignal={webhookRefreshSignal}
        onReconciled={() => void loadData()}
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
        actorId={actorId}
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
```

### File 3: `C:\bib\cf_19\apps\web\src\__tests__\m5-vietqr-announcer-ui.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
  NAPAS_GUID,
  SEED_IDS,
  verifyEmvCoPayloadCrc,
  type PosOrderFullDto,
} from '@cf19/shared';
import { ApiClientError } from '../api/apiClient';
import {
  offlineCreatePosOrder,
  resetOfflinePosCatalogState,
} from '../api/posCatalogApi';
import {
  getOfflineVietQrOrderById,
  offlineGenerateOrderVietQr,
  offlineListWebhookLogs,
  offlineProcessBankingWebhook,
  offlineSimulateOrderWebhook,
  registerOfflinePosOrderForVietQr,
  resetOfflineVietQrState,
} from '../api/vietqrApi';
import {
  announceVietQrPaymentVoice,
  clearSpeakerAnnouncementHistory,
  getSpeakerAnnouncementHistory,
  isSpeakerMuted,
  playPaymentSuccessChime,
  processWebhookSpeakerTrigger,
  setSpeakerMuted,
} from '../utils/voiceSpeakerAnnouncer';

function createRegisteredPendingOrder(
  storeId: string = SEED_IDS.stores.store01,
  actorId: string = SEED_IDS.users.cashier01,
  clientOrderCode?: string,
): PosOrderFullDto {
  const created = offlineCreatePosOrder(actorId, storeId, {
    shift_id: SEED_IDS.posShifts.store01OpenShift,
    payment_method: 'VIETQR',
    client_order_code: clientOrderCode,
    items: [
      {
        product_id: SEED_IDS.menuProducts.caPheSuaDa,
        variant_id: SEED_IDS.menuVariants.caPheSuaDaL,
        modifier_ids: [SEED_IDS.menuModifiers.extraEspressoShot],
        quantity: 2,
      },
    ],
  });

  const order: PosOrderFullDto = {
    ...created.order,
    vietqr_ref_code: `VQR-${created.order.order_code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
  };
  registerOfflinePosOrderForVietQr(order);
  return order;
}

describe('M5.3 — @cf19/web Dynamic VietQR Client, Idempotent Webhook Simulator & Voice Speaker Announcer', () => {
  beforeEach(() => {
    resetOfflinePosCatalogState();
    resetOfflineVietQrState();
    clearSpeakerAnnouncementHistory();
    setSpeakerMuted(false);
  });

  it('1. offlineGenerateOrderVietQr builds verified NAPAS247 EMVCo Dynamic QR for Store 1 POS order', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-001',
    );

    const qr = offlineGenerateOrderVietQr(SEED_IDS.stores.store01, order.id);
    expect(qr.is_dynamic).toBe(true);
    expect(qr.bank_bin).toBe('970436');
    expect(qr.bank_short_name).toBe('Vietcombank');
    expect(qr.amount_vnd).toBe(order.total_amount_vnd);
    expect(qr.emvco_payload.startsWith('000201010212')).toBe(true);
    expect(qr.emvco_payload).toContain(NAPAS_GUID);
    expect(qr.emvco_payload).toContain(qr.vietqr_ref_code);
    expect(verifyEmvCoPayloadCrc(qr.emvco_payload)).toBe(true);
  });

  it('2. offlineGenerateOrderVietQr uses Store 2 MB Bank config and supports bank overrides', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store02,
      SEED_IDS.users.cashier02,
      'POS-S02-WEB-001',
    );

    const defaultQr = offlineGenerateOrderVietQr(SEED_IDS.stores.store02, order.id);
    expect(defaultQr.bank_bin).toBe('970422');
    expect(defaultQr.bank_short_name).toBe('MB Bank');
    expect(verifyEmvCoPayloadCrc(defaultQr.emvco_payload)).toBe(true);

    const overrideQr = offlineGenerateOrderVietQr(SEED_IDS.stores.store02, order.id, {
      bank_bin: '970418',
      account_number: '63110000191919',
    });
    expect(overrideQr.bank_bin).toBe('970418');
    expect(overrideQr.bank_short_name).toBe('BIDV');
    expect(overrideQr.emvco_payload).toContain('63110000191919');
    expect(verifyEmvCoPayloadCrc(overrideQr.emvco_payload)).toBe(true);
  });

  it('3. offlineGenerateOrderVietQr auto-generates VQR reference code when order has null vietqr_ref_code', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-NULLREF',
    );
    registerOfflinePosOrderForVietQr({ ...order, vietqr_ref_code: null });

    const qr = offlineGenerateOrderVietQr(SEED_IDS.stores.store01, order.id);
    expect(qr.vietqr_ref_code).toBe('VQR-POSS01WEBNULLREF');
    expect(verifyEmvCoPayloadCrc(qr.emvco_payload)).toBe(true);
  });

  it('4. offlineGenerateOrderVietQr rejects VOIDED orders with 409 ORDER_ALREADY_VOIDED', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-VOID',
    );
    registerOfflinePosOrderForVietQr({ ...order, payment_status: 'VOIDED' });

    expect(() =>
      offlineGenerateOrderVietQr(SEED_IDS.stores.store01, order.id),
    ).toThrow(ApiClientError);

    try {
      offlineGenerateOrderVietQr(SEED_IDS.stores.store01, order.id);
    } catch (err) {
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('ORDER_ALREADY_VOIDED');
    }
  });

  it('5. offlineGenerateOrderVietQr blocks cross-store order lookup with 403 FORBIDDEN_CROSS_TENANT_ACCESS', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store02,
      SEED_IDS.users.cashier02,
      'POS-S02-WEB-SCOPE',
    );

    try {
      offlineGenerateOrderVietQr(SEED_IDS.stores.store01, order.id);
      expect.unreachable('Expected cross-store error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(403);
      expect((err as ApiClientError).code).toBe('FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  });

  it('6. offlineProcessBankingWebhook extracts VQR ref from free-text bank memo and reconciles PENDING -> PAID', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-IPN1',
    );

    const result = offlineProcessBankingWebhook({
      idempotency_key: 'WEB-IPN-001',
      bank_tx_id: 'FTWEB20260001',
      amount_vnd: order.total_amount_vnd,
      transfer_content: `MBVCB.998123.${order.vietqr_ref_code} chuyen khoan`,
    });

    expect(result.status).toBe('RECONCILED_PAID');
    expect(result.already_processed).toBe(false);
    expect(result.should_trigger_speaker).toBe(true);
    expect(result.payment_status).toBe('PAID');
    expect(result.speaker_announcement?.chime_frequencies_hz).toEqual(
      DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
    );
    expect(getOfflineVietQrOrderById(order.id)?.payment_status).toBe('PAID');
    expect(offlineListWebhookLogs(SEED_IDS.stores.store01)).toHaveLength(1);
  });

  it('7. processWebhookSpeakerTrigger announces Vietnamese payment script once and logs history', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-VOICE1',
    );

    const webhookRes = offlineProcessBankingWebhook({
      idempotency_key: 'WEB-IPN-VOICE-01',
      bank_tx_id: 'FTWEB20260002',
      amount_vnd: order.total_amount_vnd,
      transfer_content: `TT ${order.vietqr_ref_code}`,
    });

    const outcome = processWebhookSpeakerTrigger(webhookRes);
    expect(outcome.triggered).toBe(true);
    expect(outcome.announced).toBe(true);
    expect(outcome.script).toContain('Ting ting! Đã nhận chuyển khoản');
    expect(outcome.script).toContain(order.order_code);
    expect(getSpeakerAnnouncementHistory()).toHaveLength(1);
  });

  it('8. Idempotent Webhook Replay (same idempotency_key) blocks duplicate reconciliation and suppresses 2nd speaker announcement', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-DUP1',
    );

    const payload = {
      idempotency_key: 'WEB-IPN-DUP-KEY',
      bank_tx_id: 'FTWEB20260003',
      amount_vnd: order.total_amount_vnd,
      transfer_content: `TT ${order.vietqr_ref_code}`,
    };

    const first = offlineProcessBankingWebhook(payload);
    const firstVoice = processWebhookSpeakerTrigger(first);
    expect(first.status).toBe('RECONCILED_PAID');
    expect(firstVoice.announced).toBe(true);

    const second = offlineProcessBankingWebhook(payload);
    const secondVoice = processWebhookSpeakerTrigger(second);
    expect(second.status).toBe('IDEMPOTENT_REPLAY');
    expect(second.already_processed).toBe(true);
    expect(second.should_trigger_speaker).toBe(false);
    expect(second.speaker_announcement).toBeNull();
    expect(secondVoice.triggered).toBe(false);
    expect(secondVoice.mode).toBe('SKIPPED_IDEMPOTENT');

    expect(offlineListWebhookLogs(SEED_IDS.stores.store01)).toHaveLength(1);
    expect(getSpeakerAnnouncementHistory()).toHaveLength(1);
  });

  it('9. Idempotent Webhook Replay (same bank_tx_id with new idempotency_key) suppresses 2nd announcement', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-DUP2',
    );

    const first = offlineProcessBankingWebhook({
      idempotency_key: 'WEB-IPN-TX-A',
      bank_tx_id: 'FTWEB20260004',
      amount_vnd: order.total_amount_vnd,
      transfer_content: `IBFT ${order.vietqr_ref_code}`,
    });
    processWebhookSpeakerTrigger(first);

    const second = offlineProcessBankingWebhook({
      idempotency_key: 'WEB-IPN-TX-B',
      bank_tx_id: 'FTWEB20260004',
      amount_vnd: order.total_amount_vnd,
      transfer_content: `IBFT ${order.vietqr_ref_code}`,
    });
    const secondVoice = processWebhookSpeakerTrigger(second);

    expect(second.status).toBe('IDEMPOTENT_REPLAY');
    expect(secondVoice.triggered).toBe(false);
    expect(getSpeakerAnnouncementHistory()).toHaveLength(1);
  });

  it('10. Rejects underpaid webhook with 409 WEBHOOK_AMOUNT_MISMATCH and keeps order PENDING', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-UNDER',
    );

    try {
      offlineProcessBankingWebhook({
        idempotency_key: 'WEB-IPN-UNDER',
        bank_tx_id: 'FTWEB20260005',
        amount_vnd: order.total_amount_vnd - 10000,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });
      expect.unreachable('Expected underpayment error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('WEBHOOK_AMOUNT_MISMATCH');
    }

    expect(getOfflineVietQrOrderById(order.id)?.payment_status).toBe('PENDING');
    expect(offlineListWebhookLogs(SEED_IDS.stores.store01)).toHaveLength(0);
    expect(getSpeakerAnnouncementHistory()).toHaveLength(0);
  });

  it('11. Rejects banking webhook against VOIDED order (409 ORDER_ALREADY_VOIDED)', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-VOID2',
    );
    registerOfflinePosOrderForVietQr({ ...order, payment_status: 'VOIDED' });

    try {
      offlineProcessBankingWebhook({
        idempotency_key: 'WEB-IPN-VOID',
        bank_tx_id: 'FTWEB20260006',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });
      expect.unreachable('Expected voided error');
    } catch (err) {
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('ORDER_ALREADY_VOIDED');
    }
  });

  it('12. Rejects brand-new webhook tx on an order already PAID (409 ORDER_ALREADY_PAID)', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-PAID',
    );
    registerOfflinePosOrderForVietQr({ ...order, payment_status: 'PAID' });

    try {
      offlineProcessBankingWebhook({
        idempotency_key: 'WEB-IPN-PAID-NEW',
        bank_tx_id: 'FTWEB20260007',
        amount_vnd: order.total_amount_vnd,
        transfer_content: `TT ${order.vietqr_ref_code}`,
      });
      expect.unreachable('Expected already paid error');
    } catch (err) {
      expect((err as ApiClientError).status).toBe(409);
      expect((err as ApiClientError).code).toBe('ORDER_ALREADY_PAID');
    }
  });

  it('13. Returns 404 ORDER_NOT_FOUND_FOR_WEBHOOK when transfer memo matches no order', () => {
    try {
      offlineProcessBankingWebhook({
        idempotency_key: 'WEB-IPN-404',
        bank_tx_id: 'FTWEB20260008',
        amount_vnd: 50000,
        transfer_content: 'MBVCB.9999.VQR-UNKNOWN-404',
      });
      expect.unreachable('Expected 404 error');
    } catch (err) {
      expect((err as ApiClientError).status).toBe(404);
      expect((err as ApiClientError).code).toBe('ORDER_NOT_FOUND_FOR_WEBHOOK');
    }
  });

  it('14. offlineSimulateOrderWebhook reconciles first call and replays idempotently on simulate_duplicate=true', () => {
    const order = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-SIM1',
    );

    const first = offlineSimulateOrderWebhook(SEED_IDS.stores.store01, order.id, {
      simulate_duplicate: false,
    });
    const voice1 = processWebhookSpeakerTrigger(first);
    expect(first.status).toBe('RECONCILED_PAID');
    expect(voice1.announced).toBe(true);

    const dup = offlineSimulateOrderWebhook(SEED_IDS.stores.store01, order.id, {
      simulate_duplicate: true,
    });
    const voice2 = processWebhookSpeakerTrigger(dup);
    expect(dup.status).toBe('IDEMPOTENT_REPLAY');
    expect(dup.should_trigger_speaker).toBe(false);
    expect(voice2.triggered).toBe(false);
    expect(getSpeakerAnnouncementHistory()).toHaveLength(1);
  });

  it('15. Speaker announcer respects muted mode and playPaymentSuccessChime safely returns false in headless Vitest', () => {
    expect(playPaymentSuccessChime(DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ)).toBe(false);

    setSpeakerMuted(true);
    expect(isSpeakerMuted()).toBe(true);

    const res = announceVietQrPaymentVoice({
      order_id: '90000000-0000-4000-8000-000000000010',
      order_code: 'POS-S01-MUTED',
      store_id: SEED_IDS.stores.store01,
      amount_vnd: 90000,
      formatted_amount_vnd: '90.000',
      vietqr_ref_code: 'VQR-POSS01MUTED',
      message_vi:
        'Ting ting! Đã nhận chuyển khoản 90.000 đồng cho đơn hàng POS-S01-MUTED.',
      lang: 'vi-VN',
      chime_frequencies_hz: DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
      chime_duration_ms: 140,
      generated_at: '2026-11-22T09:00:00.000Z',
    });

    expect(res.announced).toBe(false);
    expect(res.mode).toBe('MUTED');
    expect(res.chimePlayed).toBe(false);
    expect(getSpeakerAnnouncementHistory()[0]?.mode).toBe('MUTED');
  });

  it('16. offlineListWebhookLogs strictly isolates logs by storeId and supports orderId filter', () => {
    const order1 = createRegisteredPendingOrder(
      SEED_IDS.stores.store01,
      SEED_IDS.users.cashier01,
      'POS-S01-WEB-LOG1',
    );
    const order2 = createRegisteredPendingOrder(
      SEED_IDS.stores.store02,
      SEED_IDS.users.cashier02,
      'POS-S02-WEB-LOG2',
    );

    offlineSimulateOrderWebhook(SEED_IDS.stores.store01, order1.id);
    offlineSimulateOrderWebhook(SEED_IDS.stores.store02, order2.id);

    const store1Logs = offlineListWebhookLogs(SEED_IDS.stores.store01);
    const store2Logs = offlineListWebhookLogs(SEED_IDS.stores.store02, order2.id);

    expect(store1Logs).toHaveLength(1);
    expect(store1Logs[0]?.order_id).toBe(order1.id);
    expect(store2Logs).toHaveLength(1);
    expect(store2Logs[0]?.order_id).toBe(order2.id);
  });
});
```
