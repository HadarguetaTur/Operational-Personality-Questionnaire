import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const in24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const in72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  const { data: dueReminders } = await supabase
    .from('pending_followups')
    .select('id, lead_uuid')
    .is('closed_at', null)
    .eq('reminder_sent', false)
    .lte('remind_at', in24h.toISOString());

  let remindersSent = 0;
  for (const row of dueReminders ?? []) {
    await supabase
      .from('pending_followups')
      .update({ reminder_sent: true })
      .eq('id', row.id);
    remindersSent++;
  }

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
    await supabase
      .from('leads')
      .update({ conversation_state: 'irrelevant' })
      .eq('id', row.lead_uuid);
    closed++;
  }

  return NextResponse.json({
    ok: true,
    reminders_sent: remindersSent,
    closed: closed,
  });
}
