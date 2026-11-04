import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison for secrets / tokens.
 * Hashes both sides first so inputs of different lengths are still compared
 * in constant time and never leak length information.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) {
    return false;
  }
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
