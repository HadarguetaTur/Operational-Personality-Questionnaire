import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage, injectMessageVariables } from '@/lib/notifications/whatsapp';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit } from '@/lib/rateLimit';
import { whatsappNotifySchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!checkRateLimit(request, 'whatsapp', 60, 60_000)) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסי שוב בעוד דקה.' }, { status: 429 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const parsed = whatsappNotifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
        { status: 400 },
      );
    }

    const { leadId, phone, message, templateName, variables } = parsed.data;
    let finalMessage = (message ?? '').trim();

    if (templateName && !finalMessage) {
      const defaultTemplates: Record<string, string> = {
        followup_complete:
          'היי {{name}}, זאת הדר 🙂 קיבלתי את כל מה שמילאת ואני כבר מתחילה לעבור על זה. נשאר רק לקבוע מתי נדבר. כתבי לי כאן מה נוח לך השבוע ונסגור.',
        payment_received:
          'היי {{name}}, זאת הדר. התשלום עבר ואני שמחה שאנחנו עושות את זה 🙂 עוד רגע יגיע אלייך טופס קצר, וברגע שתמלאי אותו אני מתחילה להכין את השיחה שלך.',
        meeting_reminder:
          'היי {{name}}, רק מזכירה שמחר אנחנו מדברות על העסק שלך. אני כבר עברתי על מה שכתבת והכנתי את הכיוונים שלנו. נתראה 🙂',
      };
      finalMessage = defaultTemplates[templateName] || '';
    }

    if (variables && typeof variables === 'object') {
      finalMessage = injectMessageVariables(finalMessage, variables);
    }

    if (!finalMessage) {
      return NextResponse.json({ error: 'No message content' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(phone, finalMessage);

    const supabase = createServiceRoleClient();
    if (leadId) {
      await supabase.from('notification_logs').insert({
        lead_id: leadId,
        channel: 'whatsapp',
        recipient_phone: phone,
        message_body: finalMessage,
        template_name: templateName || null,
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.messageId || null,
        error: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      });
    }

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    console.error('[WhatsApp API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
