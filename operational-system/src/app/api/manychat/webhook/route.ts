import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyWebhookSecret } from '@/lib/manychat/verifyWebhookSecret';
import { saveManyChatEvent, updateManyChatEventStatus } from '@/lib/events/saveManyChatEvent';
import {
  saveMessage,
  getConversationHistory,
  updateLeadConversationState,
  countUserMessagesForLead,
  getLeadConversationState,
  getLeadConversationContext,
} from '@/lib/db/conversationMessages';
import { runSalesAgent } from '@/lib/ai/salesAgent';
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
import type {
  ManyChatWebhookPayload,
  SimpleAckResponse,
  ManyChatDynamicBlockResponse,
} from '@/lib/manychat/types';

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
  const block: ManyChatDynamicBlockResponse = {
    version: 'v2',
    content: {
      messages: messages.filter((m) => m.text.trim().length > 0),
      actions: [{ action: 'set_field_value', field_name: 'lead_uuid', value: leadUuid }],
    },
  };
  return NextResponse.json(block);
}

function buildBookingMessages(
  leadUuid: string,
  reply: string,
): Array<{ type: 'text'; text: string }> {
  const messages: Array<{ type: 'text'; text: string }> = [{ type: 'text', text: reply }];
  const bookingUrl = process.env.CALCOM_BOOKING_URL?.trim();
  if (bookingUrl) {
    messages.push({
      type: 'text',
      text: `לקביעת גישת האפיון עם הדר: ${bookingUrl}`,
    });
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
      const subscriberId =
        typeof payload.subscriber_id === 'string' && payload.subscriber_id.trim()
          ? payload.subscriber_id.trim()
          : undefined;

      if (!userMessage) {
        if (eventId) await updateManyChatEventStatus(eventId, 'error', 'empty message');
        return ackResponse(leadUuid, eventType);
      }

      await saveMessage(leadUuid, subscriberId, 'user', userMessage);
      await recordFunnelEvent(leadUuid, 'lead_arrived', { source: 'manychat' });

      const userMsgCount = await countUserMessagesForLead(leadUuid);
      if (userMsgCount >= 10) {
        const escalationReply = 'שיחה זו הועברה לנציג. הדר תחזור אליך בהקדם 🙏';
        await saveMessage(leadUuid, subscriberId, 'assistant', escalationReply, {
          action: 'human_handoff',
          state: 'escalated',
        });
        await updateLeadConversationState(leadUuid, 'escalated');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: escalationReply }]);
      }

      const [history, currentState, conversationContext] = await Promise.all([
        getConversationHistory(leadUuid),
        getLeadConversationState(leadUuid),
        getLeadConversationContext(leadUuid),
      ]);

      // Pre-check: audience filter (first message only)
      if (userMsgCount === 1 && detectNotFitAudience(userMessage)) {
        await saveMessage(leadUuid, subscriberId, 'assistant', AUDIENCE_DISQUALIFY_REPLY, {
          action: 'mark_irrelevant',
          state: 'irrelevant',
        });
        await updateLeadConversationState(leadUuid, 'irrelevant');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [
          { type: 'text', text: AUDIENCE_DISQUALIFY_REPLY },
        ]);
      }

      // Pre-check: meeting intent
      if (detectMeetingIntent(userMessage)) {
        await saveMessage(leadUuid, subscriberId, 'assistant', MEETING_BOOKING_REPLY, {
          action: 'book_meeting',
          state: 'booking',
        });
        await updateLeadConversationState(leadUuid, 'booking');
        await recordFunnelEvent(leadUuid, 'meeting_offered', { trigger: 'regex' });
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(
          leadUuid,
          buildBookingMessages(leadUuid, MEETING_BOOKING_REPLY),
        );
      }

      // Pre-check: meta frustration
      const frustrationAction = detectMetaFrustration(userMessage, currentState);
      if (frustrationAction === 'book_meeting') {
        await saveMessage(leadUuid, subscriberId, 'assistant', MEETING_BOOKING_REPLY, {
          action: 'book_meeting',
          state: 'booking',
        });
        await updateLeadConversationState(leadUuid, 'booking');
        await recordFunnelEvent(leadUuid, 'meeting_offered', { trigger: 'frustration' });
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(
          leadUuid,
          buildBookingMessages(leadUuid, MEETING_BOOKING_REPLY),
        );
      }

      if (frustrationAction === 'human_handoff') {
        const reply = await handleHandoff(leadUuid, subscriberId, 'meta_frustration', history);
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'human_handoff',
          state: 'escalated',
        });
        await updateLeadConversationState(leadUuid, 'escalated');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: reply }]);
      }

      const objectionLoops = await countObjectionLoops(leadUuid);
      if (objectionLoops >= 2 && currentState === 'objection') {
        const followupReply = 'מבינה. אם תרצי בעוד כמה שבועות — אני פה :)';
        await saveMessage(leadUuid, subscriberId, 'assistant', followupReply, {
          action: 'request_followup',
          state: 'irrelevant',
        });
        await updateLeadConversationState(leadUuid, 'irrelevant');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: followupReply }]);
      }

      const agentOutput = await runSalesAgent({
        history,
        newMessage: userMessage,
        currentState,
        conversationContext,
      });

      if (agentOutput.action === 'mark_spam') {
        await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
          action: 'mark_spam',
          state: 'spam',
        });
        await updateLeadConversationState(leadUuid, 'spam');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: agentOutput.reply }]);
      }

      if (agentOutput.action === 'mark_irrelevant') {
        await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
          action: 'mark_irrelevant',
          state: 'irrelevant',
        });
        await updateLeadConversationState(leadUuid, 'irrelevant');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: agentOutput.reply }]);
      }

      if (agentOutput.action === 'human_handoff') {
        const reply = await handleHandoff(
          leadUuid,
          subscriberId,
          'agent_decision',
          history,
        );
        const finalReply = agentOutput.reply.trim() || reply;
        await saveMessage(leadUuid, subscriberId, 'assistant', finalReply, {
          action: 'human_handoff',
          state: 'escalated',
        });
        await updateLeadConversationState(leadUuid, 'escalated');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: finalReply }]);
      }

      if (agentOutput.action === 'request_followup') {
        const reply = agentOutput.reply.trim() || 'מעולה, אחזור אלייך כשיהיה נכון יותר :)';
        await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
          action: 'request_followup',
          state: agentOutput.state,
        });
        await updateLeadConversationState(
          leadUuid,
          agentOutput.state,
          Object.keys(agentOutput.extracted_facts).length > 0
            ? (agentOutput.extracted_facts as Record<string, unknown>)
            : undefined,
        );
        await scheduleFollowup(leadUuid);
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: reply }]);
      }

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

      await updateLeadConversationState(
        leadUuid,
        agentOutput.state,
        Object.keys(agentOutput.extracted_facts).length > 0
          ? (agentOutput.extracted_facts as Record<string, unknown>)
          : undefined,
      );

      if (agentOutput.action === 'book_meeting') {
        await recordFunnelEvent(leadUuid, 'meeting_offered', { trigger: 'agent' });
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(
          leadUuid,
          buildBookingMessages(leadUuid, agentOutput.reply),
        );
      }

      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return dynamicBlockResponse(leadUuid, [{ type: 'text', text: agentOutput.reply }]);
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

async function countObjectionLoops(leadUuid: string): Promise<number> {
  const { createServiceRoleClient } = await import('@/lib/supabase/server');
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('conversation_messages')
    .select('metadata')
    .eq('lead_uuid', leadUuid)
    .eq('role', 'assistant')
    .order('created_at', { ascending: true });

  return (data ?? []).filter((m) => {
    const state = (m.metadata as Record<string, unknown> | null)?.state;
    return state === 'objection';
  }).length;
}
