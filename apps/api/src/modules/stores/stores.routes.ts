import { Router, type Request, type Response } from 'express';
import {
  CreateStoreDirectSchema,
  SEED_IDS,
  UpdateStoreSchema,
} from '@cf19/shared';
import {
  dbQuery,
  dbQueryOne,
  toIsoString,
  toNullableIsoString,
  withTransaction,
} from '../../db/pgClient.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireManagerPin,
  requireRoles,
  requireStoreScope,
  sanitizeCostFields,
} from '../../middlewares/rbac.middleware.js';
import { recordAuditLog } from '../../services/audit.service.js';

export const storesRouter = Router();

/**
 * GET /api/v1/stores
 */
storesRouter.get(
  '/',
  authenticate,
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const actor = req.actor!;
      const includeInactive = req.query.include_inactive === 'true';

      if (actor.role === 'SUPER_ADMIN' || actor.role === 'WAREHOUSE_MANAGER') {
        const result = await dbQuery(
          `SELECT id, organization_id, code, name, type, address, phone, price_multiplier, is_active, created_at, updated_at
           FROM public.stores
           ${includeInactive ? '' : 'WHERE is_active = TRUE'}
           ORDER BY CASE WHEN type = 'CENTRAL_WAREHOUSE' THEN 0 ELSE 1 END, code ASC`,
        );
        res.status(200).json({
          data: result.rows.map((r) => ({
            ...r,
            created_at: toIsoString(r.created_at),
            updated_at: toIsoString(r.updated_at),
          })),
        });
        return;
      }

      const result = await dbQuery(
        `SELECT id, organization_id, code, name, type, address, phone, price_multiplier, is_active, created_at, updated_at
         FROM public.stores
         WHERE id = $1`,
        [actor.assignedStoreId],
      );
      res.status(200).json({
        data: result.rows.map((r) => ({
          ...r,
          created_at: toIsoString(r.created_at),
          updated_at: toIsoString(r.updated_at),
        })),
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'STORES_QUERY_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải danh sách chi nhánh',
        },
      });
    }
  },
);

/**
 * POST /api/v1/stores (SUPER_ADMIN CRUD)
 */
storesRouter.post(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = CreateStoreDirectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORE_PAYLOAD',
          message: 'Dữ liệu tạo chi nhánh chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const created = await withTransaction(async (client) => {
        const dup = await dbQueryOne<{ id: string }>(
          `SELECT id FROM public.stores WHERE UPPER(code) = UPPER($1)`,
          [parsed.data.code],
          client,
        );
        if (dup) {
          throw Object.assign(new Error(`Mã chi nhánh ${parsed.data.code} đã tồn tại`), {
            statusCode: 409,
            code: 'DUPLICATE_STORE_CODE',
          });
        }

        const inserted = await dbQueryOne(
          `INSERT INTO public.stores (organization_id, code, name, type, address, phone, price_multiplier, is_active)
           VALUES ($1, UPPER($2), $3, $4, $5, $6, $7, TRUE)
           RETURNING id, organization_id, code, name, type, address, phone, price_multiplier, is_active, created_at, updated_at`,
          [
            SEED_IDS.organization.cf19,
            parsed.data.code,
            parsed.data.name,
            parsed.data.type,
            parsed.data.address,
            parsed.data.phone ?? null,
            parsed.data.price_multiplier,
          ],
          client,
        );

        await recordAuditLog(
          {
            actorId: req.actor!.id,
            storeId: inserted!.id as string,
            action: 'STORE_CREATED',
            targetTable: 'stores',
            targetId: inserted!.id as string,
            reason: `Tạo mới chi nhánh ${parsed.data.code}`,
            payload: parsed.data,
          },
          client,
        );

        return inserted!;
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
      const code = (err as { code?: string }).code ?? 'STORE_CREATE_ERROR';
      res.status(status).json({
        error: { code, message: err instanceof Error ? err.message : 'Lỗi tạo chi nhánh' },
      });
    }
  },
);

/**
 * PUT /api/v1/stores/:storeId (SUPER_ADMIN CRUD)
 */
