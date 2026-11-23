import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

// Parse PostgreSQL BIGINT (OID 20) and NUMERIC (OID 1700) directly into JS numbers
types.setTypeParser(20, (val: string) => Number(val));
types.setTypeParser(1700, (val: string) => Number(val));
// Keep PostgreSQL DATE (OID 1082) as exact YYYY-MM-DD string without timezone shifts
types.setTypeParser(1082, (val: string) => val);

let poolInstance: pg.Pool | null = null;

export function getPgPool(): pg.Pool {
  if (!poolInstance) {
    if (!env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is required in .env to connect @cf19/api to Supabase PostgreSQL',
      );
    }
    poolInstance = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 12,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });
  }
  return poolInstance;
}

export async function closePgPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

export async function dbQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: pg.PoolClient,
): Promise<pg.QueryResult<T>> {
  if (client) {
    return client.query<T>(sql, params);
  }
  return getPgPool().query<T>(sql, params);
}

export async function dbQueryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: pg.PoolClient,
): Promise<T | null> {
  const res = await dbQuery<T>(sql, params, client);
  return res.rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

export function toNullableIsoString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toIsoString(value);
}
