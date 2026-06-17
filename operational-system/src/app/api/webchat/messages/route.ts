import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const maxDuration = 30;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Polling endpoint for the on-site chat widget.
 *
 * GET ?leadUuid=...&after=<ISO timestamp> — returns user+assistant messages in
 * chronological order; when `after` is given, only messages newer than it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadUuid = (searchParams.get('leadUuid') ?? '').trim();
  const after = (searchParams.get('after') ?? '').trim();

  if (!UUID_REGEX.test(leadUuid)) {
    return NextResponse.json({ error: 'Invalid leadUuid' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('conversation_messages')
    .select('id, role, content, created_at')
    .eq('lead_uuid', leadUuid)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(200);

  if (after) query = query.gt('created_at', after);

  const { data, error } = await query;
  if (error) {
    console.error('[webchat/messages] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
