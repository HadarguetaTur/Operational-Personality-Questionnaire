'use client';

import type { ReactNode } from 'react';
import { QuizErrorBoundary } from '@/components/quiz/QuizErrorBoundary';

export function QuizShell({ children }: { children: ReactNode }) {
  return (
    <QuizErrorBoundary>
      <div
        className="studio-landing qa-theme-2026 relative min-h-screen overflow-hidden bg-[var(--qa-bg)] text-[var(--qa-text-primary)] font-heebo"
        dir="rtl"
      >
        {/* Atmosphere — matches the home page (animated aurora + dot grid) */}
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="studio-aurora opacity-50">
            <span className="orb orb-1" />
            <span className="orb orb-2" />
            <span className="orb orb-3" />
          </div>
          <div className="qa-dotgrid absolute inset-0 opacity-60" />
        </div>

        <a
          href="#main"
          className="absolute -top-16 right-4 z-[100] px-4 py-2 bg-[var(--qa-accent)] text-white rounded-lg transition-all duration-150 focus:top-4 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--qa-bg)]"
        >
          דלג לתוכן ראשי
        </a>
        <main
          id="main"
          className="relative z-10 text-[var(--qa-text-primary)] w-full max-w-[780px] mx-auto min-h-screen flex flex-col"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {children}
        </main>
      </div>
    </QuizErrorBoundary>
  );
}
