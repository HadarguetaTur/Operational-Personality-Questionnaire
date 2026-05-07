/**
 * Builds the absolute public report URL for emails, webhooks, and sharing.
 * Uses NEXT_PUBLIC_APP_URL + `/quiz/result/<token>` (single Next.js app).
 */
export function buildReportLink(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  if (!base) {
    return `/quiz/result/${encodeURIComponent(token)}`;
  }
  return `${base}/quiz/result/${encodeURIComponent(token)}`;
}
