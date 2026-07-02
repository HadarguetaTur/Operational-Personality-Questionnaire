'use client';

import React, { useCallback, useEffect } from 'react';
import { FadeIn } from '@/components/landing/FadeIn';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import { PROFILE_PHOTO_CIRCLE_URL, type FaqItem } from '@/config/landingCopy';
import { trackEvent, getQuizUrl } from '@/lib/analytics';
import { TESTIMONIALS } from '@/config/testimonials';

/* ─────────────────────────────────────────────────────────────────────────────
   Campaign copy lives here, at the top, so message-matching a new ad means
   editing strings only. Keep the ad's exact hook phrase in EYEBROW/H1.
   Copy rules: female form, no dash, no invented numbers.
   ──────────────────────────────────────────────────────────────────────────── */

const LP_EYEBROW = 'בדיקה חינמית לעצמאיות · 10 שאלות · כ-3 דקות';
const LP_CTA_LABEL = 'גלי איפה הכסף נוזל';
const LP_CTA_MICRO = '10 שאלות קצרות · כ-3 דקות · בלי הכנה ובלי כרטיס אשראי';

const LP_IDENTIFICATION = [
  'הפולואפ קורה רק אם את זוכרת.',
  'הוואטסאפ הוא עדיין מערכת הניהול האמיתית שלך.',
  'תיאומים, תזכורות וחשבוניות לוקחים לך שעות בשבוע.',
  'כשאת לא זמינה, דברים פשוט מחכים.',
];

const LP_STEPS = [
  {
    num: '01',
    title: '10 שאלות קצרות, כ-3 דקות',
    desc: 'מסך נקי, שאלה אחת בכל פעם, בשפה שלך: פניות, זמן, גבייה. בלי הכנה מראש.',
  },
  {
    num: '02',
    title: 'תמונה אישית, מיד בסיום',
    desc: 'איפה בדיוק הכסף והזמן נוזלים אצלך בדרך, ומה הדבר הראשון שכדאי לסדר.',
  },
  {
    num: '03',
    title: 'צעד ראשון מוגדר',
    desc: 'לא עצות כלליות. צעד ספציפי לסיטואציה שלך, שאפשר להתחיל בו כבר היום.',
  },
];

const LP_DELIVERABLES = [
  'הדפוס שזיהינו אצלך, איפה בדיוק הכסף והזמן נוזלים בדרך.',
  'התחום שהכי עמוס אצלך כרגע, זה שכדאי להסתכל עליו ראשון.',
  'תחום אחד שכדאי לסדר ראשון, עם הסבר למה.',
  'צעד ספציפי ומוגדר, לא עצות כלליות.',
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
      'בדיוק בגלל זה הבדיקה קצרה: 10 שאלות, כ-3 דקות, בלי הכנה. והיא עוסקת בדיוק בזה, בשעות שהתפעול הידני גוזל לך כל שבוע. שלוש דקות שמראות איפה הזמן שלך הולך.',
  },
  {
    question: 'זה מתאים לעסק כמו שלי?',
    answer:
      'אם יש לך פניות, לקוחות, תיאומים וגבייה, והרבה מזה עדיין עובר דרכך בוואטסאפ ובזיכרון, זה בדיוק בשבילך. אם עוד אין לך לקוחות פעילים, הבדיקה כנראה פחות רלוונטית כרגע.',
  },
];

const LP_TESTIMONIALS = [TESTIMONIALS[0], TESTIMONIALS[3]];

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
      <span className="h-px w-7 bg-[#0e7a6e]/40" aria-hidden />
      <span className="text-[#0e7a6e] text-xs font-bold tracking-[0.16em]">{children}</span>
      <span className="h-px w-7 bg-[#0e7a6e]/40 sm:hidden" aria-hidden />
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
      className={`studio-cta-grad studio-cta-shine group inline-flex items-center justify-center gap-2.5 min-h-[58px] px-9 rounded-full text-white text-lg font-bold tracking-tight shadow-[0_16px_40px_-12px_rgba(14,122,110,0.6)] hover:-translate-y-[2px] hover:shadow-[0_24px_56px_-12px_rgba(20,180,160,0.75)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f9fb] ${className}`}
    >
      <span className="relative z-10">{children}</span>
      <ArrowLeft className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
    </button>
  );
}

/* Hero trust row — real clients, names and fields only. No invented numbers. */
const LP_TRUST = [
  { initial: 'ל', name: 'לאה סוליטר', role: 'אדריכלות' },
  { initial: 'נ', name: 'נעמי', role: 'מכון וולפסון' },
  { initial: 'ר', name: 'רחל איגר לוין', role: 'משרד הרווחה' },
];

