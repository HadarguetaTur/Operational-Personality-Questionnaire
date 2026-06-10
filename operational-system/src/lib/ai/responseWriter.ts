/**
 * responseWriter.ts — Hebrew Writer Agent (P4 refactor)
 *
 * Receives the state machine decision + specialist agents' structured analysis
 * and writes the actual WhatsApp message in Hadar's brand voice.
 *
 * Does NOT change strategic decisions — only crafts the message.
 * Specialist context (painAnalysis, fitAssessment, offerFrame, objectionResponse)
 * gives the writer concrete, grounded material to work with instead of
 * trying to derive everything from scratch in one giant prompt.
 */

import { getSystemPrompt } from './prompts/salesAgentSystemPrompt';
import { getPromptForState, getDiscStyleAddendum } from './prompts/stagePrompts';
import { validateReply } from '@/lib/agents/strategicGuardrails';
import { redactHistory } from './redact';
import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { AgentOutput, AgentAction, AgentUsage } from './salesAgent';
import type { ClassifierOutput } from './classifier';
import type { SpecialistContext } from '@/lib/agents/specialists/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const WRITER_MODEL = 'anthropic/claude-sonnet-4.6';
const MAX_RETRIES = 2;

// Shown when the AI call fails outright — honest, hands off to Hadar.
export const BOT_UNAVAILABLE_MSG = 'סליחה, הבוט לא זמין כרגע. הדר תיצור איתך קשר בהקדם 🙏';

/**
 * Anthropic models via OpenRouter do not enforce response_format json_object —
 * the JSON often arrives wrapped in a ```json fence, sometimes with prose
 * before it. Extract the actual JSON object from whatever came back.
 */
