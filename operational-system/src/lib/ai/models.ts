/**
 * models.ts — single source of truth for the bot's LLM model selection.
 *
 * Every bot stage (classifier, specialists, writer, handoff, quiz-intake,
 * followup) imports its model from here, so tuning a stage is a one-line change.
 * Decision (18.6): run the whole bot on Claude Opus 4.8 for the best Hebrew
 * quality. If a stage's latency or cost becomes a problem, dial just that field
 * down (e.g. CLASSIFIER → a faster tier) without touching the stage's logic.
 */

// OpenRouter slug — matches the existing `anthropic/claude-sonnet-4.6` pattern.
// VERIFY against OpenRouter's model list before deploy: a wrong slug 404s every
// call and drops the bot into its unavailable-fallback for every message.
const OPUS = 'anthropic/claude-opus-4.8';

export const BOT_MODELS = {
  WRITER: OPUS,
  CLASSIFIER: OPUS,
  PAIN_MAPPER: OPUS,
  DIAGNOSTIC_FIT: OPUS,
  OFFER_FRAMING: OPUS,
  OBJECTION: OPUS,
  HANDOFF: OPUS,
  QUIZ_INTAKE: OPUS,
  FOLLOWUP: OPUS,
} as const;

/** Claude Opus 4.8 pricing, USD per 1M tokens. */
export const OPUS_PRICING = { inPerM: 5, outPerM: 25 } as const;

/** USD cost for a single call given its token usage, at Opus 4.8 rates. */
export function computeOpusCost(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens * OPUS_PRICING.inPerM + completionTokens * OPUS_PRICING.outPerM) / 1_000_000
  );
}

/**
 * Claude via OpenRouter does NOT enforce response_format: json_object — the JSON
 * often arrives wrapped in a ```json fence, sometimes with prose around it.
 * Extract the actual JSON object from whatever came back. Shared by every stage
 * that parses a JSON reply (writer, classifier, and all specialists), so a
 * model swap to Claude never silently breaks parsing.
 */
export function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}
