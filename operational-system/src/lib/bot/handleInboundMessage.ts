/**
 * Channel-agnostic inbound message handler — the bot's single "brain" entry.
 *
 * Extracted from the ManyChat webhook route so every channel (WhatsApp /
 * Instagram / Facebook / Web) runs the exact same conversation logic; only the
 * transport differs (the injected ChannelSender). Callers resolve identity,
 * persist the raw event, then invoke this in the background (waitUntil).
 */

import {
  saveMessage,
  getConversationHistory,
  upsertBotState,
  getBotState,
  countUserMessagesForLead,
  getRecentBotQuestions,
  acquireBotTurn,
  releaseBotTurn,
} from '@/lib/db/conversationMessages';
import { runAgentPipeline } from '@/lib/ai/agentPipeline';
import { detectMeetingIntent, detectLinkRequest } from '@/lib/agents/preCheck/detectMeetingIntent';
import { detectGenderSignal } from '@/lib/agents/preCheck/detectGender';
import { detectMetaFrustration } from '@/lib/agents/preCheck/detectMetaFrustration';
import { detectHumanRequest } from '@/lib/agents/preCheck/detectHumanRequest';
import {
  detectNotFitAudience,
  AUDIENCE_DISQUALIFY_REPLY,
} from '@/lib/agents/preCheck/audienceFilter';
import { notifySlackHandoff } from '@/lib/notifications/slackHandoff';
import { runHandoffSummary } from '@/lib/agents/handoffSummaryAgent';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';
import { isBlockedLeadName } from '@/lib/bot/nameGuard';
import { isTerminalState } from '@/lib/bot/terminalStates';
import {
  ensureLeadRow,
  markLeadMeetingBooked,
  getLeadMeeting,
  updateLeadMeeting,
  PLACEHOLDER_LEAD_NAME,
} from '@/lib/db/leadRegistry';
import {
  getAvailableSlots,
  createBooking,
  cancelBooking,
  isCalcomConfigured,
  formatSlotLabel,
  type BookingType,
  type CalSlot,
  type Daypart,
} from '@/lib/calcom/api';
import {
  buildSlotsMessage,
  parseSlotChoice,
  nextWindowFromISO,
  parseDaypart,
  isAnyDaypart,
  DAYPART_HE,
} from '@/lib/calcom/scheduling';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  CHANNEL_CAPABILITIES,
  type Channel,
  type ChannelSender,
  type OutboundMessage,
} from '@/lib/channels/types';

// Opt-out keywords — if a user sends these (standalone), close immediately.
// Works on every channel, not only via ManyChat's own opt-out mechanics.
// Bare "עזבי" is deliberately NOT here — during scheduling it means "cancel the
// booking" (STRONG_CANCEL_RE), not "never write to me again".
const OPT_OUT_REGEX =
  /^\s*(הסר|הסירי אותי|הסר אותי|עצור|עצרי|אל תשלח|אל תשלחי|stop|בטל|לא רוצה הודעות|unsubscribe|הפסיקי לשלוח|הפסק לשלוח|תפסיקי|תפסיקו|תפסיק|די|עזבי אותי|תעזבי אותי|עזוב אותי|תעזוב אותי|לא מעוניין|לא מעוניינת)\s*$/i;

// Hebrew meeting-type label for booking confirmations.
const BOOKING_HE: Record<BookingType, string> = {
  diagnostic: 'שיחת אפיון',
  intro: 'שיחת היכרות',
};

/**
 * The bot's fixed first message. Personalized with the lead's first name when
 * it's already known (e.g. the on-site chat seeds it from the quiz lead). When
 * no name is known (the WhatsApp path) the original wording is preserved exactly.
 */
export function buildFixedOpening(name?: string): string {
  const n = name?.trim();
  return n
    ? `היי ${n}, אני העוזרת הדיגיטלית של הדר אוטומציות. אני כאן כדי להכין אותך לשיחה עם הדר עצמה: נבין ביחד אם זה מתאים, ואם כן אקבע לך פגישה איתה. ואם בא לך כבר עכשיו לקבוע, פשוט תכתבי לי "רוצה לקבוע" ואדאג לזה. שנתחיל בכמה שאלות קצרות?`
    : 'היי, אני העוזרת הדיגיטלית של הדר אוטומציות. אני כאן כדי להכין אותך לשיחה עם הדר עצמה: נבין ביחד אם זה מתאים, ואם כן אקבע לך פגישה איתה. ואם בא לך כבר עכשיו לקבוע, פשוט תכתבי לי "רוצה לקבוע" ואדאג לזה. שנתחיל בכמה שאלות קצרות?';
}

// Email + "no thanks" detection for the in-chat "add to your calendar?" step.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const DECLINE_EMAIL_RE = /(לא צריך|לא צריכה|לא תודה|לא רוצה|בלי|דלגי|אין צורך|לא חשוב|לא משנה|לא נדרש|^\s*לא\s*$)/;
// Strong cancel during the email step = abort the meeting, not just skip the invite.
// NOTE: standalone "בהמשך" removed — it's ambiguous ("אשמח גם ל-X בהמשך" is NOT a cancel).
const STRONG_CANCEL_RE = /(ביטול|לבטל|בטלי|בטל את|לא עכשיו|לא כרגע|נדבר אחר כך|נדבר בהמשך|עזבי|עזוב)/;

// A lead with an already-booked meeting (state=closed) asking to cancel or move it.
const CANCEL_MEETING_RE = /(לבטל|ביטול|תבטלי|תבטל|אי אפשר להגיע|לא אגיע|לא אוכל להגיע)/;
const RESCHEDULE_MEETING_RE =
  /(לשנות|להזיז|לדחות|זמן אחר|יום אחר|מועד אחר|שעה אחרת|להחליף|להקדים|לאחר את)/;

// How long after the booked start we still treat the meeting as "happening now"
// (intro = 20 min, diagnostic = 60 min — 90 min covers both with margin).
const MEETING_OVER_BUFFER_MS = 90 * 60 * 1000;

// Channel-aware lead labels (replaces the hardcoded WhatsApp wording).
const CHANNEL_FALLBACK_NAME: Record<Channel, string> = {
  whatsapp: 'ליד מוואטסאפ',
  instagram: 'ליד מאינסטגרם',
  facebook: 'ליד מפייסבוק',
  web: 'ליד מהאתר',
};
const CHANNEL_EMAIL_PREFIX: Record<Channel, string> = {
  whatsapp: 'wa',
  instagram: 'ig',
  facebook: 'fb',
  web: 'web',
};

