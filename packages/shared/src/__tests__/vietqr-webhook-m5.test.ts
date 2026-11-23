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
