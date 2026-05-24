import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendReportEmailSchema } from '@/lib/validation/schemas';
import { buildReportLink } from '@/lib/quiz/buildReportLink';

export async function POST(request: NextRequest) {
  const reportSecret = process.env.REPORT_SEND_SECRET?.trim();
  const headerSecret = request.headers.get('x-report-send-secret')?.trim();

  if (reportSecret) {
    if (headerSecret !== reportSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const parsed = sendReportEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
        { status: 400 },
      );
    }

    const { leadId, email, name, reportToken, pattern } = parsed.data;

    const supabase = createServiceRoleClient();
    const reportUrl = buildReportLink(reportToken);

    const { data: emailLog } = await supabase
      .from('email_logs')
      .insert({
        lead_id: leadId,
        template_id: null,
        subject: `הדוח שלך מוכן, ${name ?? ''}`,
        recipient_email: email,
        status: 'pending',
        error: null,
      })
      .select('id')
      .single();

    let sent = false;
    let sendError: string | null = null;

    const hasGoogleCreds =
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN;

    if (hasGoogleCreds) {
      try {
        const { sendEmail, injectTemplateVariables } = await import('@/lib/google/gmail');

        const { data: template } = await supabase
          .from('email_templates')
          .select('html_content, subject')
          .eq('name', 'דוח אבחון')
          .limit(1)
          .maybeSingle();

        const defaultHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Heebo', Arial, sans-serif; background: #f8fafc; padding: 40px 20px; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 16px;">שלום {{name}},</h1>
    <p style="color: #475569; font-size: 16px; line-height: 1.7;">
      תודה שהשלמת את האבחון התפעולי. הדפוס שזוהה: <strong>{{pattern}}</strong>.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.7;">
      הדוח המלא שלך מוכן וממתין לך:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{report_url}}" style="background: #14b8a6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        צפה בדוח המלא
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 32px;">
      ארכיטקטורת סקייל · דוח אבחון ניהולי
    </p>
  </div>
</body>
</html>`;

        const htmlTemplate = template?.html_content || defaultHtml;
        const subjectTemplate = template?.subject || 'הדוח התפעולי שלך מוכן, {{name}}';

        const variables: Record<string, string> = {
          name: name || '',
          email: email || '',
          pattern: pattern || '',
          report_url: reportUrl,
        };

        const htmlBody = injectTemplateVariables(htmlTemplate, variables);
        const subject = injectTemplateVariables(subjectTemplate, variables);

        await sendEmail({
          to: email,
          subject,
          htmlBody,
        });

        sent = true;
      } catch (err) {
        sendError = err instanceof Error ? err.message : 'Gmail API error';
        console.error('[Email] Gmail send failed:', sendError);
      }
    } else {
      console.log(`[Email] Gmail not configured. Report email for ${email} logged but not sent.`, {
        name,
        reportUrl,
        pattern,
        leadId,
      });
    }

    if (emailLog?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: sent ? 'sent' : hasGoogleCreds ? 'failed' : 'pending',
          sent_at: sent ? new Date().toISOString() : null,
          error: sendError,
        })
        .eq('id', emailLog.id);
    }

    return NextResponse.json({
      success: true,
      sent,
      message: sent
        ? 'Report email sent'
        : 'Report email logged (Gmail not configured or failed)',
      reportUrl,
    });
  } catch (error) {
    console.error('[Email] send-report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
