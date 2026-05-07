import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendPasswordResetEmail } from '@/lib/invitations/email';
import { adminUserIdBodySchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = adminUserIdBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { user_id } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: userResp, error: userError } = await supabase.auth.admin.getUserById(user_id);
  if (userError || !userResp.user) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
  }
  const targetUser = userResp.user;
  const targetEmail = targetUser.email;
  if (!targetEmail) {
    return NextResponse.json({ error: 'למשתמש אין אימייל' }, { status: 400 });
  }

  await supabase
    .from('password_resets')
    .update({ status: 'revoked' })
    .eq('user_id', user_id)
    .eq('status', 'pending');

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { error: insertError } = await supabase.from('password_resets').insert({
    user_id,
    email: targetEmail,
    token,
    status: 'pending',
    requested_by: auth.user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/admin/reset-password?token=${token}`;
  const fullName = typeof targetUser.user_metadata?.full_name === 'string'
    ? targetUser.user_metadata.full_name
    : targetEmail;

  try {
    await sendPasswordResetEmail({ to: targetEmail, fullName, resetUrl, expiresAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Email send failed';
    return NextResponse.json(
      { error: `שליחת המייל נכשלה: ${message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
