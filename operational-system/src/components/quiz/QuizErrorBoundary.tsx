'use client';

import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Quiz-specific boundary — home goes to site root (Next landing). */
export class QuizErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[QuizErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen flex items-center justify-center px-6"
          dir="rtl"
        >
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[var(--qa-text-primary)] mb-4">
              משהו השתבש
            </h1>
            <p className="text-[var(--qa-text-secondary)] mb-6 leading-relaxed">
              אירעה שגיאה בלתי צפויה. אפשר לנסות לטעון מחדש או לחזור לדף הבית.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-[var(--qa-accent)] text-white text-[15px] font-medium transition-opacity hover:opacity-90"
              >
                טען מחדש
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.assign('/');
                }}
                className="px-6 py-3 rounded-xl border border-[var(--qa-border)] text-[var(--qa-text-primary)] text-[15px] font-medium transition-colors hover:bg-[var(--qa-accent-soft)]"
              >
                דף הבית
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
