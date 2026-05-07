'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileGlobal = {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

export type TurnstileWidgetProps = {
  /** Current token, or null when expired / reset / error */
  onToken: (token: string | null) => void;
  onError?: () => void;
  className?: string;
};

/**
 * Renders Cloudflare Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 */
export function TurnstileWidget({ onToken, onError, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const detachTurnstile = useCallback(() => {
    if (widgetIdRef.current && typeof window !== 'undefined' && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !containerRef.current || !window.turnstile) return;
    detachTurnstile();
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => {
        onToken(null);
        onError?.();
      },
    });
  }, [onToken, onError, detachTurnstile]);

  useEffect(() => {
    if (!SITE_KEY || !scriptReady) return;
    renderWidget();
    return () => {
      detachTurnstile();
    };
  }, [scriptReady, renderWidget, detachTurnstile]);

  if (!SITE_KEY) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className={className ?? ''} data-testid="turnstile-widget" />
    </>
  );
}

export function isTurnstileSiteConfigured(): boolean {
  return Boolean(SITE_KEY);
}