function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function parseWriterOutput(raw: string): AgentOutput | null {
  try {
    const parsed = JSON.parse(extractJsonBlock(raw));
    if (typeof parsed.reply !== 'string' || typeof parsed.action !== 'string') return null;

    const validActions: AgentAction[] = [
      'continue',
      'propose_diagnostic_call',
      'propose_intro_call',
      'book_diagnostic_call',
      'book_intro_call',
      'assign_homework',
      'mark_irrelevant',
      'request_followup',
      'mark_spam',
      'human_handoff',
    ];
    if (!validActions.includes(parsed.action as AgentAction)) {
      parsed.action = 'continue';
    }

    const rawReply: string = parsed.reply;
    let cleanReply = rawReply.trim();
    while (cleanReply.startsWith('{') && cleanReply.endsWith('}')) {
      cleanReply = cleanReply.slice(1, -1).trim();
    }
    cleanReply = cleanReply.replace(/^\{+/, '').replace(/\}+$/, '').trim();

    return {
      reply: cleanReply,
      action: parsed.action as AgentAction,
      state: typeof parsed.state === 'string' ? parsed.state : 'discovery',
      extracted_facts: parsed.extracted_facts ?? {},
      known_facts: Array.isArray(parsed.known_facts)
        ? parsed.known_facts.filter((f: unknown) => typeof f === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

function buildSpecialistSection(specialistContext: SpecialistContext): string {
  const sections: string[] = [];

  if (specialistContext.painAnalysis) {
    const p = specialistContext.painAnalysis;
    const lines = [
      `## ניתוח כאב — תדריך לכותב (ל-internal use בלבד)`,
      `כאב במילות הלקוחה: ${p.exact_words}`,
      `השפעה עסקית: ${p.business_impact}`,
      `עומק הבנה: ${p.depth}`,
      `כאב תהליכי: ${p.is_process_pain ? 'כן' : 'לא — עדיין רגשי/כללי'}`,
    ];
    if (p.missing_info.length > 0) {
      lines.push(`מידע חסר: ${p.missing_info.join(', ')}`);
    }
    sections.push(lines.join('\n'));
  }

  if (specialistContext.fitAssessment) {
    const f = specialistContext.fitAssessment;
    const lines = [
      `## הערכת fit — תדריך לכותב`,
      `fit_score: ${f.fit_score}/100 | clarity_score: ${f.clarity_score}/100`,
      `המלצה: ${f.recommended_next_step}`,
    ];
    if (f.fit_reasoning) lines.push(`הסבר: ${f.fit_reasoning}`);
    if (f.key_gaps.length > 0) lines.push(`פערים: ${f.key_gaps.join(', ')}`);
    sections.push(lines.join('\n'));
  }

  if (specialistContext.offerFrame) {
    const o = specialistContext.offerFrame;
    const lines = [
      `## מסגרת הצעה — תדריך לכותב`,
      `שיקוף כאב (השתמשי בניסוח הזה): ${o.pain_mirror}`,
      `טרנספורמציה: ${o.transformation}`,
      `סוג שיחה מוצעת: ${o.call_type ?? 'לא הוחלט'}`,
    ];
    if (o.why_now) lines.push(`למה עכשיו: ${o.why_now}`);
    sections.push(lines.join('\n'));
  }

  if (specialistContext.objectionResponse) {
    const obj = specialistContext.objectionResponse;
    const lines = [
      `## אסטרטגיית התנגדות — תדריך לכותב`,
      `אישור: ${obj.acknowledgment}`,
      `מסגור מחדש: ${obj.reframe}`,
      `סגירה רכה: ${obj.soft_close}`,
    ];
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

function buildWriterSystemPrompt(
  nextState: string,
  knowledgeBase: string,
  classifierOutput: ClassifierOutput,
  context: Record<string, unknown>,
  specialistContext: SpecialistContext,
): string {
  const stagePrompt = getPromptForState(nextState);

  const specialistSection = buildSpecialistSection(specialistContext);

  const classifierSection = [
    `## ניתוח הסיווג (לשימוש פנימי בלבד — אל תחזיר את זה בתשובה)`,
    `intent: ${classifierOutput.intent} (confidence: ${classifierOutput.confidence})`,
    `sentiment: ${classifierOutput.sentiment}`,
    classifierOutput.is_objection ? `objection_type: ${classifierOutput.objection_type ?? 'general'}` : '',
    classifierOutput.missing_slots.length > 0
      ? `missing_slots: ${classifierOutput.missing_slots.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const contextSection: string[] = [];
  if (context.known_facts && Array.isArray(context.known_facts) && (context.known_facts as string[]).length > 0) {
    const bullets = (context.known_facts as string[]).map((f) => `• ${f}`).join('\n');
    contextSection.push(`## מה הלקוחה אמרה — ידוע ומאושר\n${bullets}`);
  }
  if (context.asked_questions && Array.isArray(context.asked_questions) && (context.asked_questions as string[]).length > 0) {
    const bullets = (context.asked_questions as string[]).map((q) => `• ${q}`).join('\n');
    contextSection.push(`## שאלות שכבר נשאלו — אסור לחזור עליהן\n${bullets}`);
  }
  const scalarLines = Object.entries(context)
    .filter(([k, v]) =>
      !['known_facts', 'asked_questions', 'opening_hook', 'offered_booking_count',
        'objection_count', 'clarification_count', 'last_intent', 'repeated_user_intent_count',
        'last_asked_question', 'nudge', 'specialist_outputs'].includes(k) &&
      v != null && v !== ''
    )
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  if (scalarLines.length > 0) {
    contextSection.push(`## פרטים על הליד\n${scalarLines.join('\n')}`);
  }

  const nudge = typeof context.nudge === 'string' ? `\n\n⚠️ ${context.nudge}` : '';
  const discAddendum = getDiscStyleAddendum(context.communication_style);

  // Must be the LAST thing in the prompt — the FORMAT block inside stagePrompt
  // gets buried under ~14K chars of KB/context and the model drifts to prose/fences.
  const formatReminder =
    '## תזכורת אחרונה — קריטי\nהחזר אך ורק אובייקט JSON תקין אחד. בלי ```, בלי טקסט לפני או אחרי ה-JSON.';

  return [stagePrompt, discAddendum, specialistSection, classifierSection, knowledgeBase, ...contextSection]
    .filter(Boolean)
    .join('\n\n') + nudge + '\n\n' + formatReminder;
}

export async function runResponseWriter(input: {
  history: ConversationMessage[];
  newMessage: string;
  nextState: string;
  forcedAction?: AgentAction;
  classifierOutput: ClassifierOutput;
  context: Record<string, unknown>;
  specialistContext?: SpecialistContext;
}): Promise<AgentOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const { nextState, forcedAction } = input;
  const specialistContext = input.specialistContext ?? {};

  // When the AI call genuinely can't produce a reply (no key / parse / validation
  // / HTTP all failed), we do NOT fake a canned marketing question. We tell the
  // truth and hand the lead to Hadar. `unavailable` is handled by the webhook.
  const FALLBACK_OUTPUT: AgentOutput = {
    reply: BOT_UNAVAILABLE_MSG,
    action: 'human_handoff',
    state: nextState,
    extracted_facts: {},
    known_facts: [],
    unavailable: true,
  };

  if (!apiKey) {
    console.error('[responseWriter] OPENROUTER_API_KEY not configured');
    return FALLBACK_OUTPUT;
  }

  const knowledgeBase = await getSystemPrompt();
  const systemPrompt = buildWriterSystemPrompt(
    nextState,
    knowledgeBase,
    input.classifierOutput,
    input.context,
    specialistContext,
  );

  const redactedHistory = redactHistory(input.history);
  const recentBotReplies = input.history
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content)
    .slice(-5);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...redactedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: input.newMessage },
  ];

  const forceInstruction = forcedAction
    ? `\n\n[OVERRIDE] action חייב להיות: ${forcedAction}. state חייב להיות: ${nextState}.`
    : '';

  if (forceInstruction) {
    messages[0] = { role: 'system', content: systemPrompt + forceInstruction };
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hadarturgemanautomations.com',
          'X-Title': 'Hadar Hebrew Writer',
        },
        body: JSON.stringify({
          model: WRITER_MODEL,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: attempt > 0 ? 250 : 500,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[responseWriter:${nextState}] OpenRouter error ${res.status}:`, errText.slice(0, 200));
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      const json = await res.json();
      const rawContent: string = json?.choices?.[0]?.message?.content ?? '';
      const parsed = parseWriterOutput(rawContent);

      if (!parsed) {
        console.warn(`[responseWriter:${nextState}] Parse failed (attempt ${attempt + 1}):`, rawContent.slice(0, 200));
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      if (forcedAction) {
        parsed.action = forcedAction;
        parsed.state = nextState;
      }

      const validation = validateReply(
        parsed.reply,
        recentBotReplies,
        Array.isArray(input.context.asked_questions) ? (input.context.asked_questions as string[]) : [],
      );
      if (!validation.valid) {
        console.warn(`[responseWriter:${nextState}] Validation failed (attempt ${attempt + 1}):`, validation.reason);
        if (attempt < MAX_RETRIES) continue;
        return FALLBACK_OUTPUT;
      }

      const rawUsage = json?.usage;
      let usage: AgentUsage | undefined;
      if (rawUsage?.prompt_tokens != null) {
        const cost_usd =
          (rawUsage.prompt_tokens * 3 + (rawUsage.completion_tokens ?? 0) * 15) / 1_000_000;
        usage = {
          prompt_tokens: rawUsage.prompt_tokens,
          completion_tokens: rawUsage.completion_tokens ?? 0,
          total_tokens: rawUsage.total_tokens ?? rawUsage.prompt_tokens + (rawUsage.completion_tokens ?? 0),
          cost_usd,
        };
      }

      console.log(`[responseWriter:${nextState}] action=${parsed.action} | tokens=${usage?.total_tokens} | specialists=${Object.keys(specialistContext).join(',') || 'none'}`);
      return { ...parsed, usage };
    } catch (err) {
      console.error(`[responseWriter:${nextState}] Fetch error (attempt ${attempt + 1}):`, err);
      if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
    }
  }

  return FALLBACK_OUTPUT;
}
