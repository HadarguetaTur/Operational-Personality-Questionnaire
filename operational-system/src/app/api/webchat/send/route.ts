import { NextRequest, NextResponse } from 'next/server';
import { handleInboundMessage } from '@/lib/bot/handleInboundMessage';
import { webSender } from '@/lib/channels/webSender';

// Allow the full LLM pipeline to run before responding (matches the ManyChat route).
export const maxDuration = 300;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LEN = 1000;

/**
 * Inbound message from the on-site chat widget.
 *
 * Body: { leadUuid, message }. Runs the exact same bot brain as WhatsApp via
 * handleInboundMessage with the no-op web sender; the assistant reply is
 * persisted to conversation_messages, which the widget picks up by polling
 * GET /api/webchat/messages.
 */
export async function POST(request: NextRequest) {
  let body: { leadUuid?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const leadUuid = typeof body.leadUuid === 'string' ? body.leadUuid.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!UUID_REGEX.test(leadUuid)) {
    return NextResponse.json({ error: 'Invalid leadUuid' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  const trimmed = message.slice(0, MAX_MESSAGE_LEN);

  try {
    await handleInboundMessage({
      leadUuid,
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
