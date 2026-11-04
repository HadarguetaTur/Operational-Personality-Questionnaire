import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getQuoteByToken, getQuoteSignature, quotePaymentUrl } from '@/lib/quotes/service';
import { getQuoteSettings } from '@/lib/quotes/settings';

export const dynamic = 'force-dynamic';

const TEN_MIN_MS = 10 * 60 * 1000;

/**
 * GET /api/quotes/[token] — public quote for the /q/[token] page.
 * Marks first view. Never returns internal fields (transcript, facts, paths).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!checkRateLimit(request, 'quote_view', 60, TEN_MIN_MS)) {
    return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 });
  }

  const quote = await getQuoteByToken((await params).token);
  if (!quote || quote.status === 'draft') {
    return NextResponse.json({ error: 'ההצעה לא נמצאה' }, { status: 404 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const expiredByDate = quote.valid_until ? new Date(`${quote.valid_until}T23:59:59`) < now : false;
  const isLocked = quote.status === 'signed' || quote.status === 'paid';

  if (!isLocked && quote.status !== 'viewed' && quote.status === 'sent') {
    await supabase
      .from('quotes')
      .update({ status: 'viewed', viewed_at: quote.viewed_at ?? now.toISOString() })
      .eq('id', quote.id);
  } else if (!quote.viewed_at && !isLocked) {
    await supabase.from('quotes').update({ viewed_at: now.toISOString() }).eq('id', quote.id);
  }

  const [settings, signature] = await Promise.all([getQuoteSettings(), isLocked ? getQuoteSignature(quote.id) : null]);

  const {
    interview_transcript: _t,
    collected_facts: _f,
    ai_summary: _s,
    pdf_storage_path: _p,
    signed_pdf_storage_path: _sp,
    access_token: _tok,
    lead_id: _lead,
    ...publicQuote
  } = quote;

  return NextResponse.json({
    quote: {
      ...publicQuote,
      status: expiredByDate && !isLocked ? 'expired' : quote.status,
    },
    settings: {
      business_name: settings.business_name,
      business_id: settings.business_id,
      business_id_label: settings.business_id_label,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      logo_url: settings.logo_url,
      signature_consent: settings.signature_consent,
    },
    signature: signature
      ? {
          signer_name: signature.signer_name,
          signer_email: signature.signer_email,
          signer_id_number: signature.signer_id_number,
          signed_at: signature.signed_at,
          consent_text: signature.consent_text,
          document_sha256: signature.document_sha256,
          ip: null,
          user_agent: null,
          id: signature.id,
          quote_id: signature.quote_id,
          signature_image_path: '',
        }
      : null,
    paymentUrl: isLocked ? quotePaymentUrl(quote) : null,
    canSign: !isLocked && !expiredByDate && quote.status !== 'declined' && quote.status !== 'expired',
  });
}
