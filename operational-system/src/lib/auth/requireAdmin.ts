import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AdminAuthSuccess {
  ok: true;
  user: User;
}

export interface AdminAuthFailure {
  ok: false;
  response: NextResponse;
}

/**
 * Verifies the request is coming from an authenticated admin.
 * Admin = email in ADMIN_EMAILS env var OR user_metadata.role === 'admin'.
 *
 * Use at the top of every /api/admin/* route:
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 *   const adminUser = auth.user;
 */
export async function requireAdmin(): Promise<AdminAuthSuccess | AdminAuthFailure> {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!isAdminUser(user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, user };
}

export function isAdminUser(user: User): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = user.email?.toLowerCase() || '';
  if (adminEmails.includes(email)) return true;

  const role = user.user_metadata?.role;
  if (role === 'admin') return true;

  return false;
}
