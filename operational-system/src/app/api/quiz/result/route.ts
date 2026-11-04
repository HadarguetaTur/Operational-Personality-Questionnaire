import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const TOKEN_REGEX = /^[0-9a-f]{16,40}$/i;

/**
 * Public result lookup for the quiz result page.
 *
 * GET ?token=<report_token> → { result_pattern, result_snapshot }
 *
 * Replaces the browser-side `leads` select: `leads` is no longer readable with
 * the anon key, so the page asks the server, which returns only the two
 * columns the result page needs.
 */
export async function GET(request: NextRequest) {
  if (!checkRateLimit(request, 'quiz_result', 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const token = (new URL(request.url).searchParams.get('token') ?? '').trim();
  if (!TOKEN_REGEX.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('leads')
    .select('result_pattern, result_snapshot')
    .eq('report_token', token)
    .maybeSingle();

  if (error) {
    console.error('[quiz/result] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(
    { result_pattern: data.result_pattern ?? null, result_snapshot: data.result_snapshot ?? null },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
