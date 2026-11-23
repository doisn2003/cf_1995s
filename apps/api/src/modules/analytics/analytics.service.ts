import {
  SEED_IDS,
  calculateCentralWarehousePnl,
  calculateOrderBomRequirementsAndCogs,
  calculateStoreNodePnl,
  consolidateEnterprisePnl,
  convertToKgForTierPricing,
  previewClonedStoreMenuPricing,
  type BaseUnit,
  type BomInventoryCostLookup,
  type CloneFranchiseStoreInput,
  type CloneFranchiseStoreResultDTO,
  type ClonedMenuProductPricePreviewDTO,
  type EnterpriseConsolidatedPnlDTO,
  type ExecutivePnlQueryDTO,
  type FranchiseMenuProductSourceInput,
  type MenuProductDto,
  type MenuVariantDto,
  type PreviewFranchisePricingInput,
  type StarterTransferSummaryDTO,
  type StoreDto,
  type StoreNodePnlDTO,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { loadActiveBomRecipes } from '../catalog/catalog.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

/**
 * 1. Consolidated Executive OLAP P&L querying LIVE Supabase PostgreSQL across:
 *    - Central Warehouse (B2B Wholesale + B2C Retail + Reconciled Internal Transfers vs Raw Origin COGS)
 *    - All Retail & Franchise Store Nodes (Cash + VietQR POS Revenue, BOM COGS, Real Shift Labor Cost,
 *      Blind Shift Cash Shortage Loss, EOD Stocktake Shrinkage Loss, Franchise Royalty)
 *    - Automatic Intercompany Internal Transfer Revenue Elimination
 */
export async function getExecutivePnlConsolidation(
  query: ExecutivePnlQueryDTO,
): Promise<EnterpriseConsolidatedPnlDTO> {
  const warehouseStore = await dbQueryOne<{
    id: string;
    code: string;
    name: string;
  }>(
    `SELECT id, code, name FROM public.stores
     WHERE type = 'CENTRAL_WAREHOUSE' AND is_active = TRUE
     LIMIT 1`,
  );
  if (!warehouseStore) {
    throw new WarehouseDomainError(404, 'WAREHOUSE_NOT_FOUND', 'Không tìm thấy Kho Tổng đang hoạt động');
  }

  const fromDate = query.period_from ?? null;
  const toDate = query.period_to ?? null;

  // 1A. Warehouse External B2B + B2C Sales
  const whSalesRes = await dbQueryOne<{
    orders_count: number;
    revenue_vnd: number;
    raw_cogs_vnd: number;
  }>(
    `SELECT
       COUNT(*)::int AS orders_count,
       COALESCE(SUM(total_amount_vnd), 0)::bigint AS revenue_vnd,
       COALESCE(SUM(cogs_amount_vnd), 0)::bigint AS raw_cogs_vnd
     FROM public.b2b_orders
     WHERE warehouse_store_id = $1
       AND payment_status <> 'VOIDED'
       AND ($2::date IS NULL OR (created_at AT TIME ZONE 'UTC')::date >= $2::date)
       AND ($3::date IS NULL OR (created_at AT TIME ZONE 'UTC')::date <= $3::date)`,
    [warehouseStore.id, fromDate, toDate],
  );

  // 1B. Warehouse Reconciled Internal Transfers (Intercompany Revenue vs Raw Origin COGS)
  const trfRes = await dbQueryOne<{
    transfers_count: number;
    internal_revenue_vnd: number;
    internal_raw_cogs_vnd: number;
  }>(
    `SELECT
       COUNT(DISTINCT t.id)::int AS transfers_count,
       COALESCE(SUM(ti.line_total_vnd), 0)::bigint AS internal_revenue_vnd,
       COALESCE(SUM(
         ROUND(
           (CASE WHEN ii.base_unit = 'g' THEN ti.received_qty / 1000.0 ELSE ti.received_qty END)
           * COALESCE(wl.unit_cost_vnd, ii.moving_avg_cost_vnd)
         )
       ), 0)::bigint AS internal_raw_cogs_vnd
     FROM public.internal_transfers t
     JOIN public.internal_transfer_items ti ON ti.transfer_id = t.id
     JOIN public.inventory_items ii ON ii.id = ti.item_id
     LEFT JOIN public.warehouse_lots wl ON wl.id = ti.source_lot_id
     WHERE t.from_warehouse_id = $1
       AND t.status = 'RECONCILED'
       AND ($2::date IS NULL OR (COALESCE(t.received_at, t.requested_at) AT TIME ZONE 'UTC')::date >= $2::date)
       AND ($3::date IS NULL OR (COALESCE(t.received_at, t.requested_at) AT TIME ZONE 'UTC')::date <= $3::date)`,
    [warehouseStore.id, fromDate, toDate],
  );

  const warehousePnl = calculateCentralWarehousePnl({
    warehouse_store_id: warehouseStore.id,
    warehouse_code: warehouseStore.code,
    warehouse_name: warehouseStore.name,
    b2b_orders_count: whSalesRes?.orders_count ?? 0,
    reconciled_transfers_count: trfRes?.transfers_count ?? 0,
    b2b_external_revenue_vnd: whSalesRes?.revenue_vnd ?? 0,
    b2b_raw_cogs_vnd: whSalesRes?.raw_cogs_vnd ?? 0,
    internal_transfer_revenue_vnd: trfRes?.internal_revenue_vnd ?? 0,
    internal_transfer_raw_cogs_vnd: trfRes?.internal_raw_cogs_vnd ?? 0,
    warehouse_operating_expense_vnd: query.warehouse_operating_expense_vnd,
  });

  // 2. Branch Store Nodes (RETAIL_STORE & FRANCHISE_STORE)
  const [storesRes, posAggRes, shiftAggRes, stocktakeAggRes] = await Promise.all([
    dbQuery<{
      id: string;
      code: string;
      name: string;
      type: 'RETAIL_STORE' | 'FRANCHISE_STORE';
      price_multiplier: number;
    }>(
      `SELECT id, code, name, type, price_multiplier
       FROM public.stores
       WHERE type IN ('RETAIL_STORE', 'FRANCHISE_STORE') AND is_active = TRUE
       ORDER BY code ASC`,
    ),
    dbQuery<{
      store_id: string;
      paid_orders_count: number;
      cash_revenue_vnd: number;
      vietqr_revenue_vnd: number;
      bom_cogs_vnd: number;
    }>(
      `SELECT
         store_id,
         COUNT(*)::int AS paid_orders_count,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount_vnd ELSE 0 END), 0)::bigint AS cash_revenue_vnd,
         COALESCE(SUM(CASE WHEN payment_method = 'VIETQR' THEN total_amount_vnd ELSE 0 END), 0)::bigint AS vietqr_revenue_vnd,
         COALESCE(SUM(cogs_amount_vnd), 0)::bigint AS bom_cogs_vnd
       FROM public.pos_orders
       WHERE payment_status = 'PAID'
         AND ($1::date IS NULL OR (created_at AT TIME ZONE 'UTC')::date >= $1::date)
         AND ($2::date IS NULL OR (created_at AT TIME ZONE 'UTC')::date <= $2::date)
       GROUP BY store_id`,
      [fromDate, toDate],
    ),
    dbQuery<{
      store_id: string;
      cash_shortage_loss_vnd: number;
      labor_cost_vnd: number;
    }>(
      `SELECT
         ps.store_id,
         COALESCE(SUM(CASE WHEN ps.status = 'CLOSED' AND ps.variance_cash_vnd < 0 THEN ABS(ps.variance_cash_vnd) ELSE 0 END), 0)::bigint AS cash_shortage_loss_vnd,
         COALESCE(SUM(
           ROUND(
             GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(ps.closed_at, NOW()) - ps.opened_at)) / 3600.0)
             * COALESCE(up.hourly_rate_vnd, 30000)
           )
         ), 0)::bigint AS labor_cost_vnd
       FROM public.pos_shifts ps
       JOIN public.user_profiles up ON up.id = ps.cashier_id
       WHERE ($1::date IS NULL OR (COALESCE(ps.closed_at, ps.opened_at) AT TIME ZONE 'UTC')::date >= $1::date)
         AND ($2::date IS NULL OR (COALESCE(ps.closed_at, ps.opened_at) AT TIME ZONE 'UTC')::date <= $2::date)
       GROUP BY ps.store_id`,
      [fromDate, toDate],
    ),
    dbQuery<{
      store_id: string;
      shrinkage_loss_vnd: number;
    }>(
      `SELECT
         st.store_id,
         COALESCE(SUM(
           ROUND(
             (CASE WHEN ii.base_unit = 'g' THEN ABS(st.variance_qty) / 1000.0 ELSE ABS(st.variance_qty) END)
             * ii.internal_transfer_price_vnd
           )
         ), 0)::bigint AS shrinkage_loss_vnd
       FROM public.store_daily_stocktakes st
       JOIN public.inventory_items ii ON ii.id = st.inventory_item_id
       WHERE st.variance_qty < 0
         AND ($1::date IS NULL OR st.stocktake_date >= $1::date)
         AND ($2::date IS NULL OR st.stocktake_date <= $2::date)
       GROUP BY st.store_id`,
      [fromDate, toDate],
    ),
  ]);

  const posMap = new Map(posAggRes.rows.map((r) => [r.store_id, r]));
  const shiftMap = new Map(shiftAggRes.rows.map((r) => [r.store_id, r]));
  const stockMap = new Map(stocktakeAggRes.rows.map((r) => [r.store_id, r]));

  const storeNodePnls: StoreNodePnlDTO[] = storesRes.rows.map((store) => {
    const pos = posMap.get(store.id);
    const sh = shiftMap.get(store.id);
    const st = stockMap.get(store.id);

    return calculateStoreNodePnl({
      store_id: store.id,
      store_code: store.code,
      store_name: store.name,
      store_type: store.type,
      price_multiplier: store.price_multiplier,
      paid_orders_count: pos?.paid_orders_count ?? 0,
      cash_revenue_vnd: pos?.cash_revenue_vnd ?? 0,
      vietqr_revenue_vnd: pos?.vietqr_revenue_vnd ?? 0,
      store_internal_bom_cogs_vnd: pos?.bom_cogs_vnd ?? 0,
      labor_cost_vnd: sh?.labor_cost_vnd ?? 0,
      cash_shortage_loss_vnd: sh?.cash_shortage_loss_vnd ?? 0,
      stocktake_shrinkage_loss_vnd: st?.shrinkage_loss_vnd ?? 0,
      franchise_royalty_pct: query.franchise_royalty_pct,
    });
  });

  return consolidateEnterprisePnl({
    warehouse: warehousePnl,
    stores: storeNodePnls,
    period_from: fromDate,
    period_to: toDate,
  });
}

export async function previewFranchisePricing(
  query: PreviewFranchisePricingInput,
): Promise<ClonedMenuProductPricePreviewDTO[]> {
  const [prodsRes, varsRes, invRes, bomRecipes] = await Promise.all([
    dbQuery<MenuProductDto>(
      `SELECT id, organization_id, category_id, code, name, base_price_vnd, is_active
       FROM public.menu_products WHERE is_active = TRUE ORDER BY code ASC`,
    ),
    dbQuery<MenuVariantDto>(
      `SELECT id, product_id, size_code, name, price_delta_vnd, is_default, is_active
       FROM public.menu_variants WHERE is_active = TRUE`,
    ),
    dbQuery<BomInventoryCostLookup & { base_unit: BaseUnit }>(
      `SELECT id, sku, name, base_unit, internal_transfer_price_vnd
       FROM public.inventory_items WHERE is_active = TRUE`,
    ),
    loadActiveBomRecipes(),
  ]);

  const inventoryById: Record<string, BomInventoryCostLookup> = {};
  for (const inv of invRes.rows) inventoryById[inv.id] = inv;

  const productSources: FranchiseMenuProductSourceInput[] = prodsRes.rows.map((product) => {
    const defaultVariant =
      varsRes.rows.find((v) => v.product_id === product.id && v.is_default) ??
      varsRes.rows.find((v) => v.product_id === product.id);

    let defaultBomCogsVnd = 0;
    if (defaultVariant) {
      const bom = calculateOrderBomRequirementsAndCogs({
        lines: [
          {
            product_id: product.id,
            variant_id: defaultVariant.id,
            modifier_ids: [],
            quantity: 1,
          },
        ],
        recipes: bomRecipes,
        modifiersById: {},
        inventoryItemsById: inventoryById,
      });
      defaultBomCogsVnd = bom.total_cogs_vnd;
    }

    return {
      product_id: product.id,
      product_code: product.code,
      product_name: product.name,
      master_base_price_vnd: product.base_price_vnd,
      default_variant_bom_cogs_vnd: defaultBomCogsVnd,
    };
  });

  return previewClonedStoreMenuPricing(query.price_multiplier, productSources);
}

export async function cloneFranchiseStore(
  actor: AuthActor,
  input: CloneFranchiseStoreInput,
): Promise<CloneFranchiseStoreResultDTO> {
  const clonedMenuPreview = await previewFranchisePricing({
    price_multiplier: input.price_multiplier,
  });

  return withTransaction(async (client) => {
    const normalizedCode = input.code.trim().toUpperCase();
    const dup = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.stores WHERE UPPER(code) = $1`,
      [normalizedCode],
      client,
    );
    if (dup) {
      throw new WarehouseDomainError(
        409,
        'DUPLICATE_STORE_CODE',
        `Mã chi nhánh ${normalizedCode} đã tồn tại trong hệ thống`,
      );
    }

    const newStoreRow = await dbQueryOne<{
      id: string;
      organization_id: string;
      code: string;
      name: string;
      type: 'CENTRAL_WAREHOUSE' | 'RETAIL_STORE' | 'FRANCHISE_STORE';
      address: string;
      phone: string | null;
      price_multiplier: number;
      is_active: boolean;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `INSERT INTO public.stores (
         organization_id, code, name, type, address, phone, price_multiplier, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        SEED_IDS.organization.cf19,
        normalizedCode,
        input.name.trim(),
        input.type,
        input.address.trim(),
        input.phone?.trim() ?? null,
        input.price_multiplier,
      ],
      client,
    );

    const shiftRow = await dbQueryOne<{ id: string }>(
      `INSERT INTO public.pos_shifts (store_id, cashier_id, opening_cash_vnd, status, notes)
       VALUES ($1, $2, $3, 'OPEN', $4)
       RETURNING id`,
      [
        newStoreRow!.id,
        actor.id,
        input.opening_cash_vnd,
        input.notes?.trim() || `Ca khai trương tự động cho ${normalizedCode}`,
      ],
      client,
    );

    let starterTransferSummary: StarterTransferSummaryDTO | null = null;
    if (input.create_starter_transfer) {
      const warehouseStore = await dbQueryOne<{ id: string }>(
        `SELECT id FROM public.stores WHERE type = 'CENTRAL_WAREHOUSE' AND is_active = TRUE LIMIT 1`,
        [],
        client,
      );
      const coffeeItem = await dbQueryOne<{
        id: string;
        base_unit: BaseUnit;
        internal_transfer_price_vnd: number;
      }>(
        `SELECT id, base_unit, internal_transfer_price_vnd
         FROM public.inventory_items
         WHERE id = $1 AND is_active = TRUE`,
        [SEED_IDS.inventoryItems.roastedRobustaMed],
        client,
      );

      if (warehouseStore && coffeeItem) {
        const transferCode = `TRF-INIT-${normalizedCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
        const billingQty = convertToKgForTierPricing(
          input.starter_coffee_qty_g,
          coffeeItem.base_unit,
        );
        const totalInternalValue = Math.round(
          billingQty * coffeeItem.internal_transfer_price_vnd,
        );

        const trfRow = await dbQueryOne<{ id: string }>(
          `INSERT INTO public.internal_transfers (
             transfer_code, from_warehouse_id, to_store_id, status,
             total_internal_value_vnd, requested_by, notes
           )
           VALUES ($1, $2, $3, 'REQUESTED', $4, $5, $6)
           RETURNING id`,
          [
            transferCode,
            warehouseStore.id,
            newStoreRow!.id,
            totalInternalValue,
            actor.id,
            `Phiếu xin cấp hàng khai trương tự động cho ${normalizedCode}`,
          ],
          client,
        );

        await client.query(
          `INSERT INTO public.internal_transfer_items (
             transfer_id, item_id, requested_qty, dispatched_qty, received_qty,
             internal_unit_price_vnd, line_total_vnd
           )
           VALUES ($1, $2, $3, 0, 0, $4, $5)`,
          [
            trfRow!.id,
            coffeeItem.id,
            input.starter_coffee_qty_g,
            coffeeItem.internal_transfer_price_vnd,
            totalInternalValue,
          ],
        );

        starterTransferSummary = {
          transfer_id: trfRow!.id,
          transfer_code: transferCode,
          status: 'REQUESTED',
          total_internal_value_vnd: totalInternalValue,
        };
      }
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: newStoreRow!.id,
        action: 'FRANCHISE_STORE_CLONED',
        targetTable: 'stores',
        targetId: newStoreRow!.id,
        reason: `Nhân bản chi nhánh 1-Click ${normalizedCode} (${input.price_multiplier}x)`,
        payload: {
          store_code: normalizedCode,
          store_type: input.type,
          price_multiplier: input.price_multiplier,
          opening_shift_id: shiftRow!.id,
          starter_transfer_code: starterTransferSummary?.transfer_code ?? null,
        },
      },
      client,
    );

    const storeDto: StoreDto = {
      ...newStoreRow!,
      created_at: toIsoString(newStoreRow!.created_at),
      updated_at: toIsoString(newStoreRow!.updated_at),
    };

    return {
      store: storeDto,
      opening_shift_id: shiftRow!.id,
      starter_transfer: starterTransferSummary,
      cloned_menu_preview: clonedMenuPreview,
      cloned_at: new Date().toISOString(),
    };
  });
}
