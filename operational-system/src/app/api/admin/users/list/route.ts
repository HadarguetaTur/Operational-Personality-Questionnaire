import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin, isAdminUser } from '@/lib/auth/requireAdmin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createServiceRoleClient();

  const allUsers = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  const adminUsers = allUsers
    .filter((u) => isAdminUser(u))
    .map((u) => ({
      id: u.id,
      email: u.email,
      full_name: typeof u.user_metadata?.full_name === 'string'
        ? u.user_metadata.full_name
        : null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      is_self: u.id === auth.user.id,
    }));

  return NextResponse.json({ users: adminUsers });
}
