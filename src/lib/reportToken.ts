/**
 * URL-safe report token generator using cryptographically secure randomness.
 * Uses only A-Z, a-z, 0-9 (no special characters) for safe use in URLs.
 */

const URL_SAFE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generates a cryptographically secure, URL-safe random token.
 * @param length - Token length (default 32)
 * @returns URL-safe token string
 */
export function generateReportToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let token = '';
  for (let i = 0; i < length; i++) {
    token += URL_SAFE_CHARS[bytes[i] % URL_SAFE_CHARS.length];
  }
  return token;
}

// --- Sanity check (run manually: npx ts-node src/lib/reportToken.ts) ---
// const t = generateReportToken(32);
// console.assert(t.length === 32 && /^[A-Za-z0-9]+$/.test(t), 'Token format OK');
// console.log('Sample token:', t);
