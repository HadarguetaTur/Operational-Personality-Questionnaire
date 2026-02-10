import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserState, DiagnosticResult, ReportContent, MetricID } from '../types';
import { normalizeScores, getRiskScore } from '../engine/scoring';
import { determineArchetype } from '../engine/archetypes';
import { calculateFlags } from '../engine/flags';
import { generateReportText } from '../engine/report';
import { DiagramBlock } from '../components/DiagramBlock';
import { RadarChart } from '../components/RadarChart';
import { diagnosticConfig } from '../config/diagnosticConfig';

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: "עצמאות ניהולית",
  Cognitive_Load: "פניות קוגניטיבית",
  Process_Standardization: "שיטתיות",
  Knowledge_Asset_Value: "נכסי ידע",
  Strategic_Maturity: "בשלות אסטרטגית"
};

const TIME_LIMIT = 40; // Seconds until report hides

const Results: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [reportData, setReportData] = useState<ReportContent | null>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('diagnosticResult');
    if (!savedState) {
      navigate('/');
      return;
    }

    const state: UserState = JSON.parse(savedState);
    const normalized = normalizeScores(state);
    const archetype = determineArchetype(normalized);
    const flags = calculateFlags(state, normalized);

    const sortedMetrics = diagnosticConfig.metadata.metrics.sort((a, b) => {
       return getRiskScore(b, normalized[b]) - getRiskScore(a, normalized[a]);
    });
    const topMetric = sortedMetrics[0];

    const content = generateReportText(state, normalized, topMetric);

    setResult({
      archetype,
      flags,
      normalizedScores: normalized,
      topMetric,
      userInfo: state.userInfo
    });
    setReportData(content);
  }, [navigate]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!result) return; // Start only after load

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          // Scroll to top to ensure popup is seen nicely
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [result]);

  if (!result || !reportData) return <div className="p-8 text-center flex items-center justify-center min-h-screen text-slate-500">מנתח נתונים...</div>;

  // Fix for mixed Hebrew/English text (Parentheses jumping)
  const bidiStyle: React.CSSProperties = { unicodeBidi: 'isolate', direction: 'rtl' };

  // Show timer only in last 10 seconds
  const showTimer = timeLeft <= 10 && !isExpired;

  return (
    <div className="bg-slate-50 min-h-full font-sans text-slate-900 w-full overflow-x-hidden relative" dir="rtl">
      
      {/* --- Timer Bar (Last 10 Seconds Only) --- */}
      {showTimer && (
        <div className="fixed top-0 left-0 w-full z-50 animate-slide-down">
          <div className="bg-red-500 h-1.5 w-full">
             <div 
               className="h-full bg-red-700 transition-all duration-1000 ease-linear"
               style={{ width: `${(timeLeft / 10) * 100}%` }}
             ></div>
          </div>
          <div className="bg-slate-900/95 backdrop-blur text-white py-2 px-4 shadow-lg flex justify-between items-center">
             <span className="text-xs font-medium opacity-80">עותק קבוע נשלח למייל שלך</span>
             <div className="font-bold text-sm">
                הדוח יינעל בעוד <span className="text-red-400 text-lg w-6 inline-block text-center">{timeLeft}</span> שניות
             </div>
          </div>
        </div>
      )}

      {/* --- Main Content with Blur Effect --- */}
      <div className={`transition-all duration-700 ease-in-out ${isExpired ? 'opacity-0 h-screen overflow-hidden filter blur-sm' : ''} pt-8`}>
        {/* Main Container - Vertical Column Layout */}
        <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-10 print:max-w-none print:p-0">
          
          {/* --- Header Section --- */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="flex gap-4 items-center">
                {/* Profile Image in Header */}
                <div className="w-16 h-16 rounded-full bg-purple-100 p-0.5 shadow-sm hidden md:block">
                    <img src="/avatar.png" alt="Profile" className="w-full h-full rounded-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=User&background=9333ea&color=fff'} />
                </div>
                <div>
                  <div className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-1" style={bidiStyle}>Architecture of Scale™ Diagnostic</div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">דוח אבחון ניהולי</h1>
                  <p className="text-slate-500 mt-2 text-lg">עבור: <span className="font-medium text-slate-700">{result.userInfo?.name}</span></p>
                </div>
              </div>
              <div className="text-left md:text-right bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
                 <div className="text-xs text-slate-400 uppercase tracking-wide">תאריך</div>
                 <div className="font-mono text-slate-600 font-bold">{new Date().toLocaleDateString('he-IL')}</div>
              </div>
            </div>
          </div>

          {/* --- Executive Summary --- */}
          <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border-r-4 border-purple-600 flex flex-col gap-4 w-full">
             <h2 className="text-xl font-bold text-slate-800" style={bidiStyle}>
               תקציר מנהלים
             </h2>
             <p className="text-lg leading-relaxed text-slate-700 text-right">
               {reportData.executiveSummary}
             </p>
          </section>

          {/* --- Core Bottlenecks (White Card) --- */}
          <section className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col gap-6 h-auto min-h-min">
              <h3 className="font-bold text-slate-800 text-xl border-b border-slate-100 pb-4" style={bidiStyle}>צווארי בקבוק</h3>
              <div className="flex flex-col gap-6">
                {reportData.bottlenecks.map((b, idx) => (
                  <article key={idx} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-50 text-red-600 font-bold text-[10px] px-2 py-1 rounded-full border border-red-100 uppercase">TOP {idx + 1}</span>
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{b.title}</h4>
                    </div>
                    <p className="text-base text-slate-600 leading-relaxed">{b.description}</p>
                  </article>
                ))}
              </div>
          </section>

          {/* --- Scalability Profile (Dark/Purple Card) --- */}
          <section className="w-full bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col gap-6 h-auto min-h-max">
              {/* Background Effect */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col gap-2">
                <h3 className="text-purple-300 font-bold uppercase tracking-widest text-sm" style={bidiStyle}>פרופיל סקייל</h3>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white" style={bidiStyle}>{result.archetype.name}</h2>
              </div>
              
              <p className="relative z-10 text-xl text-slate-200 leading-relaxed font-light border-r-4 border-purple-500 pr-6">
                "{result.archetype.oneLiner}"
              </p>
              
              <div className="relative z-10 mt-4 bg-slate-800/80 rounded-xl p-6 border border-slate-700 backdrop-blur-sm w-full overflow-hidden">
                <DiagramBlock title="מבנה נוכחי" ascii={result.archetype.diagram} />
              </div>
          </section>

          {/* --- Visual Scorecard (Radar + List) --- */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col gap-8 break-inside-avoid w-full">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800" style={bidiStyle}>
                  לוח תוצאות בשלות
                </h2>
                <span className="text-sm text-slate-400 bg-slate-50 px-3 py-1 rounded-full">מבוסס על 5 מדדי ליבה</span>
             </div>

             {/* Vertical Stack */}
             <div className="flex flex-col gap-12 items-center justify-center">
               
               {/* Radar Chart Container */}
               <div className="flex-shrink-0 w-full flex justify-center">
                  <div className="w-[300px] h-[300px] bg-slate-50 rounded-full border border-slate-100 p-4">
                    <RadarChart scores={result.normalizedScores} size={260} />
                  </div>
               </div>

               {/* Metric List */}
               <div className="flex-1 w-full grid gap-4">
                  {Object.entries(reportData.scorecard).map(([metric, level]) => {
                      const metricID = metric as MetricID;
                      const isHigh = level === 'High'; // Green
                      const isMed = level === 'Medium'; // Yellow
                      const isLow = level === 'Low'; // Red
                      
                      return (
                        <div key={metric} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-colors gap-3">
                          <div className="font-medium text-slate-700 text-lg" style={bidiStyle}>{METRIC_LABELS[metricID]}</div>
                          <div className="flex gap-2 shrink-0">
                            {/* Maturity Indicators */}
                            <div className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isLow ? 'bg-red-100 text-red-700 ring-1 ring-red-200 shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>Low</div>
                            <div className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isMed ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200 shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>Medium</div>
                            <div className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isHigh ? 'bg-green-100 text-green-700 ring-1 ring-green-200 shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>High</div>
                          </div>
                        </div>
                      );
                  })}
               </div>
             </div>
          </section>

          {/* --- Strategic Roadmap --- */}
          <section className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-3xl p-8 border border-purple-100 flex flex-col gap-6 break-inside-avoid w-full">
             <h2 className="text-xl font-bold text-purple-900" style={bidiStyle}>
               מפת דרכים אסטרטגית
             </h2>
             <div className="flex flex-col gap-4">
               {reportData.roadmap.map((step, idx) => (
                 <div key={idx} className="flex gap-5 bg-white p-6 rounded-2xl shadow-sm border border-purple-100 items-start hover:shadow-md transition-shadow">
                    <div className="bg-purple-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-purple-200 text-sm">
                      {idx + 1}
                    </div>
                    <div className="text-slate-800 font-medium leading-relaxed text-lg">
                      {step}
                    </div>
                 </div>
               ))}
             </div>
          </section>

          {/* --- Action Buttons --- */}
          <div className="flex flex-col sm:flex-row gap-4 no-print pt-4 pb-12 w-full">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            >
              <span>הדפסת דוח</span>
            </button>
            <button 
               onClick={() => {
                 localStorage.removeItem('diagnosticResult');
                 navigate('/');
               }}
               className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-500/20 flex items-center justify-center gap-2"
            >
              <span>התחל אבחון מחדש</span>
            </button>
          </div>

          <footer className="text-center text-slate-400 text-xs py-4 border-t border-slate-100 w-full">
             Architecture of Scale Diagnostic © 2026 | Developed by Senior Business Analyst AI
          </footer>

        </div>
      </div>

      {/* --- Conversion Popup Overlay --- */}
      {isExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
           {/* Dark Backdrop with Blur */}
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
           
           {/* Popup Card */}
           <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 border border-slate-100 text-right">
              {/* Close/Status Icon */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30 border-4 border-slate-50">
                📩
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <h2 className="text-2xl font-extrabold text-slate-900 text-center leading-tight">
                  אל דאגה, תוצאות האבחון כבר בדרך למייל שלך!
                </h2>
                
                <p className="text-slate-600 leading-relaxed text-lg">
                  אבל בינינו? זהו רק קצה הקרחון. אבחון אוטומטי לעולם לא יוכל להחליף הבנה עמוקה של הדינמיקה הייחודית בעסק.
                </p>
                <p className="text-slate-600 leading-relaxed">
                   אני מזמינה אותך לעבור מהערכות כלליות לבניית ארכיטקטורה של ממש, בתהליך אבחון אסטרטגי מעמיק – כזה שמוציא את האמת לשולחן ומספק תשובות חד משמעיות.
                </p>

                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                  <h3 className="font-bold text-purple-900 mb-2">מה זה כולל?</h3>
                  <ul className="space-y-2 text-slate-700 text-sm">
                    <li className="flex items-start gap-2">
                       <span className="text-purple-500 font-bold">•</span>
                       שאלון עומק תפעולי שמנתח כל פינה בעסק.
                    </li>
                    <li className="flex items-start gap-2">
                       <span className="text-purple-500 font-bold">•</span>
                       שיחת ייעוץ אסטרטגית (60 דקות) ממוקדת תוצאות.
                    </li>
                    <li className="flex items-start gap-2">
                       <span className="text-purple-500 font-bold">•</span>
                       מפה אסטרטגית אישית: המלצות לכלי עבודה, תזמון הטמעה ומדדי הצלחה ברורים.
                    </li>
                  </ul>
                </div>

                <div className="text-center py-2 bg-yellow-50 rounded-xl border border-yellow-100 border-dashed">
                   <div className="font-bold text-slate-800 text-sm mb-1">הטבה מיוחדת לזמן מוגבל:</div>
                   <div className="text-lg text-slate-700">
                      השקעה של <span className="font-extrabold text-purple-600 text-2xl">450 ₪ בלבד</span>
                      <span className="text-sm text-slate-400 line-through mr-2">(במקום 900 ₪)</span>
                   </div>
                   <div className="text-xs text-slate-500 mt-1">למי שבוחרים להתקדם עכשיו.</div>
                </div>

                <a 
                  href="#" // Placeholder link
                  onClick={(e) => e.preventDefault()} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 group mt-2"
                >
                  <span>אני רוצה את המפה האסטרטגית שלי</span>
                  <span className="group-hover:-translate-x-1 transition-transform">←</span>
                </a>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Results;