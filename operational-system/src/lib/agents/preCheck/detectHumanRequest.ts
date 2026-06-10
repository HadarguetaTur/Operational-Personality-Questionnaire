/**
 * detectHumanRequest — deterministic pre-check.
 *
 * Fires when the lead explicitly asks to speak with a real person / Hadar / an
 * agent, or refuses to talk to a bot. Always routes to human handoff, in ANY
 * conversation state. Separate from detectMetaFrustration (anger) — this is an
 * explicit request, not a mood.
 */

const HUMAN_REQUEST_PATTERNS = [
  /נציג/,
  /בן\s*אדם/,
  /בנאדם/,
  /אדם\s+אמיתי/,
  /מישהו\s+אמיתי/,
  /איש\s+אמיתי/,
  /לדבר\s+עם\s+(אדם|בנאדם|בן\s*אדם|מישהו|הדר|נציג)/,
  /רוצ[הי]\s+(אדם|נציג|הדר)/,
  /תעביר[יו]?\s+אות[יי]/,
  /לא\s+(רוצה\s+)?בוט/,
  /לא\s+(רוצה|מעוניינ[ת]?)\s+(ל?דבר\s+)?(עם\s+)?(ה)?בוט/,
  /(נמאס|די|מספיק)[^.!?]{0,15}בוט/,
  /לדבר\s+עם\s+בוט/,
  /\bhuman\b/i,
  /\brepresentative\b/i,
];

export function detectHumanRequest(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  return HUMAN_REQUEST_PATTERNS.some((p) => p.test(normalized));
}
