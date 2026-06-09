/**
 * strategicGuardrails.ts — deterministic safety layer
 *
 * Merges antiLoopGuard + replyValidator into a single guardrails module.
 * Everything here is deterministic — no LLM, no hallucination risk.
 *
 * Two responsibilities:
 *   1. Pre-writer: detect conversation loops and force override actions
 *   2. Post-writer: validate reply format/quality before sending
 */

import type { AgentAction } from '@/lib/ai/salesAgent';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GuardrailsContext {
  state: string;
  userMsgCount: number;
  context: Record<string, unknown>;
  recentUserMessages?: string[];
}

export interface GuardrailsOverride {
  forced_action: AgentAction;
  forced_reply: string;
  reason: string;
}

export interface ReplyValidationResult {
  valid: boolean;
  reason?: 'blocklist' | 'multiple_questions' | 'too_long' | 'too_similar' | 'question_repeated';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MEETING_KEYWORDS =
  /פגישה|לקבוע|תשלחי קישור|שלחי לינק|רוצה להתקדם|נקבע|אשמח לקבוע|בואי נקבע|רוצה לקבוע/i;

const TERMINAL_STATES = new Set(['booking', 'closed', 'escalated', 'irrelevant', 'spam', 'homework']);

const BLOCKLIST_PHRASES = [
  'אני העוזרת הדיגיטלית',
  'אני המערכת האוטומטית',
  'אני הבוט',
  'שמחה שפנית',
  'תודה ששיתפת',
  'כל ליד עולה',
  'תקבלי',
  'עבדנו עם',
  'לא ראיתי תשובה',
  'נהדר שפנית',
  'כמובן!',
  'אלינו היום',
  '--',
];

const MAX_REPLY_LENGTH = 400;

// ── Helper functions ──────────────────────────────────────────────────────────

function getCount(context: Record<string, unknown>, key: string): number {
  const v = context[key];
  return typeof v === 'number' ? v : 0;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function similarityRatio(a: string, b: string): number {
  const na = normalizeForComparison(a);
  const nb = normalizeForComparison(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function extractQuestions(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().endsWith('?'));
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(normalizeForComparison(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalizeForComparison(b).split(' ').filter(Boolean));
  if (!wordsA.size || !wordsB.size) return 0;
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  return intersection / new Set([...wordsA, ...wordsB]).size;
}

function extractQuestion(reply: string): string | null {
  const sentences = reply.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const t = s.trim();
    if (t.endsWith('?')) return t;
  }
  return null;
}

// ── Pre-writer: loop detection ────────────────────────────────────────────────

export function runGuardrailsCheck(params: GuardrailsContext): GuardrailsOverride | null {
  const { state, userMsgCount, context, recentUserMessages = [] } = params;

  const offeredBookingCount = getCount(context, 'offered_booking_count');
  const objectionCount = getCount(context, 'objection_count');
  const clarificationCount = getCount(context, 'clarification_count');
  const diagnosticTurnCount = getCount(context, 'diagnostic_turn_count');
  const clarityScore = getCount(context, 'clarity_score');

  // AL-1: Meeting keyword in awaiting_confirmation
  if (state === 'awaiting_confirmation' && recentUserMessages.some((m) => MEETING_KEYWORDS.test(m))) {
    const bookingAction: AgentAction =
      context.pending_booking_type === 'intro' ? 'book_intro_call' : 'book_diagnostic_call';
    const reply =
      context.pending_booking_type === 'intro'
        ? 'מעולה! שולחת לך עכשיו את הקישור לזום ההיכרות עם הדר 🗓️'
        : 'מעולה! שולחת לך עכשיו את הקישור לשיחת האפיון עם הדר 🗓️';
    return { forced_action: bookingAction, forced_reply: reply, reason: 'AL-1: meeting request in awaiting_confirmation' };
  }

  // AL-2: Too many clarifications
  if (clarificationCount >= 2 && !TERMINAL_STATES.has(state)) {
    return {
      forced_action: 'human_handoff',
      forced_reply: 'כדי לא לבזבז את הזמן שלך — אעביר אותך לדבר עם הדר ישירות 🙏',
      reason: `AL-2: clarification_count=${clarificationCount}`,
    };
  }

  // AL-3: Offered booking 3+ times
  if (offeredBookingCount >= 3 && !TERMINAL_STATES.has(state)) {
    return {
      forced_action: 'human_handoff',
      forced_reply: 'מבינה — אעביר את הפרטים שלך להדר ותחזור אלייך ישירות 🙏',
      reason: `AL-3: offered_booking_count=${offeredBookingCount}`,
    };
  }

  // AL-4: Stuck in objection loop
  if (objectionCount >= 2 && state === 'objection') {
    const challenge = typeof context.main_challenge === 'string' && context.main_challenge
      ? ` לגבי ${context.main_challenge}` : '';
    return {
      forced_action: 'request_followup',
      forced_reply: `מבינה${challenge}. אם בעתיד תרצי לחזור ולבדוק — אני פה 🙏`,
      reason: `AL-4: objection_count=${objectionCount}`,
    };
  }

  // AL-7a: Long diagnostic with very low clarity
  if (state === 'diagnostic' && diagnosticTurnCount >= 5 && clarityScore < 40) {
    const bizContext = typeof context.business_type === 'string' && context.business_type
      ? ` בעסק ב${context.business_type}` : '';
    return {
      forced_action: 'assign_homework',
      forced_reply: `לפני שאמשיך${bizContext}, אני רוצה לבקש ממך תרגיל קטן — שבוע אחד של יומן: כל פנייה שמגיעה, רשמי מה ביקשו, מה עשית, איפה זה נתקע. אחרי שבוע יהיה לנו הרבה יותר ברור מה לעשות. יכולה לעשות את זה?`,
      reason: `AL-7a: diagnostic_turn_count=${diagnosticTurnCount}, clarity_score=${clarityScore}`,
    };
  }

  // AL-7b: Fit clearly disqualified
  if (
    state === 'diagnostic' &&
    diagnosticTurnCount >= 3 &&
    context.problem_in_hadar_domain === false &&
    context.active_business === false
  ) {
    return {
      forced_action: 'mark_irrelevant',
      forced_reply: 'תודה שפנית — נראה שבשלב הזה אני לא הכתובת המתאימה. בהצלחה עם העסק! 🙏',
      reason: 'AL-7b: problem_in_hadar_domain=false AND active_business=false',
    };
  }

  // AL-7c: No process and no repeatability
  if (
    state === 'diagnostic' &&
    diagnosticTurnCount >= 3 &&
    context.process_exists === false &&
    context.has_repeatability === false
  ) {
    const challengeRef = typeof context.main_challenge === 'string' && context.main_challenge
      ? ` עם ${context.main_challenge}` : '';
    return {
      forced_action: 'assign_homework',
      forced_reply: `מה שאני שומעת${challengeRef} הוא שכל מקרה שונה ואין עדיין שיטה קבועה. לפני שממליצה על משהו, אני מציעה לרשום יומן שבועי — כל פנייה שמגיעה: מה ביקשו, מה עשית, מה קרה. אחרי שבוע יהיה לנו תמונה הרבה יותר ברורה. יכולה?`,
      reason: 'AL-7c: process_exists=false AND has_repeatability=false',
    };
  }

  return null;
}

// ── Discovery nudge (AL-5) ────────────────────────────────────────────────────

export function buildDiscoveryNudge(
  userMsgCount: number,
  state: string,
  context: Record<string, unknown>,
): string | null {
  if (
    userMsgCount >= 4 &&
    ['initial', 'discovery', 'diagnostic'].includes(state) &&
    !context.main_challenge &&
    !context.bottleneck_identified
  ) {
    return 'הגיעה הודעה 4+. אם עוד לא שאלת על תהליך ספציפי — שאלי "כשמגיעה פנייה, מה הצעד הראשון שאת עושה?"';
  }
  return null;
}

// ── Post-writer: reply validation ────────────────────────────────────────────

export function validateReply(
  reply: string,
  recentBotReplies?: string[],
  askedQuestions?: string[],
): ReplyValidationResult {
  const trimmed = reply.trim();
  if (!trimmed) return { valid: false, reason: 'blocklist' };

  for (const phrase of BLOCKLIST_PHRASES) {
    if (trimmed.includes(phrase)) return { valid: false, reason: 'blocklist' };
  }

  if ((trimmed.match(/\?/g) ?? []).length > 1) {
    return { valid: false, reason: 'multiple_questions' };
  }

  const bulletLines = trimmed.split('\n').filter((line) => /^[-•]\s/.test(line.trim()));
  if (bulletLines.length >= 2) return { valid: false, reason: 'blocklist' };

  if (trimmed.length > MAX_REPLY_LENGTH) return { valid: false, reason: 'too_long' };

  if (recentBotReplies) {
    for (const prev of recentBotReplies) {
      if (similarityRatio(trimmed, prev) >= 0.8) return { valid: false, reason: 'too_similar' };
    }
  }

  if (askedQuestions) {
    const newQuestions = extractQuestions(trimmed);
    for (const newQ of newQuestions) {
      for (const pastQ of askedQuestions) {
        if (wordOverlap(newQ, pastQ) >= 0.45) return { valid: false, reason: 'question_repeated' };
      }
    }
  }

  return { valid: true };
}

// ── Counter updates (called after each turn) ──────────────────────────────────

export function updateGuardrailCounters(
  context: Record<string, unknown>,
  action: AgentAction,
  state: string,
  lastReply: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (action === 'propose_diagnostic_call' || action === 'propose_intro_call') {
    patch.offered_booking_count = getCount(context, 'offered_booking_count') + 1;
  }

  if (state === 'objection') {
    patch.objection_count = getCount(context, 'objection_count') + 1;
  } else if (getCount(context, 'objection_count') > 0) {
    patch.objection_count = 0;
  }

  const question = extractQuestion(lastReply);
  if (question) {
    patch.last_asked_question = question;
    if (question === context.last_asked_question) {
      patch.clarification_count = getCount(context, 'clarification_count') + 1;
    }
    const prev = Array.isArray(context.asked_questions) ? (context.asked_questions as string[]) : [];
    if (!prev.includes(question)) {
      patch.asked_questions = [...prev, question].slice(-20);
    }
  }

  return patch;
}

// Re-export buildCounterPatch for backward-compat if needed
export function buildCounterPatch(
  key: 'offered_booking_count' | 'objection_count' | 'clarification_count',
  context: Record<string, unknown>,
): Record<string, unknown> {
  return { [key]: getCount(context, key) + 1 };
}
