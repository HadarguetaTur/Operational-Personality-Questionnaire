import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { injectTemplateVariables } from '@/lib/google/gmail';

/**
 * Send a template-based email to a list of leads.
 * Used by the admin dashboard for manual campaigns.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, leadIds, funnelId, filters } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get the template
    const { data: template, error: tplError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (tplError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get leads
    let leadsQuery = supabase.from('leads').select('id, name, email, result_pattern, report_token');

    if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
      leadsQuery = leadsQuery.in('id', leadIds);
    } else if (funnelId) {
      leadsQuery = leadsQuery.eq('funnel_id', funnelId);
    } else if (filters) {
      if (filters.payment_status) leadsQuery = leadsQuery.eq('payment_status', filters.payment_status);
      if (filters.result_pattern) leadsQuery = leadsQuery.eq('result_pattern', filters.result_pattern);
      if (filters.has_email !== false) leadsQuery = leadsQuery.not('email', 'is', null);
    }

    const { data: leads } = await leadsQuery.limit(500);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found', sent: 0 }, { status: 200 });
    }

    const hasGmail = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let sentCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const quizBase = (process.env.NEXT_PUBLIC_QUIZ_URL || 'http://localhost:5173').replace(/\/$/, '');

    for (const lead of leads) {
      const variables: Record<string, string> = {
        name: lead.name || '',
        email: lead.email || '',
        pattern: lead.result_pattern || '',
        report_url: lead.report_token ? `${quizBase}/#/result/${encodeURIComponent(lead.report_token)}` : '',
        form_url: `${appUrl}/followup/${lead.id}`,
        meeting_url: process.env.NEXT_PUBLIC_CALCOM_URL || '',
      };

      const htmlBody = injectTemplateVariables(template.html_content, variables);
      const subject = injectTemplateVariables(template.subject, variables);

      if (hasGmail) {
        try {
          const { sendEmail } = await import('@/lib/google/gmail');
          await sendEmail({ to: lead.email, subject, htmlBody });

          await supabase.from('email_logs').insert({
            lead_id: lead.id,
            template_id: templateId,
            subject,
            recipient_email: lead.email,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          sentCount++;
        } catch (err) {
          failCount++;
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${lead.email}: ${errMsg}`);

          await supabase.from('email_logs').insert({
            lead_id: lead.id,
            template_id: templateId,
            subject,
            recipient_email: lead.email,
            status: 'failed',
            error: errMsg,
          });
        }

        // Rate limiting: wait 100ms between sends
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        await supabase.from('email_logs').insert({
          lead_id: lead.id,
          template_id: templateId,
          subject,
          recipient_email: lead.email,
          status: 'pending',
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: leads.length,
      sent: sentCount,
      failed: failCount,
      gmailConfigured: !!hasGmail,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('[Email] send-bulk error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
