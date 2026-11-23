# PHIẾU GIAO VIỆC CẤM SUY LUẬN — TIỂU PHÂN HỆ M5.1 (ZERO-REASONING PAWN SPECS)

- **Tiểu phân hệ:** `M5.1 - @cf19/shared EMVCo Dynamic VietQR, CRC16-CCITT Checksum, Idempotent Banking Webhook Contracts & Pure Math Engine`
- **Nguồn thiết kế:** Quân Hậu (`queen-neon`, Gemini 4 Neon High) căn cứ `M5_1_KING_CHARTER.md` và `0006_m5_emvco_vietqr_and_webhook_rpcs.sql`.
- **Quy tắc cho Quân Tốt (`pawn-flash-1`, `pawn-flash-2`):**
  - Ghi **100% nguyên văn từng ký tự** đúng các file được giao. Không sửa đổi, không thêm `// TODO`, không dùng kiểu `any`, không bỏ `.js` trong đường dẫn import tương đối của `@cf19/shared` (`moduleResolution: "NodeNext"`).
  - Tuyệt đối không chạm vào file của Quân Tốt còn lại.
  - Không chạy `npm install`.

---

## PHIẾU TỐT #1 (`pawn-flash-1` — 4 files trong `@cf19/shared`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\packages\shared\src\schemas\vietqr.schema.ts` (Tạo mới)
  2. `C:\bib\cf_19\packages\shared\src\types\vietqr.types.ts` (Tạo mới)
  3. `C:\bib\cf_19\packages\shared\src\schemas\index.ts` (Overwrite)
  4. `C:\bib\cf_19\packages\shared\src\index.ts` (Overwrite)

### File 1: `C:\bib\cf_19\packages\shared\src\schemas\vietqr.schema.ts`

```ts
import { z } from 'zod';
import { UuidSchema } from './auth.schema.js';

export const BankBinSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'NAPAS bank BIN must be exactly 6 numeric digits');

export const BankAccountNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4,32}$/, 'Bank account number must be 4-32 alphanumeric characters');

export const VndPositiveSchema = z
  .number({ invalid_type_error: 'Amount in VND must be a number' })
  .int('Amount in VND must be an integer')
  .positive('Amount in VND must be greater than zero')
  .max(999_999_999_999, 'Amount in VND exceeds safe limit');

export const VietQrBankAccountConfigSchema = z.object({
  bank_bin: BankBinSchema,
  bank_short_name: z.string().trim().min(2).max(32),
  account_number: BankAccountNumberSchema,
  account_name: z.string().trim().min(2).max(60),
  merchant_city: z.string().trim().min(2).max(40).default('BUON MA THUOT'),
});

export type VietQrBankAccountConfigInput = z.infer<typeof VietQrBankAccountConfigSchema>;

export const GenerateOrderVietQrSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  bank_bin: BankBinSchema.optional(),
  account_number: BankAccountNumberSchema.optional(),
  account_name: z.string().trim().min(2).max(60).optional(),
  merchant_city: z.string().trim().min(2).max(40).optional(),
});

export type GenerateOrderVietQrInput = z.infer<typeof GenerateOrderVietQrSchema>;

export const VietQrBankingWebhookPayloadSchema = z.object({
  idempotency_key: z
    .string()
    .trim()
    .min(4, 'idempotency_key must be at least 4 characters')
    .max(128, 'idempotency_key must not exceed 128 characters'),
  bank_tx_id: z
    .string()
    .trim()
    .min(3, 'bank_tx_id must be at least 3 characters')
    .max(128, 'bank_tx_id must not exceed 128 characters'),
  amount_vnd: VndPositiveSchema,
  transfer_content: z
    .string()
    .trim()
    .min(3, 'transfer_content must be at least 3 characters')
    .max(500, 'transfer_content must not exceed 500 characters'),
  order_id: UuidSchema.optional(),
  vietqr_ref_code: z
    .string()
    .trim()
    .min(4, 'vietqr_ref_code must be at least 4 characters')
    .max(64, 'vietqr_ref_code must not exceed 64 characters')
    .optional(),
  bank_bin: BankBinSchema.optional(),
  account_number: BankAccountNumberSchema.optional(),
  webhook_signature: z.string().trim().min(8).max(256).optional(),
  occurred_at: z.string().datetime().optional(),
});

export type VietQrBankingWebhookPayloadInput = z.infer<
  typeof VietQrBankingWebhookPayloadSchema
>;

export const SimulateVietQrWebhookSchema = z.object({
  store_id: UuidSchema,
  order_id: UuidSchema,
  amount_vnd: VndPositiveSchema.optional(),
  idempotency_key: z.string().trim().min(4).max(128).optional(),
  bank_tx_id: z.string().trim().min(3).max(128).optional(),
  transfer_content: z.string().trim().min(3).max(500).optional(),
  simulate_duplicate: z.boolean().optional().default(false),
});

export type SimulateVietQrWebhookInput = z.infer<typeof SimulateVietQrWebhookSchema>;

export const WebhookLogQuerySchema = z.object({
  store_id: UuidSchema.optional(),
  order_id: UuidSchema.optional(),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(200, 'limit must not exceed 200')
    .default(50),
});

export type WebhookLogQueryInput = z.infer<typeof WebhookLogQuerySchema>;
```

