import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded page components for code splitting
const LeadForm = lazy(() => import('./pages/LeadForm'));
const DiagnosticChat = lazy(() => import('./pages/DiagnosticChat'));
const FinalReport = lazy(() => import('./pages/FinalReport'));

/**
 * The questionnaire app is reached only via the main Next.js landing.
 * If someone hits the Vite root directly, send them back to the marketing
 * home so they don't bypass the landing experience.
 */
const RedirectToMainApp: React.FC<{ path?: string }> = ({ path = '/' }) => {
  useEffect(() => {
    const appBase = (import.meta.env.DEV
      ? 'http://localhost:3000'
      : (import.meta.env.VITE_PUBLIC_APP_URL || '')
    ).replace(/\/$/, '');
    window.location.replace(appBase + path);
  }, [path]);
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-5 h-5 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

const PersonaLandingRedirect: React.FC = () => {
  const { patternId } = useParams<{ patternId: string }>();
  return <RedirectToMainApp path={`/landing/${patternId ?? ''}`} />;
};

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-5 h-5 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <Router>
      <div className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] font-heebo" dir="rtl">
        <a
          href="#main"
          className="absolute -top-16 right-4 z-[100] px-4 py-2 bg-[var(--qa-accent)] text-white rounded-lg transition-all duration-150 focus:top-4 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--qa-bg)]"
        >
          דלג לתוכן ראשי
        </a>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Persona landing lives in the Next.js app — bounce there. */}
            <Route path="/landing/:patternId" element={<PersonaLandingRedirect />} />
            {/* Root visitors are sent back to the marketing home. */}
            <Route path="/" element={<RedirectToMainApp />} />
            <Route path="/lead-form" element={
              <main id="main" className="qa-theme-2026 bg-[var(--qa-bg)] text-[var(--qa-text-primary)] w-full max-w-[780px] mx-auto min-h-screen flex flex-col relative" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <LeadForm />
              </main>
            } />
            <Route path="/diagnostic" element={
              <main id="main" className="qa-theme-2026 qa-touch-manipulation bg-[var(--qa-bg)] text-[var(--qa-text-primary)] w-full max-w-[780px] mx-auto min-h-screen flex flex-col relative" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <DiagnosticChat />
              </main>
            } />
            <Route path="/result/:token" element={
              <div className="qa-theme-2026 bg-[var(--qa-bg)] w-full min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <main id="main" className="max-w-[780px] mx-auto flex-1 flex flex-col relative z-10 px-4 sm:px-6 md:px-8 min-h-0">
                  <FinalReport />
                </main>
              </div>
            } />
            {/* Anything else — back to marketing home */}
            <Route path="*" element={<RedirectToMainApp />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
    </ErrorBoundary>
  );
};

export default App;
