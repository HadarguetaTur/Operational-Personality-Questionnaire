/**
 * classifier.ts — lightweight intent classifier (P4)
 *
 * Uses a cheap model (gpt-4.1-mini) to extract intent, facts, and flags
 * from the current user message in context of the conversation.
 * Does NOT write the actual reply — that is the response writer's job.
 */

import type { ConversationMessage } from '@/lib/db/conversationMessages';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CLASSIFIER_MODEL = 'openai/gpt-4.1-mini';

export type ClassifierIntent =
  | 'meeting_request'
  | 'price_inquiry'
  | 'objection'
  | 'discovery_answer'
  | 'info_request'
  | 'frustration'
  | 'opt_out'
  | 'not_relevant'
  | 'spam'
  | 'affirmative'
  | 'other';

export type ObjectionType =
  | 'price'
  | 'tech_fear'
  | 'not_sure'
  | 'has_system'
  | 'need_to_think'
  | 'no_time'
  | 'want_to_build_alone'
  | 'not_interested'
  | 'other';

export interface ClassifierOutput {
  intent: ClassifierIntent;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  is_objection: boolean;
  objection_type?: ObjectionType;
  new_facts: {
    business_type?: string;
    main_challenge?: string;
    pain_category?: string;
    temperature?: 'cold' | 'warm' | 'hot';
  };
  missing_slots: string[];
  should_handoff: boolean;
  should_offer_booking: boolean;
  is_opt_out: boolean;
}

const CLASSIFIER_SYSTEM_PROMPT = `אתה מסווג שיחות לבוט מכירות בוואטסאפ. עבודתך: לנתח הודעת משתמש ולהחזיר JSON מובנה.
אסור לכתוב תשובת מכירה — רק ניתוח.

## הוראות
1. intent: מה הכוונה האמיתית של ההודעה?
   - meeting_request: בקשה מפורשת לפגישה/שיחה/קישור
   - price_inquiry: שאלה על מחיר/עלות/השקעה
   - objection: "אבל...", ספקנות, חסמים
   - discovery_answer: תשובה לשאלת גילוי (מה העסק, מה הבעיה)
   - info_request: שאלה על המוצר/שירות
   - frustration: תסכול מהשיחה / מהבוט
   - opt_out: "הסר", "עצור", "STOP", "לא רוצה הודעות"
   - not_relevant: לא קהל יעד, לא עסק שירותי, גבר, חו"ל
   - spam: פרסום, דיוג, תוכן פוגעני
   - affirmative: הסכמה ("בסדר", "כן", "בואי נקבע", "נשמע טוב")
   - other: כל שאר

2. confidence: 0-1, כמה בטוח אתה ב-intent.

3. sentiment: positive / neutral / negative

4. is_objection: true אם יש חסם שמונע מהלקוח להתקדם.

5. objection_type: אם is_objection=true, מה סוג החסם?

6. new_facts: מידע חדש שנאמר בהודעה זו (לא מה שכבר ידוע).
   - business_type: סוג העסק אם נאמר (טיפולי, עיצוב, הדרכה, ייעוץ, קייטרינג...)
   - main_challenge: הכאב שנאמר בפועל — רק אם נאמר מפורשות
   - pain_category: leads_followup | scheduling | overload | conversion | process | trust | other
   - temperature: cold | warm | hot

7. missing_slots: מה חסר כדי להתקדם?
   - "business_type" אם סוג העסק לא ידוע
   - "main_challenge" אם הכאב לא נאמר
   אל תרשום missing_slots שכבר ידועים מה-context.

8. should_handoff: true רק אם:
   - ביקשה לדבר עם אדם מפורשות
   - כאב חריג (בריאותי, משפטי, כלכלי חמור)
   - 2+ אי-הבנות ברציפות

9. should_offer_booking: true אם:
   - הכאב ברור + הלקוחה חמה
   - affirmative לאחר הצעת שיחה
   - meeting_request

10. is_opt_out: true אם זו בקשת הסרה מפורשת

## פורמט — JSON בלבד
{
  "intent": "...",
  "confidence": 0.9,
  "sentiment": "neutral",
  "is_objection": false,
  "objection_type": null,
  "new_facts": {},
  "missing_slots": [],
  "should_handoff": false,
  "should_offer_booking": false,
  "is_opt_out": false
}`;

