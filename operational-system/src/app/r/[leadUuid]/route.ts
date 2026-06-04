import { NextRequest, NextResponse } from 'next/server';
import { recordFunnelEvent } from '@/lib/events/funnelEvents';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadUuid: string } },
) {
  const leadUuid = params.leadUuid?.trim();
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
