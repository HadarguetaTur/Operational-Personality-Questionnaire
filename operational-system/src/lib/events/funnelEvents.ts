import { createServiceRoleClient } from '@/lib/supabase/server';

export type FunnelEventType =
  | 'lead_arrived'
  | 'quiz_completed'
  | 'meeting_offered'
  | 'meeting_booked'
  | 'human_handoff_requested';

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