function parseClassifierOutput(raw: string): ClassifierOutput | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.intent !== 'string') return null;
    return {
      intent: parsed.intent as ClassifierIntent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      sentiment: parsed.sentiment ?? 'neutral',
      is_objection: Boolean(parsed.is_objection),
      objection_type: parsed.objection_type ?? undefined,
      new_facts: parsed.new_facts ?? {},
      missing_slots: Array.isArray(parsed.missing_slots) ? parsed.missing_slots : [],
      should_handoff: Boolean(parsed.should_handoff),
      should_offer_booking: Boolean(parsed.should_offer_booking),
      is_opt_out: Boolean(parsed.is_opt_out),
    };
  } catch {
    return null;
  }
}

function buildUserPrompt(
  userMessage: string,
  state: string,
  context: Record<string, unknown>,
  recentHistory: ConversationMessage[],
): string {
  const contextSummary: string[] = [];
  if (context.business_type) contextSummary.push(`עסק: ${context.business_type}`);
  if (context.main_challenge) contextSummary.push(`כאב: ${context.main_challenge}`);
  if (context.pain_category) contextSummary.push(`קטגוריה: ${context.pain_category}`);

  const historySnippet = recentHistory
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'לקוחה' : 'בוט'}: ${m.content}`)
    .join('\n');

  return [
    `## מצב שיחה נוכחי: ${state}`,
    contextSummary.length > 0 ? `## ידוע\n${contextSummary.join('\n')}` : '',
    historySnippet ? `## היסטוריה אחרונה\n${historySnippet}` : '',
    `## הודעה נוכחית\n${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface ClassifierResult {
  output: ClassifierOutput;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost_usd: number };
}

export async function runClassifier(input: {
  userMessage: string;
  state: string;
  context: Record<string, unknown>;
  recentHistory: ConversationMessage[];
}): Promise<ClassifierResult> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  const defaultOutput: ClassifierOutput = {
    intent: 'other',
    confidence: 0,
    sentiment: 'neutral',
    is_objection: false,
    new_facts: {},
    missing_slots: [],
    should_handoff: false,
    should_offer_booking: false,
    is_opt_out: false,
  };

  if (!apiKey) {
    console.error('[classifier] OPENROUTER_API_KEY not configured');
    return { output: defaultOutput };
  }

  const userPrompt = buildUserPrompt(
    input.userMessage,
    input.state,
    input.context,
    input.recentHistory,
  );

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hadarturgemanautomations.com',
        'X-Title': 'Hadar Automations Classifier',
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[classifier] OpenRouter error:', res.status, errText.slice(0, 200));
      return { output: defaultOutput };
    }

    const json = await res.json();
    const rawContent: string = json?.choices?.[0]?.message?.content ?? '';
    const parsed = parseClassifierOutput(rawContent);

    if (!parsed) {
      console.warn('[classifier] Parse failed:', rawContent.slice(0, 200));
      return { output: defaultOutput };
    }

    const rawUsage = json?.usage;
    let usage: ClassifierResult['usage'];
    if (rawUsage?.prompt_tokens != null) {
      // gpt-4.1-mini: $0.15/1M prompt, $0.60/1M completion
      const cost_usd =
        (rawUsage.prompt_tokens * 0.15 + (rawUsage.completion_tokens ?? 0) * 0.6) / 1_000_000;
      usage = {
        prompt_tokens: rawUsage.prompt_tokens,
        completion_tokens: rawUsage.completion_tokens ?? 0,
        total_tokens: rawUsage.total_tokens ?? rawUsage.prompt_tokens + (rawUsage.completion_tokens ?? 0),
        cost_usd,
      };
    }

    console.log(`[classifier] intent=${parsed.intent} conf=${parsed.confidence} booking=${parsed.should_offer_booking}`);
    return { output: parsed, usage };
  } catch (err) {
    console.error('[classifier] Fetch error:', err);
    return { output: defaultOutput };
  }
}
