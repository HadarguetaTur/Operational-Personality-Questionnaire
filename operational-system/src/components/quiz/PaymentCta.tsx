'use client';

import React from 'react';
import { trackEvent } from '@/lib/analytics';
import {
  SCOPING_CALL_CTA_LABEL,
  SCOPING_CALL_CTA_SUB,
  SCOPING_CALL_GUARANTEE,
} from '@/config/shortQuizResults';

interface PaymentCtaProps {
  /** Sumit payment page URL (already carrying the pattern param). '#' when unconfigured. */
  href: string;
  /** Pattern slug for event metadata. */
  pattern?: string | null;
  ctaId?: string;
}

/**
 * The single primary CTA of the paid funnel: opens the Sumit payment page for
 * the 350₪ strategy call. Fires `payment_click` + Pixel InitiateCheckout before
 * navigation (keepalive survives the redirect).
 */
export function PaymentCta({ href, pattern, ctaId = 'meeting_payment' }: PaymentCtaProps) {
  const configured = href !== '#';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!configured) {
      e.preventDefault();
      return;
    }
    void trackEvent('payment_click', {
      ctaId,
      keepalive: true,
      metadata: { pattern: pattern ?? null },
    });
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_name: 'strategy_call_350',
        value: 350,
        currency: 'ILS',
      });
    }
  };

  return (
    <div>
      <a
        href={href}
        onClick={handleClick}
        className="group flex flex-col items-center justify-center gap-0.5 w-full py-4 px-6 rounded-2xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] transition-all duration-300 hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
      >
        <span className="inline-flex items-center gap-2.5 text-[17px] font-bold">
          {SCOPING_CALL_CTA_LABEL}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </span>
        <span className="text-[13px] font-medium text-white/85">{SCOPING_CALL_CTA_SUB}</span>
      </a>
      <p className="mt-3 text-center text-[13px] text-[#7c8884] leading-relaxed">
        {SCOPING_CALL_GUARANTEE}
      </p>
    </div>
  );
}
