import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { quoteInterviewSchema } from '@/lib/validation/schemas';
import { callLlmJson } from '@/lib/ai/llmClient';
import { BOT_MODELS } from '@/lib/ai/models';
import { buildInterviewerSystemPrompt } from '@/lib/ai/prompts/quotePrompts';
import { loadLeadContextForQuote } from '@/lib/quotes/leadContext';
import { catalogToPromptText, getActiveCatalog } from '@/lib/quotes/settings';

export const runtime = 'nodejs';
export const maxDuration = 120;

const interviewerOutputSchema = z.object({
  reply: z.string().min(1).max(4000),
  collected_facts: z.record(z.string(), z.unknown()).default({}),
  ready_to_generate: z.boolean().default(false),
});

const OPENING_PROMPT =
  'זו תחילת הראיון. פתחי במשפט קצר ושאלי את השאלה הראשונה שחסרה (אם כבר ידוע מי הלקוח — עברי ישר לבעיה ולהיקף).';

/**
 * POST /api/admin/quotes/interview
 * One turn of the AI interview. Non-streaming: returns the assistant's next
 * message plus the running `collected_facts`.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const parsed = quoteInterviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' }, { status: 400 });
  }

  const { leadId, history, message } = parsed.data;
  const lead = await loadLeadContextForQuote(leadId);
  if (!lead) return NextResponse.json({ error: 'ליד לא נמצא' }, { status: 404 });

  const catalog = await getActiveCatalog();
  const system = buildInterviewerSystemPrompt(lead, catalogToPromptText(catalog));

  const userTurn = message?.trim() || (history.length === 0 ? OPENING_PROMPT : '');
  const messages = [
    { role: 'system' as const, content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    ...(userTurn ? [{ role: 'user' as const, content: userTurn }] : []),
  ];

  const result = await callLlmJson({
    model: BOT_MODELS.QUOTE_INTERVIEWER,
    messages,
    schema: interviewerOutputSchema,
    task: 'quote_interview',
    leadUuid: leadId,
    maxTokens: 1200,
    title: 'Hadar Quote Interviewer',
  });

  if (!result.ok) {
    return NextResponse.json({ error: `ה-AI לא זמין כרגע (${result.error})` }, { status: 502 });
  }

  return NextResponse.json({
    reply: result.data.reply,
    collected_facts: result.data.collected_facts,
    ready_to_generate: result.data.ready_to_generate,
  });
}
