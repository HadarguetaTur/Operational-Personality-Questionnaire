'use client';

import { useEffect, useRef } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from 'framer-motion';

type Tone = 'cost' | 'gain';

interface Stat {
  target: number;
  suffix: string;
  label: string;
  sublabel: string;
  duration: number;
  tone: Tone;
}

const STATS: Stat[] = [
  {
    target: 6,
    suffix: ' שעות',
    label: 'ניהול ידני בשבוע',
    sublabel: 'ממוצע אצל עצמאיות עם לקוחות פעילים',
    duration: 1400,
    tone: 'cost',
  },
  {
    target: 312,
    suffix: ' שעות',
    label: 'לשנה על פולואפ, תיאומים וגבייה',
    sublabel: 'בלי לסגור עסקה אחת נוספת',
    duration: 1900,
    tone: 'cost',
  },
  {
    target: 40,
    suffix: '%',
    label: 'מהזמן הידני ניתן לאוטומציה',
    sublabel: 'בתהליכים שכבר קיימים בעסק',
    duration: 2300,
    tone: 'gain',
  },
];

// Gradients tuned for legibility on the warm paper background.
const GRADIENT: Record<Tone, string> = {
  cost: 'from-amber-500 via-orange-500 to-rose-500',
  gain: 'from-[#13a594] via-[#0e7a6e] to-[#0b5f56]',
};

// ─── The counting number (driven by a motion value, not React state) ──────────

function StatNumber({
  stat,
  index,
  active,
  reduce,
}: {
  stat: Stat;
  index: number;
  active: boolean;
  reduce: boolean;
}) {
  const value = useMotionValue(reduce ? stat.target : 0);
  const text = useTransform(value, (v) => Math.round(v).toLocaleString('he-IL'));
  const scale = useMotionValue(1);

  useEffect(() => {
    if (!active || reduce) return;
    const controls = animate(value, stat.target, {
      duration: stat.duration / 1000,
      delay: 0.2 + index * 0.18,
      ease: [0.16, 1, 0.3, 1],
      // satisfying little "landing" pop once the number settles
      onComplete: () => animate(scale, [1, 1.07, 1], { duration: 0.45, ease: 'easeOut' }),
    });
    return () => controls.stop();
  }, [active, reduce, index, stat.target, stat.duration, value, scale]);

  const grad = GRADIENT[stat.tone];

  return (
    <motion.div
      style={{ scale }}
      className="inline-flex items-baseline gap-0.5 origin-center will-change-transform"
    >
      <motion.span
        className={`text-5xl md:text-[3.25rem] font-extrabold leading-none tabular-nums text-transparent bg-clip-text bg-gradient-to-l ${grad}`}
      >
        {text}
      </motion.span>
      <span
        className={`text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l ${grad}`}
      >
        {stat.suffix}
      </span>
    </motion.div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function StatCard({
  stat,
  index,
  active,
  reduce,
}: {
  stat: Stat;
  index: number;
  active: boolean;
  reduce: boolean;
}) {
  const isGain = stat.tone === 'gain';
  const grad = GRADIENT[stat.tone];

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 130, damping: 20 },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border p-5 text-center transition-shadow duration-300 sm:p-6 ${
        isGain
          ? 'border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.05] shadow-[0_22px_50px_-26px_rgba(14,122,110,0.45)] hover:shadow-[0_28px_60px_-26px_rgba(14,122,110,0.55)]'
          : 'border-[#dce7ea] bg-white shadow-[0_20px_48px_-28px_rgba(21,48,45,0.28)] hover:shadow-[0_26px_56px_-28px_rgba(21,48,45,0.34)]'
      }`}
    >
      {/* top accent bar — draws in from the right (RTL) */}
      <motion.span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[3px] origin-right bg-gradient-to-l ${grad}`}
        initial={{ scaleX: 0 }}
        animate={active ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.1 + index * 0.18, ease: 'easeOut' }}
      />

      {/* soft payoff glow behind the "gain" card */}
      {isGain && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 -top-6 h-20 rounded-full bg-[#0e7a6e]/15 blur-2xl"
        />
      )}

      <div className="relative mb-3 mt-1">
        <StatNumber stat={stat} index={index} active={active} reduce={reduce} />
      </div>
      <p className="relative mb-1 text-base font-bold leading-snug text-[#15302d]">{stat.label}</p>
      <p className="relative text-sm leading-relaxed text-[#7c8884]">{stat.sublabel}</p>
    </motion.div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function AnimatedCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion() ?? false;

  return (
    <div ref={ref} dir="rtl" className="mx-auto mt-8 w-full max-w-2xl font-heebo">
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        variants={{ show: { transition: { staggerChildren: 0.15 } } }}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
      >
        {STATS.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} active={inView} reduce={reduce} />
        ))}
      </motion.div>
      <p className="mt-4 text-center text-xs text-[#7c8884]">
        * נתוני רקע ממוצעים. הבדיקה מראה איפה זה קורה אצלך בדיוק.
      </p>
    </div>
  );
}
