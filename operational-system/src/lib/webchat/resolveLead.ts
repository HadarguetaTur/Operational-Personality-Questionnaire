import { createServiceRoleClient } from '@/lib/supabase/server';

const TOKEN_REGEX = /^[0-9a-f]{16,40}$/i;

/**
 * Resolves the lead UUID for an on-site chat request from the lead's
 * report_token. The token is the only credential the widget holds; the UUID
 * itself is never accepted from the client, so one lead cannot read or write
 * another lead's conversation.
 */
export async function resolveWebchatLead(
  rawToken: unknown,
): Promise<{ ok: true; leadUuid: string } | { ok: false; status: number; error: string }> {
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!TOKEN_REGEX.test(token)) {
    return { ok: false, status: 400, error: 'Invalid token' };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('report_token', token)
    .maybeSingle();

  if (error) {
    console.error('[webchat] lead lookup failed:', error.message);
    return { ok: false, status: 500, error: 'Lookup failed' };
  }
  if (!data) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true, leadUuid: data.id as string };
}
