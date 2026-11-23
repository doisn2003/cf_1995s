import type {
  CentralWarehousePnlDTO,
  CentralWarehousePnlInputDTO,
  ClonedMenuProductPricePreviewDTO,
  EnterpriseConsolidatedPnlDTO,
  FranchiseMenuProductSourceInput,
  StoreNodePnlDTO,
  StoreNodePnlInputDTO,
} from '../types/executivePnl.types.js';

export const DEFAULT_FRANCHISE_ROYALTY_PCT = 5.0;
export const MIN_FRANCHISE_PRICE_MULTIPLIER = 0.5;
export const MAX_FRANCHISE_PRICE_MULTIPLIER = 3.0;

function roundPct2(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertNonNegativeInt(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
  return Math.round(value);
}

/**
 * 1. Central Warehouse Supply Chain P&L (External B2B Wholesale vs. Internal Store Transfers).
 *    Strictly confidential to SUPER_ADMIN.
 */
export function calculateCentralWarehousePnl(
  input: CentralWarehousePnlInputDTO,
): CentralWarehousePnlDTO {
  const b2bRevenue = assertNonNegativeInt(
    input.b2b_external_revenue_vnd,
    'b2b_external_revenue_vnd',
  );
  const b2bRawCogs = assertNonNegativeInt(
    input.b2b_raw_cogs_vnd,
    'b2b_raw_cogs_vnd',
  );
  const internalRevenue = assertNonNegativeInt(
    input.internal_transfer_revenue_vnd,
    'internal_transfer_revenue_vnd',
  );
  const internalRawCogs = assertNonNegativeInt(
    input.internal_transfer_raw_cogs_vnd,
    'internal_transfer_raw_cogs_vnd',
  );
  const opex = assertNonNegativeInt(
    input.warehouse_operating_expense_vnd ?? 0,
    'warehouse_operating_expense_vnd',
  );

  const b2bGrossProfit = b2bRevenue - b2bRawCogs;
  const internalMarkupProfit = internalRevenue - internalRawCogs;
  const totalRevenue = b2bRevenue + internalRevenue;
  const totalRawCogs = b2bRawCogs + internalRawCogs;
  const totalGrossProfit = b2bGrossProfit + internalMarkupProfit;
  const netProfit = totalGrossProfit - opex;

  const grossMarginPct =
    totalRevenue <= 0 ? 0 : roundPct2((totalGrossProfit / totalRevenue) * 100);
  const netMarginPct =
    totalRevenue <= 0 ? 0 : roundPct2((netProfit / totalRevenue) * 100);

  return {
    warehouse_store_id: input.warehouse_store_id,
    warehouse_code: input.warehouse_code,
    warehouse_name: input.warehouse_name,
    b2b_orders_count: Math.max(0, Math.round(input.b2b_orders_count ?? 0)),
    reconciled_transfers_count: Math.max(
      0,
      Math.round(input.reconciled_transfers_count ?? 0),
    ),
    b2b_external_revenue_vnd: b2bRevenue,
    b2b_raw_cogs_vnd: b2bRawCogs,
    b2b_external_gross_profit_vnd: b2bGrossProfit,
    internal_transfer_revenue_vnd: internalRevenue,
    internal_transfer_raw_cogs_vnd: internalRawCogs,
    internal_markup_profit_vnd: internalMarkupProfit,
    warehouse_total_revenue_vnd: totalRevenue,
    warehouse_total_raw_cogs_vnd: totalRawCogs,
    warehouse_total_gross_profit_vnd: totalGrossProfit,
    warehouse_operating_expense_vnd: opex,
    warehouse_net_profit_vnd: netProfit,
    warehouse_gross_margin_pct: grossMarginPct,
    warehouse_net_margin_pct: netMarginPct,
  };
}

/**
 * 2. Individual Retail / Franchise Store P&L (POS Revenue - Internal BOM COGS - Labor - Losses - Royalty).
 */
export function calculateStoreNodePnl(
  input: StoreNodePnlInputDTO,
): StoreNodePnlDTO {
  const cashRevenue = assertNonNegativeInt(input.cash_revenue_vnd, 'cash_revenue_vnd');
  const vietqrRevenue = assertNonNegativeInt(
    input.vietqr_revenue_vnd,
    'vietqr_revenue_vnd',
  );
  const bomCogs = assertNonNegativeInt(
    input.store_internal_bom_cogs_vnd,
    'store_internal_bom_cogs_vnd',
  );
  const laborCost = assertNonNegativeInt(
    input.labor_cost_vnd ?? 0,
    'labor_cost_vnd',
  );
  const cashShortage = assertNonNegativeInt(
    input.cash_shortage_loss_vnd ?? 0,
    'cash_shortage_loss_vnd',
  );
  const shrinkageLoss = assertNonNegativeInt(
    input.stocktake_shrinkage_loss_vnd ?? 0,
    'stocktake_shrinkage_loss_vnd',
  );
  const royaltyPct = input.franchise_royalty_pct ?? DEFAULT_FRANCHISE_ROYALTY_PCT;
  if (!Number.isFinite(royaltyPct) || royaltyPct < 0 || royaltyPct > 50) {
    throw new RangeError('franchise_royalty_pct must be between 0 and 50');
  }

  const posGrossRevenue = cashRevenue + vietqrRevenue;
  const grossProfit = posGrossRevenue - bomCogs;
  const royaltyFee =
    input.store_type === 'FRANCHISE_STORE'
      ? Math.round((posGrossRevenue * royaltyPct) / 100)
      : 0;
  const netProfit =
    grossProfit - laborCost - cashShortage - shrinkageLoss - royaltyFee;

  const grossMarginPct =
    posGrossRevenue <= 0
      ? 0
      : roundPct2((grossProfit / posGrossRevenue) * 100);
  const netMarginPct =
    posGrossRevenue <= 0
      ? 0
      : roundPct2((netProfit / posGrossRevenue) * 100);

  return {
    store_id: input.store_id,
    store_code: input.store_code,
    store_name: input.store_name,
    store_type: input.store_type,
    price_multiplier: input.price_multiplier,
    paid_orders_count: Math.max(0, Math.round(input.paid_orders_count ?? 0)),
    cash_revenue_vnd: cashRevenue,
    vietqr_revenue_vnd: vietqrRevenue,
    pos_gross_revenue_vnd: posGrossRevenue,
    store_internal_bom_cogs_vnd: bomCogs,
    store_gross_profit_vnd: grossProfit,
    labor_cost_vnd: laborCost,
    cash_shortage_loss_vnd: cashShortage,
    stocktake_shrinkage_loss_vnd: shrinkageLoss,
    franchise_royalty_fee_vnd: royaltyFee,
    store_net_profit_vnd: netProfit,
    gross_margin_pct: grossMarginPct,
    net_margin_pct: netMarginPct,
  };
}

/**
 * 3. Enterprise Consolidated P&L with Intercompany Transfer Revenue Elimination & Store Ranking.
 */
export function consolidateEnterprisePnl(params: {
  warehouse: CentralWarehousePnlDTO;
  stores: readonly StoreNodePnlDTO[];
  period_from?: string | null;
  period_to?: string | null;
  generated_at?: string;
}): EnterpriseConsolidatedPnlDTO {
  const { warehouse, stores } = params;

  const rankedStores: StoreNodePnlDTO[] = [...stores]
    .sort((a, b) => {
      if (b.store_net_profit_vnd !== a.store_net_profit_vnd) {
        return b.store_net_profit_vnd - a.store_net_profit_vnd;
      }
      if (b.pos_gross_revenue_vnd !== a.pos_gross_revenue_vnd) {
        return b.pos_gross_revenue_vnd - a.pos_gross_revenue_vnd;
      }
      return a.store_code.localeCompare(b.store_code);
    })
    .map((store, idx) => ({
      ...store,
      rank: idx + 1,
    }));

  const totalStorePosRevenue = rankedStores.reduce(
    (sum, s) => sum + s.pos_gross_revenue_vnd,
    0,
  );
  const totalStoreNetProfit = rankedStores.reduce(
    (sum, s) => sum + s.store_net_profit_vnd,
    0,
  );
  const totalRoyaltyIncome = rankedStores.reduce(
    (sum, s) => sum + s.franchise_royalty_fee_vnd,
    0,
  );
  const totalCashShortageLoss = rankedStores.reduce(
    (sum, s) => sum + s.cash_shortage_loss_vnd,
    0,
  );
  const totalShrinkageLoss = rankedStores.reduce(
    (sum, s) => sum + s.stocktake_shrinkage_loss_vnd,
    0,
  );

  // Eliminate internal warehouse->store transfers from consolidated external top-line revenue
  const consolidatedExternalRevenue =
    warehouse.b2b_external_revenue_vnd + totalStorePosRevenue;
  const intercompanyEliminatedRevenue = warehouse.internal_transfer_revenue_vnd;
  const consolidatedNetProfit =
    warehouse.warehouse_net_profit_vnd +
    totalStoreNetProfit +
    totalRoyaltyIncome;
  const consolidatedNetMarginPct =
    consolidatedExternalRevenue <= 0
      ? 0
      : roundPct2((consolidatedNetProfit / consolidatedExternalRevenue) * 100);

  return {
    period_from: params.period_from ?? null,
    period_to: params.period_to ?? null,
    generated_at: params.generated_at ?? new Date().toISOString(),
    warehouse: { ...warehouse },
    stores: rankedStores,
    total_store_pos_revenue_vnd: totalStorePosRevenue,
    total_store_net_profit_vnd: totalStoreNetProfit,
    total_franchise_royalty_income_vnd: totalRoyaltyIncome,
    total_cash_shortage_loss_vnd: totalCashShortageLoss,
    total_stocktake_shrinkage_loss_vnd: totalShrinkageLoss,
    consolidated_external_revenue_vnd: consolidatedExternalRevenue,
    intercompany_eliminated_revenue_vnd: intercompanyEliminatedRevenue,
    consolidated_net_profit_vnd: consolidatedNetProfit,
    consolidated_net_margin_pct: consolidatedNetMarginPct,
  };
}

/**
 * 4. 1-Click Franchise Store Menu Pricing Preview with Regional Multiplier & Estimated BOM Gross Margin.
 */
export function previewClonedStoreMenuPricing(
  priceMultiplier: number,
  products: readonly FranchiseMenuProductSourceInput[],
): ClonedMenuProductPricePreviewDTO[] {
  if (
    !Number.isFinite(priceMultiplier) ||
    priceMultiplier < MIN_FRANCHISE_PRICE_MULTIPLIER ||
    priceMultiplier > MAX_FRANCHISE_PRICE_MULTIPLIER
  ) {
    throw new RangeError(
      `price_multiplier must be between ${MIN_FRANCHISE_PRICE_MULTIPLIER} and ${MAX_FRANCHISE_PRICE_MULTIPLIER}`,
    );
  }

  return products.map((product) => {
    const masterBase = assertNonNegativeInt(
      product.master_base_price_vnd,
      'master_base_price_vnd',
    );
    const bomCogs = assertNonNegativeInt(
      product.default_variant_bom_cogs_vnd,
      'default_variant_bom_cogs_vnd',
    );
    const clonedBase = Math.round(masterBase * priceMultiplier);
    const priceDiff = clonedBase - masterBase;
    const grossProfit = clonedBase - bomCogs;
    const grossMarginPct =
      clonedBase <= 0 ? 0 : roundPct2((grossProfit / clonedBase) * 100);

    return {
      product_id: product.product_id,
      product_code: product.product_code,
      product_name: product.product_name,
      master_base_price_vnd: masterBase,
      cloned_base_price_vnd: clonedBase,
      price_diff_vnd: priceDiff,
      default_variant_bom_cogs_vnd: bomCogs,
      estimated_gross_profit_vnd: grossProfit,
      estimated_gross_margin_pct: grossMarginPct,
    };
  });
}
