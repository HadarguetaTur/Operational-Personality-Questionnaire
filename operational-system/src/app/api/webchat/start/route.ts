import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  saveMessage,
  upsertBotState,
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
    // Seed the name into bot context so the opening + later turns can use it.
    await upsertBotState(leadUuid, 'discovery', { name: firstName }, undefined, 'web');
    // Pre-send the opening so the bot greets first, by name.
    await saveMessage(
      leadUuid,
      undefined,
      'assistant',
      buildFixedOpening(firstName),
      { action: 'continue', state: 'discovery' },
      'web',
    );
  }

  return NextResponse.json({ leadUuid, firstName: firstName ?? null });
}
