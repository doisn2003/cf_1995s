import type {
  B2bCatalogOverviewDTO,
  B2bCustomerDto,
  B2bDebtLedgerEntryDto,
  B2bOrderItemDto,
  B2bPriceTierDto,
  CreateB2bCustomerInput,
  CreateB2bOrderDTO,
  CreateB2bOrderResultDTO,
  CreateB2cRetailOrderInput,
  CreateInternalTransferRequest,
  InternalTransferDispatchResultDTO,
  InternalTransferDto,
  InternalTransferReconcileResultDTO,
  ReconcileInternalTransferInput,
  RecordB2bDebtPaymentDTO,
  RecordB2bDebtPaymentResultDTO,
  UpdateB2bCustomerInput,
  UpsertB2bPriceTierInput,
} from '@cf19/shared';
import { apiRequest } from './httpClient';

export interface B2cRetailOrderRecord {
  id: string;
  order_code: string;
  retail_customer_name: string | null;
  retail_customer_phone: string | null;
  payment_method: string;
  payment_status: string;
  total_amount_vnd: number;
  cogs_amount_vnd: number;
  notes: string | null;
  created_at: string;
  items: B2bOrderItemDto[];
}

export type LiveB2bOverviewDTO = B2bCatalogOverviewDTO & {
  debt_ledger: B2bDebtLedgerEntryDto[];
  b2c_retail_orders: B2cRetailOrderRecord[];
};

export type LiveInternalTransferDto = InternalTransferDto & {
  to_store_code?: string;
  to_store_name?: string;
};

export async function fetchB2bOverviewApi(): Promise<LiveB2bOverviewDTO> {
  const res = await apiRequest<LiveB2bOverviewDTO>('/api/v1/b2b/overview');
  return res.data;
}

export async function createB2bCustomerApi(
  payload: CreateB2bCustomerInput,
): Promise<B2bCustomerDto> {
  const res = await apiRequest<B2bCustomerDto>('/api/v1/b2b/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateB2bCustomerApi(
  customerId: string,
  payload: UpdateB2bCustomerInput,
): Promise<B2bCustomerDto> {
  const res = await apiRequest<B2bCustomerDto>(
    `/api/v1/b2b/customers/${customerId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function upsertB2bPriceTierApi(
  payload: UpsertB2bPriceTierInput,
): Promise<B2bPriceTierDto> {
  const res = await apiRequest<B2bPriceTierDto>('/api/v1/b2b/price-tiers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteB2bPriceTierApi(tierId: string): Promise<void> {
  await apiRequest(`/api/v1/b2b/price-tiers/${tierId}`, { method: 'DELETE' });
}

export async function createB2bOrderApi(
  payload: CreateB2bOrderDTO,
): Promise<CreateB2bOrderResultDTO> {
  const res = await apiRequest<CreateB2bOrderResultDTO>('/api/v1/b2b/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function createB2cRetailOrderApi(
  payload: CreateB2cRetailOrderInput,
): Promise<B2cRetailOrderRecord> {
  const res = await apiRequest<B2cRetailOrderRecord>('/api/v1/b2b/retail-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function recordB2bDebtPaymentApi(
  payload: RecordB2bDebtPaymentDTO,
): Promise<RecordB2bDebtPaymentResultDTO> {
  const res = await apiRequest<RecordB2bDebtPaymentResultDTO>(
    '/api/v1/b2b/debt-payments',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

// 2-PHASE INTERNAL TRANSFERS
export async function fetchTransfersApi(
  storeId?: string,
): Promise<LiveInternalTransferDto[]> {
  const qs = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const res = await apiRequest<LiveInternalTransferDto[]>(`/api/v1/transfers${qs}`);
  return res.data;
}

export async function requestInternalTransferApi(
  payload: CreateInternalTransferRequest,
): Promise<LiveInternalTransferDto> {
  const res = await apiRequest<LiveInternalTransferDto>('/api/v1/transfers/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function dispatchInternalTransferApi(
  transferId: string,
  notes?: string,
): Promise<InternalTransferDispatchResultDTO> {
  const res = await apiRequest<InternalTransferDispatchResultDTO>(
    `/api/v1/transfers/${transferId}/dispatch`,
    {
      method: 'POST',
      body: JSON.stringify({ notes }),
    },
  );
  return res.data;
}

export async function reconcileInternalTransferApi(
  payload: ReconcileInternalTransferInput,
): Promise<InternalTransferReconcileResultDTO> {
  const res = await apiRequest<InternalTransferReconcileResultDTO>(
    `/api/v1/transfers/${payload.transfer_id}/reconcile`,
    {
      method: 'POST',
      body: JSON.stringify({ items: payload.items, notes: payload.notes }),
    },
  );
  return res.data;
}

export async function cancelInternalTransferApi(
  transferId: string,
  reason: string,
): Promise<LiveInternalTransferDto> {
  const res = await apiRequest<LiveInternalTransferDto>(
    `/api/v1/transfers/${transferId}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
  return res.data;
}
