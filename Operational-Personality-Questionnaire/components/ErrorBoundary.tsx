import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

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
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-[var(--qa-accent)] text-white text-[15px] font-medium transition-opacity hover:opacity-90"
              >
                טען מחדש
              </button>
              <button
                onClick={() => {
                  this.handleReset();
                  window.location.hash = '#/';
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
