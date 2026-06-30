'use client';

import React from 'react';
import type { WhyMeSectionCopy } from '@/config/landingCopy';
import { FadeInSection } from './FadeInSection';

const CheckBullet: React.FC<{ variant?: 'landing' | 'home' }> = ({ variant = 'landing' }) => (
  <svg
    className={`w-5 h-5 shrink-0 mt-0.5 ${variant === 'home' ? 'text-[#0e7a6e]' : 'text-[var(--landing-primary)]'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export const WhyMeSection: React.FC<
  WhyMeSectionCopy & {
    photoSrc?: string;
    sectionId?: string;
    sectionClassName?: string;
    variant?: 'landing' | 'home';
  }
> = ({
  whyMeHeadline,
  whyMeIntro,
  whyMeProofs,
  whyMeClose,
  photoSrc,
  sectionId,
  sectionClassName,
  variant = 'landing',
}) => {
  const architectPart = 'אדריכלית';
  const parts = whyMeHeadline.includes(architectPart) ? whyMeHeadline.split(architectPart) : null;

  const headlineInner =
    variant === 'home' && parts ? (
      <>
        {parts[0]}
        <span className="studio-underline text-[#0b5f56] font-black">
          {architectPart}
        </span>
        {parts[1]}
      </>
    ) : parts ? (
      <>
        {parts[0]}
        <span className="headline-architect-highlight font-black">{architectPart}</span>
        {parts[1]}
      </>
    ) : (
      whyMeHeadline
    );

  const landingSection =
    'whyme-section-bg relative py-20 md:py-24 px-6 md:px-8 overflow-hidden scroll-mt-20';
  const homeSection =
    'relative scroll-mt-20 overflow-hidden bg-white border-y border-[#dce7ea] py-24 md:py-32 px-5 md:px-8';

  const sectionClass = [variant === 'home' ? homeSection : landingSection, sectionClassName]
    .filter(Boolean)
    .join(' ');

  if (variant === 'home') {
    return (
      <section id={sectionId} className={sectionClass} dir="rtl">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(720px,90vw)] h-[240px] bg-[#0e7a6e]/[0.05] rounded-full blur-[100px]" />
        </div>
        <FadeInSection delay={100}>
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <span className="h-px w-7 bg-[#0e7a6e]/40" aria-hidden />
              <span className="text-[#0e7a6e] text-xs font-bold tracking-[0.16em]">קצת עליי</span>
              <span className="h-px w-7 bg-[#0e7a6e]/40 sm:hidden" aria-hidden />
            </div>
            <h2 className="studio-display text-3xl md:text-5xl text-[#15302d] text-center mb-12 md:mb-14 leading-tight px-2">
              {headlineInner}
            </h2>
            <div className="rounded-3xl border border-[#dce7ea] bg-[#f6f9fb] p-8 md:p-10 shadow-[0_24px_70px_-40px_rgba(21,48,45,0.25)]">
              <div className="flex flex-col md:flex-row gap-10 md:gap-12 items-start">
                {photoSrc && (
                  <div className="shrink-0 relative mx-auto md:mx-0 flex justify-center md:justify-start">
                    <div className="relative rounded-full p-[3px] bg-gradient-to-br from-[#0e7a6e]/40 via-[#0d9488]/15 to-[#0e7a6e]/20 shadow-[0_22px_55px_-22px_rgba(21,48,45,0.4)]">
                      <div className="rounded-full overflow-hidden bg-white ring-2 ring-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoSrc}
                          alt="הדר מזל תורג'מן גואטה — מייסדת הדר אוטומציות"
                          width={208}
                          height={208}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="size-44 md:size-52 object-cover object-center rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-base md:text-lg text-[#46544f] mb-6 leading-relaxed">{whyMeIntro}</p>
                  <ul className="space-y-4 mb-6">
                    {whyMeProofs.map((p, i) => (
                      <li key={i} className="flex gap-3 items-start text-base text-[#46544f]">
                        <CheckBullet variant="home" />
                        <span className="leading-relaxed">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-base md:text-[17px] font-medium text-[#15302d] leading-relaxed border-t border-[#dce7ea] pt-6">
                    {whyMeClose}
                  </p>
                </div>
              </div>
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
          <div className="max-w-4xl mx-auto" dir="rtl">
            <h2
              className="text-2xl md:text-4xl font-extrabold text-white mb-10 text-right headline-bold-hover"
              style={{ fontSize: 'var(--text-h2)', lineHeight: 'var(--leading-tight)' }}
            >
              {headlineInner}
            </h2>
            <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-start">
              {photoSrc && (
                <div className="shrink-0 relative mx-auto md:mx-0 flex justify-center md:justify-start">
                  <div className="relative rounded-full p-[3px] bg-gradient-to-br from-[var(--landing-primary)]/35 via-white/10 to-teal-900/30 shadow-2xl">
                    <div className="rounded-full overflow-hidden bg-[#2d3748] ring-2 ring-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoSrc}
                        alt="הדר מזל תורג'מן גואטה — מייסדת הדר אוטומציות"
                        width={208}
                        height={208}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="size-44 md:size-52 object-cover object-center rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base md:text-[17px] text-white/90 mb-6 leading-relaxed">{whyMeIntro}</p>
                <ul className="space-y-4 mb-6">
                  {whyMeProofs.map((p, i) => (
                    <li key={i} className="flex gap-3 items-start text-base md:text-[16px] text-white/95">
                      <CheckBullet />
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-base font-medium text-white/90 leading-relaxed">{whyMeClose}</p>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
