/**
 * Builds the public report URL for emails, webhooks, and sharing.
 * Format: https://<PUBLIC_BASE_URL>/#/result/<token>
 */
export function buildReportLink(token: string): string {
  const base = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (!base) {
    return `#/result/${token}`;
  }
  return `${base}/#/result/${token}`;
}
