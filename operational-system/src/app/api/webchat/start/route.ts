import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  saveMessage,
  getConversationHistory,
} from '@/lib/db/conversationMessages';
import { buildFixedOpening } from '@/lib/bot/handleInboundMessage';

export const maxDuration = 60;

interface ResultSnapshot {
  user_name?: string;
}

/**
 * Starts (or resumes) an on-site chat session for a quiz lead.
 *
 * Body: { token }  — the lead's report_token from the quiz.
 * Resolves leadUuid = leads.id, seeds the lead's first name into bot context,
 * and (for a fresh conversation) pre-sends the assistant's opening so the bot
 * greets first, by name. Returns { leadUuid, firstName }.
 */
export async function POST(request: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || !/^[0-9a-f]{16,40}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, result_snapshot')
    .eq('report_token', token)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const leadUuid = lead.id as string;
  const snapshot = (lead.result_snapshot ?? null) as ResultSnapshot | null;
  const firstName = (snapshot?.user_name ?? '').split(' ')[0] || undefined;

  // Only seed a brand-new conversation. On reload of an in-progress chat we must
  // NOT reset state (e.g. scheduling → discovery) — just hand back the identity.
  const history = await getConversationHistory(leadUuid, 1);
  if (history.length === 0) {
    // Atomically claim the right to seed the opening. lead_uuid is the PK of
    // bot_conversation_state, so under concurrent /start calls (React StrictMode's
    // double-effect, multi-tab, retries) exactly one INSERT wins; the rest fail
    // with a duplicate-key error (23505) and skip seeding. This is what prevents
    // the opening bubble from being saved twice.
    const { error: claimError } = await supabase
      .from('bot_conversation_state')
      .insert({
        lead_uuid: leadUuid,
        state: 'discovery',
        context: { name: firstName },
        channel: 'web',
      });

    if (!claimError) {
      // We won the claim → seed the opening once so the bot greets first, by name.
      await saveMessage(
        leadUuid,
        undefined,
        'assistant',
        buildFixedOpening(firstName),
        { action: 'continue', state: 'discovery' },
        'web',
      );
      // Best-effort dashboard mirror (matches upsertBotState's side effect).
      await supabase
        .from('leads')
        .update({
          conversation_state: 'discovery',
          conversation_context: { name: firstName },
        })
        .eq('id', leadUuid);
    } else if (claimError.code !== '23505') {
      // Unexpected (not a duplicate-key) error — log, but let the chat proceed.
      console.error('[webchat/start] claim insert failed:', claimError.message);
    }
  }

  return NextResponse.json({ leadUuid, firstName: firstName ?? null });
}
