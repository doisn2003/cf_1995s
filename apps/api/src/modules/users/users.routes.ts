import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import {
  CreateUserSchema,
  ResetUserPinSchema,
  SEED_IDS,
  UpdateUserSchema,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireRoles,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';
import { hashManagerPin } from '../../services/crypto.service.js';

export const usersRouter = Router();

usersRouter.use(authenticate, requireRoles('SUPER_ADMIN'), sanitizeCostFields());

/**
 * GET /api/v1/users
 */
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const resDb = await dbQuery(
      `SELECT
         up.id,
         up.organization_id,
         up.full_name,
         up.email,
         up.phone,
         up.role,
         up.assigned_store_id,
         s.code AS store_code,
         s.name AS store_name,
         (up.manager_pin_hash IS NOT NULL) AS has_manager_pin,
         up.hourly_rate_vnd,
         up.employment_type,
         up.is_active,
         up.created_at,
         up.updated_at
       FROM public.user_profiles up
       LEFT JOIN public.stores s ON s.id = up.assigned_store_id
       ORDER BY up.is_active DESC, up.role ASC, up.full_name ASC`,
    );

    res.status(200).json({
      data: resDb.rows.map((r) => ({
        ...r,
        created_at: toIsoString(r.created_at),
        updated_at: toIsoString(r.updated_at),
      })),
    });
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'USERS_LIST_ERROR',
        message: err instanceof Error ? err.message : 'Lỗi tải danh sách nhân sự',
      },
    });
  }
});

/**
 * POST /api/v1/users
 * Atomically inserts into auth.users (bcrypt via pgcrypto crypt) and public.user_profiles.
 */
usersRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_USER_PAYLOAD',
        message: 'Thông tin tạo nhân sự chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const data = parsed.data;
    const created = await withTransaction(async (client) => {
      const dup = await dbQueryOne<{ id: string }>(
        `SELECT id FROM public.user_profiles WHERE LOWER(email) = LOWER($1)`,
        [data.email],
        client,
      );
      if (dup) {
        throw Object.assign(new Error(`Email ${data.email} đã được sử dụng`), {
          statusCode: 409,
          code: 'DUPLICATE_EMAIL',
        });
      }

      if (data.assigned_store_id) {
        const store = await dbQueryOne<{ id: string; type: string }>(
          `SELECT id, type FROM public.stores WHERE id = $1 AND is_active = TRUE`,
          [data.assigned_store_id],
          client,
        );
        if (!store) {
          throw Object.assign(new Error('Chi nhánh phân công không tồn tại hoặc đã khóa'), {
            statusCode: 404,
            code: 'STORE_NOT_FOUND',
          });
        }
        if (data.role === 'WAREHOUSE_MANAGER' && store.type !== 'CENTRAL_WAREHOUSE') {
          throw Object.assign(new Error('WAREHOUSE_MANAGER phải được gắn vào Kho Tổng'), {
            statusCode: 400,
            code: 'INVALID_ROLE_STORE_MATCH',
          });
        }
        if (
          ['STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'].includes(data.role) &&
          store.type === 'CENTRAL_WAREHOUSE'
        ) {
          throw Object.assign(new Error(`Vai trò ${data.role} phải được gắn vào Quán bán lẻ/nhượng quyền`), {
            statusCode: 400,
            code: 'INVALID_ROLE_STORE_MATCH',
          });
        }
      }

      const newUserId = randomUUID();
      const pinHash = data.manager_pin ? hashManagerPin(data.manager_pin) : null;

      await client.query(
        `INSERT INTO auth.users (
           id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at
         )
         VALUES (
           $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           LOWER($2), crypt($3, gen_salt('bf')), NOW(),
           '{"provider":"email","providers":["email"]}'::jsonb,
           jsonb_build_object('role', $4::text),
           NOW(), NOW()
         )`,
        [newUserId, data.email, data.password, data.role],
      );

      const profile = await dbQueryOne(
        `INSERT INTO public.user_profiles (
           id, organization_id, full_name, email, phone, role, assigned_store_id,
           manager_pin_hash, hourly_rate_vnd, employment_type, is_active
         )
         VALUES ($1, $2, $3, LOWER($4), $5, $6, $7, $8, $9, $10, TRUE)
         RETURNING id, organization_id, full_name, email, phone, role, assigned_store_id,
                   (manager_pin_hash IS NOT NULL) AS has_manager_pin,
                   hourly_rate_vnd, employment_type, is_active, created_at, updated_at`,
        [
          newUserId,
          SEED_IDS.organization.cf19,
          data.full_name,
          data.email,
          data.phone ?? null,
          data.role,
          data.role === 'SUPER_ADMIN' ? null : (data.assigned_store_id ?? null),
          pinHash,
          data.hourly_rate_vnd,
          data.employment_type,
        ],
        client,
      );

      await recordAuditLog(
        {
          actorId: req.actor!.id,
          storeId: data.assigned_store_id ?? null,
          action: 'USER_CREATED',
          targetTable: 'user_profiles',
          targetId: newUserId,
          reason: `Tạo mới tài khoản nhân sự ${data.email} (${data.role})`,
          payload: {
            email: data.email,
            role: data.role,
            assigned_store_id: data.assigned_store_id ?? null,
          },
        },
        client,
      );

      return profile!;
    });

    res.status(201).json({
      data: {
        ...created,
        created_at: toIsoString(created.created_at),
        updated_at: toIsoString(created.updated_at),
      },
    });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const code = (err as { code?: string }).code ?? 'USER_CREATE_ERROR';
    res.status(status).json({
      error: { code, message: err instanceof Error ? err.message : 'Lỗi tạo nhân sự' },
    });
  }
});