/** Extracts a first name from a free-text reply ("קוראים לי מיכל" → "מיכל"). */
function cleanName(message: string): string {
  let s = message.trim().replace(/[.!?,]+$/g, '').trim();
  s = s.replace(/^(היי+|שלום|היא?)\s+/i, '');
  s = s.replace(/^(קוראים לי|שמי|השם שלי(?:\s+הוא)?|אני|זה|השם)\s+/, '').trim();
  // Keep it short — a name, not a sentence.
  if (s.length > 30) s = s.split(/\s+/).slice(0, 2).join(' ');
  const candidate = s || message.trim().slice(0, 30);
  // Never accept the owner/brand name as the lead's name (this path doesn't go
  // through the classifier guard) — return '' so callers fall back to the known
  // name / channel label.
  return isBlockedLeadName(candidate) ? '' : candidate;
}

function sanitizeOutgoing(text: string): string {
  let s = text.trim();
  while (s.startsWith('{') && s.endsWith('}')) {
    s = s.slice(1, -1).trim();
  }
  // Remove lone leading { or trailing } not part of a matched pair
  s = s.replace(/^\{+/, '').replace(/\}+$/, '').trim();
  // Hadar's rule: no dashes in phrasing. Convert em/en dashes used as a
  // sentence connector to a comma so replies read conversational, not mechanical.
  s = s.replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/,\s*,/g, ',').replace(/[ \t]{2,}/g, ' ').trim();
  return s;
}

/**
 * The bubble appended to every booking proposal: an invitation to schedule
 * right here in chat — so the lead never has to know to ask for it. There is
 * deliberately NO self-service booking link anywhere: every booking goes
 * through the bot so Hadar has full tracking per lead.
 */
function buildProposalOffer(bookingType: BookingType): string | null {
  if (!isCalcomConfigured(bookingType)) return null;
  return 'אני יכולה לתאם לך את הפגישה כאן בצ\'אט, רק לכתוב לי מתי נוח: בוקר, צהריים או ערב 🙏';
}

/**
 * Extracts the first question sentence (ending with "?") from a bot reply.
 * Used to track which questions the bot has already asked.
 */
function extractQuestionFromReply(reply: string): string | null {
  const sentences = reply.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.endsWith('?')) return trimmed;
  }
  return null;
}

/**
 * Merges a newly asked question into the asked_questions array (capped at 20).
 */
function mergeAskedQuestion(
  existing: Record<string, unknown>,
  newQuestion: string | null,
): Record<string, unknown> | undefined {
  if (!newQuestion) return undefined;
  const prev = Array.isArray(existing.asked_questions)
    ? (existing.asked_questions as string[])
    : [];
  if (prev.includes(newQuestion)) return undefined;
  return { asked_questions: [...prev, newQuestion].slice(-20) };
}

/**
 * Central pre-booking guard: never create a Cal.com booking without the data
 * the flow is supposed to have collected. Email may be an explicit decline
 * (placeholder address) — that's a deliberate path, not missing data. On web,
 * a phone (or an explicit "no phone" choice) is required because the channel
 * has no proactive follow-up at all.
 */
function canCreateBooking(args: {
  channel: Channel;
  email: string;
  phone?: string;
  context: Record<string, unknown>;
}): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!args.email.trim()) missing.push('email');
  if (
    CHANNEL_CAPABILITIES[args.channel].requiresPhoneForFollowup &&
    !args.phone &&
    args.context.phone_declined !== true
  ) {
    missing.push('phone');
  }
  return { ok: missing.length === 0, missing };
}

// Eligibility buffer: don't nudge a lead who's still actively chatting. Each bot
// reply refreshes this, so the single morning cron only catches genuinely-quiet
// leads (remind_at in the past by the next daily 07:00 run = the morning after).
const FOLLOWUP_FIRST_TOUCH_MS = 3 * 60 * 60 * 1000;

/**
 * Schedules (or refreshes) the single follow-up for a lead. One nudge only,
 * sent by the daily cron the morning after the conversation went quiet.
 */
async function scheduleFollowup(leadUuid: string, step: number, remindAt: Date): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('pending_followups').upsert(
    {
      lead_uuid: leadUuid,
      remind_at: remindAt.toISOString(),
      step,
      reminder_sent: false,
      closed_at: null,
    },
    { onConflict: 'lead_uuid' },
  );
  if (error) {
    console.warn('[bot] scheduleFollowup failed (non-fatal):', error.message);
  }
}

/** Schedules the single morning follow-up (eligible 3h after going quiet). */
export async function scheduleFirstFollowup(leadUuid: string): Promise<void> {
  // Don't schedule for channels the cron can never send on (e.g. web has no
  // proactive outbound). Otherwise we'd write a row that only ever gets picked
  // up to be skipped + closed — noise in pending_followups and a wasted cron
  // pass. Same CHANNEL_CAPABILITIES source the cron uses, so no divergent logic.
  const { channel } = await getBotState(leadUuid);
  if (!CHANNEL_CAPABILITIES[channel].supportsOutboundFollowup) {
    return;
  }
  await scheduleFollowup(leadUuid, 1, new Date(Date.now() + FOLLOWUP_FIRST_TOUCH_MS));
}

/** Cancels any open follow-up — the conversation resumed or reached a terminal state. */
export async function cancelFollowup(leadUuid: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('pending_followups')
    .update({ closed_at: new Date().toISOString() })
    .eq('lead_uuid', leadUuid)
    .is('closed_at', null);
  if (error) {
    console.warn('[bot] cancelFollowup failed (non-fatal):', error.message);
  }
}

// ── Test-only conversation reset ──────────────────────────────────────────────
// The quality gate requires 10–20 test conversations, but a tester usually has
// ONE phone number — and subscriber dedup pins it to a single ongoing
// conversation. "#איפוס" / "#reset" wipes the conversation and starts fresh.
// Restricted to subscriber ids listed in BOT_TEST_SUBSCRIBER_IDS so real leads
// can never trigger it.
const RESET_COMMAND_RE = /^\s*#(reset|איפוס)\s*$/i;

