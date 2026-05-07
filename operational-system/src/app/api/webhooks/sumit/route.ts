import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseSumitWebhook } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SUMIT_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      console.error('[Sumit Webhook] SUMIT_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 },
      );
    }

    const headerSecret =
      request.headers.get('x-sumit-secret') || request.headers.get('authorization');
    if (
      headerSecret !== webhookSecret &&
      headerSecret !== `Bearer ${webhookSecret}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = parseSumitWebhook(body);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { email, amount, transactionId, status, customerName } = parsed;

    const okStatus =
      status === 'success' || status === 'approved' || status === 'completed';
    if (!okStatus) {
      return NextResponse.json(
        { error: 'Invalid webhook payload or payment not successful' },
        { status: 400 },
      );
    }

    console.log('[Sumit Webhook] Payment received:', {
      email,
      amount,
      transactionId,
      status,
    });

    const supabase = createServiceRoleClient();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, funnel_id, current_stage_id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (leadError || !lead) {
      console.error('[Sumit Webhook] Lead not found for email:', email);
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await supabase
      .from('leads')
      .update({
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        payment_amount: amount != null ? amount : null,
        payment_transaction_id: transactionId || null,
        lead_status: 'paid',
      })
      .eq('id', lead.id);

    if (lead.funnel_id) {
      const { data: nextStage } = await supabase
        .from('funnel_stages')
        .select('id, type, email_template_id')
        .eq('funnel_id', lead.funnel_id)
        .eq('type', 'followup_form')
        .eq('is_active', true)
        .order('order', { ascending: true })
        .limit(1)
        .single();

      if (nextStage) {
        const followupToken = randomBytes(24).toString('hex');

        await supabase
          .from('leads')
          .update({
            current_stage_id: nextStage.id,
            lead_status: 'followup_sent',
            followup_access_token: followupToken,
          })
          .eq('id', lead.id);

        if (nextStage.email_template_id) {
          const { data: template } = await supabase
            .from('email_templates')
            .select('html_content, subject')
            .eq('id', nextStage.email_template_id)
            .single();

          if (template) {
            const hasGmail =
              process.env.GOOGLE_CLIENT_ID &&
              process.env.GOOGLE_CLIENT_SECRET &&
              process.env.GOOGLE_REFRESH_TOKEN;
            if (hasGmail) {
              try {
                const { sendEmail, injectTemplateVariables } = await import(
                  '@/lib/google/gmail'
                );
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const formUrl = `${appUrl}/followup/${lead.id}?t=${encodeURIComponent(followupToken)}`;

                const variables: Record<string, string> = {
                  name: lead.name || customerName || '',
                  email,
                  form_url: formUrl,
                };

                await sendEmail({
                  to: email,
                  subject: injectTemplateVariables(template.subject, variables),
                  htmlBody: injectTemplateVariables(template.html_content, variables),
                });

                await supabase.from('email_logs').insert({
                  lead_id: lead.id,
                  template_id: nextStage.email_template_id,
                  funnel_id: lead.funnel_id,
                  stage_id: nextStage.id,
                  subject: template.subject,
                  recipient_email: email,
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                });
              } catch (emailErr) {
                console.error('[Sumit Webhook] Failed to send follow-up email:', emailErr);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed',
      leadId: lead.id,
    });
  } catch (error) {
    console.error('[Sumit Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
