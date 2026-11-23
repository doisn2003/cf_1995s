import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { dbMode, env } from './config/env.js';
import { dbQueryOne } from './db/pgClient.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { b2bRouter } from './modules/b2b/b2b.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { kdsRouter } from './modules/kds/kds.routes.js';
import { posRouter } from './modules/pos/pos.routes.js';
import { shiftStocktakeRouter } from './modules/pos/shiftStocktake.routes.js';
import { vietqrRouter } from './modules/pos/vietqr.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';
import { transfersRouter } from './modules/transfers/transfers.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { warehouseRouter } from './modules/warehouse/warehouse.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: '@cf19/api',
      db_mode: dbMode,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/v1/supabase/live-status', async (_req: Request, res: Response) => {
    try {
      const row = await dbQueryOne<{
        tables_count: number;
        rpcs_count: number;
        stores_count: number;
        users_count: number;
        lots_count: number;
        pos_orders_count: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables_count,
          (SELECT COUNT(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND (p.proname LIKE 'rpc_m%' OR p.proname LIKE 'fn_m%')) AS rpcs_count,
          (SELECT COUNT(*)::int FROM public.stores) AS stores_count,
          (SELECT COUNT(*)::int FROM public.user_profiles) AS users_count,
          (SELECT COUNT(*)::int FROM public.warehouse_lots) AS lots_count,
          (SELECT COUNT(*)::int FROM public.pos_orders) AS pos_orders_count
      `);
      res.status(200).json({
        data: {
          connected: true,
          project_url: env.SUPABASE_URL ?? null,
          ...row,
        },
      });
    } catch (err) {
      res.status(500).json({
        error: {
          code: 'SUPABASE_CONNECTION_ERROR',
          message: err instanceof Error ? err.message : 'Không thể kết nối Supabase PostgreSQL',
        },
      });
    }
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/stores', storesRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/audit-logs', auditRouter);
  app.use('/api/v1/warehouse', warehouseRouter);
  app.use('/api/v1/b2b', b2bRouter);
  app.use('/api/v1/transfers', transfersRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/pos', posRouter);
  app.use('/api/v1/vietqr', vietqrRouter);
  app.use('/api/v1/kds', kdsRouter);
  app.use('/api/v1/shifts-stocktakes', shiftStocktakeRouter);
  app.use('/api/v1/analytics', analyticsRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Đường dẫn API không tồn tại',
      },
    });
  });

  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ): void => {
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            env.NODE_ENV === 'production'
              ? 'Đã xảy ra lỗi hệ thống'
              : err.message,
        },
      });
    },
  );

  return app;
}

export const app = createApp();

const isTestEnv =
  env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

if (!isTestEnv) {
  app.listen(env.PORT, () => {
    console.log(
      `[@cf19/api] running on http://localhost:${env.PORT} (100% Live PostgreSQL on Supabase)`,
    );
  });
}
