import type { B2bPriceTier, BaseUnit, PaymentStatus } from '../enums.js';
import type {
  ArAgingBucket,
  B2bCreditCheckResultDTO,
  B2bPriceQuoteSource,
  FifoInvoiceSettlementSliceDTO,
} from '../types/b2b.types.js';

export interface B2bPriceTierCandidate {
  price_tier: B2bPriceTier;
  min_qty_kg: number;
  unit_price_vnd: number;
  is_active?: boolean;
}

export interface ResolvedTieredPrice {
  qty_kg: number;
  unit_price_vnd: number;
  applied_price_tier: B2bPriceTier | null;
  price_source: B2bPriceQuoteSource;
  estimated_line_total_vnd: number;
}

export interface PendingB2bInvoiceCandidate {
  id: string;
  order_code: string;
  ordered_at: string;
  total_amount_vnd: number;
  paid_amount_vnd: number;
  payment_status: PaymentStatus;
}

export interface InternalTransferLinePriceInput {
  qty_base_unit: number;
  base_unit: BaseUnit;
  internal_unit_price_vnd: number;
}

/**
 * 1. Converts base unit quantity to kg-equivalent billing quantity for tiered pricing:
 *    - 'g' -> qtyBaseUnit / 1000
 *    - 'ml' | 'pcs' -> qtyBaseUnit
 */
export function convertToKgForTierPricing(
  qtyBaseUnit: number,
  baseUnit: BaseUnit,
): number {
  if (!Number.isFinite(qtyBaseUnit) || qtyBaseUnit < 0) {
    throw new RangeError('qtyBaseUnit must be a non-negative finite number');
  }
  if (baseUnit === 'g') {
    return qtyBaseUnit / 1000;
  }
  return qtyBaseUnit;
}

/**
 * 2. Resolves the best (lowest) B2B wholesale unit price in integer VND matching:
 *    - Active tiers where tier.price_tier === customerPriceTier OR tier.min_qty_kg <= qty_kg
 *    - Falls back to retailPriceVnd (if > 0), otherwise internalTransferPriceVnd.
 */
export function resolveB2bTieredUnitPriceVnd(params: {
  qtyBaseUnit: number;
  baseUnit: BaseUnit;
  customerPriceTier: B2bPriceTier;
  tiers: readonly B2bPriceTierCandidate[];
  fallbackRetailPriceVnd: number;
  fallbackInternalTransferPriceVnd: number;
}): ResolvedTieredPrice {
  const {
    qtyBaseUnit,
    baseUnit,
    customerPriceTier,
    tiers,
    fallbackRetailPriceVnd,
    fallbackInternalTransferPriceVnd,
  } = params;

  if (!Number.isFinite(qtyBaseUnit) || qtyBaseUnit <= 0) {
    throw new RangeError('qtyBaseUnit must be strictly positive');
  }

  const qtyKg = convertToKgForTierPricing(qtyBaseUnit, baseUnit);
  const eligible = tiers.filter(
    (tier) =>
      tier.is_active !== false &&
      (tier.price_tier === customerPriceTier || tier.min_qty_kg <= qtyKg),
  );

  if (eligible.length > 0) {
    const bestTier = eligible.reduce((best, current) =>
      current.unit_price_vnd < best.unit_price_vnd ? current : best,
    );
    const unitPriceVnd = Math.round(bestTier.unit_price_vnd);
    return {
      qty_kg: qtyKg,
      unit_price_vnd: unitPriceVnd,
      applied_price_tier: bestTier.price_tier,
      price_source: 'PRICE_TIER',
      estimated_line_total_vnd: Math.round(qtyKg * unitPriceVnd),
    };
  }

  if (fallbackRetailPriceVnd > 0) {
    const unitPriceVnd = Math.round(fallbackRetailPriceVnd);
    return {
      qty_kg: qtyKg,
      unit_price_vnd: unitPriceVnd,
      applied_price_tier: null,
      price_source: 'RETAIL_FALLBACK',
      estimated_line_total_vnd: Math.round(qtyKg * unitPriceVnd),
    };
  }

  const unitPriceVnd = Math.round(Math.max(0, fallbackInternalTransferPriceVnd));
  return {
    qty_kg: qtyKg,
    unit_price_vnd: unitPriceVnd,
    applied_price_tier: null,
    price_source: 'INTERNAL_FALLBACK',
    estimated_line_total_vnd: Math.round(qtyKg * unitPriceVnd),
  };
}

/**
 * 3. Evaluates B2B credit limit compliance before committing a wholesale order.
 */
