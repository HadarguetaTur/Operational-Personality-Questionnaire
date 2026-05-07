import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { invitationAcceptPostSchema, invitationAcceptQuerySchema } from '@/lib/validation/schemas';

interface InvitationRow {
  id: string;
  email: string;
  full_name: string;
  status: string;
  expires_at: string;
}

async function loadInvitation(token: string): Promise<
  | { ok: true; invitation: InvitationRow }
  | { ok: false; reason: 'not_found' | 'revoked' | 'accepted' | 'expired' }
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_invitations')
    .select('id, email, full_name, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'not_found' };
  if (data.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (data.status === 'accepted') return { ok: false, reason: 'accepted' };

  if (new Date(data.expires_at).getTime() < Date.now()) {
    if (data.status === 'pending') {
      await supabase
        .from('admin_invitations')
        .update({ status: 'expired' })
        .eq('id', data.id);
    }
    return { ok: false, reason: 'expired' };
  }

  if (data.status !== 'pending') return { ok: false, reason: 'expired' };
  return { ok: true, invitation: data };
}

export async function GET(request: NextRequest) {
  const tokenRaw = request.nextUrl.searchParams.get('token');
  const qp = invitationAcceptQuerySchema.safeParse({
    token: tokenRaw ?? '',
  });
  if (!qp.success) {
    return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 400 });
  }
  const result = await loadInvitation(qp.data.token);
  if (!result.ok) {
    return NextResponse.json({ valid: false, reason: result.reason });
  }
  return NextResponse.json({
    valid: true,
    email: result.invitation.email,
    full_name: result.invitation.full_name,
    expires_at: result.invitation.expires_at,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = invitationAcceptPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { token, password, full_name: full_name_input } = parsed.data;

  const result = await loadInvitation(token);
  if (!result.ok) {
    const messages = {
      not_found: 'הזימון לא נמצא',
      revoked: 'הזימון בוטל',
      accepted: 'הזימון כבר נוצל',
      expired: 'הזימון פג תוקף',
    } as const;
    return NextResponse.json({ error: messages[result.reason] }, { status: 410 });
  }

  const supabase = createServiceRoleClient();
  const fullName = full_name_input?.trim() || result.invitation.full_name;

  const { error: createError } = await supabase.auth.admin.createUser({
    email: result.invitation.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'admin',
    },
  });

  if (createError) {
    return NextResponse.json(
      { error: `יצירת המשתמש נכשלה: ${createError.message}` },
      { status: 500 }
    );
  }

  await supabase
    .from('admin_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', result.invitation.id);

  return NextResponse.json({ success: true });
}
