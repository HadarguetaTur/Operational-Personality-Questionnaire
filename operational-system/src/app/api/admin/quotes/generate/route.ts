import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quoteGenerateSchema } from '@/lib/validation/schemas';
import { callLlmJson } from '@/lib/ai/llmClient';
import { BOT_MODELS } from '@/lib/ai/models';
import { buildGeneratorSystemPrompt } from '@/lib/ai/prompts/quotePrompts';
import { loadLeadContextForQuote } from '@/lib/quotes/leadContext';
import { catalogToPromptText, getActiveCatalog, getQuoteSettings } from '@/lib/quotes/settings';
import { quoteDraftSchema } from '@/lib/quotes/types';
import { computeTotals } from '@/lib/quotes/math';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * POST /api/admin/quotes/generate
 * Interview transcript → structured quote draft → `quotes` row (status=draft).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const parsed = quoteGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' }, { status: 400 });
  }

  const { leadId, history, collected_facts } = parsed.data;
  const lead = await loadLeadContextForQuote(leadId);
  if (!lead) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  const [catalog, settings] = await Promise.all([getActiveCatalog(), getQuoteSettings()]);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + settings.validity_days);
  const validUntilIso = validUntil.toISOString().slice(0, 10);

  const system = buildGeneratorSystemPrompt({
    lead,
    catalogText: catalogToPromptText(catalog),
    vatRate: settings.vat_rate,
    defaultPaymentTerms: settings.default_payment_terms,
    defaultTerms: settings.default_terms,
    validUntilIso,
  });

  const transcript = history
    .map((m) => `${m.role === 'user' ? 'הדר' : 'העוזרת'}: ${m.content}`)
    .join('\n');
  const factsText = collected_facts ? `\n\nעובדות שנאספו:\n${JSON.stringify(collected_facts, null, 2)}` : '';

  const result = await callLlmJson({
    model: BOT_MODELS.QUOTE_GENERATOR,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `תמליל הראיון:\n${transcript}${factsText}\n\nנסחי עכשיו את הצעת המחיר כ-JSON.` },
    ],
    schema: quoteDraftSchema,
    task: 'quote_generate',
    leadUuid: leadId,
    maxTokens: 4000,
    title: 'Hadar Quote Generator',
  });

  if (!result.ok) {
    return NextResponse.json({ error: `יצירת ההצעה נכשלה (${result.error})` }, { status: 502 });
  }

  const draft = result.data;
  const totals = computeTotals(draft.line_items, draft.discount_amount, draft.vat_rate);

  const supabase = createServiceRoleClient();
  const { data: created, error } = await supabase
    .from('quotes')
    .insert({
      lead_id: leadId,
      status: 'draft',
      title: draft.title,
      client_name: draft.client_name ?? lead.name,
      client_business: draft.client_business ?? lead.business_name,
      client_email: draft.client_email || lead.email,
      client_phone: draft.client_phone ?? lead.phone,
      intro: draft.intro ?? null,
      scope_items: draft.scope_items,
      line_items: draft.line_items,
      subtotal: totals.subtotal,
      discount_amount: totals.discount_amount,
      vat_rate: totals.vat_rate,
      vat_amount: totals.vat_amount,
      total: totals.total,
      payment_terms: draft.payment_terms ?? settings.default_payment_terms,
      timeline: draft.timeline ?? null,
      terms: draft.terms ?? settings.default_terms,
      valid_until: draft.valid_until ?? validUntilIso,
      interview_transcript: history,
      collected_facts: collected_facts ?? null,
      ai_summary: draft.ai_summary ?? null,
      created_by: auth.user.id,
    })
    .select('id')
    .single();

  if (error || !created) {
    console.error('[admin/quotes/generate] insert failed:', error);
    return NextResponse.json({ error: error?.message ?? 'שמירת ההצעה נכשלה' }, { status: 500 });
  }

  return NextResponse.json({ quoteId: created.id });
}
