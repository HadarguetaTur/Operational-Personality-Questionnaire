// Ad-hoc migration runner. Connects directly to Supabase Postgres using the
// DB password from .env and applies the two idempotent migrations:
//   - supabase/add_ai_diagnosis.sql
//   - supabase/add_pdf_columns.sql
// Re-runnable safely (everything is IF NOT EXISTS / ON CONFLICT DO NOTHING).
//
// Usage:
//   node scripts/run-migrations.mjs
//
// Reads SUPABASE_DB_PASSWORD from .env. The host is derived from VITE_SUPABASE_URL.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function readEnv(envPath) {
  const text = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = readEnv(resolve(projectRoot, '.env'));
const supabaseUrl = env.VITE_SUPABASE_URL;
const dbPassword = env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl || !dbPassword) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env');
  process.exit(1);
}

// Extract project ref from URL (e.g. https://abcdef.supabase.co → abcdef)
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

const SQL_FILES = [
  'supabase/add_ai_diagnosis.sql',
  'supabase/add_pdf_columns.sql',
];

async function tryConnect(config, label) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`[ok] connected via ${label}`);
    return client;
  } catch (err) {
    console.warn(`[warn] ${label} failed: ${err.message}`);
    try { await client.end(); } catch { /* noop */ }
    return null;
  }
}

const directConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: dbPassword,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  // Keep the connect attempt short so we fail over to the pooler quickly
  connectionTimeoutMillis: 8000,
};

// Pooler addresses for the most common Supabase regions. We try direct first;
// if that fails (often does on IPv6-only direct hosts), we sweep these.
const POOLER_REGIONS = [
  'eu-central-1', 'eu-west-1', 'eu-west-2',
  'us-east-1', 'us-west-1', 'us-west-2',
  'ap-southeast-1', 'ap-northeast-1',
];

const poolerConfig = (region) => ({
  host: `aws-0-${region}.pooler.supabase.com`,
  port: 6543,
  user: `postgres.${projectRef}`,
  password: dbPassword,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 6000,
});

async function getClient() {
  const direct = await tryConnect(directConfig, 'direct connection (db.' + projectRef + '.supabase.co:5432)');
  if (direct) return direct;
  for (const region of POOLER_REGIONS) {
    const pooled = await tryConnect(poolerConfig(region), `pooler ${region}:6543`);
    if (pooled) return pooled;
  }
  throw new Error('Could not connect to Supabase Postgres on any tried host');
}

const client = await getClient();
try {
  for (const file of SQL_FILES) {
    const sqlPath = resolve(projectRoot, file);
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log(`\n=== running ${file} ===`);
    await client.query(sql);
    console.log(`[ok] ${file} applied`);
  }

  // Verify
  console.log('\n=== verifying schema ===');
  const colsCheck = await client.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name='leads'
       and column_name in ('ai_diagnosis','ai_diagnosis_meta','report_pdf_url','report_pdf_status','report_pdf_generated_at')
     order by column_name`,
  );
  console.log('leads columns added:', colsCheck.rows.map((r) => r.column_name).join(', '));

  const bucketCheck = await client.query(
    `select id, public from storage.buckets where id='reports'`,
  );
  console.log('reports bucket:', bucketCheck.rowCount > 0 ? `present (public=${bucketCheck.rows[0].public})` : 'NOT FOUND');

  console.log('\nDone.');
} finally {
  await client.end();
}
