'use client';

import type { ReactNode } from 'react';
import { QuizErrorBoundary } from '@/components/quiz/QuizErrorBoundary';

export function QuizShell({ children }: { children: ReactNode }) {
  return (
    <QuizErrorBoundary>
      <div
        className="qa-theme-2026 relative min-h-screen overflow-hidden bg-[var(--qa-bg)] text-[var(--qa-text-primary)] font-heebo"
        dir="rtl"
      >
        {/* Atmosphere — matches the home page (gradient blobs + dot grid) */}
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[900px] h-[520px] max-w-[140vw] bg-gradient-to-b from-teal-500/15 via-teal-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-[-160px] right-[-120px] w-[460px] h-[460px] bg-indigo-600/8 rounded-full blur-3xl" />
          <div className="qa-dotgrid absolute inset-0" />
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
