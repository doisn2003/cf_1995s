import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@cf19/shared';
import { env, supabaseAdmin } from '../config/env.js';
import { dbQueryOne } from '../db/pgClient.js';
import { verifyAccessToken } from '../services/crypto.service.js';

export interface AuthActor {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedStoreId: string | null;
}

export interface ManagerApprovalContext {
  managerId: string;
  managerRole: UserRole;
  storeId: string;
  reason: string;
  auditLogId: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: AuthActor;
      managerApproval?: ManagerApprovalContext;
    }
  }
}

interface UserProfileRow {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  assigned_store_id: string | null;
  is_active: boolean;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveActiveActorFromDb(
  userId: string,
): Promise<AuthActor | null> {
  if (!UUID_REGEX.test(userId)) {
    return null;
  }
  const user = await dbQueryOne<UserProfileRow>(
    `SELECT id, organization_id, email, full_name, role, assigned_store_id, is_active
     FROM public.user_profiles
     WHERE id = $1 AND is_active = TRUE`,
    [userId],
  );
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    assignedStoreId: user.assigned_store_id,
  };
}

/**
 * Authenticates incoming requests directly against Supabase PostgreSQL `public.user_profiles`:
 * 1) Signed HS256 JWT issued by `POST /api/v1/auth/login`
 * 2) Supabase GoTrue JWT via `supabaseAdmin.auth.getUser(token)`
 * 3) Optional `Bearer dev:<uuid>` / `x-dev-user-id` when `ALLOW_DEV_AUTH=true`
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const devUserHeader = req.headers['x-dev-user-id'];

    let token: string | null = null;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    }

    // 1. Dev token fallback (only when ALLOW_DEV_AUTH=true)
    if (env.ALLOW_DEV_AUTH) {
      if (token && token.startsWith('dev:')) {
        const userId = token.slice('dev:'.length).trim();
        const actor = await resolveActiveActorFromDb(userId);
        if (actor) {
          req.actor = actor;
          next();
          return;
        }
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tài khoản không tồn tại hoặc đã bị khóa',
          },
        });
        return;
      }

      if (typeof devUserHeader === 'string' && devUserHeader.trim().length > 0) {
        const actor = await resolveActiveActorFromDb(devUserHeader.trim());
        if (actor) {
          req.actor = actor;
          next();
          return;
        }
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Header xác thực không hợp lệ',
          },
        });
        return;
      }
    }

    // 2. Signed API JWT from POST /api/v1/auth/login
    if (token) {
      const jwtPayload = verifyAccessToken(token);
      if (jwtPayload) {
        const actor = await resolveActiveActorFromDb(jwtPayload.sub);
        if (actor) {
          req.actor = actor;
          next();
          return;
        }
      }

      // 3. Supabase GoTrue JWT
      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data.user) {
          const actor = await resolveActiveActorFromDb(data.user.id);
          if (actor) {
            req.actor = actor;
            next();
            return;
          }
        }
      }
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để tiếp tục',
      },
    });
  } catch (err) {
    next(err);
  }
}
