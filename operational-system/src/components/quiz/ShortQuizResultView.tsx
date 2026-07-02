'use client';

import React from 'react';
import Link from 'next/link';
import {
  SHORT_QUIZ_RESULTS,
  SCOPING_CALL_TITLE,
  SCOPING_CALL_VALUE,
  SCOPING_CALL_PROMISE,
  SCOPING_CALL_TRUST,
  SCOPING_CALL_BRIDGE,
  SCOPING_CALL_CTA_LABEL,
  SCOPING_CALL_CTA_SUB,
  SCOPING_CALL_GUARANTEE,
  STRONG_TAGLINE,
  STRONG_HEADLINE,
  STRONG_BODY,
  type ResultType,
  type FixStep,
} from '@/config/shortQuizResults';
import { TESTIMONIALS, type Testimonial } from '@/config/testimonials';
import { ResultChatLauncher } from './ResultChatLauncher';
import { FadeIn } from '@/components/landing/FadeIn';

// Two named, real testimonials surfaced on the result page (with business name).
const RESULT_TESTIMONIALS: Testimonial[] = [TESTIMONIALS[0], TESTIMONIALS[3]];

// The bot's WhatsApp number (ManyChat). NOT Hadar's private line.
const WHATSAPP_NUMBER = '972524759529';
const MEETING_PATH = '/quiz/meeting';

interface ShortQuizResultViewProps {
  resultType: ResultType;
  /** Personalized "where you are" lines (already built from the answers). */
  whereYouAre: string[];
  /** "Felt vs data" note, shown when the chosen pain differs from the driver. */
  gapNote?: string | null;
  /** When true, the picture is healthy — show the "keep it as you grow" framing. */
  isStrong?: boolean;
  firstName?: string;
  /** Shows a soft "we got it" banner at the top (returning to a saved result). */
  showBanner?: boolean;
  /** Report token — forwarded to the meeting page so it can open the chat. */
  token?: string;
}

