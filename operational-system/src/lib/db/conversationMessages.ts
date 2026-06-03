import { createServiceRoleClient } from '@/lib/supabase/server';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function saveMessage(
  leadUuid: string,
  subscriberId: string | undefined,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>,
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({
      lead_uuid: leadUuid,
      subscriber_id: subscriberId ?? null,
      role,
      content,
      metadata: metadata ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[conversationMessages] saveMessage failed:', error.message);
    return null;
  }
  return data.id;
}

export async function getConversationHistory(
  leadUuid: string,
  limit = 20,
): Promise<ConversationMessage[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('lead_uuid', leadUuid)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[conversationMessages] getConversationHistory failed:', error.message);
    return [];
  }
  return (data ?? []) as ConversationMessage[];
}

export async function getLeadConversationState(leadUuid: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('conversation_messages')
    .select('metadata')
    .eq('lead_uuid', leadUuid)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const state = (data?.metadata as Record<string, unknown> | null)?.state;
  return typeof state === 'string' ? state : 'initial';
}

export async function countUserMessagesForLead(leadUuid: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from('conversation_messages')
    .select('id', { count: 'exact', head: true })
    .eq('lead_uuid', leadUuid)
    .eq('role', 'user');

  if (error) {
    console.error('[conversationMessages] countUserMessagesForLead failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function updateLeadConversationState(
  leadUuid: string,
  state: string,
  contextPatch?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();

  const update: Record<string, unknown> = { conversation_state: state };

  if (contextPatch && Object.keys(contextPatch).length > 0) {
    // Merge patch into existing JSONB context using Postgres jsonb_strip_nulls trick via RPC
    // For simplicity here we do a full overwrite of the patch keys.
    // A future migration can use jsonb_set for atomic partial updates.
    update.conversation_context = contextPatch;
  }

  const { error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', leadUuid);

  if (error) {
    // leads table uses id not lead_uuid — try matching by report_token if needed.
    // For ManyChat leads that haven't gone through quiz, this will silently fail.
    console.warn('[conversationMessages] updateLeadConversationState failed (may not exist yet):', error.message);
  }
}
