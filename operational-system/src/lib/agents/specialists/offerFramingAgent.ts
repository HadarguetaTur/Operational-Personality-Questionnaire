/**
 * offerFramingAgent.ts — personalized offer narrative specialist
 *
 * Runs in vision and awaiting_confirmation states.
 * Creates a personalized offer frame based on the lead's specific pain,
 * avoiding generic pitch language. Output feeds Hebrew Writer.
 */

import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { OfferFrame } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OFFER_FRAMING_MODEL = 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `אתה מומחה לניסוח הצעות ערך. תפקידך: ליצור מסגרת הצעה אישית המבוססת על הכאב הספציפי של הלקוחה.

## עקרונות
- pain_mirror: שיקוף הכאב במילות הלקוחה עצמה — לא תרגום, לא ניסוח מחדש
- transformation: תאר איך נראים החיים אחרי הפתרון — ספציפי לעסק שלה, ללא מינוח טכני (אסור: "אוטומציה", "AI", "מערכת")
- call_type: "diagnostic" אם fit_score >= 75 ו-clarity_score >= 80. "intro" אם fit >= 50. null אם לא ברור
- why_now: סיבה קונקרטית מדוע עכשיו הוא הזמן הנכון — מבוססת על מה שנאמר בשיחה

## אסור
- אסור לציין מחיר ב-transformation או why_now
- אסור להמציא פרטים שלא נאמרו
- אסור מינוח כמו: "פתרון", "סינרגיה", "אופטימיזציה", "AI מתקדם"

## פורמט — JSON בלבד
{
  "pain_mirror": "...",
  "transformation": "...",
  "call_type": "diagnostic|intro|null",
  "why_now": "..."
}`;

function parseOfferFrame(raw: string): OfferFrame | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.pain_mirror !== 'string') return null;
    return {
      pain_mirror: parsed.pain_mirror,
      transformation: typeof parsed.transformation === 'string' ? parsed.transformation : '',
      call_type: ['diagnostic', 'intro'].includes(parsed.call_type) ? parsed.call_type : null,
      why_now: typeof parsed.why_now === 'string' ? parsed.why_now : '',
    };
  } catch {
    return null;
  }
}

export async function runOfferFraming(input: {
  history: ConversationMessage[];
  context: Record<string, unknown>;
}): Promise<OfferFrame | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const factLines: string[] = [];
  if (input.context.business_type) factLines.push(`עסק: ${input.context.business_type}`);
  if (input.context.main_challenge) factLines.push(`כאב: ${input.context.main_challenge}`);
  if (input.context.pain_category) factLines.push(`קטגוריה: ${input.context.pain_category}`);
  if (input.context.bottleneck_identified) factLines.push(`צוואר בקבוק: ${input.context.bottleneck_identified}`);
  if (input.context.fit_score != null) factLines.push(`fit_score: ${input.context.fit_score}`);
  if (input.context.clarity_score != null) factLines.push(`clarity_score: ${input.context.clarity_score}`);
  if (input.context.recommended_next_step) factLines.push(`recommended_next_step: ${input.context.recommended_next_step}`);

  const historySnippet = input.history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'לקוחה' : 'בוט'}: ${m.content}`)
    .join('\n');

  const userPrompt = [
    factLines.length > 0 ? `## עובדות הליד\n${factLines.join('\n')}` : '',
    `## שיחה אחרונה\n${historySnippet}`,
    'צור מסגרת הצעה. חזור JSON בלבד.',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hadarturgemanautomations.com',
        'X-Title': 'Hadar Offer Framing',
      },
      body: JSON.stringify({
        model: OFFER_FRAMING_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? '';
    const result = parseOfferFrame(raw);

    if (result) {
      console.log(`[offerFraming] call_type=${result.call_type}`);
    }
    return result;
  } catch (err) {
    console.warn('[offerFraming] failed (non-fatal):', err);
    return null;
  }
}
