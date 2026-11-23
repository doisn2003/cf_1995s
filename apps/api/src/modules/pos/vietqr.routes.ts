import { Router, type Request, type Response } from 'express';
import {
  GenerateOrderVietQrSchema,
  SimulateVietQrWebhookSchema,
  VietQrBankingWebhookPayloadSchema,
  WebhookLogQuerySchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  generateOrderVietQr,
  listWebhookLogs,
  processBankingWebhook,
  simulateOrderWebhook,
} from './vietqr.service.js';

export const vietqrRouter = Router();

const DEFAULT_DEV_WEBHOOK_SECRET = 'cf19-vietqr-dev-secret';

function handleVietQrError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected VietQR error';
  res.status(500).json({
    error: {
      code: 'VIETQR_INTERNAL_ERROR',
      message,
    },
  });
}

function verifyOptionalWebhookSecret(req: Request): boolean {
  const configuredSecret = process.env.VIETQR_WEBHOOK_SECRET?.trim();
  const headerValue = req.headers['x-webhook-secret'];
  const providedSecret =
    typeof headerValue === 'string' ? headerValue.trim() : undefined;

  if (configuredSecret && configuredSecret.length > 0) {
    return providedSecret === configuredSecret;
  }

  if (providedSecret !== undefined && providedSecret.length > 0) {
    return providedSecret === DEFAULT_DEV_WEBHOOK_SECRET;
  }

  return true;
}

/**
 * POST /api/v1/vietqr/stores/:storeId/orders/:orderId/generate
 */
vietqrRouter.post(
  '/stores/:storeId/orders/:orderId/generate',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = GenerateOrderVietQrSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_VIETQR_GENERATE_PAYLOAD',
          message: 'Invalid VietQR generation parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const payload = await generateOrderVietQr(req.actor!, parsed.data);
      res.status(200).json({ data: payload });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);

/**
 * POST /api/v1/vietqr/webhook/ipn
 * Banking IPN / Webhook listener with optional x-webhook-secret verification & idempotent replay.
 */
vietqrRouter.post(
  '/webhook/ipn',
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    if (!verifyOptionalWebhookSecret(req)) {
      res.status(401).json({
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Invalid x-webhook-secret header',
        },
      });
      return;
    }

    const parsed = VietQrBankingWebhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_WEBHOOK_PAYLOAD',
          message: 'Invalid banking IPN webhook payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await processBankingWebhook(parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);

/**
 * POST /api/v1/vietqr/stores/:storeId/orders/:orderId/simulate-webhook
 */
vietqrRouter.post(
  '/stores/:storeId/orders/:orderId/simulate-webhook',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = SimulateVietQrWebhookSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_SIMULATE_WEBHOOK_PAYLOAD',
          message: 'Invalid simulate webhook payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await simulateOrderWebhook(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);

/**
 * GET /api/v1/vietqr/stores/:storeId/webhook-logs
 */
vietqrRouter.get(
  '/stores/:storeId/webhook-logs',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = WebhookLogQuerySchema.safeParse({
      ...req.query,
      store_id: req.params.storeId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_WEBHOOK_LOG_QUERY',
          message: 'Invalid webhook logs query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const logs = await listWebhookLogs(req.actor!, parsed.data);
      res.status(200).json({ data: logs });
    } catch (err) {
      handleVietQrError(res, err);
    }
  },
);
