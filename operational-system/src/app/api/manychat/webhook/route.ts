import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';

// Allow up to 5 minutes so waitUntil background tasks (LLM + ManyChat push) are not killed.
// Requires Vercel Pro or higher; on Hobby this is capped at 10s regardless.
export const maxDuration = 300;
import { verifyWebhookSecret } from '@/lib/manychat/verifyWebhookSecret';
import { saveManyChatEvent, updateManyChatEventStatus } from '@/lib/events/saveManyChatEvent';
import {
  saveMessage,
  getConversationHistory,
  upsertBotState,
  getBotState,
  countUserMessagesForLead,
  getRecentBotQuestions,
} from '@/lib/db/conversationMessages';
import { runAgentPipeline } from '@/lib/ai/agentPipeline';
import { detectMeetingIntent, detectLinkRequest } from '@/lib/agents/preCheck/detectMeetingIntent';
import { detectMetaFrustration } from '@/lib/agents/preCheck/detectMetaFrustration';
import { detectHumanRequest } from '@/lib/agents/preCheck/detectHumanRequest';
import {
  detectNotFitAudience,
  AUDIENCE_DISQUALIFY_REPLY,
} from '@/lib/agents/preCheck/audienceFilter';
import { notifySlackHandoff } from '@/lib/notifications/slackHandoff';
import { runHandoffSummary } from '@/lib/agents/handoffSummaryAgent';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';
import { runQuizIntakeAgent } from '@/lib/agents/quizIntakeAgent';
import {
  resolveLeadIdentity,
  ensureLeadRow,
  markLeadMeetingBooked,
  PLACEHOLDER_LEAD_NAME,
} from '@/lib/db/leadRegistry';
import {
  getAvailableSlots,
  createBooking,
  isCalcomConfigured,
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
import { pushManyChatReply } from '@/lib/manychat/sendApi';
import type {
  ManyChatWebhookPayload,
  SimpleAckResponse,
  ManyChatDynamicBlockResponse,
} from '@/lib/manychat/types';

// Opt-out keywords — if a user sends these, mark as irrelevant immediately.
const OPT_OUT_REGEX = /^\s*(הסר|עצור|אל תשלח|stop|בטל|לא רוצה הודעות|unsubscribe|הפסיקי לשלוח)\s*$/i;

// Hebrew meeting-type label for booking confirmations.
const BOOKING_HE: Record<BookingType, string> = {
  diagnostic: 'שיחת אפיון',
  intro: 'שיחת היכרות',
};

// Email + "no thanks" detection for the in-chat "add to your calendar?" step.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const DECLINE_EMAIL_RE = /(לא צריך|לא צריכה|לא תודה|לא רוצה|בלי|דלגי|אין צורך|לא חשוב|לא משנה|לא נדרש|^\s*לא\s*$)/;
// Strong cancel during the email step = abort the meeting, not just skip the invite.
// NOTE: standalone "בהמשך" removed — it's ambiguous ("אשמח גם ל-X בהמשך" is NOT a cancel).
const STRONG_CANCEL_RE = /(ביטול|לבטל|בטלי|לא עכשיו|לא כרגע|נדבר אחר כך|נדבר בהמשך|עזבי)/;

/** Extracts a first name from a free-text reply ("קוראים לי מיכל" → "מיכל"). */
function cleanName(message: string): string {
  let s = message.trim().replace(/[.!?,]+$/g, '').trim();
  s = s.replace(/^(היי+|שלום|היא?)\s+/i, '');
  s = s.replace(/^(קוראים לי|שמי|השם שלי(?:\s+הוא)?|אני|זה|השם)\s+/, '').trim();
  // Keep it short — a name, not a sentence.
  if (s.length > 30) s = s.split(/\s+/).slice(0, 2).join(' ');
  return s || message.trim().slice(0, 30);
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

function ackResponse(leadUuid: string, eventType: string): NextResponse {
  const body: SimpleAckResponse = {
    ok: true,
    event_type: eventType,
    lead_uuid: leadUuid,
    received_at: new Date().toISOString(),
  };
  return NextResponse.json(body);
}

function dynamicBlockResponse(
  leadUuid: string,
  messages: Array<{ type: 'text'; text: string }>,
): NextResponse {
  const filtered = messages.filter((m) => m.text.trim().length > 0);
  const block: ManyChatDynamicBlockResponse = {
    version: 'v2',
    content: {
      messages: filtered,
      actions: [{ action: 'set_field_value', field_name: 'lead_uuid', value: leadUuid }],
    },
  };
  return NextResponse.json(block);
}

function resolveBookingUrl(bookingType: 'diagnostic' | 'intro'): string | undefined {
  const fallbackUrl = process.env.CALCOM_BOOKING_URL?.trim();
  return bookingType === 'diagnostic'
    ? (process.env.CALCOM_URL_DIAGNOSTIC?.trim() || fallbackUrl)
    : (process.env.CALCOM_URL_INTRO?.trim() || fallbackUrl);
}

function buildBookingMessages(
  leadUuid: string,
  reply: string,
  bookingType: 'diagnostic' | 'intro',
): Array<{ type: 'text'; text: string }> {
  const messages: Array<{ type: 'text'; text: string }> = [{ type: 'text', text: reply }];
  const url = resolveBookingUrl(bookingType);
  if (url) {
    const label =
      bookingType === 'diagnostic'
        ? `לקביעת שיחת האפיון עם הדר (60 דקות, 350₪): ${url}`
        : `לקביעת זום ההיכרות עם הדר (20 דקות, חינם): ${url}`;
    messages.push({ type: 'text', text: label });
  }
  return messages;
}

const IN_CHAT_OFFER_LINE =
  'אם תרצי שאני אתאם לך את הפגישה, כתבי לי רק מתי את מעדיפה: בוקר, צהריים או ערב 🙏';

/**
 * The bubble appended to every booking proposal: the self-service link plus an
 * invitation to schedule right here in chat — so the lead never has to know to
 * ask "את יכולה לקבוע לי?" on her own.
 */
function buildProposalOffer(bookingType: 'diagnostic' | 'intro'): string | null {
  const url = resolveBookingUrl(bookingType);
  const linkLine = url ? `אפשר לקבוע את הפגישה בקישור הזה: ${url}` : null;
  const inChat = isCalcomConfigured(bookingType);
  if (linkLine && inChat) return `${linkLine}\nו${IN_CHAT_OFFER_LINE}`;
  if (linkLine) return linkLine;
  if (inChat) return IN_CHAT_OFFER_LINE;
  return null;
}

async function handleHandoff(
  leadUuid: string,
  subscriberId: string | undefined,
  reason: string,
  history: Awaited<ReturnType<typeof getConversationHistory>>,
): Promise<string> {
  const summary = await runHandoffSummary({ leadUuid, history, reason });
  await notifySlackHandoff({
    leadUuid,
    headline: summary.headline,
    summary: summary.summary,
    keyFacts: summary.key_facts,
  });
  await recordFunnelEvent(leadUuid, 'human_handoff_requested', { reason });
  return summary.customer_reply;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.MANYCHAT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('[ManyChat Webhook] MANYCHAT_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const receivedSecret = request.headers.get('x-webhook-secret') ?? '';
  if (!verifyWebhookSecret(receivedSecret, webhookSecret)) {
    console.warn('[ManyChat Webhook] Rejected: invalid X-Webhook-Secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: ManyChatWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || typeof payload.event_type !== 'string') {
    return NextResponse.json({ error: 'Missing required field: event_type' }, { status: 400 });
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawUuid = typeof payload.lead_uuid === 'string' ? payload.lead_uuid.trim() : '';
  const leadUuid: string = UUID_REGEX.test(rawUuid) ? rawUuid : randomUUID();
  const eventType = payload.event_type.trim();

  const { id: eventId, error: saveError } = await saveManyChatEvent({
    lead_uuid: leadUuid,
    subscriber_id:
      typeof payload.subscriber_id === 'string' && payload.subscriber_id.trim()
        ? payload.subscriber_id.trim()
        : undefined,
    event_type: eventType,
    payload,
  });

  if (saveError) {
    console.error('[ManyChat Webhook] Supabase insert failed, ACKing anyway:', saveError);
  }

  switch (eventType) {
    case 'test_connection':
      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return ackResponse(leadUuid, eventType);

    case 'test_send_message':
      if (process.env.NODE_ENV === 'production') {
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return ackResponse(leadUuid, eventType);
      }
      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return dynamicBlockResponse(leadUuid, [
        { type: 'text', text: 'בדיקת חיבור: השרת קיבל את ההודעה ושלח תשובה דרך ManyChat ✓' },
      ]);

    case 'lead_message': {
      const userMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
      // ManyChat may send subscriber_id as a number — coerce to string in both cases.
      const rawSubscriberId = payload.subscriber_id;
      const subscriberId =
        typeof rawSubscriberId === 'string' && rawSubscriberId.trim()
          ? rawSubscriberId.trim()
          : typeof rawSubscriberId === 'number' && rawSubscriberId
            ? String(rawSubscriberId)
            : undefined;

      // Reject unresolved ManyChat template variables (e.g. {{cuf_12345}}, {{last message text}}).
      const UNRESOLVED_VAR = /^\{\{.+\}\}$/;
      if (!userMessage || UNRESOLVED_VAR.test(userMessage)) {
        const reason = !userMessage ? 'empty message' : `unresolved_variable: ${userMessage}`;
        console.warn('[ManyChat Webhook] Rejected — message is an unresolved variable:', userMessage);
        if (eventId) await updateManyChatEventStatus(eventId, 'error', reason);
        return ackResponse(leadUuid, eventType);
      }

      // Resolve the canonical lead identity (dedup returning subscribers).
      const { leadUuid: canonicalLeadUuid } = await resolveLeadIdentity({
        subscriberId,
        payloadLeadUuid: rawUuid,
      });
      const phone = typeof payload.phone === 'string' ? payload.phone.trim() : undefined;

      // Return immediately to ManyChat — LLM runs in background, reply pushed via Send API.
      waitUntil(processLeadMessage(canonicalLeadUuid, subscriberId, userMessage, eventId, phone));
      return NextResponse.json({ version: 'v2', content: { messages: [] } });
    }

    case 'questionnaire_completed': {
      const quizResult = await runQuizIntakeAgent({ leadUuid });
      // Bridge quiz intake into bot state so the pipeline can use opening_hook + facts
      await upsertBotState(leadUuid, 'initial', {
        opening_hook: quizResult.opening_hook,
        ...quizResult.pre_extracted_facts,
      });
      await recordFunnelEvent(leadUuid, 'quiz_completed');
      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return ackResponse(leadUuid, eventType);
    }

    default:
      return ackResponse(leadUuid, eventType);
  }
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

async function processLeadMessage(
  leadUuid: string,
  subscriberId: string | undefined,
  userMessage: string,
  eventId: string | null,
  phone?: string,
): Promise<void> {
  const push = async (
    messages: Array<{ type: 'text'; text: string }>,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!subscriberId) {
      console.warn('[ManyChat Webhook] push: no subscriberId — cannot push reply', { leadUuid });
      return { success: false, error: 'no_subscriber_id' };
    }
    const result = await pushManyChatReply(subscriberId, messages, leadUuid);
    if (!result.success) {
      console.error('[ManyChat Webhook] push: pushManyChatReply failed:', result.error);
    }
    return result;
  };

  const finalize = async (messages: Array<{ type: 'text'; text: string }>) => {
    const sanitized = messages.map((m) => ({ ...m, text: sanitizeOutgoing(m.text) }));
    const r = await push(sanitized);
    const debugNote = r.success
      ? `push_ok | sub=${subscriberId ?? 'MISSING'}`
      : `push_failed: ${r.error ?? 'unknown'} | sub=${subscriberId ?? 'MISSING'}`;
    if (eventId) {
      await updateManyChatEventStatus(eventId, r.success ? 'done' : 'error', debugNote);
    } else {
      const supa = createServiceRoleClient();
      const { error: debugErr } = await supa.from('manychat_events').insert({
        lead_uuid: leadUuid,
        subscriber_id: subscriberId ?? null,
        event_type: 'debug_push_result',
        payload: { subscriberId, pushSuccess: r.success, pushError: r.error ?? null, messageCount: messages.length } as Record<string, unknown>,
        process_status: r.success ? 'done' : 'error',
        process_error: debugNote,
        received_at: new Date().toISOString(),
      });
      if (debugErr) console.error('[webhook] debug insert failed:', debugErr.message);
    }
  };

  try {
    console.log('[ManyChat Webhook] processLeadMessage: started', { leadUuid, subscriberId, messageLen: userMessage.length });
    // Document every inquiry as a lead (creates on first contact, dedup-safe).
    await ensureLeadRow(leadUuid, { subscriberId, phone });
    await saveMessage(leadUuid, subscriberId, 'user', userMessage);
    await recordFunnelEvent(leadUuid, 'lead_arrived', { source: 'manychat' });
    // The lead re-engaged — cancel any pending follow-up; non-terminal replies reschedule below.
    await cancelFollowup(leadUuid);

    // ── Pre-check: opt-out ──────────────────────────────────────────────────
    if (OPT_OUT_REGEX.test(userMessage)) {
      const optOutReply = 'הוסרת מהרשימה. בהצלחה 🙏';
      await saveMessage(leadUuid, subscriberId, 'assistant', optOutReply, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await upsertBotState(leadUuid, 'irrelevant', { opt_out: true }, subscriberId);
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

    // ── Auto-escalate after 10 messages ────────────────────────────────────
    // Exempt active booking states — a lead picking a slot (or about to) must
    // not be killed mid-close just because the conversation ran long.
    const ESCALATE_EXEMPT = new Set(['scheduling', 'awaiting_confirmation', 'booking', 'closed']);
    if (userMsgCount >= 10 && !ESCALATE_EXEMPT.has(currentState)) {
      const escalationReply = await handleHandoff(leadUuid, subscriberId, 'message_limit', history);
      await saveMessage(leadUuid, subscriberId, 'assistant', escalationReply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await upsertBotState(leadUuid, 'escalated', undefined, subscriberId);
      await finalize([{ type: 'text', text: escalationReply }]);
      return;
    }

    // ── Pre-check: explicit request for a human / Hadar (any state) ───────────
    if (detectHumanRequest(userMessage)) {
      const reply = await handleHandoff(leadUuid, subscriberId, 'human_requested', history);
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await upsertBotState(leadUuid, 'escalated', undefined, subscriberId);
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
          await recordFunnelEvent(leadUuid, 'human_handoff_requested', { reason: 'no_availability' });
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
            action: 'human_handoff',
            state: 'escalated',
          });
          await upsertBotState(leadUuid, 'escalated', { booking_in_progress: false }, subscriberId);
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        // First empty attempt on a specific daypart — offer to try another.
        const where = `ב${DAYPART_HE[daypart]}`;
        const reply = `${prefix}אין כרגע זמנים פנויים ${where} 🙈 רוצה שאבדוק חלק אחר ביום? בוקר, צהריים או ערב?`;
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await upsertBotState(
          leadUuid,
          'scheduling',
          { awaiting_daypart: true, daypart: null, offered_slots: null, no_slots_attempts: attempts },
          subscriberId,
        );
        await finalize([{ type: 'text', text: reply }]);
        return;
      }
      const listMsg = prefix + buildSlotsMessage(bookingType, slots, daypart);
      await saveMessage(leadUuid, subscriberId, 'assistant', listMsg, {
        action: 'continue',
        state: 'scheduling',
      });
      await upsertBotState(
        leadUuid,
        'scheduling',
        { offered_slots: slots, daypart, awaiting_daypart: false, booking_in_progress: false },
        subscriberId,
      );
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
      // Fallback to a static link only if Cal.com isn't configured.
      if (!isCalcomConfigured(bookingType)) {
        const reply =
          bookingType === 'diagnostic'
            ? 'מעולה! שולחת לך קישור לקביעת שיחת האפיון עם הדר 🗓️'
            : 'מעולה! שולחת לך קישור לקביעת שיחת ההיכרות עם הדר 🗓️';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: bookingType === 'diagnostic' ? 'book_diagnostic_call' : 'book_intro_call',
          state: 'booking',
        });
        await upsertBotState(leadUuid, 'booking', contextPatch, subscriberId);
        await finalize(buildBookingMessages(leadUuid, reply, bookingType));
        return;
      }

      await recordFunnelEvent(leadUuid, `${bookingType}_offered`, { in_chat: true });
      // Keep a follow-up safety net in case she goes quiet mid-scheduling.
      await scheduleFirstFollowup(leadUuid);

      const knownName =
        typeof conversationContext.name === 'string' && conversationContext.name.trim();
      const daypartKnown = opts?.daypartKnown === true;

      // We book under a real name — ask it first if we don't have one yet.
      // A daypart she already gave is kept so we skip that question after the name.
      if (!knownName) {
        const reply = 'בהחלט 🙏 איך קוראים לך?';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await upsertBotState(
          leadUuid,
          'scheduling',
          {
            ...contextPatch,
            pending_booking_type: bookingType,
            awaiting_name: true,
            awaiting_daypart: false,
            offered_slots: null,
            booking_in_progress: false,
            no_slots_attempts: 0,
            ...(daypartKnown ? { daypart: opts?.daypart ?? null, daypart_known: true } : {}),
          },
          subscriberId,
        );
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // Name + daypart known → straight to the slot list, no redundant question.
      if (daypartKnown) {
        await upsertBotState(
          leadUuid,
          'scheduling',
          {
            ...contextPatch,
            pending_booking_type: bookingType,
            awaiting_name: false,
            awaiting_daypart: false,
            offered_slots: null,
            booking_in_progress: false,
            no_slots_attempts: 0,
          },
          subscriberId,
        );
        await presentSlots(bookingType, opts?.daypart ?? null);
        return;
      }

      // Name known → ask the preferred part of the day; slots come after.
      const reply = 'מעולה 🙏 מתי נוח לך יותר, בוקר, צהריים או ערב?';
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
        action: 'continue',
        state: 'scheduling',
      });
      await upsertBotState(
        leadUuid,
        'scheduling',
        {
          ...contextPatch,
          pending_booking_type: bookingType,
          awaiting_name: false,
          awaiting_daypart: true,
          offered_slots: null,
          booking_in_progress: false,
          no_slots_attempts: 0,
        },
        subscriberId,
      );
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
          'לקוחה מוואטסאפ';
        const bookingPhone = phone || (leadRow?.phone as string | null) || undefined;

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
          const namePrefix = name && name !== 'לקוחה מוואטסאפ' ? `${name}, ` : '';
          const lastLine = emailReal
            ? 'שלחתי אלייך אישור למייל ותזכורת תישלח לפני השיחה 🙏'
            : 'תזכורת תישלח לפני השיחה. מחכה לך 🙏';
          const reply =
            `סגרתי לך ✅\n${namePrefix}${BOOKING_HE[bookingType]} עם הדר נקבעה ל${slot.label}.\n${lastLine}`;
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
            action: bookingType === 'diagnostic' ? 'book_diagnostic_call' : 'book_intro_call',
            state: 'closed',
          });
          await upsertBotState(
            leadUuid,
            'closed',
            {
              booking_in_progress: false,
              awaiting_email: false,
              selected_slot: null,
              calcom_booking_uid: result.bookingUid ?? null,
              booked_slot: slot.startISO,
              offered_slots: null,
            },
            subscriberId,
          );
          await markLeadMeetingBooked(leadUuid);
          await cancelFollowup(leadUuid);
          await recordFunnelEvent(leadUuid, 'meeting_booked', {
            source: 'in_chat',
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
            await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
              action: 'human_handoff',
              state: 'escalated',
            });
            await upsertBotState(leadUuid, 'escalated', { booking_in_progress: false }, subscriberId);
            await finalize([{ type: 'text', text: reply }]);
            return;
          }
          const listMsg = head + '\n' + buildSlotsMessage(bookingType, slots);
          await saveMessage(leadUuid, subscriberId, 'assistant', listMsg, {
            action: 'continue',
            state: 'scheduling',
          });
          await upsertBotState(
            leadUuid,
            'scheduling',
            { offered_slots: slots, booking_in_progress: false, awaiting_email: false, selected_slot: null },
            subscriberId,
          );
          await finalize([{ type: 'text', text: listMsg }]);
          return;
        }

        // Other API failure → hand off to Hadar.
        const handoffReply = await handleHandoff(leadUuid, subscriberId, 'booking_api_failure', history);
        const reply = handoffReply || 'נתקלתי בתקלה קטנה בקביעה, הדר תשלח לך קישור אישית לתיאום 🙏';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'human_handoff',
          state: 'escalated',
        });
        await upsertBotState(leadUuid, 'escalated', { booking_in_progress: false }, subscriberId);
        await finalize([{ type: 'text', text: reply }]);
      };

      // ── Name sub-step: captured before we ask about times ────────────────
      if (conversationContext.awaiting_name === true) {
        if (STRONG_CANCEL_RE.test(userMessage)) {
          const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
            action: 'continue',
            state: 'awaiting_confirmation',
          });
          await upsertBotState(
            leadUuid,
            'awaiting_confirmation',
            { awaiting_name: false, booking_in_progress: false },
            subscriberId,
          );
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        const name = cleanName(userMessage);
        await ensureLeadRow(leadUuid, { subscriberId, phone, name });

        // She already told us morning/noon/evening at the proposal → go straight
        // to the slot list instead of asking again.
        if (conversationContext.daypart_known === true) {
          const dp =
            conversationContext.daypart === 'morning' ||
            conversationContext.daypart === 'noon' ||
            conversationContext.daypart === 'evening'
              ? (conversationContext.daypart as Daypart)
              : null;
          await upsertBotState(
            leadUuid,
            'scheduling',
            { name, awaiting_name: false, awaiting_daypart: false },
            subscriberId,
          );
          await presentSlots(bookingType, dp, `נעים מאוד ${name} 🙏 `);
          return;
        }

        await upsertBotState(
          leadUuid,
          'scheduling',
          { name, awaiting_name: false, awaiting_daypart: true },
          subscriberId,
        );
        const reply = `נעים מאוד ${name} 🙏 מתי נוח לך יותר, בוקר, צהריים או ערב?`;
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
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
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
            action: 'continue',
            state: 'awaiting_confirmation',
          });
          await upsertBotState(
            leadUuid,
            'awaiting_confirmation',
            { awaiting_daypart: false, offered_slots: null, booking_in_progress: false },
            subscriberId,
          );
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
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
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
          await upsertBotState(
            leadUuid,
            'scheduling',
            { awaiting_email: false, booking_in_progress: true },
            subscriberId,
          );
          await executeBooking(slot, emailMatch[0].trim());
          return;
        }

        // Explicit abort → leave scheduling without booking.
        if (STRONG_CANCEL_RE.test(userMessage)) {
          const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
            action: 'continue',
            state: 'awaiting_confirmation',
          });
          await upsertBotState(
            leadUuid,
            'awaiting_confirmation',
            { offered_slots: null, booking_in_progress: false, awaiting_email: false, selected_slot: null },
            subscriberId,
          );
          await scheduleFirstFollowup(leadUuid);
          await finalize([{ type: 'text', text: reply }]);
          return;
        }

        if (DECLINE_EMAIL_RE.test(userMessage)) {
          // No calendar invite — book with a stable placeholder address.
          const placeholder = `wa-${subscriberId ?? leadUuid}@leads.hadar.local`;
          await upsertBotState(
            leadUuid,
            'scheduling',
            { awaiting_email: false, booking_in_progress: true },
            subscriberId,
          );
          await executeBooking(slot, placeholder);
          return;
        }

        // Unclear → re-ask the email question once.
        const reply =
          'רק שאדע לאן לשלוח את האישור, מה כתובת המייל שלך? (ואם לא צריך, כתבי "לא צריך" ואני סוגרת) 🙂';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // ── Cancel: leave scheduling, keep the door open ─────────────────────
      if (choice.kind === 'cancel') {
        const reply = 'סבבה לגמרי 🙏 כשיתאים לך נמשיך מאיפה שעצרנו.';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'continue',
          state: 'awaiting_confirmation',
        });
        await upsertBotState(
          leadUuid,
          'awaiting_confirmation',
          { offered_slots: null, booking_in_progress: false, awaiting_email: false, selected_slot: null },
          subscriberId,
        );
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
          await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
            action: 'human_handoff',
            state: 'escalated',
          });
          await upsertBotState(leadUuid, 'escalated', undefined, subscriberId);
          await finalize([{ type: 'text', text: reply }]);
          return;
        }
        const listMsg = buildSlotsMessage(bookingType, slots, daypart);
        await saveMessage(leadUuid, subscriberId, 'assistant', listMsg, {
          action: 'continue',
          state: 'scheduling',
        });
        await upsertBotState(
          leadUuid,
          'scheduling',
          { offered_slots: slots, booking_in_progress: false },
          subscriberId,
        );
        await scheduleFirstFollowup(leadUuid);
        await finalize([{ type: 'text', text: listMsg }]);
        return;
      }

      // ── A slot was picked → ask about the calendar invite before booking ─
      if (choice.kind === 'select') {
        // Idempotency: ignore a duplicate choice while a booking is in flight.
        if (conversationContext.booking_in_progress === true) return;
        await upsertBotState(
          leadUuid,
          'scheduling',
          { selected_slot: choice.slot, awaiting_email: true },
          subscriberId,
        );
        const reply = `מעולה, ${choice.slot.label} 🙏 לאיזה מייל לשלוח את האישור?`;
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'continue',
          state: 'scheduling',
        });
        await finalize([{ type: 'text', text: reply }]);
        return;
      }

      // ── Unknown reply → gently re-prompt ─────────────────────────────────
      const reply = 'אפשר לבחור מספר מהזמנים שלמעלה, או לכתוב לי "זמן אחר" ואביא עוד אפשרויות 🙏';
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
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
      await saveMessage(leadUuid, subscriberId, 'assistant', AUDIENCE_DISQUALIFY_REPLY, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await upsertBotState(leadUuid, 'irrelevant', undefined, subscriberId);
      await finalize([{ type: 'text', text: AUDIENCE_DISQUALIFY_REPLY }]);
      return;
    }

    // ── Fixed opening (first message — bypasses LLM for exact text) ────────
    if (userMsgCount === 1) {
      const FIXED_OPENING =
        'היי אני העוזרת הדיגיטלית של הדר אוטומציות, אני כאן כדי שנבין ביחד האם הדר יכולה לעזור לך ובמידה כן- לקבוע פגישה. שנתחיל בכמה שאלות?';
      await saveMessage(leadUuid, subscriberId, 'assistant', FIXED_OPENING, {
        action: 'continue',
        state: 'discovery',
      });
      await upsertBotState(leadUuid, 'discovery', {}, subscriberId);
      await recordFunnelEvent(leadUuid, 'lead_arrived', { source: 'manychat', msg: 'opening_sent' });
      await scheduleFirstFollowup(leadUuid);
      await finalize([{ type: 'text', text: FIXED_OPENING }]);
      return;
    }

    // ── Pre-checks scoped to awaiting_confirmation ─────────────────────────
    // The proposal bubble already carried the link + "כתבי בוקר/צהריים/ערב".
    // In other states, meeting-intent detection is handled by the pipeline
    // (antiLoopGuard AL-1 is also state-aware). Bypassing the pipeline here
    // for any other state would skip scoring and understanding checks.
    if (currentState === 'awaiting_confirmation') {
      const bookingType: BookingType =
        conversationContext.pending_booking_type === 'intro' ? 'intro' : 'diagnostic';
      const bookingPatch = {
        offered_booking_count: ((conversationContext.offered_booking_count as number) ?? 0) + 1,
      };

      // Asked for the link itself → resend it; don't drag her into the in-chat flow.
      if (detectLinkRequest(userMessage) && resolveBookingUrl(bookingType)) {
        const reply = 'בכיף 🙏 הנה הקישור:';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'continue',
          state: 'awaiting_confirmation',
        });
        await finalize(buildBookingMessages(leadUuid, reply, bookingType));
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
        await enterScheduling(bookingType, bookingPatch);
        return;
      }
    }

    // ── Pre-check: meta frustration → human_handoff only ──────────────────
    // Core Doctrine: frustration never triggers booking — only handoff.
    const frustrationAction = detectMetaFrustration(userMessage, currentState);
    if (frustrationAction === 'human_handoff' || frustrationAction === 'book_meeting') {
      const reply = await handleHandoff(leadUuid, subscriberId, 'meta_frustration', history);
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await upsertBotState(leadUuid, 'escalated', undefined, subscriberId);
      await finalize([{ type: 'text', text: reply }]);
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
      await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
        action: 'human_handoff',
        state: currentState,
      });
      await notifySlackHandoff({
        leadUuid,
        headline: 'הבוט לא זמין',
        summary: 'קריאת ה-AI נכשלה, הליד ממתין למענה אנושי מהדר.',
        keyFacts: [],
      });
      await recordFunnelEvent(leadUuid, 'human_handoff_requested', { reason: 'bot_unavailable' });
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
      await ensureLeadRow(leadUuid, { subscriberId, phone, name: extractedName });
    }

    // ── Handle agent output ────────────────────────────────────────────────

    if (agentOutput.action === 'mark_spam') {
      await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
        action: 'mark_spam',
        state: 'spam',
      });
      await upsertBotState(leadUuid, 'spam', fullContextPatch, subscriberId);
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'mark_irrelevant') {
      await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await upsertBotState(leadUuid, 'irrelevant', fullContextPatch, subscriberId);
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'human_handoff') {
      const handoffReply = await handleHandoff(leadUuid, subscriberId, 'agent_decision', history);
      await saveMessage(leadUuid, subscriberId, 'assistant', handoffReply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await upsertBotState(leadUuid, 'escalated', fullContextPatch, subscriberId);
      await finalize([{ type: 'text', text: handoffReply }]);
      return;
    }

    if (agentOutput.action === 'request_followup') {
      const reply = agentOutput.reply.trim() || 'מעולה, אחזור אלייך כשיהיה נכון יותר :)';
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
        action: 'request_followup',
        state: agentOutput.state,
      });
      await upsertBotState(leadUuid, agentOutput.state, fullContextPatch, subscriberId);
      await scheduleFirstFollowup(leadUuid);
      await finalize([{ type: 'text', text: reply }]);
      return;
    }

    // Save reply and update state
    await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
      action: agentOutput.action,
      state: agentOutput.state,
      ...(agentOutput.usage && {
        prompt_tokens: agentOutput.usage.prompt_tokens,
        completion_tokens: agentOutput.usage.completion_tokens,
        total_tokens: agentOutput.usage.total_tokens,
        cost_usd: agentOutput.usage.cost_usd,
      }),
    });

    await upsertBotState(leadUuid, agentOutput.state, fullContextPatch, subscriberId);
    // Non-terminal reply — nudge in 3h if the lead goes quiet without booking.
    await scheduleFirstFollowup(leadUuid);

    // ── Booking proposals: reply + appended link & in-chat scheduling offer ──
    if (
      agentOutput.action === 'propose_diagnostic_call' ||
      agentOutput.action === 'propose_intro_call'
    ) {
      const proposedType: BookingType =
        agentOutput.action === 'propose_intro_call' ? 'intro' : 'diagnostic';
      await upsertBotState(
        leadUuid,
        'awaiting_confirmation',
        { ...fullContextPatch, pending_booking_type: proposedType },
        subscriberId,
      );
      const messages: Array<{ type: 'text'; text: string }> = [
        { type: 'text', text: agentOutput.reply },
      ];
      const offer = buildProposalOffer(proposedType);
      if (offer) {
        // Saved too, so the LLM's history shows the lead already got the link.
        await saveMessage(leadUuid, subscriberId, 'assistant', offer, {
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
    console.error('[ManyChat Webhook] processLeadMessage unhandled error:', err);
    if (eventId) await updateManyChatEventStatus(eventId, 'error', String(err)).catch(() => {});
  }
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
    console.warn('[webhook] scheduleFollowup failed (non-fatal):', error.message);
  }
}

/** Schedules the single morning follow-up (eligible 3h after going quiet). */
async function scheduleFirstFollowup(leadUuid: string): Promise<void> {
  await scheduleFollowup(leadUuid, 1, new Date(Date.now() + FOLLOWUP_FIRST_TOUCH_MS));
}

/** Cancels any open follow-up — the conversation resumed or reached a terminal state. */
async function cancelFollowup(leadUuid: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('pending_followups')
    .update({ closed_at: new Date().toISOString() })
    .eq('lead_uuid', leadUuid)
    .is('closed_at', null);
  if (error) {
    console.warn('[webhook] cancelFollowup failed (non-fatal):', error.message);
  }
}