export default function CampaignLandingPage() {
  useEffect(() => {
    void trackEvent('page_view', { keepalive: true });
  }, []);

  const goToQuiz = useCallback(async (ctaId: string) => {
    await trackEvent('cta_click', { ctaId, keepalive: true });
    window.location.href = getQuizUrl();
  }, []);

  return (
    <div className="studio-landing min-h-screen overflow-hidden font-heebo" dir="rtl">

      {/* ═══════════ MINIMAL HEADER — logo only, no nav, no exits ═══════════ */}
      <header className="h-16 flex items-center px-5 md:px-8 border-b border-[#dce7ea] bg-[#f6f9fb]/85">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="studio-display text-base leading-none text-[#15302d]">הדר תורג׳מן</span>
            <span className="text-[10px] text-[#0e7a6e] tracking-wide leading-none">סדר תפעולי לעסקים קטנים</span>
          </div>
          <button
            onClick={() => goToQuiz('lp_navbar_cta')}
            className="studio-cta-grad min-h-[38px] px-4 sm:px-5 rounded-full text-white text-sm font-semibold shadow-[0_8px_20px_-8px_rgba(14,122,110,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.97]"
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

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeIn delay={80}>
            <Eyebrow>{LP_EYEBROW}</Eyebrow>
          </FadeIn>

          <FadeIn delay={140}>
            <h1 className="studio-display font-black text-[2.5rem] leading-[1.1] sm:text-5xl sm:leading-[1.12] md:text-6xl md:leading-[1.1] mb-5">
              כל העסק שלך חי{' '}
              <span className="studio-gradient-text">בוואטסאפ</span> ובזיכרון שלך.
              <br className="hidden sm:block" /> וזה עולה לך כסף, <span className="studio-underline">בשקט</span>.
            </h1>
          </FadeIn>

          <FadeIn delay={220}>
            <p className="text-lg md:text-xl text-[#46544f] leading-relaxed mb-8 max-w-2xl mx-auto">
              עני על 10 שאלות קצרות וקבלי תמונה אישית: איפה בדיוק פניות, זמן
              וגבייה נוזלים אצלך בדרך, ומה הצעד הראשון שמחזיר לך שליטה. בלי עוד
              מערכת, ובלי לאבד את היחס האישי.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col items-center gap-3.5">
              <PrimaryCta onClick={() => goToQuiz('lp_hero_primary')} className="w-full sm:w-auto">
                {LP_CTA_LABEL}
              </PrimaryCta>
              <p className="text-sm text-[#7c8884]">{LP_CTA_MICRO}</p>
            </div>
          </FadeIn>

          {/* Trust row: Hadar's face + real client names. */}
          <FadeIn delay={380}>
            <div className="mt-9 flex flex-col items-center gap-4">
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
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-[#0e7a6e]/30"
                />
                <div className="text-right">
                  <p className="text-sm font-bold text-[#15302d]">הדר תורג׳מן</p>
                  <p className="text-xs text-[#46544f]">בונה תהליכים ואוטומציות לעסקים קטנים</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex -space-x-2 space-x-reverse">
                  {LP_TRUST.map((t) => (
                    <span
                      key={t.name}
                      className="w-9 h-9 rounded-full bg-[#0e7a6e] text-white text-sm font-bold flex items-center justify-center ring-2 ring-[#f6f9fb]"
                      title={`${t.name} · ${t.role}`}
                    >
                      {t.initial}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-[#46544f]">
                  <span className="font-semibold text-[#15302d]">לאה, נעמי, רחל</span> ועוד, כבר עשו סדר בתהליכים.
                </p>
              </div>
            </div>
          </FadeIn>
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
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#dce7ea] bg-white shadow-[0_1px_2px_rgba(21,48,45,0.03)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] shrink-0 mt-2.5" aria-hidden />
                  <p className="text-[#46544f] text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={400}>
            <p className="text-center text-[#7c8884] text-sm mt-8">
              אם שתיים מאלה נכונות אצלך, הבדיקה תראה לך איפה להתחיל.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="relative overflow-hidden py-16 md:py-24 px-5 md:px-8 bg-[#eef4f6] border-y border-[#dce7ea]">
        <div className="studio-aurora opacity-40" aria-hidden>
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <FadeIn>
            <Eyebrow>איך זה עובד</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-14 leading-tight">
              לא עצות כלליות. תמונה לפי הסיטואציה שלך.
            </h2>
          </FadeIn>

          <div className="relative">
            <div className="absolute top-0 bottom-0 right-[23px] md:right-[27px] w-px bg-gradient-to-b from-[#0e7a6e]/40 via-[#0e7a6e]/20 to-transparent" aria-hidden />
            <div className="space-y-10">
              {LP_STEPS.map((step, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="flex gap-5 md:gap-8">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white border-2 border-[#0e7a6e]/35 flex items-center justify-center text-[#0b5f56] text-sm font-bold z-10 relative shadow-[0_4px_14px_-6px_rgba(14,122,110,0.4)]">
                        {step.num}
                      </div>
                    </div>
                    <div className="pt-2">
                      <h3 className="studio-display text-xl md:text-2xl mb-2">{step.title}</h3>
                      <p className="text-[#46544f] leading-relaxed">{step.desc}</p>
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
              ארבעה פריטים. לא סיכום. לא עצות.
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {LP_DELIVERABLES.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#0e7a6e]/20 bg-[#0e7a6e]/[0.04]">
                  <svg className="w-5 h-5 text-[#0e7a6e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[#15302d] text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={360}>
            <div className="text-center mt-10">
              <PrimaryCta onClick={() => goToQuiz('lp_deliverables_cta')}>{LP_CTA_LABEL}</PrimaryCta>
              <p className="text-[#7c8884] text-sm mt-4">
                בסוף הבדיקה נבקש שם ומספר וואטסאפ כדי לשמור ולשלוח לך את התוצאה.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="relative overflow-hidden py-16 md:py-24 px-5 md:px-8 bg-[#eef4f6] border-y border-[#dce7ea]">
        <div className="relative z-10 max-w-4xl mx-auto">
          <FadeIn>
            <Eyebrow>עדויות</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-14 leading-tight">
              מה קורה כשמסדרים את זה
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {LP_TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="relative p-7 rounded-2xl border border-[#dce7ea] bg-white shadow-[0_1px_2px_rgba(21,48,45,0.03)] h-full flex flex-col">
                  <p className="studio-display text-lg text-[#0b5f56] mb-3 leading-snug">{t.headline}</p>
                  <p className="text-[#46544f] leading-relaxed flex-1 mb-5">&ldquo;{t.text}&rdquo;</p>
                  <div className="border-t border-[#e6eef0] pt-4">
                    <p className="font-bold text-sm text-[#15302d]">{t.name}</p>
                    {t.role.trim() !== '' ? <p className="text-[#7c8884] text-xs mt-0.5">{t.role}</p> : null}
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
              שלוש דקות עכשיו, במקום עוד שבוע של לנהל הכל בראש.
            </h2>
            <p className="text-[#46544f] text-base md:text-lg leading-relaxed mb-8">
              הבדיקה חינמית, התוצאה אישית, והצעד הראשון מוגדר. מכאן זה כבר בידיים שלך.
            </p>
            <PrimaryCta onClick={() => goToQuiz('lp_final_cta')} className="w-full sm:w-auto">
              {LP_CTA_LABEL}
            </PrimaryCta>
            <p className="text-sm text-[#7c8884] mt-3.5">{LP_CTA_MICRO}</p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ MINIMAL FOOTER ═══════════ */}
      <footer className="border-t border-[#dce7ea] bg-[#eef4f6] py-8 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9aa6a2]">
          <span>&copy; {new Date().getFullYear()} הדר אוטומציות, תורג&apos;מן גואטה הדר מזל. כל הזכויות שמורות.</span>
          <nav className="flex items-center gap-4" aria-label="ניווט תחתון">
            <a href="/privacy" className="hover:text-[#15302d] transition-colors">מדיניות פרטיות</a>
            <a href="/terms" className="hover:text-[#15302d] transition-colors">תנאי שימוש</a>
          </nav>
        </div>
      </footer>

      {/* ═══════════ STICKY MOBILE CTA ═══════════ */}
      <div className="md:hidden fixed bottom-0 right-0 left-0 z-50 p-3 bg-[#f6f9fb]/95 backdrop-blur-md border-t border-[#dce7ea]">
        <button
          onClick={() => goToQuiz('lp_sticky_cta')}
          className="studio-cta-grad w-full min-h-[52px] rounded-full text-white text-base font-bold shadow-[0_10px_28px_-10px_rgba(14,122,110,0.7)] active:scale-[0.98]"
        >
          {LP_CTA_LABEL}
        </button>
      </div>
      <div className="md:hidden h-20" aria-hidden />
    </div>
  );
}
