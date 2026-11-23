import { randomUUID } from 'node:crypto';
import {
  SEED_IDS,
  buildEmvCoDynamicVietQrPayload,
  buildVoiceAnnouncementScript,
  extractVietQrRefFromTransferContent,
  verifyEmvCoPayloadCrc,
  type EmvCoVietQrPayloadDTO,
  type GenerateOrderVietQrInput,
  type PaymentStatus,
  type PaymentWebhookLogDto,
  type SimulateVietQrWebhookInput,
  type VietQrBankAccountConfigDto,
  type VietQrBankingWebhookPayloadInput,
  type VietQrWebhookProcessResultDTO,
  type WebhookLogQueryInput,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

const DEFAULT_STORE_BANK: VietQrBankAccountConfigDto = {
  bank_bin: '970436',
  bank_short_name: 'Vietcombank',
  account_number: '1019001919',
  account_name: 'CF19 TAY NGUYEN COFFEE',
  merchant_city: 'BUON MA THUOT',
};

const STORE_BANK_CONFIGS: Readonly<Record<string, VietQrBankAccountConfigDto>> = {
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

function resolveBankShortName(bankBin: string, fallback: string): string {
  if (bankBin === '970436') return 'Vietcombank';
  if (bankBin === '970422') return 'MB Bank';
  if (bankBin === '970415') return 'VietinBank';
  if (bankBin === '970418') return 'BIDV';
  if (bankBin === '970407') return 'Techcombank';
  return fallback;
}

function buildFallbackRefCode(orderCode: string): string {
  return `VQR${orderCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-14)}`;
}

interface OrderQrRow {
  id: string;
  store_id: string;
  order_code: string;
  vietqr_ref_code: string | null;
  total_amount_vnd: number;
  payment_status: PaymentStatus;
}

interface WebhookLogRow {
  id: string;
  idempotency_key: string;
  store_id: string;
  order_id: string | null;
  amount_vnd: number;
  bank_tx_id: string;
  raw_payload: Record<string, unknown>;
  processed_at: Date | string;
  created_at: Date | string;
}

export async function generateOrderVietQr(
  actor: AuthActor,
  input: GenerateOrderVietQrInput,
): Promise<EmvCoVietQrPayloadDTO> {
  return withTransaction(async (client) => {
    const order = await dbQueryOne<OrderQrRow>(
      `SELECT id, store_id, order_code, vietqr_ref_code, total_amount_vnd, payment_status
       FROM public.pos_orders
       WHERE id = $1 FOR UPDATE`,
      [input.order_id],
      client,
    );

    if (!order) {
      throw new WarehouseDomainError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy hóa đơn POS');
    }
    if (order.store_id !== input.store_id) {
      throw new WarehouseDomainError(403, 'FORBIDDEN_CROSS_TENANT_ACCESS', 'Hóa đơn không thuộc chi nhánh này');
    }
    if (order.payment_status === 'VOIDED') {
      throw new WarehouseDomainError(409, 'ORDER_ALREADY_VOIDED', 'Không thể tạo mã VietQR cho hóa đơn đã hủy');
    }
    if (order.total_amount_vnd <= 0) {
      throw new WarehouseDomainError(400, 'EMVCO_INVALID_AMOUNT', 'Số tiền hóa đơn phải lớn hơn 0');
    }

    let refCode = order.vietqr_ref_code?.trim();
    if (!refCode) {
      refCode = buildFallbackRefCode(order.order_code);
      await client.query(
        `UPDATE public.pos_orders SET vietqr_ref_code = $2 WHERE id = $1`,
        [order.id, refCode],
      );
    }

    const baseBank = STORE_BANK_CONFIGS[order.store_id] ?? DEFAULT_STORE_BANK;
    const bankBin = input.bank_bin ?? baseBank.bank_bin;
    const accountNumber = input.account_number ?? baseBank.account_number;
    const accountName = input.account_name ?? baseBank.account_name;
    const merchantCity = input.merchant_city ?? baseBank.merchant_city;
    const bankShortName = resolveBankShortName(bankBin, baseBank.bank_short_name);

    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: bankBin,
      account_number: accountNumber,
      amount_vnd: order.total_amount_vnd,
      order_code: order.order_code,
      vietqr_ref_code: refCode,
      merchant_name: accountName,
      merchant_city: merchantCity,
    });

    if (!verifyEmvCoPayloadCrc(built.emvco_payload)) {
      throw new WarehouseDomainError(
        500,
        'EMVCO_CRC_GENERATION_FAILED',
        'Chuỗi EMVCo VietQR không đạt kiểm tra checksum CRC16-CCITT',
      );
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: order.store_id,
        action: 'VIETQR_PAYLOAD_GENERATED',
        targetTable: 'pos_orders',
        targetId: order.id,
        reason: `Sinh mã VietQR động cho đơn ${order.order_code}`,
        payload: {
          order_code: order.order_code,
          vietqr_ref_code: refCode,
          amount_vnd: order.total_amount_vnd,
          crc16_hex: built.crc16_hex,
        },
      },
      client,
    );

    return {
      order_id: order.id,
      store_id: order.store_id,
      order_code: order.order_code,
      vietqr_ref_code: refCode,
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
      generated_at: new Date().toISOString(),
    };
  });
}

