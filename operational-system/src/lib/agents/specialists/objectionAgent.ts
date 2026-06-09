/**
 * objectionAgent.ts — objection handling strategy specialist
 *
 * Runs only in the objection state. Analyzes the specific objection and
 * produces a structured handling strategy. Output feeds Hebrew Writer.
 */

import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { ObjectionResponse } from './types';
import type { ObjectionType } from '@/lib/ai/classifier';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OBJECTION_MODEL = 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `אתה מומחה להתמודדות עם התנגדויות מכירה. תפקידך: לייצר אסטרטגיית תגובה מותאמת לסוג ההתנגדות.

## ספריית התנגדויות
- price: "350 ש"ח זה הרבה" / "אין לי תקציב" → הדגש: שיחת אפיון (לא מכירה). מה עולה לה החודש כשהתהליך לא עובד?
- tech_fear: "אני לא מבינה בטכנולוגיה" → הדגש: אין צורך להבין טכנולוגיה. הדר עושה הכל
- not_sure: "לא בטוחה אם זה מתאים לי" → הדגש: בגלל זה יש שיחת היכרות — לבדוק יחד אם מתאים
- has_system: "יש לי כבר מה שצריך" → הדגש: מה בדיוק לא עובד בו? (שאלה, לא עימות)
- need_to_think: "צריכה לחשוב" → הדגש: כן! ולכן יש שיחה — כדי לחשוב ביחד עם מידע מלא
- no_time: "אין לי זמן עכשיו" → הדגש: בדיוק על זה אנחנו מדברות — לחסוך זמן
- want_to_build_alone: "אני בונה את זה בעצמי" → הדגש: מה כבר ניסית? (שאלה פתוחה)
- not_interested: "לא מעניין" → soft close עדין בלי לחץ

## כללים
- acknowledgment: 1 משפט שמאשר את החשש בלי להתגונן
- reframe: 1-2 משפטים שמשנים את זווית הראייה — ספציפי לכאב שתואר בשיחה
- soft_close: הצעה חוזרת ללא לחץ — לא "אני ממליצה", לא "זה בדיוק מה שאת צריכה"
- אסור: הגנה עצמית, שכנוע אגרסיבי, חזרה על ה-pitch

## פורמט — JSON בלבד
{
  "acknowledgment": "...",
  "reframe": "...",
  "soft_close": "..."
}`;

function parseObjectionResponse(raw: string): ObjectionResponse | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.acknowledgment !== 'string') return null;
    return {
      acknowledgment: parsed.acknowledgment,
      reframe: typeof parsed.reframe === 'string' ? parsed.reframe : '',
      soft_close: typeof parsed.soft_close === 'string' ? parsed.soft_close : '',
    };
  } catch {
    return null;
  }
}

export async function runObjectionAgent(input: {
  history: ConversationMessage[];
  newMessage: string;
  objectionType?: ObjectionType;
  context: Record<string, unknown>;
}): Promise<ObjectionResponse | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const factLines: string[] = [];
  if (input.objectionType) factLines.push(`סוג התנגדות: ${input.objectionType}`);
  if (input.context.main_challenge) factLines.push(`כאב שדובר: ${input.context.main_challenge}`);
  if (input.context.business_type) factLines.push(`עסק: ${input.context.business_type}`);
  if (input.context.recommended_next_step) factLines.push(`recommended_next_step: ${input.context.recommended_next_step}`);
  if (input.context.objection_count != null) factLines.push(`ניסיון מספר: ${Number(input.context.objection_count) + 1}`);

  const historySnippet = input.history
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'לקוחה' : 'בוט'}: ${m.content}`)
    .join('\n');

  const userPrompt = [
    factLines.length > 0 ? `## הקשר\n${factLines.join('\n')}` : '',
    `## שיחה\n${historySnippet}`,
    `## ההתנגדות כעת\n${input.newMessage}`,
    'ייצר אסטרטגיית תגובה. חזור JSON בלבד.',
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
        'X-Title': 'Hadar Objection Agent',
      },
      body: JSON.stringify({
        model: OBJECTION_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? '';
    const result = parseObjectionResponse(raw);

    if (result) {
      console.log(`[objectionAgent] objection_type=${input.objectionType ?? 'other'}`);
    }
    return result;
  } catch (err) {
    console.warn('[objectionAgent] failed (non-fatal):', err);
    return null;
  }
}
