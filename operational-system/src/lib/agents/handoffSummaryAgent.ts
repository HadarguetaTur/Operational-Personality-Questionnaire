import type { ConversationMessage } from '@/lib/db/conversationMessages';

export interface HandoffSummary {
  headline: string;
  summary: string;
  key_facts: string[];
  customer_reply: string;
}

const FALLBACK: HandoffSummary = {
  headline: 'ליד מבקשת לדבר עם הדר',
  summary: 'הועברה לטיפול אנושי מהבוט.',
  key_facts: [],
  customer_reply: 'הדר תחזור בקרוב 🙏',
};

export async function runHandoffSummary(input: {
  leadUuid: string;
  history: ConversationMessage[];
  reason: string;
}): Promise<HandoffSummary> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return FALLBACK;

  const transcript = input.history
    .map((m) => `${m.role === 'user' ? 'Lead' : 'Bot'}: ${m.content}`)
    .join('\n');

  const system = `את מסכמת שיחת WhatsApp לצוות פנימי בלבד.
החזר JSON: { "headline": "", "summary": "", "key_facts": [], "customer_reply": "" }
customer_reply: בעברית טבעית ורכה לליד, עד 3 משפטים:
  משפט 1 (אם יש מידע ברור על הבעיה) — שקפי בחמימות את מה שתואר.
  משפט 2 — "הדר תחזור בקרוב לשיחה אישית 🙏"
  משפט 3 — "מתי נח לך לקבל שיחה — בוקר, צהריים או ערב?"
  אם אין מידע ברור על הבעיה — התחילי ישירות ממשפט 2.
  אם בשיחה כבר נקבעה פגישה עם הדר (או שזו פנייה אחרי פגישה שהתקיימה) — דלגי על משפט 3, אל תשאלי מתי נוח; סיימי במשפט 2.
לשון הפנייה: אם ברור מהשיחה שהליד אישה — נקבה; אם גבר — זכר; אחרת נסחי בלשון ניטרלית מגדרית (שם פועל, "נוח לך", בלי תרצי/תרצה).
דוגמה: "נשמע שיש עומס אמיתי בצד הגבייה. הדר תחזור בקרוב לשיחה אישית 🙏 מתי נח לך לקבל שיחה — בוקר, צהריים או ערב?"
אל תמציא עובדות. אל תשתמשי במילה "אתגר". אל תעטפי בסוגריים מסולסלות.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `סיבת handoff: ${input.reason}\n\nשיחה:\n${transcript}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!res.ok) return FALLBACK;

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw) as Partial<HandoffSummary>;

    return {
      headline: typeof parsed.headline === 'string' ? parsed.headline : FALLBACK.headline,
      summary: typeof parsed.summary === 'string' ? parsed.summary : FALLBACK.summary,
      key_facts: Array.isArray(parsed.key_facts)
        ? parsed.key_facts.filter((f): f is string => typeof f === 'string')
        : [],
      customer_reply:
        typeof parsed.customer_reply === 'string'
          ? parsed.customer_reply
          : FALLBACK.customer_reply,
    };
  } catch (err) {
    console.error('[handoffSummaryAgent] Error:', err);
    return FALLBACK;
  }
}