export function ShortQuizResultView({
  resultType,
  whereYouAre,
  gapNote,
  isStrong,
  firstName,
  showBanner,
  token,
}: ShortQuizResultViewProps) {
  const content = SHORT_QUIZ_RESULTS[resultType] ?? SHORT_QUIZ_RESULTS.CENTRALIZED;
  const lines = whereYouAre.length > 0 ? whereYouAre : [content.whereYouAreFallback];
  const name = firstName?.trim();

  const tagline = isStrong ? STRONG_TAGLINE : content.tagline;
  const headline = isStrong ? STRONG_HEADLINE : content.headline;

  return (
    <div
      className="min-h-screen text-[var(--qa-text-primary)] py-12 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">
        {showBanner && (
          <FadeIn>
            <div className="mb-8 p-4 rounded-2xl border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.07] text-[14px] text-[#46544f] leading-relaxed">
              שמרתי לך את התמונה. אפשר לחזור אליה בכל רגע.
            </div>
          </FadeIn>
        )}

        {/* Header */}
        <FadeIn>
          <div className="mb-9">
            <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.08] text-[#0b5f56] mb-5">
              {tagline}
            </span>
            <h1 className="studio-display text-[30px] md:text-[38px] font-black leading-[1.12]">
              {name && <span className="text-[#15302d]">{name}, </span>}
              <span className="qa-gradient-text">{headline}</span>
            </h1>
          </div>
        </FadeIn>

        {/* Opening: frames the pattern (or the "your base is solid" message) */}
        <FadeIn delay={60}>
          <section className="mb-8">
            <p className="text-[16px] md:text-[17px] text-[#46544f] leading-relaxed">
              {isStrong ? STRONG_BODY : content.opening}
            </p>
          </section>
        </FadeIn>

        {/* Next step — surfaces the path forward right at the top, before the long read */}
        <FadeIn delay={70}>
          <section className="mb-9 p-5 rounded-2xl border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.07] backdrop-blur-sm">
            <p className="text-[15px] md:text-[16px] text-[#46544f] leading-relaxed mb-4">
              הצעד הבא הוא שיחת אסטרטגיה איתי: שעה אחת על התהליך שלך, ובסופה מפה
              כתובה של מה לסדר ראשון. 350 ש&quot;ח, מקוזזים במלואם מהפרויקט אם ממשיכות יחד.
            </p>
            <Link
              href={`${MEETING_PATH}?p=${resultType.toLowerCase()}${token ? `&token=${token}` : ''}`}
              className="group inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl bg-gradient-to-l from-teal-500 to-emerald-500 text-white text-[16px] font-bold tracking-tight shadow-[0_10px_36px_-14px_rgba(20,184,166,0.6)] transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
            >
              ספרי לי עוד על השיחה
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </Link>
          </section>
        </FadeIn>

        {/* The problem sections — only when the picture isn't already healthy */}
        {!isStrong && (
          <>
            {/* Where you are */}
            <FadeIn delay={80}>
              <section className="mb-8">
                <h2 className="text-[13px] font-semibold tracking-wider text-[#0e7a6e] mb-4">
                  מה הנתונים שלך מראים
                </h2>
                <div className="flex flex-col gap-3">
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3.5 p-4 rounded-xl border border-[#dce7ea] bg-white backdrop-blur-sm"
                    >
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0e7a6e] shrink-0" aria-hidden="true" />
                      <p className="text-[15px] md:text-[16px] text-[#46544f] leading-relaxed">
                        {line}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>

            {/* Gap: what she feels vs. what the data shows feeds it */}
            {gapNote && (
              <FadeIn delay={100}>
                <section className="mb-8 p-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] backdrop-blur-sm">
                  <h2 className="text-[13px] font-semibold tracking-wider text-[#b45309] mb-3">
                    מה שמרגישים מול מה שמזין את זה
                  </h2>
                  <p className="text-[15px] md:text-[16px] text-[#46544f] leading-relaxed">
                    {gapNote}
                  </p>
                </section>
              </FadeIn>
            )}

            {/* What it costs you */}
            <FadeIn delay={120}>
              <section className="mb-8 p-6 rounded-2xl border border-[#dce7ea] border-r-[3px] border-r-[#0e7a6e] bg-white backdrop-blur-sm shadow-[0_8px_40px_-20px_rgba(20,184,166,0.3)]">
                <h2 className="text-[15px] font-bold text-[#15302d] mb-3">
                  המחיר האמיתי
                </h2>
                <p className="text-[16px] text-[#46544f] leading-relaxed">
                  {content.whatItCosts}
                </p>
              </section>
            </FadeIn>

            {/* Reframe: shift from symptom to "it's not you, it's the missing process" */}
            <FadeIn delay={120}>
              <section className="mb-8">
                <p className="text-[19px] md:text-[20px] font-bold text-[#15302d] leading-relaxed">
                  {content.reframe}
                </p>
              </section>
            </FadeIn>

            {/* 3 first steps */}
            <FadeIn delay={120}>
              <FixMapSection steps={content.fixSteps} />
            </FadeIn>
          </>
        )}

        {/* Bridge: from the free steps to "why a written plan, why now" */}
        <FadeIn delay={120}>
          <section className="mb-8">
            <p className="text-[17px] font-semibold text-[#15302d] leading-relaxed">
              {SCOPING_CALL_BRIDGE}
            </p>
          </section>
        </FadeIn>

        {/* What you get in the scoping call */}
        <FadeIn delay={120}>
          <section className="mb-8 p-6 rounded-2xl border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.06] backdrop-blur-sm shadow-[0_0_40px_-20px_rgba(20,184,166,0.35)]">
            <h2 className="text-[15px] font-bold text-[#15302d] mb-4">
              {SCOPING_CALL_TITLE}
            </h2>
            <ul className="flex flex-col gap-3">
              {SCOPING_CALL_VALUE.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 items-start text-[15px] text-[#46544f] leading-relaxed"
                >
                  <CheckIcon className="w-5 h-5 text-[#0e7a6e] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </FadeIn>

        {/* Dual promise */}
        <FadeIn delay={120}>
          <section className="mb-8 p-6 rounded-2xl border border-[#dce7ea] border-r-[3px] border-r-[#0e7a6e] bg-white backdrop-blur-sm">
            <h2 className="text-[15px] font-bold text-[#15302d] mb-3">
              ההבטחה שלי אלייך
            </h2>
            <p className="text-[15px] text-[#46544f] leading-relaxed mb-3">
              {SCOPING_CALL_TRUST}
            </p>
            <p className="text-[15px] text-[#46544f] leading-relaxed mb-3">
              {SCOPING_CALL_PROMISE.plan}
            </p>
            <p className="text-[15px] text-[#46544f] leading-relaxed">
              {SCOPING_CALL_PROMISE.price}
            </p>
          </section>
        </FadeIn>

        {/* Social proof */}
        <FadeIn delay={120}>
          <section className="mb-8">
            <h2 className="text-[13px] font-semibold tracking-wider text-[#0e7a6e] mb-4">
              לקוחות שכבר עשו את הצעד הזה
            </h2>
            <div className="flex flex-col gap-4">
              {RESULT_TESTIMONIALS.map((t) => (
                <ResultTestimonialCard key={t.name} testimonial={t} />
              ))}
            </div>
          </section>
        </FadeIn>

        {/* CTA block */}
        <FadeIn delay={120}>
          <section className="border-t border-[#dce7ea] pt-8 mt-2">
            <p className="text-[16px] text-[#46544f] leading-relaxed mb-6">
              {content.ctaSoft}
            </p>

            <Link
              href={`${MEETING_PATH}?p=${resultType.toLowerCase()}${token ? `&token=${token}` : ''}`}
              className="group flex flex-col items-center justify-center gap-0.5 w-full py-4 px-6 rounded-2xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] transition-all duration-300 hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
            >
              <span className="inline-flex items-center gap-2.5 text-[17px] font-bold">
                {SCOPING_CALL_CTA_LABEL}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </span>
              <span className="text-[13px] font-medium text-white/85">{SCOPING_CALL_CTA_SUB}</span>
            </Link>
            <p className="mt-3 text-center text-[13px] text-[#7c8884] leading-relaxed">
              {SCOPING_CALL_GUARANTEE}
            </p>

            <div className="mt-4 text-center">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(content.whatsappText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 rounded-xl border border-emerald-600/30 bg-emerald-600/10 text-[15px] font-semibold text-emerald-800 hover:border-emerald-600/55 hover:bg-emerald-600/15 hover:text-emerald-900 transition-all duration-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                או פשוט כתבי לי בוואטסאפ
              </a>
            </div>
          </section>
        </FadeIn>
      </div>

      {token && <ResultChatLauncher token={token} />}
    </div>
  );
}

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ResultTestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const role = testimonial.role.trim();
  return (
    <div className="p-6 rounded-2xl border border-[#dce7ea] bg-white backdrop-blur-sm">
      <div className="flex gap-1 mb-3 text-[#0e7a6e]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
      </div>
      <p className="text-[15px] font-bold text-[#0b5f56] mb-2 leading-snug">
        {testimonial.headline}
      </p>
      <p className="text-[15px] text-[#46544f] leading-relaxed mb-4">
        {testimonial.text}
      </p>
      <div className="border-t border-[#dce7ea] pt-4">
        <p className="text-[14px] text-[#15302d] font-bold">
          {testimonial.name}
          {role !== '' && (
            <span className="text-[#7c8884] font-normal"> · {role}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function FixMapSection({ steps }: { steps: FixStep[] }) {
  return (
    <section className="mb-8 p-6 rounded-2xl border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.06] backdrop-blur-sm shadow-[0_0_40px_-20px_rgba(20,184,166,0.35)]">
      <h2 className="text-[15px] font-bold text-[#15302d] mb-5 flex items-center gap-2">
        <span className="text-[#0e7a6e]">★</span>
        שלושה צעדים שאפשר להתחיל מהם כבר עכשיו
      </h2>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-l from-teal-500 to-emerald-500 text-white text-[13px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-[15px] text-[#46544f] leading-relaxed pt-0.5">
              <span className="font-bold text-[#15302d]">{step.label}</span> {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
