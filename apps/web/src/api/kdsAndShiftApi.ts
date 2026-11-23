import type {
  BaristaAlertSeverity,
  BaristaLowStockAlertDTO,
  BlindShiftCloseResultDTO,
  KdsOrderCompletionResultDTO,
  KdsStatus,
  KdsTicketBoardItemDTO,
  PosShiftFullDto,
  StocktakePreviewRowDTO,
  StoreDailyStocktakeBatchResultDTO,
  StoreDailyStocktakeItemResultDTO,
  SubmitStoreDailyStocktakeInput,
} from '@cf19/shared';
import { apiRequest } from './httpClient';

export async function fetchStoreKdsBoardApi(
  storeId: string,
  includeCompleted = false,
): Promise<KdsTicketBoardItemDTO[]> {
  const res = await apiRequest<KdsTicketBoardItemDTO[]>(
    `/api/v1/kds/stores/${storeId}/board?include_completed=${includeCompleted}`,
  );
  return res.data;
}

export async function advanceKdsTicketApi(
  storeId: string,
  orderId: string,
  targetStatus: KdsStatus,
  allowPartialOnShortage = false,
): Promise<KdsOrderCompletionResultDTO> {
  const res = await apiRequest<KdsOrderCompletionResultDTO>(
    `/api/v1/kds/stores/${storeId}/orders/${orderId}/advance`,
    {
      method: 'POST',
      body: JSON.stringify({
        target_status: targetStatus,
        allow_partial_on_shortage: allowPartialOnShortage,
      }),
    },
  );
  return res.data;
}

export async function completeKdsOrderBomApi(
  storeId: string,
  orderId: string,
  allowPartialOnShortage = false,
): Promise<KdsOrderCompletionResultDTO> {
  const res = await apiRequest<KdsOrderCompletionResultDTO>(
    `/api/v1/kds/stores/${storeId}/orders/${orderId}/complete-bom`,
    {
      method: 'POST',
      body: JSON.stringify({ allow_partial_on_shortage: allowPartialOnShortage }),
    },
  );
  return res.data;
}

export async function fetchLowStockAlertsApi(
  storeId: string,
): Promise<BaristaLowStockAlertDTO[]> {
  const res = await apiRequest<BaristaLowStockAlertDTO[]>(
    `/api/v1/kds/stores/${storeId}/low-stock-alerts`,
  );
  return res.data;
}

export async function reportBaristaLowStockAlertApi(
  storeId: string,
  input: {
    inventory_item_id: string;
    severity: BaristaAlertSeverity;
    note: string;
  },
): Promise<BaristaLowStockAlertDTO> {
  const res = await apiRequest<BaristaLowStockAlertDTO>(
    `/api/v1/kds/stores/${storeId}/low-stock-alerts`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return res.data;
}

export async function resolveLowStockAlertApi(
  storeId: string,
  alertId: string,
): Promise<void> {
  await apiRequest(
    `/api/v1/kds/stores/${storeId}/low-stock-alerts/${alertId}/resolve`,
    { method: 'PATCH' },
  );
}

// SHIFTS
export async function fetchStoreShiftsApi(
  storeId: string,
): Promise<PosShiftFullDto[]> {
  const res = await apiRequest<PosShiftFullDto[]>(
    `/api/v1/shifts-stocktakes/stores/${storeId}/shifts`,
  );
  return res.data;
}

export async function openPosShiftApi(
  storeId: string,
  openingCashVnd: number,
  notes?: string,
): Promise<PosShiftFullDto> {
  const res = await apiRequest<PosShiftFullDto>(
    `/api/v1/shifts-stocktakes/stores/${storeId}/shifts/open`,
    {
      method: 'POST',
      body: JSON.stringify({ opening_cash_vnd: openingCashVnd, notes }),
    },
  );
  return res.data;
}

export async function blindClosePosShiftApi(
  storeId: string,
  shiftId: string,
  blindCountedCashVnd: number,
  notes?: string,
): Promise<BlindShiftCloseResultDTO> {
  const res = await apiRequest<BlindShiftCloseResultDTO>(
    `/api/v1/shifts-stocktakes/stores/${storeId}/shifts/${shiftId}/blind-close`,
    {
      method: 'POST',
      body: JSON.stringify({
        blind_counted_cash_vnd: blindCountedCashVnd,
        notes,
      }),
    },
  );
  return res.data;
}

// AUTO STOCKTAKE PREVIEW & SUBMIT
export async function fetchStocktakePreviewApi(
  storeId: string,
  stocktakeDate: string,
): Promise<StocktakePreviewRowDTO[]> {
  const res = await apiRequest<StocktakePreviewRowDTO[]>(
    `/api/v1/shifts-stocktakes/stores/${storeId}/stocktakes/preview?stocktake_date=${encodeURIComponent(stocktakeDate)}`,
  );
  return res.data;
}

export async function fetchStoreDailyStocktakesApi(
  storeId: string,
  stocktakeDate?: string,
): Promise<StoreDailyStocktakeItemResultDTO[]> {
  const qs = stocktakeDate
    ? `?stocktake_date=${encodeURIComponent(stocktakeDate)}`
    : '';
  const res = await apiRequest<StoreDailyStocktakeItemResultDTO[]>(
    `/api/v1/shifts-stocktakes/stores/${storeId}/stocktakes${qs}`,
  );
  return res.data;
}

export async function submitStoreDailyStocktakeApi(
  payload: SubmitStoreDailyStocktakeInput,
): Promise<StoreDailyStocktakeBatchResultDTO> {
  const res = await apiRequest<StoreDailyStocktakeBatchResultDTO>(
    `/api/v1/shifts-stocktakes/stores/${payload.store_id}/stocktakes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