function isTestSubscriber(subscriberId?: string): boolean {
  if (!subscriberId) return false;
  const allowed = (process.env.BOT_TEST_SUBSCRIBER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(subscriberId);
}

async function resetConversationForTesting(leadUuid: string): Promise<void> {
  const supa = createServiceRoleClient();
  await supa.from('conversation_messages').delete().eq('lead_uuid', leadUuid);
  await supa.from('bot_conversation_state').delete().eq('lead_uuid', leadUuid);
  await supa
    .from('pending_followups')
    .update({ closed_at: new Date().toISOString() })
    .eq('lead_uuid', leadUuid)
    .is('closed_at', null);
  // Clear booking/state leftovers so booking-flow scenarios can repeat.
  await supa
    .from('leads')
    .update({
      conversation_state: 'initial',
      conversation_context: {},
      meeting_booked_at: null,
      lead_status: 'in_progress',
    })
    .eq('id', leadUuid);
}

export interface InboundMessageArgs {
  leadUuid: string;
  /** Channel-side contact id (ManyChat subscriber). Undefined for web. */
  subscriberId?: string;
  userMessage: string;
  channel: Channel;
  sender: ChannelSender;
  phone?: string;
  /**
   * Invoked once after the reply is delivered (or fails) — carries
   * transport-specific bookkeeping like ManyChat event status updates.
   */
  onResult?: (r: { success: boolean; error?: string; messageCount: number }) => Promise<void>;
}

export async function handleInboundMessage(args: InboundMessageArgs): Promise<void> {
  const { leadUuid, subscriberId, userMessage, channel, sender, phone, onResult } = args;

  const fallbackName = CHANNEL_FALLBACK_NAME[channel];

  const save = (
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>,
  ) => saveMessage(leadUuid, subscriberId, role, content, metadata, channel);

  const setState = (state: string, contextPatch?: Record<string, unknown>) =>
    upsertBotState(leadUuid, state, contextPatch, subscriberId, channel);

  const finalize = async (messages: OutboundMessage[]) => {
    const sanitized = messages.map((m) => ({ ...m, text: sanitizeOutgoing(m.text) }));
    const r = await sender.send({ leadUuid, subscriberId, messages: sanitized });
    if (!r.success) {
      console.error(`[bot] ${channel} send failed:`, r.error);
    }
    if (onResult) {
      await onResult({ ...r, messageCount: sanitized.length }).catch((err) =>
        console.warn('[bot] onResult hook failed (non-fatal):', err),
      );
    }
  };

  try {
    console.log('[bot] handleInboundMessage: started', {
      leadUuid,
      subscriberId,
      channel,
      messageLen: userMessage.length,
    });
    // ── Test-only: "#איפוס" wipes the conversation for allowed testers ──────
    // Checked BEFORE anything is persisted so the reset command itself leaves
    // no trace in the fresh conversation.
    if (RESET_COMMAND_RE.test(userMessage) && isTestSubscriber(subscriberId)) {
      await resetConversationForTesting(leadUuid);
      await finalize([
        {
          type: 'text',
          text: 'איפוס בוצע ✅ השיחה התאפסה לגמרי. אפשר לכתוב הודעה חדשה כדי להתחיל תרחיש בדיקה מההתחלה.',
        },
      ]);
      return;
    }

    // ── Per-lead turn lock: serialize concurrent inbound messages ──────────
    // Without this, two messages arriving together (double-send, redelivery)
    // both read the same state and both reply, causing the loop and the
    // contradictory "סגרתי לך ✅" + "מתי נוח לך?" pair. Wait for any in-flight
    // turn to finish, then run against fresh state. Fail-open: if we couldn't
    // acquire within the budget (a wedged turn), proceed rather than go silent —
    // the lease auto-expires, so the bot is never permanently blocked.
    const turnAcquired = await acquireBotTurn(leadUuid);
    if (!turnAcquired) {
      console.warn('[bot] proceeding without turn lock (acquire timed out)', { leadUuid, channel });
    }

    // Document every inquiry as a lead (creates on first contact, dedup-safe).
    await ensureLeadRow(leadUuid, { subscriberId, phone, source: channel });
    await save('user', userMessage);
    await recordFunnelEvent(leadUuid, 'lead_arrived', { source: channel });
    // The lead re-engaged — cancel any pending follow-up; non-terminal replies reschedule below.
    await cancelFollowup(leadUuid);

    // ── Pre-check: opt-out ──────────────────────────────────────────────────
    if (OPT_OUT_REGEX.test(userMessage)) {
      const optOutReply = 'הוסרת מהרשימה. בהצלחה 🙏';
      await save('assistant', optOutReply, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await setState('irrelevant', { opt_out: true });
      await recordFunnelEvent(leadUuid, 'opt_out', { message: userMessage });
      await finalize([{ type: 'text', text: optOutReply }]);
      return;
    }

    const [userMsgCount, history, botStateData] = await Promise.all([
      countUserMessagesForLead(leadUuid),
      getConversationHistory(leadUuid),
      getBotState(leadUuid),
    ]);

    const currentState = botStateData.state;
    let conversationContext = botStateData.context;

    const handleHandoff = async (reason: string): Promise<string> => {
      const summary = await runHandoffSummary({ leadUuid, history, reason });
      await notifySlackHandoff({
        leadUuid,
        headline: summary.headline,
        summary: summary.summary,
        keyFacts: summary.key_facts,
      });
      await recordFunnelEvent(leadUuid, 'human_handoff_requested', { reason, channel });
      return summary.customer_reply;
    };

    // ── Pre-check: explicit request for a human / Hadar (any state) ───────────
    if (detectHumanRequest(userMessage)) {
      const reply = await handleHandoff('human_requested');
      await save('assistant', reply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await setState('escalated');
      await finalize([{ type: 'text', text: reply }]);
      return;
    }

    // Seed asked_questions from DB history for leads that pre-date the memory system.
    if (
      !Array.isArray(conversationContext.asked_questions) ||
      (conversationContext.asked_questions as string[]).length === 0
    ) {
      const seeded = await getRecentBotQuestions(leadUuid);
      if (seeded.length > 0) {
        conversationContext = { ...conversationContext, asked_questions: seeded.slice(-20) };
      }
    }

    // ── Gender detection: neutral by default, gendered once we're sure ──────
    // First-person Hebrew ("אני צריך" / "אני צריכה") is the reliable signal.
    // Persisted immediately so deterministic paths benefit on later turns too.
    if (!conversationContext.lead_gender) {
      const genderSignal = detectGenderSignal(userMessage);
      if (genderSignal) {
        conversationContext = { ...conversationContext, lead_gender: genderSignal };
        await upsertBotState(leadUuid, currentState, { lead_gender: genderSignal }, subscriberId);
      }
    }

    // ── In-chat scheduling helpers (Cal.com) ───────────────────────────────
    // ── Fetches + shows 3 slots for a daypart (null = any time) ────────────
    // Shared by the scheduling turn and by direct entry (a daypart answer to
    // the proposal bubble). `prefix` lets the caller greet first ("נעים מאוד X").
    const presentSlots = async (
      bookingType: BookingType,
      daypart: Daypart | null,
      prefix = '',
    ): Promise<void> => {
      let slots = await getAvailableSlots(bookingType, { daypart, max: 3 });
      if (slots.length === 0) {
        slots = await getAvailableSlots(bookingType, { daypart, days: 21, max: 3 });
      }
      if (slots.length === 0) {
        // Loop guard: if we already broadened to "any time" (daypart=null), or
        // this is the 2nd empty attempt, the calendar is genuinely empty →
        // hand off instead of re-asking daypart forever.
        const attempts =
          (typeof conversationContext.no_slots_attempts === 'number'
            ? conversationContext.no_slots_attempts
            : 0) + 1;
        if (daypart === null || attempts >= 2) {
          const reply =
            prefix +
            'אין לי כרגע זמנים פנויים מתאימים ביומן 🙈 הדר תיצור איתך קשר ותתאם משהו אישית בהקדם 🙏';
          await notifySlackHandoff({
            leadUuid,
            headline: 'אין זמינות ביומן',
            summary: 'תיאום ה-Cal.com לא מצא זמנים פנויים, צריך תיאום ידני מול הדר.',
            keyFacts: [],
          });
          await recordFunnelEvent(leadUuid, 'human_handoff_requested', { reason: 'no_availability', channel });
          await save('assistant', reply, {
            action: 'human_handoff',
            state: 'escalated',
          });
          await setState('escalated', { booking_in_progress: false });
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        // First empty attempt on a specific daypart — offer to try another.
        const where = `ב${DAYPART_HE[daypart]}`;
        const reply = `${prefix}אין כרגע זמנים פנויים ${where} 🙈 רוצה שאבדוק חלק אחר ביום? בוקר, צהריים או ערב?`;
        await save('assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await setState('scheduling', {
          awaiting_daypart: true,
          daypart: null,
          offered_slots: null,
          no_slots_attempts: attempts,
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }
      const listMsg = prefix + buildSlotsMessage(bookingType, slots, daypart);
      await save('assistant', listMsg, {
        action: 'continue',
        state: 'scheduling',
      });
      await setState('scheduling', {
        offered_slots: slots,
        daypart,
        awaiting_daypart: false,
        booking_in_progress: false,
      });
      await scheduleFirstFollowup(leadUuid);
      await finalize([{ type: 'text', text: listMsg }]);
    };

    // Presents real availability as a numbered list; the lead never leaves chat.
    // `opts.daypartKnown` = the lead already answered morning/noon/evening (e.g.
    // straight off the proposal bubble) — skip the daypart question entirely.
    const enterScheduling = async (
      bookingType: BookingType,
      contextPatch: Record<string, unknown>,
      opts?: { daypart?: Daypart | null; daypartKnown?: boolean },
    ): Promise<void> => {
      // No self-service link exists anymore — if Cal.com isn't configured the
      // bot can't book at all, so hand off to Hadar instead of improvising.
      if (!isCalcomConfigured(bookingType)) {
        const reply = await handleHandoff('calcom_not_configured');
        await save('assistant', reply, { action: 'human_handoff', state: 'escalated' });
        await setState('escalated', contextPatch);
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      await recordFunnelEvent(leadUuid, `${bookingType}_offered`, { in_chat: true, channel });
      // Keep a follow-up safety net in case she goes quiet mid-scheduling.
      await scheduleFirstFollowup(leadUuid);

      const knownName =
        typeof conversationContext.name === 'string' && conversationContext.name.trim();
      const daypartKnown = opts?.daypartKnown === true;

      // We book under a real name — ask it first if we don't have one yet.
      // A daypart she already gave is kept so we skip that question after the name.
      if (!knownName) {
        const reply = 'בהחלט 🙏 איך קוראים לך?';
        await save('assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await setState('scheduling', {
          ...contextPatch,
          pending_booking_type: bookingType,
          awaiting_name: true,
          awaiting_daypart: false,
          offered_slots: null,
          booking_in_progress: false,
          no_slots_attempts: 0,
          ...(daypartKnown ? { daypart: opts?.daypart ?? null, daypart_known: true } : {}),
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // Name + daypart known → straight to the slot list, no redundant question.
      if (daypartKnown) {
        await setState('scheduling', {
          ...contextPatch,
          pending_booking_type: bookingType,
          awaiting_name: false,
          awaiting_daypart: false,
          offered_slots: null,
          booking_in_progress: false,
          no_slots_attempts: 0,
        });
        await presentSlots(bookingType, opts?.daypart ?? null);
        return;
      }

      // Name known → ask the preferred part of the day; slots come after.
      const reply = 'מעולה 🙏 מתי נוח לך יותר, בוקר, צהריים או ערב?';
      await save('assistant', reply, {
        action: 'continue',
        state: 'scheduling',
      });
      await setState('scheduling', {
        ...contextPatch,
        pending_booking_type: bookingType,
        awaiting_name: false,
        awaiting_daypart: true,
        offered_slots: null,
        booking_in_progress: false,
        no_slots_attempts: 0,
      });
      await finalize([{ type: 'text', text: reply }]);
    };

    const handleSchedulingTurn = async (): Promise<void> => {
      const offered = Array.isArray(conversationContext.offered_slots)
        ? (conversationContext.offered_slots as CalSlot[])
        : [];
      const bookingType: BookingType =
        conversationContext.pending_booking_type === 'intro' ? 'intro' : 'diagnostic';
      const choice = parseSlotChoice(userMessage, offered);

      // ── Books the chosen slot with the given attendee email, then closes ──
      const executeBooking = async (slot: CalSlot, email: string): Promise<void> => {
        const supa = createServiceRoleClient();
        const { data: leadRow } = await supa
          .from('leads')
          .select('name, phone')
          .eq('id', leadUuid)
          .maybeSingle();

        const ctxName =
          typeof conversationContext.name === 'string' ? conversationContext.name.trim() : '';
        const rowName = (leadRow?.name as string | null)?.trim();
        const name =
          ctxName ||
          (rowName && rowName !== PLACEHOLDER_LEAD_NAME ? rowName : '') ||
          fallbackName;
        const bookingPhone = phone || (leadRow?.phone as string | null) || undefined;

        // Central guard: the flow should have collected everything by now.
        // A miss means a flow bug — hand off instead of booking blind.
        const guard = canCreateBooking({
          channel,
          email,
          phone: bookingPhone,
          context: conversationContext,
        });
        if (!guard.ok) {
          console.error('[bot] canCreateBooking guard blocked booking:', {
            leadUuid,
            channel,
            missing: guard.missing,
          });
          const reply = await handleHandoff(`booking_guard:${guard.missing.join(',')}`);
          await save('assistant', reply, { action: 'human_handoff', state: 'escalated' });
          await setState('escalated', { booking_in_progress: false });
          await finalize([{ type: 'text', text: reply }]);
          return;
        }

        const result = await createBooking({
          bookingType,
          startISO: slot.startISO,
          name,
          email,
          phone: bookingPhone,
          leadUuid,
        });

        if (result.ok) {
          const emailReal = !email.endsWith('@leads.hadar.local');
          const namePrefix = name && name !== fallbackName ? `${name}, ` : '';
          const lastLine = emailReal
            ? 'שלחתי אישור למייל ותזכורת תישלח לפני השיחה 🙏'
            : 'תזכורת תישלח לפני השיחה. מחכה לך 🙏';
          const reply =
            `סגרתי לך ✅\n${namePrefix}${BOOKING_HE[bookingType]} עם הדר נקבעה ל${slot.label}.\n${lastLine}`;
          await save('assistant', reply, {
            action: bookingType === 'diagnostic' ? 'book_diagnostic_call' : 'book_intro_call',
            state: 'closed',
          });
          await setState('closed', {
            booking_in_progress: false,
            awaiting_email: false,
            selected_slot: null,
            calcom_booking_uid: result.bookingUid ?? null,
            booked_slot: slot.startISO,
            offered_slots: null,
          });
          await markLeadMeetingBooked(leadUuid, {
            meetingAt: slot.startISO,
            meetingType: bookingType,
            calcomUid: result.bookingUid ?? null,
          });
          await cancelFollowup(leadUuid);
          await recordFunnelEvent(leadUuid, 'meeting_booked', {
            source: 'in_chat',
            channel,
            booking_uid: result.bookingUid ?? null,
            booking_type: bookingType,
          });
          await finalize([{ type: 'text', text: reply }]);
          return;
        }

        if (result.conflict) {
          const slots = await getAvailableSlots(bookingType, {});
          const head = 'אופס, הזמן הזה בדיוק נתפס 🙈 ';
          if (slots.length === 0) {
            const reply = head + 'הדר תיצור איתך קשר לתיאום אישי 🙏';
            await save('assistant', reply, {
              action: 'human_handoff',
              state: 'escalated',
            });
            await setState('escalated', { booking_in_progress: false });
            await finalize([{ type: 'text', text: reply }]);
            return;
          }
          const listMsg = head + '\n' + buildSlotsMessage(bookingType, slots);
          await save('assistant', listMsg, {
            action: 'continue',
            state: 'scheduling',
          });
          await setState('scheduling', {
            offered_slots: slots,
            booking_in_progress: false,
            awaiting_email: false,
            selected_slot: null,
          });
          await finalize([{ type: 'text', text: listMsg }]);
          return;
        }

        // Other API failure → hand off to Hadar.
        const handoffReply = await handleHandoff('booking_api_failure');
        const reply = handoffReply || 'נתקלתי בתקלה קטנה בקביעה, הדר תיצור קשר ותתאם אישית 🙏';
        await save('assistant', reply, {
          action: 'human_handoff',
          state: 'escalated',
        });
        await setState('escalated', { booking_in_progress: false });
        await finalize([{ type: 'text', text: reply }]);
      };

      // ── Name sub-step: captured before we ask about times ────────────────
      if (conversationContext.awaiting_name === true) {
        if (STRONG_CANCEL_RE.test(userMessage)) {
          const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
          await save('assistant', reply, {
            action: 'continue',
            state: 'awaiting_confirmation',
          });
          await setState('awaiting_confirmation', {
            awaiting_name: false,
            booking_in_progress: false,
          });
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        const name = cleanName(userMessage);
        await ensureLeadRow(leadUuid, { subscriberId, phone, name, source: channel });

        // She already told us morning/noon/evening at the proposal → go straight
        // to the slot list instead of asking again.
        if (conversationContext.daypart_known === true) {
          const dp =
            conversationContext.daypart === 'morning' ||
            conversationContext.daypart === 'noon' ||
            conversationContext.daypart === 'evening'
              ? (conversationContext.daypart as Daypart)
              : null;
          await setState('scheduling', { name, awaiting_name: false, awaiting_daypart: false });
          await presentSlots(bookingType, dp, `נעים מאוד ${name} 🙏 `);
          return;
        }

        await setState('scheduling', { name, awaiting_name: false, awaiting_daypart: true });
        const reply = `נעים מאוד ${name} 🙏 מתי נוח לך יותר, בוקר, צהריים או ערב?`;
        await save('assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // ── Daypart sub-step: morning / noon / evening ───────────────────────
      if (conversationContext.awaiting_daypart === true) {
        if (STRONG_CANCEL_RE.test(userMessage)) {
          const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
          await save('assistant', reply, {
            action: 'continue',
            state: 'awaiting_confirmation',
          });
          await setState('awaiting_confirmation', {
            awaiting_daypart: false,
            offered_slots: null,
            booking_in_progress: false,
          });
          await scheduleFirstFollowup(leadUuid);
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        if (isAnyDaypart(userMessage)) {
          await presentSlots(bookingType, null);
          return;
        }
        const dp = parseDaypart(userMessage);
        if (!dp) {
          const reply = 'רק שאדע מה הכי נוח לך, בוקר, צהריים או ערב? (אפשר גם לכתוב "לא משנה")';
          await save('assistant', reply, {
            action: 'continue',
            state: 'scheduling',
          });
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        await presentSlots(bookingType, dp);
        return;
      }

      // ── Email sub-step: "do you want it in your calendar?" answer ─────────
      // Checked BEFORE the generic cancel branch, because "לא רוצה" here means
      // "skip the invite" (book with placeholder), not "abort the meeting".
      if (conversationContext.awaiting_email === true && conversationContext.selected_slot) {
        const slot = conversationContext.selected_slot as CalSlot;
        const emailMatch = userMessage.match(EMAIL_RE);

        if (emailMatch) {
          await setState('scheduling', { awaiting_email: false, booking_in_progress: true });
          await executeBooking(slot, emailMatch[0].trim());
          return;
        }

        // Explicit abort → leave scheduling without booking.
        if (STRONG_CANCEL_RE.test(userMessage)) {
          const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
          await save('assistant', reply, {
            action: 'continue',
            state: 'awaiting_confirmation',
          });
          await setState('awaiting_confirmation', {
            offered_slots: null,
            booking_in_progress: false,
            awaiting_email: false,
            selected_slot: null,
          });
          await scheduleFirstFollowup(leadUuid);
          await finalize([{ type: 'text', text: reply }]);
          return;
        }

        if (DECLINE_EMAIL_RE.test(userMessage)) {
          // No calendar invite — book with a stable placeholder address.
          const placeholder = `${CHANNEL_EMAIL_PREFIX[channel]}-${subscriberId ?? leadUuid}@leads.hadar.local`;
          await setState('scheduling', { awaiting_email: false, booking_in_progress: true });
          await executeBooking(slot, placeholder);
          return;
        }

        // Unclear → re-ask the email question once.
        const reply =
          'רק שאדע לאן לשלוח את האישור, מה כתובת המייל שלך? (ואם לא צריך, אפשר לכתוב "לא צריך" ואני סוגרת) 🙂';
        await save('assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // ── Cancel: leave scheduling, keep the door open ─────────────────────
      if (choice.kind === 'cancel') {
        const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
        await save('assistant', reply, {
          action: 'continue',
          state: 'awaiting_confirmation',
        });
        await setState('awaiting_confirmation', {
          offered_slots: null,
          booking_in_progress: false,
          awaiting_email: false,
          selected_slot: null,
        });
        await scheduleFirstFollowup(leadUuid);
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // ── Wants other times (or we have nothing offered): re-fetch ─────────
      if (choice.kind === 'other' || offered.length === 0) {
        const daypart = (conversationContext.daypart as Daypart | null) ?? null;
        const fromISO = choice.kind === 'other' ? nextWindowFromISO(offered) : undefined;
        let slots = await getAvailableSlots(bookingType, { fromISO, daypart, max: 3 });
        if (slots.length === 0 && fromISO) slots = await getAvailableSlots(bookingType, { daypart, max: 3 });
        if (slots.length === 0) {
          const reply = 'אין כרגע זמנים פנויים נוספים ביומן, הדר תיצור איתך קשר אישית 🙏';
          await save('assistant', reply, {
            action: 'human_handoff',
            state: 'escalated',
          });
          await setState('escalated');
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        const listMsg = buildSlotsMessage(bookingType, slots, daypart);
        await save('assistant', listMsg, {
          action: 'continue',
          state: 'scheduling',
        });
        await setState('scheduling', { offered_slots: slots, booking_in_progress: false });
        await scheduleFirstFollowup(leadUuid);
        await finalize([{ type: 'text', text: listMsg }]);
        return;
      }

      // ── A slot was picked → ask about the calendar invite before booking ─
      if (choice.kind === 'select') {
        // Idempotency: ignore a duplicate choice while a booking is in flight.
        if (conversationContext.booking_in_progress === true) return;
        await setState('scheduling', { selected_slot: choice.slot, awaiting_email: true });
        const reply = `מעולה, ${choice.slot.label} 🙏 לאיזה מייל לשלוח את האישור?`;
        await save('assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // ── Unknown reply → gently re-prompt ─────────────────────────────────
      const reply = 'אפשר לבחור מספר מהזמנים שלמעלה, או לכתוב לי "זמן אחר" ואביא עוד אפשרויות 🙏';
      await save('assistant', reply, {
        action: 'continue',
        state: 'scheduling',
      });
      await finalize([{ type: 'text', text: reply }]);
    };

    // ── In-chat scheduling turn: handle the lead's slot choice ─────────────
    if (currentState === 'scheduling') {
      await handleSchedulingTurn();
      return;
    }

    // ── Pre-check: audience filter (first message only) ────────────────────
    if (userMsgCount === 1 && detectNotFitAudience(userMessage)) {
      await save('assistant', AUDIENCE_DISQUALIFY_REPLY, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await setState('irrelevant');
      await finalize([{ type: 'text', text: AUDIENCE_DISQUALIFY_REPLY }]);
      return;
    }

    // ── Fixed opening (first message — bypasses LLM for exact text) ────────
    // Gated on state 'initial' so channels that pre-send the opening (the on-site
    // chat seeds it in /api/webchat/start) don't fire it a second time.
    if (userMsgCount === 1 && currentState === 'initial') {
      const FIXED_OPENING = buildFixedOpening(
        typeof conversationContext.name === 'string' ? conversationContext.name : undefined,
      );
      await save('assistant', FIXED_OPENING, {
        action: 'continue',
        state: 'discovery',
      });
      await setState('discovery', {});
      await recordFunnelEvent(leadUuid, 'lead_arrived', { source: channel, msg: 'opening_sent' });
      await scheduleFirstFollowup(leadUuid);
      await finalize([{ type: 'text', text: FIXED_OPENING }]);
      return;
    }

    // ── Pre-checks scoped to awaiting_confirmation ─────────────────────────
    // The proposal bubble already carried "כתבי בוקר/צהריים/ערב".
    // In other states, meeting-intent detection is handled by the pipeline
    // (antiLoopGuard AL-1 is also state-aware). Bypassing the pipeline here
    // for any other state would skip scoring and understanding checks.
    if (currentState === 'awaiting_confirmation') {
      const bookingType: BookingType =
        conversationContext.pending_booking_type === 'intro' ? 'intro' : 'diagnostic';
      const bookingPatch = {
        offered_booking_count: ((conversationContext.offered_booking_count as number) ?? 0) + 1,
      };

      // Asked for a booking link → there is none (by design); explain that the
      // bot books right here so every meeting is tracked.
      if (detectLinkRequest(userMessage)) {
        const reply =
          'אין צורך בקישור 🙂 אני קובעת את הפגישה ישירות כאן בצ\'אט, רק לכתוב לי מתי נוח: בוקר, צהריים או ערב';
        await save('assistant', reply, {
          action: 'continue',
          state: 'awaiting_confirmation',
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // Answered the proposal with a daypart → straight into in-chat scheduling
      // with that daypart, skipping the "מתי נוח לך" question.
      const proposalDaypart = parseDaypart(userMessage);
      if (proposalDaypart || isAnyDaypart(userMessage)) {
        await enterScheduling(bookingType, bookingPatch, {
          daypart: proposalDaypart,
          daypartKnown: true,
        });
        return;
      }

      // In-chat scheduling: show real availability instead of a raw link.
      if (detectMeetingIntent(userMessage)) {
        await recordFunnelEvent(leadUuid, 'booking_requested', {
          from_state: currentState,
          channel,
        });
        await enterScheduling(bookingType, bookingPatch);
        return;
      }
    }

    // ── Closed state (meeting booked): time-aware, can really cancel ───────
    // The bot knows when the meeting is, whether it already passed, and what
    // status Hadar set on it — so it never "waits" for a meeting that's over
    // and never promises a cancellation it can't perform.
    if (currentState === 'closed') {
      const bookedSlot =
        typeof conversationContext.booked_slot === 'string' ? conversationContext.booked_slot : null;
      const wantsReschedule = RESCHEDULE_MEETING_RE.test(userMessage);
      const wantsCancel = CANCEL_MEETING_RE.test(userMessage);

      if (bookedSlot) {
        const meeting = await getLeadMeeting(leadUuid);
        const meetingType: BookingType =
          meeting.meeting_type ??
          (conversationContext.pending_booking_type === 'intro' ? 'intro' : 'diagnostic');
        const meetingPast = new Date(bookedSlot).getTime() + MEETING_OVER_BUFFER_MS < Date.now();
        // Cleared once the old meeting is dealt with, so a later closed-state
        // turn doesn't keep acting on a cancelled/past booking.
        const clearMeetingCtx = {
          booked_slot: null,
          calcom_booking_uid: null,
          pending_booking_type: meetingType,
        };

        if (!meetingPast) {
          // ── Upcoming meeting ──────────────────────────────────────────────
          if (wantsCancel || wantsReschedule) {
            const uid =
              meeting.meeting_calcom_uid ||
              (typeof conversationContext.calcom_booking_uid === 'string'
                ? conversationContext.calcom_booking_uid
                : null);
            const cancelled = uid
              ? await cancelBooking(uid, wantsReschedule ? 'Lead asked to reschedule' : 'Lead asked to cancel')
              : { ok: false as const };

            if (!cancelled.ok) {
              // Never tell her it's cancelled when it isn't — hand off honestly.
              const reply = await handleHandoff('booking_cancel_failed');
              await save('assistant', reply, { action: 'human_handoff', state: 'escalated' });
              await setState('escalated');
              await finalize([{ type: 'text', text: reply }]);
              return;
            }

            await updateLeadMeeting(leadUuid, {
              meeting_status: 'cancelled',
              lead_status: 'meeting_cancelled',
            });
            await recordFunnelEvent(leadUuid, wantsReschedule ? 'meeting_rescheduled' : 'meeting_cancelled', {
              channel,
              booking_uid: uid,
              meeting_at: bookedSlot,
            });

            if (wantsReschedule) {
              // Straight back into the existing scheduling flow (daypart may
              // already be in the message: "אפשר להזיז לערב?").
              const dp = parseDaypart(userMessage);
              await enterScheduling(meetingType, clearMeetingCtx, {
                daypart: dp,
                daypartKnown: dp != null || isAnyDaypart(userMessage),
              });
              return;
            }

            const reply =
              'ביטלתי את הפגישה 🙏 אפשר לקבוע זמן חדש בכל רגע, רק לכתוב לי מתי נוח: בוקר, צהריים או ערב';
            await save('assistant', reply, { action: 'continue', state: 'awaiting_confirmation' });
            await setState('awaiting_confirmation', clearMeetingCtx);
            await finalize([{ type: 'text', text: reply }]);
            return;
          }

          // Anything else → the LLM answers, aware of the upcoming meeting.
          conversationContext = {
            ...conversationContext,
            meeting_label: formatSlotLabel(bookedSlot),
          };
        } else {
          // ── The meeting time already passed ───────────────────────────────
          const status = meeting.meeting_status ?? 'scheduled';

          if (status === 'no_show' || status === 'cancelled') {
            const dp = parseDaypart(userMessage);
            if (dp || isAnyDaypart(userMessage)) {
              await enterScheduling(meetingType, clearMeetingCtx, { daypart: dp, daypartKnown: true });
              return;
            }
            const reply = 'רוצה שנקבע זמן חדש? רק לכתוב לי מתי נוח: בוקר, צהריים או ערב 🙏';
            await save('assistant', reply, { action: 'continue', state: 'awaiting_confirmation' });
            await setState('awaiting_confirmation', clearMeetingCtx);
            await finalize([{ type: 'text', text: reply }]);
            return;
          }

          if (status === 'completed') {
            const reply = 'שמחה שהשיחה התקיימה 🙏 מעבירה את ההודעה להדר והיא תחזור אישית בהקדם';
            await recordFunnelEvent(leadUuid, 'post_meeting_message', {
              channel,
              message: userMessage.slice(0, 300),
            });
            await save('assistant', reply, { action: 'human_handoff', state: 'escalated' });
            await setState('escalated');
            await finalize([{ type: 'text', text: reply }]);
            return;
          }

          // status === 'scheduled' — Hadar hasn't updated whether it took place.
          // The bot can't know, so it passes the message on and flags the lead
          // in the dashboard ("פגישות שעברו בלי עדכון סטטוס").
          const reply = 'מעבירה את ההודעה להדר והיא תחזור בהקדם 🙏';
          await recordFunnelEvent(leadUuid, 'meeting_status_unknown', {
            channel,
            meeting_at: bookedSlot,
            message: userMessage.slice(0, 300),
          });
          await save('assistant', reply, { action: 'human_handoff', state: 'escalated' });
          await setState('escalated');
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
      } else if (wantsCancel || wantsReschedule) {
        // Closed lead booked via a static link — we have no booking uid, so we
        // can't self-serve. Hand off honestly instead of improvising.
        const reply = await handleHandoff('cancel_request_no_booking_ref');
        await save('assistant', reply, { action: 'human_handoff', state: 'escalated' });
        await setState('escalated');
        await finalize([{ type: 'text', text: reply }]);
        return;
      }
    }

    // ── Pre-check: meta frustration → human_handoff only ──────────────────
    // Core Doctrine: frustration never triggers booking — only handoff.
    const frustrationAction = detectMetaFrustration(userMessage, currentState);
    if (frustrationAction === 'human_handoff' || frustrationAction === 'book_meeting') {
      const reply = await handleHandoff('meta_frustration');
      await save('assistant', reply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await setState('escalated');
      await finalize([{ type: 'text', text: reply }]);
      return;
    }

    // ── Pre-check: explicit booking intent from ANY active state ──────────────
    // "רוצה לקבוע" must go straight to scheduling — never another discovery
    // question — regardless of which state we're in. awaiting_confirmation and
    // scheduling have their own handlers above; terminal states never re-book;
    // frustration (handled just above) wins over booking by Core Doctrine.
    if (
      !isTerminalState(currentState) &&
      currentState !== 'awaiting_confirmation' &&
      currentState !== 'scheduling' &&
      detectMeetingIntent(userMessage)
    ) {
      await recordFunnelEvent(leadUuid, 'booking_requested', {
        from_state: currentState,
        channel,
      });
      // Policy: always offer the FREE intro first; honor an explicitly pending
      // diagnostic if one was already set.
      const bookingType: BookingType =
        conversationContext.pending_booking_type === 'diagnostic' ? 'diagnostic' : 'intro';
      await enterScheduling(bookingType, {});
      return;
    }

    // ── Run the agent pipeline (Classifier → StateMachine → AntiLoop → Writer) ──

    const { output: agentOutput, contextPatch } = await runAgentPipeline({
      history,
      newMessage: userMessage,
      currentState,
      conversationContext,
      userMsgCount,
      leadUuid,
      subscriberId,
    });

    // ── AI unavailable: the Writer couldn't produce a reply ───────────────────
    // Be honest, hand off to Hadar, and KEEP the conversation state as-is so a
    // transient blip resumes normally on the next turn. No further LLM calls.
    if (agentOutput.unavailable) {
      await save('assistant', agentOutput.reply, {
        action: 'human_handoff',
        state: currentState,
      });
      await notifySlackHandoff({
        leadUuid,
        headline: 'הבוט לא זמין',
        summary: 'קריאת ה-AI נכשלה, הליד ממתין למענה אנושי מהדר.',
        keyFacts: [],
      });
      await recordFunnelEvent(leadUuid, 'human_handoff_requested', { reason: 'bot_unavailable', channel });
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    // Merge newly asked question into context patch
    const agentQuestion = extractQuestionFromReply(agentOutput.reply);
    const questionPatch = mergeAskedQuestion(conversationContext, agentQuestion);

    const fullContextPatch: Record<string, unknown> = {
      ...contextPatch,
      ...(questionPatch ?? {}),
    };

    // Sync a newly-extracted name onto the lead row (best-effort).
    const extractedName =
      (typeof fullContextPatch.name === 'string' && fullContextPatch.name.trim()) ||
      (typeof conversationContext.name === 'string' && conversationContext.name.trim()) ||
      '';
    if (extractedName) {
      await ensureLeadRow(leadUuid, { subscriberId, phone, name: extractedName, source: channel });
    }

    // ── Handle agent output ────────────────────────────────────────────────

    if (agentOutput.action === 'mark_spam') {
      await save('assistant', agentOutput.reply, {
        action: 'mark_spam',
        state: 'spam',
      });
      await setState('spam', fullContextPatch);
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'mark_irrelevant') {
      await save('assistant', agentOutput.reply, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await setState('irrelevant', fullContextPatch);
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'human_handoff') {
      const handoffReply = await handleHandoff('agent_decision');
      await save('assistant', handoffReply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await setState('escalated', fullContextPatch);
      await finalize([{ type: 'text', text: handoffReply }]);
      return;
    }

    if (agentOutput.action === 'request_followup') {
      const reply = agentOutput.reply.trim() || 'מעולה, אחזור לבדוק שוב כשיהיה נכון יותר :)';
      await save('assistant', reply, {
        action: 'request_followup',
        state: agentOutput.state,
      });
      await setState(agentOutput.state, fullContextPatch);
      await scheduleFirstFollowup(leadUuid);
      await finalize([{ type: 'text', text: reply }]);
      return;
    }

    // Save reply and update state
    await save('assistant', agentOutput.reply, {
      action: agentOutput.action,
      state: agentOutput.state,
      ...(agentOutput.usage && {
        prompt_tokens: agentOutput.usage.prompt_tokens,
        completion_tokens: agentOutput.usage.completion_tokens,
        total_tokens: agentOutput.usage.total_tokens,
        cost_usd: agentOutput.usage.cost_usd,
      }),
    });

    await setState(agentOutput.state, fullContextPatch);
    // Non-terminal reply — nudge in 3h if the lead goes quiet without booking.
    await scheduleFirstFollowup(leadUuid);

    // ── Booking proposals: reply + appended in-chat scheduling offer ─────────
    if (
      agentOutput.action === 'propose_diagnostic_call' ||
      agentOutput.action === 'propose_intro_call'
    ) {
      const proposedType: BookingType =
        agentOutput.action === 'propose_intro_call' ? 'intro' : 'diagnostic';
      await setState('awaiting_confirmation', {
        ...fullContextPatch,
        pending_booking_type: proposedType,
      });
      const messages: OutboundMessage[] = [{ type: 'text', text: agentOutput.reply }];
      const offer = buildProposalOffer(proposedType);
      if (offer) {
        // Saved too, so the LLM's history shows the offer was already made.
        await save('assistant', offer, {
          action: agentOutput.action,
          state: 'awaiting_confirmation',
        });
        messages.push({ type: 'text', text: offer });
      }
      await finalize(messages);
      return;
    }

    // ── Booking confirmations: in-chat scheduling (real availability) ─────
    if (agentOutput.action === 'book_diagnostic_call') {
      await enterScheduling('diagnostic', {});
      return;
    }

    if (agentOutput.action === 'book_intro_call') {
      await enterScheduling('intro', {});
      return;
    }

    // ── Homework: chaos journal assignment ────────────────────────────────
    if (agentOutput.action === 'assign_homework') {
      await recordFunnelEvent(leadUuid, 'homework_assigned');
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    await finalize([{ type: 'text', text: agentOutput.reply }]);
  } catch (err) {
    console.error('[bot] handleInboundMessage unhandled error:', err);
    if (onResult) {
      await onResult({ success: false, error: String(err), messageCount: 0 }).catch(() => {});
    }
  } finally {
    // Release the turn lease so the next queued message runs immediately rather
    // than waiting for the TTL. Non-fatal if it fails — the lease auto-expires.
    await releaseBotTurn(leadUuid).catch(() => {});
  }
}
