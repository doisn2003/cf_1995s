import { Router, type Request, type Response } from 'express';
import {
  AdvanceKdsTicketStatusSchema,
  CompleteKdsBomDeductionSchema,
  KdsQueueQuerySchema,
  ReportBaristaLowStockAlertSchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  advanceKdsTicketStatus,
  completeKdsOrderWithBomDeduction,
  getStoreKdsBoard,
  listLowStockAlerts,
  reportBaristaLowStockAlert,
  resolveLowStockAlert,
} from './kds.service.js';

export const kdsRouter = Router();

function handleKdsError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Lỗi xử lý màn hình KDS';
  res.status(500).json({
    error: { code: 'KDS_INTERNAL_ERROR', message },
  });
}

kdsRouter.get(
  '/stores/:storeId/board',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = KdsQueueQuerySchema.safeParse({
      ...req.query,
      store_id: req.params.storeId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_KDS_QUEUE_QUERY',
          message: 'Tham số tải bảng KDS chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const referenceNowIso =
      typeof req.query.reference_now_iso === 'string'
        ? req.query.reference_now_iso
        : undefined;

    try {
      const tickets = await getStoreKdsBoard(
        req.params.storeId,
        parsed.data,
        referenceNowIso,
      );
      res.status(200).json({ data: tickets });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

kdsRouter.post(
  '/stores/:storeId/orders/:orderId/advance',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = AdvanceKdsTicketStatusSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_KDS_ADVANCE_PAYLOAD',
          message: 'Dữ liệu chuyển trạng thái KDS chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await advanceKdsTicketStatus(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

kdsRouter.post(
  '/stores/:storeId/orders/:orderId/complete-bom',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = CompleteKdsBomDeductionSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
      order_id: req.params.orderId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_KDS_COMPLETE_PAYLOAD',
          message: 'Dữ liệu hoàn tất món trừ kho BOM chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await completeKdsOrderWithBomDeduction(
        req.actor!,
        parsed.data,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

kdsRouter.get(
  '/stores/:storeId/low-stock-alerts',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const alerts = await listLowStockAlerts(req.params.storeId);
      res.status(200).json({ data: alerts });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

kdsRouter.post(
  '/stores/:storeId/low-stock-alerts',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null ? req.body : {};
    const parsed = ReportBaristaLowStockAlertSchema.safeParse({
      ...rawBody,
      store_id: req.params.storeId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_LOW_STOCK_ALERT_PAYLOAD',
          message: 'Dữ liệu cảnh báo nguyên liệu chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const alert = await reportBaristaLowStockAlert(req.actor!, parsed.data);
      res.status(201).json({ data: alert });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);

kdsRouter.patch(
  '/stores/:storeId/low-stock-alerts/:alertId/resolve',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const result = await resolveLowStockAlert(
        req.actor!,
        req.params.storeId,
        req.params.alertId,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleKdsError(res, err);
    }
  },
);
