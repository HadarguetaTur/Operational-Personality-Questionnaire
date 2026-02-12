import React from "react";
import { LandingCopy } from "../../config/landingCopy";
import { getPaymentUrl } from "../../config/landingCopy";
import { DELIVERABLES_MICROCOPY } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

const ICONS = [
  (props: { className?: string }) => (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 9l-5 5-4-4-3 3" />
    </svg>
  ),
  (props: { className?: string }) => (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  (props: { className?: string }) => (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  ),
  (props: { className?: string }) => (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
];

export const DeliverablesSection: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  const paymentUrl = getPaymentUrl(copy.patternId);

  return (
    <section className="deliverables-section-bg relative py-20 md:py-24 px-6 md:px-8 overflow-hidden">
      <div className="absolute top-20 left-0 w-64 h-64 rounded-full bg-[var(--landing-primary)]/10 blur-3xl" aria-hidden />
      <FadeInSection delay={150}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-2xl mr-0 ml-auto" dir="rtl">
            <h2
              className="text-2xl md:text-4xl font-extrabold text-white mb-8 text-right"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              {copy.deliverablesHeadline}
            </h2>
            <ul className="space-y-3">
              {copy.deliverables.map((d, i) => {
                const Icon = ICONS[i % ICONS.length];
                return (
                  <li key={i}>
                    <div className="deliverable-item-glass flex gap-4 items-center p-4 rounded-xl text-right">
                      <span className="deliverable-icon-teal shrink-0 w-8 h-8 flex items-center justify-center">
                        {Icon && <Icon className="w-5 h-5" />}
                      </span>
                      <span className="text-white/95 text-base md:text-[16px] leading-relaxed font-medium">
                        {d}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-white/70 text-base leading-relaxed text-right">
              {DELIVERABLES_MICROCOPY}
            </p>
            <div className="mt-8 flex justify-start">
              <a
                href={paymentUrl}
                className="cta-moving-gradient inline-flex items-center justify-center min-h-[52px] px-10 py-3 rounded-xl font-bold text-white text-base no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#334155] active:scale-[0.98]"
                aria-label={copy.ctaText}
              >
                {copy.ctaText}
              </a>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
