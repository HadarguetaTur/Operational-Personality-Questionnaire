import React from "react";
import { LandingCopy } from "../../config/landingCopy";
import { getPaymentUrl } from "../../config/landingCopy";
import { PrimaryCTA } from "./PrimaryCTA";
import { FINAL_CTA_MICROCOPY } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

export const FinalCTASection: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  const paymentUrl = getPaymentUrl(copy.patternId);

  return (
    <section className="cta-section-bg py-20 md:py-24 px-6 md:px-8 text-center relative">
      <FadeInSection delay={50}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto" dir="rtl">
          <p className="text-white/70 text-base mb-4">
            {copy.urgencyText}
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-6"
            style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
          >
            מוכנים להתחיל?
          </h2>
          <div className="[&_p]:text-white/80 [&_a]:shadow-[0_0_24px_-4px_rgba(20,184,166,0.4)] [&_a]:focus-visible:ring-offset-[#2d3748]">
            <PrimaryCTA
              href={paymentUrl}
              text={copy.ctaText}
              subtext={copy.ctaSubtext}
              microcopy={FINAL_CTA_MICROCOPY}
              size="lg"
              ariaLabel={copy.ctaText}
              variant="hero"
            />
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
