import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { template_id, to_email } = await request.json();

    if (!template_id || !to_email) {
      return NextResponse.json({ error: 'Missing template_id or to_email' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Replace variables with sample data for test
    let html = template.html_content || '<p>תבנית ריקה</p>';
    const testVars: Record<string, string> = {
      name: 'ישראל ישראלי (ניסיון)',
      email: to_email,
      report_url: 'https://example.com/report/test',
      form_url: 'https://example.com/form/test',
      meeting_url: 'https://example.com/meeting/test',
      pattern: 'דפוס לדוגמה',
    };

    Object.entries(testVars).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    // For now, log the test email (actual sending requires Gmail API setup)
    await supabase.from('email_logs').insert({
      lead_id: null,
      template_id: template_id,
      subject: `[ניסיון] ${template.subject || 'ללא נושא'}`,
      recipient_email: to_email,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { test: true },
    });

    return NextResponse.json({ success: true, message: `Test email logged for ${to_email}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
