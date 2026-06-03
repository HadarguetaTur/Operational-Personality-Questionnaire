import { timingSafeEqual } from 'node:crypto';

/**
 * Compares the received webhook secret against the expected value in constant time.
 * Prevents timing oracle attacks on public-facing endpoints.
 *
 * Returns false immediately when lengths differ (no timing leak possible —
 * length is not a secret since the attacker controls the received value).
 */
export function verifyWebhookSecret(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}
