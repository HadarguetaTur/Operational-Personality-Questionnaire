import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFixedKeyRateLimit, checkRateLimit } from '@/lib/rateLimit';
import { getRequestClientIp, isTurnstileEnabled, verifyTurnstileToken } from '@/lib/security/turnstile';
import { quoteSignSchema } from '@/lib/validation/schemas';
import {
  adminNotificationEmail,
  buildAndStoreSignedPdf,
  escapeHtml,
  getQuoteByToken,
  isGmailConfigured,
  publicQuoteUrl,
  quoteFileName,
  quotePaymentUrl,
} from '@/lib/quotes/service';
import { getQuoteSettings } from '@/lib/quotes/settings';
import { quotePaths, uploadQuoteFile } from '@/lib/quotes/storage';
import { formatDateTimeHe, formatIls } from '@/lib/quotes/math';
import type { QuoteSignature } from '@/lib/quotes/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const TEN_MIN_MS = 10 * 60 * 1000;

/**
 * POST /api/quotes/[token]/sign — remote e-signature.
 * Stores the signature PNG + audit row, renders the signed PDF (with the
 * signature block), locks the quote, updates the lead and emails both sides.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!checkRateLimit(request, 'quote_sign_ip', 10, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות' }, { status: 429 });
  }
  if (!checkFixedKeyRateLimit('quote_sign_token', (await params).token, 5, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const parsed = quoteSignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' }, { status: 400 });
  }
  const input = parsed.data;

  const ip = getRequestClientIp(request) ?? null;
  if (isTurnstileEnabled()) {
    if (!input.turnstileToken || !(await verifyTurnstileToken(input.turnstileToken, ip ?? undefined))) {
      return NextResponse.json({ error: 'אימות האבטחה נכשל, נסו שוב' }, { status: 403 });
    }
  }

  const quote = await getQuoteByToken((await params).token);
  if (!quote || quote.status === 'draft') {
    return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 });
  }
  if (quote.status === 'signed' || quote.status === 'paid') {
    return NextResponse.json({ error: 'ההצעה כבר נחתמה' }, { status: 409 });
  }
  if (quote.status === 'declined' || quote.status === 'expired') {
    return NextResponse.json({ error: 'ההצעה אינה פעילה' }, { status: 410 });
  }
  if (quote.valid_until && new Date(`${quote.valid_until}T23:59:59`) < new Date()) {
    return NextResponse.json({ error: 'תוקף ההצעה פג. אפשר לפנות אלינו להצעה מעודכנת.' }, { status: 410 });
  }

  const supabase = createServiceRoleClient();
  const settings = await getQuoteSettings();
  const signedAt = new Date().toISOString();

  // 1. Signature image
  const pngBuffer = Buffer.from(input.signature_png.replace(/^data:image\/png;base64,/, ''), 'base64');
  if (pngBuffer.byteLength < 200) {
    return NextResponse.json({ error: 'נא לחתום במשטח החתימה' }, { status: 400 });
  }
  const sigPath = quotePaths.signaturePng(quote.id);
  try {
    await uploadQuoteFile(sigPath, pngBuffer, 'image/png');
  } catch (err) {
    console.error('[quotes/sign] signature upload:', err);
    return NextResponse.json({ error: 'שמירת החתימה נכשלה' }, { status: 500 });
  }

  // 2. Audit row (document hash = the unsigned PDF the client saw, when available)
  const { data: sigRow, error: sigErr } = await supabase
    .from('quote_signatures')
    .insert({
      quote_id: quote.id,
      signer_name: input.signer_name,
      signer_email: input.signer_email ?? null,
      signer_id_number: input.signer_id_number ?? null,
      signature_image_path: sigPath,
      consent_text: settings.signature_consent,
      ip,
      user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
      document_sha256: quote.document_sha256,
      signed_at: signedAt,
    })
    .select('*')
    .single();

  if (sigErr || !sigRow) {
    console.error('[quotes/sign] audit insert:', sigErr);
    return NextResponse.json({ error: 'שמירת החתימה נכשלה' }, { status: 500 });
  }
  const signature = sigRow as QuoteSignature;

  // 3. Lock the quote + lead status (before the PDF so a render hiccup can't allow a double sign)
  await supabase
    .from('quotes')
    .update({ status: 'signed', signed_at: signedAt, client_email: quote.client_email ?? input.signer_email ?? null })
    .eq('id', quote.id);
  await supabase.from('leads').update({ lead_status: 'quote_signed', last_active_at: signedAt }).eq('id', quote.lead_id);

  // 4. Signed PDF
  let signedPdf: Buffer | null = null;
  try {
    const res = await buildAndStoreSignedPdf({ ...quote, status: 'signed', signed_at: signedAt }, signature);
    signedPdf = res.pdf;
    await supabase.from('quote_signatures').update({ document_sha256: res.sha256 }).eq('id', signature.id);
  } catch (err) {
    console.error('[quotes/sign] signed pdf render failed (quote is still marked signed):', err);
  }

  // 5. Emails (best-effort)
  const paymentUrl = quotePaymentUrl(quote);
  const publicUrl = publicQuoteUrl((await params).token);
  if (isGmailConfigured()) {
    try {
      const { sendEmail } = await import('@/lib/google/gmail');
      const attachments = signedPdf
        ? [{ filename: quoteFileName(quote, true), mimeType: 'application/pdf', content: signedPdf }]
        : [];
      const clientEmail = input.signer_email ?? quote.client_email ?? null;
      if (clientEmail) {
        await sendEmail({
          to: clientEmail,
          subject: `אישור חתימה — הצעת מחיר Q-${quote.quote_number}`,
          htmlBody: clientConfirmationHtml({
            name: input.signer_name,
            title: quote.title,
            total: formatIls(quote.total),
            signedAt: formatDateTimeHe(signedAt),
            publicUrl,
            paymentUrl,
            businessName: settings.business_name,
          }),
          attachments,
        });
        await supabase.from('email_logs').insert({
          lead_id: quote.lead_id,
          subject: `אישור חתימה Q-${quote.quote_number}`,
          recipient_email: clientEmail,
          status: 'sent',
          sent_at: signedAt,
          metadata: { kind: 'quote_signed_client', quote_id: quote.id },
        });
      }
      const admin = adminNotificationEmail();
      if (admin) {
        await sendEmail({
          to: admin,
          subject: `🎉 הצעה Q-${quote.quote_number} נחתמה — ${quote.client_name ?? ''}`,
          htmlBody: adminNotificationHtml({
            signer: input.signer_name,
            title: quote.title,
            total: formatIls(quote.total),
            signedAt: formatDateTimeHe(signedAt),
            leadId: quote.lead_id,
            quoteId: quote.id,
          }),
          attachments,
        });
      }
    } catch (err) {
      console.error('[quotes/sign] email failed (non-fatal):', err);
    }
  }

  return NextResponse.json({ ok: true, signed_at: signedAt, paymentUrl });
}

function clientConfirmationHtml(p: {
  name: string;
  title: string;
  total: string;
  signedAt: string;
  publicUrl: string;
  paymentUrl: string | null;
  businessName: string;
}): string {
  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#F6F5FA;font-family:Heebo,Arial,sans-serif;color:#0D1B2A">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #E6E2F4">
    <p style="font-size:17px;margin:0 0 14px">היי ${escapeHtml(p.name)},</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 16px">תודה! הצעת המחיר <b>${escapeHtml(p.title)}</b> אושרה ונחתמה ב-${escapeHtml(p.signedAt)}. עותק חתום מצורף למייל הזה, וזמין גם להורדה בקישור.</p>
    <div style="background:#F3F0FB;border-radius:12px;padding:14px 16px;margin:0 0 20px;font-size:14px">סה״כ לתשלום: <b>${escapeHtml(p.total)}</b></div>
    ${p.paymentUrl ? `<a href="${p.paymentUrl}" style="display:block;text-align:center;background:#5B3FC4;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 18px;border-radius:12px;margin-bottom:12px">למעבר לתשלום מאובטח</a>` : ''}
    <a href="${p.publicUrl}" style="display:block;text-align:center;color:#5B3FC4;text-decoration:none;font-weight:600;font-size:14px;padding:10px">לצפייה בהצעה החתומה</a>
  </div>
  <p style="text-align:center;font-size:12px;color:#68707C;margin:18px 0 0">${escapeHtml(p.businessName)}</p>
</div></body></html>`;
}

function adminNotificationHtml(p: {
  signer: string;
  title: string;
  total: string;
  signedAt: string;
  leadId: string;
  quoteId: string;
}): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return `<!doctype html><html lang="he" dir="rtl"><body style="font-family:Heebo,Arial,sans-serif;color:#0D1B2A;padding:20px">
<h2 style="margin:0 0 12px">הצעה נחתמה 🎉</h2>
<p><b>${escapeHtml(p.signer)}</b> חתם/ה על <b>${escapeHtml(p.title)}</b><br>סה״כ: ${escapeHtml(p.total)}<br>מועד: ${escapeHtml(p.signedAt)}</p>
<p><a href="${base}/admin/leads/${p.leadId}/quote/${p.quoteId}">לפתיחת ההצעה באדמין</a> · <a href="${base}/admin/leads/${p.leadId}">כרטיס הליד</a></p>
</body></html>`;
}
