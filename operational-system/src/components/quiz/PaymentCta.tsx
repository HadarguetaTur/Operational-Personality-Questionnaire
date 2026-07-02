'use client';

import React from 'react';
import { trackEvent } from '@/lib/analytics';
import {
  SCOPING_CALL_PAY_LABEL,
  SCOPING_CALL_PAY_SUB,
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
        className="studio-cta-grad studio-cta-shine group flex flex-col items-center justify-center gap-0.5 w-full py-4 px-6 rounded-2xl text-white tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FC4] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
      >
        <span className="inline-flex items-center gap-2.5 text-[17px] font-bold">
          {SCOPING_CALL_PAY_LABEL}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </span>
        <span className="text-[13px] font-medium text-white/85">{SCOPING_CALL_PAY_SUB}</span>
      </a>
      <p className="mt-3 text-center text-[13px] text-[#68707C] leading-relaxed">
        {SCOPING_CALL_GUARANTEE}
      </p>
    </div>
  );
}
