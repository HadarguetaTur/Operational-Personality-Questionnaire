import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quizCompletionEmailSchema } from '@/lib/validation/schemas';
import { buildReportLink } from '@/lib/quiz/buildReportLink';
import { checkFixedKeyRateLimit, checkRateLimit } from '@/lib/rateLimit';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';

/**
 * Fired by the quiz lead form right after the lead row is created.
 *
 * Replaces the dead Make.com webhook (the DB trigger on `leads` now gets
 * HTTP 410). Does two things, both best-effort:
 *   1. Records `lead_details_submitted` so the admin funnel shows the step.
 *   2. Emails Hadar a short alert with the lead's name, WhatsApp link, result
 *      pattern and the admin link, via the same Gmail sender the app already
 *      uses. Recipients: ADMIN_NOTIFICATION_EMAIL, else the first ADMIN_EMAILS.
 *
 * Idempotent per lead: a second call for the same token is a no-op.
 */

const TEN_MIN_MS = 10 * 60 * 1000;
const ALERT_KIND = 'new_lead_alert';

const PATTERN_LABELS: Record<string, string> = {
  FOLLOWUP: 'פניות ופולואפ',
  TIME: 'זמן ותפעול ידני',
  COLLECTION: 'גבייה',
  CENTRALIZED: 'תלות יתר בך',
};

function adminRecipients(): string[] {
  const direct = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (direct) return [direct];
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1);
}

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('972') ? digits : digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export async function POST(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: 'שירות לא מוגדר' }, { status: 503 });
  }
  if (!checkRateLimit(request, 'notify_new_lead_ip', 30, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const parsed = quizCompletionEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'פרטים לא תקינים' }, { status: 400 });
  }
  const reportToken = parsed.data.reportToken;
  if (!checkFixedKeyRateLimit('notify_new_lead_token', reportToken, 3, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות' }, { status: 429 });
  }

  const supabase = createServiceRoleClient();
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, name, phone, email, result_pattern, created_at')
    .eq('report_token', reportToken)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: 'לא נמצאה לידה' }, { status: 404 });
  }

  // Only fire for leads created in the last hour: this route exists for the
  // moment right after the quiz, not as a re-usable alert trigger.
  const createdAt = lead.created_at ? Date.parse(lead.created_at) : NaN;
  if (Number.isNaN(createdAt) || Date.now() - createdAt > 60 * 60 * 1000) {
    return NextResponse.json({ success: true, alreadySent: true });
  }

  // Idempotency: one delivered alert per lead (a failed attempt may be retried).
  const { data: priorAttempts } = await supabase
    .from('email_logs')
    .select('id, status')
    .eq('lead_id', lead.id)
    .contains('metadata', { kind: ALERT_KIND })
    .limit(5);
  if (priorAttempts?.some((row) => row.status === 'sent')) {
    return NextResponse.json({ success: true, alreadySent: true });
  }

  // The funnel step is recorded once, on the first attempt only.
  if (!priorAttempts || priorAttempts.length === 0) {
    await recordFunnelEvent(lead.id, 'lead_details_submitted', { source: 'quiz' });
  }

  const recipients = adminRecipients();
  const hasGoogleCreds =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;

  if (recipients.length === 0 || !hasGoogleCreds) {
    console.warn('[notify-new-lead] no recipient or Gmail not configured', {
      leadId: lead.id,
      recipients: recipients.length,
      gmail: Boolean(hasGoogleCreds),
    });
    return NextResponse.json({ success: true, sent: false, reason: 'not_configured' });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const name = (lead.name ?? '').trim() || 'ללא שם';
  const phone = (lead.phone ?? '').trim();
  const patternLabel = PATTERN_LABELS[lead.result_pattern ?? ''] ?? lead.result_pattern ?? '';
  const reportUrl = buildReportLink(reportToken);
  const adminUrl = appUrl ? `${appUrl}/admin/leads/${lead.id}` : '';

  const subject = `לידה חדשה מהבדיקה: ${name} · ${patternLabel}`;
  const htmlBody = `
<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0D1B2A">
  <p><strong>${escapeHtml(name)}</strong> סיימה עכשיו את הבדיקה.</p>
  <ul>
    <li>וואטסאפ: ${phone ? `<a href="${waLink(phone)}">${escapeHtml(phone)}</a>` : 'לא הוזן'}</li>
    <li>מייל: ${lead.email ? escapeHtml(lead.email) : 'לא הוזן'}</li>
    <li>הדפוס שיצא: ${escapeHtml(patternLabel)}</li>
  </ul>
  <p>
    <a href="${reportUrl}">תמונת המצב שהיא ראתה</a>
    ${adminUrl ? ` · <a href="${adminUrl}">הכרטיס בדשבורד</a>` : ''}
  </p>
  <p style="color:#68707C;font-size:13px">מהרגע הזה היא על הדף של השיחה. אם היא לא כותבת תוך שעה, הודעה אישית קצרה ממך עובדת הכי טוב.</p>
</div>`.trim();

  let sent = false;
  let sendError: string | null = null;
  try {
    const { sendEmail } = await import('@/lib/google/gmail');
    await sendEmail({ to: recipients.join(','), subject, htmlBody });
    sent = true;
  } catch (err) {
    sendError = err instanceof Error ? err.message : 'Gmail API error';
    console.error('[notify-new-lead] send failed:', sendError);
  }

  // email_logs is the app's email audit table (notification_logs only accepts
  // whatsapp/sms channels). metadata.kind marks this as the admin alert.
  const { error: logError } = await supabase.from('email_logs').insert({
    lead_id: lead.id,
    subject,
    recipient_email: recipients.join(','),
    status: sent ? 'sent' : 'failed',
    error: sendError,
    sent_at: sent ? new Date().toISOString() : null,
    metadata: { kind: ALERT_KIND },
  });
  if (logError) console.error('[notify-new-lead] log insert failed:', logError.message);

  return NextResponse.json({ success: true, sent });
}
