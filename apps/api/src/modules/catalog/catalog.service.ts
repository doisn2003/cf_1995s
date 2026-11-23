import {
  SEED_IDS,
  calculateBranchAdjustedBasePriceVnd,
  calculateOrderBomRequirementsAndCogs,
  calculatePosLinePricing,
  validateModifierSelectionMatrix,
  type BaseUnit,
  type BomInventoryCostLookup,
  type BomRecipeWithItemsDTO,
  type CreateMenuCategoryInput,
  type CreateMenuModifierInput,
  type CreateMenuProductInput,
  type MenuCategoryDto,
  type MenuModifierDto,
  type MenuProductDto,
  type MenuVariantDto,
  type PosLinePricingBreakdownDTO,
  type PosOrderCartItemInputDTO,
  type BomMaterialRequirementSliceDTO,
  type StorePosCatalogDTO,
  type UpdateMenuCategoryInput,
  type UpdateMenuModifierInput,
  type UpdateMenuProductInput,
  type UpsertBomRecipeInput,
  type UpsertMenuVariantInput,
} from '@cf19/shared';
import { dbQuery, dbQueryOne, withTransaction } from '../../db/pgClient.js';
import type { AuthActor } from '../../middlewares/auth.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';

export async function loadActiveBomRecipes(): Promise<BomRecipeWithItemsDTO[]> {
  const [recipesRes, itemsRes] = await Promise.all([
    dbQuery<{
      id: string;
      product_id: string;
      variant_id: string;
      version: number;
      is_active: boolean;
    }>(`SELECT id, product_id, variant_id, version, is_active FROM public.bom_recipes WHERE is_active = TRUE ORDER BY product_id, variant_id`),
    dbQuery<{
      recipe_id: string;
      inventory_item_id: string;
      sku: string;
      name: string;
      base_unit: BaseUnit;
      quantity_per_cup_base_unit: number;
      wastage_allowance_pct: number;
      internal_transfer_price_vnd: number;
    }>(
      `SELECT bri.recipe_id, bri.inventory_item_id, ii.sku, ii.name, ii.base_unit,
              bri.quantity_per_cup_base_unit, bri.wastage_allowance_pct, ii.internal_transfer_price_vnd
       FROM public.bom_recipe_items bri
       JOIN public.inventory_items ii ON ii.id = bri.inventory_item_id
       ORDER BY ii.sku ASC`,
    ),
  ]);

  return recipesRes.rows.map((r) => ({
    ...r,
    items: itemsRes.rows
      .filter((it) => it.recipe_id === r.id)
      .map((it) => ({
        inventory_item_id: it.inventory_item_id,
        sku: it.sku,
        name: it.name,
        base_unit: it.base_unit,
        quantity_per_cup_base_unit: it.quantity_per_cup_base_unit,
        wastage_allowance_pct: it.wastage_allowance_pct,
        internal_transfer_price_vnd: it.internal_transfer_price_vnd,
      })),
  }));
}

export async function getStorePosCatalog(
  storeId: string,
  includeInactive = false,
): Promise<StorePosCatalogDTO> {
  const store = await dbQueryOne<{
    id: string;
    code: string;
    name: string;
    price_multiplier: number;
  }>(
    `SELECT id, code, name, price_multiplier FROM public.stores WHERE id = $1`,
    [storeId],
  );
  if (!store) {
    throw new WarehouseDomainError(404, 'STORE_NOT_FOUND', `Không tìm thấy chi nhánh ${storeId}`);
  }

  const activeFilter = includeInactive ? '' : 'WHERE is_active = TRUE';
  const [catsRes, prodsRes, varsRes, modsRes, bomRecipes] = await Promise.all([
    dbQuery<MenuCategoryDto>(
      `SELECT id, organization_id, code, name, sort_order, is_active
       FROM public.menu_categories ${activeFilter}
       ORDER BY sort_order ASC, code ASC`,
    ),
    dbQuery<MenuProductDto>(
      `SELECT id, organization_id, category_id, code, name, base_price_vnd, is_active
       FROM public.menu_products ${activeFilter}
       ORDER BY code ASC`,
    ),
    dbQuery<MenuVariantDto>(
      `SELECT id, product_id, size_code, name, price_delta_vnd, is_default, is_active
       FROM public.menu_variants ${activeFilter}
       ORDER BY CASE size_code WHEN 'S' THEN 1 WHEN 'M' THEN 2 ELSE 3 END`,
    ),
    dbQuery<MenuModifierDto>(
      `SELECT id, organization_id, code, modifier_group, name, price_delta_vnd,
              inventory_item_id, bom_qty_base_unit, is_active
       FROM public.menu_modifiers ${activeFilter}
       ORDER BY modifier_group ASC, code ASC`,
    ),
    loadActiveBomRecipes(),
  ]);

  return {
    store,
    categories: catsRes.rows,
    products: prodsRes.rows.map((p) => ({
      ...p,
      effective_base_price_vnd: calculateBranchAdjustedBasePriceVnd(
        p.base_price_vnd,
        store.price_multiplier,
      ),
      variants: varsRes.rows.filter((v) => v.product_id === p.id),
    })),
    modifiers: modsRes.rows,
    bom_recipes: bomRecipes,
  };
}

