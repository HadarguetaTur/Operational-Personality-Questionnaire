import React from "react";
import { LandingCopy } from "../../config/landingCopy";
import { getPaymentUrl } from "../../config/landingCopy";

export const StickyMobileCTA: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  const paymentUrl = getPaymentUrl(copy.patternId);

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 bg-[#334155]/98 backdrop-blur-sm border-t border-[var(--qa-border)] pt-4 pr-4 pl-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      dir="rtl"
    >
      <a
        href={paymentUrl}
        className="flex items-center justify-center min-h-[52px] w-full bg-[var(--landing-primary)] hover:bg-[var(--landing-primary-hover)] text-white font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-2 active:scale-[0.98]"
        aria-label={copy.ctaText}
      >
        {copy.ctaText}
      </a>
    </div>
  );
};
