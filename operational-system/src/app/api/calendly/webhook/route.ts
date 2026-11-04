import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';
import { safeEqual } from '@/lib/security/safeEqual';

// Reject signatures older than this to limit replay.
const MAX_SKEW_SECONDS = 5 * 60;

/**
 * Verifies the `Calendly-Webhook-Signature` header:
 *   t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the signing key>
 */
function verifyCalendlySignature(header: string, rawBody: string, signingKey: string): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const idx = kv.indexOf('=');
      return idx === -1 ? [kv.trim(), ''] : [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
    }),
  ) as Record<string, string>;

  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1 || !/^\d+$/.test(t)) return false;

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (ageSeconds > MAX_SKEW_SECONDS) return false;

  const expected = createHmac('sha256', signingKey).update(`${t}.${rawBody}`).digest('hex');
  return safeEqual(expected, v1);
}

export async function POST(request: NextRequest) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SECRET?.trim();
  if (!signingKey) {
    // Never accept unsigned booking events: a forged `meeting_booked` would
    // silence the follow-up flow for a real lead.
    console.error('[calendly/webhook] CALENDLY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('calendly-webhook-signature') ?? '';
  if (!signature || !verifyCalendlySignature(signature, rawBody, signingKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event as string | undefined;
  if (event !== 'invitee.created') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payload = body.payload as Record<string, unknown> | undefined;
  const tracking = payload?.tracking as Record<string, unknown> | undefined;
  const leadUuid =
    (typeof tracking?.utm_content === 'string' && tracking.utm_content) ||
    (typeof payload?.utm_content === 'string' && payload.utm_content) ||
    null;

  if (leadUuid) {
    await recordFunnelEvent(leadUuid, 'meeting_booked', {
      calendly_event: payload?.event ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
