import type {
  CloneFranchiseStoreInput,
  CloneFranchiseStoreResultDTO,
  ClonedMenuProductPricePreviewDTO,
  EnterpriseConsolidatedPnlDTO,
  ExecutivePnlQueryInput,
} from '@cf19/shared';
import { apiRequest } from './httpClient';

export async function fetchExecutivePnlConsolidationApi(
  query: Partial<ExecutivePnlQueryInput> = {},
): Promise<EnterpriseConsolidatedPnlDTO> {
  const params = new URLSearchParams();
  if (query.period_from) params.set('period_from', query.period_from);
  if (query.period_to) params.set('period_to', query.period_to);
  if (query.warehouse_operating_expense_vnd !== undefined) {
    params.set(
      'warehouse_operating_expense_vnd',
      String(query.warehouse_operating_expense_vnd),
    );
  }
  if (query.franchise_royalty_pct !== undefined) {
    params.set('franchise_royalty_pct', String(query.franchise_royalty_pct));
  }
  const qs = params.toString();
  const res = await apiRequest<EnterpriseConsolidatedPnlDTO>(
    `/api/v1/analytics/pnl-consolidation${qs ? `?${qs}` : ''}`,
  );
  return res.data;
}

export async function previewFranchisePricingApi(
  priceMultiplier: number,
): Promise<ClonedMenuProductPricePreviewDTO[]> {
  const res = await apiRequest<ClonedMenuProductPricePreviewDTO[]>(
    `/api/v1/analytics/franchise/preview-pricing?price_multiplier=${encodeURIComponent(String(priceMultiplier))}`,
  );
  return res.data;
}

export async function cloneFranchiseStoreApi(
  payload: CloneFranchiseStoreInput,
): Promise<CloneFranchiseStoreResultDTO> {
  const res = await apiRequest<CloneFranchiseStoreResultDTO>(
    '/api/v1/analytics/franchise/clone-store',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
