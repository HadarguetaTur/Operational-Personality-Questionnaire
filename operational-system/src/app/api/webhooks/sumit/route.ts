import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseSumitWebhook } from '@/lib/validation/schemas';
import { normalizePhone } from '@/lib/phone';
import { safeEqual } from '@/lib/security/safeEqual';

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

    // Sumit's "טריגרים → יצירת קריאת HTTP" exposes only a URL and a body
    // format: no custom headers. So the secret is accepted either as a header
    // (x-sumit-secret / Authorization) or as the `secret` query parameter:
    //   https://<host>/api/webhooks/sumit?secret=<SUMIT_WEBHOOK_SECRET>
    const headerSecret =
      request.headers.get('x-sumit-secret') || request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    if (
      !safeEqual(headerSecret, webhookSecret) &&
      !safeEqual(headerSecret, `Bearer ${webhookSecret}`) &&
      !safeEqual(querySecret, webhookSecret)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // TEMPORARY (until first live payment): log the raw payload keys so the
    // parser's field-name guesses (phone/externalIdentifier) can be calibrated.
    if (typeof body === 'object' && body !== null) {
      console.log('[Sumit Webhook] raw payload keys:', Object.keys(body as object));
    }

    const parsed = parseSumitWebhook(body);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { email, phone, externalIdentifier, amount, transactionId, status, customerName } =
      parsed;

    const okStatus =
      status === 'success' || status === 'approved' || status === 'completed';
    if (!okStatus) {
      return NextResponse.json(
        { error: 'Invalid webhook payload or payment not successful' },
        { status: 400 },
      );
    }

    // No PII in logs: only identifiers needed to trace the payment.
    console.log('[Sumit Webhook] Payment received:', {
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      hasExternalIdentifier: Boolean(externalIdentifier),
      amount,
      transactionId,
      status,
    });

    const supabase = createServiceRoleClient();

    // Quote payments: externalIdentifier = "quote:<quote_number>" (set by the
    // signed-quote payment link). Marks the quote paid and the lead paid.
    const quoteMatch = externalIdentifier ? /^quote:(\d{1,10})$/.exec(externalIdentifier) : null;
    if (quoteMatch) {
      const quoteNumber = Number(quoteMatch[1]);
      const { data: quote } = await supabase
        .from('quotes')
        .select('id, lead_id, status, total')
        .eq('quote_number', quoteNumber)
        .maybeSingle();
      if (!quote) {
        console.error('[Sumit Webhook] Quote not found for', externalIdentifier);
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }
      const paidAt = new Date().toISOString();
      await supabase
        .from('quotes')
        .update({ status: 'paid', paid_at: paidAt, payment_transaction_id: transactionId || null })
        .eq('id', quote.id);
      await supabase
        .from('leads')
        .update({
          payment_status: 'paid',
          payment_date: paidAt,
          payment_amount: amount != null ? amount : quote.total,
          payment_transaction_id: transactionId || null,
          lead_status: 'paid',
        })
        .eq('id', quote.lead_id);
      console.log(`[Sumit Webhook] Quote Q-${quoteNumber} marked paid (lead ${quote.lead_id})`);
      return NextResponse.json({ success: true, message: 'Quote payment processed', leadId: quote.lead_id, quoteId: quote.id });
    }

    // Match priority: report_token pass-through → normalized phone → email.
    // Email is optional in the quiz, so phone is the load-bearing matcher.
    const LEAD_COLUMNS = 'id, name, funnel_id, current_stage_id';
    type LeadRow = { id: string; name: string | null; funnel_id: string | null; current_stage_id: string | null };
    let lead: LeadRow | null = null;
    let matchedBy: string | null = null;

    if (externalIdentifier && /^[0-9a-f]{16,40}$/i.test(externalIdentifier)) {
      const { data } = await supabase
        .from('leads')
        .select(LEAD_COLUMNS)
        .eq('report_token', externalIdentifier)
        .maybeSingle();
      if (data) {
        lead = data as LeadRow;
        matchedBy = 'report_token';
      }
    }

    if (!lead) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        const { data } = await supabase
          .from('leads')
          .select(LEAD_COLUMNS)
          .eq('phone_normalized', normalized)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          lead = data as LeadRow;
          matchedBy = 'phone';
        }
      }
    }

    if (!lead && email) {
      const { data } = await supabase
        .from('leads')
        .select(LEAD_COLUMNS)
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        lead = data as LeadRow;
        matchedBy = 'email';
      }
    }

    if (!lead) {
      console.error('[Sumit Webhook] Lead not found.', {
        transactionId,
        triedExternalIdentifier: Boolean(externalIdentifier),
        triedPhone: Boolean(phone),
        triedEmail: Boolean(email),
      });
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    console.log(`[Sumit Webhook] Lead ${lead.id} matched by ${matchedBy}`);

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

        // Follow-up email requires an address — quiz email is optional, so a
        // phone/token-matched payment may have none. The stage update above
        // still ran; only the email is skipped.
        if (nextStage.email_template_id && email) {
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
