/**
 * antiLoopGuard — deterministic loop-prevention layer (v4)
 *
 * Core Doctrine: לא עוברים לשלב הבא כי עבר מספר הודעות — אלא כי הבוט מבין מספיק.
 *
 * Rules:
 *   AL-1  User requested meeting WHILE in awaiting_confirmation → fire book_*
 *         (restricted — only in awaiting_confirmation state)
 *   AL-2  clarification_count >= 2 → force handoff.
 *   AL-3  offered_booking_count >= 3 → force handoff (user stuck in loop).
 *   AL-4  objection_count >= 2 AND state == 'objection' → soft close.
 *   AL-5  userMsgCount >= 4 AND state in {discovery, diagnostic} AND no main_challenge → nudge.
 *   AL-7a diagnostic 5+ turns AND clarity_score < 40 → assign homework (can't get clarity).
 *   AL-7b diagnostic 3+ turns AND fit clearly disqualified → mark irrelevant.
 *   AL-7c diagnostic 3+ turns AND process_exists=false AND has_repeatability=false → homework.
 *
 * Removed:
 *   AL-6  (userMsgCount >= 6 → force booking) — violates Core Doctrine
 */

import type { AgentAction } from '@/lib/ai/salesAgent';

export interface LoopContext {
  state: string;
  userMsgCount: number;
  context: Record<string, unknown>;
  recentUserMessages?: string[];
}

export interface AntiLoopOverride {
  forced_action: AgentAction;
  forced_reply: string;
  reason: string;
  context_patch?: Record<string, unknown>;
}

// Meeting confirmation keywords — only relevant in awaiting_confirmation state
const MEETING_KEYWORDS =
  /פגישה|לקבוע|תשלחי קישור|שלחי לינק|רוצה להתקדם|נקבע|אשמח לקבוע|בואי נקבע|רוצה לקבוע/i;

const TERMINAL_STATES = new Set(['booking', 'closed', 'escalated', 'irrelevant', 'spam', 'homework']);

function getCount(context: Record<string, unknown>, key: string): number {
  const v = context[key];
  return typeof v === 'number' ? v : 0;
}

export function buildCounterPatch(
  key: 'offered_booking_count' | 'objection_count' | 'clarification_count',
  context: Record<string, unknown>,
): Record<string, unknown> {
  return { [key]: getCount(context, key) + 1 };
}

