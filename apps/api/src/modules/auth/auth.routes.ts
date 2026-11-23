import { Router, type Request, type Response } from 'express';
import {
  LoginRequestSchema,
  type AuthenticatedUserDto,
  type EmploymentType,
  type UserRole,
} from '@cf19/shared';
import { dbQuery, dbQueryOne } from '../../db/pgClient.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireManagerPin,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { signAccessToken } from '../../services/crypto.service.js';

export const authRouter = Router();

interface UserWithAuthRow {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  assigned_store_id: string | null;
  manager_pin_hash: string | null;
  hourly_rate_vnd: number;
  employment_type: EmploymentType;
  is_active: boolean;
  password_matched?: boolean;
}

function toAuthenticatedUserDto(user: UserWithAuthRow): AuthenticatedUserDto {
  return {
    id: user.id,
    organization_id: user.organization_id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role,
    assigned_store_id: user.assigned_store_id,
    hourly_rate_vnd: user.hourly_rate_vnd,
    employment_type: user.employment_type,
    has_manager_pin: Boolean(user.manager_pin_hash),
    is_active: user.is_active,
  };
}

/**
 * POST /api/v1/auth/login
 * Verifies real email + bcrypt password directly against Supabase PostgreSQL `auth.users`
 * joined with `public.user_profiles` and returns a signed HS256 JWT Bearer token.
 */
authRouter.post(
  '/login',
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_LOGIN_PAYLOAD',
          message: 'Vui lòng nhập đầy đủ Email và Mật khẩu',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const user = await dbQueryOne<UserWithAuthRow>(
        `SELECT
           up.id,
           up.organization_id,
           up.full_name,
           up.email,
           up.phone,
           up.role,
           up.assigned_store_id,
           up.manager_pin_hash,
           up.hourly_rate_vnd,
           up.employment_type,
           up.is_active,
           (au.encrypted_password = crypt($2, au.encrypted_password)) AS password_matched
         FROM public.user_profiles up
         JOIN auth.users au ON au.id = up.id
         WHERE LOWER(up.email) = LOWER($1) AND up.is_active = TRUE`,
        [parsed.data.email.trim(), parsed.data.password],
      );

      if (!user || !user.password_matched) {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email hoặc mật khẩu không chính xác',
          },
        });
        return;
      }

      const accessToken = signAccessToken({
        userId: user.id,
        role: user.role,
        assignedStoreId: user.assigned_store_id,
        email: user.email,
      });

      await recordAuditLog({
        actorId: user.id,
        storeId: user.assigned_store_id,
        action: 'USER_LOGIN',
        targetTable: 'user_profiles',
        targetId: user.id,
        payload: { email: user.email, role: user.role },
      });

      res.status(200).json({
        data: {
          access_token: accessToken,
          token_type: 'Bearer',
          user: toAuthenticatedUserDto(user),
        },
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'AUTH_INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi xác thực hệ thống',
        },
      });
    }
  },
);

/**
 * GET /api/v1/auth/me
 */
authRouter.get(
  '/me',
  authenticate,
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const actor = req.actor;
    if (!actor) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' },
      });
      return;
    }

    try {
      const user = await dbQueryOne<UserWithAuthRow>(
        `SELECT id, organization_id, full_name, email, phone, role, assigned_store_id,
                manager_pin_hash, hourly_rate_vnd, employment_type, is_active
         FROM public.user_profiles
         WHERE id = $1`,
        [actor.id],
      );
      if (!user) {
        res.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy hồ sơ nhân sự' },
        });
        return;
      }

      res.status(200).json({ data: toAuthenticatedUserDto(user) });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'AUTH_INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải hồ sơ người dùng',
        },
      });
    }
  },
);

/**
 * GET /api/v1/auth/managers?store_id=...
 * Returns list of active managers (SUPER_ADMIN or STORE_MANAGER of that store)
 * eligible to approve PIN-gated actions (without exposing any PIN hashes).
 */
authRouter.get(
  '/managers',
  authenticate,
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const storeId =
        typeof req.query.store_id === 'string'
          ? req.query.store_id
          : req.actor?.assignedStoreId ?? null;

      const rows = await dbQuery<{
        id: string;
        full_name: string;
        email: string;
        role: UserRole;
        assigned_store_id: string | null;
      }>(
        `SELECT id, full_name, email, role, assigned_store_id
         FROM public.user_profiles
         WHERE is_active = TRUE
           AND manager_pin_hash IS NOT NULL
           AND (
             role = 'SUPER_ADMIN'
             OR (role = 'STORE_MANAGER' AND ($1::uuid IS NULL OR assigned_store_id = $1::uuid))
           )
         ORDER BY role ASC, full_name ASC`,
        [storeId],
      );

      res.status(200).json({ data: rows.rows });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'AUTH_INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Không thể tải danh sách quản lý duyệt PIN',
        },
      });
    }
  },
);

/**
 * POST /api/v1/auth/verify-manager-pin
 */
authRouter.post(
  '/verify-manager-pin',
  authenticate,
  sanitizeCostFields(),
  requireManagerPin('MANUAL_PIN_VERIFICATION', 'user_profiles'),
  (req: Request, res: Response) => {
    res.status(200).json({
      data: {
        approved: true,
        approval: req.managerApproval,
      },
    });
  },
);