export interface PosOrderPricingPreviewResult {
  store_id: string;
  price_multiplier: number;
  total_amount_vnd: number;
  estimated_cogs_vnd: number;
  lines: Array<{
    product_id: string;
    product_name: string;
    variant_id: string;
    size_code: string;
    modifier_ids: string[];
    modifier_names: string[];
    pricing: PosLinePricingBreakdownDTO;
  }>;
  bom_requirements: BomMaterialRequirementSliceDTO[];
}

export async function previewBomAndLinePricing(
  storeId: string,
  items: PosOrderCartItemInputDTO[],
): Promise<PosOrderPricingPreviewResult> {
  const store = await dbQueryOne<{ id: string; price_multiplier: number }>(
    `SELECT id, price_multiplier FROM public.stores WHERE id = $1 AND is_active = TRUE`,
    [storeId],
  );
  if (!store) {
    throw new WarehouseDomainError(404, 'STORE_NOT_FOUND', 'Không tìm thấy chi nhánh');
  }

  const [prodsRes, varsRes, modsRes, invRes, bomRecipes] = await Promise.all([
    dbQuery<MenuProductDto>(`SELECT * FROM public.menu_products WHERE is_active = TRUE`),
    dbQuery<MenuVariantDto>(`SELECT * FROM public.menu_variants WHERE is_active = TRUE`),
    dbQuery<MenuModifierDto>(`SELECT * FROM public.menu_modifiers WHERE is_active = TRUE`),
    dbQuery<BomInventoryCostLookup>(
      `SELECT id, sku, name, base_unit, internal_transfer_price_vnd
       FROM public.inventory_items WHERE is_active = TRUE`,
    ),
    loadActiveBomRecipes(),
  ]);

  const modifiersById: Record<string, MenuModifierDto> = {};
  for (const m of modsRes.rows) modifiersById[m.id] = m;

  const inventoryById: Record<string, BomInventoryCostLookup> = {};
  for (const inv of invRes.rows) inventoryById[inv.id] = inv;

  const linesBreakdown: PosOrderPricingPreviewResult['lines'] = [];
  let totalAmount = 0;

  for (const line of items) {
    const product = prodsRes.rows.find((p) => p.id === line.product_id);
    const variant = varsRes.rows.find(
      (v) => v.id === line.variant_id && v.product_id === line.product_id,
    );
    if (!product || !variant) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy đồ uống hoặc biến thể Size');
    }

    const selectedMods: MenuModifierDto[] = [];
    for (const modId of line.modifier_ids) {
      const m = modifiersById[modId];
      if (!m) {
        throw new WarehouseDomainError(404, 'NOT_FOUND', `Không tìm thấy tùy chọn ${modId}`);
      }
      selectedMods.push(m);
    }

    const matrixCheck = validateModifierSelectionMatrix(selectedMods);
    if (!matrixCheck.valid) {
      throw new WarehouseDomainError(
        400,
        'INVALID_MODIFIER_MATRIX',
        matrixCheck.errors.join('; '),
      );
    }

    const pricing = calculatePosLinePricing({
      basePriceVnd: product.base_price_vnd,
      priceMultiplier: store.price_multiplier,
      variantPriceDeltaVnd: variant.price_delta_vnd,
      modifiers: selectedMods,
      quantity: line.quantity,
    });
    totalAmount += pricing.line_total_vnd;

    linesBreakdown.push({
      product_id: product.id,
      product_name: product.name,
      variant_id: variant.id,
      size_code: variant.size_code,
      modifier_ids: selectedMods.map((m) => m.id),
      modifier_names: selectedMods.map((m) => m.name),
      pricing,
    });
  }

  const bom = calculateOrderBomRequirementsAndCogs({
    lines: items,
    recipes: bomRecipes,
    modifiersById,
    inventoryItemsById: inventoryById,
  });

  return {
    store_id: store.id,
    price_multiplier: store.price_multiplier,
    total_amount_vnd: totalAmount,
    estimated_cogs_vnd: bom.total_cogs_vnd,
    lines: linesBreakdown,
    bom_requirements: bom.requirements,
  };
}

