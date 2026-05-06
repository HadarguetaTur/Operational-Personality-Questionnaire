import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { template_id, lead_ids } = await request.json();

    if (!template_id || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: 'Missing template_id or lead_ids' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Fetch leads
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, email, result_pattern, report_token')
      .in('id', lead_ids);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found' }, { status: 404 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        // Replace template variables with lead data
        let html = template.html_content || '';
        const subject = template.subject || '';
        const vars: Record<string, string> = {
          name: lead.name ?? '',
          email: lead.email ?? '',
          pattern: lead.result_pattern ?? '',
          report_url: lead.report_token
            ? `${(process.env.NEXT_PUBLIC_QUIZ_URL || 'http://localhost:5173').replace(/\/$/, '')}/#/result/${encodeURIComponent(lead.report_token)}`
            : '',
          form_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/followup/${lead.id}`,
          meeting_url: process.env.NEXT_PUBLIC_CALCOM_URL || '',
        };

        Object.entries(vars).forEach(([key, value]) => {
          html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });

        let renderedSubject = subject;
        Object.entries(vars).forEach(([key, value]) => {
          renderedSubject = renderedSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });

        // Log the email (actual Gmail API sending would go here)
        await supabase.from('email_logs').insert({
          lead_id: lead.id,
          template_id: template_id,
          funnel_id: template.funnel_id ?? null,
          subject: renderedSubject,
          recipient_email: lead.email,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: { bulk: true },
        });

        sentCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${lead.email}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
