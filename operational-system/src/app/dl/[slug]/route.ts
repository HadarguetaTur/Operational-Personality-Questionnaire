import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';

const VISITOR_COOKIE = 'vid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? request.ip ?? 'unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!checkRateLimit(request, 'dl', 20, 60_000)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const { slug } = params;

  if (!SLUG_PATTERN.test(slug)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const supabase = createServerSupabaseClient();

  const { data: guide, error } = await supabase
    .from('guides')
    .select('file_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !guide) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Resolve visitor_id from cookie or mint new one
  const existingVid = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVid ?? safeUUID();
  const isNewVisitor = !existingVid;

  // Read UTM params from query string
  const url = new URL(request.url);
  const utmSource   = url.searchParams.get('utm_source');
  const utmMedium   = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');

  // Log download event — fire & forget, never blocks the redirect
  supabase
    .from('guide_download_events')
    .insert({
      guide_slug:   slug,
      visitor_id:   visitorId,
      ip_address:   getIp(request),
      user_agent:   request.headers.get('user-agent')?.slice(0, 500) ?? null,
      utm_source:   utmSource,
      utm_medium:   utmMedium,
      utm_campaign: utmCampaign,
      referer:      request.headers.get('referer') ?? null,
    })
    .then(({ error: insertError }) => {
      if (insertError && process.env.NODE_ENV === 'development') {
        console.warn('[dl] event insert failed:', insertError.message);
      }
    });

  const response = NextResponse.redirect(guide.file_url, { status: 302 });

  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}
