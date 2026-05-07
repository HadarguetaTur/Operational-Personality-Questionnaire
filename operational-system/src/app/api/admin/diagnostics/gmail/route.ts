import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendEmail } from '@/lib/google/gmail';

const toEmailSchema = z.string().email('כתובת אימייל לא תקינה').max(320);

function buildEnvStatus() {
  return {
    GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    GOOGLE_REFRESH_TOKEN: Boolean(process.env.GOOGLE_REFRESH_TOKEN),
    GMAIL_SENDER_ADDRESS: process.env.GMAIL_SENDER_ADDRESS ?? null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const toParam = request.nextUrl.searchParams.get('to');
  let to: string;
  if (toParam !== null && toParam !== '') {
    const parsed = toEmailSchema.safeParse(toParam);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, env: buildEnvStatus(), error: parsed.error.issues[0]?.message ?? 'פרמטר to לא תקין' },
        { status: 400 },
      );
    }
    to = parsed.data;
  } else {
    if (!auth.user.email) {
      return NextResponse.json(
        {
          ok: false,
          env: buildEnvStatus(),
          error: 'לא ניתן לקבוע נמען: אין אימייל למשתמש המחובר. השתמש ב-?to=your@email.com',
        },
        { status: 400 },
      );
    }
    to = auth.user.email;
  }

  const envStatus = buildEnvStatus();

  try {
    const result = await sendEmail({
      to,
      subject: '[בדיקת מערכת] חיבור Gmail API',
      htmlBody:
        '<p>זוהי הודעת בדיקה ממערכת התפעול.</p><p>אם קראת את זה — חיבור ה-Gmail API וה-credentials תקינים.</p>',
    });
    return NextResponse.json({
      ok: true,
      env: envStatus,
      messageId: result.messageId,
      threadId: result.threadId,
      to,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, env: envStatus, error: message }, { status: 500 });
  }
}