### File 2: `C:\bib\cf_19\packages\shared\src\types\vietqr.types.ts`

```ts
import type { z } from 'zod';
import type { PaymentStatus } from '../enums.js';
import type {
  GenerateOrderVietQrSchema,
  SimulateVietQrWebhookSchema,
  VietQrBankingWebhookPayloadSchema,
  WebhookLogQuerySchema,
} from '../schemas/vietqr.schema.js';

export type GenerateOrderVietQrDTO = z.infer<typeof GenerateOrderVietQrSchema>;
export type VietQrBankingWebhookPayloadDTO = z.infer<
  typeof VietQrBankingWebhookPayloadSchema
>;
export type SimulateVietQrWebhookDTO = z.infer<typeof SimulateVietQrWebhookSchema>;
export type WebhookLogQueryDTO = z.infer<typeof WebhookLogQuerySchema>;

export interface VietQrBankAccountConfigDto {
  bank_bin: string;
  bank_short_name: string;
  account_number: string;
  account_name: string;
  merchant_city: string;
}

export interface EmvCoVietQrPayloadInputDTO {
  bank_bin: string;
  account_number: string;
  amount_vnd: number;
  order_code: string;
  vietqr_ref_code: string;
  merchant_name?: string;
  merchant_city?: string;
}

export interface EmvCoVietQrBuildResultDTO {
  emvco_payload: string;
  crc16_hex: string;
  merchant_name: string;
  merchant_city: string;
  order_code: string;
  vietqr_ref_code: string;
  is_dynamic: true;
}

export interface EmvCoVietQrPayloadDTO {
  order_id: string;
  store_id: string;
  order_code: string;
  vietqr_ref_code: string;
  amount_vnd: number;
  payment_status: PaymentStatus;
  bank_bin: string;
  bank_short_name: string;
  account_number: string;
  account_name: string;
  merchant_city: string;
  emvco_payload: string;
  crc16_hex: string;
  is_dynamic: true;
  generated_at: string;
}

export interface PaymentWebhookLogDto {
  id: string;
  idempotency_key: string;
  store_id: string;
  order_id: string | null;
  amount_vnd: number;
  bank_tx_id: string;
  raw_payload: Record<string, unknown>;
  processed_at: string;
  created_at: string;
}

export interface SpeakerAnnouncementInputDTO {
  order_id: string;
  order_code: string;
  store_id: string;
  amount_vnd: number;
  vietqr_ref_code?: string | null;
  generated_at?: string;
}

export interface SpeakerAnnouncementPayloadDTO {
  order_id: string;
  order_code: string;
  store_id: string;
  amount_vnd: number;
  formatted_amount_vnd: string;
  vietqr_ref_code: string | null;
  message_vi: string;
  lang: 'vi-VN';
  chime_frequencies_hz: readonly number[];
  chime_duration_ms: number;
  generated_at: string;
}

export type VietQrWebhookStatus = 'RECONCILED_PAID' | 'IDEMPOTENT_REPLAY';

export interface VietQrWebhookProcessResultDTO {
  status: VietQrWebhookStatus;
  already_processed: boolean;
  should_trigger_speaker: boolean;
  webhook_log_id: string;
  idempotency_key: string;
  bank_tx_id: string;
  store_id: string;
  order_id: string | null;
  order_code: string | null;
  vietqr_ref_code: string | null;
  amount_vnd: number;
  order_total_vnd: number | null;
  payment_status: PaymentStatus | null;
  processed_at: string;
  speaker_announcement: SpeakerAnnouncementPayloadDTO | null;
}
```

