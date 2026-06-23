'use client';

import Link from 'next/link';
import React, { useCallback, useEffect } from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ContactSection } from '@/components/landing/ContactSection';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import { WhyMeSection } from '@/components/landing/WhyMeSection';
import { FadeIn } from '@/components/landing/FadeIn';
import {
  HOME_ABOUT_SECTION,
  HOME_FAQ_INTRO,
  PROFILE_PHOTO_CIRCLE_URL,
  SHARED_FAQ,
} from '@/config/landingCopy';
import { trackEvent, getQuizUrl } from '@/lib/analytics';
import { TESTIMONIALS } from '@/config/testimonials';

const ArrowRight = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const CALCULATOR_AREAS = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    title: 'פניות ופולואפים',
    desc: 'מה קורה כשמתעניינת לא סוגרת מיד, ואיפה נושרות פניות כשאין תהליך המשך מסודר.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'זמן ניהולי ידני',
    desc: 'כמה מהשבוע שלך נבלע בהודעות, תיאומים, תזכורות ופולואפים שחוזרים על עצמם.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'גבייה ותזכורות תשלום',
    desc: 'איפה הכסף שכבר הרווחת יושב ומחכה, כשגבייה ותזכורות תשלום נדחות שוב ושוב.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    title: 'פיזור ניהולי',
    desc: 'איפה הפניות והמשימות מנוהלות היום: וואטסאפ, ראש, טבלאות, מערכות לא מחוברות — או מערכת אחת מסודרת.',
  },
];

const IDENTIFICATION_ITEMS = [
  'הפולואפ קורה רק אם את זוכרת.',
  'הוואטסאפ הוא עדיין מערכת הניהול האמיתית שלך.',
  'תיאומים, תזכורות וחשבוניות לוקחים לך שעות בשבוע.',
  'כשאת לא זמינה, דברים פשוט מחכים.',
  'את יודעת שצריך סדר, אבל לא יודעת מאיפה להתחיל.',
];

const PROCESS_STEPS = [
  {
    num: '01',
    title: '10 שאלות, פחות מ-4 דקות',
    desc: 'מסך נקי, שאלה אחת בכל פעם. שאלות שמדברות בשפה שלך — פניות, זמן, גבייה — ומאירות איפה זה נתקע.',
  },
  {
    num: '02',
    title: 'תמונה אישית, מיד אחרי',
    desc: 'מיד אחרי — תמונה אישית של איפה הכסף נוזל אצלך בדרך, ומה הדבר הראשון שכדאי לסדר.',
  },
  {
    num: '03',
    title: 'צעד ראשון מוגדר + שיחה',
    desc: 'אם תרצי, נדבר על מה לסדר ראשון — ספציפי לסיטואציה שלך, בלי לחץ ובלי מחויבות.',
  },
];

const DELIVERABLES = [
  'הדפוס שזיהינו אצלך — איפה בדיוק הכסף והזמן נוזלים בדרך.',
  'התחום שהכי עמוס אצלך כרגע, זה שכדאי להסתכל עליו ראשון.',
  'תחום אחד שכדאי לסדר ראשון, עם הסבר למה.',
  'צעד ספציפי ומוגדר — לא עצות כלליות.',
];