export async function processBankingWebhook(
  input: VietQrBankingWebhookPayloadInput,
): Promise<VietQrWebhookProcessResultDTO> {
  return withTransaction(async (client) => {
    const idempotencyKey = input.idempotency_key.trim();
    const bankTxId = input.bank_tx_id.trim();

    const existingLog = await dbQueryOne<WebhookLogRow>(
      `SELECT * FROM public.payment_webhook_logs
       WHERE idempotency_key = $1 OR bank_tx_id = $2
       LIMIT 1`,
      [idempotencyKey, bankTxId],
      client,
    );

    if (existingLog) {
      const existingOrder = existingLog.order_id
        ? await dbQueryOne<OrderQrRow>(
            `SELECT id, store_id, order_code, vietqr_ref_code, total_amount_vnd, payment_status
             FROM public.pos_orders WHERE id = $1`,
            [existingLog.order_id],
            client,
          )
        : null;

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
        processed_at: toIsoString(existingLog.processed_at),
        speaker_announcement: null,
      };
    }

    const extractedRef =
      input.vietqr_ref_code?.trim().toUpperCase() ??
      extractVietQrRefFromTransferContent(input.transfer_content);

    let order: OrderQrRow | null = null;
    if (input.order_id) {
      order = await dbQueryOne<OrderQrRow>(
        `SELECT id, store_id, order_code, vietqr_ref_code, total_amount_vnd, payment_status
         FROM public.pos_orders WHERE id = $1 FOR UPDATE`,
        [input.order_id],
        client,
      );
    }
    if (!order && extractedRef) {
      order = await dbQueryOne<OrderQrRow>(
        `SELECT id, store_id, order_code, vietqr_ref_code, total_amount_vnd, payment_status
         FROM public.pos_orders
         WHERE UPPER(vietqr_ref_code) = $1 OR UPPER(order_code) = $1
         FOR UPDATE`,
        [extractedRef],
        client,
      );
    }

    if (!order) {
      throw new WarehouseDomainError(
        404,
        'ORDER_NOT_FOUND_FOR_WEBHOOK',
        `Không tìm thấy hóa đơn khớp với nội dung chuyển khoản "${input.transfer_content}"`,
      );
    }
    if (order.payment_status === 'VOIDED') {
      throw new WarehouseDomainError(409, 'ORDER_ALREADY_VOIDED', 'Không thể gạch nợ hóa đơn đã hủy');
    }
    if (order.payment_status === 'PAID') {
      throw new WarehouseDomainError(409, 'ORDER_ALREADY_PAID', `Hóa đơn ${order.order_code} đã được thanh toán trước đó`);
    }
    if (input.amount_vnd < order.total_amount_vnd) {
      throw new WarehouseDomainError(
        409,
        'WEBHOOK_AMOUNT_MISMATCH',
        `Số tiền nhận (${input.amount_vnd.toLocaleString('vi-VN')} đ) nhỏ hơn tổng hóa đơn (${order.total_amount_vnd.toLocaleString('vi-VN')} đ)`,
      );
    }

    const resolvedRef = order.vietqr_ref_code ?? extractedRef ?? buildFallbackRefCode(order.order_code);
    const logRow = await dbQueryOne<WebhookLogRow>(
      `INSERT INTO public.payment_webhook_logs (
         idempotency_key, store_id, order_id, amount_vnd, bank_tx_id, raw_payload
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        idempotencyKey,
        order.store_id,
        order.id,
        input.amount_vnd,
        bankTxId,
        JSON.stringify({ ...input, resolved_vietqr_ref_code: resolvedRef }),
      ],
      client,
    );

    await client.query(
      `UPDATE public.pos_orders
       SET payment_status = 'PAID',
           payment_method = 'VIETQR',
           vietqr_ref_code = $2
       WHERE id = $1`,
      [order.id, resolvedRef],
    );

    const processedAtIso = toIsoString(logRow!.processed_at);
    const speakerAnnouncement = buildVoiceAnnouncementScript({
      order_id: order.id,
      order_code: order.order_code,
      store_id: order.store_id,
      amount_vnd: input.amount_vnd,
      vietqr_ref_code: resolvedRef,
      generated_at: processedAtIso,
    });

    return {
      status: 'RECONCILED_PAID',
      already_processed: false,
      should_trigger_speaker: true,
      webhook_log_id: logRow!.id,
      idempotency_key: logRow!.idempotency_key,
      bank_tx_id: logRow!.bank_tx_id,
      store_id: order.store_id,
      order_id: order.id,
      order_code: order.order_code,
      vietqr_ref_code: resolvedRef,
      amount_vnd: input.amount_vnd,
      order_total_vnd: order.total_amount_vnd,
      payment_status: 'PAID',
      processed_at: processedAtIso,
      speaker_announcement: speakerAnnouncement,
    };
  });
}

export async function simulateOrderWebhook(
  actor: AuthActor,
  input: SimulateVietQrWebhookInput,
): Promise<VietQrWebhookProcessResultDTO> {
  const order = await dbQueryOne<OrderQrRow>(
    `SELECT id, store_id, order_code, vietqr_ref_code, total_amount_vnd, payment_status
     FROM public.pos_orders WHERE id = $1`,
    [input.order_id],
  );
  if (!order) {
    throw new WarehouseDomainError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy hóa đơn POS');
  }
  if (order.store_id !== input.store_id) {
    throw new WarehouseDomainError(403, 'FORBIDDEN_CROSS_TENANT_ACCESS', 'Hóa đơn không thuộc chi nhánh này');
  }

  const refCode = order.vietqr_ref_code ?? buildFallbackRefCode(order.order_code);
  const amountVnd = input.amount_vnd ?? order.total_amount_vnd;
  const transferContent =
    input.transfer_content ?? `MBVCB.${refCode} thanh toan ${order.order_code}`;

  if (input.simulate_duplicate) {
    const existingLog = await dbQueryOne<WebhookLogRow>(
      `SELECT * FROM public.payment_webhook_logs WHERE order_id = $1 ORDER BY processed_at DESC LIMIT 1`,
      [order.id],
    );
    if (existingLog) {
      return processBankingWebhook({
        idempotency_key: existingLog.idempotency_key,
        bank_tx_id: existingLog.bank_tx_id,
        amount_vnd: existingLog.amount_vnd,
        transfer_content: transferContent,
        order_id: order.id,
        vietqr_ref_code: refCode,
      });
    }

    const sharedKey = input.idempotency_key ?? `SIM-DUP-${order.order_code}`;
    const sharedTx = input.bank_tx_id ?? `FTDUP${Date.now().toString().slice(-8)}`;
    await processBankingWebhook({
      idempotency_key: sharedKey,
      bank_tx_id: sharedTx,
      amount_vnd: amountVnd,
      transfer_content: transferContent,
      order_id: order.id,
      vietqr_ref_code: refCode,
    });
    return processBankingWebhook({
      idempotency_key: sharedKey,
      bank_tx_id: sharedTx,
      amount_vnd: amountVnd,
      transfer_content: transferContent,
      order_id: order.id,
      vietqr_ref_code: refCode,
    });
  }

  const result = await processBankingWebhook({
    idempotency_key:
      input.idempotency_key ?? `SIM-${order.order_code}-${randomUUID().slice(0, 8)}`,
    bank_tx_id:
      input.bank_tx_id ?? `FT${Date.now().toString().slice(-8)}${randomUUID().slice(0, 4).toUpperCase()}`,
    amount_vnd: amountVnd,
    transfer_content: transferContent,
    order_id: order.id,
    vietqr_ref_code: refCode,
  });

  await recordAuditLog({
    actorId: actor.id,
    storeId: order.store_id,
    action: 'VIETQR_WEBHOOK_RECONCILED',
    targetTable: 'pos_orders',
    targetId: order.id,
    reason: `Xác nhận thanh toán VietQR cho đơn ${order.order_code}`,
    payload: { bank_tx_id: result.bank_tx_id, amount_vnd: result.amount_vnd },
  });

  return result;
}

export async function listWebhookLogs(
  _actor: AuthActor,
  query: WebhookLogQueryInput,
): Promise<PaymentWebhookLogDto[]> {
  const conditions: string[] = ['store_id = $1'];
  const params: unknown[] = [query.store_id];
  if (query.order_id) {
    params.push(query.order_id);
    conditions.push(`order_id = $${params.length}`);
  }
  params.push(Math.min(200, Math.max(1, query.limit ?? 50)));

  const res = await dbQuery<WebhookLogRow>(
    `SELECT * FROM public.payment_webhook_logs
     WHERE ${conditions.join(' AND ')}
     ORDER BY processed_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return res.rows.map((r) => ({
    ...r,
    processed_at: toIsoString(r.processed_at),
    created_at: toIsoString(r.created_at),
  }));
}