### File 3: `C:\bib\cf_19\packages\shared\src\schemas\index.ts`

```ts
export * from './auth.schema.js';
export * from './store.schema.js';
export * from './operations.schema.js';
export * from './warehouse.schema.js';
export * from './b2b.schema.js';
export * from './posCatalog.schema.js';
export * from './vietqr.schema.js';
```

### File 4: `C:\bib\cf_19\packages\shared\src\index.ts`

```ts
export * from './enums.js';
export * from './constants/seedIds.js';
export * from './constants/securityKeys.js';
export * from './schemas/index.js';
export * from './types/domain.types.js';
export * from './types/warehouse.types.js';
export * from './types/b2b.types.js';
export * from './types/posCatalog.types.js';
export * from './types/vietqr.types.js';
export * from './utils/warehouseMath.js';
export * from './utils/b2bAndTransferMath.js';
export * from './utils/posBomAndReceiptMath.js';
export * from './utils/emvcoVietQrMath.js';
```

---

## PHIẾU TỐT #2 (`pawn-flash-2` — 2 files trong `@cf19/shared`)

- **Phạm vi sở hữu độc quyền:**
  1. `C:\bib\cf_19\packages\shared\src\utils\emvcoVietQrMath.ts` (Tạo mới)
  2. `C:\bib\cf_19\packages\shared\src\__tests__\vietqr-webhook-m5.test.ts` (Tạo mới — 22 Vitest unit tests)

### File 1: `C:\bib\cf_19\packages\shared\src\utils\emvcoVietQrMath.ts`