storesRouter.put(
  '/:storeId',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    const parsed = UpdateStoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'INVALID_STORE_UPDATE_PAYLOAD',
          message: 'Dữ liệu cập nhật chi nhánh chưa hợp lệ',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }

    try {
      const updated = await withTransaction(async (client) => {
        const existing = await dbQueryOne<{ id: string; code: string; type: string }>(
          `SELECT id, code, type FROM public.stores WHERE id = $1 FOR UPDATE`,
          [req.params.storeId],
          client,
        );
        if (!existing) {
          throw Object.assign(new Error('Không tìm thấy chi nhánh'), {
            statusCode: 404,
            code: 'STORE_NOT_FOUND',
          });
        }
        if (existing.type === 'CENTRAL_WAREHOUSE' && parsed.data.is_active === false) {
          throw Object.assign(new Error('Không thể vô hiệu hóa Kho Tổng trung tâm'), {
            statusCode: 409,
            code: 'CANNOT_DEACTIVATE_WAREHOUSE',
          });
        }

        const row = await dbQueryOne(
          `UPDATE public.stores
           SET name = COALESCE($2, name),
               address = COALESCE($3, address),
               phone = CASE WHEN $4::boolean THEN $5 ELSE phone END,
               price_multiplier = COALESCE($6, price_multiplier),
               is_active = COALESCE($7, is_active)
           WHERE id = $1
           RETURNING id, organization_id, code, name, type, address, phone, price_multiplier, is_active, created_at, updated_at`,
          [
            req.params.storeId,
            parsed.data.name ?? null,
            parsed.data.address ?? null,
            parsed.data.phone !== undefined,
            parsed.data.phone ?? null,
            parsed.data.price_multiplier ?? null,
            parsed.data.is_active ?? null,
          ],
          client,
        );

        await recordAuditLog(
          {
            actorId: req.actor!.id,
            storeId: existing.id,
            action: 'STORE_UPDATED',
            targetTable: 'stores',
            targetId: existing.id,
            reason: `Cập nhật thông tin chi nhánh ${existing.code}`,
            payload: parsed.data,
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
      const code = (err as { code?: string }).code ?? 'STORE_UPDATE_ERROR';
      res.status(status).json({
        error: { code, message: err instanceof Error ? err.message : 'Lỗi cập nhật chi nhánh' },
      });
    }
  },
);

/**
 * GET /api/v1/stores/:storeId
 */
storesRouter.get(
  '/:storeId',
  authenticate,
  requireStoreScope({ allowWarehouseManager: true }),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const store = await dbQueryOne(
        `SELECT id, organization_id, code, name, type, address, phone, price_multiplier, is_active, created_at, updated_at
         FROM public.stores
         WHERE id = $1`,
        [req.params.storeId],
      );
      if (!store) {
        res.status(404).json({
          error: { code: 'STORE_NOT_FOUND', message: 'Không tìm thấy chi nhánh' },
        });
        return;
      }

      res.status(200).json({
        data: {
          ...store,
          created_at: toIsoString(store.created_at),
          updated_at: toIsoString(store.updated_at),
        },
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'STORE_QUERY_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải chi nhánh',
        },
      });
    }
  },
);

/**
 * GET /api/v1/stores/:storeId/inventory
 * Returns inventory catalog with live store stock quantity summary.
 * moving_avg_cost_vnd is automatically stripped for Store Roles by sanitizeCostFields().
 */
