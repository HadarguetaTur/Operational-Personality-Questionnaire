import { NextRequest, NextResponse } from 'next/server';
import { handleInboundMessage } from '@/lib/bot/handleInboundMessage';
import { webSender } from '@/lib/channels/webSender';
import { checkFixedKeyRateLimit, checkRateLimit } from '@/lib/rateLimit';
import { resolveWebchatLead } from '@/lib/webchat/resolveLead';

// Allow the full LLM pipeline to run before responding (matches the ManyChat route).
export const maxDuration = 300;

const MAX_MESSAGE_LEN = 1000;
const ONE_MIN_MS = 60_000;

/**
 * Inbound message from the on-site chat widget.
 *
 * Body: { token, message }. `token` is the lead's report_token; the lead UUID
 * is resolved server-side and never taken from the client. Each message runs
 * the paid LLM pipeline, so the route is rate-limited per token and per IP.
 */
export async function POST(request: NextRequest) {
  if (!checkRateLimit(request, 'webchat_send_ip', 30, ONE_MIN_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { token?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  const lead = await resolveWebchatLead(body.token);
  if (!lead.ok) {
    return NextResponse.json({ error: lead.error }, { status: lead.status });
  }

  if (!checkFixedKeyRateLimit('webchat_send_token', lead.leadUuid, 10, ONE_MIN_MS)) {
    return NextResponse.json({ error: 'Too many messages' }, { status: 429 });
  }

  const trimmed = message.slice(0, MAX_MESSAGE_LEN);

  try {
    await handleInboundMessage({
      leadUuid: lead.leadUuid,
      userMessage: trimmed,
      channel: 'web',
      sender: webSender,
    });
  } catch (err) {
    console.error('[webchat/send] handleInboundMessage failed:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
