import { createServiceRoleClient } from '@/lib/supabase/server';
import type { LeadContextForQuote } from '@/lib/ai/prompts/quotePrompts';

/** Everything the quote prompts should already know about a lead. */
export async function loadLeadContextForQuote(leadId: string): Promise<LeadContextForQuote | null> {
  const supabase = createServiceRoleClient();
  const [{ data: lead }, { data: followup }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, business_name, email, phone, notes, meeting_summary, conversation_context')
      .eq('id', leadId)
      .maybeSingle(),
    supabase
      .from('followup_submissions')
      .select('form_data')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!lead) return null;

  return {
    name: lead.name ?? null,
    business_name: (lead as { business_name?: string | null }).business_name ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    notes: lead.notes ?? null,
    meeting_summary: lead.meeting_summary ?? null,
    conversation_context: (lead.conversation_context as Record<string, unknown> | null) ?? null,
    followup: (followup?.form_data as Record<string, unknown> | null) ?? null,
  };
}
