import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in C:\\bib\\cf_19\\.env');
  }

  console.log('==================================================================');
  console.log('CF19 SUPABASE POSTGRESQL DEPLOYMENT & SEEDING ENGINE');
  console.log('Target Pooler:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('==================================================================');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('[1/4] Connected to Supabase PostgreSQL successfully.');

  // Clean public schema cleanly before applying 0001..0008 so repeat runs are 100% deterministic
  console.log('[2/4] Resetting public schema objects for clean deterministic migration...');
  await client.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO anon;
    GRANT ALL ON SCHEMA public TO authenticated;
    GRANT ALL ON SCHEMA public TO service_role;
    GRANT USAGE ON SCHEMA public TO PUBLIC;
  `);

  const migrationsDir = path.join(ROOT_DIR, 'supabase', 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  console.log(`[3/4] Applying ${files.length} SQL migrations (M1 -> M7)...`);
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    const started = Date.now();
    await client.query(sql);
    console.log(`  ✓ Applied ${file} (${Date.now() - started}ms)`);
  }

  // Re-grant permissions on all public tables, views, sequences, functions to Supabase roles
  await client.query(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
  `);

  const seedPath = path.join(ROOT_DIR, 'supabase', 'seed.sql');
  const seedSql = await fs.readFile(seedPath, 'utf8');
  const seedStarted = Date.now();
  await client.query(seedSql);
  console.log(`  ✓ Applied supabase/seed.sql (${Date.now() - seedStarted}ms)`);

  // [4/4] Verification & Audit Summary
  console.log('[4/4] Auditing live Supabase schema & seed data...');

  const tablesRes = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);
  const viewsRes = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.views
    WHERE table_schema = 'public';
  `);
  const enumsRes = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e';
  `);
  const policiesRes = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM pg_policies
    WHERE schemaname = 'public';
  `);
  const rpcsRes = await client.query<{ proname: string }>(`
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND (p.proname LIKE 'rpc_m%' OR p.proname LIKE 'fn_m%')
    ORDER BY p.proname;
  `);

  const countsRes = await client.query<{ table_name: string; row_count: number }>(`
    SELECT 'organizations' AS table_name, COUNT(*)::int AS row_count FROM public.organizations
    UNION ALL SELECT 'stores', COUNT(*)::int FROM public.stores
    UNION ALL SELECT 'user_profiles', COUNT(*)::int FROM public.user_profiles
    UNION ALL SELECT 'inventory_items', COUNT(*)::int FROM public.inventory_items
    UNION ALL SELECT 'warehouse_lots', COUNT(*)::int FROM public.warehouse_lots
    UNION ALL SELECT 'roast_batches', COUNT(*)::int FROM public.roast_batches
    UNION ALL SELECT 'menu_categories', COUNT(*)::int FROM public.menu_categories
    UNION ALL SELECT 'menu_products', COUNT(*)::int FROM public.menu_products
    UNION ALL SELECT 'menu_variants', COUNT(*)::int FROM public.menu_variants
    UNION ALL SELECT 'menu_modifiers', COUNT(*)::int FROM public.menu_modifiers
    UNION ALL SELECT 'bom_recipes', COUNT(*)::int FROM public.bom_recipes
    UNION ALL SELECT 'bom_recipe_items', COUNT(*)::int FROM public.bom_recipe_items
    UNION ALL SELECT 'b2b_customers', COUNT(*)::int FROM public.b2b_customers
    UNION ALL SELECT 'b2b_price_tiers', COUNT(*)::int FROM public.b2b_price_tiers
    UNION ALL SELECT 'b2b_orders', COUNT(*)::int FROM public.b2b_orders
    UNION ALL SELECT 'b2b_debt_ledger', COUNT(*)::int FROM public.b2b_debt_ledger
    UNION ALL SELECT 'internal_transfers', COUNT(*)::int FROM public.internal_transfers
    UNION ALL SELECT 'pos_shifts', COUNT(*)::int FROM public.pos_shifts
    UNION ALL SELECT 'pos_orders', COUNT(*)::int FROM public.pos_orders
    UNION ALL SELECT 'pos_order_items', COUNT(*)::int FROM public.pos_order_items;
  `);

  console.log('\n--- SUPABASE LIVE SCHEMA SUMMARY ---');
  console.log(`  • Base 3NF Tables      : ${tablesRes.rows[0]?.count}`);
  console.log(`  • Custom ENUM Types    : ${enumsRes.rows[0]?.count}`);
  console.log(`  • Security Views       : ${viewsRes.rows[0]?.count}`);
  console.log(`  • RLS Policies         : ${policiesRes.rows[0]?.count}`);
  console.log(`  • PL/pgSQL RPCs & Fns  : ${rpcsRes.rows.length} (${rpcsRes.rows.map((r) => r.proname).join(', ')})`);

  console.log('\n--- SUPABASE SEED DATA ROW COUNTS ---');
  for (const row of countsRes.rows) {
    console.log(`  • ${row.table_name.padEnd(22, ' ')}: ${row.row_count} rows`);
  }

  await client.end();
  console.log('\n==================================================================');
  console.log('✅ SUPABASE DATABASE MIGRATION & SEED COMPLETED 100% SUCCESSFULLY');
  console.log('==================================================================');
}

main().catch((err) => {
  console.error('❌ Supabase Database Deployment Failed:', err);
  process.exit(1);
});
