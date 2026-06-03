import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { verifyWebhookSecret } from '@/lib/manychat/verifyWebhookSecret';
import { saveManyChatEvent } from '@/lib/events/saveManyChatEvent';
import { sendManyChatText } from '@/lib/manychat/sendApi';
import type {
  ManyChatWebhookPayload,
  SimpleAckResponse,
  ManyChatDynamicBlockResponse,
} from '@/lib/manychat/types';

/**
 * When false (Phase 0 default): return a simple JSON ACK.
 * When true: return a ManyChat Dynamic Block response that can set custom fields.
 *
 * REQUIRES MANUAL VALIDATION before setting to true —
 * the Dynamic Block format must be confirmed against ManyChat docs.
 * Switching also requires updating the ManyChat flow's "Map Response" config.
 */
const USE_MANYCHAT_DYNAMIC_BLOCK = false;

function buildResponse(leadUuid: string, eventType: string): NextResponse {
  if (!USE_MANYCHAT_DYNAMIC_BLOCK) {
    const body: SimpleAckResponse = {
      ok: true,
      event_type: eventType,
      lead_uuid: leadUuid,
      received_at: new Date().toISOString(),
    };
    return NextResponse.json(body);
  }

  // REQUIRES MANUAL VALIDATION — not active in Phase 0.
  const block: ManyChatDynamicBlockResponse = {
    version: 'v2',
    content: {
      type: 'text',
      text: `ACK: ${eventType}`,
    },
    actions: [
      {
        action: 'set_field_value',
        field_name: 'lead_uuid',
        value: leadUuid,
      },
    ],
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
  const subscriberId =
    typeof payload.subscriber_id === 'string' && payload.subscriber_id.trim()
      ? payload.subscriber_id.trim()
      : undefined;

  // ── 5. Resolve lead_uuid — generate if absent ─────────────────
  const leadUuid: string =
    typeof payload.lead_uuid === 'string' && payload.lead_uuid.trim()
      ? payload.lead_uuid.trim()
      : randomUUID();

  const uuidSource = payload.lead_uuid ? 'received' : 'generated';
  console.log('[ManyChat Webhook] Received:', { eventType, subscriberId, leadUuid, uuidSource });

  // ── 6. Persist raw event to Supabase ─────────────────────────
  // TODO Phase 1: add idempotency key to prevent duplicate processing on retries.
  const { error: saveError } = await saveManyChatEvent({
    lead_uuid: leadUuid,
    subscriber_id: subscriberId,
    event_type: eventType,
    payload,
  });

  if (saveError) {
    // ACK anyway — do not return 5xx here, which would trigger ManyChat retries
    // and flood the DB with duplicate events once connectivity is restored.
    console.error('[ManyChat Webhook] Supabase insert failed, ACKing anyway:', saveError);
  }

  // ── 7. Event-type routing ─────────────────────────────────────
  switch (eventType) {
    case 'test_connection':
      // Simple roundtrip: proves ManyChat can reach Vercel. No side effects.
      console.log('[ManyChat Webhook] test_connection — returning ACK, lead_uuid:', leadUuid);
      break;

    case 'test_send_message':
      // Fire-and-forget: send a WA message back via ManyChat Send API.
      // waitUntil() keeps the Vercel function alive after the response is sent.
      if (subscriberId) {
        waitUntil(
          sendManyChatText(
            subscriberId,
            `בדיקת חיבור: השרת קיבל את ההודעה ושלח תשובה דרך ManyChat ✓ (lead_uuid: ${leadUuid})`,
          )
            .then((result) => {
              if (!result.success) {
                console.error('[ManyChat Webhook] sendManyChatText failed:', result.error);
              } else {
                console.log('[ManyChat Webhook] sendManyChatText succeeded for subscriber:', subscriberId);
              }
            })
            .catch((err: unknown) => {
              console.error('[ManyChat Webhook] sendManyChatText threw unexpectedly:', err);
            }),
        );
      } else {
        console.warn('[ManyChat Webhook] test_send_message: no subscriber_id in payload — skipping send');
      }
      break;

    default:
      // Unknown event types are saved (step 6) and ACKed without side effects.
      // In Phase 1, a processor will pick these up from manychat_events.
      console.log('[ManyChat Webhook] Unknown event_type, saved and ACKed:', eventType);
  }

  // ── 8. Respond ────────────────────────────────────────────────
  return buildResponse(leadUuid, eventType);
}
