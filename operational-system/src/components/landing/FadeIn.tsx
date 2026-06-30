'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Intersection-observer scroll reveal used across the landing + quiz pages. */
export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** Fade-up reveal on scroll. Matches the home page motion. */
export function FadeIn({ children, className = '', delay = 0 }: FadeInProps) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default FadeIn;
