import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { pushManyChatReply } from '@/lib/manychat/sendApi';
import { getBotState, getConversationHistory } from '@/lib/db/conversationMessages';
import { runFollowupWriter } from '@/lib/ai/followupWriter';

// Conversation states where a follow-up must never be sent.
const TERMINAL_STATES = new Set([
  'booking',
  'closed',
  'escalated',
  'spam',
  'irrelevant',
]);

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();

  // ── Due follow-up touches ─────────────────────────────────────────────────
  const { data: dueRows } = await supabase
    .from('pending_followups')
    .select('id, lead_uuid, step')
    .is('closed_at', null)
    .lte('remind_at', now.toISOString());

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of dueRows ?? []) {
    // Single follow-up policy: one nudge the morning after the lead went quiet.
    const touch = 1;

    // Load state/context + check whether a meeting was already booked.
    const [botState, leadRow] = await Promise.all([
      getBotState(row.lead_uuid),
      supabase
        .from('leads')
        .select('meeting_booked_at')
        .eq('id', row.lead_uuid)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

    const subscriberId = botState.subscriber_id;
    const state = botState.state ?? 'irrelevant';
    const optedOut = botState.context?.opt_out === true;
    const meetingBooked = !!leadRow?.meeting_booked_at;

    // ── Stop conditions: never nudge these ──────────────────────────────────
    if (TERMINAL_STATES.has(state) || optedOut || meetingBooked) {
      await supabase
        .from('pending_followups')
        .update({ closed_at: now.toISOString() })
        .eq('id', row.id);
      skipped++;
      continue;
    }

    if (!subscriberId) {
      // Cannot reach the lead — close to avoid infinite retries.
      await supabase
        .from('pending_followups')
        .update({ closed_at: now.toISOString() })
        .eq('id', row.id);
      skipped++;
      continue;
    }

    // ── Compose the touch in Hadar's voice ──────────────────────────────────
    const history = await getConversationHistory(row.lead_uuid);
    const message = await runFollowupWriter({
      history,
      context: botState.context ?? {},
      touch,
    });

    const result = await pushManyChatReply(
      subscriberId,
      [{ type: 'text', text: message }],
      row.lead_uuid,
    );

    if (!result.success) {
      failed++;
      console.warn(`[cron/silent-leads] push failed for ${row.lead_uuid}:`, result.error);
      continue; // leave row open — retry next hour
    }

    sent++;
    // One and done — close the sequence after the single morning nudge.
    await supabase
      .from('pending_followups')
      .update({ step: 1, closed_at: now.toISOString() })
      .eq('id', row.id);
  }

  return NextResponse.json({
    ok: true,
    due: (dueRows ?? []).length,
    sent,
    failed,
    skipped,
    run_at: now.toISOString(),
  });
}
