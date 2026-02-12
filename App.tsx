import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Intro from './pages/Intro';
import LeadForm from './pages/LeadForm';
import DiagnosticChat from './pages/DiagnosticChat';
import FinalReport from './pages/FinalReport';
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] font-heebo" dir="rtl">
        <a
          href="#main"
          className="absolute -top-16 right-4 z-[100] px-4 py-2 bg-[var(--qa-accent)] text-white rounded-lg transition-all duration-150 focus:top-4 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--qa-bg)]"
        >
          דלג לתוכן ראשי
        </a>
        <Routes>
          <Route path="/landing/:patternId" element={<LandingPage />} />
          <Route path="/" element={
            <main id="main" className="qa-theme-2026 bg-[var(--qa-bg)] text-[var(--qa-text-primary)] w-full max-w-[780px] mx-auto min-h-screen flex flex-col relative" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <Intro />
            </main>
          } />
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
        </Routes>
      </div>
    </Router>
  );
};

export default App;
