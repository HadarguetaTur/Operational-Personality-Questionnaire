// Run one or more .sql files against the Supabase Postgres DB, each in its own
// transaction. No Supabase CLI / psql needed.
//
// Usage (PowerShell):
//   $env:SUPABASE_DB_URL = "postgresql://postgres.<ref>:<PASSWORD>@<pooler-host>:5432/postgres"
//   npx -y -p pg node scripts/run-sql.mjs supabase/migrations/029_leads_phone_normalized.sql
//
// Get the URL from Supabase Dashboard → Connect → "Session pooler" (port 5432).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const url = process.env.SUPABASE_DB_URL;
const files = process.argv.slice(2);
if (!url || files.length === 0) {
  console.error('Set SUPABASE_DB_URL and pass at least one .sql file.');
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const file of files) {
    const sql = readFileSync(file, 'utf8');
    process.stdout.write(`→ ${file} ... `);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('OK');
    } catch (err) {
      await client.query('ROLLBACK');
      console.log('FAILED (rolled back)');
      console.error(err.message);
      process.exit(1);
    }
  }
} finally {
  await client.end();
}