```ts
import type {
  EmvCoVietQrBuildResultDTO,
  EmvCoVietQrPayloadInputDTO,
  SpeakerAnnouncementInputDTO,
  SpeakerAnnouncementPayloadDTO,
} from '../types/vietqr.types.js';

export const NAPAS_GUID = 'A000000727';
export const NAPAS_SERVICE_CODE_ACCOUNT = 'QRIBFTTA';
export const EMVCO_MCC_COFFEE_SHOP = '5814';
export const EMVCO_CURRENCY_VND = '704';
export const EMVCO_COUNTRY_VN = 'VN';
export const DEFAULT_VIETQR_MERCHANT_NAME = 'CF19 TAY NGUYEN COFFEE';
export const DEFAULT_VIETQR_MERCHANT_CITY = 'BUON MA THUOT';
export const DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ: readonly number[] = [
  523.25,
  659.25,
  783.99,
  1046.5,
] as const;

const UTF8_ENCODER = new TextEncoder();

function normalizeEmvAscii(raw: string | undefined, maxLength: number, fallback: string): string {
  const source = (raw ?? '').trim();
  if (source.length === 0) {
    return fallback.slice(0, maxLength);
  }

  const normalized = source
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ._-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0) {
    return fallback.slice(0, maxLength);
  }

  return normalized.slice(0, maxLength).trim();
}

function formatVndDotSeparated(amountVnd: number): string {
  const safeInt = Math.max(0, Math.round(amountVnd));
  return String(safeInt).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * 1. Format an EMVCo Tag-Length-Value (TLV) segment: `${tag}${len2}${value}`.
 */
export function formatEmvTlv(tag: string, value: string): string {
  if (!/^\d{2}$/.test(tag)) {
    throw new Error(`EMVCO_INVALID_TAG: Tag must be exactly 2 numeric digits (received "${tag}")`);
  }
  if (value.length > 99) {
    throw new Error(
      `EMVCO_TLV_OVERFLOW: Value length ${value.length} exceeds 99 characters for tag ${tag}`,
    );
  }
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

/**
 * 2. Compute EMVCo CRC16-CCITT (Poly 0x1021, Init 0xFFFF, RefIn=false, RefOut=false, XorOut=0x0000).
 * Standard check vector: computeEmvCoCrc16Hex("123456789") === "29B1".
 */
export function computeEmvCoCrc16Hex(input: string): string {
  const bytes = UTF8_ENCODER.encode(input);
  let crc = 0xffff;

  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    crc ^= byte << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * 3. Build a NAPAS247 EMVCo Dynamic VietQR payload with valid CRC16-CCITT checksum (Tag 63).
 */
export function buildEmvCoDynamicVietQrPayload(
  input: EmvCoVietQrPayloadInputDTO,
): EmvCoVietQrBuildResultDTO {
  const bankBin = input.bank_bin.trim();
  if (!/^\d{6}$/.test(bankBin)) {
    throw new Error('EMVCO_INVALID_BANK_BIN: NAPAS bank BIN must be exactly 6 numeric digits');
  }

  const accountNumber = input.account_number.replace(/\s+/g, '').trim();
  if (!/^[A-Za-z0-9]{4,32}$/.test(accountNumber)) {
    throw new Error(
      'EMVCO_INVALID_ACCOUNT_NO: Account number must be 4-32 alphanumeric characters',
    );
  }

  if (!Number.isInteger(input.amount_vnd) || input.amount_vnd <= 0) {
    throw new Error('EMVCO_INVALID_AMOUNT: Dynamic VietQR amount_vnd must be a positive integer');
  }

  const merchantName = normalizeEmvAscii(
    input.merchant_name,
    25,
    DEFAULT_VIETQR_MERCHANT_NAME,
  );
  const merchantCity = normalizeEmvAscii(
    input.merchant_city,
    15,
    DEFAULT_VIETQR_MERCHANT_CITY,
  );
  const orderCode = normalizeEmvAscii(input.order_code, 25, 'ORDER');
  const vietqrRefCode = normalizeEmvAscii(input.vietqr_ref_code, 50, 'VQR-ORDER');

  // Tag 38: Merchant Account Information (NAPAS247)
  const beneficiaryOrgTlv =
    formatEmvTlv('00', bankBin) + formatEmvTlv('01', accountNumber);
  const merchantAccountInfoTlv =
    formatEmvTlv('00', NAPAS_GUID) +
    formatEmvTlv('01', beneficiaryOrgTlv) +
    formatEmvTlv('02', NAPAS_SERVICE_CODE_ACCOUNT);

  // Tag 62: Additional Data Field Template (Sub-tag 01 = Bill Number, Sub-tag 08 = Reference)
  const additionalDataTlv =
    formatEmvTlv('01', orderCode) + formatEmvTlv('08', vietqrRefCode);

  const payloadWithoutCrc =
    formatEmvTlv('00', '01') +
    formatEmvTlv('01', '12') +
    formatEmvTlv('38', merchantAccountInfoTlv) +
    formatEmvTlv('52', EMVCO_MCC_COFFEE_SHOP) +
    formatEmvTlv('53', EMVCO_CURRENCY_VND) +
    formatEmvTlv('54', String(input.amount_vnd)) +
    formatEmvTlv('58', EMVCO_COUNTRY_VN) +
    formatEmvTlv('59', merchantName) +
    formatEmvTlv('60', merchantCity) +
    formatEmvTlv('62', additionalDataTlv) +
    '6304';

  const crc16Hex = computeEmvCoCrc16Hex(payloadWithoutCrc);

  return {
    emvco_payload: `${payloadWithoutCrc}${crc16Hex}`,
    crc16_hex: crc16Hex,
    merchant_name: merchantName,
    merchant_city: merchantCity,
    order_code: orderCode,
    vietqr_ref_code: vietqrRefCode,
    is_dynamic: true,
  };
}

/**
 * 4. Verify the trailing EMVCo Tag 63 CRC16-CCITT checksum to detect any amount/account tampering.
 */
export function verifyEmvCoPayloadCrc(payload: string): boolean {
  if (typeof payload !== 'string' || payload.length < 12) {
    return false;
  }

  const crcHeader = payload.slice(payload.length - 8, payload.length - 4);
  if (crcHeader !== '6304') {
    return false;
  }

  const providedCrc = payload.slice(payload.length - 4);
  if (!/^[0-9A-F]{4}$/.test(providedCrc)) {
    return false;
  }

  const dataForCrc = payload.slice(0, payload.length - 4);
  return computeEmvCoCrc16Hex(dataForCrc) === providedCrc;
}

/**
 * 5. Extract normalized uppercase VietQR reference code (VQR-...) from noisy Vietnamese bank memos.
 */
export function extractVietQrRefFromTransferContent(transferContent: string): string | null {
  if (typeof transferContent !== 'string' || transferContent.trim().length === 0) {
    return null;
  }

  const match = /(?:^|[^A-Za-z0-9_-])(VQR[-_][A-Za-z0-9_-]+)/i.exec(transferContent);
  if (!match || !match[1]) {
    return null;
  }

  const cleaned = match[1].toUpperCase().replace(/[-_]+$/, '');
  return cleaned.length >= 5 ? cleaned : null;
}

/**
 * 6. Build Vietnamese voice announcement script + musical chime frequencies for Cashier/IoT Speaker.
 */
export function buildVoiceAnnouncementScript(
  input: SpeakerAnnouncementInputDTO,
): SpeakerAnnouncementPayloadDTO {
  if (!Number.isInteger(input.amount_vnd) || input.amount_vnd <= 0) {
    throw new Error('SPEAKER_INVALID_AMOUNT: amount_vnd must be a positive integer');
  }

  const formattedAmount = formatVndDotSeparated(input.amount_vnd);
  const messageVi = `Ting ting! Đã nhận chuyển khoản ${formattedAmount} đồng cho đơn hàng ${input.order_code}.`;

  return {
    order_id: input.order_id,
    order_code: input.order_code,
    store_id: input.store_id,
    amount_vnd: input.amount_vnd,
    formatted_amount_vnd: formattedAmount,
    vietqr_ref_code: input.vietqr_ref_code ?? null,
    message_vi: messageVi,
    lang: 'vi-VN',
    chime_frequencies_hz: DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
    chime_duration_ms: 140,
    generated_at: input.generated_at ?? new Date().toISOString(),
  };
}
```

