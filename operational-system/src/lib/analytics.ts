'use client';

import { createClient } from '@/lib/supabase/client';

const VISITOR_KEY = 'os_visitor_id';
const SESSION_KEY = 'os_session_id';
const SESSION_TS_KEY = 'os_session_ts';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type LandingEventType = 'page_view' | 'cta_click' | 'quiz_start';

/**
 * Central gate for all analytics writes. Blocklist, not allowlist: it drops ONLY
 * local development hosts and passes every real host through — the production
 * domain, `www`, and any host the paid campaign happens to land on (e.g. a
 * `*.vercel.app` URL set as the ad destination).
 *
 * Guiding principle: when in doubt, send. A little local/preview noise is far
 * cheaper than blindly dropping paid production traffic. A prior positive
 * allowlist keyed on the apex domain silently blocked all paid traffic that
 * landed on any other host.
 */
function isTrackableHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  if (host.endsWith('.local') || host.endsWith('.localhost')) return false;
  return true;
}

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function logAnalyticsError(stage: string, detail?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[analytics]', stage, detail);
    return;
  }
  console.warn('[analytics]', stage);
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = safeUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return safeUUID();
  }
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const now = Date.now();
    const lastTs = parseInt(sessionStorage.getItem(SESSION_TS_KEY) ?? '0', 10);
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id || now - lastTs > SESSION_TTL_MS) {
      id = safeUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return id;
  } catch {
    return safeUUID();
  }
}

export function readUtmParams(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content')
  };
}

export interface TrackOptions {
  ctaId?: string;
  pagePath?: string;
  metadata?: Record<string, unknown>;
  /** Use fetch with keepalive so the request survives full-page navigation (e.g. CTA → /quiz). */
  keepalive?: boolean;
  /**
   * Use navigator.sendBeacon — synchronous and reliable on page exit
   * (visibilitychange→hidden / pagehide), including mobile. For exit events.
   * Falls back to keepalive fetch if the beacon cannot be queued.
   */
  beacon?: boolean;
}

function buildLandingEventRow(
  eventType: LandingEventType,
  opts: TrackOptions
): Record<string, unknown> {
  const utm = readUtmParams();
  return {
    event_type: eventType,
    page_path: opts.pagePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
    cta_id: opts.ctaId ?? null,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    ...utm,
    metadata: opts.metadata ?? null
  };
}

/**
 * Supabase-js does not support fetch keepalive. Use REST directly so the browser
 * keeps the POST alive across `window.location` changes.
 */
async function insertLandingEventViaRestKeepalive(row: Record<string, unknown>): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anonKey) return;

  const res = await fetch(`${base}/rest/v1/landing_events`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(row),
    keepalive: true
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logAnalyticsError(`rest_insert ${res.status}`, text || undefined);
  }
}

/**
 * navigator.sendBeacon cannot set custom headers, so the Supabase apikey rides
 * as a query param (verified working against this project) and the JSON body is
 * sent as a typed Blob so PostgREST sees `Content-Type: application/json`.
 * Returns false if the beacon could not be queued (caller falls back).
 */
function insertLandingEventViaBeacon(row: Record<string, unknown>): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anonKey) return false;
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;

  try {
    const url = `${base}/rest/v1/landing_events?apikey=${encodeURIComponent(anonKey)}`;
    const blob = new Blob([JSON.stringify(row)], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  } catch (err) {
    logAnalyticsError('beacon_insert', err);
    return false;
  }
}

/**
 * Fire-and-forget event tracking. Never blocks UX, never throws.
 * Returns a promise that resolves when the insert finishes (or fails gracefully).
 */
export async function trackEvent(eventType: LandingEventType, opts: TrackOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  // Single central guard: drop only local-dev traffic; send everything else.
  if (!isTrackableHost()) return;
  try {
    const row = buildLandingEventRow(eventType, opts);

    if (opts.beacon) {
      // sendBeacon is synchronous; only fall back when it cannot be queued.
      if (insertLandingEventViaBeacon(row)) return;
      await insertLandingEventViaRestKeepalive(row);
      return;
    }

    if (opts.keepalive) {
      await insertLandingEventViaRestKeepalive(row);
      return;
    }

    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from('landing_events').insert(row as never);
    if (error) {
      logAnalyticsError('supabase_insert', error);
    }
  } catch (err) {
    logAnalyticsError('trackEvent', err);
  }
}

function deviceFromWidth(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/** Max-scroll depth as 0–100. Pages that fit in the viewport count as fully seen (100). */
function currentScrollPct(): number {
  const doc = document.documentElement;
  const viewportH = window.innerHeight || doc.clientHeight || 0;
  const fullH = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  const scrollable = fullH - viewportH;
  if (scrollable <= 0) return 100;
  const scrolled = window.scrollY || doc.scrollTop || 0;
  const pct = Math.round((scrolled / scrollable) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Behavioral tracking for a landing page. Call once on mount; returns a cleanup fn.
 *
 * Captures entry data immediately, tracks max scroll depth (throttled, max-only),
 * and emits a SINGLE `page_view` enriched with dwell + scroll on first exit
 * (visibilitychange→hidden or pagehide) via sendBeacon. One row per visit — no
 * duplicates that would inflate funnel counts. Does not touch other event types.
 */
export function initLandingPageTracking(): () => void {
  if (typeof window === 'undefined') return () => {};

  const startTs = Date.now();
  const entryPath = window.location.pathname;
  let maxScrollPct = currentScrollPct();
  let sent = false;
  let throttled = false;

  const onScroll = (): void => {
    if (throttled) return;
    throttled = true;
    window.setTimeout(() => {
      throttled = false;
      const pct = currentScrollPct();
      if (pct > maxScrollPct) maxScrollPct = pct;
    }, 200);
  };

  const send = (): void => {
    if (sent) return;
    sent = true;
    // Final measurement in case the last scroll happened inside the throttle window.
    const pct = currentScrollPct();
    if (pct > maxScrollPct) maxScrollPct = pct;

    const width = window.innerWidth;
    const height = window.innerHeight;
    void trackEvent('page_view', {
      pagePath: entryPath,
      beacon: true,
      metadata: {
        dwell_ms: Date.now() - startTs,
        max_scroll_pct: maxScrollPct,
        viewport: { width, height },
        device: deviceFromWidth(width),
        entry_path: entryPath
      }
    });
  };

  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') send();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', send);

  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', send);
  };
}

/**
 * Same-origin quiz entry. Preserves `?utm_*` from the current URL for attribution.
 */
export function getQuizUrl(): string {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  return `/quiz${search}`;
}

/** Public report path on this Next.js app (same origin). */
export function getReportUrl(token: string): string {
  return `/quiz/result/${encodeURIComponent(token)}`;
}
