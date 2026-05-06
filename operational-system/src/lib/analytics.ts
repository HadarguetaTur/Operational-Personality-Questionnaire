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

function getVisitorId(): string {
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

function getSessionId(): string {
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

function readUtmParams(): Record<string, string | null> {
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
}

/**
 * Fire-and-forget event tracking. Never blocks UX, never throws.
 * Returns a promise that resolves when the insert finishes (or fails silently).
 */
export async function trackEvent(eventType: LandingEventType, opts: TrackOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const supabase = createClient();
    if (!supabase) return;
    const utm = readUtmParams();
    await supabase.from('landing_events').insert({
      event_type: eventType,
      page_path: opts.pagePath ?? window.location.pathname,
      cta_id: opts.ctaId ?? null,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      referrer: document.referrer || null,
      user_agent: navigator.userAgent.slice(0, 500),
      ...utm,
      metadata: opts.metadata ?? null
    });
  } catch {
    // best-effort — analytics must never break the user flow
  }
}

function quizBase(): string {
  const fromEnv =
    typeof process.env.NEXT_PUBLIC_QUIZ_URL === 'string'
      ? process.env.NEXT_PUBLIC_QUIZ_URL.trim()
      : '';
  return (fromEnv || 'http://localhost:5173').replace(/\/$/, '');
}

/**
 * Build the quiz lead-form URL from env, preserving UTM params so attribution
 * flows through to the questionnaire app's first event.
 *
 * The Vite app uses HashRouter, so internal routes live after `#`. UTM params
 * have to appear before the hash (in `window.location.search` after navigation).
 *
 * Concatenating `${base}/${search}` keeps `/` before `?` when search is nonempty.
 */
export function getQuizUrl(): string {
  const base = quizBase();
  const search =
    typeof window !== 'undefined' ? window.location.search : '';
  return `${base}/${search}#/lead-form`;
}

/** URL of the rendered report on the Vite app. Safe to use server- and client-side. */
export function getReportUrl(token: string): string {
  return `${quizBase()}/#/result/${encodeURIComponent(token)}`;
}
