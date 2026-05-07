import type { NextRequest } from 'next/server';

/** True when Turnstile server-side verification is enabled (secret set). */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function getRequestClientIp(request: NextRequest): string | undefined {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return request.ip ?? undefined;
}

interface SiteverifyResponse {
  success?: boolean;
  'error-codes'?: string[];
}

/**
 * Verifies a Turnstile token with Cloudflare. Call only server-side.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteip: string | undefined,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return false;

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token.trim());
  if (remoteip) body.set('remoteip', remoteip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as SiteverifyResponse;
    return data.success === true;
  } catch (e) {
    console.error('[turnstile] siteverify failed:', e);
    return false;
  }
}
