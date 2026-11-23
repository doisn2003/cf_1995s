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
