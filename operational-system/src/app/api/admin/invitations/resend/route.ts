import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendInvitationEmail } from '@/lib/invitations/email';

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
  const { data: invitation, error: fetchError } = await supabase
    .from('admin_invitations')
    .select('id, email, full_name, status')
    .eq('id', body.invitation_id)
    .maybeSingle();

  if (fetchError || !invitation) {
    return NextResponse.json({ error: 'הזימון לא נמצא' }, { status: 404 });
  }
  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'הזימון כבר נוצל' }, { status: 410 });
  }

  const ttlDays = parseInt(process.env.INVITE_TOKEN_TTL_DAYS || '7', 10);
  const newToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const { error: updateError } = await supabase
    .from('admin_invitations')
    .update({
      token: newToken,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', invitation.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/admin/accept-invite?token=${newToken}`;

  try {
    await sendInvitationEmail({
      to: invitation.email,
      fullName: invitation.full_name,
      inviteUrl,
      expiresAt,
      inviterName: typeof auth.user.user_metadata?.full_name === 'string'
        ? auth.user.user_metadata.full_name
        : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Email send failed';
    return NextResponse.json(
      { error: `שליחת המייל נכשלה: ${message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
