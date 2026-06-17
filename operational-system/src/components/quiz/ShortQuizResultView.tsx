'use client';

import React from 'react';
import Link from 'next/link';
import {
  SHORT_QUIZ_RESULTS,
  SCOPING_CALL_TITLE,
  SCOPING_CALL_VALUE,
  SCOPING_CALL_PROMISE,
  SCOPING_CALL_BRIDGE,
  type ResultType,
  type FixStep,
} from '@/config/shortQuizResults';
import { TESTIMONIALS, type Testimonial } from '@/config/testimonials';
import { ResultChatLauncher } from './ResultChatLauncher';

// Two named, real testimonials surfaced on the result page (with business name).
const RESULT_TESTIMONIALS: Testimonial[] = [TESTIMONIALS[0], TESTIMONIALS[2]];

// The bot's WhatsApp number (ManyChat). NOT Hadar's private line.
const WHATSAPP_NUMBER = '972524759529';
const MEETING_PATH = '/quiz/meeting';

interface ShortQuizResultViewProps {
  resultType: ResultType;
  /** Personalized "where you are" lines (already built from the answers). */
  whereYouAre: string[];
  firstName?: string;
  /** Shows a soft "we got it" banner at the top (returning to a saved result). */
  showBanner?: boolean;
  /** Report token — forwarded to the meeting page so it can open the chat. */
  token?: string;
}

export function ShortQuizResultView({
  resultType,
  whereYouAre,
  firstName,
  showBanner,
  token,
}: ShortQuizResultViewProps) {
  const content = SHORT_QUIZ_RESULTS[resultType] ?? SHORT_QUIZ_RESULTS.CENTRALIZED;
  const lines = whereYouAre.length > 0 ? whereYouAre : [content.whereYouAreFallback];
  const name = firstName?.trim();

  return (
    <div
      className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] py-10 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">
        {showBanner && (
          <div className="mb-8 p-4 rounded-[12px] border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)] text-[14px] text-[var(--qa-text-secondary)] leading-relaxed">
            שמרתי לך את התמונה. אפשר לחזור אליה בכל רגע.
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-accent)] mb-4">
            {content.tagline}
          </span>
          <h1 className="text-[26px] md:text-[31px] font-bold text-[var(--qa-text-primary)] leading-snug">
            {name ? `${name}, ${content.headline}` : content.headline}
          </h1>
        </div>

        {/* Where you are */}
        <section className="mb-8">
          <h2 className="text-[14px] font-semibold text-[var(--qa-text-muted)] mb-3">
            איפה את נמצאת
          </h2>
          <div className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <p
                key={i}
                className="text-[16px] text-[var(--qa-text-secondary)] leading-relaxed"
              >
                {line}
              </p>
            ))}
          </div>
        </section>

        {/* What it costs you */}
        <section className="mb-8 p-5 rounded-[14px] border-r-[3px] border-[var(--qa-accent)] bg-[var(--qa-surface)]">
          <h2 className="text-[15px] font-bold text-[var(--qa-text-primary)] mb-3">
            כמה זה עולה לך
          </h2>
          <p className="text-[16px] text-[var(--qa-text-secondary)] leading-relaxed">
            {content.whatItCosts}
          </p>
        </section>

        {/* 3 first steps */}
        <FixMapSection steps={content.fixSteps} />

        {/* Bridge: from the free steps to "why a written plan, why now" */}
        <section className="mb-8">
          <p className="text-[17px] font-semibold text-[var(--qa-text-primary)] leading-relaxed">
            {SCOPING_CALL_BRIDGE}
          </p>
        </section>

        {/* What you get in the scoping call */}
        <section className="mb-8 p-5 rounded-[14px] border-2 border-[var(--qa-accent)] bg-[var(--qa-accent-soft)]">
          <h2 className="text-[15px] font-bold text-[var(--qa-text-primary)] mb-4">
            {SCOPING_CALL_TITLE}
          </h2>
          <ul className="flex flex-col gap-3">
            {SCOPING_CALL_VALUE.map((item) => (
              <li
                key={item}
                className="flex gap-2 items-start text-[15px] text-[var(--qa-text-primary)] leading-relaxed"
              >
                <span className="text-[var(--qa-accent)] font-bold mt-px shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Dual promise */}
        <section className="mb-8 p-5 rounded-[14px] border-r-[3px] border-[var(--qa-accent)] bg-[var(--qa-surface)]">
          <h2 className="text-[15px] font-bold text-[var(--qa-text-primary)] mb-3">
            ההבטחה שלי אלייך
          </h2>
          <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed mb-3">
            {SCOPING_CALL_PROMISE.plan}
          </p>
          <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed">
            {SCOPING_CALL_PROMISE.price}
          </p>
        </section>

        {/* Social proof */}
        <section className="mb-8">
          <h2 className="text-[14px] font-semibold text-[var(--qa-text-muted)] mb-3">
            לקוחות שכבר עשו את הצעד הזה
          </h2>
          <div className="flex flex-col gap-4">
            {RESULT_TESTIMONIALS.map((t) => (
              <ResultTestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </section>

        {/* CTA block */}
        <section className="border-t border-[var(--qa-border-light)] pt-8 mt-2">
          <p className="text-[16px] text-[var(--qa-text-secondary)] leading-relaxed mb-6">
            {content.ctaSoft}
          </p>

          <Link
            href={`${MEETING_PATH}?p=${resultType.toLowerCase()}${token ? `&token=${token}` : ''}`}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-[12px] bg-[var(--qa-accent)] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150"
          >
            לתיאום שיחת היכרות, בלי עלות ←
          </Link>

          <div className="mt-4 text-center">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(content.whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-[15px] font-medium text-[var(--qa-text-secondary)] hover:text-[var(--qa-accent)] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              או פשוט כתבי לי בוואטסאפ
            </a>
          </div>
        </section>
      </div>

      {token && <ResultChatLauncher token={token} />}
    </div>
  );
}

function ResultTestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const role = testimonial.role.trim();
  return (
    <div className="p-5 rounded-[14px] bg-[var(--qa-surface)] border border-[var(--qa-border)]">
      <div className="flex gap-0.5 mb-3 text-[var(--qa-accent)]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
      </div>
      <p className="text-[15px] font-bold text-[var(--qa-accent)] mb-2 leading-snug">
        {testimonial.headline}
      </p>
      <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed mb-3">
        {testimonial.text}
      </p>
      <p className="text-[14px] text-[var(--qa-text-primary)] font-semibold">
        {testimonial.name}
        {role !== '' && (
          <span className="text-[var(--qa-text-muted)] font-normal"> · {role}</span>
        )}
      </p>
    </div>
  );
}

function FixMapSection({ steps }: { steps: FixStep[] }) {
  return (
    <section className="mb-8 p-5 rounded-[14px] border-2 border-[var(--qa-accent)] bg-[var(--qa-accent-soft)]">
      <h2 className="text-[15px] font-bold text-[var(--qa-text-primary)] mb-4 flex items-center gap-2">
        <span className="text-[var(--qa-accent)]">★</span>
        שלושה צעדים שאפשר להתחיל מהם כבר עכשיו
      </h2>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent)] text-white text-[12px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-[15px] text-[var(--qa-text-primary)] leading-relaxed">
              <span className="font-bold">{step.label}</span> {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
