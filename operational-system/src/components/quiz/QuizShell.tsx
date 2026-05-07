'use client';

import type { ReactNode } from 'react';
import { QuizErrorBoundary } from '@/components/quiz/QuizErrorBoundary';

export function QuizShell({ children }: { children: ReactNode }) {
  return (
    <QuizErrorBoundary>
      <div
        className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] font-heebo"
        dir="rtl"
      >
        <a
          href="#main"
          className="absolute -top-16 right-4 z-[100] px-4 py-2 bg-[var(--qa-accent)] text-white rounded-lg transition-all duration-150 focus:top-4 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--qa-bg)]"
        >
          דלג לתוכן ראשי
        </a>
        <main
          id="main"
          className="qa-theme-2026 bg-[var(--qa-bg)] text-[var(--qa-text-primary)] w-full max-w-[780px] mx-auto min-h-screen flex flex-col relative"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {children}
        </main>
      </div>
    </QuizErrorBoundary>
  );
}
