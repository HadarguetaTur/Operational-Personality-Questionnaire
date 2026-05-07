import type { NextRequest } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

/** In-memory limiter suitable for single-node dev/small deployments. Resets each cold start on Vercel. */
const buckets = new Map<string, Bucket>();

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? request.ip ?? 'unknown';
}

/**
 * Sliding window-ish limit per key. Returns true if allowed.
 * @param maxRequests max hits per windowMs
 */
export function checkRateLimit(
  request: NextRequest,
  namespace: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const key = `${namespace}:${clientKey(request)}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= maxRequests) return false;
  b.count += 1;
  return true;
}
