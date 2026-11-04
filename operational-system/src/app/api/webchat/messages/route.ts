import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { resolveWebchatLead } from '@/lib/webchat/resolveLead';

export const maxDuration = 30;

/**
 * Polling endpoint for the on-site chat widget.
 *
 * GET ?token=<report_token>&after=<ISO timestamp> — returns user+assistant
 * messages in chronological order; when `after` is given, only newer ones.
 * The conversation is resolved from the report token, never from a raw UUID.
 */
export async function GET(request: NextRequest) {
  // Widget polls every 2s → 30/min per client; leave headroom for retries.
  if (!checkRateLimit(request, 'webchat_messages_ip', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const after = (searchParams.get('after') ?? '').trim();

  const lead = await resolveWebchatLead(searchParams.get('token'));
  if (!lead.ok) {
    return NextResponse.json({ error: lead.error }, { status: lead.status });
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('conversation_messages')
    .select('id, role, content, created_at')
    .eq('lead_uuid', lead.leadUuid)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(200);

  if (after && !Number.isNaN(Date.parse(after))) query = query.gt('created_at', after);

  const { data, error } = await query;
  if (error) {
    console.error('[webchat/messages] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  return NextResponse.json(
    { messages: data ?? [] },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
