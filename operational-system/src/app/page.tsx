'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
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

const ArrowLeft = ({ className = 'w-4 h-4' }: { className?: string }) => (
  // RTL: forward = left
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const CTA_LABEL = 'גלי איפה הכסף נוזל';

/* Small teal eyebrow with a short rule — editorial section kicker */
function Eyebrow({ children, align = 'center' }: { children: React.ReactNode; align?: 'center' | 'start' }) {
  return (
    <div className={`flex items-center gap-2.5 mb-4 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
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

function SoftCta({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2.5 min-h-[52px] px-8 rounded-full border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.06] text-[#0b5f56] font-semibold transition-all duration-200 hover:bg-[#0e7a6e]/[0.12] hover:border-[#0e7a6e]/45 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f9fb]"
    >
      {children}
      <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
    </button>
  );
}

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

const NAV_LINKS: { id: string; label: string }[] = [
  { id: 'how-it-works', label: 'איך זה עובד?' },
  { id: 'testimonials', label: 'עדויות' },
  { id: 'about', label: 'קצת עליי' },
  { id: 'faq', label: 'שאלות נפוצות' },
  { id: 'contact', label: 'צור קשר' },
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
    title: '10 שאלות קצרות, כ-3 דקות',
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

/* Hero trust row — three real clients shown as initial chips */
const HERO_TRUST = [
  { initial: 'ל', name: 'לאה סוליטר', role: 'אדריכלות' },
  { initial: 'נ', name: 'נעמי', role: 'מכון וולפסון' },
  { initial: 'ר', name: 'רחל איגר לוין', role: 'משרד הרווחה' },
];

export default function HomePage() {
  useEffect(() => {
    // Fire page_view immediately on mount. The prior exit-only sendBeacon
    // approach never landed for mobile in-app-browser traffic (Instagram/FB),
    // which is the entire paid audience — the webview is destroyed before the
    // beacon flushes. keepalive lets it survive a fast CTA navigation too.
    void trackEvent('page_view', { keepalive: true });
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);

  const goToQuiz = useCallback(async (ctaId: string) => {
    await trackEvent('cta_click', { ctaId, keepalive: true });
    window.location.href = getQuizUrl();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  return (
    <div className="studio-landing min-h-screen overflow-hidden font-heebo" dir="rtl">

      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="fixed top-0 right-0 left-0 z-50 h-16 flex items-center px-5 md:px-8 border-b border-[#dce7ea] bg-[#f6f9fb]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <a href="/" className="flex items-center group" aria-label="דף הבית">
            <div className="flex flex-col gap-0.5">
              <span className="studio-display text-base leading-none text-[#15302d] group-hover:text-[#0b5f56] transition-colors">
                הדר תורג׳מן
              </span>
              <span className="text-[10px] text-[#0e7a6e] tracking-wide leading-none">
                סדר תפעולי לעסקים קטנים
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-[#46544f]" aria-label="ניווט ראשי">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="hover:text-[#15302d] transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToQuiz('navbar_cta')}
              className="studio-cta-grad min-h-[38px] px-4 sm:px-5 rounded-full text-white text-sm font-semibold shadow-[0_8px_20px_-8px_rgba(14,122,110,0.7)] hover:-translate-y-[1px] hover:shadow-[0_12px_26px_-8px_rgba(20,180,160,0.8)] active:translate-y-0 active:scale-[0.97]"
            >
              {CTA_LABEL}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-10 h-10 -mr-1 rounded-lg text-[#46544f] hover:text-[#15302d] hover:bg-[#15302d]/[0.05] transition-colors"
              aria-label="תפריט"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            className="md:hidden absolute top-16 right-0 left-0 z-[60] bg-[#f6f9fb] border-b border-[#dce7ea] shadow-[0_18px_40px_-18px_rgba(21,48,45,0.35)] px-5 py-3 flex flex-col"
            aria-label="ניווט מובייל"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-right py-3 text-[#46544f] hover:text-[#15302d] border-b border-[#e6eef0] last:border-0 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}
      </header>
      <div className="h-16" aria-hidden />

      {/* ═══════════ HERO ═══════════ */}
      <section className="studio-paper relative px-5 md:px-8 pt-12 pb-20 md:pt-16 md:pb-28">
        {/* animated aurora atmosphere */}
        <div className="studio-aurora" aria-hidden>
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="absolute inset-0 studio-dotgrid opacity-60 pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeIn delay={80}>
            <Eyebrow>הבדיקה · איפה הכסף?</Eyebrow>
          </FadeIn>

          <FadeIn delay={140}>
            <h1 className="studio-display font-black text-[2.6rem] leading-[1.08] sm:text-5xl sm:leading-[1.12] md:text-6xl md:leading-[1.1] mb-5">
              כל העסק שלך חי{' '}
              <span className="studio-gradient-text">בוואטסאפ</span> ובזיכרון שלך.
              <br className="hidden sm:block" /> וזה עולה לך כסף,{' '}
              <span className="studio-underline">בשקט</span>.
            </h1>
          </FadeIn>

          <FadeIn delay={220}>
            <p className="text-lg md:text-xl text-[#46544f] leading-relaxed mb-8 max-w-2xl mx-auto">
              עני על 10 שאלות קצרות וקבלי תמונה אישית: איפה בדיוק פניות, זמן
              וגבייה נוזלים אצלך בדרך, ומה הצעד הראשון שמחזיר לך שליטה.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col items-center gap-3.5">
              <PrimaryCta onClick={() => goToQuiz('hero_primary')} className="w-full sm:w-auto">
                {CTA_LABEL}
              </PrimaryCta>
              <p className="text-sm text-[#7c8884]">בלי עלות · 10 שאלות · כ-3 דקות · בלי הכנה מראש</p>
            </div>
          </FadeIn>

          {/* Trust row — inside the fold, right under the CTA */}
          <FadeIn delay={380}>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex -space-x-2 space-x-reverse">
                {HERO_TRUST.map((t) => (
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
                <span className="font-semibold text-[#15302d]">לאה, נעמי, רחל</span> ועוד — כבר עשו סדר בתהליכים.
              </p>
            </div>
          </FadeIn>

          {/* Numbers animation — back in the hero */}
          <FadeIn delay={460}>
            <p className="mt-14 text-[#46544f] text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              ככה זה נראה אצל רוב העצמאיות. הבדיקה מראה איפה זה קורה אצלך בדיוק.
            </p>
            <AnimatedCounter />
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ IDENTIFICATION ═══════════ */}
      <section className="py-20 md:py-28 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <Eyebrow>אולי זה מוכר לך?</Eyebrow>
          </FadeIn>
          <div className="space-y-3 mt-8">
            {IDENTIFICATION_ITEMS.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-[#dce7ea] bg-white shadow-[0_1px_2px_rgba(21,48,45,0.03)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] shrink-0 mt-2.5" aria-hidden />
                  <p className="text-[#46544f] text-base leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={440}>
            <div className="text-center mt-10">
              <SoftCta onClick={() => goToQuiz('identification_cta')}>{CTA_LABEL}</SoftCta>
              <p className="text-[#7c8884] text-sm mt-3">אם שתיים מאלה נכונות אצלך — הבדיקה תראה לך איפה להתחיל.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <WhyMeSection {...HOME_ABOUT_SECTION} photoSrc={PROFILE_PHOTO_CIRCLE_URL} sectionId="about" variant="home" />

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="relative overflow-hidden py-24 md:py-32 px-5 md:px-8 bg-[#eef4f6] border-y border-[#dce7ea]">
        <div className="studio-aurora opacity-40" aria-hidden>
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <FadeIn>
            <Eyebrow>הבדיקה &ldquo;איפה הכסף?&rdquo;</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-4 leading-tight">
              לא עצות כלליות. תמונה לפי הסיטואציה שלך.
            </h2>
            <p className="text-[#46544f] text-center text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-16">
              כמה שאלות קצרות. תמונה אישית שמראה איפה הכסף נוזל אצלך בדרך, ואיפה כדאי להתחיל.
            </p>
          </FadeIn>

          <div className="relative">
            <div className="absolute top-0 bottom-0 right-[23px] md:right-[27px] w-px bg-gradient-to-b from-[#0e7a6e]/40 via-[#0e7a6e]/20 to-transparent" aria-hidden />

            <div className="space-y-10">
              {PROCESS_STEPS.map((step, i) => (
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

      {/* ═══════════ WHAT IT CHECKS ═══════════ */}
      <section id="calculator-areas" className="py-24 md:py-32 px-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <Eyebrow>מה הבדיקה בודקת</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-5 leading-tight">
              ארבעה תחומים. תמונה אחת ברורה.
            </h2>
            <p className="text-[#46544f] text-center text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-16">
              לא שאלון שיווקי. בדיקה שמדברת בשפה שלך, ומראה איפה הניהול הידני באמת גוזל לך זמן וכסף.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CALCULATOR_AREAS.map((s, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="group relative h-full overflow-hidden p-8 rounded-2xl border border-[#dce7ea] bg-white shadow-[0_1px_2px_rgba(21,48,45,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0e7a6e]/30 hover:shadow-[0_18px_40px_-22px_rgba(21,48,45,0.25)]">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1 origin-right scale-x-0 bg-gradient-to-l from-[#0e7a6e] via-[#14b8a6] to-[#06b6d4] transition-transform duration-500 group-hover:scale-x-100" />
                  <div className="w-14 h-14 rounded-2xl bg-[#0e7a6e]/[0.08] border border-[#0e7a6e]/15 flex items-center justify-center text-[#0e7a6e] mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                    {s.icon}
                  </div>
                  <h3 className="studio-display text-xl md:text-2xl mb-3">{s.title}</h3>
                  <p className="text-[#46544f] leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={480}>
            <div className="text-center mt-12">
              <SoftCta onClick={() => goToQuiz('calculator_areas_cta')}>{CTA_LABEL}</SoftCta>
              <p className="text-[#7c8884] text-sm mt-3">כמה שאלות קצרות, ובסוף תמונה אחת ברורה.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="relative overflow-hidden py-24 md:py-32 px-5 md:px-8 bg-[#eef4f6] border-y border-[#dce7ea]">
        <div className="studio-aurora opacity-40" aria-hidden>
          <span className="orb orb-1" />
          <span className="orb orb-3" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <FadeIn>
            <Eyebrow>עדויות</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-4 leading-tight">
              מה קורה כשמסדרים את זה
            </h2>
            <p className="text-[#46544f] text-center text-base md:text-lg max-w-3xl mx-auto mb-16 leading-relaxed">
              לידים שנכנסו, מערכות שחוברו, נהלים שקוצרו, תהליכים שעובדים. לא הבטחות — תוצאות שקרו.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => {
              const isLastOdd = i === TESTIMONIALS.length - 1 && TESTIMONIALS.length % 2 !== 0;
              return (
                <FadeIn key={i} delay={i * 120} className={isLastOdd ? 'md:col-span-2' : ''}>
                  <div className={`relative p-7 rounded-2xl border border-[#dce7ea] bg-white shadow-[0_1px_2px_rgba(21,48,45,0.03)] h-full flex flex-col${isLastOdd ? ' max-w-xl mx-auto w-full' : ''}`}>
                    <svg className="absolute top-6 left-6 w-8 h-8 text-[#0e7a6e]/12" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="w-4 h-4 text-[#cf9a3a]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="studio-display text-lg text-[#0b5f56] mb-3 leading-snug">{t.headline}</p>
                    <p className="text-[#46544f] leading-relaxed flex-1 mb-5">&ldquo;{t.text}&rdquo;</p>
                    <div className="border-t border-[#e6eef0] pt-4">
                      <p className="font-bold text-sm text-[#15302d]">{t.name}</p>
                      {t.role.trim() !== '' ? <p className="text-[#7c8884] text-xs mt-0.5">{t.role}</p> : null}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ DELIVERABLES ═══════════ */}
      <section className="py-20 md:py-28 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <Eyebrow>מה מקבלים בסוף</Eyebrow>
            <h2 className="studio-display text-3xl md:text-5xl text-center mb-12 leading-tight">
              ארבעה פריטים. לא סיכום. לא עצות.
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {DELIVERABLES.map((item, i) => (
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
              <PrimaryCta onClick={() => goToQuiz('deliverables_cta')}>{CTA_LABEL}</PrimaryCta>
              <p className="text-[#7c8884] text-sm mt-4">
                בסוף הבדיקה נבקש שם ומספר וואטסאפ כדי לשמור ולשלוח לך את התוצאה.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <FAQAccordion faq={SHARED_FAQ.slice(0, 5)} intro={HOME_FAQ_INTRO} sectionId="faq" variant="home" />

      <ContactSection variant="home" />

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-[#dce7ea] bg-[#eef4f6] py-10 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5 text-sm text-[#46544f]">
              <div className="flex flex-col gap-0.5 mb-1">
                <span className="studio-display text-base text-[#15302d]">הדר תורג׳מן</span>
                <span className="text-[10px] text-[#0e7a6e] tracking-wide">
                  אוטומציות לעסקים קטנים
                </span>
              </div>
              <span>
                מייל:{' '}
                <a href="mailto:cs@hadarturgemanautomations.com" className="hover:text-[#0e7a6e] transition-colors">
                  cs@hadarturgemanautomations.com
                </a>
              </span>
              <span>
                טלפון/וואטסאפ:{' '}
                <a href="https://wa.me/972504343547" className="hover:text-[#0e7a6e] transition-colors">
                  050-434-3547
                </a>
              </span>
              <span>
                אתר:{' '}
                <a href="https://hadarturgemanautomations.com" className="hover:text-[#0e7a6e] transition-colors">
                  hadarturgemanautomations.com
                </a>
              </span>
            </div>
            <nav className="flex items-center gap-5 text-sm text-[#7c8884] flex-wrap justify-center md:justify-end" aria-label="ניווט תחתון">
              <Link href="/contact" className="hover:text-[#15302d] transition-colors">יצירת קשר</Link>
              <Link href="/privacy" className="hover:text-[#15302d] transition-colors">מדיניות פרטיות</Link>
              <Link href="/terms" className="hover:text-[#15302d] transition-colors">תנאי שימוש</Link>
              <a href="/admin/login" className="hover:text-[#15302d] transition-colors">כניסת מנהל</a>
            </nav>
          </div>
          <p className="text-xs text-[#9aa6a2] text-center md:text-right">
            &copy; {new Date().getFullYear()} הדר אוטומציות, תורג&apos;מן גואטה הדר מזל. כל הזכויות שמורות.
          </p>
        </div>
      </footer>
    </div>
  );
}
