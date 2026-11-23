import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { listAuditLogs } from '../../services/audit.service.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'STORE_MANAGER'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const actor = req.actor!;
      const requestedStoreId =
        typeof req.query.store_id === 'string' ? req.query.store_id : undefined;
      const scopedStoreId =
        actor.role === 'SUPER_ADMIN'
          ? requestedStoreId
          : actor.assignedStoreId ?? undefined;

      const limitRaw = Number(req.query.limit ?? 50);
      const offsetRaw = Number(req.query.offset ?? 0);

      const logs = await listAuditLogs({
        storeId: scopedStoreId,
        action:
          typeof req.query.action === 'string' ? req.query.action : undefined,
        targetTable:
          typeof req.query.target_table === 'string'
            ? req.query.target_table
            : undefined,
        limit: Number.isFinite(limitRaw) ? limitRaw : 50,
        offset: Number.isFinite(offsetRaw) ? offsetRaw : 0,
      });

      res.status(200).json({ data: logs });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'AUDIT_INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Không thể tải nhật ký hệ thống',
        },
      });
    }
  },
);