storesRouter.get(
  '/:storeId/inventory',
  authenticate,
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const store = await dbQueryOne<{ id: string; code: string }>(
        `SELECT id, code FROM public.stores WHERE id = $1`,
        [req.params.storeId],
      );
      if (!store) {
        res.status(404).json({
          error: { code: 'STORE_NOT_FOUND', message: 'Không tìm thấy chi nhánh' },
        });
        return;
      }

      const items = await dbQuery(
        `SELECT
           ii.id,
           ii.organization_id,
           ii.sku,
           ii.name,
           ii.category,
           ii.base_unit,
           ii.min_stock_threshold,
           ii.moving_avg_cost_vnd,
           ii.internal_transfer_price_vnd,
           ii.retail_price_vnd,
           ii.is_active,
           ii.created_at,
           ii.updated_at,
           COALESCE(SUM(CASE WHEN wl.status = 'AVAILABLE' AND wl.remaining_qty > 0 THEN wl.remaining_qty ELSE 0 END), 0)::numeric(12,2) AS store_available_qty
         FROM public.inventory_items ii
         LEFT JOIN public.warehouse_lots wl
           ON wl.item_id = ii.id AND wl.store_id = $1
         WHERE ii.is_active = TRUE
         GROUP BY ii.id
         ORDER BY ii.category ASC, ii.sku ASC`,
        [req.params.storeId],
      );

      res.status(200).json({
        data: items.rows.map((r) => ({
          ...r,
          created_at: toIsoString(r.created_at),
          updated_at: toIsoString(r.updated_at),
        })),
        meta: { store_id: store.id, store_code: store.code },
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'STORE_INVENTORY_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải danh mục tồn kho chi nhánh',
        },
      });
    }
  },
);

/**
 * GET /api/v1/stores/:storeId/lots
 */
storesRouter.get(
  '/:storeId/lots',
  authenticate,
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const result = await dbQuery(
        `SELECT
           wl.id, wl.store_id, wl.item_id, ii.sku, ii.name AS item_name, ii.base_unit,
           wl.lot_code, wl.supplier_name, wl.moisture_pct, wl.roast_date, wl.received_at,
           wl.expiry_date, wl.initial_qty, wl.remaining_qty, wl.unit_cost_vnd,
           wl.shipping_cost_vnd, wl.status, wl.created_at, wl.updated_at
         FROM public.warehouse_lots wl
         JOIN public.inventory_items ii ON ii.id = wl.item_id
         WHERE wl.store_id = $1
         ORDER BY COALESCE(wl.roast_date, (wl.received_at AT TIME ZONE 'UTC')::date) ASC,
                  wl.received_at ASC, wl.lot_code ASC, wl.id ASC`,
        [req.params.storeId],
      );

      res.status(200).json({
        data: result.rows.map((r) => ({
          ...r,
          received_at: toIsoString(r.received_at),
          created_at: toIsoString(r.created_at),
          updated_at: toIsoString(r.updated_at),
        })),
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'STORE_LOTS_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải danh sách lô hàng',
        },
      });
    }
  },
);

/**
 * GET /api/v1/stores/:storeId/shifts/current
 */
storesRouter.get(
  '/:storeId/shifts/current',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const shift = await dbQueryOne(
        `SELECT id, store_id, cashier_id, opened_at, closed_at, opening_cash_vnd,
                blind_counted_cash_vnd, system_expected_cash_vnd, variance_cash_vnd, status, notes
         FROM public.pos_shifts
         WHERE store_id = $1 AND status = 'OPEN'
         ORDER BY opened_at DESC
         LIMIT 1`,
        [req.params.storeId],
      );

      if (!shift) {
        res.status(404).json({
          error: {
            code: 'NO_OPEN_SHIFT',
            message: 'Chi nhánh hiện chưa mở ca làm việc',
          },
        });
        return;
      }

      res.status(200).json({
        data: {
          ...shift,
          opened_at: toIsoString(shift.opened_at),
          closed_at: toNullableIsoString(shift.closed_at),
        },
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'SHIFT_QUERY_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải ca làm việc hiện tại',
        },
      });
    }
  },
);

/**
 * GET /api/v1/stores/:storeId/kds/tickets
 * Strictly returns ONLY PAID, non-voided orders so Barista never makes unpaid QR orders.
 */
