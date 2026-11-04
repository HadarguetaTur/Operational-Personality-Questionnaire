import { NextRequest, NextResponse } from 'next/server';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadUuid: string }> },
) {
  const { leadUuid: rawLeadUuid } = await params;
  const candidate = rawLeadUuid?.trim();
  // Only well-formed UUIDs are recorded; anything else just redirects.
  const leadUuid = candidate && UUID_REGEX.test(candidate) ? candidate : '';
  const bookingUrl = process.env.CALCOM_BOOKING_URL?.trim();

  if (leadUuid) {
    await recordFunnelEvent(leadUuid, 'meeting_offered', {
      source: 'redirect_click',
      user_agent: request.headers.get('user-agent') ?? undefined,
    });
  }

  if (!bookingUrl) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const url = new URL(bookingUrl);
  if (leadUuid) {
    url.searchParams.set('utm_content', leadUuid);
  }

  return NextResponse.redirect(url.toString());
}
