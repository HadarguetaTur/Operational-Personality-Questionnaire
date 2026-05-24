'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ContactSection } from '@/components/landing/ContactSection';
import { FAQAccordion } from '@/components/landing/FAQAccordion';
import { WhyMeSection } from '@/components/landing/WhyMeSection';
import {
  HOME_ABOUT_SECTION,
  HOME_FAQ_INTRO,
  PROFILE_PHOTO_CIRCLE_URL,
  SHARED_FAQ,
} from '@/config/landingCopy';
import { trackEvent, getQuizUrl } from '@/lib/analytics';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
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
    desc: 'כמה פניות נכנסות, מה קורה כשמתעניינת לא סוגרת מיד, וכמה שווי נמצא בסיכון כשאין תהליך המשך מסודר.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'זמן ניהולי ידני',
    desc: 'כמה שעות בשבוע הולכות על הודעות, תיאומים, תזכורות ופולואפים.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'גבייה ותזכורות תשלום',
    desc: 'כמה זמן יוצא על חשבוניות, תזכורות ומעקב אחרי תשלומים.',
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
    desc: 'מסך נקי, שאלה אחת בכל פעם. שאלות כמותיות — פניות, זמן, שווי שעה — שמאפשרות חישוב אמיתי.',
  },
  {
    num: '02',
    title: 'הערכה ראשונית עם פירוט',
    desc: 'מיד אחרי — עלות שנתית מוערכת, מחולקת לשלושה רכיבים, עם ההנחה שמאחורי כל מספר.',
  },
  {
    num: '03',
    title: 'צעד ראשון מוגדר + שיחה',
    desc: 'אם תרצי, נדבר על מה לסדר ראשון — ספציפי לסיטואציה שלך, בלי לחץ ובלי מחויבות.',
  },
];

const DELIVERABLES = [
  'הערכת עלות שנתית לפי תחומים, עם ההנחה שמאחורי כל מספר.',
  'פוטנציאל התייעלות ראשוני לפי התחום שהכי עמוס.',
  'תחום אחד שכדאי לסדר ראשון, עם הסבר למה.',
  'צעד ספציפי ומוגדר — לא עצות כלליות.',
];

const TESTIMONIALS = [
  {
    headline: 'הפכה טיפול בלידים לתהליך מסודר שחוסך זמן',
    text: 'פניתי להדר כי לא היו לי מספיק לידים, והטיפול בכל לקוח לקח המון זמן. ביחד בנינו תהליך עבודה חדש. הדר האירה דברים שלא שמתי אליהם לב, ובנתה לי אוטומציות שהקלו עליי את תהליך העבודה.',
    name: 'לאה סוליטר',
    role: 'אדריכלות ועיצוב פנים',
  },
  {
    headline: 'חיברה קמפיין פייסבוק, דיוור ווואטסאפ לתהליך אחד שעובד',
    text: 'הדר סייעה לי ליצור סנכרון ואוטומציה בין מערכת הדיוור לקמפיין בפייסבוק, ובמקביל בנתה תהליך שמחבר גם סדרת מסרים בווטסאפ. לאורך הדרך היו לא מעט אתגרים, אך הדר התמודדה עם כולם בסבלנות, בהתמדה וביצירתיות. פעלה ביושר ובהגינות מלאה. ממליצה מכל הלב.',
    name: 'נעמי',
    role: 'מכון וולפסון',
  },
  {
    headline: 'קיצרה זמני טיפול בתביעות ויצרה שיתוף פעולה בין משרדים',
    text: 'הדר עבדה איתנו על פיתוח נהלי עבודה במסגרת עבודה משותפת לביטוח לאומי, האפוטרופוס הכללי ומשרד הרווחה. בזמן קצר שכללה את הנהלים, קיצרה את זמן הטיפול בתביעות, ויצרה שיתופי פעולה בין משרדים. בשקט ובחריצות הובילה שדרוג משמעותי בשירות ובמיצוי הזכויות. אני ממליצה עליה ביחסי העבודה ובכישוריה המקצועיים.',
    name: 'רחל איגר לוין',
    role: 'משרד הרווחה · עובדת סוציאלית מומחית בכירה · מפקחת אומנה ארצית',
  },
  {
    headline: 'בנתה אוטומציה לקמפיין ובדקה עד שהכל עבד בדיוק',
    text: 'הדר עשתה באופן מאוד מקצועי את האוטומציה לקמפיין שלנו. הרגשנו שאכפת לה, שהיא רוצה שהכל יעבוד כמו שצריך. היא לא חסכה, בדקה הלוך חזור, עד שהכל היה בדיוק כמו שצריך. ממליצה בחום.',
    name: 'איילה עיצובים',
    role: '',
  },
  {
    headline: 'הפכה את עולמנו לאוטומטי ופחות סיזיפי',
    text: 'הדר אהובה, חייבים לך תודה ענקית על מסירות אין קץ, על עבודה עם חיוך וצחוקים תוך כדי תודה שהפכת את עולמנו לאוטומטי ופחות סיזיפי, מעריכים בטירוף! נהננו לעבוד איתך ולהטמיע אוטומציות עסקיות חכמות בתחום כל כך רגיש! מודים ואוהבים! מסד גרופ',
    name: 'מסד גרופ',
    role: 'לידור בושרי · סמנכ"ל תפעול',
  },
];

