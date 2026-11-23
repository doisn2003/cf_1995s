import type pg from 'pg';
import type { AuditLogDto } from '@cf19/shared';
import { dbQuery, toIsoString } from '../db/pgClient.js';

export interface RecordAuditLogInput {
  actorId: string;
  storeId: string | null;
  action: string;
  targetTable: string;
  targetId?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
}

export interface ListAuditLogsFilter {
  storeId?: string;
  actorId?: string;
  action?: string;
  targetTable?: string;
  limit?: number;
  offset?: number;
}

interface AuditLogRow {
  id: string;
  actor_id: string;
  store_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  reason: string | null;
  payload_json: Record<string, unknown>;
  created_at: Date | string;
}

function mapRow(row: AuditLogRow): AuditLogDto {
  return {
    id: row.id,
    actor_id: row.actor_id,
    store_id: row.store_id,
    action: row.action,
    target_table: row.target_table,
    target_id: row.target_id,
    reason: row.reason,
    payload_json: row.payload_json ?? {},
    created_at: toIsoString(row.created_at),
  };
}

/**
 * Appends an immutable audit log record directly into Supabase PostgreSQL `public.audit_logs`.
 */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  client?: pg.PoolClient,
): Promise<AuditLogDto> {
  const res = await dbQuery<AuditLogRow>(
    `INSERT INTO public.audit_logs (
       actor_id, store_id, action, target_table, target_id, reason, payload_json
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, actor_id, store_id, action, target_table, target_id, reason, payload_json, created_at`,
    [
      input.actorId,
      input.storeId,
      input.action,
      input.targetTable,
      input.targetId ?? null,
      input.reason ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
    client,
  );

  return mapRow(res.rows[0]!);
}

/**
 * Queries immutable audit logs from PostgreSQL ordered newest-first.
 */
export async function listAuditLogs(
  filter: ListAuditLogsFilter = {},
): Promise<AuditLogDto[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.storeId) {
    params.push(filter.storeId);
    conditions.push(`store_id = $${params.length}`);
  }
  if (filter.actorId) {
    params.push(filter.actorId);
    conditions.push(`actor_id = $${params.length}`);
  }
  if (filter.action) {
    params.push(filter.action);
    conditions.push(`action = $${params.length}`);
  }
  if (filter.targetTable) {
    params.push(filter.targetTable);
    conditions.push(`target_table = $${params.length}`);
  }

  const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
  const offset = Math.max(0, filter.offset ?? 0);
  params.push(limit, offset);

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const res = await dbQuery<AuditLogRow>(
    `SELECT id, actor_id, store_id, action, target_table, target_id, reason, payload_json, created_at
     FROM public.audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return res.rows.map(mapRow);
}
