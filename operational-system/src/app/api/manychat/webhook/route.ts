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
import { pushManyChatReply } from '@/lib/manychat/sendApi';
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
  const filtered = messages.filter((m) => m.text.trim().length > 0);
  const block: ManyChatDynamicBlockResponse = {
    version: 'v2',
    content: {
      messages: filtered,
      actions: [{ action: 'set_field_value', field_name: 'lead_uuid', value: leadUuid }],
    },
  };
  // #region agent log
  fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06149a'},body:JSON.stringify({sessionId:'06149a',location:'webhook/route.ts:dynamicBlockResponse',message:'block sent',data:{messageCount:filtered.length,messages:filtered.map(m=>({len:m.text.length,preview:m.text.slice(0,80)})),fullBlock:JSON.stringify(block).slice(0,400)},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
  // #endregion
  return NextResponse.json(block);
}

function buildBookingMessages(
  leadUuid: string,
  reply: string,
): Array<{ type: 'text'; text: string }> {
  const messages: Array<{ type: 'text'; text: string }> = [{ type: 'text', text: reply }];
  const bookingUrl = process.env.CALCOM_BOOKING_URL?.trim();
  // #region agent log
  fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06149a'},body:JSON.stringify({sessionId:'06149a',location:'webhook/route.ts:buildBookingMessages',message:'booking url check',data:{bookingUrl:bookingUrl??'UNDEFINED',envKeys:Object.keys(process.env).filter(k=>k.includes('CAL')||k.includes('BOOKING')),reply},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
  // #endregion
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

  // #region agent log
  fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ca65b'},body:JSON.stringify({sessionId:'0ca65b',location:'route.ts:POST-saveEvent',message:'saveManyChatEvent result',data:{eventId:eventId??'NULL',saveError:saveError??null,rawSubscriberId:payload.subscriber_id,rawSubType:typeof payload.subscriber_id,eventType},timestamp:Date.now(),hypothesisId:'H-D'})}).catch(()=>{});
  // #endregion

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

      // #region agent log
      fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ca65b'},body:JSON.stringify({sessionId:'0ca65b',location:'route.ts:lead_message',message:'subscriber_id extraction',data:{rawSubscriberId:String(rawSubscriberId??'undefined').slice(0,40),rawSubType:typeof rawSubscriberId,coercedSubscriberId:subscriberId??'undefined',eventId:eventId??'NULL'},timestamp:Date.now(),hypothesisId:'H-A,H-D'})}).catch(()=>{});
      // #endregion

      if (!userMessage) {
        if (eventId) await updateManyChatEventStatus(eventId, 'error', 'empty message');
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

async function processLeadMessage(
  leadUuid: string,
  subscriberId: string | undefined,
  userMessage: string,
  eventId: string | null,
): Promise<void> {
  // push() sends the reply via ManyChat Send API and returns the result.
  // finalize() calls push() then writes the outcome to manychat_events.process_error
  // so it is visible in Supabase Table Editor regardless of Vercel log availability.
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
    // Include subscriber_id in the debug note so we can compare to ManyChat dashboard.
    const debugNote = r.success
      ? `push_ok | sub=${subscriberId ?? 'MISSING'}`
      : `push_failed: ${r.error ?? 'unknown'} | sub=${subscriberId ?? 'MISSING'}`;
    if (eventId) {
      await updateManyChatEventStatus(eventId, r.success ? 'done' : 'error', debugNote);
    } else {
      // eventId is null — saveManyChatEvent failed. Write a dedicated debug record so
      // the push result is always visible in Supabase Table Editor (H-D verification).
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
    // #region agent log
    fetch('http://127.0.0.1:7859/ingest/eaae9886-8d8c-42ff-b024-50d1c3875c50',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0ca65b'},body:JSON.stringify({sessionId:'0ca65b',location:'route.ts:finalize',message:'finalize result',data:{pushSuccess:r.success,pushError:r.error??null,subscriberId:subscriberId??'MISSING',eventId:eventId??'NULL',debugNote},timestamp:Date.now(),hypothesisId:'H-A,H-D'})}).catch(()=>{});
    // #endregion
  };

  try {
    console.log('[ManyChat Webhook] processLeadMessage: started', { leadUuid, subscriberId, messageLen: userMessage.length });
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
      await finalize([{ type: 'text', text: escalationReply }]);
      return;
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
      await finalize([{ type: 'text', text: AUDIENCE_DISQUALIFY_REPLY }]);
      return;
    }

    // Pre-check: meeting intent
    if (detectMeetingIntent(userMessage)) {
      await saveMessage(leadUuid, subscriberId, 'assistant', MEETING_BOOKING_REPLY, {
        action: 'book_meeting',
        state: 'booking',
      });
      await updateLeadConversationState(leadUuid, 'booking');
      await recordFunnelEvent(leadUuid, 'meeting_offered', { trigger: 'regex' });
      await finalize(buildBookingMessages(leadUuid, MEETING_BOOKING_REPLY));
      return;
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
      await finalize(buildBookingMessages(leadUuid, MEETING_BOOKING_REPLY));
      return;
    }

    if (frustrationAction === 'human_handoff') {
      const reply = await handleHandoff(leadUuid, subscriberId, 'meta_frustration', history);
      await saveMessage(leadUuid, subscriberId, 'assistant', reply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await updateLeadConversationState(leadUuid, 'escalated');
      await finalize([{ type: 'text', text: reply }]);
      return;
    }

    const objectionLoops = await countObjectionLoops(leadUuid);
    if (objectionLoops >= 2 && currentState === 'objection') {
      const followupReply = 'מבינה. אם תרצי בעוד כמה שבועות — אני פה :)';
      await saveMessage(leadUuid, subscriberId, 'assistant', followupReply, {
        action: 'request_followup',
        state: 'irrelevant',
      });
      await updateLeadConversationState(leadUuid, 'irrelevant');
      await finalize([{ type: 'text', text: followupReply }]);
      return;
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
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'mark_irrelevant') {
      await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
        action: 'mark_irrelevant',
        state: 'irrelevant',
      });
      await updateLeadConversationState(leadUuid, 'irrelevant');
      await finalize([{ type: 'text', text: agentOutput.reply }]);
      return;
    }

    if (agentOutput.action === 'human_handoff') {
      const reply = await handleHandoff(leadUuid, subscriberId, 'agent_decision', history);
      const finalReply = agentOutput.reply.trim() || reply;
      await saveMessage(leadUuid, subscriberId, 'assistant', finalReply, {
        action: 'human_handoff',
        state: 'escalated',
      });
      await updateLeadConversationState(leadUuid, 'escalated');
      await finalize([{ type: 'text', text: finalReply }]);
      return;
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
      await finalize([{ type: 'text', text: reply }]);
      return;
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
      await finalize(buildBookingMessages(leadUuid, agentOutput.reply));
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
