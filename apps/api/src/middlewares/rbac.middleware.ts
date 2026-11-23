import type { NextFunction, Request, Response } from 'express';
import {
  BLIND_SHIFT_HIDDEN_KEYS,
  KDS_FORBIDDEN_FINANCE_KEYS,
  ManagerPinApprovalSchema,
  SENSITIVE_COST_KEYS,
  STORE_LEVEL_ROLES,
  StoreIdParamSchema,
  type UserRole,
} from '@cf19/shared';
import { dbQueryOne } from '../db/pgClient.js';
import { recordAuditLog } from '../services/audit.service.js';
import { verifyManagerPin } from '../services/crypto.service.js';

const ALWAYS_STRIPPED_KEYS = new Set<string>([
  'manager_pin_hash',
  'dev_password',
  'encrypted_password',
  'password',
]);

const SENSITIVE_COST_KEY_SET = new Set<string>(SENSITIVE_COST_KEYS);
const KDS_FORBIDDEN_KEY_SET = new Set<string>(KDS_FORBIDDEN_FINANCE_KEYS);
const BLIND_SHIFT_HIDDEN_KEY_SET = new Set<string>(BLIND_SHIFT_HIDDEN_KEYS);
const STORE_LEVEL_ROLE_SET = new Set<UserRole>(STORE_LEVEL_ROLES);

export interface StoreScopeOptions {
  allowWarehouseManager?: boolean;
}

