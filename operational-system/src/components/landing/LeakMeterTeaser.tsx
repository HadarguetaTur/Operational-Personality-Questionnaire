'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────────────
   Leak meter TEASER — the hero "calculator" that is NOT a calculator.

   The previous interactive meter let visitors slide hours, pick a rate, read a
   number and leave satisfied without ever starting the quiz (115 visitors,
   1 click). This version shows what the result looks like, locks the actual
   figure, and makes the whole card one tap into the quiz. The real picture is
   delivered only at the end of the 12 questions.

   Palette: purple for time/structure, gold for money (same as before).
   ──────────────────────────────────────────────────────────────────────────── */

function LiveClock({ reduce }: { reduce: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#D4A93A]/40 bg-[#F9F1DC]/60 px-3 py-1">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4A93A] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B8862B]" />
      </span>
      <span className="text-sm font-bold tabular-nums text-[#8A6A18]">
        {mm}:{ss}
      </span>
      <span className="text-xs text-[#68707C]">מאז שנכנסת לדף הזה</span>
    </span>
  );
}

const DOMAINS = [
  { label: 'פניות שלא חזרת אליהן', pct: 72 },
  { label: 'שעות של תפעול ידני', pct: 55 },
  { label: 'תשלומים שמחכים', pct: 38 },
];

interface LeakMeterTeaserProps {
  /** Opens the quiz. The whole card is the button. */
  onClick: () => void;
}

export function LeakMeterTeaser({ onClick }: LeakMeterTeaserProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-xl font-heebo">
      <button
        type="button"
        onClick={onClick}
        aria-label="פתיחת הבדיקה: גלי איפה הכסף שלך נוזל"
        className="group relative block w-full overflow-hidden rounded-3xl border border-[#E6E2F4] bg-white/85 p-6 text-right shadow-[0_30px_70px_-40px_rgba(74,50,164,0.5)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#5B3FC4]/40 hover:shadow-[0_36px_80px_-40px_rgba(74,50,164,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FC4]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9FC] active:translate-y-0 sm:p-8"
      >
        {/* faint gold wash from the top, where the money lands */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-28 bg-gradient-to-b from-[#EAC96E]/20 to-transparent blur-2xl"
        />

        <div className="relative">
          <div className="mb-5 flex justify-center">
            <LiveClock reduce={reduce} />
          </div>

          <p className="mb-1 text-center text-sm font-semibold text-[#3D4859]">
            ככה נראית תמונת המצב העסקית שתקבלי בסוף
          </p>
          <p className="mb-6 text-center text-xs text-[#68707C]">
            דוגמה. המספרים שלך נבנים מהתשובות שלך
          </p>

          {/* The locked money figure */}
          <div className="relative overflow-hidden rounded-2xl border border-[#D4A93A]/30 bg-gradient-to-b from-[#FBF4E1] to-white p-5 text-center">
            <p className="mb-1.5 text-xs font-bold tracking-[0.06em] text-[#8A6A18]">
              כמה נוזל אצלך בשנה
            </p>
            <div className="relative inline-block">
              <span
                aria-hidden
                className="select-none text-4xl font-extrabold tabular-nums leading-none text-[#B8862B] opacity-70 blur-[6px] sm:text-[2.75rem]"
              >
                ₪46,800
              </span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B8862B]/40 bg-white/90 px-3 py-1 text-xs font-bold text-[#8A6A18] shadow-sm">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  המספר שלך נפתח בסוף הבדיקה
                </span>
              </span>
            </div>
          </div>

          {/* Three domains, as bars — a preview of what gets ranked */}
          <div className="mt-5 space-y-3">
            {DOMAINS.map((d) => (
              <div key={d.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#3D4859]">{d.label}</span>
                  <span className="font-bold tabular-nums text-[#4A32A4] blur-[3px] select-none" aria-hidden>
                    {d.pct}%
                  </span>
                </div>
                <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#5B3FC4]/10" aria-hidden>
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#4A32A4] via-[#5B3FC4] to-[#8B74EC] opacity-60"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* The one action */}
          <span className="studio-cta-grad studio-cta-shine mt-6 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full px-6 text-base font-bold tracking-tight text-white shadow-[0_16px_40px_-12px_rgba(91,63,196,0.6)]">
            <span className="relative z-10">גלי את המספר שלך · 12 שאלות · 3 דקות</span>
            <svg className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </span>
          <span className="mt-3 block text-center text-xs text-[#9AA0AA]">
            חינם · בלי כרטיס אשראי · התוצאה נשארת אצלך
          </span>
        </div>
      </button>
    </div>
  );
}

export default LeakMeterTeaser;
