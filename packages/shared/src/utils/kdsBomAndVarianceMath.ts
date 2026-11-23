import type {
  BlindShiftOrderInput,
  BlindShiftVarianceCalculationDTO,
  DailyStocktakeVarianceCalculationDTO,
  KdsBomDeductionLotSliceDTO,
  KdsBomItemDeductionResultDTO,
  KdsSlaClassificationDTO,
  KdsSlaLevel,
  ShiftVarianceStatus,
  StoreBomDeductionRequirementInput,
  StoreBomFifoAllocationOutputDTO,
  StoreBomLotSnapshotInput,
} from '../types/kdsAndShift.types.js';
import { compareFifoLots } from './warehouseMath.js';

export const KDS_SLA_WARNING_MINUTES = 5;
export const KDS_SLA_CRITICAL_MINUTES = 10;
export const STOCKTAKE_ABNORMAL_SHRINKAGE_THRESHOLD_PCT = 3.0;

function roundQty2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 1. Classify KDS ticket wait duration into SRS SLA color tiers:
 *    - < 5 min: NORMAL_GREEN
 *    - 5..9 min: WARNING_YELLOW
 *    - >= 10 min: CRITICAL_RED
 */
export function classifyKdsWaitSla(
  createdAtIso: string,
  nowMs: number = Date.now(),
): KdsSlaClassificationDTO {
  const createdMs = Date.parse(createdAtIso);
  if (Number.isNaN(createdMs)) {
    throw new RangeError(`Invalid ISO timestamp for KDS ticket: "${createdAtIso}"`);
  }

  const waitMinutes = Math.max(0, Math.floor((nowMs - createdMs) / 60_000));
  let slaLevel: KdsSlaLevel = 'NORMAL_GREEN';
  if (waitMinutes >= KDS_SLA_CRITICAL_MINUTES) {
    slaLevel = 'CRITICAL_RED';
  } else if (waitMinutes >= KDS_SLA_WARNING_MINUTES) {
    slaLevel = 'WARNING_YELLOW';
  }

  return {
    wait_minutes: waitMinutes,
    sla_level: slaLevel,
    is_overdue: slaLevel === 'CRITICAL_RED',
  };
}

/**
 * 2. Pure Multi-Lot FIFO Store BOM Inventory Deduction Allocator.
 *    Does NOT mutate input lots; returns immutable updated lot snapshots & per-lot slices.
 *    Throws INSUFFICIENT_STORE_BOM_STOCK if allowPartialOnShortage is false and stock is lacking.
 */
export function allocateStoreBomFifoDeduction(params: {
  storeId: string;
  requirements: readonly StoreBomDeductionRequirementInput[];
  availableLots: readonly StoreBomLotSnapshotInput[];
  allowPartialOnShortage?: boolean;
}): StoreBomFifoAllocationOutputDTO {
  const {
    storeId,
    requirements,
    availableLots,
    allowPartialOnShortage = false,
  } = params;

  const clonedLots: StoreBomLotSnapshotInput[] = availableLots.map((lot) => ({
    ...lot,
  }));

  const deductions: KdsBomItemDeductionResultDTO[] = [];
  let hasShortage = false;

  const sortedRequirements = [...requirements].sort((a, b) =>
    a.inventory_item_id.localeCompare(b.inventory_item_id),
  );

  for (const req of sortedRequirements) {
    const requiredQty = roundQty2(req.required_qty);
    if (!Number.isFinite(requiredQty) || requiredQty < 0) {
      throw new RangeError(
        `BOM required_qty must be a non-negative finite number for ${req.sku}`,
      );
    }
    if (requiredQty === 0) {
      continue;
    }

    const candidateLots = clonedLots
      .filter(
        (lot) =>
          lot.store_id === storeId &&
          lot.item_id === req.inventory_item_id &&
          lot.status === 'AVAILABLE' &&
          lot.remaining_qty > 0,
      )
      .sort(compareFifoLots);

    let remainingNeeded = requiredQty;
    let totalDeducted = 0;
    const lotSlices: KdsBomDeductionLotSliceDTO[] = [];

    for (const lot of candidateLots) {
      if (remainingNeeded <= 0) {
        break;
      }

      const takeQty = roundQty2(Math.min(lot.remaining_qty, remainingNeeded));
      const remainingAfter = roundQty2(lot.remaining_qty - takeQty);
      const depleted = remainingAfter <= 0;

      lot.remaining_qty = remainingAfter;
      if (depleted) {
        lot.status = 'DEPLETED';
      }

      totalDeducted = roundQty2(totalDeducted + takeQty);
      remainingNeeded = roundQty2(remainingNeeded - takeQty);

      lotSlices.push({
        lot_id: lot.id,
        lot_code: lot.lot_code,
        roast_date: lot.roast_date,
        deducted_qty: takeQty,
        remaining_after_qty: remainingAfter,
        depleted,
      });
    }

    const shortageQty = Math.max(0, remainingNeeded);
    if (shortageQty > 0) {
      if (!allowPartialOnShortage) {
        throw new Error(
          `INSUFFICIENT_STORE_BOM_STOCK: Store ${storeId} lacks ${shortageQty} ${req.base_unit} of ${req.sku} (${req.name})`,
        );
      }
      hasShortage = true;
    }

    deductions.push({
      inventory_item_id: req.inventory_item_id,
      sku: req.sku,
      name: req.name,
      base_unit: req.base_unit,
      required_qty: requiredQty,
      deducted_qty: totalDeducted,
      shortage_qty: shortageQty,
      lot_slices: lotSlices,
    });
  }

  return {
    has_shortage: hasShortage,
    deductions,
    updated_lots: clonedLots,
  };
}

