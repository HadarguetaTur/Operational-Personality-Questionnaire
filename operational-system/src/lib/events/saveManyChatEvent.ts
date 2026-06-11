import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ManyChatWebhookPayload } from '@/lib/manychat/types';

export interface SaveManyChatEventInput {
  lead_uuid: string;
  subscriber_id: string | undefined;
  event_type: string;
  payload: ManyChatWebhookPayload;
  channel?: string;
}

export interface SaveManyChatEventResult {
  id: string | null;
  error: string | null;
}

/**
 * Persists a raw ManyChat webhook payload to the manychat_events table.
 * Uses the service role client — bypasses RLS.
 *
 * Returns { id, error }. The caller should ACK ManyChat regardless of
 * whether the save succeeds, to avoid ManyChat retry storms.
 */
export async function saveManyChatEvent(
  input: SaveManyChatEventInput,
): Promise<SaveManyChatEventResult> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('manychat_events')
    .insert({
      lead_uuid: input.lead_uuid,
      subscriber_id: input.subscriber_id ?? null,
      event_type: input.event_type,
      payload: input.payload as Record<string, unknown>,
      channel: input.channel ?? null,
      process_status: 'pending',
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[saveManyChatEvent] Insert failed:', error.message);
    return { id: null, error: error.message };
  }

  console.log('[saveManyChatEvent] Saved event id:', data.id);
  return { id: data.id, error: null };
}

export async function updateManyChatEventStatus(
  id: string,
  status: 'done' | 'error',
  processError?: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('manychat_events')
    .update({
      process_status: status,
      ...(processError ? { process_error: processError } : {}),
    })
    .eq('id', id);

  if (error) {
    console.error('[updateManyChatEventStatus] Update failed:', error.message);
  }
}
