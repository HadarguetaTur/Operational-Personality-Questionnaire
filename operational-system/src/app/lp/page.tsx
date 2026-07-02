'use client';

import React, { useCallback, useEffect } from 'react';
import { FadeIn, useInView } from '@/components/landing/FadeIn';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { PROFILE_PHOTO_CIRCLE_URL, type FaqItem } from '@/config/landingCopy';
import { trackEvent, getQuizUrl } from '@/lib/analytics';
import { TESTIMONIALS } from '@/config/testimonials';

/* ─────────────────────────────────────────────────────────────────────────────
   Campaign copy lives here, at the top, so message-matching a new ad means
   editing strings only. Keep the ad's exact hook phrase in EYEBROW/H1.
   Copy rules: female form, no dash, no invented numbers.
   ──────────────────────────────────────────────────────────────────────────── */

const LP_EYEBROW = 'בדיקה חינמית לעצמאיות · 12 שאלות · כ-3 דקות';
const LP_CTA_LABEL = 'תראי לי איפה הכסף שלי נוזל';
const LP_CTA_MICRO = '12 שאלות קצרות · כ-3 דקות · בלי הכנה ובלי כרטיס אשראי';

const LP_IDENTIFICATION = [
  'הלקוחה שלך מחכה לתשובה ממך. כשאת נזכרת, לפעמים היא כבר סגרה עם מישהי אחרת.',
  'הוואטסאפ שלך הוא מערכת הניהול של העסק שלך. וכל מה שלא סימנת בו נעלם לך.',
  'התיאומים, התזכורות והחשבוניות שלך אוכלים לך שעות כל שבוע. השעות האלה לא חוזרות אלייך.',
  'כשאת לא זמינה, העסק שלך לא זמין. וגם זה יורד לך מהכסף.',
];

const LP_STEPS = [
  {
    num: '01',
    title: '12 שאלות קצרות, כ-3 דקות',
    desc: 'מסך נקי, שאלה אחת בכל פעם, על היום-יום שלך ובשפה שלך: הפניות שלך, הזמן שלך, הגבייה שלך. בלי הכנה מראש.',
  },
  {
    num: '02',
    title: 'תמונת מצב עסקית, מיד בסיום',
    desc: 'איפה בדיוק הכסף והזמן שלך נוזלים בדרך, מדורג לפי מה שכואב לך הכי הרבה. לא רשימה גנרית.',
  },
  {
    num: '03',
    title: 'צעד ראשון מוגדר',
    desc: 'לא עצות כלליות. צעד שנבנה על התשובות שלך, לסיטואציה שלך, שאת יכולה להתחיל בו כבר היום.',
  },
];

const LP_DELIVERABLES = [
  'הדפוס שזיהינו אצלך: איפה בדיוק הכסף והזמן שלך נוזלים בדרך.',
  'התחום שהכי עמוס עלייך כרגע, ולמה דווקא אותו כדאי לך לסדר ראשון.',
  'הצעד הראשון שלך: ספציפי, מוגדר, ואפשר להתחיל בו עוד היום.',
];

/* The three objections cold traffic actually has, answered before the quiz. */
const LP_FAQ: FaqItem[] = [
  {
    question: 'כמה זה עולה?',
    answer:
      'הבדיקה עצמה חינמית לגמרי, בלי כרטיס אשראי. אם אחרי התוצאה תרצי להעמיק, יש שיחת אסטרטגיה בתשלום של 350 ש"ח, שמקוזזים במלואם מהפרויקט אם ממשיכות יחד. פרויקטים מלאים נעים לרוב בין 5,000 ל-15,000 ש"ח, כך שאת יודעת לאן זה הולך מראש.',
  },
  {
    question: 'אין לי זמן לעוד דבר עכשיו',
    answer:
      'בדיוק בגלל זה הבדיקה קצרה: 12 שאלות, כ-3 דקות, בלי הכנה. והיא עוסקת בדיוק בזה, בשעות שהתפעול הידני גוזל לך כל שבוע. שלוש דקות שמראות איפה הזמן שלך הולך.',
  },
  {
    question: 'זה מתאים לעסק כמו שלי?',
    answer:
      'אם יש לך פניות, לקוחות, תיאומים וגבייה, והרבה מזה עדיין עובר דרכך בוואטסאפ ובזיכרון, זה בדיוק בשבילך. אם עוד אין לך לקוחות פעילים, הבדיקה כנראה פחות רלוונטית כרגע.',
  },
];

