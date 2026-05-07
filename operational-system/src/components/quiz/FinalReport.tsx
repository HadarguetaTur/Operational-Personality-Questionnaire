'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MetricID } from '@/lib/quiz/types';
import { SCALE_LABELS } from '@/lib/quiz/engine/scale';
import { DiagramBlock } from '@/components/quiz/DiagramBlock';
import { RadarChart } from '@/components/quiz/RadarChart';
import { METHODOLOGY } from '@/lib/quiz/config/diagnosticConfig';
import { METRIC_LABELS, MATURITY_LABELS } from '@/lib/quiz/config/constants';
import { useReport } from '@/lib/quiz/hooks/useReport';

type SectionVariant = 'default' | 'success' | 'gap' | 'risk' | 'direction' | 'avoid';

const sectionStyles: Record<SectionVariant, { border: string; bg: string; titleColor: string }> = {
  default: { border: 'border-r-[var(--report-accent)]', bg: 'bg-[var(--report-card)]', titleColor: 'text-[var(--report-accent)]' },
  success: { border: 'border-r-[var(--report-success)]', bg: 'bg-[var(--report-card)]', titleColor: 'text-[var(--report-success)]' },
  gap: { border: 'border-r-[var(--report-gap)]', bg: 'bg-[var(--report-card)]', titleColor: 'text-[var(--report-gap)]' },
  risk: { border: 'border-r-[var(--report-risk)]', bg: 'bg-[var(--report-card)]', titleColor: 'text-[var(--report-risk)]' },
  direction: { border: 'border-r-[var(--report-direction)]', bg: 'bg-[var(--report-card)]', titleColor: 'text-[var(--report-direction)]' },
  avoid: { border: 'border-r-[var(--report-avoid)]', bg: 'bg-[var(--report-card)]', titleColor: 'text-[var(--report-avoid)]' }
};

const Section: React.FC<{ title: string; children: React.ReactNode; variant?: SectionVariant }> = ({ title, children, variant = 'default' }) => {
  const style = sectionStyles[variant];
  return (
    <section className="mb-4 text-right" dir="rtl">
      <div className={`${style.bg} rounded-2xl px-6 md:px-8 py-7 md:py-8 shadow-sm border border-[var(--qa-border)] border-r-4 ${style.border}`}>
        <h2 className={`text-[18px] md:text-[20px] font-semibold mb-5 ${style.titleColor}`}>
          {title}
        </h2>
        <div className="text-right">{children}</div>
      </div>
    </section>
  );
};


