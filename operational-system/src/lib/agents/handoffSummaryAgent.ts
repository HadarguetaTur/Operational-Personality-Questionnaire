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
  customer_reply: 'הדר תחזור אלייך בקרוב 🙏',
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
customer_reply: בדיוק 2 משפטים בעברית ללקוחה:
  משפט 1 — שקפי את האתגר העיקרי שהיא תיארה ("הבנתי שיש לך אתגר עם...").
  משפט 2 — הודיעי שהדר תחזור אלייך ("הדר תחזור אלייך בקרוב לשיחה אישית 🙏").
אם אין מידע ברור על האתגר — כתבי רק: "הדר תחזור אלייך בקרוב לשיחה אישית 🙏".
אל תמציא עובדות שלא בשיחה. אל תעטפי את הטקסט בסוגריים מסולסלות.`;

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
