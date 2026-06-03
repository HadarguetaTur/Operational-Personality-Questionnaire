import { getSystemPrompt } from './prompts/salesAgentSystemPrompt';
import type { ConversationMessage } from '@/lib/db/conversationMessages';

export type AgentAction = 'continue' | 'book_meeting' | 'mark_irrelevant' | 'request_followup' | 'mark_spam';

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

const FALLBACK_OUTPUT: AgentOutput = {
  reply: 'קיבלתי את ההודעה שלך. אחזור אליך בהקדם.',
  action: 'continue',
  state: 'discovery',
  extracted_facts: {},
};

function parseAgentOutput(raw: string): AgentOutput | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.reply !== 'string' ||
      typeof parsed.action !== 'string' ||
      typeof parsed.state !== 'string'
    ) {
      return null;
    }
    const validActions: AgentAction[] = ['continue', 'book_meeting', 'mark_irrelevant', 'request_followup', 'mark_spam'];
    if (!validActions.includes(parsed.action)) return null;

    return {
      reply: parsed.reply,
      action: parsed.action as AgentAction,
      state: parsed.state,
      extracted_facts: parsed.extracted_facts ?? {},
    };
  } catch {
    return null;
  }
}

export async function runSalesAgent(input: {
  history: ConversationMessage[];
  newMessage: string;
  leadContext?: Record<string, unknown>;
}): Promise<AgentOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error('[salesAgent] OPENROUTER_API_KEY not configured');
    return FALLBACK_OUTPUT;
  }

  const systemPrompt = await getSystemPrompt();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...input.history.map((m) => ({ role: m.role, content: m.content })),
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
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[salesAgent] OpenRouter error ${res.status}:`, errText);
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      const json = await res.json();
      const rawContent: string = json?.choices?.[0]?.message?.content ?? '';
      const parsed = parseAgentOutput(rawContent);

      if (!parsed) {
        console.warn('[salesAgent] Parse failed on attempt', attempt + 1, '— raw:', rawContent.slice(0, 200));
        if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
        continue;
      }

      // gpt-4.1-mini via OpenRouter: $0.40/1M input tokens, $1.60/1M output tokens
      const rawUsage = json?.usage;
      let usage: AgentUsage | undefined;
      if (rawUsage?.prompt_tokens != null) {
        const cost_usd =
          (rawUsage.prompt_tokens * 0.40 + (rawUsage.completion_tokens ?? 0) * 1.60) / 1_000_000;
        usage = {
          prompt_tokens: rawUsage.prompt_tokens,
          completion_tokens: rawUsage.completion_tokens ?? 0,
          total_tokens: rawUsage.total_tokens ?? rawUsage.prompt_tokens + (rawUsage.completion_tokens ?? 0),
          cost_usd,
        };
      }

      console.log('[salesAgent] action:', parsed.action, '| state:', parsed.state, '| tokens:', usage?.total_tokens);
      return { ...parsed, usage };
    } catch (err) {
      console.error('[salesAgent] Fetch error on attempt', attempt + 1, err);
      if (attempt === MAX_RETRIES) return FALLBACK_OUTPUT;
    }
  }

  return FALLBACK_OUTPUT;
}
