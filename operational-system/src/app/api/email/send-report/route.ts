import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, email, name, reportToken, pattern } = body;

    if (!leadId || !email || !reportToken) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, email, reportToken' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const quizBase = (process.env.NEXT_PUBLIC_QUIZ_URL || 'http://localhost:5173').replace(/\/$/, '');
    const reportUrl = `${quizBase}/#/result/${encodeURIComponent(reportToken)}`;

    // Log the email attempt
    const { data: emailLog } = await supabase
      .from('email_logs')
      .insert({
        lead_id: leadId,
        template_id: null,
        subject: `הדוח שלך מוכן — ${name}`,
        recipient_email: email,
        status: 'pending',
        error: null,
      })
      .select('id')
      .single();

    let sent = false;
    let sendError: string | null = null;

    // Try Gmail API if credentials are configured
    const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;

    if (hasGoogleCreds) {
      try {
        const { sendEmail, injectTemplateVariables } = await import('@/lib/google/gmail');

        // Check if there's a template for report emails
        const { data: template } = await supabase
          .from('email_templates')
          .select('html_content, subject')
          .eq('name', 'דוח אבחון')
          .limit(1)
          .single();

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
        const subjectTemplate = template?.subject || 'הדוח התפעולי שלך מוכן — {{name}}';

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
        name, reportUrl, pattern, leadId,
      });
    }

    // Update log status
    if (emailLog?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: sent ? 'sent' : (hasGoogleCreds ? 'failed' : 'pending'),
          sent_at: sent ? new Date().toISOString() : null,
          error: sendError,
        })
        .eq('id', emailLog.id);
    }

    return NextResponse.json({
      success: true,
      sent,
      message: sent ? 'Report email sent' : 'Report email logged (Gmail not configured or failed)',
      reportUrl,
    });
  } catch (error) {
    console.error('[Email] send-report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
