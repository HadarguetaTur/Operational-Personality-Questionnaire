/**
 * painMapperAgent.ts — deep pain analysis specialist
 *
 * Runs in discovery and diagnostic states to extract a structured,
 * high-quality understanding of the lead's pain — beyond surface-level keywords.
 * Output feeds directly into Hebrew Writer for personalized, specific replies.
 */

import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { PainAnalysis } from './types';
import { BOT_MODELS, extractJsonBlock } from '@/lib/ai/models';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PAIN_MAPPER_MODEL = BOT_MODELS.PAIN_MAPPER;

const SYSTEM_PROMPT = `אתה מומחה לניתוח כאב עסקי. תפקידך: לנתח שיחה ולהחזיר JSON מובנה עם הבנה עמוקה של הכאב של הלקוחה.

## עקרונות מרכזיים
- תחושות אינן עובדות — exact_words צריך להכיל מה שנאמר בפועל, לא פרשנות שלך
- אם הלקוחה לא תיארה תהליך ממשי → is_process_pain = false, depth = 'surface'
- אין להמציא business_impact — אם לא נאמר מפורשות, הסק בזהירות מרמה 0-1

## שדות
- exact_words: ציטוט/תמצות ישיר של הכאב שהלקוחה תיארה במילותיה. לא תרגום, לא פרשנות.
- business_impact: השפעה עסקית קונקרטית — אם לא נאמרה, כתוב "לא ציין"
- depth: 'surface' = תחושה בלבד / 'medium' = ציינה סוג בעיה אך לא תהליך / 'deep' = תיארה תהליך ספציפי עם שלבים
- is_process_pain: true רק אם תיארה תהליך חוזר שיש בו שלב בעייתי, false אם רגש/תסכול כללי
- missing_info: מה עוד דרוש להבנה מלאה — רק מה שלא ידוע. מבין: ["process_flow", "business_impact", "volume", "frequency", "current_workaround", "urgency"]

## פורמט — JSON בלבד
{
  "exact_words": "...",
  "business_impact": "...",
  "depth": "surface|medium|deep",
  "is_process_pain": true,
  "missing_info": []
}`;

function parsePainAnalysis(raw: string): PainAnalysis | null {
  try {
    const parsed = JSON.parse(extractJsonBlock(raw));
    if (typeof parsed.exact_words !== 'string') return null;
    return {
      exact_words: parsed.exact_words,
      business_impact: typeof parsed.business_impact === 'string' ? parsed.business_impact : 'לא ציין',
      depth: ['surface', 'medium', 'deep'].includes(parsed.depth) ? parsed.depth : 'surface',
      is_process_pain: Boolean(parsed.is_process_pain),
      missing_info: Array.isArray(parsed.missing_info) ? parsed.missing_info : [],
    };
  } catch {
    return null;
  }
}

export async function runPainMapper(input: {
  history: ConversationMessage[];
  newMessage: string;
  context: Record<string, unknown>;
}): Promise<PainAnalysis | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const knownFacts: string[] = [];
  if (input.context.business_type) knownFacts.push(`עסק: ${input.context.business_type}`);
  if (input.context.main_challenge) knownFacts.push(`כאב ידוע: ${input.context.main_challenge}`);
  if (input.context.pain_category) knownFacts.push(`קטגוריה: ${input.context.pain_category}`);

  const historySnippet = input.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'לקוחה' : 'בוט'}: ${m.content}`)
    .join('\n');

  const userPrompt = [
    knownFacts.length > 0 ? `## ידוע כבר\n${knownFacts.join('\n')}` : '',
    `## שיחה אחרונה\n${historySnippet}`,
    `## הודעה נוכחית\n${input.newMessage}`,
    'נתח את הכאב וחזור JSON בלבד.',
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
        'X-Title': 'Hadar Pain Mapper',
      },
      body: JSON.stringify({
        model: PAIN_MAPPER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? '';
    const result = parsePainAnalysis(raw);

    if (result) {
      console.log(`[painMapper] depth=${result.depth} process=${result.is_process_pain}`);
    }
    return result;
  } catch (err) {
    console.warn('[painMapper] failed (non-fatal):', err);
    return null;
  }
}