const WHATSAPP_URL = 'https://wa.me/972504343547';

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
            <span className="text-[11px] font-bold tracking-[0.14em] text-white/80 group-hover:text-white transition-colors uppercase">
              HADAR TURGEMAN
            </span>
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
            className="min-h-[38px] px-5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-sm font-medium transition-all duration-200 hover:bg-teal-500/25 hover:border-teal-400/50 active:scale-[0.97]"
          >
            בואי נראה את המספרים
          </button>
        </div>
      </header>
      <div className="h-16" aria-hidden />

      {/*
        סקריפט סרטון — מחשבון "איפה הכסף?"
        בעיה: הלקוחות כותבים, את עונה. צריך לתאם, להזכיר, לגבות, לשלוח הצעות ולחזור למתעניינות. הכול קורה, אבל יותר מדי ממנו עדיין עובר דרכך.
        העמקת הבעיה: יש לזה מחיר. פשוט לא תמיד רואים אותו עד סוף החודש.
        פתרון: המחשבון "איפה הכסף?" בודק כמה זמן וכסף הולכים על הניהול הידני, ואיפה הכי נכון להתחיל לעשות סדר.
        הוכחה חברתית: בעלות עסק שעשו את המחשבון קיבלו עלות שנתית מוערכת, פירוט לפי שלושה תחומים, והמלצה ספציפית לצעד ראשון.
      */}

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
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-teal-300 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              איפה הכסף?
            </div>
          </FadeIn>

          <FadeIn delay={120}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] tracking-tight mb-6 max-w-[36ch] mx-auto">
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-teal-300 via-teal-400 to-emerald-400">
                את עובדת. העסק זז. אז איפה הכסף?
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={240}>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-4">
              הלקוחות כותבים, את עונה.<br />
              צריך לתאם, להזכיר, לגבות, לשלוח הצעות ולחזור למתעניינות.<br />
              הכול קורה, אבל יותר מדי ממנו עדיין עובר דרכך.
            </p>
            <p className="text-base text-white/50 max-w-xl mx-auto leading-relaxed mb-8">
              יש לזה מחיר. פשוט לא תמיד רואים אותו עד סוף החודש.
            </p>
          </FadeIn>

          <FadeIn delay={320}>
            <AnimatedCounter />
          </FadeIn>

          <FadeIn delay={340}>
            <p className="text-base md:text-lg text-white/65 max-w-xl mx-auto leading-relaxed text-center mb-2">
              המחשבון &ldquo;איפה הכסף?&rdquo; בודק כמה זמן וכסף הולכים על הניהול הידני הזה, ואיפה הכי נכון להתחיל לעשות סדר.
            </p>
          </FadeIn>

          <FadeIn delay={360}>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => goToQuiz('hero_primary')}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[60px] px-12 rounded-2xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white text-lg font-bold tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] transition-all duration-300 hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1220] overflow-hidden"
              >
                <span aria-hidden className="absolute inset-y-0 -right-1/3 w-1/3 bg-gradient-to-l from-transparent via-white/30 to-transparent skew-x-[-18deg] translate-x-0 group-hover:translate-x-[420%] transition-transform duration-[1100ms] ease-out" />
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-gradient-to-l from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl -z-10" />
                <span className="relative z-10">בואי נראה את המספרים שלך</span>
                <svg
                  className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>

              <p className="text-sm text-white/35">10 שאלות קצרות. הערכה ראשונית ושמרנית. לא צריך נתונים מדויקים.</p>

              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm text-white/40 hover:text-teal-300/80 transition-colors underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50 focus-visible:ring-offset-[#0c1220]"
              >
                מה המחשבון בודק?
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={480}>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-white/55">
                <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <circle cx="12" cy="13" r="8" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2.5 1.5M9 2h6M12 5V2" />
                </svg>
                10 שאלות
              </span>
              <span aria-hidden className="w-1 h-1 rounded-full bg-white/15" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-white/55">
                <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                הערכה ראשונית
              </span>
              <span aria-hidden className="w-1 h-1 rounded-full bg-white/15" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-white/55">
                <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                חינם לחלוטין
              </span>
            </div>
          </FadeIn>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF BAR ═══════════ */}
      <div className="relative px-5 md:px-8 mt-4 md:-mt-6 z-20" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-teal-300/[0.16] bg-[#0f1729]/85 px-5 py-5 md:px-8 md:py-6 shadow-[0_24px_80px_-42px_rgba(20,184,166,0.75)] backdrop-blur-xl">
            <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-teal-300 via-emerald-400 to-transparent" aria-hidden />
            <div className="absolute -top-16 left-10 h-28 w-28 rounded-full bg-teal-400/10 blur-3xl" aria-hidden />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 text-center md:text-right">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-teal-200/70 mb-2">
                  ניסיון מהשטח, לא תיאוריה
                </p>
                <p className="text-sm md:text-base font-semibold text-white/82 leading-relaxed">
                  בניתי תהליכים, נהלי עבודה ואוטומציות לעסקים ולארגונים — מהמיפוי הראשוני ועד מערכת שעובדת בפועל.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 gap-y-2 text-[12px] md:text-[13px] text-white/48 shrink-0">
                <span>מכון וולפסון</span>
                <span className="h-1 w-1 rounded-full bg-teal-300/45" aria-hidden />
                <span>משרד הרווחה</span>
                <span className="h-1 w-1 rounded-full bg-teal-300/45" aria-hidden />
                <span>עצמאיות בעיצוב ושיווק</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ IDENTIFICATION ═══════════ */}
      <section className="py-20 md:py-28 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-10">זה מדבר אלייך אם...</p>
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
                בואי נראה את המספרים שלך
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <p className="text-white/35 text-sm mt-3">מחשבון, לא טופס. פחות מ-4 דקות. לא צריך להשאיר פרטים לפני שמתחילים.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ COST ═══════════ */}
      <section className="py-20 md:py-24 px-5 md:px-8 bg-[#111827]">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider mb-4">מה המחיר של ניהול ידני?</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight">
              כל תהליך ידני עולה זמן. זמן עולה כסף.
            </h2>
            <div className="space-y-4 text-white/60 text-base md:text-lg leading-relaxed">
              <p>הפולואפ שלא נשלח בזמן, הגבייה שנדחת, התיאומים שחוזרים אלייך.</p>
              <p>כל אחד מהם נראה קטן. ביחד הם מצטברים לשעות בשבוע.</p>
              <p className="text-white/80 font-medium">הבעיה היא לא שמשהו לא עובד. הבעיה היא שלא רואים כמה הניהול הידני הזה עולה עד שמחשבים אותו.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-24 md:py-32 px-5 md:px-8 bg-[#0c1220]">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">המחשבון &ldquo;איפה הכסף?&rdquo;</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              לא עצות כלליות. מספרים לפי הסיטואציה שלך.
            </h2>
            <p className="text-white/50 text-center text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-16">
              10 שאלות קצרות. הערכה ראשונית ושמרנית שמראה איפה הכסף הולך ואיפה כדאי להתחיל.
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
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">מה המחשבון בודק</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-5">
              10 שאלות קצרות. 4 תחומים. הערכה ראשונית אחת.
            </h2>
            <p className="text-white/55 text-center text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-16">
              לא שאלון שיווקי. כלי שמחשב עלות ניהול ידני לפי התשובות שלך, ומחזיר הערכה לפי תחומים.
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
                בואי נבדוק איפה זה קורה אצלך
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ DELIVERABLES ═══════════ */}
      <section className="py-20 md:py-24 px-5 md:px-8 bg-[#111827]">
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
                בואי נבדוק איפה הכסף
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ TRANSPARENCY ═══════════ */}
      <section className="py-12 md:py-16 px-5 md:px-8 bg-[#0c1220]">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider mb-4">איך מחושבת ההערכה?</p>
            <p className="text-white/55 text-base md:text-lg leading-relaxed">
              המחשבון מבוסס על התשובות שלך ועל הנחות שמרניות. זו הערכה ראשונית, לא דוח חשבונאי. המספרים מראים סדר גודל — לא הבטחה.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="py-24 md:py-32 px-5 md:px-8 bg-gradient-to-b from-[#111827] to-[#0f1729]">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider text-center mb-3">עדויות</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              כשמסדרים תהליך, הכסף חוזר להיות נראה
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
                    <p className="font-semibold text-sm">{t.name}</p>
                    {t.role.trim() !== '' ? <p className="text-white/40 text-xs mt-1">{t.role}</p> : null}
                  </div>
                </div>
              </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <WhyMeSection {...HOME_ABOUT_SECTION} photoSrc={PROFILE_PHOTO_CIRCLE_URL} sectionId="about" variant="home" />
      <FAQAccordion faq={SHARED_FAQ} intro={HOME_FAQ_INTRO} sectionId="faq" variant="home" />

      <ContactSection variant="home" />

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative py-28 md:py-36 px-5 md:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <FadeIn>
            <p className="text-teal-400 text-sm font-medium tracking-wider mb-4">לפני שבונים מערכת, כדאי לראות מה הניהול הידני עולה</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
              את עובדת. העסק זז.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-teal-300 to-emerald-400">
                אז איפה הכסף?
              </span>
            </h2>
            <p className="text-base text-white/55 mb-10 max-w-lg mx-auto leading-relaxed">
              אם יותר מדי דברים עדיין עוברים דרכך, יש לזה מחיר שלא תמיד רואים עד סוף החודש.<br />
              המחשבון יעזור לך לראות את המספרים ולקבל נקודת התחלה ברורה.
            </p>
            <button
              onClick={() => goToQuiz('footer_cta')}
              className="group relative min-h-[60px] px-12 rounded-xl bg-gradient-to-l from-teal-500 to-emerald-500 text-white text-lg font-bold transition-all duration-300 hover:shadow-[0_0_60px_-12px_rgba(20,184,166,0.6)] hover:scale-[1.03] active:scale-[0.98]"
            >
              בואי נראה את המספרים שלך
            </button>
            <p className="text-sm text-white/30 mt-5">הערכה ראשונית ושמרנית. לא דוח חשבונאי. לא הבטחה לחיסכון.</p>
            <div className="mt-8 pt-8 border-t border-white/[0.06]">
              <p className="text-white/30 text-sm mb-3">יש שאלה לפני שמתחילים?</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-300/70 hover:text-emerald-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                שליחת הודעה בוואטסאפ
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/[0.06] py-10 px-5 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5 text-sm text-white/45">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">
                  HADAR TURGEMAN
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
