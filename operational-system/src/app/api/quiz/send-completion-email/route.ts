import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quizCompletionEmailSchema } from '@/lib/validation/schemas';
import { buildReportLink } from '@/lib/quiz/buildReportLink';
import { checkFixedKeyRateLimit, checkRateLimit } from '@/lib/rateLimit';
import {
  QUIZ_COMPLETION_EMAIL_METADATA_KIND,
  QUIZ_COMPLETION_TEMPLATE_NAME,
  buildQuizCompletionVariables,
  defaultQuizCompletionSubjectTemplate,
  getDefaultQuizCompletionHtmlTemplate,
} from '@/lib/mailing/completionEmail';

const TEN_MIN_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: 'שירות לא מוגדר' }, { status: 503 });
  }

  if (!checkRateLimit(request, 'quiz_completion_email_ip', 30, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסי שוב בעוד כמה דקות.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const parsed = quizCompletionEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const reportToken = parsed.data.reportToken;

  const supabase = createServiceRoleClient();

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, name, email, result_pattern, report_token, completed_at')
    .eq('report_token', reportToken)
    .maybeSingle();

  if (leadError) {
    console.error('[send-completion-email] lead fetch', leadError);
    return NextResponse.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 });
  }

  if (!lead?.completed_at || !lead.email?.trim()) {
    return NextResponse.json({ error: 'לא נמצא דוח' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('email_logs')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('status', 'sent')
    .contains('metadata', { kind: QUIZ_COMPLETION_EMAIL_METADATA_KIND })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({
      success: true,
      alreadySent: true,
      sent: false,
    });
  }

  if (!checkFixedKeyRateLimit('quiz_completion_email_token', reportToken, 3, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות לקישור זה. נסי שוב מאוחר יותר.' }, { status: 429 });
  }

  const reportUrl = buildReportLink(reportToken);
  const variables = buildQuizCompletionVariables({
    name: lead.name ?? '',
    pattern: lead.result_pattern ?? '',
    reportUrl,
  });

  const { data: dbTemplate } = await supabase
    .from('email_templates')
    .select('id, html_content, subject')
    .eq('name', QUIZ_COMPLETION_TEMPLATE_NAME)
    .maybeSingle();

  const htmlTemplate = dbTemplate?.html_content?.trim()
    ? dbTemplate.html_content
    : getDefaultQuizCompletionHtmlTemplate();
  const subjectTemplate =
    dbTemplate?.subject?.trim() ? dbTemplate.subject : defaultQuizCompletionSubjectTemplate;

  const { sendEmail, injectTemplateVariables } = await import('@/lib/google/gmail');
  const htmlBody = injectTemplateVariables(htmlTemplate, variables);
  const subject = injectTemplateVariables(subjectTemplate, variables);

  const { data: emailLog, error: logInsertError } = await supabase
    .from('email_logs')
    .insert({
      lead_id: lead.id,
      template_id: dbTemplate?.id ?? null,
      subject,
      recipient_email: lead.email.trim(),
      status: 'pending',
      error: null,
      metadata: { kind: QUIZ_COMPLETION_EMAIL_METADATA_KIND },
    })
    .select('id')
    .single();

  if (logInsertError || !emailLog?.id) {
    console.error('[send-completion-email] log insert', logInsertError);
    return NextResponse.json({ error: 'שמירת לוג נכשלה' }, { status: 500 });
  }

  const hasGoogleCreds =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN;

  let sent = false;
  let sendError: string | null = null;

  if (hasGoogleCreds) {
    try {
      await sendEmail({
        to: lead.email.trim(),
        subject,
        htmlBody,
      });
      sent = true;
    } catch (err) {
      sendError = err instanceof Error ? err.message : 'Gmail API error';
      console.error('[send-completion-email] Gmail send failed:', sendError);
    }
  } else {
    console.warn('[send-completion-email] Gmail not configured; log only', {
      leadId: lead.id,
      reportUrl,
    });
  }

  await supabase
    .from('email_logs')
    .update({
      status: sent ? 'sent' : hasGoogleCreds ? 'failed' : 'pending',
      sent_at: sent ? new Date().toISOString() : null,
      error: sendError,
    })
    .eq('id', emailLog.id);

  return NextResponse.json({
    success: true,
    alreadySent: false,
    sent,
    message: sent
      ? 'Completion email sent'
      : 'Completion email logged (Gmail not configured or failed)',
    reportUrl,
  });
}
