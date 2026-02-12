import React from "react";
import { LandingCopy } from "../../config/landingCopy";
import { getPaymentUrl } from "../../config/landingCopy";
import { PrimaryCTA } from "./PrimaryCTA";

/** גרפיקות דקורטיביות ל Hero */
const HeroGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    <div
      className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl landing-float"
      style={{ transformOrigin: "center" }}
    />
    <div
      className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl landing-float landing-float-delay-1"
      style={{ transformOrigin: "center" }}
    />
    <div
      className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-slate-400/10 blur-2xl landing-float landing-float-delay-2"
      style={{ transformOrigin: "center" }}
    />
    {/* גריד עדין */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }}
    />
  </div>
);

export const HeroSection: React.FC<{
  copy: LandingCopy;
  userName?: string | null;
}> = ({ copy, userName }) => {
  const paymentUrl = getPaymentUrl(copy.patternId);

  return (
    <section
      className="relative min-h-[50vh] sm:min-h-[55vh] md:min-h-[65vh] flex flex-col justify-center py-12 md:py-16 landing-gradient-bg"
    >
      <HeroGraphics />

      <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto px-6 md:px-8">
        <div className="max-w-[55ch] mx-auto text-right landing-hero-stagger" dir="rtl">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-3 mb-6 inline-block">
            <p className="text-white text-[15px] md:text-base font-medium leading-relaxed">
              אל דאגה, התוצאה כבר במייל שלך ותוכלי לחזור אליה מתי שתרצי.
              <br />
              <span className="text-white/80">אבל בואי נדבר שנייה תכל׳ס.</span>
            </p>
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4"
            style={{ fontSize: "var(--text-h1)", lineHeight: "var(--leading-tight)" }}
          >
            {copy.headline}
          </h1>
          <div
            className="ml-0 mr-auto mb-5 h-px w-24 md:w-32 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 20%, rgba(94,234,212,0.7) 50%, rgba(255,255,255,0.5) 80%, transparent)",
            }}
            aria-hidden
          />
          <p className="text-xl md:text-2xl text-white/95 leading-snug mb-5">
            {copy.subheadline}
          </p>
          <p className="text-lg font-medium text-white/95 mb-3">
            {copy.microDiagnosisHeadline}
          </p>
          <ul className="space-y-2.5 mb-8 max-w-prose mr-0" role="list">
            {copy.microDiagnosisBullets.slice(0, 3).map((b, i) => (
              <li
                key={i}
                className="flex gap-3 items-start text-white/95 text-base md:text-[17px]"
              >
                <span className="shrink-0 w-5 h-5 rounded border-2 border-white/50 flex items-center justify-center mt-0.5 text-white text-xs font-bold" aria-hidden>✓</span>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
          <div>
            <PrimaryCTA
              href={paymentUrl}
              text={copy.ctaText}
              microcopy={copy.ctaMicrocopy}
              size="lg"
              ariaLabel={copy.ctaText}
              variant="hero"
              glow
            />
          </div>
        </div>
      </div>
    </section>
  );
};
