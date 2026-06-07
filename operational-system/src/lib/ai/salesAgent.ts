import { getSystemPrompt } from './prompts/salesAgentSystemPrompt';
import { getPromptForState, getFallbackForState } from './prompts/stagePrompts';
import { validateReply } from '@/lib/agents/replyValidator';
import { redactHistory } from './redact';
import { matchPersona } from './knowledge/personas';
import type { ConversationMessage } from '@/lib/db/conversationMessages';

export type AgentAction =
  | 'continue'
  | 'book_meeting'
  | 'mark_irrelevant'
  | 'request_followup'
  | 'mark_spam'
  | 'human_handoff';

export const VALID_STATES = [
  'initial',
  'discovery',
  'qualifying',
  'pitching',
  'objection',
  'booking',
  'closed',
  'irrelevant',
  'spam',
  'escalated',
] as const;

export type ConversationState = (typeof VALID_STATES)[number];

export interface ExtractedFacts {
  pain_category?: string;
  business_type?: string;
  main_challenge?: string;
  temperature?: 'cold' | 'warm' | 'hot';
}

export interface AgentUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface AgentOutput {
  reply: string;
  action: AgentAction;
  state: string;
  extracted_facts: ExtractedFacts;
  known_facts: string[];
  usage?: AgentUsage;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4.1';
const MAX_RETRIES = 2;


/**
 * Unwraps a reply that the LLM accidentally double-encoded as JSON.
 * If reply starts with '{', try to parse it and pull out the nested `reply` field.
 */
function unwrapNestedJson(reply: string): string {
  const trimmed = reply.trim();
  if (!trimmed.startsWith('{')) return reply;
  try {
    const nested = JSON.parse(trimmed);
    if (typeof nested.reply === 'string' && nested.reply.trim().length > 0) {
      return nested.reply;
    }
  } catch {
    // not valid JSON — return as-is
  }
  return reply;
}

function parseAgentOutput(raw: string): AgentOutput | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.reply !== 'string' || typeof parsed.action !== 'string') return null;

    const validActions: AgentAction[] = [
      'continue',
      'book_meeting',
      'mark_irrelevant',
      'request_followup',
      'mark_spam',
      'human_handoff',
    ];
    if (!validActions.includes(parsed.action)) return null;

    let state = typeof parsed.state === 'string' ? parsed.state : 'discovery';
    if (!VALID_STATES.includes(state as ConversationState)) {
      state = 'discovery';
    }

    return {
      reply: unwrapNestedJson(parsed.reply),
      action: parsed.action as AgentAction,
      state,
      extracted_facts: parsed.extracted_facts ?? {},
      known_facts: Array.isArray(parsed.known_facts) ? parsed.known_facts.filter((f: unknown) => typeof f === 'string') : [],
    };
  } catch {
    return null;
  }
}

function buildContextSection(
  conversationContext?: Record<string, unknown>,
): string {
  if (!conversationContext || Object.keys(conversationContext).length === 0) {
    return '';
  }

  const parts: string[] = [];

  // Render known_facts as a bullet list — structured memory of what the lead said
  const knownFacts = conversationContext.known_facts;
  if (Array.isArray(knownFacts) && knownFacts.length > 0) {
    const bullets = knownFacts.map((f) => `• ${f}`).join('\n');
    parts.push(`## מה הלקוחה אמרה — ידוע ומאושר\n${bullets}`);
  }

  // Render asked_questions as a strict prohibition list
  const askedQuestions = conversationContext.asked_questions;
  if (Array.isArray(askedQuestions) && askedQuestions.length > 0) {
    const bullets = askedQuestions.map((q) => `• ${q}`).join('\n');
    parts.push(`## שאלות שכבר נשאלו — חל איסור מוחלט לחזור עליהן\n${bullets}`);
  }

  // Render remaining scalar fields (business_type, pain_category, etc.)
  const SKIP_KEYS = new Set(['known_facts', 'asked_questions', 'opening_hook']);
  const scalarLines = Object.entries(conversationContext)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v != null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  if (scalarLines.length > 0) {
    parts.push(`## פרטים על הליד\n${scalarLines.join('\n')}`);
  }

  if (parts.length === 0) return '';
  return '\n\n' + parts.join('\n\n');
}

function buildPersonaSection(facts?: ExtractedFacts): string {
  const persona = matchPersona(facts?.business_type);
  if (!persona) return '';
  return `\n\n## שאלת גילוי מומלצת (${persona.id})\n${persona.discoveryQuestion}`;
}

async function buildSystemPrompt(
  currentState: string,
  conversationContext?: Record<string, unknown>,
  extractedFacts?: ExtractedFacts,
): Promise<string> {
  // Full per-stage prompt: contains OVERRIDE_RULE, ANTI_HALLUCINATION, stage instructions, FORMAT.
  const stagePrompt = getPromptForState(currentState);
  // Knowledge base: product info, objections, testimonials, rules — loaded from DB with 60s cache.
  const knowledgeBase = await getSystemPrompt();
  const context = buildContextSection(conversationContext);
  const persona = buildPersonaSection(extractedFacts);
  // #region agent log
  console.error(`[DEBUG-06149a:buildSystemPrompt] state=${currentState} | stageLen=${stagePrompt.length} | kbLen=${knowledgeBase.length}`);
  // #endregion
  return [stagePrompt, knowledgeBase, context, persona]
    .filter(Boolean)
    .join('\n');
}

