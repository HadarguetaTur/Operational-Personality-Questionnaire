import { createServiceRoleClient } from '@/lib/supabase/server';

export interface QuizIntakeResult {
  opening_hook: string;
  pre_extracted_facts: Record<string, unknown>;
}

const FALLBACK: QuizIntakeResult = {
  opening_hook: 'ראיתי שסיימת את השאלון — ספרי לי, מה הכי דחוף לך עכשיו בעסק?',
  pre_extracted_facts: {},
};

export async function runQuizIntakeAgent(input: {
  leadUuid: string;
  quizAnswers?: Record<string, unknown>;
}): Promise<QuizIntakeResult> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return FALLBACK;

  const supabase = createServiceRoleClient();
  const { data: lead } = await supabase
    .from('leads')
    .select('name, conversation_context, short_quiz_answers')
    .eq('id', input.leadUuid)
    .maybeSingle();

  const answers =
    input.quizAnswers ??
    (lead?.short_quiz_answers as Record<string, unknown> | null) ??
    (lead?.conversation_context as Record<string, unknown> | null) ??
    {};

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
          {
            role: 'system',
            content: `נתח תשובות שאלון ליד. החזר JSON:
{ "opening_hook": "משפט פתיחה ל-WhatsApp", "pre_extracted_facts": { "pain_category": "", "business_type": "", "main_challenge": "", "temperature": "cold|warm|hot" } }
אל תמציא. עברית, קצר.`,
          },
          { role: 'user', content: JSON.stringify(answers) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!res.ok) return FALLBACK;

    const json = await res.json();
    const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');

    const result: QuizIntakeResult = {
      opening_hook:
        typeof parsed.opening_hook === 'string'
          ? parsed.opening_hook
          : FALLBACK.opening_hook,
      pre_extracted_facts:
        parsed.pre_extracted_facts && typeof parsed.pre_extracted_facts === 'object'
          ? parsed.pre_extracted_facts
          : {},
    };

    await supabase
      .from('leads')
      .update({
        conversation_context: {
          ...(lead?.conversation_context as Record<string, unknown> | null),
          ...result.pre_extracted_facts,
          opening_hook: result.opening_hook,
        },
      })
      .eq('id', input.leadUuid);

    return result;
  } catch (err) {
    console.error('[quizIntakeAgent] Error:', err);
    return FALLBACK;
  }
}