const FinalReport: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ token?: string }>();
  const token = params?.token;
  const searchParams = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const { result, reportData, saveError, fetchStatus, emailWarning, aiDiagnosis, aiStatus, reportPdfUrl, reportPdfStatus } = useReport(token);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Browserless / generate-pdf waits for body[data-report-ready="true"] before
  // capturing the PDF, so it doesn't snapshot a half-rendered page. We mark it
  // ready once the report data is hydrated AND the AI is no longer pending.
  useEffect(() => {
    const ready = !!result && !!reportData && aiStatus !== 'loading';
    if (ready) {
      document.body.setAttribute('data-report-ready', 'true');
    } else {
      document.body.removeAttribute('data-report-ready');
    }
    return () => {
      document.body.removeAttribute('data-report-ready');
    };
  }, [result, reportData, aiStatus]);


  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // Tiny visual feedback via title attribute swap
      const btn = document.getElementById('qa-copy-link-btn');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'הקישור הועתק ✓';
        setTimeout(() => { if (btn) btn.textContent = original; }, 1800);
      }
    } catch {
      // Clipboard unavailable; fallback — select-and-copy via prompt
      window.prompt('העתיקי את הקישור:', window.location.href);
    }
  }, []);

  // Move focus to the report heading once data is ready (a11y)
  useEffect(() => {
    if (result && reportData && headingRef.current) {
      headingRef.current.focus();
    }
  }, [result, reportData]);

  void fetchStatus;

  if (saveError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" dir="rtl">
        <p className="text-[18px] text-[var(--qa-text-primary)] font-medium">{saveError}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-xl bg-[var(--qa-accent)] text-white text-[15px] font-medium"
        >
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  if (!result || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8 md:py-12 qa-fade-in text-right max-w-full overflow-x-hidden" dir="rtl">
      {/* Action bar — hidden in print mode (Browserless) and in browser print */}
      {!printMode && (
        <div className="qa-no-print flex flex-wrap gap-2 justify-end mb-4 text-right" dir="rtl">
          {reportPdfUrl ? (
            <a
              href={reportPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-no-print="true"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--qa-accent)] bg-[var(--qa-accent)] text-white text-[14px] font-medium transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
              aria-label="הורדת קובץ PDF של הדוח"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              הורדת PDF
            </a>
          ) : (reportPdfStatus === 'generating' || reportPdfStatus === 'pending' || reportPdfStatus === null) ? (
            <button
              type="button"
              onClick={handlePrint}
              data-no-print="true"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--qa-accent)] bg-[var(--qa-accent)] text-white text-[14px] font-medium transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
              aria-label="הדפסה או שמירה כ-PDF"
              title="קובץ ה-PDF המלא יישלח אליך במייל תוך כדקה. בינתיים אפשר להדפיס את הדוח ישירות מהדפדפן."
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              הדפסה / שמירה כ-PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              data-no-print="true"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--qa-accent)] bg-[var(--qa-accent)] text-white text-[14px] font-medium transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
              aria-label="הדפסה או שמירה כ-PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              הדפסה / שמירה כ-PDF
            </button>
          )}
          <button
            id="qa-copy-link-btn"
            type="button"
            onClick={handleCopyLink}
            data-no-print="true"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] text-[14px] font-medium transition-all hover:border-[var(--qa-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
            aria-label="העתקת קישור לדוח"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            העתקת קישור
          </button>
        </div>
      )}

      {!printMode && emailWarning && (
        <div className="qa-no-print mb-4 rounded-xl px-5 py-4 border border-[var(--report-gap)] bg-[var(--report-card)] text-right" dir="rtl" role="status">
          <p className="text-[14px] md:text-[15px] leading-[1.7] text-[var(--qa-text-primary)]">
            <strong className="text-[var(--report-gap)]">שימי לב:</strong> הדוח זמין כאן עכשיו, אבל לא הצלחנו לשלוח אותו אוטומטית למייל. שמרי את הקישור הזה (כפתור &quot;העתקת קישור&quot; למעלה) כדי לחזור לדוח, או פני אלינו לתמיכה.
          </p>
        </div>
      )}

      {/* Report header + Executive Summary */}
      <div className="mb-4 text-right">
        <div className="rounded-2xl px-6 md:px-8 py-8 md:py-10 shadow-lg overflow-hidden" style={{ background: 'var(--report-hero)' }}>
          <span className="inline-block text-[12px] font-medium tracking-wide text-white/80 uppercase mb-5">
            דוח אבחון ניהולי
          </span>

          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-[28px] md:text-[36px] font-bold leading-[1.3] mb-5 text-white focus:outline-none"
          >
            דפוס ניהול: {result.pattern.name}
          </h1>

          {reportData.executiveOneLine && (
            <p className="text-[16px] md:text-[17px] font-medium text-white mb-1">
              מצב נוכחי: {reportData.executiveOneLine}
            </p>
          )}
          {reportData.executiveRiskCost && (
            <p className="text-[15px] md:text-[16px] text-white/90 mb-6">
              עלות/סיכון אם לא מטפלים: {reportData.executiveRiskCost}
            </p>
          )}

          {reportData.executiveTopActions && reportData.executiveTopActions.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-[15px] font-semibold text-white/95 mb-3">3 מהלכים דחופים</h3>
              <div className="flex flex-col gap-3">
                {reportData.executiveTopActions.map((item, idx) => (
                  <div key={idx} className="rounded-xl bg-white/10 backdrop-blur px-4 py-3 border border-white/20">
                    <p className="text-[15px] md:text-[16px] font-medium text-white">{item.action}</p>
                    <p className="text-[13px] text-white/80 mt-1">KPI: {item.kpi}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.scaleStage && (
            <p className="text-[13px] text-white/70">
              שלב תפעולי מוערך: {SCALE_LABELS[result.scaleStage]}
            </p>
          )}
        </div>
      </div>

      {/* איך בוצע האבחון */}
      <div className="mb-4 text-right">
        <div className="rounded-xl px-5 md:px-6 py-4 md:py-5 bg-[var(--report-card)] border border-[var(--qa-border)] text-right">
          <h3 className="text-[15px] font-semibold text-[var(--report-accent)] mb-3">איך בוצע האבחון</h3>
          <ul className="space-y-1.5 text-[14px] text-[var(--qa-text-primary)] list-none">
            <li><strong>מדגם:</strong> {METHODOLOGY.sample}</li>
            <li><strong>מקורות:</strong> {METHODOLOGY.questionCount} שאלות, {METHODOLOGY.dimensionsCount} ממדים ניהוליים</li>
            <li><strong>קריטריונים:</strong> {METHODOLOGY.scaleDescription} , רמת בשלות נמוכה/בינונית/גבוהה</li>
            <li className="pt-2 text-[13px] italic text-[var(--qa-text-primary)]">הממצאים מבוססים על השאלות שנענו.</li>
          </ul>
        </div>
      </div>

      {/* החלטה נדרשת */}
      {reportData.decisionRequired && (
        <div className="mb-4 text-right">
          <div className="rounded-xl px-5 md:px-6 py-5 md:py-6 bg-[var(--report-card)] border-r-4 border-[var(--report-direction)] border border-[var(--qa-border)] text-right">
            <h3 className="text-[16px] font-bold text-[var(--report-direction)] mb-4">החלטה נדרשת</h3>
            <p className="text-[16px] font-medium text-[var(--qa-text-primary)] mb-4">{reportData.decisionRequired}</p>
            <div className="grid gap-3 text-[14px] text-[var(--qa-text-primary)]">
              <p><strong>למה עכשיו:</strong> {reportData.executiveRiskCost}</p>
              <p><strong>מה עושים השבוע:</strong> {reportData.executiveTopActions?.[0]?.action ?? '...'}</p>
              <p><strong>מה עושים החודש:</strong> {(() => { const s = reportData.structuralSteps?.[0]; return s ? (typeof s === 'string' ? s : s.what) : '...'; })()}</p>
              <p><strong>איך מודדים:</strong> {reportData.kpis?.[0] ?? reportData.executiveTopActions?.[0]?.kpi ?? '...'}</p>
            </div>
          </div>
        </div>
      )}

      {/* האבחנה האישית — AI generated */}
      {aiStatus === 'loading' && (
        <Section title="האבחנה האישית שלך" variant="direction">
          <div className="flex items-center gap-3 text-[15px] text-[var(--qa-text-secondary)] italic" dir="rtl">
            <div className="w-4 h-4 border-2 border-[var(--report-direction)] border-t-transparent rounded-full animate-spin" aria-hidden />
            <span>מפיקים עבורך אבחנה אישית על בסיס התשובות שלך…</span>
          </div>
        </Section>
      )}
      {aiStatus === 'ready' && aiDiagnosis && (
        <Section title="האבחנה האישית שלך" variant="direction">
          <p className="text-[16px] md:text-[17px] leading-[1.85] text-[var(--qa-text-primary)] text-right whitespace-pre-line" dir="rtl">
            {aiDiagnosis.personal_executive_summary}
          </p>
          {aiDiagnosis.risk_narrative && (
            <p className="mt-4 text-[15px] md:text-[16px] leading-[1.8] text-[var(--qa-text-secondary)] text-right" dir="rtl">
              {aiDiagnosis.risk_narrative}
            </p>
          )}
        </Section>
      )}
      {aiStatus === 'ready' && aiDiagnosis?.hidden_pattern && aiDiagnosis.hidden_pattern.trim().length > 0 && (
        <div className="mb-4 text-right">
          <div className="rounded-xl px-5 md:px-6 py-5 md:py-6 bg-[var(--report-card)] border-r-4 border-[var(--report-gap)] border border-[var(--qa-border)] text-right" dir="rtl">
            <h3 className="text-[15px] font-semibold text-[var(--report-gap)] mb-3">הדפוס הסמוי שעלה אצלך</h3>
            <p className="text-[15px] md:text-[16px] leading-[1.8] text-[var(--qa-text-primary)] text-right">
              {aiDiagnosis.hidden_pattern}
            </p>
          </div>
        </div>
      )}

      {/* תמונת מצב נוכחית */}
      <Section title="תמונת מצב נוכחית" variant="default">
        {reportData.currentState.includes('\n') ? (
          <ul className="space-y-4 list-none text-right" dir="rtl">
            {reportData.currentState
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .slice(0, 3)
              .map((line, idx) => (
                <li key={idx} className="flex gap-3 items-start text-right w-full" dir="rtl">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent-soft)] text-[var(--qa-accent)] text-[13px] font-bold flex items-center justify-center mt-0.5" aria-hidden>
                    {idx + 1}
                  </span>
                  <span className="text-[16px] md:text-[17px] leading-[1.85] text-[var(--qa-text-primary)] flex-1 text-right">{line}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-primary)] text-right" dir="rtl">
            {reportData.currentState}
          </p>
        )}
      </Section>

      {/* Profile */}
      <div className="mb-4 rounded-xl px-5 py-4 bg-[var(--report-card)] border border-[var(--qa-border)] text-right">
        <h3 className="text-[14px] font-semibold text-[var(--qa-text-secondary)] mb-2">פרופיל תפעולי</h3>
        <p className="text-[14px] text-[var(--qa-text-primary)] leading-[1.6] mb-3 italic">&ldquo;{result.pattern.oneLiner}&rdquo;</p>
        <DiagramBlock title="מבנה ניהולי נוכחי" ascii={result.pattern.diagram} />
      </div>

      {/* Metrics Map */}
      <Section title="מפת מדדים ניהוליים" variant="default">
        <div className="flex justify-center mb-4 w-full max-w-[min(280px,100vw-32px)] mx-auto">
          <RadarChart scores={result.normalizedScores} size={260} />
        </div>
        <p className="text-[15px] font-semibold text-[var(--report-accent)] mb-6 text-center" dir="rtl">
          הפער הכי גדול הוא {METRIC_LABELS[result.topMetric]} → לכן מתחילים ב{reportData.executiveTopActions?.[0]?.action ?? reportData.recommendations?.[0] ?? 'מיקוד ראשון'}
        </p>
        <div className="space-y-2 text-right" dir="rtl">
          {(Object.entries(reportData.scorecard) as [string, string][]).map(([metric, level]) => {
            const metricID = metric as MetricID;
            const isHigh = level === 'High';
            const isMedium = level === 'Medium';
            return (
              <div
                key={metric}
                className={`rounded-xl border px-5 py-3.5 flex items-center justify-between transition-colors text-right bg-[var(--report-card)] ${
                  isHigh
                    ? 'border-[var(--report-success)]'
                    : isMedium
                    ? 'border-[var(--report-gap)]'
                    : 'border-[var(--qa-border)]'
                }`}
              >
                <span className="text-[15px] text-[var(--qa-text-primary)] text-right">{METRIC_LABELS[metricID]}</span>
                <span className={`text-[13px] font-medium text-right ${isHigh ? 'text-[var(--report-success)]' : isMedium ? 'text-[var(--report-gap)]' : 'text-[var(--qa-text-secondary)]'}`}>
                  {MATURITY_LABELS[level] ?? level}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* נכסים קיימים */}
      <Section title="נכסים קיימים , מה עובד" variant="success">
        <ul className="space-y-4 list-none text-right" dir="rtl">
          {reportData.existingAssets.map((asset, idx) => (
            <li key={idx} className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-primary)] pr-4 border-r-2 border-[var(--qa-accent)] text-right">
              {asset}
            </li>
          ))}
        </ul>
      </Section>

      {/* הפער המרכזי */}
      <Section title="הפער המרכזי" variant="gap">
        <p className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-secondary)] text-right" dir="rtl">
          {reportData.centralGap}
        </p>
      </Section>

      {/* עדויות מהאבחון — AI personalized when available, otherwise template-based */}
      {aiStatus === 'ready' && aiDiagnosis && aiDiagnosis.personalized_evidence.length > 0 ? (
        <Section title="עדויות מהאבחון" variant="default">
          <ul className="space-y-4 list-none text-right" dir="rtl">
            {aiDiagnosis.personalized_evidence.map((e, idx) => (
              <li key={idx} className="text-[15px] md:text-[16px] leading-[1.75] text-[var(--qa-text-primary)] pr-4 border-r-2 border-[var(--qa-accent)]">
                <p className="font-semibold mb-1">{e.from_question}</p>
                <p className="text-[var(--qa-text-secondary)]">{e.insight}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : reportData.evidence && reportData.evidence.length > 0 ? (
        <Section title="עדויות מהאבחון" variant="default">
          <ul className="space-y-3 list-none text-right" dir="rtl">
            {reportData.evidence.map((e, idx) => (
              <li key={idx} className="text-[15px] md:text-[16px] leading-[1.75] text-[var(--qa-text-primary)] pr-4 border-r-2 border-[var(--qa-accent)] italic">
                {e}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* השפעות ותסמינים תפעוליים */}
      {reportData.operationalSymptoms && reportData.operationalSymptoms.length > 0 && (
        <Section title="השפעות ותסמינים תפעוליים" variant="default">
          <ul className="space-y-3 list-none text-right" dir="rtl">
            {reportData.operationalSymptoms.map((s, idx) => (
              <li key={idx} className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-primary)] pr-4 border-r-2 border-[var(--qa-border)] text-right">
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* סיכונים אם לא מטפלים */}
      <Section title="סיכונים אם לא מטפלים" variant="risk">
        <ul className="space-y-4 list-none text-right" dir="rtl">
          {reportData.risksIfUnchanged.map((risk, idx) => (
            <li key={idx} className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-secondary)] pr-4 border-r-2 border-[var(--qa-border)] text-right">
              {risk}
            </li>
          ))}
        </ul>
      </Section>

      {/* תוכנית 30/60/90 — AI personalized */}
      {aiStatus === 'ready' && aiDiagnosis?.plan_30_60_90 && (
        (aiDiagnosis.plan_30_60_90['30'].length > 0
          || aiDiagnosis.plan_30_60_90['60'].length > 0
          || aiDiagnosis.plan_30_60_90['90'].length > 0) && (
          <Section title="תוכנית 30/60/90 יום מותאמת אישית" variant="direction">
            <div className="grid gap-4 md:grid-cols-3 text-right" dir="rtl">
              {(['30', '60', '90'] as const).map((window) => {
                const items = aiDiagnosis.plan_30_60_90?.[window] ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={window} className="rounded-xl border border-[var(--qa-border)] bg-[var(--report-card)] px-4 py-4">
                    <h4 className="text-[14px] font-semibold text-[var(--report-direction)] mb-3">
                      {window} יום
                    </h4>
                    <ul className="space-y-2 list-none">
                      {items.map((item, idx) => (
                        <li key={idx} className="text-[14px] md:text-[15px] leading-[1.7] text-[var(--qa-text-primary)] flex gap-2 items-start" dir="rtl">
                          <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-[var(--report-direction)]" aria-hidden />
                          <span className="flex-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>
        )
      )}

      {/* תוכנית פעולה */}
      {(reportData.quickWins?.length || reportData.structuralSteps?.length) ? (
        <Section title="תוכנית פעולה" variant="direction">
          <div className="overflow-x-auto text-right" dir="rtl">
            <table className="w-full min-w-[500px] sm:min-w-[640px] border-collapse text-[13px] sm:text-[14px]">
              <thead>
                <tr className="border-b-2 border-[var(--report-direction)]">
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">מה</th>
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">למה</th>
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">אחראי</th>
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">תוצר</th>
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">דדליין</th>
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">KPI</th>
                  <th className="py-3 px-3 text-right font-semibold text-[var(--report-direction)]">מאמץ</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.quickWins ?? []).map((item, idx) => {
                  const row = typeof item === 'string' ? { what: item, owner: 'בעלת העסק', deadline: '7 עד 14 יום', deliverable: '', kpi: '', effort: '', why: '' } : item;
                  return (
                    <tr key={`qw-${idx}`} className="border-b border-[var(--qa-border)]">
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.what}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.why ?? '...'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.owner ?? 'בעלת העסק'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.deliverable ?? 'מסמך/תוצר ממומש'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.deadline ?? '7 עד 14 יום'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.kpi ?? '...'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.effort ?? '2 עד 4 שעות'}</td>
                    </tr>
                  );
                })}
                {(reportData.structuralSteps ?? []).map((item, idx) => {
                  const row = typeof item === 'string' ? { what: item, owner: 'בעלת העסק', deadline: '30 עד 60 יום', deliverable: '', kpi: '', effort: '', why: '' } : item;
                  return (
                    <tr key={`ss-${idx}`} className="border-b border-[var(--qa-border)]">
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.what}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.why ?? '...'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.owner ?? 'בעלת העסק'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.deliverable ?? 'מבנה מוגדר'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.deadline ?? '30 עד 60 יום'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.kpi ?? '...'}</td>
                      <td className="py-2.5 px-3 text-[var(--qa-text-primary)]">{row.effort ?? 'יום עבודה'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <Section title="מה נכון לעשות עכשיו" variant="direction">
          <div className="space-y-3 text-right" dir="rtl">
            {(reportData.recommendations ?? []).map((step, idx) => (
              <div key={idx} className="flex gap-4 items-start text-right" dir="rtl">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent-soft)] text-[var(--qa-accent)] text-[12px] font-medium flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-primary)] text-right flex-1">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* מה לא לעשות */}
      <div className="mb-4 rounded-xl px-5 py-4 border border-[var(--qa-border)] bg-[var(--report-card)] text-right">
        <h3 className="text-[14px] font-semibold text-[var(--report-avoid)] mb-3">מה לא לעשות</h3>
        <ul className="space-y-2 list-none">
          {(reportData.constraints ?? []).slice(0, 3).map((c, idx) => (
            <li key={idx} className="text-[14px] leading-[1.6] text-[var(--qa-text-primary)] flex gap-2 justify-end items-start" dir="rtl">
              <span className="shrink-0 mt-0.5" aria-hidden>×</span>
              <span className="flex-1">{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* מדדי הצלחה מוצעים (KPIs) */}
      {reportData.kpis && reportData.kpis.length > 0 && (
        <Section title="מדדי הצלחה מוצעים (KPIs)" variant="success">
          <ul className="space-y-2 list-none text-right" dir="rtl">
            {reportData.kpis.map((kpi, idx) => (
              <li key={idx} className="text-[16px] md:text-[17px] leading-[1.8] text-[var(--qa-text-primary)] pr-4 border-r-2 border-[var(--qa-accent)] text-right">
                {kpi}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* משפט סיום אחיד */}
      {reportData.reportClosingSentence && (
        <div className="mb-4 text-right">
          <div className="rounded-2xl px-6 md:px-8 py-7 md:py-8 shadow-sm border border-[var(--qa-border)] bg-[var(--report-card)] border-r-4 border-r-[var(--report-accent)] text-right">
            <p className="text-[15px] md:text-[16px] leading-[1.8] text-[var(--qa-text-primary)] font-medium text-right" dir="rtl">
              {reportData.reportClosingSentence}
            </p>
          </div>
        </div>
      )}


    </div>
  );
};

export default FinalReport;