export function calculateB2bCreditCheck(params: {
  currentDebtVnd: number;
  creditLimitVnd: number;
  totalAmountVnd: number;
  paidAmountVnd: number;
}): B2bCreditCheckResultDTO {
  const { currentDebtVnd, creditLimitVnd, totalAmountVnd, paidAmountVnd } = params;

  if (
    currentDebtVnd < 0 ||
    creditLimitVnd < 0 ||
    totalAmountVnd < 0 ||
    paidAmountVnd < 0
  ) {
    throw new RangeError('Credit check monetary inputs cannot be negative');
  }
  if (paidAmountVnd > totalAmountVnd) {
    throw new RangeError('paidAmountVnd cannot exceed totalAmountVnd');
  }

  const debtAddedVnd = Math.round(totalAmountVnd - paidAmountVnd);
  const projectedDebtVnd = Math.round(currentDebtVnd + debtAddedVnd);
  const exceedsCreditLimit = projectedDebtVnd > creditLimitVnd;
  const remainingCreditVnd = Math.max(0, Math.round(creditLimitVnd - projectedDebtVnd));

  return {
    current_debt_vnd: Math.round(currentDebtVnd),
    credit_limit_vnd: Math.round(creditLimitVnd),
    total_amount_vnd: Math.round(totalAmountVnd),
    paid_amount_vnd: Math.round(paidAmountVnd),
    debt_added_vnd: debtAddedVnd,
    projected_debt_vnd: projectedDebtVnd,
    remaining_credit_vnd: remainingCreditVnd,
    exceeds_credit_limit: exceedsCreditLimit,
  };
}

/**
 * 4. Applies a customer debt payment across PENDING invoices in strict FIFO order:
 *    ordered_at ASC, order_code ASC, id ASC.
 */
export function settleFifoPendingInvoices(
  pendingInvoices: readonly PendingB2bInvoiceCandidate[],
  paymentAmountVnd: number,
): {
  settled: FifoInvoiceSettlementSliceDTO[];
  totalAppliedVnd: number;
  unappliedPaymentVnd: number;
} {
  if (!Number.isFinite(paymentAmountVnd) || paymentAmountVnd <= 0) {
    throw new RangeError('paymentAmountVnd must be strictly positive');
  }

  const sorted = pendingInvoices
    .filter(
      (inv) =>
        inv.payment_status === 'PENDING' &&
        inv.paid_amount_vnd < inv.total_amount_vnd,
    )
    .sort((a, b) => {
      const aTs = Date.parse(a.ordered_at);
      const bTs = Date.parse(b.ordered_at);
      if (!Number.isNaN(aTs) && !Number.isNaN(bTs) && aTs !== bTs) {
        return aTs - bTs;
      }
      if (a.ordered_at !== b.ordered_at) {
        return a.ordered_at.localeCompare(b.ordered_at);
      }
      const codeCmp = a.order_code.localeCompare(b.order_code);
      if (codeCmp !== 0) {
        return codeCmp;
      }
      return a.id.localeCompare(b.id);
    });

  let remainingPayment = Math.round(paymentAmountVnd);
  let totalAppliedVnd = 0;
  const settled: FifoInvoiceSettlementSliceDTO[] = [];

  for (const inv of sorted) {
    if (remainingPayment <= 0) {
      break;
    }

    const outstanding = inv.total_amount_vnd - inv.paid_amount_vnd;
    const appliedVnd = Math.min(remainingPayment, outstanding);
    const newPaidVnd = inv.paid_amount_vnd + appliedVnd;
    const newStatus: PaymentStatus =
      newPaidVnd === inv.total_amount_vnd ? 'PAID' : 'PENDING';

    settled.push({
      order_id: inv.id,
      order_code: inv.order_code,
      applied_vnd: appliedVnd,
      previous_paid_amount_vnd: inv.paid_amount_vnd,
      new_paid_amount_vnd: newPaidVnd,
      new_payment_status: newStatus,
    });

    totalAppliedVnd += appliedVnd;
    remainingPayment -= appliedVnd;
  }

  return {
    settled,
    totalAppliedVnd,
    unappliedPaymentVnd: remainingPayment,
  };
}

/**
 * 5. Classifies AR invoice aging bucket based on days overdue from due_date.
 */
export function classifyArAgingBucket(daysOverdue: number): ArAgingBucket {
  if (!Number.isFinite(daysOverdue)) {
    throw new RangeError('daysOverdue must be finite');
  }
  if (daysOverdue <= 0) {
    return 'CURRENT';
  }
  if (daysOverdue <= 30) {
    return 'OVERDUE_1_30';
  }
  if (daysOverdue <= 60) {
    return 'OVERDUE_31_60';
  }
  return 'OVERDUE_60_PLUS';
}

/**
 * 6. Computes total internal transfer value in integer VND across transfer lines,
 *    converting 'g' quantities to kg-equivalent to match internal_transfer_price_vnd.
 */
export function calculateInternalTransferTotalVnd(
  lines: readonly InternalTransferLinePriceInput[],
): number {
  let totalVnd = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.qty_base_unit) || line.qty_base_unit < 0) {
      throw new RangeError('qty_base_unit must be non-negative');
    }
    if (
      !Number.isFinite(line.internal_unit_price_vnd) ||
      line.internal_unit_price_vnd < 0
    ) {
      throw new RangeError('internal_unit_price_vnd must be non-negative');
    }
    const billingQty = convertToKgForTierPricing(
      line.qty_base_unit,
      line.base_unit,
    );
    totalVnd += Math.round(billingQty * line.internal_unit_price_vnd);
  }
  return totalVnd;
}
