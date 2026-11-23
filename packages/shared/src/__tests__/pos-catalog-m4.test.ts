import { describe, expect, it } from 'vitest';
import {
  ESC_POS_RECEIPT_WIDTH,
  OfflinePosBatchSyncSchema,
  PosOrdersFilterQuerySchema,
  SEED_IDS,
  SubmitPosOrderSchema,
  buildEscPosThermalReceiptText,
  calculateBranchAdjustedBasePriceVnd,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BomRecipeWithItemsDTO,
  type MenuModifierDto,
} from '../index.js';

const SAMPLE_MODIFIERS: Record<string, MenuModifierDto> = {
  sugar50: {
    id: SEED_IDS.menuModifiers.sugar50,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-SUGAR-50',
    modifier_group: 'SUGAR',
    name: 'Ít đường (50%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  sugar0: {
    id: '63000000-0000-4000-8000-000000000099',
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-SUGAR-0',
    modifier_group: 'SUGAR',
    name: 'Không đường (0%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  ice50: {
    id: SEED_IDS.menuModifiers.ice50,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-ICE-50',
    modifier_group: 'ICE',
    name: 'Ít đá (50%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  ice0: {
    id: '63000000-0000-4000-8000-000000000098',
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-ICE-0',
    modifier_group: 'ICE',
    name: 'Không đá (0%)',
    price_delta_vnd: 0,
    inventory_item_id: null,
    bom_qty_base_unit: 0,
    is_active: true,
  },
  shot: {
    id: SEED_IDS.menuModifiers.extraEspressoShot,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-TOP-SHOT',
    modifier_group: 'TOPPING',
    name: 'Thêm 1 Shot Espresso',
    price_delta_vnd: 10000,
    inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
    bom_qty_base_unit: 18,
    is_active: true,
  },
  milk: {
    id: SEED_IDS.menuModifiers.extraCondensedMilk,
    organization_id: SEED_IDS.organization.cf19,
    code: 'MOD-TOP-MILK',
    modifier_group: 'TOPPING',
    name: 'Thêm Sữa Đặc',
    price_delta_vnd: 5000,
    inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
    bom_qty_base_unit: 15,
    is_active: true,
  },
};

const SAMPLE_RECIPES: BomRecipeWithItemsDTO[] = [
  {
    id: SEED_IDS.bomRecipes.caPheSuaDaM,
    product_id: SEED_IDS.menuProducts.caPheSuaDa,
    variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
    version: 1,
    is_active: true,
    items: [
      {
        inventory_item_id: SEED_IDS.inventoryItems.roastedRobustaMed,
        sku: 'RC-ROB-MED',
        name: 'Cà phê hạt rang Robusta Medium',
        base_unit: 'g',
        quantity_per_cup_base_unit: 20,
        wastage_allowance_pct: 2,
        internal_transfer_price_vnd: 155000,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.condensedMilk,
        sku: 'ING-COND-MILK',
        name: 'Sữa đặc có đường',
        base_unit: 'ml',
        quantity_per_cup_base_unit: 25,
        wastage_allowance_pct: 2,
        internal_transfer_price_vnd: 60,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.plasticCup500ml,
        sku: 'PKG-CUP-500',
        name: 'Ly nhựa 500ml',
        base_unit: 'pcs',
        quantity_per_cup_base_unit: 1,
        wastage_allowance_pct: 0,
        internal_transfer_price_vnd: 1350,
      },
      {
        inventory_item_id: SEED_IDS.inventoryItems.bioStraw,
        sku: 'PKG-STRAW-BIO',
        name: 'Ống hút sinh học',
        base_unit: 'pcs',
        quantity_per_cup_base_unit: 1,
        wastage_allowance_pct: 0,
        internal_transfer_price_vnd: 220,
      },
    ],
  },
];

const SAMPLE_ITEMS_BY_ID = {
  [SEED_IDS.inventoryItems.roastedRobustaMed]: {
    id: SEED_IDS.inventoryItems.roastedRobustaMed,
    sku: 'RC-ROB-MED',
    name: 'Cà phê hạt rang Robusta Medium',
    base_unit: 'g' as const,
    internal_transfer_price_vnd: 155000,
  },
  [SEED_IDS.inventoryItems.condensedMilk]: {
    id: SEED_IDS.inventoryItems.condensedMilk,
    sku: 'ING-COND-MILK',
    name: 'Sữa đặc có đường',
    base_unit: 'ml' as const,
    internal_transfer_price_vnd: 60,
  },
  [SEED_IDS.inventoryItems.plasticCup500ml]: {
    id: SEED_IDS.inventoryItems.plasticCup500ml,
    sku: 'PKG-CUP-500',
    name: 'Ly nhựa 500ml',
    base_unit: 'pcs' as const,
    internal_transfer_price_vnd: 1350,
  },
  [SEED_IDS.inventoryItems.bioStraw]: {
    id: SEED_IDS.inventoryItems.bioStraw,
    sku: 'PKG-STRAW-BIO',
    name: 'Ống hút sinh học',
    base_unit: 'pcs' as const,
    internal_transfer_price_vnd: 220,
  },
};

