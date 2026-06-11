import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';

// Allow up to 5 minutes so waitUntil background tasks (LLM + ManyChat push) are not killed.
// Requires Vercel Pro or higher; on Hobby this is capped at 10s regardless.
export const maxDuration = 300;
import { verifyWebhookSecret } from '@/lib/manychat/verifyWebhookSecret';
import { saveManyChatEvent, updateManyChatEventStatus } from '@/lib/events/saveManyChatEvent';
import { upsertBotState } from '@/lib/db/conversationMessages';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';
import { runQuizIntakeAgent } from '@/lib/agents/quizIntakeAgent';
import { resolveLeadIdentity } from '@/lib/db/leadRegistry';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseChannel } from '@/lib/channels/types';
import { createManyChatSender } from '@/lib/channels/manychatSender';
import { handleInboundMessage } from '@/lib/bot/handleInboundMessage';
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
  return NextResponse.json(block);
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
  // The ManyChat entry flow per channel sets "channel" in the request body;
  // legacy WhatsApp flows omit it → parseChannel falls back to whatsapp.
  // "web" can never arrive through ManyChat — coerce it away defensively.
  const parsedChannel = parseChannel(payload.channel);
  const channel = parsedChannel === 'web' ? 'whatsapp' : parsedChannel;

  const { id: eventId, error: saveError } = await saveManyChatEvent({
    lead_uuid: leadUuid,
    subscriber_id:
      typeof payload.subscriber_id === 'string' && payload.subscriber_id.trim()
        ? payload.subscriber_id.trim()
        : undefined,
    event_type: eventType,
    payload,
    channel,
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

      // Transport-specific bookkeeping after the reply is delivered (or fails):
      // marks the webhook event done/error, or debug-logs when no event row exists.
      const onResult = async (r: { success: boolean; error?: string; messageCount: number }) => {
        const debugNote = r.success
          ? `push_ok | sub=${subscriberId ?? 'MISSING'}`
          : `push_failed: ${r.error ?? 'unknown'} | sub=${subscriberId ?? 'MISSING'}`;
        if (eventId) {
          await updateManyChatEventStatus(eventId, r.success ? 'done' : 'error', debugNote);
          return;
        }
        const supa = createServiceRoleClient();
        const { error: debugErr } = await supa.from('manychat_events').insert({
          lead_uuid: canonicalLeadUuid,
          subscriber_id: subscriberId ?? null,
          event_type: 'debug_push_result',
          payload: {
            subscriberId,
            pushSuccess: r.success,
            pushError: r.error ?? null,
            messageCount: r.messageCount,
          } as Record<string, unknown>,
          channel,
          process_status: r.success ? 'done' : 'error',
          process_error: debugNote,
          received_at: new Date().toISOString(),
        });
        if (debugErr) console.error('[webhook] debug insert failed:', debugErr.message);
      };

      // Return immediately to ManyChat — LLM runs in background, reply pushed via Send API.
      waitUntil(
        handleInboundMessage({
          leadUuid: canonicalLeadUuid,
          subscriberId,
          userMessage,
          channel,
          sender: createManyChatSender(channel),
          phone,
          onResult,
        }),
      );
      return NextResponse.json({ version: 'v2', content: { messages: [] } });
    }

    case 'questionnaire_completed': {
      const quizResult = await runQuizIntakeAgent({ leadUuid });
      // Bridge quiz intake into bot state so the pipeline can use opening_hook + facts
      await upsertBotState(
        leadUuid,
        'initial',
        {
          opening_hook: quizResult.opening_hook,
          ...quizResult.pre_extracted_facts,
        },
        undefined,
        channel,
      );
      await recordFunnelEvent(leadUuid, 'quiz_completed');
      if (eventId) await updateManyChatEventStatus(eventId, 'done');
      return ackResponse(leadUuid, eventType);
    }

    default:
      return ackResponse(leadUuid, eventType);
  }
}