/**
 * PUT /api/v1/users/:userId
 */
usersRouter.put('/:userId', async (req: Request, res: Response) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_USER_UPDATE_PAYLOAD',
        message: 'Dữ liệu cập nhật nhân sự chưa hợp lệ',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const data = parsed.data;
    const updated = await withTransaction(async (client) => {
      const existing = await dbQueryOne<{
        id: string;
        email: string;
        role: string;
        assigned_store_id: string | null;
      }>(
        `SELECT id, email, role, assigned_store_id FROM public.user_profiles WHERE id = $1 FOR UPDATE`,
        [req.params.userId],
        client,
      );
      if (!existing) {
        throw Object.assign(new Error('Không tìm thấy tài khoản nhân sự'), {
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        });
      }
      if (existing.id === req.actor!.id && data.is_active === false) {
        throw Object.assign(new Error('Không thể tự khóa tài khoản Chủ chuỗi đang đăng nhập'), {
          statusCode: 409,
          code: 'CANNOT_DEACTIVATE_SELF',
        });
      }

      const nextRole = data.role ?? existing.role;
      const nextStoreId =
        nextRole === 'SUPER_ADMIN'
          ? null
          : data.assigned_store_id !== undefined
            ? data.assigned_store_id
            : existing.assigned_store_id;

      const row = await dbQueryOne(
        `UPDATE public.user_profiles
         SET full_name = COALESCE($2, full_name),
             phone = CASE WHEN $3::boolean THEN $4 ELSE phone END,
             role = $5,
             assigned_store_id = $6,
             hourly_rate_vnd = COALESCE($7, hourly_rate_vnd),
             employment_type = COALESCE($8, employment_type),
             is_active = COALESCE($9, is_active)
         WHERE id = $1
         RETURNING id, organization_id, full_name, email, phone, role, assigned_store_id,
                   (manager_pin_hash IS NOT NULL) AS has_manager_pin,
                   hourly_rate_vnd, employment_type, is_active, created_at, updated_at`,
        [
          existing.id,
          data.full_name ?? null,
          data.phone !== undefined,
          data.phone ?? null,
          nextRole,
          nextStoreId,
          data.hourly_rate_vnd ?? null,
          data.employment_type ?? null,
          data.is_active ?? null,
        ],
        client,
      );

      await recordAuditLog(
        {
          actorId: req.actor!.id,
          storeId: nextStoreId,
          action: 'USER_UPDATED',
          targetTable: 'user_profiles',
          targetId: existing.id,
          reason: `Cập nhật hồ sơ nhân sự ${existing.email}`,
          payload: data,
        },
        client,
      );

      return row!;
    });

    res.status(200).json({
      data: {
        ...updated,
        created_at: toIsoString(updated.created_at),
        updated_at: toIsoString(updated.updated_at),
      },
    });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const code = (err as { code?: string }).code ?? 'USER_UPDATE_ERROR';
    res.status(status).json({
      error: { code, message: err instanceof Error ? err.message : 'Lỗi cập nhật nhân sự' },
    });
  }
});

/**
 * POST /api/v1/users/:userId/reset-pin
 */
usersRouter.post('/:userId/reset-pin', async (req: Request, res: Response) => {
  const parsed = ResetUserPinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_PIN_FORMAT',
        message: 'Mã PIN Quản lý phải gồm đúng 6 chữ số',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    await withTransaction(async (client) => {
      const target = await dbQueryOne<{ id: string; email: string; role: string; assigned_store_id: string | null }>(
        `SELECT id, email, role, assigned_store_id FROM public.user_profiles WHERE id = $1 FOR UPDATE`,
        [req.params.userId],
        client,
      );
      if (!target) {
        throw Object.assign(new Error('Không tìm thấy nhân sự'), {
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        });
      }
      if (target.role !== 'SUPER_ADMIN' && target.role !== 'STORE_MANAGER') {
        throw Object.assign(new Error('Chỉ SUPER_ADMIN và STORE_MANAGER mới được cấp mã PIN phê duyệt'), {
          statusCode: 400,
          code: 'PIN_NOT_ALLOWED_FOR_ROLE',
        });
      }

      const hashed = hashManagerPin(parsed.data.pin);
      await client.query(
        `UPDATE public.user_profiles SET manager_pin_hash = $2 WHERE id = $1`,
        [target.id, hashed],
      );

      await recordAuditLog(
        {
          actorId: req.actor!.id,
          storeId: target.assigned_store_id,
          action: 'MANAGER_PIN_RESET',
          targetTable: 'user_profiles',
          targetId: target.id,
          reason: `Cấp mới mã PIN 6 số cho ${target.email}`,
        },
        client,
      );
    });

    res.status(200).json({ data: { updated: true } });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const code = (err as { code?: string }).code ?? 'USER_PIN_RESET_ERROR';
    res.status(status).json({
      error: { code, message: err instanceof Error ? err.message : 'Lỗi cập nhật mã PIN' },
    });
  }
});
