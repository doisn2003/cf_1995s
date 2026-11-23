import type { BaseUnit } from '../enums.js';

export const ROAST_YIELD_LOSS_MIN_NORMAL_PCT = 12.0;
export const ROAST_YIELD_LOSS_MAX_NORMAL_PCT = 20.0;

export interface FifoSortableLot {
  id: string;
  lot_code: string;
  roast_date: string | null;
  received_at: string;
}

/**
 * Converts a stored base_unit quantity into the billing/pricing quantity unit:
 *   - 'g' (grams) -> kilograms (qty / 1000) because coffee MAC/unit costs are per kg
 *   - 'ml' | 'pcs' -> 1:1 (price is per ml or per piece)
 */
export function convertBaseQtyToPricingUnit(
  qtyBaseUnit: number,
  baseUnit: BaseUnit = 'g',
): number {
  if (!Number.isFinite(qtyBaseUnit) || qtyBaseUnit < 0) {
    throw new RangeError('qtyBaseUnit must be a non-negative finite number');
  }
  return baseUnit === 'g' ? qtyBaseUnit / 1000 : qtyBaseUnit;
}

/**
 * Computes exact inventory stock value or FIFO slice COGS in integer VND,
 * respecting gram-to-kilogram conversion for 'g' items.
 */
export function calculateStockValueVnd(
  qtyBaseUnit: number,
  unitCostVnd: number,
  baseUnit: BaseUnit = 'g',
): number {
  if (!Number.isFinite(qtyBaseUnit) || qtyBaseUnit < 0) {
    throw new RangeError('qtyBaseUnit must be a non-negative finite number');
  }
  if (!Number.isFinite(unitCostVnd) || unitCostVnd < 0) {
    throw new RangeError('unitCostVnd must be a non-negative finite number');
  }
  const billingQty = convertBaseQtyToPricingUnit(qtyBaseUnit, baseUnit);
  return Math.round(billingQty * unitCostVnd);
}

/**
 * Computes effective unit cost (VND integer) of an ingested lot with amortized shipping cost:
 *   billingQty = baseUnit === 'g' ? initialQty / 1000 : initialQty
 *   effective_unit_cost_vnd = unit_cost_vnd + ROUND(shipping_cost_vnd / billingQty)
 *
 * NOTE: When baseUnit is omitted, defaults to 'pcs' (direct division) ONLY for legacy callers
 * passing billing units directly; pass baseUnit ('g' | 'ml' | 'pcs') for base-unit quantities.
 */
export function calculateEffectiveLotUnitCostVnd(
  unitCostVnd: number,
  shippingCostVnd: number,
  initialQty: number,
  baseUnit: BaseUnit = 'pcs',
): number {
  if (!Number.isFinite(initialQty) || initialQty <= 0) {
    throw new RangeError('initialQty must be a positive finite number');
  }
  if (!Number.isFinite(unitCostVnd) || unitCostVnd < 0) {
    throw new RangeError('unitCostVnd must be a non-negative finite number');
  }
  if (!Number.isFinite(shippingCostVnd) || shippingCostVnd < 0) {
    throw new RangeError('shippingCostVnd must be a non-negative finite number');
  }

  const billingQty = convertBaseQtyToPricingUnit(initialQty, baseUnit);
  return Math.round(unitCostVnd) + Math.round(shippingCostVnd / billingQty);
}

/**
 * Computes Moving Average Cost (MAC) in integer VND:
 *   new_mac_vnd = ROUND((oldQty * oldMacVnd + newQty * newEffectiveUnitCostVnd) / (oldQty + newQty))
 * (Scaling both oldQty and newQty by 1/1000 cancels out in the ratio.)
 */
export function calculateMovingAverageCostVnd(
  oldQty: number,
  oldMacVnd: number,
  newQty: number,
  newEffectiveUnitCostVnd: number,
): number {
  if (!Number.isFinite(oldQty) || oldQty < 0) {
    throw new RangeError('oldQty must be a non-negative finite number');
  }
  if (!Number.isFinite(newQty) || newQty < 0) {
    throw new RangeError('newQty must be a non-negative finite number');
  }
  if (!Number.isFinite(oldMacVnd) || oldMacVnd < 0) {
    throw new RangeError('oldMacVnd must be a non-negative finite number');
  }
  if (!Number.isFinite(newEffectiveUnitCostVnd) || newEffectiveUnitCostVnd < 0) {
    throw new RangeError('newEffectiveUnitCostVnd must be a non-negative finite number');
  }

  const totalQty = oldQty + newQty;
  if (totalQty <= 0) {
    return Math.round(newEffectiveUnitCostVnd);
  }

  const weightedTotal = oldQty * oldMacVnd + newQty * newEffectiveUnitCostVnd;
  return Math.round(weightedTotal / totalQty);
}

