#!/usr/bin/env node
// Usage:  node scripts/confirm-user.mjs <email>
// Example: node scripts/confirm-user.mjs hadart20@gmail.com
//
// Forces email_confirmed_at on a Supabase auth user without sending a confirmation email.
// Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from operational-system/.env.local.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

function loadEnv(path) {
  const out = {};
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.error(`❌ Cannot read ${path}`);
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/confirm-user.mjs <email>');
  process.exit(1);
}

const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL missing in .env.local');
  process.exit(1);
}
if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`🔍 Looking up user: ${email}`);

let user = null;
let page = 1;
const perPage = 1000;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error('❌ listUsers failed:', error.message);
    process.exit(1);
  }
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    user = found;
    break;
  }
  if (data.users.length < perPage) break;
  page += 1;
}

if (!user) {
  console.error(`❌ No user found with email: ${email}`);
  process.exit(1);
}

if (user.email_confirmed_at) {
  console.log(`ℹ️  User already confirmed at ${user.email_confirmed_at}. Nothing to do.`);
  process.exit(0);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  email_confirm: true,
});

if (updateError) {
  console.error('❌ updateUserById failed:', updateError.message);
  process.exit(1);
}

console.log(`✅ User confirmed: ${email}`);
console.log(`   You can now log in at /admin/login`);
