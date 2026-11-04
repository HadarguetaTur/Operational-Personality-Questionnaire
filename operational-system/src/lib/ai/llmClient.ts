import type { ZodSchema } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { computeOpusCost, extractJsonBlock } from './models';
import type { AgentUsage } from './agentTypes';

/**
 * llmClient — shared "call OpenRouter and get validated JSON back" helper.
 *
 * Extracted from the retry/parse/usage pattern repeated in responseWriter,
 * classifier and the specialists, so new features (quote interviewer/generator)
 * don't copy it a tenth time. Every call is logged to `ai_runs`.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RETRIES = 2;

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallLlmJsonInput<T> {
  model: string;
  messages: LlmMessage[];
  schema: ZodSchema<T>;
  /** Logged to ai_runs.task */
  task: string;
  /** Logged to ai_runs.lead_uuid (required column) */
  leadUuid: string;
  maxTokens?: number;
  title?: string;
}

export type CallLlmJsonResult<T> =
  | { ok: true; data: T; usage?: AgentUsage; raw: string }
  | { ok: false; error: string };

export async function callLlmJson<T>(input: CallLlmJsonInput<T>): Promise<CallLlmJsonResult<T>> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error(`[llmClient:${input.task}] OPENROUTER_API_KEY not configured`);
    return { ok: false, error: 'OPENROUTER_API_KEY not configured' };
  }

  let lastError = 'unknown';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hadarturgemanautomations.com',
          'X-Title': input.title ?? `Hadar ${input.task}`,
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          response_format: { type: 'json_object' },
          // No temperature: Opus rejects sampling params (see responseWriter).
          max_tokens: input.maxTokens ?? 1500,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `OpenRouter ${res.status}: ${errText.slice(0, 200)}`;
        console.error(`[llmClient:${input.task}] ${lastError}`);
        continue;
      }

      const json = await res.json();
      const raw: string = json?.choices?.[0]?.message?.content ?? '';

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(extractJsonBlock(raw));
      } catch {
        lastError = 'JSON parse failed';
        console.warn(`[llmClient:${input.task}] parse failed (attempt ${attempt + 1}):`, raw.slice(0, 200));
        continue;
      }

      const validated = input.schema.safeParse(parsedJson);
      if (!validated.success) {
        lastError = `schema: ${validated.error.issues[0]?.path.join('.')} ${validated.error.issues[0]?.message}`;
        console.warn(`[llmClient:${input.task}] schema failed (attempt ${attempt + 1}):`, lastError);
        continue;
      }

      let usage: AgentUsage | undefined;
      const rawUsage = json?.usage;
      if (rawUsage?.prompt_tokens != null) {
        const completion = rawUsage.completion_tokens ?? 0;
        usage = {
          prompt_tokens: rawUsage.prompt_tokens,
          completion_tokens: completion,
          total_tokens: rawUsage.total_tokens ?? rawUsage.prompt_tokens + completion,
          cost_usd: computeOpusCost(rawUsage.prompt_tokens, completion),
        };
      }

      await recordAiRun({ leadUuid: input.leadUuid, task: input.task, model: input.model, usage });
      console.log(`[llmClient:${input.task}] ok | tokens=${usage?.total_tokens ?? '?'}`);
      return { ok: true, data: validated.data, usage, raw };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'fetch error';
      console.error(`[llmClient:${input.task}] fetch error (attempt ${attempt + 1}):`, err);
    }
  }

  return { ok: false, error: lastError };
}

async function recordAiRun(params: {
  leadUuid: string;
  task: string;
  model: string;
  usage?: AgentUsage;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('ai_runs').insert({
      lead_uuid: params.leadUuid,
      task: params.task,
      model: params.model,
      prompt_tokens: params.usage?.prompt_tokens ?? null,
      completion_tokens: params.usage?.completion_tokens ?? null,
      total_tokens: params.usage?.total_tokens ?? null,
      cost_usd: params.usage?.cost_usd ?? null,
    });
  } catch (err) {
    console.warn('[llmClient] recordAiRun failed (non-fatal):', err);
  }
}
