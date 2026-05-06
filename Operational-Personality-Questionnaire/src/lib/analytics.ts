import { supabase } from './supabase';

const VISITOR_KEY = 'os_visitor_id';
const SESSION_KEY = 'os_session_id';

export type LandingEventType = 'page_view' | 'cta_click' | 'quiz_start';

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getVisitorId(): string {
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
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = safeUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return safeUUID();
  }
}

export function readUtmParams(): Record<string, string | null> {
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
 * Fire-and-forget event tracking. Mirrors the helper in operational-system so
 * landing → questionnaire handoff is recorded against the same visitor_id.
 */
export async function trackEvent(eventType: LandingEventType, opts: TrackOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
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
    // best-effort
  }
}
