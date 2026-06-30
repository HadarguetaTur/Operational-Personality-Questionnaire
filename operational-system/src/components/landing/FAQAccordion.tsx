'use client';

import React, { useId, useState } from 'react';
import { FAQ_INTRO } from '@/config/landingCopy';
import type { FaqAccordionCopy, FaqItem } from '@/config/landingCopy';
import { FadeInSection } from './FadeInSection';

const ChevronDown: React.FC<{ open: boolean; variant?: 'landing' | 'home' }> = ({ open, variant = 'landing' }) => (
  <svg
    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${variant === 'home' ? 'text-[#0e7a6e]' : 'text-[var(--landing-primary)]'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const FAQAccordion: React.FC<
  FaqAccordionCopy & { sectionId?: string; sectionClassName?: string; variant?: 'landing' | 'home' }
> = ({ faq, intro = FAQ_INTRO, sectionId, sectionClassName, variant = 'landing' }) => {
  const baseId = useId();
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0, 1]));

  const toggle = (i: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const landingSection = 'faq-section-bg py-20 md:py-24 px-6 md:px-8 relative scroll-mt-20';
  const homeSection =
    'relative scroll-mt-20 bg-[#eef4f6] border-y border-[#dce7ea] py-24 md:py-32 px-5 md:px-8 overflow-hidden';

  const sectionClass = [variant === 'home' ? homeSection : landingSection, sectionClassName]
    .filter(Boolean)
    .join(' ');

  const ringHome = 'focus-visible:ring-[#0e7a6e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f6]';
  const ringLanding =
    'focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  if (variant === 'home') {
    return (
      <section id={sectionId} className={sectionClass} dir="rtl">
        <FadeInSection delay={100}>
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <span className="h-px w-7 bg-[#0e7a6e]/40" aria-hidden />
              <span className="text-[#0e7a6e] text-xs font-bold tracking-[0.16em]">לפני שמתחילים</span>
              <span className="h-px w-7 bg-[#0e7a6e]/40 sm:hidden" aria-hidden />
            </div>
            <h2 className="studio-display text-3xl md:text-5xl text-[#15302d] text-center mb-5 leading-tight px-2">
              שאלות נפוצות
            </h2>
            <p className="text-[#46544f] text-center text-base md:text-lg max-w-2xl mx-auto mb-12 md:mb-14 leading-relaxed px-2">
              {intro}
            </p>
            <div className="space-y-2.5 md:space-y-3">
              {faq.map((item: FaqItem, i: number) => {
                const isOpen = openIndices.has(i);
                const qId = `${baseId}-q-${i}`;
                const aId = `${baseId}-a-${i}`;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                      isOpen
                        ? 'border-[#0e7a6e]/30 bg-white shadow-[0_14px_40px_-26px_rgba(21,48,45,0.3)]'
                        : 'border-[#dce7ea] bg-white/70 hover:bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className={`w-full flex items-center justify-between gap-4 min-h-[52px] p-4 md:p-5 text-right transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${ringHome}`}
                      aria-expanded={isOpen}
                      aria-controls={aId}
                      id={qId}
                    >
                      <span className="font-semibold text-[#15302d] text-[15px] md:text-base leading-snug">{item.question}</span>
                      <ChevronDown open={isOpen} variant="home" />
                    </button>
                    <div
                      id={aId}
                      role="region"
                      aria-labelledby={qId}
                      className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[520px] overflow-y-auto border-t border-[#e6eef0]' : 'max-h-0 border-t border-transparent'}`}
                    >
                      <p className="p-4 md:px-5 md:pb-5 md:pt-4 text-[15px] md:text-base text-[#46544f] leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeInSection>
      </section>
    );
  }

  return (
    <section id={sectionId} className={sectionClass}>
      <FadeInSection delay={100}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-3xl mx-auto faq-card-glass rounded-2xl p-6 md:p-8" dir="rtl">
            <p className="text-white/70 text-base mb-4">{intro}</p>
            <h2
              className="text-2xl md:text-3xl font-bold text-white mb-6"
              style={{ fontSize: 'var(--text-h2)', lineHeight: 'var(--leading-tight)' }}
            >
              שאלות נפוצות
            </h2>
            <div className="space-y-2">
              {faq.map((item: FaqItem, i: number) => {
                const isOpen = openIndices.has(i);
                const qId = `${baseId}-q-${i}`;
                const aId = `${baseId}-a-${i}`;
                return (
                  <div key={i} className="faq-item-glass rounded-xl overflow-hidden" data-open={isOpen}>
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className={`w-full flex items-center justify-between gap-4 p-4 text-right transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${ringLanding}`}
                      aria-expanded={isOpen}
                      aria-controls={aId}
                      id={qId}
                    >
                      <span className="font-medium text-white/95 text-base">{item.question}</span>
                      <span className="text-[var(--landing-primary)]">
                        <ChevronDown open={isOpen} variant="landing" />
                      </span>
                    </button>
                    <div
                      id={aId}
                      role="region"
                      aria-labelledby={qId}
                      className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[500px] overflow-y-auto' : 'max-h-0'}`}
                    >
                      <p className="p-4 pt-0 text-[15px] text-white/80 leading-relaxed">{item.answer}</p>
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
