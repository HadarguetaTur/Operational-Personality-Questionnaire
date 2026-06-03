import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyWebhookSecret } from '@/lib/manychat/verifyWebhookSecret';
import { saveManyChatEvent, updateManyChatEventStatus } from '@/lib/events/saveManyChatEvent';
import { saveMessage, getConversationHistory, updateLeadConversationState, countUserMessagesForLead, getLeadConversationState } from '@/lib/db/conversationMessages';
import { runSalesAgent } from '@/lib/ai/salesAgent';
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
  // ManyChat Dynamic Block — returned inline in the External Request response.
  // ManyChat sends the messages to the subscriber through their channel (WhatsApp)
  // without any 24h Send API restriction, because it runs inside the flow context.
  const block: ManyChatDynamicBlockResponse = {
    version: 'v2',
    content: {
      messages,
      actions: [{ action: 'set_field_value', field_name: 'lead_uuid', value: leadUuid }],
    },
  };
  return NextResponse.json(block);
}

export async function POST(request: NextRequest) {
  // ── 1. Guard: webhook secret configured ───────────────────────
  const webhookSecret = process.env.MANYCHAT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('[ManyChat Webhook] MANYCHAT_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // ── 2. Verify X-Webhook-Secret (constant-time) ────────────────
  const receivedSecret = request.headers.get('x-webhook-secret') ?? '';
  if (!verifyWebhookSecret(receivedSecret, webhookSecret)) {
    console.warn('[ManyChat Webhook] Rejected: invalid X-Webhook-Secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 3. Parse body ─────────────────────────────────────────────
  let payload: ManyChatWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || typeof payload.event_type !== 'string') {
    return NextResponse.json({ error: 'Missing required field: event_type' }, { status: 400 });
  }

  // ── 4. Extract fields ─────────────────────────────────────────
  const eventType = payload.event_type.trim();

  // ── 5. Resolve lead_uuid — generate if absent or not a valid UUID ────────
  // When the ManyChat custom field is empty, ManyChat sends the literal template
  // string e.g. "{{cuf_14652832}}" instead of a real UUID. Validate the format
  // so those tokens are treated the same as a missing field.
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawUuid = typeof payload.lead_uuid === 'string' ? payload.lead_uuid.trim() : '';
  const leadUuid: string = UUID_REGEX.test(rawUuid) ? rawUuid : randomUUID();

  const uuidSource = UUID_REGEX.test(rawUuid) ? 'received' : 'generated';
  console.log('[ManyChat Webhook] Received:', { eventType, leadUuid, uuidSource });

  // ── 6. Persist raw event to Supabase ─────────────────────────
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
    // ACK anyway — do not return 5xx, which would trigger ManyChat retry storms.
    console.error('[ManyChat Webhook] Supabase insert failed, ACKing anyway:', saveError);
  }

  // ── 7. Event-type routing ─────────────────────────────────────
  switch (eventType) {
    case 'test_connection':
      // Simple roundtrip: proves ManyChat → Vercel direction works.
      console.log('[ManyChat Webhook] test_connection — lead_uuid:', leadUuid);
      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return ackResponse(leadUuid, eventType);

    case 'test_send_message':
      // Returns a Dynamic Block response — ManyChat delivers the message to the
      // subscriber through their channel (WhatsApp) inside the flow context.
      // This bypasses the 24h Send API restriction that applies to push messages.
      console.log('[ManyChat Webhook] test_send_message — returning Dynamic Block');
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
        console.warn('[ManyChat Webhook] lead_message with empty message field');
        if (eventId) await updateManyChatEventStatus(eventId, 'error', 'empty message');
        return ackResponse(leadUuid, eventType);
      }

      // 1. Save incoming user message
      await saveMessage(leadUuid, subscriberId, 'user', userMessage);

      // 2. Hard cap: after 10 user messages, escalate to human — skip AI entirely
      const userMsgCount = await countUserMessagesForLead(leadUuid);
      if (userMsgCount >= 10) {
        const escalationReply = 'שיחה זו הועברה לנציג. הדר תחזור אליך בהקדם 🙏';
        await saveMessage(leadUuid, subscriberId, 'assistant', escalationReply, {
          action: 'escalate_to_human',
          state: 'escalated',
        });
        await updateLeadConversationState(leadUuid, 'escalated');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: escalationReply }]);
      }

      // 3. Load conversation history + current state
      const [history, currentState] = await Promise.all([
        getConversationHistory(leadUuid),
        getLeadConversationState(leadUuid),
      ]);

      // 4b. Run the stage-specific agent
      const agentOutput = await runSalesAgent({ history, newMessage: userMessage, currentState });

      // 4. Short-circuit on spam: save once and close conversation
      if (agentOutput.action === 'mark_spam') {
        await saveMessage(leadUuid, subscriberId, 'assistant', agentOutput.reply, {
          action: 'mark_spam',
          state: 'spam',
        });
        await updateLeadConversationState(leadUuid, 'spam');
        if (eventId) await updateManyChatEventStatus(eventId, 'done');
        return dynamicBlockResponse(leadUuid, [{ type: 'text', text: agentOutput.reply }]);
      }

      // 5. Save agent reply (with token usage if available)
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

      // 6. Update conversation state on the lead row (best-effort)
      await updateLeadConversationState(
        leadUuid,
        agentOutput.state,
        Object.keys(agentOutput.extracted_facts).length > 0
          ? (agentOutput.extracted_facts as Record<string, unknown>)
          : undefined,
      );

      // 7. Build Dynamic Block messages
      const blockMessages: Array<{ type: 'text'; text: string }> = [
        { type: 'text', text: agentOutput.reply },
      ];

      if (agentOutput.action === 'book_meeting') {
        const bookingUrl = process.env.CALCOM_BOOKING_URL;
        if (bookingUrl) {
          blockMessages.push({ type: 'text', text: `לקביעת פגישת האפיון עם הדר: ${bookingUrl}` });
        }
      }

      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return dynamicBlockResponse(leadUuid, blockMessages);
    }

    default:
      // Unknown event types are saved (step 6) and ACKed without side effects.
      console.log('[ManyChat Webhook] Unknown event_type, saved and ACKed:', eventType);
      return ackResponse(leadUuid, eventType);
  }
}
