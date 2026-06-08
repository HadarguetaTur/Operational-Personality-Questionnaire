/**
 * responseWriter.ts — response generation agent (P4)
 *
 * Receives the classifier's analysis + state machine's next-state decision
 * and writes the actual WhatsApp message in Hadar's brand voice.
 * Does NOT change strategic decisions — only crafts the message.
 */

import { getSystemPrompt } from './prompts/salesAgentSystemPrompt';
import { getPromptForState, getFallbackForState } from './prompts/stagePrompts';
import { validateReply } from '@/lib/agents/replyValidator';
import { redactHistory } from './redact';
import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { AgentOutput, AgentAction, ExtractedFacts, AgentUsage } from './salesAgent';
import type { ClassifierOutput } from './classifier';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const WRITER_MODEL = 'openai/gpt-4.1-mini';
const MAX_RETRIES = 2;

function parseWriterOutput(raw: string): AgentOutput | null {
  try {
    const parsed = JSON.parse(raw);
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

    // Strip stray { } wrappers the LLM sometimes adds around the reply text
    const rawReply: string = parsed.reply;
    let cleanReply = rawReply.trim();
    while (cleanReply.startsWith('{') && cleanReply.endsWith('}')) {
      cleanReply = cleanReply.slice(1, -1).trim();
    }

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

function buildWriterSystemPrompt(
  nextState: string,
  knowledgeBase: string,
  classifierOutput: ClassifierOutput,
  context: Record<string, unknown>,
): string {
  const stagePrompt = getPromptForState(nextState);

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
        'last_asked_question', 'nudge'].includes(k) &&
      v != null && v !== ''
    )
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  if (scalarLines.length > 0) {
    contextSection.push(`## פרטים על הליד\n${scalarLines.join('\n')}`);
  }

  const nudge = typeof context.nudge === 'string' ? `\n\n⚠️ ${context.nudge}` : '';

  return [stagePrompt, classifierSection, knowledgeBase, ...contextSection]
    .filter(Boolean)
    .join('\n\n') + nudge;
}

export async function runResponseWriter(input: {
  history: ConversationMessage[];
  newMessage: string;
  nextState: string;
  forcedAction?: AgentAction;
  classifierOutput: ClassifierOutput;
  context: Record<string, unknown>;
}): Promise<AgentOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const { nextState, forcedAction } = input;

  const fallback = getFallbackForState(nextState);
  const FALLBACK_OUTPUT: AgentOutput = {
    reply: fallback.reply,
    action: forcedAction ?? 'continue',
    state: fallback.state,
    extracted_facts: {},
    known_facts: [],
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

  // If there's a forced action, inject it as a constraint
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
          'X-Title': 'Hadar Automations Writer',
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
        console.warn(`[responseWriter:${nextState}] Parse failed on attempt ${attempt + 1}:`, rawContent.slice(0, 200));
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      // Apply forced action/state overrides
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
          (rawUsage.prompt_tokens * 0.15 + (rawUsage.completion_tokens ?? 0) * 0.6) / 1_000_000;
        usage = {
          prompt_tokens: rawUsage.prompt_tokens,
          completion_tokens: rawUsage.completion_tokens ?? 0,
          total_tokens: rawUsage.total_tokens ?? rawUsage.prompt_tokens + (rawUsage.completion_tokens ?? 0),
          cost_usd,
        };
      }

      console.log(
        `[responseWriter:${nextState}] action=${parsed.action} | tokens=${usage?.total_tokens}`,
      );
      return { ...parsed, usage };
    } catch (err) {
      console.error(`[responseWriter:${nextState}] Fetch error on attempt ${attempt + 1}:`, err);
      if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
    }
  }

  return FALLBACK_OUTPUT;
}