export function requireRoles(...allowedRoles: UserRole[]) {
  const allowedSet = new Set<UserRole>(allowedRoles);
  return (req: Request, res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Vui lòng đăng nhập',
        },
      });
      return;
    }

    if (!allowedSet.has(actor.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Vai trò ${actor.role} không có quyền thực hiện thao tác này`,
        },
      });
      return;
    }

    next();
  };
}

export function requireStoreScope(options: StoreScopeOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Vui lòng đăng nhập',
        },
      });
      return;
    }

    const parsedParam = StoreIdParamSchema.safeParse({
      storeId: req.params.storeId,
    });
    if (!parsedParam.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORE_ID',
          message: 'Mã chi nhánh không hợp lệ',
          details: parsedParam.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const targetStoreId = parsedParam.data.storeId;

    if (actor.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    if (actor.role === 'WAREHOUSE_MANAGER') {
      if (
        targetStoreId === actor.assignedStoreId ||
        options.allowWarehouseManager === true
      ) {
        next();
        return;
      }

      res.status(403).json({
        error: {
          code: 'FORBIDDEN_WAREHOUSE_SCOPE',
          message: 'Quản lý Kho Tổng không được truy cập dữ liệu bán hàng của chi nhánh quán',
        },
      });
      return;
    }

    if (actor.assignedStoreId !== targetStoreId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_CROSS_TENANT_ACCESS',
          message: 'Bạn chỉ được phép truy cập dữ liệu thuộc chi nhánh được phân công',
        },
      });
      return;
    }

    next();
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizePayloadForRole(
  value: unknown,
  role: UserRole | undefined,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadForRole(item, role));
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  const isStoreLevelRole = role !== undefined && STORE_LEVEL_ROLE_SET.has(role);
  const isBarista = role === 'BARISTA_KDS';
  const isCashier = role === 'CASHIER_STAFF';
  const isOpenShiftRecord =
    value['status'] === 'OPEN' && 'opening_cash_vnd' in value;

  const sanitized: Record<string, unknown> = {};

  for (const [key, rawFieldValue] of Object.entries(value)) {
    if (ALWAYS_STRIPPED_KEYS.has(key)) {
      continue;
    }

    if (isStoreLevelRole && SENSITIVE_COST_KEY_SET.has(key)) {
      continue;
    }

    if (isBarista && KDS_FORBIDDEN_KEY_SET.has(key)) {
      continue;
    }

    if (isCashier && isOpenShiftRecord && BLIND_SHIFT_HIDDEN_KEY_SET.has(key)) {
      sanitized[key] = null;
      continue;
    }

    sanitized[key] = sanitizePayloadForRole(rawFieldValue, role);
  }

  return sanitized;
}

export function sanitizeCostFields() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown): Response => {
      const cleaned = sanitizePayloadForRole(body, req.actor?.role);
      return originalJson(cleaned);
    }) as Response['json'];

    next();
  };
}

interface ManagerRow {
  id: string;
  role: UserRole;
  assigned_store_id: string | null;
  manager_pin_hash: string | null;
  is_active: boolean;
}

export function requireManagerPin(actionName: string, targetTable: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const actor = req.actor;
      if (!actor) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Vui lòng đăng nhập',
          },
        });
        return;
      }

      const rawBody = isPlainRecord(req.body) ? req.body : {};
      const targetStoreId =
        typeof req.params.storeId === 'string'
          ? req.params.storeId
          : typeof rawBody['store_id'] === 'string'
            ? rawBody['store_id']
            : actor.assignedStoreId ?? undefined;

      const normalizedPayload = {
        manager_id: rawBody['manager_id'],
        store_id: targetStoreId,
        pin: rawBody['pin'] ?? rawBody['manager_pin'],
        action:
          typeof rawBody['action'] === 'string' ? rawBody['action'] : actionName,
        target_table:
          typeof rawBody['target_table'] === 'string'
            ? rawBody['target_table']
            : targetTable,
        target_id:
          typeof req.params.orderId === 'string'
            ? req.params.orderId
            : rawBody['target_id'],
        reason: rawBody['reason'] ?? rawBody['void_reason'],
      };

      const parsed = ManagerPinApprovalSchema.safeParse(normalizedPayload);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PIN_PAYLOAD',
            message: 'Thông tin xác thực mã PIN Quản lý chưa hợp lệ',
            details: parsed.error.flatten().fieldErrors,
          },
        });
        return;
      }

      const { manager_id, store_id, pin, target_id, reason } = parsed.data;
      const manager = await dbQueryOne<ManagerRow>(
        `SELECT id, role, assigned_store_id, manager_pin_hash, is_active
         FROM public.user_profiles
         WHERE id = $1 AND is_active = TRUE`,
        [manager_id],
      );

      const isAuthorizedManagerForStore =
        manager !== null &&
        (manager.role === 'SUPER_ADMIN' ||
          (manager.role === 'STORE_MANAGER' &&
            manager.assigned_store_id === store_id));

      const isPinValid =
        isAuthorizedManagerForStore &&
        verifyManagerPin(pin, manager.manager_pin_hash);

      if (!isPinValid || !manager) {
        await recordAuditLog({
          actorId: actor.id,
          storeId: store_id,
          action: `${actionName}_PIN_FAILED`,
          targetTable,
          targetId: target_id ?? null,
          reason,
          payload: {
            attempted_manager_id: manager_id,
            attempted_manager_role: manager?.role ?? null,
            attempted_manager_store_id: manager?.assigned_store_id ?? null,
            failure_reason: !manager
              ? 'MANAGER_NOT_FOUND'
              : !isAuthorizedManagerForStore
                ? 'MANAGER_SCOPE_MISMATCH'
                : 'PIN_HASH_MISMATCH',
          },
        });

        res.status(403).json({
          error: {
            code: 'INVALID_MANAGER_PIN',
            message:
              'Mã PIN Quản lý không chính xác hoặc người duyệt không phụ trách chi nhánh này',
          },
        });
        return;
      }

      const auditEntry = await recordAuditLog({
        actorId: actor.id,
        storeId: store_id,
        action: `${actionName}_PIN_APPROVED`,
        targetTable,
        targetId: target_id ?? null,
        reason,
        payload: {
          approved_by_manager_id: manager.id,
          approved_by_manager_role: manager.role,
        },
      });

      req.managerApproval = {
        managerId: manager.id,
        managerRole: manager.role,
        storeId: store_id,
        reason,
        auditLogId: auditEntry.id,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
