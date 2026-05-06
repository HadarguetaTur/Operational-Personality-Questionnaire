/**
 * Canonical site URL for metadata, sitemap, and robots.
 * Vercel / production: set NEXT_PUBLIC_APP_URL (no trailing slash).
 */
export function getSiteUrlString(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }
  return 'http://localhost:3000';
}

export function getSiteUrl(): URL {
  return new URL(getSiteUrlString());
}