### File 2: `C:\bib\cf_19\packages\shared\src\__tests__\vietqr-webhook-m5.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ,
  DEFAULT_VIETQR_MERCHANT_CITY,
  DEFAULT_VIETQR_MERCHANT_NAME,
  GenerateOrderVietQrSchema,
  NAPAS_GUID,
  NAPAS_SERVICE_CODE_ACCOUNT,
  SEED_IDS,
  SimulateVietQrWebhookSchema,
  VietQrBankingWebhookPayloadSchema,
  WebhookLogQuerySchema,
  buildEmvCoDynamicVietQrPayload,
  buildVoiceAnnouncementScript,
  computeEmvCoCrc16Hex,
  extractVietQrRefFromTransferContent,
  formatEmvTlv,
  verifyEmvCoPayloadCrc,
} from '../index.js';

describe('M5.1 EMVCo CRC16-CCITT, Dynamic VietQR & Webhook Engine (@cf19/shared)', () => {
  it('1. computeEmvCoCrc16Hex matches official ISO/EMVCo check vector "123456789" -> "29B1"', () => {
    expect(computeEmvCoCrc16Hex('123456789')).toBe('29B1');
  });

  it('2. computeEmvCoCrc16Hex returns "FFFF" for empty string and 4 uppercase hex digits for arbitrary input', () => {
    expect(computeEmvCoCrc16Hex('')).toBe('FFFF');
    const crc = computeEmvCoCrc16Hex('0002010102126304');
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
  });

  it('3. formatEmvTlv pads single-digit lengths with leading zero and formats multi-digit lengths accurately', () => {
    expect(formatEmvTlv('00', '01')).toBe('000201');
    expect(formatEmvTlv('58', 'VN')).toBe('5802VN');
    expect(formatEmvTlv('00', NAPAS_GUID)).toBe('0010A000000727');
  });

  it('4. formatEmvTlv throws on invalid tag or TLV value exceeding 99 characters', () => {
    expect(() => formatEmvTlv('3', '01')).toThrow(/EMVCO_INVALID_TAG/);
    expect(() => formatEmvTlv('AA', '01')).toThrow(/EMVCO_INVALID_TAG/);
    expect(() => formatEmvTlv('62', 'X'.repeat(100))).toThrow(/EMVCO_TLV_OVERFLOW/);
  });

  it('5. buildEmvCoDynamicVietQrPayload constructs complete NAPAS247 Dynamic QR TLV structure', () => {
    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970422',
      account_number: '1900191919',
      amount_vnd: 78000,
      order_code: 'POS-S01-20261122-001',
      vietqr_ref_code: 'VQR-POS-S01-20261122-001',
      merchant_name: 'CF19 TAY NGUYEN COFFEE',
      merchant_city: 'BUON MA THUOT',
    });

    expect(built.is_dynamic).toBe(true);
    expect(built.emvco_payload.startsWith('000201010212')).toBe(true);
    expect(built.emvco_payload).toContain(`0010${NAPAS_GUID}`);
    expect(built.emvco_payload).toContain('000697042201101900191919');
    expect(built.emvco_payload).toContain(`0208${NAPAS_SERVICE_CODE_ACCOUNT}`);
    expect(built.emvco_payload).toContain('52045814');
    expect(built.emvco_payload).toContain('5303704');
    expect(built.emvco_payload).toContain('540578000');
    expect(built.emvco_payload).toContain('5802VN');
    expect(built.emvco_payload).toContain('5922CF19 TAY NGUYEN COFFEE');
    expect(built.emvco_payload).toContain('6013BUON MA THUOT');
    expect(built.emvco_payload).toContain('0120POS-S01-20261122-001');
    expect(built.emvco_payload).toContain('0824VQR-POS-S01-20261122-001');
    expect(built.emvco_payload.endsWith(`6304${built.crc16_hex}`)).toBe(true);
    expect(verifyEmvCoPayloadCrc(built.emvco_payload)).toBe(true);
  });

  it('6. buildEmvCoDynamicVietQrPayload applies default merchant name and city when omitted', () => {
    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970436',
      account_number: '001100223344',
      amount_vnd: 45000,
      order_code: 'POS-S02-001',
      vietqr_ref_code: 'VQR-POS-S02-001',
    });

    expect(built.merchant_name).toBe(DEFAULT_VIETQR_MERCHANT_NAME);
    expect(built.merchant_city).toBe(DEFAULT_VIETQR_MERCHANT_CITY);
    expect(verifyEmvCoPayloadCrc(built.emvco_payload)).toBe(true);
  });

  it('7. buildEmvCoDynamicVietQrPayload transliterates Vietnamese diacritics and enforces EMVCo max lengths (25/15)', () => {
    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970422',
      account_number: '88886666',
      amount_vnd: 120000,
      order_code: 'POS-S03-009',
      vietqr_ref_code: 'VQR-POS-S03-009',
      merchant_name: 'Cà Phê Đắk Lắk Tây Nguyên Siêu Đậm Đà',
      merchant_city: 'Đắk Lắk - Buôn Ma Thuột',
    });

    expect(built.merchant_name).toBe('CA PHE DAK LAK TAY NGUYEN');
    expect(built.merchant_name.length).toBeLessThanOrEqual(25);
    expect(built.merchant_city).toBe('DAK LAK - BUON');
    expect(built.merchant_city.length).toBeLessThanOrEqual(15);
    expect(verifyEmvCoPayloadCrc(built.emvco_payload)).toBe(true);
  });

  it('8. buildEmvCoDynamicVietQrPayload rejects invalid bank BIN, account number, or non-positive/float amount', () => {
    expect(() =>
      buildEmvCoDynamicVietQrPayload({
        bank_bin: '97042',
        account_number: '1900191919',
        amount_vnd: 50000,
        order_code: 'POS-1',
        vietqr_ref_code: 'VQR-1',
      }),
    ).toThrow(/EMVCO_INVALID_BANK_BIN/);

    expect(() =>
      buildEmvCoDynamicVietQrPayload({
        bank_bin: '970422',
        account_number: '12',
        amount_vnd: 50000,
        order_code: 'POS-1',
        vietqr_ref_code: 'VQR-1',
      }),
    ).toThrow(/EMVCO_INVALID_ACCOUNT_NO/);

    expect(() =>
      buildEmvCoDynamicVietQrPayload({
        bank_bin: '970422',
        account_number: '1900191919',
        amount_vnd: 0,
        order_code: 'POS-1',
        vietqr_ref_code: 'VQR-1',
      }),
    ).toThrow(/EMVCO_INVALID_AMOUNT/);

    expect(() =>
      buildEmvCoDynamicVietQrPayload({
        bank_bin: '970422',
        account_number: '1900191919',
        amount_vnd: 50000.5,
        order_code: 'POS-1',
        vietqr_ref_code: 'VQR-1',
      }),
    ).toThrow(/EMVCO_INVALID_AMOUNT/);
  });

  it('9. verifyEmvCoPayloadCrc detects amount tampering (1-digit change in Tag 54)', () => {
    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970422',
      account_number: '1900191919',
      amount_vnd: 78000,
      order_code: 'POS-S01-101',
      vietqr_ref_code: 'VQR-POS-S01-101',
    });

    const tamperedAmountPayload = built.emvco_payload.replace('540578000', '540518000');
    expect(tamperedAmountPayload).not.toBe(built.emvco_payload);
    expect(verifyEmvCoPayloadCrc(built.emvco_payload)).toBe(true);
    expect(verifyEmvCoPayloadCrc(tamperedAmountPayload)).toBe(false);
  });

  it('10. verifyEmvCoPayloadCrc detects beneficiary account number tampering (Tag 38)', () => {
    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970422',
      account_number: '1900191919',
      amount_vnd: 95000,
      order_code: 'POS-S01-102',
      vietqr_ref_code: 'VQR-POS-S01-102',
    });

    const tamperedAccountPayload = built.emvco_payload.replace('1900191919', '1900999999');
    expect(verifyEmvCoPayloadCrc(tamperedAccountPayload)).toBe(false);
  });

  it('11. verifyEmvCoPayloadCrc rejects malformed, truncated, missing-6304, or lowercase-CRC payloads', () => {
    const built = buildEmvCoDynamicVietQrPayload({
      bank_bin: '970422',
      account_number: '1900191919',
      amount_vnd: 35000,
      order_code: 'POS-S01-103',
      vietqr_ref_code: 'VQR-POS-S01-103',
    });

    expect(verifyEmvCoPayloadCrc('')).toBe(false);
    expect(verifyEmvCoPayloadCrc('short')).toBe(false);
    expect(verifyEmvCoPayloadCrc(built.emvco_payload.replace('6304', '6305'))).toBe(false);
    expect(verifyEmvCoPayloadCrc(`${built.emvco_payload.slice(0, -4)}abcd`)).toBe(false);
  });

  it('12. extractVietQrRefFromTransferContent extracts VQR code from MB/VCB dot-delimited memo', () => {
    const memo = 'MBVCB.998123.VQR-POS-20261122-001 chuyen khoan';
    expect(extractVietQrRefFromTransferContent(memo)).toBe('VQR-POS-20261122-001');
  });

  it('13. extractVietQrRefFromTransferContent extracts underscore-delimited IBFT VQR reference code', () => {
    const memo = 'IBFT VQR_S01_0001GD';
    expect(extractVietQrRefFromTransferContent(memo)).toBe('VQR_S01_0001GD');
  });

  it('14. extractVietQrRefFromTransferContent extracts VQR code from standard Vietnamese transfer memo and normalizes case', () => {
    expect(extractVietQrRefFromTransferContent('TT don hang VQR-1002')).toBe('VQR-1002');
    expect(extractVietQrRefFromTransferContent('ck thanh toan vqr-s02-9988.')).toBe(
      'VQR-S02-9988',
    );
  });

  it('15. extractVietQrRefFromTransferContent returns null when no valid VQR reference exists', () => {
    expect(extractVietQrRefFromTransferContent('Chuyen tien uong ca phe')).toBeNull();
    expect(extractVietQrRefFromTransferContent('   ')).toBeNull();
    expect(extractVietQrRefFromTransferContent('ORDER-1001')).toBeNull();
  });

  it('16. buildVoiceAnnouncementScript builds exact Vietnamese speaker message and C-major arpeggio chime', () => {
    const announcement = buildVoiceAnnouncementScript({
      order_id: '90000000-0000-4000-8000-000000000001',
      order_code: 'POS-S01-001',
      store_id: SEED_IDS.stores.store01,
      amount_vnd: 78000,
      vietqr_ref_code: 'VQR-POS-S01-001',
      generated_at: '2026-11-22T08:00:00.000Z',
    });

    expect(announcement.formatted_amount_vnd).toBe('78.000');
    expect(announcement.message_vi).toBe(
      'Ting ting! Đã nhận chuyển khoản 78.000 đồng cho đơn hàng POS-S01-001.',
    );
    expect(announcement.lang).toBe('vi-VN');
    expect(announcement.chime_frequencies_hz).toEqual(DEFAULT_SPEAKER_CHIME_FREQUENCIES_HZ);
    expect(announcement.chime_frequencies_hz).toEqual([523.25, 659.25, 783.99, 1046.5]);
  });

  it('17. buildVoiceAnnouncementScript formats multi-million VND with dot separators and rejects non-positive amount', () => {
    const announcement = buildVoiceAnnouncementScript({
      order_id: '90000000-0000-4000-8000-000000000002',
      order_code: 'POS-S03-099',
      store_id: SEED_IDS.stores.store03,
      amount_vnd: 1250000,
    });

    expect(announcement.formatted_amount_vnd).toBe('1.250.000');
    expect(announcement.message_vi).toBe(
      'Ting ting! Đã nhận chuyển khoản 1.250.000 đồng cho đơn hàng POS-S03-099.',
    );

    expect(() =>
      buildVoiceAnnouncementScript({
        order_id: '90000000-0000-4000-8000-000000000002',
        order_code: 'POS-S03-099',
        store_id: SEED_IDS.stores.store03,
        amount_vnd: 0,
      }),
    ).toThrow(/SPEAKER_INVALID_AMOUNT/);
  });

  it('18. GenerateOrderVietQrSchema validates store_id, order_id and optional 6-digit NAPAS bank BIN', () => {
    const valid = GenerateOrderVietQrSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      order_id: '90000000-0000-4000-8000-000000000001',
      bank_bin: '970422',
      account_number: '1900191919',
    });
    expect(valid.success).toBe(true);

    const invalidBin = GenerateOrderVietQrSchema.safeParse({
      store_id: SEED_IDS.stores.store01,
      order_id: '90000000-0000-4000-8000-000000000001',
      bank_bin: '9704',
    });
    expect(invalidBin.success).toBe(false);
  });

  it('19. VietQrBankingWebhookPayloadSchema accepts valid banking IPN payload with transfer_content extraction', () => {
    const parsed = VietQrBankingWebhookPayloadSchema.safeParse({
      idempotency_key: 'IPN-MB-20261122-0001',
      bank_tx_id: 'FT2632600019882',
      amount_vnd: 78000,
      transfer_content: 'MBVCB.998123.VQR-POS-20261122-001 chuyen khoan',
      occurred_at: '2026-11-22T08:15:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });

  it('20. VietQrBankingWebhookPayloadSchema rejects float or non-positive VND amounts and short keys', () => {
    const floatAmount = VietQrBankingWebhookPayloadSchema.safeParse({
      idempotency_key: 'IPN-001',
      bank_tx_id: 'FT001',
      amount_vnd: 78000.25,
      transfer_content: 'TT VQR-1002',
    });
    expect(floatAmount.success).toBe(false);

    const zeroAmount = VietQrBankingWebhookPayloadSchema.safeParse({
      idempotency_key: 'IPN-002',
      bank_tx_id: 'FT002',
      amount_vnd: 0,
      transfer_content: 'TT VQR-1002',
    });
    expect(zeroAmount.success).toBe(false);

    const shortKey = VietQrBankingWebhookPayloadSchema.safeParse({
      idempotency_key: 'AB',
      bank_tx_id: 'FT003',
      amount_vnd: 45000,
      transfer_content: 'TT VQR-1002',
    });
    expect(shortKey.success).toBe(false);
  });

  it('21. SimulateVietQrWebhookSchema applies default simulate_duplicate=false when omitted', () => {
    const parsed = SimulateVietQrWebhookSchema.parse({
      store_id: SEED_IDS.stores.store01,
      order_id: '90000000-0000-4000-8000-000000000001',
    });
    expect(parsed.simulate_duplicate).toBe(false);
    expect(parsed.amount_vnd).toBeUndefined();
  });

  it('22. WebhookLogQuerySchema coerces numeric string limit and enforces [1..200] bounds', () => {
    const parsed = WebhookLogQuerySchema.parse({
      store_id: SEED_IDS.stores.store01,
      limit: '25',
    });
    expect(parsed.limit).toBe(25);

    const overLimit = WebhookLogQuerySchema.safeParse({
      limit: 500,
    });
    expect(overLimit.success).toBe(false);
  });
});
```
