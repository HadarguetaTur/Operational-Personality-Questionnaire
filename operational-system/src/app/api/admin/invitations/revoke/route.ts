import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { invitation_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.invitation_id) {
    return NextResponse.json({ error: 'invitation_id is required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_invitations')
    .update({ status: 'revoked' })
    .eq('id', body.invitation_id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: 'הזימון לא נמצא או שאינו פעיל' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
