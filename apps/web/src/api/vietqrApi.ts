import type {
  EmvCoVietQrPayloadDTO,
  PaymentWebhookLogDto,
  SimulateVietQrWebhookInput,
  VietQrWebhookProcessResultDTO,
} from '@cf19/shared';
import { apiRequest } from './httpClient';

export interface GenerateVietQrOverrides {
  bank_bin?: string;
  account_number?: string;
  account_name?: string;
  merchant_city?: string;
}

export async function generateOrderVietQrApi(
  storeId: string,
  orderId: string,
  overrides: GenerateVietQrOverrides = {},
): Promise<EmvCoVietQrPayloadDTO> {
  const res = await apiRequest<EmvCoVietQrPayloadDTO>(
    `/api/v1/vietqr/stores/${storeId}/orders/${orderId}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(overrides),
    },
  );
  return res.data;
}

export async function simulateOrderWebhookApi(
  storeId: string,
  orderId: string,
  options: Partial<SimulateVietQrWebhookInput> = {},
): Promise<VietQrWebhookProcessResultDTO> {
  const res = await apiRequest<VietQrWebhookProcessResultDTO>(
    `/api/v1/vietqr/stores/${storeId}/orders/${orderId}/simulate-webhook`,
    {
      method: 'POST',
      body: JSON.stringify(options),
    },
  );
  return res.data;
}

export async function fetchStoreWebhookLogsApi(
  storeId: string,
  orderId?: string,
  limit = 50,
): Promise<PaymentWebhookLogDto[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (orderId) params.set('order_id', orderId);
  const res = await apiRequest<PaymentWebhookLogDto[]>(
    `/api/v1/vietqr/stores/${storeId}/webhook-logs?${params.toString()}`,
  );
  return res.data;
}
