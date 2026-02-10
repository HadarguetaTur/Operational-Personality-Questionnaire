import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Intro from './pages/Intro';
import DiagnosticChat from './pages/DiagnosticChat';
import Results from './pages/Results';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-heebo" dir="rtl">
        <div className="max-w-2xl mx-auto min-h-screen bg-white shadow-2xl flex flex-col relative overflow-hidden">
          {/* Main content */}
          <main className="flex-1 flex flex-col relative z-10">
            <Routes>
              <Route path="/" element={<Intro />} />
              <Route path="/diagnostic" element={<DiagnosticChat />} />
              <Route path="/result" element={<Results />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;