storesRouter.get(
  '/:storeId/kds/tickets',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF', 'BARISTA_KDS'),
  requireStoreScope(),
  sanitizeCostFields(),
  async (req: Request, res: Response) => {
    try {
      const ordersRes = await dbQuery(
        `SELECT id, order_code, store_id, shift_id, kds_status, payment_status,
                payment_method, total_amount_vnd, cogs_amount_vnd, created_at, updated_at
         FROM public.pos_orders
         WHERE store_id = $1
           AND payment_status = 'PAID'
           AND kds_status <> 'COMPLETED'
         ORDER BY created_at ASC`,
        [req.params.storeId],
      );

      const orderIds = ordersRes.rows.map((o) => o.id as string);
      const itemsRes =
        orderIds.length > 0
          ? await dbQuery(
              `SELECT poi.id, poi.order_id, poi.product_id, mp.name AS product_name,
                      poi.variant_id, mv.size_code, poi.modifiers_json,
                      poi.quantity, poi.unit_price_vnd, poi.line_total_vnd, poi.notes
               FROM public.pos_order_items poi
               JOIN public.menu_products mp ON mp.id = poi.product_id
               JOIN public.menu_variants mv ON mv.id = poi.variant_id
               WHERE poi.order_id = ANY($1::uuid[])
               ORDER BY poi.created_at ASC`,
              [orderIds],
            )
          : { rows: [] };

      const tickets = ordersRes.rows.map((order) => ({
        ...order,
        created_at: toIsoString(order.created_at),
        updated_at: toIsoString(order.updated_at),
        items: itemsRes.rows.filter((it) => it.order_id === order.id),
      }));

      res.status(200).json({ data: tickets });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'KDS_TICKETS_ERROR',
          message: err instanceof Error ? err.message : 'Lỗi tải danh sách thẻ món KDS',
        },
      });
    }
  },
);

/**
 * POST /api/v1/stores/:storeId/orders/:orderId/void
 * Requires cryptographic 6-digit Manager PIN + writes atomic DB update & audit trail.
 */
storesRouter.post(
  '/:storeId/orders/:orderId/void',
  authenticate,
  requireRoles('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF'),
  requireStoreScope(),
  sanitizeCostFields(),
  requireManagerPin('VOID_POS_ORDER', 'pos_orders'),
  async (req: Request, res: Response) => {
    try {
      const approval = req.managerApproval!;
      const updatedOrder = await withTransaction(async (client) => {
        const order = await dbQueryOne<{
          id: string;
          order_code: string;
          store_id: string;
          payment_status: string;
        }>(
          `SELECT id, order_code, store_id, payment_status
           FROM public.pos_orders
           WHERE id = $1 AND store_id = $2
           FOR UPDATE`,
          [req.params.orderId, req.params.storeId],
          client,
        );

        if (!order) {
          throw Object.assign(new Error('Không tìm thấy hóa đơn POS tại chi nhánh này'), {
            statusCode: 404,
            code: 'ORDER_NOT_FOUND',
          });
        }
        if (order.payment_status === 'VOIDED') {
          throw Object.assign(new Error(`Hóa đơn ${order.order_code} đã bị hủy trước đó`), {
            statusCode: 409,
            code: 'ORDER_ALREADY_VOIDED',
          });
        }

        const updated = await dbQueryOne(
          `UPDATE public.pos_orders
           SET payment_status = 'VOIDED',
               void_approved_by_manager_id = $2,
               void_reason = $3
           WHERE id = $1
           RETURNING *`,
          [order.id, approval.managerId, approval.reason],
          client,
        );

        await recordAuditLog(
          {
            actorId: req.actor!.id,
            storeId: order.store_id,
            action: 'POS_ORDER_VOIDED',
            targetTable: 'pos_orders',
            targetId: order.id,
            reason: approval.reason,
            payload: {
              order_code: order.order_code,
              approved_by_manager_id: approval.managerId,
              approval_audit_id: approval.auditLogId,
            },
          },
          client,
        );

        return updated!;
      });

      res.status(200).json({
        data: {
          ...updatedOrder,
          created_at: toIsoString(updatedOrder.created_at),
          updated_at: toIsoString(updatedOrder.updated_at),
        },
        meta: { approval_audit_id: approval.auditLogId },
      });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      const code = (err as { code?: string }).code ?? 'VOID_ORDER_ERROR';
      res.status(status).json({
        error: { code, message: err instanceof Error ? err.message : 'Lỗi hủy hóa đơn POS' },
      });
    }
  },
);