// ============================================================================
// MASTER MENU & BOM FULL CRUD (SUPER_ADMIN ONLY)
// ============================================================================
export async function createMenuCategory(
  actor: AuthActor,
  input: CreateMenuCategoryInput,
): Promise<MenuCategoryDto> {
  return withTransaction(async (client) => {
    const dup = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.menu_categories WHERE UPPER(code) = UPPER($1)`,
      [input.code],
      client,
    );
    if (dup) {
      throw new WarehouseDomainError(409, 'DUPLICATE_CATEGORY_CODE', `Mã danh mục ${input.code} đã tồn tại`);
    }
    const row = await dbQueryOne<MenuCategoryDto>(
      `INSERT INTO public.menu_categories (organization_id, code, name, sort_order, is_active)
       VALUES ($1, UPPER($2), $3, $4, TRUE)
       RETURNING id, organization_id, code, name, sort_order, is_active`,
      [SEED_IDS.organization.cf19, input.code, input.name, input.sort_order],
      client,
    );
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_CATEGORY_CREATED',
        targetTable: 'menu_categories',
        targetId: row!.id,
        reason: `Thêm danh mục thực đơn ${row!.code}`,
        payload: input,
      },
      client,
    );
    return row!;
  });
}

export async function updateMenuCategory(
  actor: AuthActor,
  categoryId: string,
  input: UpdateMenuCategoryInput,
): Promise<MenuCategoryDto> {
  return withTransaction(async (client) => {
    const row = await dbQueryOne<MenuCategoryDto>(
      `UPDATE public.menu_categories
       SET name = COALESCE($2, name),
           sort_order = COALESCE($3, sort_order),
           is_active = COALESCE($4, is_active)
       WHERE id = $1
       RETURNING id, organization_id, code, name, sort_order, is_active`,
      [categoryId, input.name ?? null, input.sort_order ?? null, input.is_active ?? null],
      client,
    );
    if (!row) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy danh mục thực đơn');
    }
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_CATEGORY_UPDATED',
        targetTable: 'menu_categories',
        targetId: categoryId,
        payload: input,
      },
      client,
    );
    return row;
  });
}

export async function createMenuProduct(
  actor: AuthActor,
  input: CreateMenuProductInput,
): Promise<MenuProductDto & { variants: MenuVariantDto[] }> {
  return withTransaction(async (client) => {
    const dup = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.menu_products WHERE UPPER(code) = UPPER($1)`,
      [input.code],
      client,
    );
    if (dup) {
      throw new WarehouseDomainError(409, 'DUPLICATE_PRODUCT_CODE', `Mã món ${input.code} đã tồn tại`);
    }

    const cat = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.menu_categories WHERE id = $1`,
      [input.category_id],
      client,
    );
    if (!cat) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Danh mục thực đơn không tồn tại');
    }

    const product = await dbQueryOne<MenuProductDto>(
      `INSERT INTO public.menu_products (organization_id, category_id, code, name, base_price_vnd, is_active)
       VALUES ($1, $2, UPPER($3), $4, $5, TRUE)
       RETURNING id, organization_id, category_id, code, name, base_price_vnd, is_active`,
      [SEED_IDS.organization.cf19, input.category_id, input.code, input.name, input.base_price_vnd],
      client,
    );

    const variants: MenuVariantDto[] = [];
    if (input.create_default_variants) {
      const mVar = await dbQueryOne<MenuVariantDto>(
        `INSERT INTO public.menu_variants (product_id, size_code, name, price_delta_vnd, is_default, is_active)
         VALUES ($1, 'M', 'Size M (Tiêu chuẩn)', 0, TRUE, TRUE)
         RETURNING id, product_id, size_code, name, price_delta_vnd, is_default, is_active`,
        [product!.id],
        client,
      );
      const lVar = await dbQueryOne<MenuVariantDto>(
        `INSERT INTO public.menu_variants (product_id, size_code, name, price_delta_vnd, is_default, is_active)
         VALUES ($1, 'L', 'Size L (Lớn)', $2, FALSE, TRUE)
         RETURNING id, product_id, size_code, name, price_delta_vnd, is_default, is_active`,
        [product!.id, input.size_l_delta_vnd],
        client,
      );
      variants.push(mVar!, lVar!);
    }

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_PRODUCT_CREATED',
        targetTable: 'menu_products',
        targetId: product!.id,
        reason: `Thêm món mới ${product!.code} — ${product!.name}`,
        payload: input,
      },
      client,
    );

    return { ...product!, variants };
  });
}

export async function updateMenuProduct(
  actor: AuthActor,
  productId: string,
  input: UpdateMenuProductInput,
): Promise<MenuProductDto> {
  return withTransaction(async (client) => {
    const row = await dbQueryOne<MenuProductDto>(
      `UPDATE public.menu_products
       SET category_id = COALESCE($2, category_id),
           name = COALESCE($3, name),
           base_price_vnd = COALESCE($4, base_price_vnd),
           is_active = COALESCE($5, is_active)
       WHERE id = $1
       RETURNING id, organization_id, category_id, code, name, base_price_vnd, is_active`,
      [
        productId,
        input.category_id ?? null,
        input.name ?? null,
        input.base_price_vnd ?? null,
        input.is_active ?? null,
      ],
      client,
    );
    if (!row) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy món uống');
    }
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_PRODUCT_UPDATED',
        targetTable: 'menu_products',
        targetId: productId,
        payload: input,
      },
      client,
    );
    return row;
  });
}

export async function upsertMenuVariant(
  actor: AuthActor,
  productId: string,
  input: UpsertMenuVariantInput,
): Promise<MenuVariantDto> {
  return withTransaction(async (client) => {
    const row = await dbQueryOne<MenuVariantDto>(
      `INSERT INTO public.menu_variants (product_id, size_code, name, price_delta_vnd, is_default, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id, size_code) DO UPDATE SET
         name = EXCLUDED.name,
         price_delta_vnd = EXCLUDED.price_delta_vnd,
         is_default = EXCLUDED.is_default,
         is_active = EXCLUDED.is_active
       RETURNING id, product_id, size_code, name, price_delta_vnd, is_default, is_active`,
      [
        productId,
        input.size_code,
        input.name,
        input.price_delta_vnd,
        input.is_default,
        input.is_active,
      ],
      client,
    );
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_VARIANT_UPSERTED',
        targetTable: 'menu_variants',
        targetId: row!.id,
        payload: { product_id: productId, ...input },
      },
      client,
    );
    return row!;
  });
}

export async function createMenuModifier(
  actor: AuthActor,
  input: CreateMenuModifierInput,
): Promise<MenuModifierDto> {
  return withTransaction(async (client) => {
    const dup = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.menu_modifiers WHERE UPPER(code) = UPPER($1)`,
      [input.code],
      client,
    );
    if (dup) {
      throw new WarehouseDomainError(409, 'DUPLICATE_MODIFIER_CODE', `Mã tùy chọn ${input.code} đã tồn tại`);
    }
    const row = await dbQueryOne<MenuModifierDto>(
      `INSERT INTO public.menu_modifiers (
         organization_id, code, modifier_group, name, price_delta_vnd,
         inventory_item_id, bom_qty_base_unit, is_active
       )
       VALUES ($1, UPPER($2), $3, $4, $5, $6, $7, TRUE)
       RETURNING id, organization_id, code, modifier_group, name, price_delta_vnd,
                 inventory_item_id, bom_qty_base_unit, is_active`,
      [
        SEED_IDS.organization.cf19,
        input.code,
        input.modifier_group,
        input.name,
        input.price_delta_vnd,
        input.inventory_item_id ?? null,
        input.bom_qty_base_unit,
      ],
      client,
    );
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_MODIFIER_CREATED',
        targetTable: 'menu_modifiers',
        targetId: row!.id,
        payload: input,
      },
      client,
    );
    return row!;
  });
}

