import React from "react";
import { LandingCopy } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

/** SVG icons for each process step */
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M10 14l2 2 4-4" />
  </svg>
);

const CogIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const STEP_ICONS = [ClipboardIcon, CalendarIcon, CogIcon, UsersIcon];

export const ProcessSection: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  return (
    <section className="process-section-bg relative py-20 md:py-24 px-6 md:px-8">
      <FadeInSection delay={100}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-3xl mx-auto" dir="rtl">
            <h2
              className="text-2xl md:text-4xl font-extrabold text-white mb-12 md:mb-14 text-center headline-bold-hover"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              {copy.processHeadline}
            </h2>

            {/* Timeline container */}
            <div className="relative">
              {/* Vertical connector line */}
              <div className="process-timeline-line" aria-hidden />

              {/* Steps */}
              <div className="space-y-6 md:space-y-8">
                {copy.processSteps.map((step, i) => {
                  const Icon = STEP_ICONS[i % STEP_ICONS.length];
                  return (
                    <div
                      key={i}
                      className="process-step-reveal flex gap-4 md:gap-6 items-start"
                    >
                      {/* Circle with number */}
                      <div className="process-step-circle">
                        <span className="text-[var(--landing-primary)] font-bold text-lg">
                          {i + 1}
                        </span>
                      </div>

                      {/* Card */}
                      <div className="process-step-card flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="process-step-icon w-5 h-5 shrink-0">
                            <Icon className="w-5 h-5" />
                          </span>
                          <h3 className="text-white font-bold text-base md:text-lg leading-snug">
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-white/75 text-sm md:text-base leading-relaxed mr-8">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
