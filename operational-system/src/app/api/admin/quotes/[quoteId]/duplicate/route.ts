import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getQuoteById } from '@/lib/quotes/service';
import { getQuoteSettings } from '@/lib/quotes/settings';

const paramsSchema = z.object({ quoteId: z.string().uuid() });

/** POST — copies the quote body into a new draft (new number, no token/files). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const p = paramsSchema.safeParse(await params);
  if (!p.success) return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 });

  const src = await getQuoteById(p.data.quoteId);
  if (!src) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });

  const settings = await getQuoteSettings();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + settings.validity_days);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      lead_id: src.lead_id,
      status: 'draft',
      title: src.title,
      client_name: src.client_name,
      client_business: src.client_business,
      client_email: src.client_email,
      client_phone: src.client_phone,
      intro: src.intro,
      scope_items: src.scope_items,
      line_items: src.line_items,
      subtotal: src.subtotal,
      discount_amount: src.discount_amount,
      vat_rate: src.vat_rate,
      vat_amount: src.vat_amount,
      total: src.total,
      payment_terms: src.payment_terms,
      timeline: src.timeline,
      terms: src.terms,
      valid_until: validUntil.toISOString().slice(0, 10),
      interview_transcript: src.interview_transcript,
      collected_facts: src.collected_facts,
      ai_summary: src.ai_summary,
      created_by: auth.user.id,
    })
    .select('id')
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'שכפול נכשל' }, { status: 500 });
  return NextResponse.json({ quoteId: data.id });
}
