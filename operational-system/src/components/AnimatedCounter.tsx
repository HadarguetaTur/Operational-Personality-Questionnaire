// npm i react-intersection-observer
'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface Stat {
  target: number;
  suffix: string;
  label: string;
  sublabel: string;
  duration: number;
}

const STATS: Stat[] = [
  {
    target: 6,
    suffix: ' שעות',
    label: 'ניהול ידני בשבוע',
    sublabel: 'ממוצע אצל עצמאיות עם לקוחות פעילים',
    duration: 1400,
  },
  {
    target: 312,
    suffix: ' שעות',
    label: 'לשנה על פולואפ, תיאומים וגבייה',
    sublabel: 'בלי לסגור עסקה אחת נוספת',
    duration: 1800,
  },
  {
    target: 40,
    suffix: '%',
    label: 'מהזמן הידני ניתן לאוטומציה',
    sublabel: 'בתהליכים שכבר קיימים בעסק',
    duration: 2200,
  },
];

function useCountUp(target: number, duration: number, active: boolean): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration]);

  return count;
}

function StatCard({ stat, active }: { stat: Stat; active: boolean }) {
  const count = useCountUp(stat.target, stat.duration, active);

  return (
    <div className="group flex flex-col items-center text-center p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
      <div className="mb-3">
        <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-teal-300 via-teal-400 to-emerald-400 tabular-nums">
          {count}
        </span>
        <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-teal-300 via-teal-400 to-emerald-400">
          {stat.suffix}
        </span>
      </div>
      <p className="text-white font-medium text-base leading-snug mb-1">{stat.label}</p>
      <p className="text-white/50 text-sm">{stat.sublabel}</p>
    </div>
  );
}

export function AnimatedCounter() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <div
      ref={ref}
      dir="rtl"
      className="mx-auto mb-10 w-full max-w-2xl shadow-[0_24px_80px_-32px_rgba(20,184,166,0.55)]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((stat, i) => (
          <StatCard key={i} stat={stat} active={inView} />
        ))}
      </div>
      <p className="text-white/30 text-xs text-center mt-4">
        * הערכה ראשונית. המחשבון מחשב לפי הסיטואציה שלך בדיוק.
      </p>
    </div>
  );
}
