import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { pushManyChatReply } from '@/lib/manychat/sendApi';
import { upsertBotState } from '@/lib/db/conversationMessages';

const REMINDER_MESSAGE =
  'היי 😊 רציתי לבדוק — האם עדיין רלוונטי לדבר? ' +
  'אם כן, שמחה לשלוח לך קישור לשיחת ההיכרות עם הדר 🙏';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const in72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  // ── Send due reminders ────────────────────────────────────────────────────
  // Find pending followups where remind_at has passed and reminder not yet sent.
  const { data: dueReminders } = await supabase
    .from('pending_followups')
    .select('id, lead_uuid')
    .is('closed_at', null)
    .eq('reminder_sent', false)
    .lte('remind_at', now.toISOString());

  let remindersSent = 0;
  let remindersFailed = 0;

  for (const row of dueReminders ?? []) {
    // Look up subscriber_id from bot_conversation_state.
    const { data: bcs } = await supabase
      .from('bot_conversation_state')
      .select('subscriber_id, state')
      .eq('lead_uuid', row.lead_uuid)
      .maybeSingle();

    const subscriberId = bcs?.subscriber_id;
    const currentState = bcs?.state ?? 'irrelevant';

    // Skip if already in a terminal state.
    const SKIP_STATES = new Set(['booking', 'closed', 'escalated', 'spam']);
    if (SKIP_STATES.has(currentState)) {
      await supabase
        .from('pending_followups')
        .update({ reminder_sent: true, closed_at: now.toISOString() })
        .eq('id', row.id);
      continue;
    }

    // Try to send reminder via ManyChat.
    if (subscriberId) {
      const result = await pushManyChatReply(subscriberId, [
        { type: 'text', text: REMINDER_MESSAGE },
      ], row.lead_uuid);

      if (result.success) {
        remindersSent++;
        await supabase
          .from('pending_followups')
          .update({ reminder_sent: true })
          .eq('id', row.id);
      } else {
        remindersFailed++;
        console.warn(`[cron/silent-leads] pushManyChatReply failed for ${row.lead_uuid}:`, result.error);
      }
    } else {
      // No subscriber_id — mark as sent anyway to avoid re-trying indefinitely.
      console.warn(`[cron/silent-leads] No subscriber_id for lead ${row.lead_uuid} — skipping push`);
      await supabase
        .from('pending_followups')
        .update({ reminder_sent: true })
        .eq('id', row.id);
    }
  }

  // ── Close stale followups (72h+ since creation, no activity) ─────────────
  const { data: stale } = await supabase
    .from('pending_followups')
    .select('id, lead_uuid')
    .is('closed_at', null)
    .lte('created_at', in72h.toISOString());

  let closed = 0;
  for (const row of stale ?? []) {
    await supabase
      .from('pending_followups')
      .update({ closed_at: now.toISOString() })
      .eq('id', row.id);

    // Update both bot_conversation_state and leads table.
    await upsertBotState(row.lead_uuid, 'irrelevant', { stale_closed: true });
    closed++;
  }

  return NextResponse.json({
    ok: true,
    reminders_attempted: (dueReminders ?? []).length,
    reminders_sent: remindersSent,
    reminders_failed: remindersFailed,
    stale_closed: closed,
    run_at: now.toISOString(),
  });
}
