import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseChannel, type Channel } from '@/lib/channels/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BotConversationState {
  state: string;
  context: Record<string, unknown>;
  subscriber_id?: string;
  channel: Channel;
}

// ─── conversation_messages helpers ────────────────────────────────────────────

export async function saveMessage(
  leadUuid: string,
  subscriberId: string | undefined,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>,
  channel?: Channel,
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
      channel: channel ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[conversationMessages] saveMessage failed:', error.message);
    return null;
  }
  return data.id;
}

/**
 * Returns the most recent N messages in chronological order (oldest→newest).
 *
 * Fix: previously used ascending+limit which returned the FIRST N messages,
 * making the LLM blind to everything said after the first few exchanges.
 */
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
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[conversationMessages] getConversationHistory failed:', error.message);
    return [];
  }
  // Reverse so messages are in chronological order for the LLM context window.
  return ((data ?? []) as ConversationMessage[]).reverse();
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

/**
 * Returns question sentences (ending with "?") from the most recent assistant
 * messages for a given lead. Used to seed `asked_questions` in context
 * for leads that existed before the memory system was introduced.
 */
export async function getRecentBotQuestions(
  leadUuid: string,
  limit = 20,
): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('content')
    .eq('lead_uuid', leadUuid)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[conversationMessages] getRecentBotQuestions failed:', error.message);
    return [];
  }

  const questions: string[] = [];
  for (const row of data ?? []) {
    const sentences = row.content.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.endsWith('?')) {
        questions.push(trimmed);
      }
    }
  }
  return questions;
}

// ─── bot_conversation_state helpers ───────────────────────────────────────────
// These are the PRIMARY source of truth for bot state and context.
// Unlike the `leads` table, this table is keyed by lead_uuid only,
// so ManyChat leads without a `leads` row are fully supported.

/**
 * Reads the bot state and context for a lead.
 * Falls back to scanning conversation_messages metadata for the latest state
 * if no row exists yet (graceful cold-start).
 */
export async function getBotState(leadUuid: string): Promise<BotConversationState> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('bot_conversation_state')
    .select('state, context, subscriber_id, channel')
    .eq('lead_uuid', leadUuid)
    .maybeSingle();

  if (error) {
    console.warn('[conversationMessages] getBotState failed:', error.message);
  }

  if (data) {
    return {
      state: data.state ?? 'initial',
      context:
        data.context && typeof data.context === 'object' && !Array.isArray(data.context)
          ? (data.context as Record<string, unknown>)
          : {},
      subscriber_id: data.subscriber_id ?? undefined,
      channel: parseChannel(data.channel),
    };
  }

  // Cold-start: scan the last assistant message metadata for state.
  const { data: lastMsg } = await supabase
    .from('conversation_messages')
    .select('metadata')
    .eq('lead_uuid', leadUuid)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stateFromMsg =
    typeof (lastMsg?.metadata as Record<string, unknown> | null)?.state === 'string'
      ? ((lastMsg!.metadata as Record<string, unknown>).state as string)
      : 'initial';

  return { state: stateFromMsg, context: {}, channel: 'whatsapp' };
}

/**
 * Timestamp of the lead's most recent message — used to enforce Meta's 24h
 * messaging window before any proactive IG/FB send.
 */
export async function getLastUserMessageAt(leadUuid: string): Promise<Date | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('created_at')
    .eq('lead_uuid', leadUuid)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[conversationMessages] getLastUserMessageAt failed:', error.message);
    return null;
  }
  return data?.created_at ? new Date(data.created_at as string) : null;
}

/**
 * Upserts bot state and context for a lead.
 * The context is merged with the existing context (patch semantics).
 * Also best-effort updates the `leads` table for dashboard display.
 */
export async function upsertBotState(
  leadUuid: string,
  state: string,
  contextPatch?: Record<string, unknown>,
  subscriberId?: string,
  channel?: Channel,
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Fetch existing context to merge.
  const { data: existing } = await supabase
    .from('bot_conversation_state')
    .select('context')
    .eq('lead_uuid', leadUuid)
    .maybeSingle();

  const prevContext =
    existing?.context &&
    typeof existing.context === 'object' &&
    !Array.isArray(existing.context)
      ? (existing.context as Record<string, unknown>)
      : {};

  const mergedContext =
    contextPatch && Object.keys(contextPatch).length > 0
      ? { ...prevContext, ...contextPatch }
      : prevContext;

  const { error } = await supabase.from('bot_conversation_state').upsert(
    {
      lead_uuid: leadUuid,
      state,
      context: mergedContext,
      ...(subscriberId ? { subscriber_id: subscriberId } : {}),
      ...(channel ? { channel } : {}),
    },
    { onConflict: 'lead_uuid' },
  );

  if (error) {
    console.error('[conversationMessages] upsertBotState failed:', error.message);
  }

  // Best-effort: also update the `leads` table for dashboard display.
  // This may fail silently for ManyChat-only leads without a leads row.
  const leadsUpdate: Record<string, unknown> = { conversation_state: state };
  if (contextPatch && Object.keys(contextPatch).length > 0) {
    leadsUpdate.conversation_context = mergedContext;
  }
  await supabase.from('leads').update(leadsUpdate).eq('id', leadUuid).then(({ error: e }) => {
    if (e) {
      // Expected for ManyChat-only leads — not an error.
      console.debug('[conversationMessages] leads table update skipped (no row):', e.code);
    }
  });
}

// ─── Backwards-compat shims used by existing callers ─────────────────────────

/** @deprecated Use getBotState() instead. */
export async function getLeadConversationContext(
  leadUuid: string,
): Promise<Record<string, unknown>> {
  const { context } = await getBotState(leadUuid);
  return context;
}

/** @deprecated Use getBotState() instead. */
export async function getLeadConversationState(leadUuid: string): Promise<string> {
  const { state } = await getBotState(leadUuid);
  return state;
}

/** @deprecated Use upsertBotState() instead. */
export async function updateLeadConversationState(
  leadUuid: string,
  state: string,
  contextPatch?: Record<string, unknown>,
): Promise<void> {
  await upsertBotState(leadUuid, state, contextPatch);
}
