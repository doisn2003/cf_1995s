import { Router, type Request, type Response } from 'express';
import {
  OfflinePosBatchSyncSchema,
  PosOrdersFilterQuerySchema,
  SubmitPosOrderSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  createPosOrder,
  getOrderReceipt,
  listStoreOrders,
  syncOfflinePosOrders,
} from './pos.service.js';

export const posRouter = Router();

function handlePosError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected POS error';
  res.status(500).json({
    error: {
      code: 'POS_INTERNAL_ERROR',
      message,
    },
  });
}

posRouter.get(
  '/stores/:storeId/orders',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsedQuery = PosOrdersFilterQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_POS_ORDERS_QUERY',
          message: 'Invalid POS orders query parameters',
          details: parsedQuery.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const orders = await listStoreOrders(req.params.storeId, parsedQuery.data);
      res.status(200).json({ data: orders });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);

posRouter.post(
  '/stores/:storeId/orders',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = SubmitPosOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_POS_ORDER_PAYLOAD',
          message: 'Invalid POS order submission payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await createPosOrder(
        req.actor!,
        req.params.storeId,
        parsed.data,
      );
      const status = result.sync_status === 'SYNCED_NEW' ? 201 : 200;
      res.status(status).json({ data: result });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);

posRouter.post(
  '/stores/:storeId/orders/offline-sync',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = OfflinePosBatchSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_OFFLINE_SYNC_PAYLOAD',
          message: 'Invalid offline POS batch sync payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await syncOfflinePosOrders(
        req.actor!,
        req.params.storeId,
        parsed.data,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);

posRouter.get(
  '/stores/:storeId/orders/:orderId/receipt',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const receipt = await getOrderReceipt(
        req.params.storeId,
        req.params.orderId,
      );
      res.status(200).json({ data: receipt });
    } catch (err) {
      handlePosError(res, err);
    }
  },
);