export default function HomePage() {
  useEffect(() => {
    trackEvent('page_view');
  }, []);

  const goToQuiz = useCallback(async (ctaId: string) => {
    await trackEvent('cta_click', { ctaId, keepalive: true });
    window.location.href = getQuizUrl();
  }, []);

  return (
    <div className="min-h-screen bg-[#0c1220] text-white overflow-hidden" dir="rtl">

      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="fixed top-0 right-0 left-0 z-50 h-16 flex items-center px-5 md:px-8 border-b border-white/[0.06] bg-[#0c1220]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <a href="/" className="flex items-center group" aria-label="דף הבית">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold tracking-[0.14em] text-white/80 group-hover:text-white transition-colors uppercase leading-none">
                HADAR TURGEMAN
              </span>
              <span className="text-[9px] text-teal-400/70 tracking-wide leading-none">
                אוטומציות לעסקים קטנים
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/50" aria-label="ניווט ראשי">
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white/80 transition-colors"
            >
              איך זה עובד?
            </button>
            <button
              onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white/80 transition-colors"
            >
              עדויות
            </button>
            <button
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white/80 transition-colors"
            >
              קצת עליי
            </button>
            <button
              onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white/80 transition-colors"
            >
              שאלות נפוצות
            </button>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white/80 transition-colors"
            >
              צור קשר
            </button>
          </nav>

          <button
            onClick={() => goToQuiz('navbar_cta')}
            className="min-h-[38px] px-5 rounded-lg bg-teal-500 text-white text-sm font-semibold transition-all duration-200 hover:bg-teal-400 active:scale-[0.97]"
          >
            בואי נראה כמה זה עולה לך
          </button>
        </div>
      </header>
      <div className="h-16" aria-hidden />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-5 md:px-8">
        {/* BG effects */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-teal-500/15 via-teal-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <FadeIn delay={120}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight mb-6 max-w-[36ch] mx-auto">
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-teal-300 via-teal-400 to-emerald-400">
                את עובדת. העסק זז. אז איפה הכסף?
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
              הכול קורה, אבל יותר מדי ממנו עדיין עובר דרכך. יש לזה מחיר.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => goToQuiz('hero_primary')}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[60px] px-10 rounded-2xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white text-lg font-bold tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] transition-all duration-300 hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1220] overflow-hidden"
              >
                <span aria-hidden className="absolute inset-y-0 -right-1/3 w-1/3 bg-gradient-to-l from-transparent via-white/30 to-transparent skew-x-[-18deg] translate-x-0 group-hover:translate-x-[420%] transition-transform duration-[1100ms] ease-out" />
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-gradient-to-l from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl -z-10" />
                <span className="relative z-10">בואי נראה כמה זה עולה לך</span>
                <ArrowRight className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>

              <p className="text-sm text-white/35">10 שאלות · 4 דקות · חינם · בסוף נבקש שם ומספר וואטסאפ כדי לשמור ולשלוח לך את התוצאה</p>
            </div>
          </FadeIn>

          <FadeIn delay={400}>
            <AnimatedCounter />
          </FadeIn>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF STRIP ═══════════ */}
      <div className="relative px-5 md:px-8 mt-10 md:mt-12 z-20" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                headline: 'קיצרה זמני טיפול בתביעות ויצרה שיתוף פעולה בין משרדים',
                name: 'רחל איגר לוין',
                role: 'משרד הרווחה',
              },
              {
                headline: 'חיברה קמפיין פייסבוק, דיוור ווואטסאפ לתהליך אחד שעובד',
                name: 'נעמי',
                role: 'מכון וולפסון',
              },
              {
                headline: 'הפכה טיפול בלידים לתהליך מסודר שחוסך זמן',
                name: 'לאה סוליטר',
                role: 'אדריכלות ועיצוב פנים',
              },
            ].map((t, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl border border-teal-300/[0.12] bg-[#0f1729]/80 px-5 py-4 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(20,184,166,0.25)]"
              >
                <svg className="w-4 h-4 text-teal-400/50 mb-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-white/85 text-sm font-medium leading-relaxed mb-3">{t.headline}</p>
                <p className="text-teal-400/70 text-xs">— <span className="font-semibold text-teal-300/90">{t.name}</span> · {t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ IDENTIFICATION ═══════════ */}
      <section className="py-20 md:py-28 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-10">אולי זה מוכר לך?</p>
          </FadeIn>
          <div className="space-y-3">
            {IDENTIFICATION_ITEMS.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-2.5" aria-hidden />
                  <p className="text-white/72 text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={440}>
            <div className="text-center mt-10">
              <button
                onClick={() => goToQuiz('identification_cta')}
                className="group inline-flex items-center gap-2.5 min-h-[52px] px-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold transition-all duration-200 hover:bg-teal-500/25 hover:border-teal-400/50 active:scale-[0.98]"
              >
                בואי נראה כמה זה עולה לך
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <p className="text-white/35 text-sm mt-3">10 שאלות · 4 דקות · חינם · בסוף נבקש שם ומספר וואטסאפ כדי לשמור ולשלוח לך את התוצאה</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <WhyMeSection {...HOME_ABOUT_SECTION} photoSrc={PROFILE_PHOTO_CIRCLE_URL} sectionId="about" variant="home" />

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-24 md:py-32 px-5 md:px-8 bg-[#0c1220]">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">הבדיקה &ldquo;איפה הכסף?&rdquo;</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              לא עצות כלליות. תמונה לפי הסיטואציה שלך.
            </h2>
            <p className="text-white/50 text-center text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-16">
              10 שאלות קצרות. תמונה אישית שמראה איפה הכסף נוזל אצלך בדרך, ואיפה כדאי להתחיל.
            </p>
          </FadeIn>

          <div className="relative">
            <div className="absolute top-0 bottom-0 right-[23px] md:right-[27px] w-px bg-gradient-to-b from-teal-500/40 via-teal-500/20 to-transparent" aria-hidden />

            <div className="space-y-10">
              {PROCESS_STEPS.map((step, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="flex gap-5 md:gap-8">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0c1220] border-2 border-teal-500/40 flex items-center justify-center text-teal-400 text-sm font-bold z-10 relative">
                        {step.num}
                      </div>
                    </div>
                    <div className="pt-2">
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-white/55 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CALCULATOR AREAS ═══════════ */}
      <section id="calculator-areas" className="py-24 md:py-32 px-5 md:px-8 bg-gradient-to-b from-[#111827] to-[#0c1220]">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">מה הבדיקה בודקת</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-5">
              10 שאלות קצרות. 4 תחומים. תמונה אחת ברורה.
            </h2>
            <p className="text-white/55 text-center text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-16">
              לא שאלון שיווקי. בדיקה שמדברת בשפה שלך, ומראה איפה הניהול הידני באמת גוזל לך זמן וכסף.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CALCULATOR_AREAS.map((s, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="group relative p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
                  <div className="w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform duration-300">
                    {s.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-white/55 leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={480}>
            <div className="text-center mt-12">
              <button
                onClick={() => goToQuiz('calculator_areas_cta')}
                className="group inline-flex items-center gap-2.5 min-h-[52px] px-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold transition-all duration-200 hover:bg-teal-500/25 hover:border-teal-400/50 active:scale-[0.98]"
              >
                בואי נראה כמה זה עולה לך
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <p className="text-white/35 text-sm mt-3">10 שאלות · 4 דקות · חינם · בסוף נבקש שם ומספר וואטסאפ כדי לשמור ולשלוח לך את התוצאה</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="py-24 md:py-32 px-5 md:px-8 bg-gradient-to-b from-[#111827] to-[#0f1729]">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">עדויות</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              מה קורה כשמסדרים את זה
            </h2>
            <p className="text-white/55 text-center text-base md:text-lg max-w-3xl mx-auto mb-16 leading-relaxed">
              לידים שנכנסו, מערכות שחוברו, נהלים שקוצרו, תהליכים שעובדים. לא הבטחות — תוצאות שקרו.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => {
              const isLastOdd = i === TESTIMONIALS.length - 1 && TESTIMONIALS.length % 2 !== 0;
              return (
                <FadeIn key={i} delay={i * 120} className={isLastOdd ? 'md:col-span-2' : ''}>
                  <div className={`p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] h-full flex flex-col${isLastOdd ? ' max-w-xl mx-auto w-full' : ''}`}>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="w-4 h-4 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-teal-300 mb-3 leading-snug">{t.headline}</p>
                    <p className="text-white/75 leading-relaxed flex-1 mb-5">&ldquo;{t.text}&rdquo;</p>
                    <div className="border-t border-white/[0.06] pt-4">
                      <p className="font-bold text-sm text-white">{t.name}</p>
                      {t.role.trim() !== '' ? <p className="text-white/50 text-xs mt-0.5">{t.role}</p> : null}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ DELIVERABLES ═══════════ */}
      <section className="py-20 md:py-24 px-5 md:px-8 bg-[#0c1220]">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">מה מקבלים בסוף</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12 leading-tight">
              ארבעה פריטים. לא סיכום. לא עצות.
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {DELIVERABLES.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 p-5 rounded-xl border border-teal-500/[0.12] bg-teal-500/[0.04]">
                  <svg className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-white/80 text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={360}>
            <div className="text-center mt-10">
              <button
                onClick={() => goToQuiz('deliverables_cta')}
                className="group inline-flex items-center gap-2.5 min-h-[52px] px-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 font-semibold transition-all duration-200 hover:bg-teal-500/25 hover:border-teal-400/50 active:scale-[0.98]"
              >
                בואי נראה כמה זה עולה לך
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <p className="text-white/35 text-sm mt-3">10 שאלות · 4 דקות · חינם · בסוף נבקש שם ומספר וואטסאפ כדי לשמור ולשלוח לך את התוצאה</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <FAQAccordion faq={SHARED_FAQ.slice(0, 5)} intro={HOME_FAQ_INTRO} sectionId="faq" variant="home" />

      <ContactSection variant="home" />

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/[0.06] py-10 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5 text-sm text-white/45">
              <div className="flex flex-col gap-0.5 mb-1">
                <span className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">
                  HADAR TURGEMAN
                </span>
                <span className="text-[9px] text-teal-400/60 tracking-wide">
                  אוטומציות לעסקים קטנים
                </span>
              </div>
              <span>
                מייל:{' '}
                <a href="mailto:cs@hadarturgemanautomations.com" className="hover:text-teal-400 transition-colors">
                  cs@hadarturgemanautomations.com
                </a>
              </span>
              <span>
                טלפון/וואטסאפ:{' '}
                <a href="https://wa.me/972504343547" className="hover:text-teal-400 transition-colors">
                  050-434-3547
                </a>
              </span>
              <span>
                אתר:{' '}
                <a href="https://hadarturgemanautomations.com" className="hover:text-teal-400 transition-colors">
                  hadarturgemanautomations.com
                </a>
              </span>
            </div>
            <nav className="flex items-center gap-5 text-sm text-white/30 flex-wrap justify-center md:justify-end" aria-label="ניווט תחתון">
              <Link href="/contact" className="hover:text-white/55 transition-colors">יצירת קשר</Link>
              <Link href="/privacy" className="hover:text-white/55 transition-colors">מדיניות פרטיות</Link>
              <Link href="/terms" className="hover:text-white/55 transition-colors">תנאי שימוש</Link>
              <a href="/admin/login" className="hover:text-white/55 transition-colors">כניסת מנהל</a>
            </nav>
          </div>
          <p className="text-xs text-white/20 text-center md:text-right">
            &copy; {new Date().getFullYear()} הדר אוטומציות, תורג&apos;מן גואטה הדר מזל. כל הזכויות שמורות.
          </p>
        </div>
      </footer>
    </div>
  );
}
