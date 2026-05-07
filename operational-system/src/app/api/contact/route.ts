import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getRequestClientIp, isTurnstileEnabled, verifyTurnstileToken } from '@/lib/security/turnstile';
import { contactPostBodySchema } from '@/lib/validation/schemas';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getContactRecipient(): string | null {
  const explicit = process.env.CONTACT_FORM_TO_EMAIL?.trim();
  if (explicit) return explicit;
  const notification = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (notification) return notification;
  const firstAdmin = process.env.ADMIN_EMAILS?.split(',')
    .map((s) => s.trim())
    .find(Boolean);
  return firstAdmin ?? null;
}

function buildSubject(name: string): string {
  const base = 'פנייה מטופס צור קשר';
  const suffix = name.slice(0, 80).replace(/[\r\n]+/g, ' ');
  return `${base} — ${suffix}`;
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 'contact', 20, 60_000)) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסי שוב בעוד דקה.' }, { status: 429 });
  }
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const parsed = contactPostBodySchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? 'פרטים לא תקינים';
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { turnstileToken, name, email, phone, message } = parsed.data;

    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'נא לאמת שאינך רובוט' }, { status: 400 });
      }
      const ok = await verifyTurnstileToken(turnstileToken, getRequestClientIp(request));
      if (!ok) {
        return NextResponse.json(
          { error: 'אימות אבטחה נכשל. נסי שוב.' },
          { status: 400 },
        );
      }
    }
    const to = getContactRecipient();
    if (!to) {
      console.error('[contact] Missing CONTACT_FORM_TO_EMAIL, ADMIN_NOTIFICATION_EMAIL, or ADMIN_EMAILS');
      return NextResponse.json({ error: 'שירות צור קשר אינו זמין כרגע' }, { status: 503 });
    }

    const hasGmail =
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN;

    if (!hasGmail) {
      console.error('[contact] Gmail OAuth credentials not configured');
      return NextResponse.json({ error: 'שירות צור קשר אינו זמין כרגע' }, { status: 503 });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = phone ? escapeHtml(phone) : '';
    const safeMessage = escapeHtml(message)
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>');

    const htmlBody = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Heebo', Arial, sans-serif; direction: rtl; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
    <h1 style="color: #1e293b; font-size: 20px; margin: 0 0 16px;">פנייה חדשה מטופס צור קשר</h1>
    <p style="color: #334155; margin: 8px 0;"><strong>שם:</strong> ${safeName}</p>
    <p style="color: #334155; margin: 8px 0;"><strong>אימייל:</strong> ${safeEmail}</p>
    ${safePhone ? `<p style="color: #334155; margin: 8px 0;"><strong>טלפון:</strong> ${safePhone}</p>` : ''}
    <p style="color: #334155; margin: 16px 0 8px;"><strong>הודעה:</strong></p>
    <div style="color: #475569; line-height: 1.6;">${safeMessage}</div>
  </div>
</body>
</html>`;

    const { sendEmail } = await import('@/lib/google/gmail');
    await sendEmail({
      to,
      subject: buildSubject(name),
      htmlBody,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[contact] Send failed:', err);
    return NextResponse.json(
      { error: 'שליחה נכשלה. נסי שוב מאוחר יותר או פני ישירות במייל.' },
      { status: 500 }
    );
  }
}
