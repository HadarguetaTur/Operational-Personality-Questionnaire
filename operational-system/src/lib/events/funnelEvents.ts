import { createServiceRoleClient } from '@/lib/supabase/server';

export type FunnelEventType =
  | 'lead_arrived'
  | 'quiz_completed'
  | 'meeting_offered'
  | 'meeting_booked'
  | 'diagnostic_offered'
  | 'intro_offered'
  | 'no_availability'
  | 'homework_assigned'
  | 'human_handoff_requested'
  | 'followup_skipped'
  | 'followup_failed'
  | 'opt_out'
  | 'meeting_cancelled'
  | 'meeting_rescheduled'
  | 'post_meeting_message'
  | 'meeting_status_unknown';

export async function recordFunnelEvent(
  leadUuid: string,
  event: FunnelEventType,
  meta?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('funnel_events').insert({
    lead_uuid: leadUuid,
    event_type: event,
    meta: meta ?? {},
  });

  if (error) {
    // Table may not exist yet — log and continue
    console.warn('[funnelEvents] insert failed (non-fatal):', error.message);
  }
}
