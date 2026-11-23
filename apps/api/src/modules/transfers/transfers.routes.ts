import { Router, type Request, type Response } from 'express';
import {
  CancelInternalTransferSchema,
  CreateInternalTransferRequestSchema,
  DispatchInternalTransferFifoSchema,
  ReconcileInternalTransferSchema,
  TransferFilterQuerySchema,
} from '@cf19/shared';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { WarehouseDomainError } from '../warehouse/warehouse.errors.js';
import {
  cancelTransfer,
  dispatchTransferFifo,
  listTransfers,
  reconcileTransfer,
  requestTransfer,
} from './transfers.service.js';

export const transfersRouter = Router();

transfersRouter.use(authenticate, sanitizeCostFields());

function handleTransferError(res: Response, err: unknown): void {
  if (err instanceof WarehouseDomainError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Lỗi xử lý chuyển kho nội bộ';
  res.status(500).json({
    error: { code: 'TRANSFER_INTERNAL_ERROR', message },
  });
}

transfersRouter.get(
  '/',
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = TransferFilterQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSFER_QUERY',
          message: 'Tham số lọc phiếu chuyển kho chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const transfers = await listTransfers(req.actor!, parsed.data);
      res.status(200).json({ data: transfers });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/request',
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = CreateInternalTransferRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSFER_REQUEST_PAYLOAD',
          message: 'Dữ liệu xin cấp hàng nội bộ chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const transfer = await requestTransfer(req.actor!, parsed.data);
      res.status(201).json({ data: transfer });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/:transferId/dispatch',
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER'),
  async (req: Request, res: Response) => {
    const bodyNotes =
      typeof req.body === 'object' &&
      req.body !== null &&
      typeof (req.body as Record<string, unknown>)['notes'] === 'string'
        ? ((req.body as Record<string, unknown>)['notes'] as string)
        : undefined;

    const parsed = DispatchInternalTransferFifoSchema.safeParse({
      transfer_id: req.params.transferId,
      notes: bodyNotes,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_DISPATCH_PAYLOAD',
          message: 'Dữ liệu duyệt xuất kho chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await dispatchTransferFifo(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/:transferId/reconcile',
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const rawBody =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, unknown>)
        : {};

    const parsed = ReconcileInternalTransferSchema.safeParse({
      transfer_id: req.params.transferId,
      items: rawBody['items'],
      notes: rawBody['notes'],
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_RECONCILE_PAYLOAD',
          message: 'Dữ liệu xác nhận nhận hàng chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await reconcileTransfer(req.actor!, parsed.data);
      res.status(200).json({ data: result });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);

transfersRouter.post(
  '/:transferId/cancel',
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'STORE_MANAGER'),
  async (req: Request, res: Response) => {
    const parsed = CancelInternalTransferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_CANCEL_PAYLOAD',
          message: 'Vui lòng nhập lý do hủy phiếu chuyển kho',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const result = await cancelTransfer(
        req.actor!,
        req.params.transferId,
        parsed.data,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleTransferError(res, err);
    }
  },
);
