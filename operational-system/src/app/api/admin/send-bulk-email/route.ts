import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { bulkEmailSchema } from '@/lib/validation/schemas';
import { buildReportLink } from '@/lib/quiz/buildReportLink';
import { buildWhatsappUrl } from '@/lib/mailing/completionEmail';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const parsed = bulkEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
        { status: 400 },
      );
    }

    const { template_id: templateId, lead_ids: leadIds } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, email, result_pattern, report_token')
      .in('id', leadIds);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found' }, { status: 404 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        let html = template.html_content || '';
        const subject = template.subject || '';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        const vars: Record<string, string> = {
          name: lead.name ?? '',
          email: lead.email ?? '',
          pattern: lead.result_pattern ?? '',
          report_url: lead.report_token ? buildReportLink(lead.report_token) : '',
          form_url: `${appUrl}/followup/${lead.id}`,
          meeting_url: buildWhatsappUrl(process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() ?? ''),
        };

        Object.entries(vars).forEach(([key, value]) => {
          html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });

        let renderedSubject = subject;
        Object.entries(vars).forEach(([key, value]) => {
          renderedSubject = renderedSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });

        await supabase.from('email_logs').insert({
          lead_id: lead.id,
          template_id: templateId,
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
