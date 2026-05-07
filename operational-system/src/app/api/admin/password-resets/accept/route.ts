import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  passwordResetAcceptPostSchema,
  passwordResetAcceptQuerySchema,
} from '@/lib/validation/schemas';

interface ResetRow {
  id: string;
  user_id: string;
  email: string;
  status: string;
  expires_at: string;
}

async function loadReset(token: string): Promise<
  | { ok: true; reset: ResetRow }
  | { ok: false; reason: 'not_found' | 'used' | 'revoked' | 'expired' }
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('password_resets')
    .select('id, user_id, email, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'not_found' };
  if (data.status === 'used') return { ok: false, reason: 'used' };
  if (data.status === 'revoked') return { ok: false, reason: 'revoked' };

  if (new Date(data.expires_at).getTime() < Date.now()) {
    if (data.status === 'pending') {
      await supabase
        .from('password_resets')
        .update({ status: 'expired' })
        .eq('id', data.id);
    }
    return { ok: false, reason: 'expired' };
  }

  if (data.status !== 'pending') return { ok: false, reason: 'expired' };
  return { ok: true, reset: data };
}

export async function GET(request: NextRequest) {
  const tokenRaw = request.nextUrl.searchParams.get('token');
  const qp = passwordResetAcceptQuerySchema.safeParse({
    token: tokenRaw ?? '',
  });
  if (!qp.success) {
    return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 400 });
  }
  const result = await loadReset(qp.data.token);
  if (!result.ok) {
    return NextResponse.json({ valid: false, reason: result.reason });
  }
  return NextResponse.json({
    valid: true,
    email: result.reset.email,
    expires_at: result.reset.expires_at,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = passwordResetAcceptPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const result = await loadReset(token);
  if (!result.ok) {
    const messages = {
      not_found: 'הקישור לא נמצא',
      used: 'הקישור כבר נוצל',
      revoked: 'הקישור בוטל',
      expired: 'הקישור פג תוקף',
    } as const;
    return NextResponse.json({ error: messages[result.reason] }, { status: 410 });
  }

  const supabase = createServiceRoleClient();

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    result.reset.user_id,
    { password }
  );

  if (updateError) {
    return NextResponse.json(
      { error: `עדכון הסיסמה נכשל: ${updateError.message}` },
      { status: 500 }
    );
  }

  await supabase
    .from('password_resets')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', result.reset.id);

  return NextResponse.json({ success: true });
}
