import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage, injectMessageVariables } from '@/lib/notifications/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, phone, message, templateName, variables } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    let finalMessage = message || '';

    // If template name is provided, look up the message template
    if (templateName && !message) {
      // Could be extended to have WhatsApp templates in DB
      const defaultTemplates: Record<string, string> = {
        followup_complete: 'שלום {{name}}, תודה שמילאת את הטופס! לקביעת פגישה: {{meeting_url}}',
        payment_received: 'שלום {{name}}, התשלום התקבל בהצלחה. בקרוב תקבלי טופס למילוי.',
        meeting_reminder: 'שלום {{name}}, רק להזכיר — הפגישה שלנו מחר. מחכה!',
      };
      finalMessage = defaultTemplates[templateName] || '';
    }

    // Inject variables
    if (variables && typeof variables === 'object') {
      finalMessage = injectMessageVariables(finalMessage, variables);
    }

    if (!finalMessage) {
      return NextResponse.json({ error: 'No message content' }, { status: 400 });
    }

    // Send the message
    const result = await sendWhatsAppMessage(phone, finalMessage);

    // Log the notification
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
