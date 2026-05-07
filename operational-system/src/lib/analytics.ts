'use client';

import { createClient } from '@/lib/supabase/client';

const VISITOR_KEY = 'os_visitor_id';
const SESSION_KEY = 'os_session_id';
const SESSION_TS_KEY = 'os_session_ts';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type LandingEventType = 'page_view' | 'cta_click' | 'quiz_start';

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
 * Fire-and-forget event tracking. Never blocks UX, never throws.
 * Returns a promise that resolves when the insert finishes (or fails gracefully).
 */
export async function trackEvent(eventType: LandingEventType, opts: TrackOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const row = buildLandingEventRow(eventType, opts);

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
