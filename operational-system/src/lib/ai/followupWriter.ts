/**
 * followupWriter.ts — generates a follow-up nudge in Hadar's voice.
 *
 * Unlike the old fixed REMINDER_MESSAGE, this writes a short, live message
 * grounded in what the conversation already surfaced (business, pain, name),
 * so a returning nudge sounds like Hadar — not a canned reminder.
 *
 * Returns plain text (no JSON). Falls back to a safe line on any failure.
 */

import { getSystemPrompt } from './prompts/salesAgentSystemPrompt';
import { BOT_MODELS } from './models';
import { validateReply } from '@/lib/agents/strategicGuardrails';
import { redactHistory } from './redact';
import type { ConversationMessage } from '@/lib/db/conversationMessages';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = BOT_MODELS.FOLLOWUP;

const FALLBACK_TOUCH_1 =
  'היי 🙂 חזרתי לבדוק, בא לך שנמצא ביחד זמן קצר לשיחה עם הדר?';
const FALLBACK_TOUCH_2 =
  'בוקר טוב ☀️ עדיין כאן בשבילך, אם זה רלוונטי נשמח לקבוע שיחה קצרה עם הדר.';

const RELEVANT_FACT_KEYS = [
  'name',
  'business_type',
  'main_challenge',
  'pain_category',
  'reason_for_reaching_out',
];

export async function runFollowupWriter(input: {
  history: ConversationMessage[];
  context: Record<string, unknown>;
  touch: 1 | 2;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const fallback = input.touch === 1 ? FALLBACK_TOUCH_1 : FALLBACK_TOUCH_2;
  if (!apiKey) return fallback;

  const factLines = Object.entries(input.context)
    .filter(([k, v]) => RELEVANT_FACT_KEYS.includes(k) && v != null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);

  const touchBrief =
    input.touch === 1
      ? 'זו תזכורת אחת ויחידה, בבוקר שאחרי שהשיחה דעכה בלי שנקבעה פגישה. קצרה, חמה, בלי לחץ ובלי תחושת רדיפה, מזמינה להמשיך מאיפה שעצרנו.'
      : 'זו תזכורת שנייה ואחרונה, בבוקר שאחרי. עדינה, בלי תחושת רדיפה, מזכירה שאנחנו כאן אם זה עדיין רלוונטי.';

  let knowledgeBase = '';
  try {
    knowledgeBase = await getSystemPrompt();
  } catch {
    knowledgeBase = '';
  }

  const genderLine =
    input.context.lead_gender === 'male'
      ? 'הליד הוא גבר — לפנות אליו בלשון זכר.'
      : input.context.lead_gender === 'female'
        ? 'הלידה היא אישה — לפנות אליה בלשון נקבה.'
        : 'מגדר הליד לא ידוע — לנסח בלשון ניטרלית מגדרית (שם פועל, "רוצה", "נוח לך"; בלי תרצי/תרצה, ספרי/ספר).';

  const systemPrompt = [
    'את כותבת הודעת תזכורת אחת קצרה בוואטסאפ, בקול של הדר, לליד שהשיחה איתו נקטעה בלי שנקבעה פגישה.',
    'החזירי אך ורק את טקסט ההודעה, בלי JSON, בלי מרכאות, משפט אחד עד שניים בלבד.',
    'בלי מקפים, בלי "שמחה שפנית", בלי להישמע כמו נציג אוטומטי. שאלה אחת לכל היותר.',
    'התייחסי למה שכבר עלה בשיחה כדי שזה ירגיש המשך טבעי, לא הודעה גנרית.',
    genderLine,
    touchBrief,
    factLines.length > 0 ? `מה ידוע על הליד:\n${factLines.join('\n')}` : '',
    knowledgeBase ? `## הקשר וקול המותג\n${knowledgeBase}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const redacted = redactHistory(input.history).slice(-8);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...redacted.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: '[כתבי עכשיו את הודעת התזכורת]' },
  ];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hadarturgemanautomations.com',
        'X-Title': 'Hadar Followup Writer',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        // No temperature: Opus 4.8 rejects sampling params.
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      console.warn('[followupWriter] OpenRouter error', res.status);
      return fallback;
    }

    const json = await res.json();
    let text: string = (json?.choices?.[0]?.message?.content ?? '').trim();
    // Strip wrapping quotes/backticks the model sometimes adds.
    text = text.replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim();
    if (!text) return fallback;

    const recentBotReplies = input.history
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content)
      .slice(-5);
    const validation = validateReply(text, recentBotReplies, []);
    if (!validation.valid) {
      console.warn('[followupWriter] validation failed:', validation.reason);
      return fallback;
    }

    return text;
  } catch (err) {
    console.warn('[followupWriter] fetch error:', err);
    return fallback;
  }
}