export async function updateMenuModifier(
  actor: AuthActor,
  modifierId: string,
  input: UpdateMenuModifierInput,
): Promise<MenuModifierDto> {
  return withTransaction(async (client) => {
    const row = await dbQueryOne<MenuModifierDto>(
      `UPDATE public.menu_modifiers
       SET name = COALESCE($2, name),
           price_delta_vnd = COALESCE($3, price_delta_vnd),
           inventory_item_id = CASE WHEN $4::boolean THEN $5 ELSE inventory_item_id END,
           bom_qty_base_unit = COALESCE($6, bom_qty_base_unit),
           is_active = COALESCE($7, is_active)
       WHERE id = $1
       RETURNING id, organization_id, code, modifier_group, name, price_delta_vnd,
                 inventory_item_id, bom_qty_base_unit, is_active`,
      [
        modifierId,
        input.name ?? null,
        input.price_delta_vnd ?? null,
        input.inventory_item_id !== undefined,
        input.inventory_item_id ?? null,
        input.bom_qty_base_unit ?? null,
        input.is_active ?? null,
      ],
      client,
    );
    if (!row) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Không tìm thấy tùy chọn Modifier');
    }
    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'MENU_MODIFIER_UPDATED',
        targetTable: 'menu_modifiers',
        targetId: modifierId,
        payload: input,
      },
      client,
    );
    return row;
  });
}

