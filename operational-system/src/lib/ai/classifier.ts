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
  | 'process_described'
  | 'short_answer'
  | 'chaos_detected'
  | 'guidance_receptive'
  | 'guidance_resistant'
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

export type CommunicationStyle = 'red' | 'yellow' | 'green' | 'blue';

export interface ClassifierOutput {
  intent: ClassifierIntent;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  is_objection: boolean;
  objection_type?: ObjectionType;
  communication_style: CommunicationStyle | null;
  new_facts: {
    name?: string;
    business_type?: string;
    main_challenge?: string;
    pain_category?: string;
    temperature?: 'cold' | 'warm' | 'hot';
    // fit signals
    reason_for_reaching_out?: string;
    active_business?: boolean;
    problem_in_hadar_domain?: boolean;
    process_exists?: boolean;
    has_repeatability?: boolean;
    open_to_guidance?: boolean;
    bottleneck_identified?: string;
    // clarity signals
    process_flow_known?: boolean;
    gap_identified?: boolean;
    feelings_only?: boolean;
    // gender — only when unambiguous from name or self-reference
    lead_gender?: 'male' | 'female';
  };
  missing_slots: string[];
  should_handoff: boolean;
  should_offer_booking: boolean;
  is_opt_out: boolean;
}

const CLASSIFIER_SYSTEM_PROMPT = `אתה מסווג שיחות לבוט אבחון עסקי בוואטסאפ. עבודתך: לנתח הודעת משתמש ולהחזיר JSON מובנה.
אסור לכתוב תשובת מכירה — רק ניתוח.

## Core Doctrine
תחושות אינן עובדות. פתרונות אינם אבחנה.
אם המשתמשת ציינה תחושה בלבד ללא נתון תהליכי ממשי → new_facts.feelings_only = true.

## הוראות

1. intent: מה הכוונה האמיתית של ההודעה?
   - meeting_request: בקשה מפורשת לפגישה/שיחה/קישור
   - price_inquiry: שאלה על מחיר/עלות/השקעה
   - objection: "אבל...", ספקנות, חסמים
   - discovery_answer: תשובה לשאלת גילוי — מה העסק, למה פנתה
   - process_described: תיאור תהליך ממשי (לא רק תחושה) — "אני עושה X, אחר כך Y"
   - short_answer: תשובה קצרה בלבד — "כן", "לא", "אולי", "לא יודעת"
   - chaos_detected: "הכול מבולגן", "אין לי שיטה", "לא יודעת אפילו מאיפה להתחיל"
   - guidance_receptive: "אשמח לשמוע מה את חושבת", "לא בטוחה מה נכון", "אשמח להכוונה"
   - guidance_resistant: "אני יודעת בדיוק מה צריך", "רק תבצעי", "אל תשני לי כלום"
   - info_request: שאלה על המוצר/שירות של הדר
   - frustration: תסכול מהשיחה / מהבוט
   - opt_out: "הסר", "עצור", "STOP", "לא רוצה הודעות"
   - not_relevant: לא קהל יעד, חו"ל, עסק לא שירותי (גברים הם קהל לגיטימי — לא לפסול לפי מגדר)
   - spam: פרסום, דיוג, תוכן פוגעני
   - affirmative: הסכמה — "כן", "בדיוק", "נכון", "מדויק", "נשמע טוב"
   - other: כל שאר

2. confidence: 0-1

3. sentiment: positive / neutral / negative

4. is_objection: true אם יש חסם להתקדמות

5. objection_type: אם is_objection=true

6. new_facts: מידע חדש שנאמר בהודעה זו בלבד (לא מה שכבר ידוע מה-context).
   קיים:
   - name: השם הפרטי שלה אם הציגה את עצמה ("אני הדר", "קוראים לי...")
   - business_type: סוג העסק (טיפולי, עיצוב, הדרכה, ייעוץ, קייטרינג...)
   - main_challenge: הכאב שנאמר מפורשות
   - pain_category: leads_followup | scheduling | overload | conversion | process | trust | other
   - temperature: cold | warm | hot
   חדש — fit signals:
   - reason_for_reaching_out: למה פנתה דווקא לכאן (ציטוט/תמצות)
   - active_business: true אם יש עסק פעיל עם לקוחות כרגע, false אם "עדיין לא פתחתי" / "מתכוננת"
   - problem_in_hadar_domain: true רק אם הבעיה היא ניהול לידים/מעקב לקוחות/עומס על הזמן/תהליך חוזר/המרה — false אם סושיאל/עיצוב/SEO/מיתוג/פיתוח
   - process_exists: true אם תיארה תהליך שחוזר על עצמו, false אם "אין שיטה" / "הכול מבולגן"
   - has_repeatability: true אם יש pattern קבוע, false אם כל מקרה שונה לגמרי
   - open_to_guidance: true אם פתוחה לשמוע המלצה/כיוון, false אם "אני יודעת בדיוק מה צריך"
   - bottleneck_identified: צוואר הבקבוק הספציפי (מחרוזת) אם צוין מפורשות
   חדש — clarity signals:
   - process_flow_known: true אם תיארה גם איך מתחיל וגם איך נגמר התהליך
   - gap_identified: true אם ציינה גם מצב קיים וגם מצב רצוי (הפער ברור)
   - feelings_only: true אם ההודעה כוללת תחושה בלבד ללא נתון תהליכי ממשי
   - lead_gender: "male" או "female" — רק אם זה חד-משמעי מהשם שהליד מסר או מאיך שהליד מדבר על עצמו ("אני צריך" / "אני צריכה"). בספק — אל תחזיר את השדה בכלל.

7. missing_slots: מה חסר כדי להתקדם (רק מה שלא ידוע):
   - "reason_for_reaching_out", "business_type", "main_challenge", "process_flow_known", "gap_identified"

8. should_handoff: true רק אם ביקשה אדם מפורשות, כאב חריג, או 2+ אי-הבנות

9. should_offer_booking: true אם הלקוחה הביעה עניין ברור בפתרון או מוכנות להתקדם —
   "אפשר?", "אשמח", "בא לי", "איך מתחילים", "נשמע טוב", "היית רוצה ש...", או שתיארה
   במדויק מה היא רוצה שיקרה אוטומטית. false אם היא עדיין רק מתארת בעיה/תהליך בלי עניין מפורש בפתרון.

10. is_opt_out: true אם בקשת הסרה מפורשת

11. communication_style: זיהוי סגנון תקשורת (DISC) — מבוסס על כלל ההודעות בהיסטוריה.
    עדכן רק אם יש אינדיקציה ברורה; אחרת null.
    red: קצרה וישירה, "בקיצור", "כמה עולה?", ממהרת לתוצאה, מתוסכלת מהר מתהליכים ארוכים, "תני לי את התחתית"
    yellow: אנרגטית, מספרת סיפורים, "שמעי מה קרה לי", קריאות כמו "וואו!" / "מדהים!", רגשית, מילים רבות, שיתופית
    green: מחושבת, אמפתית, "אני לא רוצה ללחוץ", "נשמע טוב", מהססת, תשובות ארוכות ומדוקדקות, מחפשת ביטחון
    blue: אנליטית, שואלת שאלות טכניות ("כמה בדיוק?", "איך זה עובד?", "מה הצעדים?"), מבקשת פרטים ומספרים, ROI

## פורמט — JSON בלבד
{
  "intent": "...",
  "confidence": 0.9,
  "sentiment": "neutral",
  "is_objection": false,
  "objection_type": null,
  "communication_style": null,
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
    const VALID_STYLES = new Set<string>(['red', 'yellow', 'green', 'blue']);
    return {
      intent: parsed.intent as ClassifierIntent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      sentiment: parsed.sentiment ?? 'neutral',
      is_objection: Boolean(parsed.is_objection),
      objection_type: parsed.objection_type ?? undefined,
      communication_style: VALID_STYLES.has(parsed.communication_style)
        ? (parsed.communication_style as CommunicationStyle)
        : null,
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
  if (context.reason_for_reaching_out) contextSummary.push(`למה פנתה: ${context.reason_for_reaching_out}`);
  if (context.active_business != null) contextSummary.push(`עסק פעיל: ${context.active_business}`);
  if (context.process_exists != null) contextSummary.push(`תהליך קיים: ${context.process_exists}`);
  if (context.open_to_guidance != null) contextSummary.push(`פתוחה להכוונה: ${context.open_to_guidance}`);
  if (context.clarity_score != null) contextSummary.push(`clarity_score: ${context.clarity_score}`);
  if (context.fit_score != null) contextSummary.push(`fit_score: ${context.fit_score}`);

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
    communication_style: null,
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