/**
 * Computes roast yield weight loss percentage rounded to 2 decimal places:
 *   weight_loss_pct = ROUND(((greenInputWeightG - roastedOutputWeightG) / greenInputWeightG) * 100, 2)
 */
export function calculateRoastYieldLossPct(
  greenInputWeightG: number,
  roastedOutputWeightG: number,
): number {
  if (!Number.isFinite(greenInputWeightG) || greenInputWeightG <= 0) {
    throw new RangeError('greenInputWeightG must be a positive finite number');
  }
  if (
    !Number.isFinite(roastedOutputWeightG) ||
    roastedOutputWeightG <= 0 ||
    roastedOutputWeightG > greenInputWeightG
  ) {
    throw new RangeError(
      'roastedOutputWeightG must satisfy 0 < roastedOutputWeightG <= greenInputWeightG',
    );
  }

  const rawPct =
    ((greenInputWeightG - roastedOutputWeightG) / greenInputWeightG) * 100;
  return Math.round(rawPct * 100) / 100;
}

/**
 * Flags abnormal roast yield loss outside the Central Highlands standard [12.00%, 20.00%].
 */
export function isAbnormalRoastYieldLoss(weightLossPct: number): boolean {
  return (
    weightLossPct < ROAST_YIELD_LOSS_MIN_NORMAL_PCT ||
    weightLossPct > ROAST_YIELD_LOSS_MAX_NORMAL_PCT
  );
}

/**
 * Transfers green bean cost into roasted coffee output unit cost (VND integer):
 *   output_unit_cost_vnd = ROUND((greenInputWeightG * sourceGreenUnitCostVnd) / roastedOutputWeightG)
 */
export function calculateRoastedOutputUnitCostVnd(
  greenInputWeightG: number,
  sourceGreenUnitCostVnd: number,
  roastedOutputWeightG: number,
): number {
  if (!Number.isFinite(greenInputWeightG) || greenInputWeightG <= 0) {
    throw new RangeError('greenInputWeightG must be a positive finite number');
  }
  if (!Number.isFinite(sourceGreenUnitCostVnd) || sourceGreenUnitCostVnd < 0) {
    throw new RangeError('sourceGreenUnitCostVnd must be a non-negative finite number');
  }
  if (
    !Number.isFinite(roastedOutputWeightG) ||
    roastedOutputWeightG <= 0 ||
    roastedOutputWeightG > greenInputWeightG
  ) {
    throw new RangeError(
      'roastedOutputWeightG must satisfy 0 < roastedOutputWeightG <= greenInputWeightG',
    );
  }

  return Math.round(
    (greenInputWeightG * sourceGreenUnitCostVnd) / roastedOutputWeightG,
  );
}

function resolveFifoUtcDateKey(lot: FifoSortableLot): string {
  if (lot.roast_date) {
    return lot.roast_date;
  }
  const parsedMs = Date.parse(lot.received_at);
  if (!Number.isNaN(parsedMs)) {
    return new Date(parsedMs).toISOString().slice(0, 10);
  }
  return lot.received_at.slice(0, 10);
}

/**
 * Deterministic Multi-Lot FIFO Comparator matching 0003_m2_wms_roastery_fifo_rpcs.sql:
 *   1. COALESCE(roast_date, UTC date of received_at) ASC
 *   2. received_at ASC
 *   3. lot_code ASC
 *   4. id ASC
 */
export function compareFifoLots(a: FifoSortableLot, b: FifoSortableLot): number {
  const aDate = resolveFifoUtcDateKey(a);
  const bDate = resolveFifoUtcDateKey(b);
  if (aDate !== bDate) {
    return aDate.localeCompare(bDate);
  }

  const aTs = Date.parse(a.received_at);
  const bTs = Date.parse(b.received_at);
  if (!Number.isNaN(aTs) && !Number.isNaN(bTs) && aTs !== bTs) {
    return aTs - bTs;
  }
  if (a.received_at !== b.received_at) {
    return a.received_at.localeCompare(b.received_at);
  }

  const codeDiff = a.lot_code.localeCompare(b.lot_code);
  if (codeDiff !== 0) {
    return codeDiff;
  }

  return a.id.localeCompare(b.id);
}
