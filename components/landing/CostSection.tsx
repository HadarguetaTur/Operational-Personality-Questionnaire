import React, { useId } from "react";
import { LandingCopy } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

/** אייקון דולר עם נפח ותאורה, מראה "מואר מבפנים" */
const DollarIcon3D = () => {
  const id = useId().replace(/:/g, "");
  return (
    <span className="cost-icon-3d inline-flex items-center justify-center shrink-0 mt-0.5" aria-hidden>
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef2f2" />
            <stop offset="50%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </span>
  );
};

export const CostSection: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  return (
    <section className="cost-section-bg relative py-20 md:py-24 px-6 md:px-8">
      <FadeInSection>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-4xl mx-auto" dir="rtl">
            <h2
              className="cost-headline-gradient text-2xl md:text-4xl font-bold mb-10 text-center"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              {copy.painCostHeadline}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {copy.painCostBullets.map((b, i) => (
                <li key={i} className="cost-card">
                  <div className="cost-card-glass flex flex-col gap-3 items-center text-center p-5 rounded-2xl text-white text-base md:text-[16px] leading-relaxed min-h-[110px]">
                    <DollarIcon3D />
                    <span className="font-medium">{b}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
