import { getSystemPrompt } from './prompts/salesAgentSystemPrompt';
import { getStageDirective, getFallbackForState } from './prompts/stagePrompts';
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
  usage?: AgentUsage;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4.1-mini';
const MAX_RETRIES = 2;

const OVERRIDE_RULE = `## כלל עקיפה — עדיפות מוחלטת
אם המשתמשת ביקשה פגישה / גישת אפיון / קישור → action: book_meeting, state: booking
אם מתוסכלת ("חופרת", "מספיק שאלות") → book_meeting או human_handoff
אסור לומר "לא ראיתי תשובה" — אף פעם.`;

const FORMAT_SECTION = `## פורמט — JSON בלבד
{
  "reply": "טקסט ללקוחה",
  "action": "continue | book_meeting | mark_irrelevant | request_followup | mark_spam | human_handoff",
  "state": "initial | discovery | qualifying | pitching | objection | booking | closed | irrelevant | spam | escalated",
  "extracted_facts": {
    "pain_category": "leads_followup | scheduling | overload | conversion | process | trust | other",
    "business_type": "",
    "main_challenge": "",
    "temperature": "cold | warm | hot"
  }
}`;

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
      reply: parsed.reply,
      action: parsed.action as AgentAction,
      state,
      extracted_facts: parsed.extracted_facts ?? {},
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
  const lines = Object.entries(conversationContext)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  if (lines.length === 0) return '';
  return `\n\n## מה כבר ידוע על הליד\n${lines.join('\n')}`;
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
  const base = await getSystemPrompt();
  const directive = getStageDirective(currentState);
  const context = buildContextSection(conversationContext);
  const persona = buildPersonaSection(extractedFacts);

  return [OVERRIDE_RULE, base, `\n## שלב נוכחי\n${directive}`, context, persona, FORMAT_SECTION]
    .filter(Boolean)
    .join('\n');
}

function getPreviousBotReply(history: ConversationMessage[]): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant') return history[i].content;
  }
  return undefined;
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
  const FALLBACK_OUTPUT: AgentOutput = {
    reply: stageFallback.reply,
    action: 'continue',
    state: stageFallback.state,
    extracted_facts: {},
  };

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
  const previousBotReply = getPreviousBotReply(input.history);

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
          temperature: 0.3,
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

      const validation = validateReply(parsed.reply, previousBotReply);
      if (!validation.valid && attempt < MAX_RETRIES) {
        console.warn(`[salesAgent:${currentState}] Reply validation failed:`, validation.reason);
        continue;
      }

      const rawUsage = json?.usage;
      let usage: AgentUsage | undefined;
      if (rawUsage?.prompt_tokens != null) {
        const cost_usd =
          (rawUsage.prompt_tokens * 0.4 + (rawUsage.completion_tokens ?? 0) * 1.6) / 1_000_000;
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
