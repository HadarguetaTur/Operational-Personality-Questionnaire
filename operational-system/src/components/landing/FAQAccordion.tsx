'use client';

import React, { useId, useState } from 'react';
import { FAQ_INTRO } from '@/config/landingCopy';
import type { FaqAccordionCopy, FaqItem } from '@/config/landingCopy';
import { FadeInSection } from './FadeInSection';

const ChevronDown: React.FC<{ open: boolean; variant?: 'landing' | 'home' }> = ({ open, variant = 'landing' }) => (
  <svg
    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${variant === 'home' ? 'text-teal-400' : 'text-[var(--landing-primary)]'}`}
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
    'relative scroll-mt-20 bg-gradient-to-b from-[#111827] to-[#0f1729] py-24 md:py-32 px-5 md:px-8 overflow-hidden';

  const sectionClass = [variant === 'home' ? homeSection : landingSection, sectionClassName]
    .filter(Boolean)
    .join(' ');

  const ringHome = 'focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]';
  const ringLanding =
    'focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  if (variant === 'home') {
    return (
      <section id={sectionId} className={sectionClass} dir="rtl">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute bottom-0 right-0 w-[min(400px,70vw)] h-[280px] bg-indigo-600/[0.06] rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <FadeInSection delay={100}>
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">לפני שמתחילים</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-5 leading-snug px-2">
              שאלות נפוצות
            </h2>
            <p className="text-white/55 text-center text-base md:text-lg max-w-2xl mx-auto mb-12 md:mb-14 leading-relaxed px-2">
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
                    className={`rounded-2xl border backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.035] ${
                      isOpen
                        ? 'border-teal-500/30 bg-teal-500/[0.04] shadow-[0_0_40px_-20px_rgba(20,184,166,0.35)]'
                        : 'border-white/[0.06] bg-white/[0.02]'
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
                      <span className="font-semibold text-white/95 text-[15px] md:text-base leading-snug">{item.question}</span>
                      <ChevronDown open={isOpen} variant="home" />
                    </button>
                    <div
                      id={aId}
                      role="region"
                      aria-labelledby={qId}
                      className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[520px] overflow-y-auto border-t border-white/[0.05]' : 'max-h-0 border-t border-transparent'}`}
                    >
                      <p className="p-4 md:px-5 md:pb-5 md:pt-4 text-[15px] md:text-base text-white/65 leading-relaxed">
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
