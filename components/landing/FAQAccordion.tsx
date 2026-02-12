import React, { useState } from "react";
import { LandingCopy, FaqItem } from "../../config/landingCopy";
import { FAQ_INTRO } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

const ChevronDown: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

export const FAQAccordion: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0, 1]));

  const toggle = (i: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section className="faq-section-bg py-20 md:py-24 px-6 md:px-8 relative">
      <FadeInSection delay={100}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-3xl mx-auto faq-card-glass rounded-2xl p-6 md:p-8" dir="rtl">
            <p className="text-white/70 text-base mb-4">
              {FAQ_INTRO}
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-6"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              שאלות נפוצות
            </h2>
            <div className="space-y-2">
              {copy.faq.map((item: FaqItem, i: number) => {
                const isOpen = openIndices.has(i);
                return (
                  <div
                    key={i}
                    className="faq-item-glass rounded-xl overflow-hidden"
                    data-open={isOpen}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className="w-full flex items-center justify-between gap-4 p-4 text-right transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${i}`}
                      id={`faq-question-${i}`}
                    >
                      <span className="font-medium text-white/95 text-base">
                        {item.question}
                      </span>
                      <span className="text-[var(--landing-primary)]">
                        <ChevronDown open={isOpen} />
                      </span>
                    </button>
                    <div
                      id={`faq-answer-${i}`}
                      role="region"
                      aria-labelledby={`faq-question-${i}`}
                      className={`overflow-hidden transition-all duration-200 ${
                        isOpen ? "max-h-[500px] overflow-y-auto" : "max-h-0"
                      }`}
                    >
                      <p className="p-4 pt-0 text-[15px] text-white/80 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