export async function upsertBomRecipe(
  actor: AuthActor,
  input: UpsertBomRecipeInput,
): Promise<BomRecipeWithItemsDTO> {
  return withTransaction(async (client) => {
    const variant = await dbQueryOne<{ id: string }>(
      `SELECT id FROM public.menu_variants WHERE id = $1 AND product_id = $2`,
      [input.variant_id, input.product_id],
      client,
    );
    if (!variant) {
      throw new WarehouseDomainError(404, 'NOT_FOUND', 'Biến thể Size không khớp với sản phẩm');
    }

    // Validate none of the BOM items is raw GREEN_BEAN
    for (const line of input.items) {
      const inv = await dbQueryOne<{ id: string; sku: string; category: string }>(
        `SELECT id, sku, category FROM public.inventory_items WHERE id = $1 AND is_active = TRUE`,
        [line.inventory_item_id],
        client,
      );
      if (!inv) {
        throw new WarehouseDomainError(404, 'NOT_FOUND', `Nguyên liệu ${line.inventory_item_id} không tồn tại`);
      }
      if (inv.category === 'GREEN_BEAN') {
        throw new WarehouseDomainError(
          400,
          'INVALID_BOM_INGREDIENT',
          `Không thể đưa cà phê nhân xanh chưa rang (${inv.sku}) vào công thức pha chế BOM`,
        );
      }
    }

    const recipe = await dbQueryOne<{
      id: string;
      product_id: string;
      variant_id: string;
      version: number;
      is_active: boolean;
    }>(
      `INSERT INTO public.bom_recipes (product_id, variant_id, version, is_active, notes)
       VALUES ($1, $2, 1, TRUE, $3)
       ON CONFLICT (product_id, variant_id) DO UPDATE SET
         version = public.bom_recipes.version + 1,
         is_active = TRUE,
         notes = COALESCE($3, public.bom_recipes.notes)
       RETURNING id, product_id, variant_id, version, is_active`,
      [input.product_id, input.variant_id, input.notes ?? null],
      client,
    );

    await client.query(`DELETE FROM public.bom_recipe_items WHERE recipe_id = $1`, [
      recipe!.id,
    ]);

    for (const line of input.items) {
      await client.query(
        `INSERT INTO public.bom_recipe_items (
           recipe_id, inventory_item_id, quantity_per_cup_base_unit, wastage_allowance_pct
         )
         VALUES ($1, $2, $3, $4)`,
        [
          recipe!.id,
          line.inventory_item_id,
          line.quantity_per_cup_base_unit,
          line.wastage_allowance_pct,
        ],
      );
    }

    const itemsRes = await dbQuery<{
      inventory_item_id: string;
      sku: string;
      name: string;
      base_unit: BaseUnit;
      quantity_per_cup_base_unit: number;
      wastage_allowance_pct: number;
      internal_transfer_price_vnd: number;
    }>(
      `SELECT bri.inventory_item_id, ii.sku, ii.name, ii.base_unit,
              bri.quantity_per_cup_base_unit, bri.wastage_allowance_pct, ii.internal_transfer_price_vnd
       FROM public.bom_recipe_items bri
       JOIN public.inventory_items ii ON ii.id = bri.inventory_item_id
       WHERE bri.recipe_id = $1
       ORDER BY ii.sku ASC`,
      [recipe!.id],
      client,
    );

    await recordAuditLog(
      {
        actorId: actor.id,
        storeId: null,
        action: 'BOM_RECIPE_UPSERTED',
        targetTable: 'bom_recipes',
        targetId: recipe!.id,
        reason: `Cập nhật công thức định lượng BOM (v${recipe!.version})`,
        payload: {
          product_id: input.product_id,
          variant_id: input.variant_id,
          items_count: input.items.length,
        },
      },
      client,
    );

    return { ...recipe!, items: itemsRes.rows };
  });
}
