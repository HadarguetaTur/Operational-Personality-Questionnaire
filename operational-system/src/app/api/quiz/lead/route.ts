import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getRequestClientIp, isTurnstileEnabled, verifyTurnstileToken } from '@/lib/security/turnstile';
import { quizLeadCreateSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

const GENERIC_ERROR =
  'משהו השתבש ולא הצלחתי לשמור. אל דאגה, התשובות שלך עדיין כאן. נסי שוב בעוד רגע.';

/**
 * Creates a quiz lead on the server.
 *
 * Replaces the browser-side `create_short_quiz_lead` RPC call (the RPC is no
 * longer executable with the anon key). Adds what the RPC could not:
 *   - per-IP rate limit
 *   - Cloudflare Turnstile verification (when configured)
 *   - attribution (visitor/session/UTM) saved in the same request
 *
 * Body: { name, phone, email?, resultType, answers, marketingConsent,
 *         turnstileToken?, attribution? }
 * Returns: { token }  — the lead's report_token.
 */
export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 'quiz_lead_create', 10, 10 * 60_000)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות.' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const parsed = quizLeadCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
      { status: 400 },
    );
  }

  const { name, phone, email, resultType, answers, marketingConsent, turnstileToken, attribution } =
    parsed.data;

  if (isTurnstileEnabled()) {
    if (!turnstileToken) {
      return NextResponse.json({ error: 'נא לאמת שאינך רובוט' }, { status: 400 });
    }
    const ok = await verifyTurnstileToken(turnstileToken, getRequestClientIp(request));
    if (!ok) {
      return NextResponse.json({ error: 'אימות אבטחה נכשל. נסי שוב.' }, { status: 400 });
    }
  }

  const supabase = createServiceRoleClient();

  const { data: token, error: rpcError } = await supabase.rpc('create_short_quiz_lead', {
    p_name: name,
    p_phone: phone,
    p_email: email || null,
    p_short_result_id: resultType,
    p_answers_json: answers,
    p_marketing_consent: marketingConsent,
  });

  if (rpcError || typeof token !== 'string' || !token) {
    console.error('[quiz/lead] create_short_quiz_lead failed:', rpcError?.message);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }

  // Attribution: best-effort, never fails the request.
  if (attribution) {
    const { error: attrError } = await supabase
      .from('leads')
      .update({
        visitor_id: attribution.visitor_id ?? null,
        session_id: attribution.session_id ?? null,
        landing_referrer: attribution.landing_referrer ?? null,
        utm_source: attribution.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? null,
        utm_term: attribution.utm_term ?? null,
        utm_content: attribution.utm_content ?? null,
      })
      .eq('report_token', token);
    if (attrError) console.warn('[quiz/lead] attribution update failed:', attrError.message);
  }

  return NextResponse.json({ token });
}
