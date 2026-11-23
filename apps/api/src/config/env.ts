import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root monorepo .env (C:\bib\cf_19\.env) first, then local .env if present
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

/**
 * Converts a Supabase Dashboard URL like:
 *   https://supabase.com/dashboard/project/ddnkbmgqxozccaublxaf
 * into the actual Supabase REST endpoint:
 *   https://ddnkbmgqxozccaublxaf.supabase.co
 */
function normalizeSupabaseApiUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) {
    return undefined;
  }
  const dashboardMatch = rawUrl.match(
    /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i,
  );
  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return rawUrl;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default('*'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(15).optional(),
  API_PUBLIC_KEY: z.string().min(15).optional(),
  API_SECRET_KEY: z.string().min(15).optional(),
  DATABASE_URL: z.string().min(15).optional(),
  ALLOW_DEV_AUTH: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsedEnv = EnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error(
    `Invalid API environment configuration: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`,
  );
}

const rawEnv = parsedEnv.data;
const resolvedSupabaseUrl = normalizeSupabaseApiUrl(rawEnv.SUPABASE_URL);
const resolvedServiceKey =
  rawEnv.SUPABASE_SERVICE_ROLE_KEY ?? rawEnv.API_SECRET_KEY;

export const env = {
  ...rawEnv,
  SUPABASE_URL: resolvedSupabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: resolvedServiceKey,
};

export const isSupabaseConfigured = Boolean(
  (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) || env.DATABASE_URL,
);

export const supabaseAdmin: SupabaseClient | null =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const dbMode: 'supabase' | 'in_memory' = isSupabaseConfigured
  ? 'supabase'
  : 'in_memory';
