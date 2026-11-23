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