describe('M4.1 — Pure POS Pricing, Modifier Matrix, Multi-level BOM COGS & ESC/POS Receipt Engine', () => {
  // 1-3: Regional Price Multiplier
  it('1. keeps base price unchanged when store price_multiplier is 1.00', () => {
    expect(calculateBranchAdjustedBasePriceVnd(29000, 1.0)).toBe(29000);
  });

  it('2. applies regional multiplier (e.g., Store 3 = 1.05) and rounds to integer VND', () => {
    expect(calculateBranchAdjustedBasePriceVnd(29000, 1.05)).toBe(30450);
    expect(calculateBranchAdjustedBasePriceVnd(25000, 1.05)).toBe(26250);
  });

  it('3. throws RangeError on invalid basePriceVnd or non-positive priceMultiplier', () => {
    expect(() => calculateBranchAdjustedBasePriceVnd(-1000, 1.0)).toThrow(RangeError);
    expect(() => calculateBranchAdjustedBasePriceVnd(29000, 0)).toThrow(RangeError);
  });

  // 4-6: POS Line Pricing Breakdown
  it('4. calculates POS line pricing for standard Size M drink with no modifiers', () => {
    const line = calculatePosLinePricing({
      basePriceVnd: 29000,
      priceMultiplier: 1.0,
      variantPriceDeltaVnd: 0,
      modifiers: [],
      quantity: 2,
    });
    expect(line.unit_price_vnd).toBe(29000);
    expect(line.line_total_vnd).toBe(58000);
  });

  it('5. calculates POS line pricing for Store 3 (1.05x) + Size L (+6,000) + 2 Toppings (+15,000)', () => {
    const line = calculatePosLinePricing({
      basePriceVnd: 29000,
      priceMultiplier: 1.05, // 30,450
      variantPriceDeltaVnd: 6000,
      modifiers: [SAMPLE_MODIFIERS.shot, SAMPLE_MODIFIERS.milk],
      quantity: 3,
    });
    expect(line.effective_base_price_vnd).toBe(30450);
    expect(line.modifiers_price_delta_vnd).toBe(15000);
    expect(line.unit_price_vnd).toBe(51450);
    expect(line.line_total_vnd).toBe(154350);
  });

  it('6. throws RangeError on float or zero quantity in calculatePosLinePricing', () => {
    expect(() =>
      calculatePosLinePricing({
        basePriceVnd: 29000,
        priceMultiplier: 1,
        variantPriceDeltaVnd: 0,
        modifiers: [],
        quantity: 1.5,
      }),
    ).toThrow(RangeError);
  });

  // 7-10: Modifier Selection Matrix
  it('7. approves 1 SUGAR + 1 ICE + multiple distinct TOPPING modifiers on one drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.sugar50,
      SAMPLE_MODIFIERS.ice50,
      SAMPLE_MODIFIERS.shot,
      SAMPLE_MODIFIERS.milk,
    ]);
    expect(check.valid).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it('8. rejects selecting 2 SUGAR modifiers on the same drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.sugar50,
      SAMPLE_MODIFIERS.sugar0,
    ]);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toContain('SUGAR');
  });

  it('9. rejects selecting 2 ICE modifiers on the same drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.ice50,
      SAMPLE_MODIFIERS.ice0,
    ]);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toContain('ICE');
  });

  it('10. rejects duplicate identical modifier IDs on the same drink line', () => {
    const check = validateModifierSelectionMatrix([
      SAMPLE_MODIFIERS.shot,
      SAMPLE_MODIFIERS.shot,
    ]);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toContain('Duplicate');
  });

  // 11-14: Multi-level BOM Requirements & Internal COGS
  it('11. calculates exact Tier 1 BOM requirements with wastage allowance and internal COGS for 1 Cà Phê Sữa Đá M', () => {
    // 20g * 1.02 = 20.4g coffee -> ROUND(0.0204 * 155000) = 3,162
    // 25ml * 1.02 = 25.5ml milk -> ROUND(25.5 * 60) = 1,530
    // 1 cup = 1,350 ; 1 straw = 220 -> Total COGS = 6,262 VND
    const bom = calculateOrderBomRequirementsAndCogs({
      lines: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [],
          quantity: 1,
        },
      ],
      recipes: SAMPLE_RECIPES,
      modifiersById: {},
      inventoryItemsById: SAMPLE_ITEMS_BY_ID,
    });
    expect(bom.requirements).toHaveLength(4);
    expect(bom.total_cogs_vnd).toBe(6262);
  });

  it('12. aggregates Tier 1 Recipe BOM + Tier 2 Modifier BOM (Extra Shot 18g + Extra Milk 15ml) across 2 cups', () => {
    // 2 cups:
    // Coffee: recipe 2*20*1.02 = 40.8g + modifier 2*18 = 36g -> 76.8g -> ROUND(0.0768 * 155000) = 11,904
    // Milk:   recipe 2*25*1.02 = 51ml + modifier 2*15 = 30ml -> 81ml -> ROUND(81 * 60) = 4,860
    // Cup: 2 * 1350 = 2,700 ; Straw: 2 * 220 = 440 -> Total = 19,904 VND
    const modifiersById = {
      [SAMPLE_MODIFIERS.shot.id]: SAMPLE_MODIFIERS.shot,
      [SAMPLE_MODIFIERS.milk.id]: SAMPLE_MODIFIERS.milk,
    };
    const bom = calculateOrderBomRequirementsAndCogs({
      lines: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          modifier_ids: [SAMPLE_MODIFIERS.shot.id, SAMPLE_MODIFIERS.milk.id],
          quantity: 2,
        },
      ],
      recipes: SAMPLE_RECIPES,
      modifiersById,
      inventoryItemsById: SAMPLE_ITEMS_BY_ID,
    });

    const coffeeSlice = bom.requirements.find((r) => r.sku === 'RC-ROB-MED');
    expect(coffeeSlice?.recipe_required_qty).toBe(40.8);
    expect(coffeeSlice?.modifier_required_qty).toBe(36);
    expect(coffeeSlice?.total_required_qty).toBe(76.8);
    expect(coffeeSlice?.estimated_cogs_vnd).toBe(11904);
    expect(bom.total_cogs_vnd).toBe(19904);
  });

  it('13. returns empty requirements and 0 COGS if product/variant has no active BOM recipe and no linked modifiers', () => {
    const bom = calculateOrderBomRequirementsAndCogs({
      lines: [
        {
          product_id: SEED_IDS.menuProducts.caPheDenDa,
          variant_id: SEED_IDS.menuVariants.caPheDenDaL,
          modifier_ids: [],
          quantity: 1,
        },
      ],
      recipes: SAMPLE_RECIPES,
      modifiersById: {},
      inventoryItemsById: SAMPLE_ITEMS_BY_ID,
    });
    expect(bom.requirements).toHaveLength(0);
    expect(bom.total_cogs_vnd).toBe(0);
  });

  it('14. throws RangeError on non-positive quantity in BOM calculation', () => {
    expect(() =>
      calculateOrderBomRequirementsAndCogs({
        lines: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            modifier_ids: [],
            quantity: 0,
          },
        ],
        recipes: SAMPLE_RECIPES,
        modifiersById: {},
        inventoryItemsById: SAMPLE_ITEMS_BY_ID,
      }),
    ).toThrow(RangeError);
  });

  // 15-17: ESC/POS 42-Column Thermal Receipt Renderer
  it('15. renders a valid 42-column ESC/POS thermal receipt with VietQR ref and modifiers', () => {
    const text = buildEscPosThermalReceiptText({
      store_name: 'CF19 QUAN 1 - TRUNG TAM',
      store_address: '19 Tran Phu, Thi Tran',
      order_code: 'POS-S01-20261122-001',
      created_at: '2026-11-22T09:15:00.000Z',
      cashier_name: 'Vo Ngoc Linh',
      payment_method: 'VIETQR',
      payment_status: 'PENDING',
      vietqr_ref_code: 'CF19STORE01ABCD1234',
      total_amount_vnd: 78000,
      lines: [
        {
          product_name: 'Ca Phe Sua Da',
          size_code: 'M',
          modifier_names: ['It duong 50%', 'Them 1 Shot'],
          quantity: 2,
          unit_price_vnd: 39000,
          line_total_vnd: 78000,
          notes: 'It da',
        },
      ],
    });

    const receiptLines = text.split('\n');
    expect(receiptLines.length).toBeGreaterThanOrEqual(12);
    for (const rLine of receiptLines) {
      expect(rLine.length).toBeLessThanOrEqual(ESC_POS_RECEIPT_WIDTH);
    }
    expect(text).toContain('POS-S01-20261122-001');
    expect(text).toContain('CF19STORE01ABCD1234');
    expect(text).toContain('78,000d');
    expect(text).toContain('VIETQR');
  });

  it('16. omits Ma VietQR line on CASH receipts', () => {
    const text = buildEscPosThermalReceiptText({
      store_name: 'CF19 QUAN 1',
      order_code: 'POS-S01-CASH-01',
      created_at: '2026-11-22T10:00:00.000Z',
      cashier_name: 'Vo Ngoc Linh',
      payment_method: 'CASH',
      payment_status: 'PAID',
      vietqr_ref_code: null,
      total_amount_vnd: 25000,
      lines: [
        {
          product_name: 'Ca Phe Den Da',
          size_code: 'M',
          modifier_names: [],
          quantity: 1,
          unit_price_vnd: 25000,
          line_total_vnd: 25000,
        },
      ],
    });
    expect(text).not.toContain('Ma VietQR:');
    expect(text).toContain('CASH');
    expect(text).toContain('PAID');
  });

  // 17-22: M4 Zod Schemas
  it('17. validates SubmitPosOrderSchema with optional client_order_code', () => {
    const parsed = SubmitPosOrderSchema.parse({
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      payment_method: 'VIETQR',
      client_order_code: 'POS-S01-OFFLINE-001',
      items: [
        {
          product_id: SEED_IDS.menuProducts.caPheSuaDa,
          variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
          quantity: 2,
        },
      ],
    });
    expect(parsed.items[0]?.modifier_ids).toEqual([]);
    expect(parsed.client_order_code).toBe('POS-S01-OFFLINE-001');
  });

  it('18. rejects SubmitPosOrderSchema with empty items or lowercase client_order_code', () => {
    expect(
      SubmitPosOrderSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        items: [],
      }).success,
    ).toBe(false);

    expect(
      SubmitPosOrderSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        payment_method: 'CASH',
        client_order_code: 'bad lower code',
        items: [
          {
            product_id: SEED_IDS.menuProducts.caPheSuaDa,
            variant_id: SEED_IDS.menuVariants.caPheSuaDaM,
            quantity: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('19. validates OfflinePosBatchSyncSchema requiring unique uppercase client_order_code per offline order', () => {
    const ok = OfflinePosBatchSyncSchema.safeParse({
      shift_id: SEED_IDS.posShifts.store01OpenShift,
      orders: [
        {
          client_order_code: 'POS-S01-OFF-001',
          payment_method: 'CASH',
          items: [
            {
              product_id: SEED_IDS.menuProducts.caPheDenDa,
              variant_id: SEED_IDS.menuVariants.caPheDenDaM,
              quantity: 1,
            },
          ],
        },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it('20. rejects OfflinePosBatchSyncSchema with empty orders array or missing client_order_code', () => {
    expect(
      OfflinePosBatchSyncSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        orders: [],
      }).success,
    ).toBe(false);

    expect(
      OfflinePosBatchSyncSchema.safeParse({
        shift_id: SEED_IDS.posShifts.store01OpenShift,
        orders: [
          {
            payment_method: 'CASH',
            items: [
              {
                product_id: SEED_IDS.menuProducts.caPheDenDa,
                variant_id: SEED_IDS.menuVariants.caPheDenDaM,
                quantity: 1,
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('21. validates PosOrdersFilterQuerySchema with enum filters and default limit = 50', () => {
    const parsed = PosOrdersFilterQuerySchema.parse({
      payment_status: 'PAID',
      kds_status: 'QUEUED',
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.payment_status).toBe('PAID');
  });

  it('22. rejects PosOrdersFilterQuerySchema with invalid payment_status or out-of-range limit', () => {
    expect(
      PosOrdersFilterQuerySchema.safeParse({ payment_status: 'REFUNDED' }).success,
    ).toBe(false);
    expect(
      PosOrdersFilterQuerySchema.safeParse({ limit: 500 }).success,
    ).toBe(false);
  });
});