const LP_TESTIMONIALS = [TESTIMONIALS[0], TESTIMONIALS[4]];

/* ──────────────────────────────────────────────────────────────────────────── */

const ArrowLeft = ({ className = 'w-4 h-4' }: { className?: string }) => (
  // RTL: forward = left
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 mb-4">
      <span className="h-px w-7 bg-[#5B3FC4]/40" aria-hidden />
      <span className="text-[#5B3FC4] text-xs font-bold tracking-[0.16em]">{children}</span>
      <span className="h-px w-7 bg-[#5B3FC4]/40 sm:hidden" aria-hidden />
    </div>
  );
}

function PrimaryCta({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`studio-cta-grad studio-cta-shine group inline-flex items-center justify-center gap-2.5 min-h-[58px] px-9 rounded-full text-white text-lg font-bold tracking-tight shadow-[0_16px_40px_-12px_rgba(91,63,196,0.6)] hover:-translate-y-[2px] hover:shadow-[0_24px_56px_-12px_rgba(123,97,232,0.75)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FC4]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9FC] ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <ArrowLeft className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
    </button>
  );
}

/* Hero trust row — real clients, names and fields only. No invented numbers.
   Freelance/small-business clients mirror the ad audience better than the
   institutional references; all three have full quotes in TESTIMONIALS. */
const LP_TRUST = [
  { initial: 'ל', name: 'לאה סוליטר', role: 'אדריכלות ועיצוב פנים' },
  { initial: 'א', name: 'איילה', role: 'איילה עיצובים' },
  { initial: 'ל', name: 'לידור בושרי', role: 'מסד גרופ' },
];

export default function CampaignLandingPage() {
  const timeline = useInView(0.2);

  useEffect(() => {
    void trackEvent('page_view', { keepalive: true });
  }, []);

  const goToQuiz = useCallback(async (ctaId: string) => {
    await trackEvent('cta_click', { ctaId, keepalive: true });
    window.location.href = getQuizUrl();
  }, []);

  return (
    <div className="studio-landing min-h-screen overflow-hidden font-assistant" dir="rtl">

      {/* ═══════════ MINIMAL HEADER — logo only, no nav, no exits ═══════════ */}
      <header className="h-16 flex items-center px-5 md:px-8 border-b border-[#E6E2F4] bg-[#FAF9FC]/85">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="studio-display text-base leading-none text-[#0D1B2A]">הדר תורג׳מן</span>
            <span className="text-[10px] text-[#5B3FC4] tracking-wide leading-none">סדר תפעולי לעסקים קטנים</span>
          </div>
          <button
            onClick={() => goToQuiz('lp_navbar_cta')}
            className="studio-cta-grad min-h-[38px] px-4 sm:px-5 rounded-full text-white text-sm font-semibold shadow-[0_8px_20px_-8px_rgba(91,63,196,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.97]"
          >
            {LP_CTA_LABEL}
          </button>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="studio-paper relative px-5 md:px-8 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="studio-aurora" aria-hidden>
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="absolute inset-0 studio-dotgrid opacity-60 pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Desktop: two columns — message on one side, calculator on the other.
              Mobile: single column, ordered headline → subhead → calculator →
              social proof → CTA. Explicit grid placement makes both work from
              one DOM order. */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">

            {/* message top — headline + subheadline */}
            <div className="text-center lg:text-right lg:col-start-1 lg:row-start-1">
              <FadeIn delay={80}>
                <Eyebrow>{LP_EYEBROW}</Eyebrow>
              </FadeIn>

              <FadeIn delay={140}>
                <h1 className="studio-display font-black text-[2.5rem] leading-[1.1] sm:text-5xl sm:leading-[1.12] md:text-6xl md:leading-[1.1] mb-5">
                  מסיימת עוד יום של{' '}
                  <span className="studio-gradient-text">כיבוי שריפות</span> בעסק שלך?
                  <br className="hidden sm:block" /> זה{' '}
                  <span className="studio-underline">עולה לך כסף</span>. והרבה יותר ממה שאת חושבת.
                </h1>
              </FadeIn>

              <FadeIn delay={220}>
                <p className="text-lg md:text-xl text-[#3D4859] leading-relaxed max-w-xl mx-auto lg:mx-0">
                  12 שאלות, כ-3 דקות מזמנך, ובסוף תמונת מצב ברורה: איפה בדיוק הכסף
                  שלך נוזל, ומאיפה להתחיל.
                </p>
              </FadeIn>
            </div>

            {/* interactive calculator — one side, spans both rows on desktop */}
            <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
              <FadeIn delay={300}>
                <div className="mb-4">
                  <Eyebrow>מד הבזבוז החי</Eyebrow>
                </div>
                <AnimatedCounter />
              </FadeIn>
            </div>

            {/* message bottom — social proof + CTA */}
            <div className="text-center lg:text-right lg:col-start-1 lg:row-start-2">
              {/* Trust row: Hadar's face + real client names. */}
              <FadeIn delay={380}>
                <div className="flex flex-col items-center gap-4 lg:items-start">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PROFILE_PHOTO_CIRCLE_URL}
                      alt="הדר תורג׳מן"
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-[#5B3FC4]/30"
                    />
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0D1B2A]">הדר תורג׳מן</p>
                      <p className="text-xs text-[#3D4859]">בונה תהליכים ואוטומציות לעסקים קטנים</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex -space-x-2 space-x-reverse">
                      {LP_TRUST.map((t) => (
                        <span
                          key={t.name}
                          className="w-9 h-9 rounded-full bg-[#5B3FC4] text-white text-sm font-bold flex items-center justify-center ring-2 ring-[#FAF9FC]"
                          title={`${t.name} · ${t.role}`}
                        >
                          {t.initial}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-[#3D4859]">
                      <span className="font-semibold text-[#0D1B2A]">לאה, איילה, לידור</span> ועוד, כבר יודעות בדיוק איפה הכסף שלהן נזל. עכשיו תורך לראות את שלך.
                    </p>
                  </div>
                </div>
              </FadeIn>

              {/* CTA link */}
              <FadeIn delay={460}>
                <div className="mt-8 flex flex-col items-center gap-3.5 lg:items-start">
                  <PrimaryCta onClick={() => goToQuiz('lp_hero_primary')} className="w-full sm:w-auto">
                    {LP_CTA_LABEL}
                  </PrimaryCta>
                  <p className="text-sm text-[#68707C]">{LP_CTA_MICRO}</p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ IDENTIFICATION ═══════════ */}
      <section className="py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <Eyebrow>אולי זה מוכר לך?</Eyebrow>
          </FadeIn>
          <div className="space-y-3 mt-8">
            {LP_IDENTIFICATION.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="studio-card-hover flex items-start gap-4 p-5 rounded-2xl border border-[#E6E2F4] bg-white shadow-[0_1px_2px_rgba(13,27,42,0.03)]">
                  <span className="studio-dot-live w-1.5 h-1.5 rounded-full bg-[#5B3FC4] shrink-0 mt-2.5" aria-hidden />
                  <p className="text-[#3D4859] text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={400}>
            <p className="text-center text-[#68707C] text-sm mt-8">
              אם שתיים מאלה קורות אצלך, הבדיקה תראה לך בדיוק איפה להתחיל.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="relative overflow-hidden py-16 md:py-24 px-5 md:px-8 bg-[#F3F0FB] border-y border-[#E6E2F4]">
        <div className="studio-aurora opacity-40" aria-hidden>
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <FadeIn>
            <Eyebrow>איך זה עובד</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-14 leading-tight">
              לא עצות כלליות. תמונה של העסק שלך, לפי הסיטואציה שלך.
            </h2>
          </FadeIn>

          <div ref={timeline.ref} className="relative">
            <div
              className={`absolute top-0 bottom-0 right-[23px] md:right-[27px] w-px bg-gradient-to-b from-[#5B3FC4]/40 via-[#5B3FC4]/20 to-transparent origin-top transition-transform duration-[1600ms] ease-out motion-reduce:transition-none motion-reduce:scale-y-100 ${
                timeline.visible ? 'scale-y-100' : 'scale-y-0'
              }`}
              aria-hidden
            />
            <div className="space-y-10">
              {LP_STEPS.map((step, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="flex gap-5 md:gap-8">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white border-2 border-[#5B3FC4]/35 flex items-center justify-center text-[#4A32A4] text-sm font-bold z-10 relative shadow-[0_4px_14px_-6px_rgba(91,63,196,0.4)]">
                        {step.num}
                      </div>
                    </div>
                    <div className="pt-2">
                      <h3 className="studio-display text-xl md:text-2xl mb-2">{step.title}</h3>
                      <p className="text-[#3D4859] leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ DELIVERABLES ═══════════ */}
      <section className="py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <Eyebrow>מה מקבלים בסוף</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-12 leading-tight">
              שלושה דברים על העסק שלך שיוצאים איתך מהבדיקה.
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {LP_DELIVERABLES.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#5B3FC4]/20 bg-[#5B3FC4]/[0.04]">
                  <svg className="w-5 h-5 text-[#5B3FC4] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path className="studio-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[#0D1B2A] text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={360}>
            <div className="text-center mt-10">
              <PrimaryCta onClick={() => goToQuiz('lp_deliverables_cta')}>{LP_CTA_LABEL}</PrimaryCta>
              <p className="text-[#68707C] text-sm mt-4">
                את התוצאה שלך שולחים לוואטסאפ שלך, כדי שהיא תישאר אצלך גם אחרי שתסגרי את המסך.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="relative overflow-hidden py-16 md:py-24 px-5 md:px-8 bg-[#F3F0FB] border-y border-[#E6E2F4]">
        <div className="relative z-10 max-w-4xl mx-auto">
          <FadeIn>
            <Eyebrow>עדויות</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-14 leading-tight">
              ככה זה נראה אצל מי שכבר סידרה את זה
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {LP_TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="studio-card-hover relative p-7 rounded-2xl border border-[#E6E2F4] bg-white shadow-[0_1px_2px_rgba(13,27,42,0.03)] h-full flex flex-col">
                  <p className="studio-display text-lg text-[#4A32A4] mb-3 leading-snug">{t.headline}</p>
                  <p className="text-[#3D4859] leading-relaxed flex-1 mb-5">&ldquo;{t.text}&rdquo;</p>
                  <div className="border-t border-[#EEEBF8] pt-4">
                    <p className="font-bold text-sm text-[#0D1B2A]">{t.name}</p>
                    {t.role.trim() !== '' ? <p className="text-[#68707C] text-xs mt-0.5">{t.role}</p> : null}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ — the 3 objections that stop cold traffic ═══════════ */}
      <FAQAccordion faq={LP_FAQ} intro="שלוש שאלות שכדאי לענות עליהן לפני שמתחילים." sectionId="lp-faq" variant="home" />

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="studio-paper relative px-5 md:px-8 py-20 md:py-28">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <FadeIn>
            <h2 className="studio-display text-3xl md:text-5xl mb-4 leading-tight">
              עוד שבוע של לנהל את הכל בראש שלך, או שלוש דקות שמראות לך מה שורף לך את הזמן.
            </h2>
            <p className="text-[#3D4859] text-base md:text-lg leading-relaxed mb-8">
              הבדיקה חינמית, התוצאה שלך אישית, והצעד הראשון שלך מוגדר. מכאן זה כבר בידיים שלך.
            </p>
            <PrimaryCta onClick={() => goToQuiz('lp_final_cta')} className="w-full sm:w-auto">
              {LP_CTA_LABEL}
            </PrimaryCta>
            <p className="text-sm text-[#68707C] mt-3.5">{LP_CTA_MICRO}</p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ MINIMAL FOOTER ═══════════ */}
      <footer className="border-t border-[#E6E2F4] bg-[#F3F0FB] py-8 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#68707C]">
          <span>&copy; {new Date().getFullYear()} הדר אוטומציות, תורג&apos;מן גואטה הדר מזל. כל הזכויות שמורות.</span>
          <nav className="flex items-center gap-4" aria-label="ניווט תחתון">
            <a href="/privacy" className="hover:text-[#0D1B2A] transition-colors">מדיניות פרטיות</a>
            <a href="/terms" className="hover:text-[#0D1B2A] transition-colors">תנאי שימוש</a>
          </nav>
        </div>
      </footer>

      {/* ═══════════ STICKY MOBILE CTA ═══════════ */}
      <div className="md:hidden fixed bottom-0 right-0 left-0 z-50 p-3 bg-[#FAF9FC]/95 backdrop-blur-md border-t border-[#E6E2F4]">
        <button
          onClick={() => goToQuiz('lp_sticky_cta')}
          className="studio-cta-grad w-full min-h-[52px] rounded-full text-white text-base font-bold shadow-[0_10px_28px_-10px_rgba(91,63,196,0.7)] active:scale-[0.98]"
        >
          {LP_CTA_LABEL}
        </button>
      </div>
      <div className="md:hidden h-20" aria-hidden />
    </div>
  );
}