export function runAntiLoopGuard(params: LoopContext): AntiLoopOverride | null {
  const { state, userMsgCount, context, recentUserMessages = [] } = params;

  const offeredBookingCount = getCount(context, 'offered_booking_count');
  const objectionCount = getCount(context, 'objection_count');
  const clarificationCount = getCount(context, 'clarification_count');
  const diagnosticTurnCount = getCount(context, 'diagnostic_turn_count');
  const clarityScore = getCount(context, 'clarity_score');

  // AL-1: Meeting keyword ONLY when user is already in awaiting_confirmation
  // (prevents premature booking during discovery/diagnostic)
  if (
    state === 'awaiting_confirmation' &&
    recentUserMessages.some((m) => MEETING_KEYWORDS.test(m))
  ) {
    const bookingAction: AgentAction =
      context.pending_booking_type === 'intro' ? 'book_intro_call' : 'book_diagnostic_call';
    const reply =
      context.pending_booking_type === 'intro'
        ? 'מעולה! שולחת לך עכשיו את הקישור לזום ההיכרות עם הדר 🗓️'
        : 'מעולה! שולחת לך עכשיו את הקישור לשיחת האפיון עם הדר 🗓️';
    return {
      forced_action: bookingAction,
      forced_reply: reply,
      reason: 'AL-1: meeting request in awaiting_confirmation',
    };
  }

  // AL-2: Too many clarifications → hand off
  if (clarificationCount >= 2 && !TERMINAL_STATES.has(state)) {
    return {
      forced_action: 'human_handoff',
      forced_reply: 'כדי לא לבזבז את הזמן שלך — אעביר אותך לדבר עם הדר ישירות 🙏',
      reason: `AL-2: clarification_count=${clarificationCount}`,
    };
  }

  // AL-3: Offered booking 3+ times with no response → hand off
  if (offeredBookingCount >= 3 && !TERMINAL_STATES.has(state)) {
    return {
      forced_action: 'human_handoff',
      forced_reply: 'מבינה — אעביר את הפרטים שלך להדר והיא תחזור ישירות 🙏',
      reason: `AL-3: offered_booking_count=${offeredBookingCount}`,
    };
  }

  // AL-4: Stuck in repeated objection loop → soft close
  if (objectionCount >= 2 && state === 'objection') {
    const challenge = typeof context.main_challenge === 'string' && context.main_challenge
      ? ` לגבי ${context.main_challenge}`
      : '';
    return {
      forced_action: 'request_followup',
      forced_reply: `מבינה${challenge}. אם בעתיד זה יהיה רלוונטי שוב — אני פה 🙏`,
      reason: `AL-4: objection_count=${objectionCount} in objection state`,
    };
  }

  // AL-7a: Long diagnostic with very low clarity → homework (can't extract info)
  if (
    state === 'diagnostic' &&
    diagnosticTurnCount >= 5 &&
    clarityScore < 40
  ) {
    const bizContext = typeof context.business_type === 'string' && context.business_type
      ? ` בעסק ב${context.business_type}`
      : '';
    return {
      forced_action: 'assign_homework',
      forced_reply:
        `לפני שאמשיך${bizContext}, אני רוצה לבקש ממך תרגיל קטן — שבוע אחד של יומן: כל פנייה שמגיעה, לרשום מה ביקשו, מה נעשה, איפה זה נתקע. אחרי שבוע יהיה לנו הרבה יותר ברור מה לעשות. מתאים לך לנסות?`,
      reason: `AL-7a: diagnostic_turn_count=${diagnosticTurnCount}, clarity_score=${clarityScore} < 40`,
    };
  }

  // AL-7b: Fit clearly disqualified after a few turns → irrelevant
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

  // AL-7c: No process and no repeatability → homework
  if (
    state === 'diagnostic' &&
    diagnosticTurnCount >= 3 &&
    context.process_exists === false &&
    context.has_repeatability === false
  ) {
    const challengeRef = typeof context.main_challenge === 'string' && context.main_challenge
      ? ` עם ${context.main_challenge}`
      : '';
    return {
      forced_action: 'assign_homework',
      forced_reply:
        `מה שאני שומעת${challengeRef} הוא שכל מקרה שונה ואין עדיין שיטה קבועה. לפני שממליצה על משהו, אני מציעה לרשום יומן שבועי — כל פנייה שמגיעה: מה ביקשו, מה נעשה, מה קרה. אחרי שבוע יהיה לנו תמונה הרבה יותר ברורה. מתאים לך לנסות?`,
      reason: 'AL-7c: process_exists=false AND has_repeatability=false',
    };
  }

  return null;
}

/**
 * Builds a nudge string to inject into the conversation context.
 * AL-5: Long discovery without articulated pain/process.
 */
export function buildDiscoveryNudge(
  userMsgCount: number,
  state: string,
  context: Record<string, unknown>,
): string | null {
  const earlyStates = new Set(['initial', 'discovery', 'diagnostic']);
  if (
    userMsgCount >= 4 &&
    earlyStates.has(state) &&
    !context.main_challenge &&
    !context.bottleneck_identified
  ) {
    return 'הגיעה הודעה 4+. אם עוד לא שאלת על תהליך ספציפי — שאלי "כשמגיעה פנייה, מה הצעד הראשון שאת עושה?"';
  }
  return null;
}

/**
 * Updates anti-loop counters in the context based on the agent's action and reply.
 */
export function updateAntiLoopCounters(
  context: Record<string, unknown>,
  action: AgentAction,
  state: string,
  lastReply: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  // Track booking offers (propose actions count as offers)
  if (action === 'propose_diagnostic_call' || action === 'propose_intro_call') {
    patch.offered_booking_count = getCount(context, 'offered_booking_count') + 1;
  }

  // Objection tracking
  if (state === 'objection') {
    patch.objection_count = getCount(context, 'objection_count') + 1;
  } else if (getCount(context, 'objection_count') > 0) {
    patch.objection_count = 0;
  }

  // Track last asked question (AL-8: repeated question → clarification_count++)
  const question = extractQuestion(lastReply);
  if (question) {
    patch.last_asked_question = question;
    if (question === context.last_asked_question) {
      patch.clarification_count = getCount(context, 'clarification_count') + 1;
    }
  }

  // Add asked question to asked_questions list (for stagePrompts anti-repetition)
  if (question) {
    const prev = Array.isArray(context.asked_questions) ? (context.asked_questions as string[]) : [];
    if (!prev.includes(question)) {
      patch.asked_questions = [...prev, question].slice(-20);
    }
  }

  return patch;
}

function extractQuestion(reply: string): string | null {
  const sentences = reply.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const t = s.trim();
    if (t.endsWith('?')) return t;
  }
  return null;
}
