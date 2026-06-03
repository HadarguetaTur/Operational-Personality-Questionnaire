import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyWebhookSecret } from '@/lib/manychat/verifyWebhookSecret';
import { saveManyChatEvent, updateManyChatEventStatus } from '@/lib/events/saveManyChatEvent';
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

function dynamicBlockResponse(leadUuid: string, text: string): NextResponse {
  // ManyChat Dynamic Block — returned inline in the External Request response.
  // ManyChat sends the messages to the subscriber through their channel (WhatsApp)
  // without any 24h Send API restriction, because it runs inside the flow context.
  const block: ManyChatDynamicBlockResponse = {
    version: 'v2',
    content: {
      messages: [{ type: 'text', text }],
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
      return dynamicBlockResponse(leadUuid, 'בדיקת חיבור: השרת קיבל את ההודעה ושלח תשובה דרך ManyChat ✓');

    default:
      // Unknown event types are saved (step 6) and ACKed without side effects.
      // Phase 1 processor will pick these up from manychat_events.
      console.log('[ManyChat Webhook] Unknown event_type, saved and ACKed:', eventType);
      return ackResponse(leadUuid, eventType);
  }
}
