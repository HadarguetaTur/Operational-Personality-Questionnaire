import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getBotState,
  getConversationHistory,
  getLastUserMessageAt,
} from '@/lib/db/conversationMessages';
import { runFollowupWriter } from '@/lib/ai/followupWriter';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';
import { isTerminalState } from '@/lib/bot/terminalStates';
import { CHANNEL_CAPABILITIES } from '@/lib/channels/types';
import { createManyChatSender } from '@/lib/channels/manychatSender';

// Meta's messaging window is 24h; send only with an hour of safety margin.
// HARD RULE for IG/FB: there is NO bypass (WhatsApp uses a template flow, which
// is exempt). Nothing — writer, specialist, manual call — may go around this.
const MESSAGING_WINDOW_SAFE_MS = 23 * 60 * 60 * 1000;

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
  let skippedTerminal = 0;
  let skippedNoSubscriber = 0;
  let skippedWindow = 0;
  let skippedNoOutbound = 0;

  const closeRow = (id: string) =>
    supabase.from('pending_followups').update({ closed_at: now.toISOString() }).eq('id', id);

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
    const channel = botState.channel;
    const optedOut = botState.context?.opt_out === true;
    const meetingBooked = !!leadRow?.meeting_booked_at;
    const capabilities = CHANNEL_CAPABILITIES[channel];

    // ── Stop conditions: never nudge these ──────────────────────────────────
    if (isTerminalState(state) || optedOut || meetingBooked) {
      await closeRow(row.id);
      skippedTerminal++;
      continue;
    }

    // Channels without proactive outbound (web) — nothing to send.
    // (Phase 5 will surface these leads to Hadar via Slack digest instead.)
    if (!capabilities.supportsOutboundFollowup) {
      await closeRow(row.id);
      skippedNoOutbound++;
      continue;
    }

    if (!subscriberId) {
      // Cannot reach the lead — close to avoid infinite retries.
      await closeRow(row.id);
      skippedNoSubscriber++;
      continue;
    }

    // ── HARD RULE: Meta 24h messaging window (IG/FB only) ───────────────────
    // WhatsApp bypasses via its template flow; IG/FB sends outside the window
    // violate Meta policy, so the row is closed and the skip is recorded for
    // monitoring (funnel_events + the skipped_window counter below).
    if (capabilities.requiresMessagingWindow && channel !== 'whatsapp') {
      const lastUserMessageAt = await getLastUserMessageAt(row.lead_uuid);
      const withinWindow =
        lastUserMessageAt !== null &&
        now.getTime() - lastUserMessageAt.getTime() < MESSAGING_WINDOW_SAFE_MS;
      if (!withinWindow) {
        await closeRow(row.id);
        skippedWindow++;
        await recordFunnelEvent(row.lead_uuid, 'followup_skipped', {
          reason: 'outside_messaging_window',
          channel,
        });
        continue;
      }
    }

    // ── Compose the touch in Hadar's voice ──────────────────────────────────
    const history = await getConversationHistory(row.lead_uuid);
    const message = await runFollowupWriter({
      history,
      context: botState.context ?? {},
      touch,
    });

    const sender = createManyChatSender(channel);
    const result = await sender.send({
      leadUuid: row.lead_uuid,
      subscriberId,
      messages: [{ type: 'text', text: message }],
    });

    if (!result.success) {
      failed++;
      console.warn(`[cron/silent-leads] push failed for ${row.lead_uuid}:`, result.error);
      continue; // leave row open — retry on the next run
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
    skipped_terminal: skippedTerminal,
    skipped_no_subscriber: skippedNoSubscriber,
    skipped_window: skippedWindow,
    skipped_no_outbound: skippedNoOutbound,
    run_at: now.toISOString(),
  });
}
