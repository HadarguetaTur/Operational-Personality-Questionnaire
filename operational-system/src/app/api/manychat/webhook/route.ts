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
import {
  detectMeetingIntent,
  MEETING_BOOKING_REPLY,
} from '@/lib/agents/preCheck/detectMeetingIntent';
import { detectMetaFrustration } from '@/lib/agents/preCheck/detectMetaFrustration';
import {
  detectNotFitAudience,
  AUDIENCE_DISQUALIFY_REPLY,
} from '@/lib/agents/preCheck/audienceFilter';
import { notifySlackHandoff } from '@/lib/notifications/slackHandoff';
import { runHandoffSummary } from '@/lib/agents/handoffSummaryAgent';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';
import { runQuizIntakeAgent } from '@/lib/agents/quizIntakeAgent';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { pushManyChatReply } from '@/lib/manychat/sendApi';
import type {
  ManyChatWebhookPayload,
  SimpleAckResponse,
  ManyChatDynamicBlockResponse,
} from '@/lib/manychat/types';

// Opt-out keywords — if a user sends these, mark as irrelevant immediately.
const OPT_OUT_REGEX = /^\s*(הסר|עצור|אל תשלח|stop|בטל|לא רוצה הודעות|unsubscribe|הפסיקי לשלוח)\s*$/i;

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

function buildBookingMessages(
  leadUuid: string,
  reply: string,
  bookingType: 'diagnostic' | 'intro',
): Array<{ type: 'text'; text: string }> {
  const messages: Array<{ type: 'text'; text: string }> = [{ type: 'text', text: reply }];
  const url =
    bookingType === 'diagnostic'
      ? process.env.CALCOM_URL_DIAGNOSTIC?.trim()
      : process.env.CALCOM_URL_INTRO?.trim();
  if (url) {
    const label =
      bookingType === 'diagnostic'
        ? `לקביעת שיחת האפיון עם הדר (60 דקות, 350₪): ${url}`
        : `לקביעת זום ההיכרות עם הדר (20 דקות, חינם): ${url}`;
    messages.push({ type: 'text', text: label });
  }
  return messages;
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

      // Return immediately to ManyChat — LLM runs in background, reply pushed via Send API.
      waitUntil(processLeadMessage(leadUuid, subscriberId, userMessage, eventId));
      return NextResponse.json({ version: 'v2', content: { messages: [] } });
    }

    case 'questionnaire_completed': {
      await runQuizIntakeAgent({ leadUuid });
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
    const r = await push(messages);
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
    await saveMessage(leadUuid, subscriberId, 'user', userMessage);
    await recordFunnelEvent(leadUuid, 'lead_arrived', { source: 'manychat' });

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

    const userMsgCount = await countUserMessagesForLead(leadUuid);

    // ── Auto-escalate after 10 messages ────────────────────────────────────
    if (userMsgCount >= 10) {
      const escalationReply = 'הדר תחזור אלייך בקרוב לשיחה אישית 🙏';
      await saveMessage(leadUuid, subscriberId, 'assistant', escalationReply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await upsertBotState(leadUuid, 'escalated', undefined, subscriberId);
      await finalize([{ type: 'text', text: escalationReply }]);
      return;
    }

    const [history, botStateData] = await Promise.all([
      getConversationHistory(leadUuid),
      getBotState(leadUuid),
    ]);

    const currentState = botStateData.state;
    let conversationContext = botStateData.context;

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

    // ── Pre-check: meeting intent — only fires in awaiting_confirmation ───────
    // In other states, meeting-intent detection is handled by the pipeline
    // (antiLoopGuard AL-1 is also state-aware). Bypassing the pipeline here
    // for any other state would skip scoring and understanding checks.
    if (currentState === 'awaiting_confirmation' && detectMeetingIntent(userMessage)) {
      const bookingType =
        conversationContext.pending_booking_type === 'intro' ? 'intro' : 'diagnostic';
      const bookingAction =
        bookingType === 'diagnostic' ? 'book_diagnostic_call' : 'book_intro_call';
      const bookingReply =
        bookingType === 'diagnostic'
          ? 'מעולה! שולחת לך עכשיו את הקישור לשיחת האפיון עם הדר 🗓️'
          : 'מעולה! שולחת לך עכשיו את הקישור לזום ההיכרות עם הדר 🗓️';
      await saveMessage(leadUuid, subscriberId, 'assistant', bookingReply, {
        action: bookingAction,
        state: 'booking',
      });
      const bookingPatch = {
        offered_booking_count: ((conversationContext.offered_booking_count as number) ?? 0) + 1,
      };
      await upsertBotState(leadUuid, 'booking', bookingPatch, subscriberId);
      await recordFunnelEvent(leadUuid, `${bookingType}_offered`, { trigger: 'regex' });
      await finalize(buildBookingMessages(leadUuid, bookingReply, bookingType));
      return;
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

    // Merge newly asked question into context patch
    const agentQuestion = extractQuestionFromReply(agentOutput.reply);
    const questionPatch = mergeAskedQuestion(conversationContext, agentQuestion);

    const fullContextPatch: Record<string, unknown> = {
      ...contextPatch,
      ...(questionPatch ?? {}),
    };

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
      const finalReply = agentOutput.reply.trim() || handoffReply;
      await saveMessage(leadUuid, subscriberId, 'assistant', finalReply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await upsertBotState(leadUuid, 'escalated', fullContextPatch, subscriberId);
      await finalize([{ type: 'text', text: finalReply }]);
      return;
    }

    if (agentOutput.action === 'request_followup') {
      const reply = agentOutput.reply.trim() || 'מעולה, אחזור אלייך כשיהיה נכון יותר :)';
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
        action: 'request_followup',
        state: agentOutput.state,
      });
      await upsertBotState(leadUuid, agentOutput.state, fullContextPatch, subscriberId);
      await scheduleFollowup(leadUuid);
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

    // ── Booking proposals: set pending type, send reply only (no link yet) ───
    if (agentOutput.action === 'propose_diagnostic_call') {
      await upsertBotState(
        leadUuid,
        'awaiting_confirmation',
        { ...fullContextPatch, pending_booking_type: 'diagnostic' },
        subscriberId,
      );
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'propose_intro_call') {
      await upsertBotState(
        leadUuid,
        'awaiting_confirmation',
        { ...fullContextPatch, pending_booking_type: 'intro' },
        subscriberId,
      );
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    // ── Booking confirmations: send reply + booking link ──────────────────
    if (agentOutput.action === 'book_diagnostic_call') {
      await recordFunnelEvent(leadUuid, 'diagnostic_offered', { trigger: 'agent' });
      await finalize(buildBookingMessages(leadUuid, agentOutput.reply, 'diagnostic'));
      return;
    }

    if (agentOutput.action === 'book_intro_call') {
      await recordFunnelEvent(leadUuid, 'intro_offered', { trigger: 'agent' });
      await finalize(buildBookingMessages(leadUuid, agentOutput.reply, 'intro'));
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

async function scheduleFollowup(leadUuid: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const remindAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from('pending_followups').upsert(
    {
      lead_uuid: leadUuid,
      remind_at: remindAt.toISOString(),
      reminder_sent: false,
      closed_at: null,
    },
    { onConflict: 'lead_uuid' },
  );
  if (error) {
    console.warn('[webhook] scheduleFollowup failed (non-fatal):', error.message);
  }
}
