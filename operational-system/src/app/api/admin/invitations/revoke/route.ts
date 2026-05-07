import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { adminInvitationIdBodySchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = adminInvitationIdBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { invitation_id } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitation_id)
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
