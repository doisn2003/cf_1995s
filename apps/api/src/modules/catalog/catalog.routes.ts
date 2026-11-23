import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  CreateMenuCategorySchema,
  CreateMenuModifierSchema,
  CreateMenuProductSchema,
  PosCatalogQuerySchema,
  PosOrderCartItemInputSchema,
  UpdateMenuCategorySchema,
  UpdateMenuModifierSchema,
  UpdateMenuProductSchema,
  UpsertBomRecipeSchema,
  UpsertMenuVariantSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  createMenuCategory,
  createMenuModifier,
  createMenuProduct,
  getStorePosCatalog,
  loadActiveBomRecipes,
  previewBomAndLinePricing,
  updateMenuCategory,
  updateMenuModifier,
  updateMenuProduct,
  upsertBomRecipe,
  upsertMenuVariant,
} from './catalog.service.js';

export const catalogRouter = Router();

const PreviewPricingBodySchema = z.object({
  items: z
    .array(PosOrderCartItemInputSchema)
    .min(1, 'Cần ít nhất 1 món để tính giá'),
});

function handleCatalogError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Lỗi quản trị Thực đơn & BOM';
  res.status(500).json({
    error: { code: 'CATALOG_INTERNAL_ERROR', message },
  });
}

catalogRouter.get(
  '/stores/:storeId',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsedQuery = PosCatalogQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CATALOG_QUERY',
          message: 'Tham số tải thực đơn không hợp lệ',
          details: parsedQuery.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const catalog = await getStorePosCatalog(
        req.params.storeId,
        parsedQuery.data.include_inactive,
      );
      res.status(200).json({ data: catalog });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.post(
  '/stores/:storeId/preview-pricing',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsedBody = PreviewPricingBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PREVIEW_PAYLOAD',
          message: 'Dữ liệu tính giá món chưa hợp lệ',
          details: parsedBody.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const preview = await previewBomAndLinePricing(
        req.params.storeId,
        parsedBody.data.items,
      );
      res.status(200).json({ data: preview });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

// ============================================================================
// MASTER MENU & BOM CRUD (SUPER_ADMIN ONLY)
// ============================================================================
catalogRouter.post(
  '/categories',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = CreateMenuCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CATEGORY_PAYLOAD',
          message: 'Dữ liệu tạo danh mục thực đơn chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const created = await createMenuCategory(req.actor!, parsed.data);
      res.status(201).json({ data: created });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.put(
  '/categories/:categoryId',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = UpdateMenuCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CATEGORY_UPDATE',
          message: 'Dữ liệu cập nhật danh mục chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const updated = await updateMenuCategory(req.actor!, req.params.categoryId, parsed.data);
      res.status(200).json({ data: updated });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.post(
  '/products',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = CreateMenuProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PRODUCT_PAYLOAD',
          message: 'Dữ liệu tạo món uống chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const created = await createMenuProduct(req.actor!, parsed.data);
      res.status(201).json({ data: created });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.put(
  '/products/:productId',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = UpdateMenuProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PRODUCT_UPDATE',
          message: 'Dữ liệu cập nhật món uống chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const updated = await updateMenuProduct(req.actor!, req.params.productId, parsed.data);
      res.status(200).json({ data: updated });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.put(
  '/products/:productId/variants',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = UpsertMenuVariantSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_VARIANT_PAYLOAD',
          message: 'Dữ liệu biến thể Size chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const variant = await upsertMenuVariant(req.actor!, req.params.productId, parsed.data);
      res.status(200).json({ data: variant });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.post(
  '/modifiers',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = CreateMenuModifierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_MODIFIER_PAYLOAD',
          message: 'Dữ liệu tạo Modifier chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const created = await createMenuModifier(req.actor!, parsed.data);
      res.status(201).json({ data: created });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.put(
  '/modifiers/:modifierId',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = UpdateMenuModifierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_MODIFIER_UPDATE',
          message: 'Dữ liệu cập nhật Modifier chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const updated = await updateMenuModifier(req.actor!, req.params.modifierId, parsed.data);
      res.status(200).json({ data: updated });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.get(
  '/bom-recipes',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  sanitizeCostFields(),
  async (_req: Request, res: Response) => {
    try {
      const recipes = await loadActiveBomRecipes();
      res.status(200).json({ data: recipes });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);

catalogRouter.put(
  '/bom-recipes',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = UpsertBomRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_BOM_RECIPE_PAYLOAD',
          message: 'Dữ liệu công thức định lượng BOM chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    try {
      const saved = await upsertBomRecipe(req.actor!, parsed.data);
      res.status(200).json({ data: saved });
    } catch (err) {
      handleCatalogError(res, err);
    }
  },
);
