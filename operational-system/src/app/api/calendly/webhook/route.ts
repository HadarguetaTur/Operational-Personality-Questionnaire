import { NextRequest, NextResponse } from 'next/server';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';

export async function POST(request: NextRequest) {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET?.trim();
  if (secret) {
    const received = request.headers.get('calendly-webhook-signature') ?? '';
    if (!received) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // MVP: presence check only; full signature verification in V1.1
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
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
