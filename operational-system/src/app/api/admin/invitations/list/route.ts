import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_invitations')
    .select('id, email, full_name, status, expires_at, created_at, accepted_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const invitations = (data || []).map((inv) => ({
    ...inv,
    is_expired:
      inv.status === 'pending' && new Date(inv.expires_at).getTime() < now,
  }));

  return NextResponse.json({ invitations });
}
