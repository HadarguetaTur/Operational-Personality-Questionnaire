'use client';

import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────────────
   Live leak meter — "every minute that passes, money is quietly draining."
   Interactive: she sets how many hours a week go to manual work, and the yearly
   cost (hours + ₪) recalculates and re-counts live. A real clock, running since
   the page opened, carries the felt sense that the meter never stops.
   Palette: purple system for time/structure, GOLD accent for money.
   All figures are her-driven estimates, clearly labelled — not fixed claims.
   ──────────────────────────────────────────────────────────────────────────── */

const HOURS_MIN = 2;
const HOURS_MAX = 15;
const HOURS_DEFAULT = 6;

const RATE_PRESETS = [120, 150, 200, 250, 300, 350];
const RATE_DEFAULT = 150;

const AUTOMATABLE = 0.4; // ~40% of manual work is recoverable through automation

// ─── An eased number that re-counts whenever its target changes ────────────────

function AnimatedNumber({
  target,
  reduce,
  active,
  format,
  className,
}: {
  target: number;
  reduce: boolean;
  active: boolean;
  format: (v: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const [txt, setTxt] = useState(() => format(reduce ? target : 0));

  useEffect(() => {
    const unsub = mv.on('change', (v) => setTxt(format(v)));
    return unsub;
  }, [mv, format]);

  useEffect(() => {
    if (reduce) {
      mv.set(target);
      return;
    }
    if (!active) {
      // Hold at zero until in view, so the reveal actually counts up.
      mv.set(0);
      return;
    }
    const controls = animate(mv, target, { duration: 0.85, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [target, active, reduce, mv]);

  return <span className={className}>{txt}</span>;
}

// ─── Precision meter — hairline gauge whose fill tracks a value ────────────────

function Meter({ pct, tone }: { pct: number; tone: 'gold' | 'purple' }) {
  return (
    <div className="relative mt-3 h-[3px] w-full overflow-hidden rounded-full bg-[#5B3FC4]/10" aria-hidden>
      <motion.div
        className={`absolute inset-y-0 right-0 rounded-full ${
          tone === 'gold'
            ? 'bg-gradient-to-l from-[#B8862B] via-[#D4A93A] to-[#EAC96E]'
            : 'bg-gradient-to-l from-[#4A32A4] via-[#5B3FC4] to-[#8B74EC]'
        }`}
        initial={{ width: '0%' }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

// ─── Interactive slider (custom, RTL, purple track + gold thumb) ──────────────

function HoursSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - HOURS_MIN) / (HOURS_MAX - HOURS_MIN)) * 100;
  return (
    <div className="relative w-full select-none">
      {/* track */}
      <div className="relative h-2.5 w-full rounded-full bg-[#5B3FC4]/12" aria-hidden>
        <div
          className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-[#4A32A4] via-[#5B3FC4] to-[#8B74EC]"
          style={{ width: `${pct}%` }}
        />
        {/* thumb */}
        <div
          className="absolute top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border-[3px] border-white bg-gradient-to-br from-[#EAC96E] to-[#B8862B] shadow-[0_4px_12px_-2px_rgba(184,134,43,0.6),0_0_0_1px_rgba(184,134,43,0.35)]"
          style={{ right: `${pct}%` }}
        />
      </div>
      {/* native input drives interaction + a11y; visually transparent */}
      <input
        type="range"
        min={HOURS_MIN}
        max={HOURS_MAX}
        step={1}
        value={value}
        dir="rtl"
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="שעות ניהול ידני בשבוע"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

// ─── Live elapsed clock since the page opened ─────────────────────────────────

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

// ─── Public component ─────────────────────────────────────────────────────────

export function AnimatedCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion() ?? false;

  const [hours, setHours] = useState(HOURS_DEFAULT);
  const [rate, setRate] = useState(RATE_DEFAULT);

  const annualHours = hours * 52;
  const annualMoney = annualHours * rate;
  const recoverableHours = Math.round(annualHours * AUTOMATABLE);

  const hoursPct = ((hours - HOURS_MIN) / (HOURS_MAX - HOURS_MIN)) * 100;

  return (
    <div ref={ref} dir="rtl" className="mx-auto w-full max-w-xl font-heebo">
      <div className="relative overflow-hidden rounded-3xl border border-[#E6E2F4] bg-white/85 p-6 shadow-[0_30px_70px_-40px_rgba(74,50,164,0.5)] backdrop-blur-sm sm:p-8">
        {/* faint gold wash bleeding from the top, where the money lands */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-28 bg-gradient-to-b from-[#EAC96E]/20 to-transparent blur-2xl"
        />

        <div className="relative">
          {/* live clock */}
          <div className="mb-6 flex justify-center">
            <LiveClock reduce={reduce} />
          </div>

          {/* interactive prompt */}
          <label className="mb-3 block text-center text-sm font-semibold text-[#3D4859]">
            כמה שעות בשבוע הולכות לך על ניהול ידני? פולואפ, תיאומים וגבייה.
          </label>

          <div className="mb-2 flex items-center justify-center gap-2">
            <AnimatedNumber
              target={hours}
              reduce
              active={inView}
              format={(v) => String(Math.round(v))}
              className="text-2xl font-extrabold tabular-nums text-[#4A32A4]"
            />
            <span className="text-sm font-medium text-[#68707C]">שעות בשבוע</span>
          </div>

          <HoursSlider value={hours} onChange={setHours} />

          <div className="mt-2 flex justify-between px-0.5 text-[11px] text-[#9AA0AA]">
            <span>15 ומעלה</span>
            <span>שעתיים</span>
          </div>

          {/* the readout: gold money, purple hours */}
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* money — gold, the emphasis */}
            <div className="relative overflow-hidden rounded-2xl border border-[#D4A93A]/30 bg-gradient-to-b from-[#FBF4E1] to-white p-5 text-center">
              <p className="mb-1.5 text-xs font-bold tracking-[0.06em] text-[#8A6A18]">בקצב הזה, בשנה נוזלים</p>
              <AnimatedNumber
                target={annualMoney}
                reduce={reduce}
                active={inView}
                format={(v) => '₪' + Math.round(v).toLocaleString('he-IL')}
                className="bg-gradient-to-l from-[#D9AE3E] via-[#B8862B] to-[#8A6A18] bg-clip-text text-4xl font-extrabold tabular-nums leading-none text-transparent sm:text-[2.75rem]"
              />
              <Meter pct={hoursPct} tone="gold" />
            </div>

            {/* hours — purple */}
            <div className="relative overflow-hidden rounded-2xl border border-[#E6E2F4] bg-white p-5 text-center">
              <p className="mb-1.5 text-xs font-bold tracking-[0.06em] text-[#4A32A4]">וזה בשעות שלך</p>
              <div className="flex items-baseline justify-center gap-1">
                <AnimatedNumber
                  target={annualHours}
                  reduce={reduce}
                  active={inView}
                  format={(v) => Math.round(v).toLocaleString('he-IL')}
                  className="bg-gradient-to-l from-[#8B74EC] via-[#5B3FC4] to-[#4A32A4] bg-clip-text text-4xl font-extrabold tabular-nums leading-none text-transparent sm:text-[2.75rem]"
                />
                <span className="bg-gradient-to-l from-[#8B74EC] to-[#4A32A4] bg-clip-text text-xl font-extrabold text-transparent">
                  שעות
                </span>
              </div>
              <Meter pct={hoursPct} tone="purple" />
            </div>
          </div>

          {/* hourly value — keeps the money figure honest and adjustable */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#68707C]">שווי שעה שלך:</span>
            {RATE_PRESETS.map((r) => {
              const on = r === rate;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold tabular-nums transition-colors ${
                    on
                      ? 'border-[#B8862B] bg-[#B8862B] text-white shadow-[0_4px_12px_-4px_rgba(184,134,43,0.6)]'
                      : 'border-[#E6E2F4] bg-white text-[#68707C] hover:border-[#D4A93A]/60 hover:text-[#8A6A18]'
                  }`}
                >
                  ₪{r}
                </button>
              );
            })}
          </div>

          {/* the hopeful payoff — recoverable share, in purple */}
          <p className="mt-6 text-center text-sm leading-relaxed text-[#3D4859]">
            הבשורה הטובה, כ
            <span className="font-bold text-[#4A32A4]">40 אחוז</span> מזה,{' '}
            <span className="font-bold text-[#4A32A4] tabular-nums">
              כ{recoverableHours.toLocaleString('he-IL')} שעות בשנה
            </span>
            , אפשר להחזיר לך דרך אוטומציה של תהליכים שכבר קיימים בעסק.
          </p>

          <p className="mt-4 text-center text-xs text-[#9AA0AA]">
            * הערכה לפי הקצב שסימנת, לא חיוב. הבדיקה מראה איפה זה קורה אצלך בדיוק.
          </p>
        </div>
      </div>
    </div>
  );
}
