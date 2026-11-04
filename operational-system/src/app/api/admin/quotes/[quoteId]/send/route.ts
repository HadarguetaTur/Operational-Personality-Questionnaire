import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  buildAndStoreDraftPdf,
  escapeHtml,
  getQuoteById,
  isGmailConfigured,
  newAccessToken,
  publicQuoteUrl,
  quoteFileName,
} from '@/lib/quotes/service';
import { getQuoteSettings } from '@/lib/quotes/settings';
import { formatDateHe, formatIls } from '@/lib/quotes/math';

export const runtime = 'nodejs';
export const maxDuration = 90;

const paramsSchema = z.object({ quoteId: z.string().uuid() });
const bodySchema = z.object({
  /** false = just generate link + PDF, don't email (e.g. WhatsApp-only delivery) */
  sendEmail: z.boolean().default(true),
  to: z.string().email().max(320).optional(),
  message: z.string().max(4000).optional(),
});

/**
 * POST — "send" a quote: mint the public access token, render + store the PDF,
 * email the client (if Gmail is configured and an address exists), mark the
 * quote `sent` and the lead `quote_sent`. Returns the public link + a ready
 * WhatsApp message so Hadar can also paste it manually.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ error: 'פרטים לא תקינים' }, { status: 400 });

  const quote = await getQuoteById(p.data.quoteId);
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });
  if (quote.status === 'signed' || quote.status === 'paid') {
    return NextResponse.json({ error: 'ההצעה כבר נחתמה' }, { status: 409 });
  }
  if (quote.line_items.length === 0) {
    return NextResponse.json({ error: 'אין שורות מחיר בהצעה' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const token = quote.access_token ?? newAccessToken();
  if (!quote.access_token) {
    await supabase.from('quotes').update({ access_token: token }).eq('id', quote.id);
  }
  const url = publicQuoteUrl(token);

  let pdf: Buffer;
  try {
    ({ pdf } = await buildAndStoreDraftPdf({ ...quote, access_token: token }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'יצירת PDF נכשלה';
    console.error('[admin/quotes/send] pdf:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const settings = await getQuoteSettings();
  const recipient = parsedBody.data.to ?? quote.client_email ?? null;
  const firstName = (quote.client_name ?? '').trim().split(/\s+/)[0] || '';
  const greeting = firstName ? `היי ${firstName},` : 'היי,';
  const customMessage = parsedBody.data.message?.trim();

  const whatsappText =
    `${greeting}\n` +
    (customMessage ? `${customMessage}\n\n` : '') +
    `מצורפת הצעת המחיר שלנו (${quote.title}).\n` +
    `אפשר לצפות, להוריד PDF ולאשר בחתימה דיגיטלית כאן:\n${url}\n\n` +
    (quote.valid_until ? `ההצעה בתוקף עד ${formatDateHe(quote.valid_until)}.\n` : '') +
    `לכל שאלה אני כאן 🙂\n${settings.business_name}`;

  let emailed = false;
  let emailError: string | null = null;
  if (parsedBody.data.sendEmail && recipient) {
    if (!isGmailConfigured()) {
      emailError = 'Gmail לא מוגדר (GOOGLE_* env)';
    } else {
      try {
        const { sendEmail } = await import('@/lib/google/gmail');
        const html = buildQuoteEmailHtml({
          greeting,
          customMessage: customMessage ?? null,
          title: quote.title,
          total: formatIls(quote.total),
          validUntil: quote.valid_until ? formatDateHe(quote.valid_until) : null,
          url,
          businessName: settings.business_name,
        });
        await sendEmail({
          to: recipient,
          subject: `הצעת מחיר Q-${quote.quote_number} — ${quote.title}`,
          htmlBody: html,
          attachments: [{ filename: quoteFileName(quote, false), mimeType: 'application/pdf', content: pdf }],
        });
        emailed = true;
        await supabase.from('email_logs').insert({
          lead_id: quote.lead_id,
          subject: `הצעת מחיר Q-${quote.quote_number}`,
          recipient_email: recipient,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: { kind: 'quote_sent', quote_id: quote.id },
        });
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'שליחת המייל נכשלה';
        console.error('[admin/quotes/send] email:', err);
        await supabase.from('email_logs').insert({
          lead_id: quote.lead_id,
          subject: `הצעת מחיר Q-${quote.quote_number}`,
          recipient_email: recipient,
          status: 'failed',
          error: emailError,
          metadata: { kind: 'quote_sent', quote_id: quote.id },
        });
      }
    }
  }

  const now = new Date().toISOString();
  await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: quote.sent_at ?? now })
    .eq('id', quote.id);
  await supabase.from('leads').update({ lead_status: 'quote_sent', last_active_at: now }).eq('id', quote.lead_id);

  return NextResponse.json({
    ok: true,
    publicUrl: url,
    emailed,
    emailError,
    recipient,
    whatsappText,
  });
}

function buildQuoteEmailHtml(p: {
  greeting: string;
  customMessage: string | null;
  title: string;
  total: string;
  validUntil: string | null;
  url: string;
  businessName: string;
}): string {
  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#F6F5FA;font-family:Heebo,Arial,sans-serif;color:#0D1B2A">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:16px;padding:28px 28px 24px;border:1px solid #E6E2F4">
    <p style="font-size:17px;margin:0 0 14px">${escapeHtml(p.greeting)}</p>
    ${p.customMessage ? `<p style="font-size:15px;line-height:1.7;margin:0 0 14px;white-space:pre-wrap">${escapeHtml(p.customMessage)}</p>` : ''}
    <p style="font-size:15px;line-height:1.7;margin:0 0 18px">מצורפת הצעת המחיר <b>${escapeHtml(p.title)}</b>. אפשר לצפות בה, להוריד עותק PDF, ולאשר אותה בחתימה דיגיטלית בלחיצה אחת.</p>
    <div style="background:#F3F0FB;border-radius:12px;padding:14px 16px;margin:0 0 20px;font-size:14px">
      <div>סה״כ לתשלום (כולל מע״מ): <b>${escapeHtml(p.total)}</b></div>
      ${p.validUntil ? `<div>בתוקף עד: <b>${escapeHtml(p.validUntil)}</b></div>` : ''}
    </div>
    <a href="${p.url}" style="display:block;text-align:center;background:#5B3FC4;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 18px;border-radius:12px">לצפייה ואישור ההצעה</a>
    <p style="font-size:12px;color:#68707C;margin:18px 0 0;line-height:1.6">אם הכפתור לא נפתח, אפשר להעתיק את הקישור:<br><span style="direction:ltr;unicode-bidi:embed">${p.url}</span></p>
  </div>
  <p style="text-align:center;font-size:12px;color:#68707C;margin:18px 0 0">${escapeHtml(p.businessName)}</p>
</div></body></html>`;
}
