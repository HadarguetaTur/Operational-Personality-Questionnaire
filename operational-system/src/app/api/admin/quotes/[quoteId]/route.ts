import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quoteDraftSchema } from '@/lib/quotes/types';
import { computeTotals } from '@/lib/quotes/math';
import { getQuoteById, getQuoteSignature, publicQuoteUrl, quotePaymentUrl } from '@/lib/quotes/service';
import { getQuoteSettings } from '@/lib/quotes/settings';
import { quoteStatusPatchSchema } from '@/lib/validation/schemas';

const paramsSchema = z.object({ quoteId: z.string().uuid() });

/** GET — quote + latest signature + settings + public URL (for the editor). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });

  const quote = await getQuoteById(p.data.quoteId);
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });
  const [signature, settings] = await Promise.all([getQuoteSignature(quote.id), getQuoteSettings()]);

  return NextResponse.json({
    quote,
    signature,
    settings,
    publicUrl: quote.access_token ? publicQuoteUrl(quote.access_token) : null,
    paymentUrl: quotePaymentUrl(quote),
  });
}

/**
 * PATCH — either the editable body (quoteDraftSchema) or a status change
 * ({ status: 'draft' | 'declined' | 'expired' }). Signed/paid quotes are locked.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const existing = await getQuoteById(p.data.quoteId);
  if (!existing) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });
  const supabase = createServiceRoleClient();

  const statusPatch = quoteStatusPatchSchema.safeParse(body);
  if (statusPatch.success) {
    if (existing.status === 'signed' || existing.status === 'paid') {
      return NextResponse.json({ error: 'הצעה חתומה לא ניתנת לשינוי סטטוס' }, { status: 409 });
    }
    const { error } = await supabase.from('quotes').update({ status: statusPatch.data.status }).eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (existing.status === 'signed' || existing.status === 'paid') {
    return NextResponse.json({ error: 'הצעה חתומה נעולה לעריכה. שכפלי אותה להצעה חדשה.' }, { status: 409 });
  }

  const parsed = quoteDraftSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: `${issue?.path.join('.')}: ${issue?.message}` }, { status: 400 });
  }
  const d = parsed.data;
  const totals = computeTotals(d.line_items, d.discount_amount, d.vat_rate);

  const { error } = await supabase
    .from('quotes')
    .update({
      title: d.title,
      client_name: d.client_name ?? null,
      client_business: d.client_business ?? null,
      client_email: d.client_email || null,
      client_phone: d.client_phone ?? null,
      intro: d.intro ?? null,
      scope_items: d.scope_items,
      line_items: d.line_items,
      subtotal: totals.subtotal,
      discount_amount: totals.discount_amount,
      vat_rate: totals.vat_rate,
      vat_amount: totals.vat_amount,
      total: totals.total,
      payment_terms: d.payment_terms ?? null,
      timeline: d.timeline ?? null,
      terms: d.terms ?? null,
      valid_until: d.valid_until ?? null,
      ai_summary: d.ai_summary ?? null,
      // Content changed after sending → the stored PDF/hash are stale.
      ...(existing.status !== 'draft' ? {} : {}),
    })
    .eq('id', existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updated = await getQuoteById(existing.id);
  return NextResponse.json({ quote: updated });
}

/** DELETE — drafts only. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });

  const existing = await getQuoteById(p.data.quoteId);
  if (!existing) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'ניתן למחוק רק טיוטות' }, { status: 409 });
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('quotes').delete().eq('id', existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
