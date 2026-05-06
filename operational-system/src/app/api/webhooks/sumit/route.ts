import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, transactionId, status, CustomerName } = body;

    console.log('[Sumit Webhook] Payment received:', { email, amount, transactionId, status });

    // Verify webhook secret if configured
    const webhookSecret = process.env.SUMIT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get('x-sumit-secret') || request.headers.get('authorization');
      if (headerSecret !== webhookSecret && headerSecret !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!email || (status !== 'success' && status !== 'approved' && status !== 'completed')) {
      return NextResponse.json({ error: 'Invalid webhook payload or payment not successful' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find the lead by email
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

    // Update payment status
    await supabase
      .from('leads')
      .update({
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        payment_amount: amount ? parseFloat(amount) : null,
        payment_transaction_id: transactionId || null,
        lead_status: 'paid',
      })
      .eq('id', lead.id);

    // Find the next stage (follow-up form) if funnel is configured
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
        // Advance lead to follow-up form stage
        await supabase
          .from('leads')
          .update({ current_stage_id: nextStage.id, lead_status: 'followup_sent' })
          .eq('id', lead.id);

        // Send follow-up form email
        if (nextStage.email_template_id) {
          const { data: template } = await supabase
            .from('email_templates')
            .select('html_content, subject')
            .eq('id', nextStage.email_template_id)
            .single();

          if (template) {
            const hasGmail = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;
            if (hasGmail) {
              try {
                const { sendEmail, injectTemplateVariables } = await import('@/lib/google/gmail');
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const formUrl = `${appUrl}/followup/${lead.id}`;

                const variables: Record<string, string> = {
                  name: lead.name || CustomerName || '',
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
