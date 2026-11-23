import { describe, expect, it } from 'vitest';
import {
  CloneFranchiseStoreSchema,
  ExecutivePnlQuerySchema,
  PreviewFranchisePricingSchema,
  SEED_IDS,
  calculateCentralWarehousePnl,
  calculateStoreNodePnl,
  consolidateEnterprisePnl,
  previewClonedStoreMenuPricing,
} from '../index.js';

describe('M7.1 Executive OLAP P&L Consolidation & 1-Click Franchise Cloning Engine (@cf19/shared)', () => {
  it('1. calculateCentralWarehousePnl separates external B2B profit from internal transfer markup profit', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW-TAYNGUYEN',
      warehouse_name: 'Kho Tổng Tây Nguyên',
      b2b_orders_count: 12,
      reconciled_transfers_count: 8,
      b2b_external_revenue_vnd: 40_000_000,
      b2b_raw_cogs_vnd: 25_000_000,
      internal_transfer_revenue_vnd: 15_500_000,
      internal_transfer_raw_cogs_vnd: 12_500_000,
      warehouse_operating_expense_vnd: 4_000_000,
    });

    expect(wh.b2b_external_gross_profit_vnd).toBe(15_000_000);
    expect(wh.internal_markup_profit_vnd).toBe(3_000_000);
    expect(wh.warehouse_total_revenue_vnd).toBe(55_500_000);
    expect(wh.warehouse_total_raw_cogs_vnd).toBe(37_500_000);
    expect(wh.warehouse_total_gross_profit_vnd).toBe(18_000_000);
    expect(wh.warehouse_net_profit_vnd).toBe(14_000_000);
    expect(wh.warehouse_gross_margin_pct).toBe(32.43);
    expect(wh.warehouse_net_margin_pct).toBe(25.23);
  });

  it('2. calculateCentralWarehousePnl handles zero revenue safely without NaN or Infinity', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW-TAYNGUYEN',
      warehouse_name: 'Kho Tổng',
      b2b_external_revenue_vnd: 0,
      b2b_raw_cogs_vnd: 0,
      internal_transfer_revenue_vnd: 0,
      internal_transfer_raw_cogs_vnd: 0,
      warehouse_operating_expense_vnd: 1_000_000,
    });

    expect(wh.warehouse_net_profit_vnd).toBe(-1_000_000);
    expect(wh.warehouse_gross_margin_pct).toBe(0);
    expect(wh.warehouse_net_margin_pct).toBe(0);
  });

  it('3. calculateCentralWarehousePnl rejects negative monetary inputs', () => {
    expect(() =>
      calculateCentralWarehousePnl({
        warehouse_store_id: SEED_IDS.stores.centralWarehouse,
        warehouse_code: 'CW-TAYNGUYEN',
        warehouse_name: 'Kho Tổng',
        b2b_external_revenue_vnd: -1,
        b2b_raw_cogs_vnd: 0,
        internal_transfer_revenue_vnd: 0,
        internal_transfer_raw_cogs_vnd: 0,
      }),
    ).toThrow(RangeError);
  });

  it('4. calculateStoreNodePnl computes RETAIL_STORE P&L with zero franchise royalty fee', () => {
    const store1 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'CF19 Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      paid_orders_count: 150,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 20_000_000,
      store_internal_bom_cogs_vnd: 9_000_000,
      labor_cost_vnd: 5_000_000,
      cash_shortage_loss_vnd: 50_000,
      stocktake_shrinkage_loss_vnd: 150_000,
      franchise_royalty_pct: 5.0,
    });

    expect(store1.pos_gross_revenue_vnd).toBe(30_000_000);
    expect(store1.store_gross_profit_vnd).toBe(21_000_000);
    expect(store1.franchise_royalty_fee_vnd).toBe(0);
    expect(store1.store_net_profit_vnd).toBe(15_800_000);
    expect(store1.gross_margin_pct).toBe(70);
    expect(store1.net_margin_pct).toBe(52.67);
  });

  it('5. calculateStoreNodePnl deducts franchise royalty fee ONLY for FRANCHISE_STORE', () => {
    const franchise = calculateStoreNodePnl({
      store_id: '20000000-0000-4000-8000-000000000009',
      store_code: 'FRAN-05',
      store_name: 'CF19 Nhượng Quyền Buôn Hồ',
      store_type: 'FRANCHISE_STORE',
      price_multiplier: 1.1,
      paid_orders_count: 100,
      cash_revenue_vnd: 8_000_000,
      vietqr_revenue_vnd: 12_000_000,
      store_internal_bom_cogs_vnd: 6_000_000,
      labor_cost_vnd: 3_000_000,
      franchise_royalty_pct: 5.0,
    });

    // 5% of 20,000,000 = 1,000,000 royalty fee
    expect(franchise.franchise_royalty_fee_vnd).toBe(1_000_000);
    expect(franchise.store_net_profit_vnd).toBe(10_000_000);
    expect(franchise.net_margin_pct).toBe(50);
  });

  it('6. calculateStoreNodePnl handles zero POS revenue safely without NaN', () => {
    const empty = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store04,
      store_code: 'STORE-04',
      store_name: 'CF19 Quán 4',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 0,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 0,
      labor_cost_vnd: 500_000,
    });

    expect(empty.store_net_profit_vnd).toBe(-500_000);
    expect(empty.gross_margin_pct).toBe(0);
    expect(empty.net_margin_pct).toBe(0);
  });

  it('7. calculateStoreNodePnl rejects invalid franchise_royalty_pct outside [0, 50]', () => {
    expect(() =>
      calculateStoreNodePnl({
        store_id: SEED_IDS.stores.store01,
        store_code: 'STORE-01',
        store_name: 'Quán 1',
        store_type: 'FRANCHISE_STORE',
        price_multiplier: 1.0,
        cash_revenue_vnd: 1_000_000,
        vietqr_revenue_vnd: 0,
        store_internal_bom_cogs_vnd: 300_000,
        franchise_royalty_pct: 60,
      }),
    ).toThrow(RangeError);
  });

  it('8. consolidateEnterprisePnl eliminates internal transfer revenue from consolidated external top-line', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW-TAYNGUYEN',
      warehouse_name: 'Kho Tổng',
      b2b_external_revenue_vnd: 40_000_000,
      b2b_raw_cogs_vnd: 25_000_000,
      internal_transfer_revenue_vnd: 15_500_000,
      internal_transfer_raw_cogs_vnd: 12_500_000,
      warehouse_operating_expense_vnd: 4_000_000,
    });

    const s1 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 20_000_000,
      store_internal_bom_cogs_vnd: 9_000_000,
      labor_cost_vnd: 5_000_000,
    });

    const s2 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store02,
      store_code: 'STORE-02',
      store_name: 'Quán 2',
      store_type: 'FRANCHISE_STORE',
      price_multiplier: 1.05,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 10_000_000,
      store_internal_bom_cogs_vnd: 6_000_000,
      labor_cost_vnd: 3_000_000,
      franchise_royalty_pct: 5.0,
    });

    const consolidated = consolidateEnterprisePnl({
      warehouse: wh,
      stores: [s2, s1],
      period_from: '2026-11-01',
      period_to: '2026-11-30',
      generated_at: '2026-11-22T10:00:00.000Z',
    });

    // External revenue = 40M (B2B) + 30M (S1) + 20M (S2) = 90M (15.5M internal transfer eliminated!)
    expect(consolidated.consolidated_external_revenue_vnd).toBe(90_000_000);
    expect(consolidated.intercompany_eliminated_revenue_vnd).toBe(15_500_000);
    expect(consolidated.total_store_pos_revenue_vnd).toBe(50_000_000);
    expect(consolidated.total_franchise_royalty_income_vnd).toBe(1_000_000);
    // Consolidated net profit = 14M (WH) + 16M (S1) + 10M (S2) + 1M (Royalty) = 41M
    expect(consolidated.consolidated_net_profit_vnd).toBe(41_000_000);
    expect(consolidated.consolidated_net_margin_pct).toBe(45.56);
  });

  it('9. consolidateEnterprisePnl ranks stores descending by store_net_profit_vnd with 1-based rank', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW',
      warehouse_name: 'WH',
      b2b_external_revenue_vnd: 0,
      b2b_raw_cogs_vnd: 0,
      internal_transfer_revenue_vnd: 0,
      internal_transfer_raw_cogs_vnd: 0,
    });

    const low = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store04,
      store_code: 'STORE-04',
      store_name: 'Quán 4',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 5_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 2_000_000,
    });

    const top = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 25_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 7_000_000,
    });

    const mid = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store02,
      store_code: 'STORE-02',
      store_name: 'Quán 2',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 12_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 4_000_000,
    });

    const result = consolidateEnterprisePnl({
      warehouse: wh,
      stores: [low, mid, top],
    });

    expect(result.stores.map((s) => s.store_code)).toEqual([
      'STORE-01',
      'STORE-02',
      'STORE-04',
    ]);
    expect(result.stores.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  it('10. consolidateEnterprisePnl aggregates cash shortage and stocktake shrinkage losses across all branches', () => {
    const wh = calculateCentralWarehousePnl({
      warehouse_store_id: SEED_IDS.stores.centralWarehouse,
      warehouse_code: 'CW',
      warehouse_name: 'WH',
      b2b_external_revenue_vnd: 10_000_000,
      b2b_raw_cogs_vnd: 6_000_000,
      internal_transfer_revenue_vnd: 0,
      internal_transfer_raw_cogs_vnd: 0,
    });

    const s1 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store01,
      store_code: 'STORE-01',
      store_name: 'Quán 1',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 3_000_000,
      cash_shortage_loss_vnd: 40_000,
      stocktake_shrinkage_loss_vnd: 120_000,
    });

    const s2 = calculateStoreNodePnl({
      store_id: SEED_IDS.stores.store02,
      store_code: 'STORE-02',
      store_name: 'Quán 2',
      store_type: 'RETAIL_STORE',
      price_multiplier: 1.0,
      cash_revenue_vnd: 10_000_000,
      vietqr_revenue_vnd: 0,
      store_internal_bom_cogs_vnd: 3_000_000,
      cash_shortage_loss_vnd: 60_000,
      stocktake_shrinkage_loss_vnd: 80_000,
    });

    const res = consolidateEnterprisePnl({ warehouse: wh, stores: [s1, s2] });
    expect(res.total_cash_shortage_loss_vnd).toBe(100_000);
    expect(res.total_stocktake_shrinkage_loss_vnd).toBe(200_000);
  });

  it('11. previewClonedStoreMenuPricing applies 1.15x regional multiplier and calculates BOM gross margin', () => {
    const preview = previewClonedStoreMenuPricing(1.15, [
      {
        product_id: SEED_IDS.menuProducts.caPheSuaDa,
        product_code: 'PRD-CF-SUA-DA',
        product_name: 'Cà Phê Sữa Đá Tây Nguyên',
        master_base_price_vnd: 29000,
        default_variant_bom_cogs_vnd: 8250,
      },
      {
        product_id: SEED_IDS.menuProducts.bacXiuTayNguyen,
        product_code: 'PRD-BAC-XIU',
        product_name: 'Bạc Xỉu Tây Nguyên',
        master_base_price_vnd: 35000,
        default_variant_bom_cogs_vnd: 9600,
      },
    ]);

    expect(preview).toHaveLength(2);
    expect(preview[0]?.cloned_base_price_vnd).toBe(33350);
    expect(preview[0]?.price_diff_vnd).toBe(4350);
    expect(preview[0]?.estimated_gross_profit_vnd).toBe(25100);
    expect(preview[0]?.estimated_gross_margin_pct).toBe(75.26);

    expect(preview[1]?.cloned_base_price_vnd).toBe(40250);
    expect(preview[1]?.price_diff_vnd).toBe(5250);
  });

  it('12. previewClonedStoreMenuPricing supports discounted tier multiplier (0.90x) for rural branches', () => {
    const preview = previewClonedStoreMenuPricing(0.9, [
      {
        product_id: SEED_IDS.menuProducts.caPheDenDa,
        product_code: 'PRD-CF-DEN-DA',
        product_name: 'Cà Phê Đen Đá',
        master_base_price_vnd: 25000,
        default_variant_bom_cogs_vnd: 6000,
      },
    ]);

    expect(preview[0]?.cloned_base_price_vnd).toBe(22500);
    expect(preview[0]?.price_diff_vnd).toBe(-2500);
    expect(preview[0]?.estimated_gross_margin_pct).toBe(73.33);
  });

  it('13. previewClonedStoreMenuPricing rejects price_multiplier outside [0.50, 3.00]', () => {
    expect(() => previewClonedStoreMenuPricing(0.49, [])).toThrow(RangeError);
    expect(() => previewClonedStoreMenuPricing(3.01, [])).toThrow(RangeError);
  });

  it('14. ExecutivePnlQuerySchema accepts valid date range and coerces numeric defaults', () => {
    const parsed = ExecutivePnlQuerySchema.safeParse({
      period_from: '2026-11-01',
      period_to: '2026-11-30',
      warehouse_operating_expense_vnd: '4500000',
      franchise_royalty_pct: '6.5',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.warehouse_operating_expense_vnd).toBe(4500000);
      expect(parsed.data.franchise_royalty_pct).toBe(6.5);
    }
  });

  it('15. ExecutivePnlQuerySchema rejects inverted date range (period_to < period_from)', () => {
    const parsed = ExecutivePnlQuerySchema.safeParse({
      period_from: '2026-11-30',
      period_to: '2026-11-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('16. PreviewFranchisePricingSchema enforces [0.50, 3.00] multiplier bounds', () => {
    expect(PreviewFranchisePricingSchema.safeParse({ price_multiplier: '1.15' }).success).toBe(true);
    expect(PreviewFranchisePricingSchema.safeParse({ price_multiplier: 0.2 }).success).toBe(false);
    expect(PreviewFranchisePricingSchema.safeParse({ price_multiplier: 4.5 }).success).toBe(false);
  });

  it('17. CloneFranchiseStoreSchema validates franchise store creation and applies safe defaults', () => {
    const parsed = CloneFranchiseStoreSchema.safeParse({
      code: 'FRAN-05-BMT',
      name: 'CF19 Nhượng Quyền Buôn Hồ',
      address: '45 Hùng Vương, TX. Buôn Hồ, Đắk Lắk',
      price_multiplier: 1.1,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('FRANCHISE_STORE');
      expect(parsed.data.opening_cash_vnd).toBe(2000000);
      expect(parsed.data.create_starter_transfer).toBe(true);
      expect(parsed.data.starter_coffee_qty_g).toBe(10000);
    }
  });

  it('18. CloneFranchiseStoreSchema blocks cloning CENTRAL_WAREHOUSE type', () => {
    const parsed = CloneFranchiseStoreSchema.safeParse({
      code: 'CW-CLONE-02',
      name: 'Invalid Warehouse Clone',
      type: 'CENTRAL_WAREHOUSE',
      address: '123 Test Street',
    });
    expect(parsed.success).toBe(false);
  });

  it('19. CloneFranchiseStoreSchema rejects lowercase/invalid store code or invalid phone', () => {
    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'fran 05',
        name: 'Quán 5',
        address: '123 Đường A',
      }).success,
    ).toBe(false);

    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'FRAN-05',
        name: 'Quán 5',
        address: '123 Đường A',
        phone: 'abc',
      }).success,
    ).toBe(false);
  });

  it('20. CloneFranchiseStoreSchema rejects non-positive starter_coffee_qty_g or negative opening_cash_vnd', () => {
    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'FRAN-06',
        name: 'Quán 6',
        address: '123 Đường B',
        starter_coffee_qty_g: 0,
      }).success,
    ).toBe(false);

    expect(
      CloneFranchiseStoreSchema.safeParse({
        code: 'FRAN-06',
        name: 'Quán 6',
        address: '123 Đường B',
        opening_cash_vnd: -500000,
      }).success,
    ).toBe(false);
  });
});