function getRecentBotReplies(history: ConversationMessage[], limit = 5): string[] {
  return history
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content)
    .slice(-limit);
}

function normalizeState(
  parsed: AgentOutput,
  currentState: string,
): AgentOutput {
  if (!VALID_STATES.includes(parsed.state as ConversationState)) {
    parsed.state = currentState;
  }
  return parsed;
}

export async function runSalesAgent(input: {
  history: ConversationMessage[];
  newMessage: string;
  currentState?: string;
  conversationContext?: Record<string, unknown>;
}): Promise<AgentOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const currentState = input.currentState ?? 'initial';

  const stageFallback = getFallbackForState(currentState);
  // In early stages, never repeat the same message — escalate to pitching fallback instead.
  const EARLY_STAGES_SET = new Set(['initial', 'discovery', 'qualifying']);
  const FALLBACK_OUTPUT: AgentOutput = {
    reply: stageFallback.reply,
    action: 'continue',
    state: stageFallback.state,
    extracted_facts: {},
    known_facts: [],
  };
  // Pitching fallback used when discovery fallback would repeat previous reply.
  const pitchingFallback = getFallbackForState('pitching');

  if (!apiKey) {
    console.error(`[salesAgent:${currentState}] OPENROUTER_API_KEY not configured`);
    return FALLBACK_OUTPUT;
  }

  const factsFromContext: ExtractedFacts = {
    pain_category:
      typeof input.conversationContext?.pain_category === 'string'
        ? input.conversationContext.pain_category
        : undefined,
    business_type:
      typeof input.conversationContext?.business_type === 'string'
        ? input.conversationContext.business_type
        : undefined,
    main_challenge:
      typeof input.conversationContext?.main_challenge === 'string'
        ? input.conversationContext.main_challenge
        : undefined,
    temperature:
      input.conversationContext?.temperature === 'cold' ||
      input.conversationContext?.temperature === 'warm' ||
      input.conversationContext?.temperature === 'hot'
        ? input.conversationContext.temperature
        : undefined,
  };

  const systemPrompt = await buildSystemPrompt(
    currentState,
    input.conversationContext,
    factsFromContext,
  );

  const redactedHistory = redactHistory(input.history);
  const recentBotReplies = getRecentBotReplies(input.history);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...redactedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: input.newMessage },
  ];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hadarturgemanautomations.com',
          'X-Title': 'Hadar Automations Sales Agent',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: attempt > 0 ? 300 : 600,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[salesAgent:${currentState}] OpenRouter error ${res.status}:`, errText);
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      const json = await res.json();
      const rawContent: string = json?.choices?.[0]?.message?.content ?? '';
      const parsed = parseAgentOutput(rawContent);

      if (!parsed) {
        console.warn(`[salesAgent:${currentState}] Parse failed on attempt ${attempt + 1}:`, rawContent.slice(0, 200));
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      normalizeState(parsed, currentState);

      const validation = validateReply(parsed.reply, recentBotReplies);
      // #region agent log
      console.error(`[DEBUG-06149a:validator] state=${currentState} | valid=${validation.valid} | reason=${validation.reason??'ok'} | recentReplies=${recentBotReplies.length} | replySnippet=${parsed.reply.slice(0,80).replace(/\n/g,' ')}`);
      // #endregion
      if (!validation.valid) {
        console.warn(`[salesAgent:${currentState}] Reply validation failed (attempt ${attempt + 1}):`, validation.reason);
        if (attempt < MAX_RETRIES) continue;
        // All retries exhausted — choose fallback carefully to avoid repeating previous reply.
        if (EARLY_STAGES_SET.has(currentState) && recentBotReplies.length > 0) {
          // In early stages: advance to pitching rather than repeating discovery question.
          console.warn(`[salesAgent:${currentState}] All retries failed — escalating to pitching fallback`);
          return { ...pitchingFallback, action: 'continue', extracted_facts: {}, known_facts: [] };
        }
        console.warn(`[salesAgent:${currentState}] All retries failed validation — using stage fallback`);
        return FALLBACK_OUTPUT;
      }

      const rawUsage = json?.usage;
      let usage: AgentUsage | undefined;
      if (rawUsage?.prompt_tokens != null) {
        // gpt-4.1: $2/1M prompt tokens, $8/1M completion tokens
        const cost_usd =
          (rawUsage.prompt_tokens * 2 + (rawUsage.completion_tokens ?? 0) * 8) / 1_000_000;
        usage = {
          prompt_tokens: rawUsage.prompt_tokens,
          completion_tokens: rawUsage.completion_tokens ?? 0,
          total_tokens:
            rawUsage.total_tokens ??
            rawUsage.prompt_tokens + (rawUsage.completion_tokens ?? 0),
          cost_usd,
        };
      }

      console.log(
        `[salesAgent:${currentState}] action: ${parsed.action} | next: ${parsed.state} | tokens: ${usage?.total_tokens}`,
      );
      return { ...parsed, usage };
    } catch (err) {
      console.error(`[salesAgent:${currentState}] Fetch error on attempt ${attempt + 1}:`, err);
      if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
    }
  }

  return FALLBACK_OUTPUT;
}