/**
 * 3. Classify cash drawer variance into BALANCED / SURPLUS / SHORTAGE.
 */
export function classifyShiftCashVarianceStatus(
  varianceCashVnd: number,
): ShiftVarianceStatus {
  if (!Number.isFinite(varianceCashVnd)) {
    throw new RangeError('varianceCashVnd must be a finite number');
  }
  const rounded = Math.round(varianceCashVnd);
  if (rounded === 0) {
    return 'BALANCED';
  }
  return rounded > 0 ? 'SURPLUS' : 'SHORTAGE';
}

/**
 * 4. Calculate Blind Shift Close expected cash & variance in integer VND.
 *    Strictly sums ONLY PAID CASH orders into expected drawer cash.
 */
export function calculateBlindShiftCloseVariance(params: {
  openingCashVnd: number;
  blindCountedCashVnd: number;
  orders: readonly BlindShiftOrderInput[];
}): BlindShiftVarianceCalculationDTO {
  const { openingCashVnd, blindCountedCashVnd, orders } = params;

  if (!Number.isInteger(openingCashVnd) || openingCashVnd < 0) {
    throw new RangeError('openingCashVnd must be a non-negative integer');
  }
  if (!Number.isInteger(blindCountedCashVnd) || blindCountedCashVnd < 0) {
    throw new RangeError('blindCountedCashVnd must be a non-negative integer');
  }

  let cashSalesVnd = 0;
  let vietqrSalesVnd = 0;
  let paidCashOrdersCount = 0;
  let voidedOrdersCount = 0;

  for (const order of orders) {
    if (order.payment_status === 'VOIDED') {
      voidedOrdersCount += 1;
      continue;
    }
    if (order.payment_status !== 'PAID') {
      continue;
    }
    const amt = Math.round(order.total_amount_vnd);
    if (order.payment_method === 'CASH') {
      cashSalesVnd += amt;
      paidCashOrdersCount += 1;
    } else if (order.payment_method === 'VIETQR') {
      vietqrSalesVnd += amt;
    }
  }

  const systemExpectedCashVnd = openingCashVnd + cashSalesVnd;
  const varianceCashVnd = blindCountedCashVnd - systemExpectedCashVnd;
  const varianceStatus = classifyShiftCashVarianceStatus(varianceCashVnd);

  return {
    opening_cash_vnd: openingCashVnd,
    cash_sales_vnd: cashSalesVnd,
    vietqr_sales_vnd: vietqrSalesVnd,
    paid_cash_orders_count: paidCashOrdersCount,
    voided_orders_count: voidedOrdersCount,
    system_expected_cash_vnd: systemExpectedCashVnd,
    blind_counted_cash_vnd: blindCountedCashVnd,
    variance_cash_vnd: varianceCashVnd,
    variance_status: varianceStatus,
  };
}

/**
 * 5. Calculate End-of-Day Store Stocktake vs BOM theoretical closing variance.
 *    Flags is_abnormal_shrinkage when variance_qty < 0 and |variance_pct| > 3.0%.
 */
export function calculateDailyStocktakeVariance(params: {
  openingQty: number;
  receivedInQty: number;
  bomConsumedQty: number;
  actualCountedQty: number;
  abnormalShrinkageThresholdPct?: number;
}): DailyStocktakeVarianceCalculationDTO {
  const {
    openingQty,
    receivedInQty,
    bomConsumedQty,
    actualCountedQty,
    abnormalShrinkageThresholdPct = STOCKTAKE_ABNORMAL_SHRINKAGE_THRESHOLD_PCT,
  } = params;

  if (
    !Number.isFinite(openingQty) ||
    openingQty < 0 ||
    !Number.isFinite(receivedInQty) ||
    receivedInQty < 0 ||
    !Number.isFinite(bomConsumedQty) ||
    bomConsumedQty < 0 ||
    !Number.isFinite(actualCountedQty) ||
    actualCountedQty < 0
  ) {
    throw new RangeError('All daily stocktake quantities must be non-negative finite numbers');
  }

  const opening = roundQty2(openingQty);
  const receivedIn = roundQty2(receivedInQty);
  const bomConsumed = roundQty2(bomConsumedQty);
  const actualCounted = roundQty2(actualCountedQty);

  const theoreticalClosingQty = roundQty2(opening + receivedIn - bomConsumed);
  const varianceQty = roundQty2(actualCounted - theoreticalClosingQty);
  const variancePct =
    theoreticalClosingQty <= 0
      ? 0
      : roundQty2((varianceQty / theoreticalClosingQty) * 100);
  const isAbnormalShrinkage =
    varianceQty < 0 && Math.abs(variancePct) > abnormalShrinkageThresholdPct;

  return {
    opening_qty: opening,
    received_in_qty: receivedIn,
    bom_consumed_qty: bomConsumed,
    theoretical_closing_qty: theoreticalClosingQty,
    actual_counted_qty: actualCounted,
    variance_qty: varianceQty,
    variance_pct: variancePct,
    is_abnormal_shrinkage: isAbnormalShrinkage,
  };
}
