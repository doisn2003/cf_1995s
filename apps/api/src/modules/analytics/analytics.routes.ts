import { Router, type Request, type Response } from 'express';
import {
  CloneFranchiseStoreSchema,
  ExecutivePnlQuerySchema,
  PreviewFranchisePricingSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  cloneFranchiseStore,
  getExecutivePnlConsolidation,
  previewFranchisePricing,
} from './analytics.service.js';

export const analyticsRouter = Router();

// Strictly SUPER_ADMIN ONLY across all Executive P&L and Franchise Cloning routes
analyticsRouter.use(
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
);

function handleAnalyticsError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Unexpected executive analytics error';
  res.status(500).json({
    error: {
      code: 'ANALYTICS_INTERNAL_ERROR',
      message,
    },
  });
}

/**
 * GET /api/v1/analytics/pnl-consolidation
 */
analyticsRouter.get('/pnl-consolidation', async (req: Request, res: Response) => {
  const parsed = ExecutivePnlQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_PNL_QUERY',
        message: 'Invalid Executive P&L query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const report = await getExecutivePnlConsolidation(parsed.data);
    res.status(200).json({ data: report });
  } catch (err) {
    handleAnalyticsError(res, err);
  }
});

/**
 * GET /api/v1/analytics/franchise/preview-pricing
 */
analyticsRouter.get(
  '/franchise/preview-pricing',
  async (req: Request, res: Response) => {
    const parsed = PreviewFranchisePricingSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_PREVIEW_PRICING_QUERY',
          message: 'Invalid franchise pricing preview parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const preview = await previewFranchisePricing(parsed.data);
      res.status(200).json({ data: preview });
    } catch (err) {
      handleAnalyticsError(res, err);
    }
  },
);

/**
 * POST /api/v1/analytics/franchise/clone-store
 */
analyticsRouter.post(
  '/franchise/clone-store',
  async (req: Request, res: Response) => {
    const parsed = CloneFranchiseStoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CLONE_STORE_PAYLOAD',
          message: 'Invalid franchise store cloning payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await cloneFranchiseStore(req.actor!, parsed.data);
      res.status(201).json({ data: result });
    } catch (err) {
      handleAnalyticsError(res, err);
    }
  },
);
