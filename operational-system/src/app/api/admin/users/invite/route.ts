import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendInvitationEmail } from '@/lib/invitations/email';
import { adminInviteSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = adminInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { email, full_name: fullName } = parsed.data;

  const supabase = createServiceRoleClient();

  const existingUser = await findUserByEmail(supabase, email);
  if (existingUser) {
    return NextResponse.json(
      { error: 'משתמש עם אימייל זה כבר רשום במערכת' },
      { status: 409 }
    );
  }

  const { data: existingPending } = await supabase
    .from('admin_invitations')
    .select('id')
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle();

  if (existingPending) {
    return NextResponse.json(
      { error: 'קיים זימון פעיל לאימייל זה. ניתן לשלוח שוב או לבטל אותו.' },
      { status: 409 }
    );
  }

  const ttlDays = parseInt(process.env.INVITE_TOKEN_TTL_DAYS || '7', 10);
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const { data: invitation, error: insertError } = await supabase
    .from('admin_invitations')
    .insert({
      email,
      full_name: fullName,
      token,
      status: 'pending',
      invited_by: auth.user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !invitation) {
    return NextResponse.json(
      { error: insertError?.message || 'Failed to create invitation' },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/admin/accept-invite?token=${token}`;

  try {
    await sendInvitationEmail({
      to: email,
      fullName,
      inviteUrl,
      expiresAt,
      inviterName: typeof auth.user.user_metadata?.full_name === 'string'
        ? auth.user.user_metadata.full_name
        : undefined,
    });
  } catch (e) {
    await supabase.from('admin_invitations').delete().eq('id', invitation.id);
    const message = e instanceof Error ? e.message : 'Email send failed';
    return NextResponse.json(
      { error: `שליחת המייל נכשלה: ${message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, invitation_id: invitation.id });
}

async function findUserByEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string
) {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}
