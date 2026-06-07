/**
 * antiLoopGuard — deterministic loop-prevention layer.
 *
 * Runs BEFORE the LLM call. Reads from conversation context (memory) and
 * the current message count to detect loops and return hard overrides.
 *
 * Rules (AL-1 … AL-9):
 *   AL-1  User explicitly requested a meeting in any of the last 3 messages
 *         (safety net in case regex pre-check missed it) → force book_meeting.
 *   AL-2  clarification_count >= 2 → force handoff.
 *   AL-3  offered_booking_count >= 3 → force handoff (user is stuck).
 *   AL-4  objection_count >= 2 AND state == 'objection' → soft close (request_followup).
 *   AL-5  userMsgCount >= 3 AND state in {initial, discovery, qualifying}
 *         AND main_challenge is empty → nudge to pitching (not force, just signal).
 *   AL-6  userMsgCount >= 6 AND offered_booking_count == 0 → must offer booking.
 *   AL-7  repeated_user_intent_count >= 2 → must respond to that intent directly.
 *   AL-8  Bot asked the same question twice (last_asked_question repeated) → skip to next stage.
 *   AL-9  State == 'booking' or 'closed' → never ask discovery questions.
 */

import type { AgentAction } from '@/lib/ai/salesAgent';

export interface LoopContext {
  /** Current conversation state */
  state: string;
  /** Total user messages sent so far */
  userMsgCount: number;
  /** Conversation context object from bot_conversation_state */
  context: Record<string, unknown>;
  /** Last 3 user messages (most-recent last) for AL-1 check */
  recentUserMessages?: string[];
}

export interface AntiLoopOverride {
  forced_action: AgentAction;
  forced_reply: string;
  reason: string;
  /** Updated context patch to persist after override */
  context_patch?: Record<string, unknown>;
}

// Meeting keywords for AL-1 (covers common misses by regex pre-check)
const MEETING_KEYWORDS =
  /פגישה|לקבוע|תשלחי קישור|שלחי לינק|רוצה להתקדם|נקבע|אשמח לקבוע|בואי נקבע|רוצה לקבוע/i;

const EARLY_DISCOVERY_STATES = new Set(['initial', 'discovery', 'qualifying']);
const TERMINAL_STATES = new Set(['booking', 'closed', 'escalated', 'irrelevant', 'spam']);

function getCount(context: Record<string, unknown>, key: string): number {
  const v = context[key];
  return typeof v === 'number' ? v : 0;
}

/**
 * Builds a context patch that increments a numeric counter.
 */
export function buildCounterPatch(
  key: 'offered_booking_count' | 'objection_count' | 'clarification_count',
  context: Record<string, unknown>,
): Record<string, unknown> {
  return { [key]: getCount(context, key) + 1 };
}

/**
 * Returns an override if a loop condition is detected, or null if all clear.
 */
export function runAntiLoopGuard(params: LoopContext): AntiLoopOverride | null {
  const { state, userMsgCount, context, recentUserMessages = [] } = params;

  const offeredBookingCount = getCount(context, 'offered_booking_count');
  const objectionCount = getCount(context, 'objection_count');
  const clarificationCount = getCount(context, 'clarification_count');

  // AL-1: Recent user message explicitly requested a meeting
  if (
    !TERMINAL_STATES.has(state) &&
    recentUserMessages.some((m) => MEETING_KEYWORDS.test(m))
  ) {
    return {
      forced_action: 'book_meeting',
      forced_reply: 'מעולה! שולחת לך עכשיו את הקישור לשיחת ההיכרות עם הדר 🗓️',
      reason: 'AL-1: meeting request detected in recent messages',
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
      forced_reply: 'מבינה — אעביר את הפרטים שלך להדר ותחזור אלייך ישירות 🙏',
      reason: `AL-3: offered_booking_count=${offeredBookingCount}`,
    };
  }

  // AL-4: Stuck in repeated objection loop → soft close
  if (objectionCount >= 2 && state === 'objection') {
    return {
      forced_action: 'request_followup',
      forced_reply: 'מבינה לגמרי. אם בעתיד תרצי לחזור ולבדוק — אני פה 🙏',
      reason: `AL-4: objection_count=${objectionCount} in 'objection' state`,
    };
  }

  // AL-6: 6+ messages with no booking offer → must offer now
  if (
    userMsgCount >= 6 &&
    offeredBookingCount === 0 &&
    !TERMINAL_STATES.has(state)
  ) {
    return {
      forced_action: 'book_meeting',
      forced_reply:
        'הדר עוסקת בדיוק בזה — בואי נקבע שיחה קצרה של 15 דקות, חינם, ונסתכל ביחד על העסק שלך. מה את חושבת?',
      reason: `AL-6: ${userMsgCount} messages with 0 booking offers`,
    };
  }

  return null;
}

/**
 * Builds a nudge string to inject into the conversation context
 * when AL-5 applies (long discovery without articulated pain).
 */
export function buildDiscoveryNudge(
  userMsgCount: number,
  state: string,
  context: Record<string, unknown>,
): string | null {
  if (
    userMsgCount >= 3 &&
    EARLY_DISCOVERY_STATES.has(state) &&
    !context.main_challenge
  ) {
    return 'הגיעה הודעה 3+. אם הכאב ברור — עבור ל-pitching מיד. אל תשאלי שאלת גילוי נוספת.';
  }
  if (
    userMsgCount >= 6 &&
    getCount(context, 'offered_booking_count') === 0 &&
    !TERMINAL_STATES.has(state)
  ) {
    return 'הגיעה הודעה 6+. חובה להציע שיחת היכרות עכשיו — אל תשאלי שאלות נוספות.';
  }
  return null;
}

/**
 * Updates anti-loop counters in the context based on the agent's action and reply.
 * Call this AFTER the agent runs to update context for the next turn.
 */
export function updateAntiLoopCounters(
  context: Record<string, unknown>,
  action: AgentAction,
  state: string,
  lastReply: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (action === 'book_meeting') {
    patch.offered_booking_count = getCount(context, 'offered_booking_count') + 1;
  }
  if (state === 'objection') {
    patch.objection_count = getCount(context, 'objection_count') + 1;
  } else {
    // Reset objection count when we leave objection state
    if (getCount(context, 'objection_count') > 0 && state !== 'objection') {
      patch.objection_count = 0;
    }
  }

  // Track last asked question to detect AL-8 (same question twice)
  const question = extractQuestion(lastReply);
  if (question) {
    patch.last_asked_question = question;
    if (question === context.last_asked_question) {
      patch.clarification_count = getCount(context, 'clarification_count') + 1;
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
