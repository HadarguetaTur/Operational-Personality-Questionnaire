import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendTestEmailSchema } from '@/lib/validation/schemas';

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

    const parsed = sendTestEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
        { status: 400 },
      );
    }

    const { template_id: templateId, to_email } = parsed.data;

    const supabase = createServiceRoleClient();

    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

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

    await supabase.from('email_logs').insert({
      lead_id: null,
      template_id: templateId,
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
