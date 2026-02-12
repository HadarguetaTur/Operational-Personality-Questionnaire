import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserState, DiagnosticResult, ReportContent, MetricID } from '../types';
import { normalizeScores, getRiskScore } from '../engine/scoring';
import { determinePattern } from '../engine/patterns';
import { MANAGEMENT_PATTERNS, ARCHETYPES } from '../engine/patterns';
import { inferScale, SCALE_LABELS } from '../engine/scale';
import { calculateFlags } from '../engine/flags';
import { generateReportText } from '../engine/report';
import { DiagramBlock } from '../components/DiagramBlock';
import { RadarChart } from '../components/RadarChart';
import { diagnosticConfig, METHODOLOGY } from '../config/diagnosticConfig';
import { supabase } from '../lib/supabase';
import { generateReportToken } from '../src/lib/reportToken';
import { triggerSendReportScenario } from '../src/lib/makeSendReport';

const METRIC_LABELS: Record<MetricID, string> = {
  Dependency_Index: 'עצמאות ניהולית',
  Cognitive_Load: 'פניות קוגניטיבית',
  Process_Standardization: 'שיטתיות תפעולית',
  Knowledge_Asset_Value: 'נכסי ידע',
  Strategic_Maturity: 'בשלות אסטרטגית'
};

const MATURITY_LABELS: Record<string, string> = {
  Low: 'נמוכה',
  Medium: 'בינונית',
  High: 'גבוהה'
};

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


type FetchStatus = 'loading' | 'not_found' | 'error' | 'ok';

const FinalReport: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token?: string }>();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [reportData, setReportData] = useState<ReportContent | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('loading');

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    const run = async () => {
      if (token !== 'new') {
        const fetchByToken = async () => {
          const { data, error } = await supabase
            .from('leads')
            .select('result_pattern, result_scale_stage, result_top_metric, result_snapshot, created_at, name')
            .eq('report_token', token)
            .maybeSingle();
          return { data, error };
        };
        if (!cancelled) setFetchStatus('loading');
        let { data, error } = await fetchByToken();
        if (!data?.result_snapshot && !error) {
          await new Promise((r) => setTimeout(r, 800));
          if (cancelled) return;
          const retry = await fetchByToken();
          data = retry.data;
          error = retry.error;
        }
        if (cancelled) return;
        if (error) {
          if (!cancelled) {
            setFetchStatus('error');
            setSaveError('שגיאה בטעינת הדוח. נסי שוב.');
          }
          return;
        }
        if (!data || !data.result_snapshot) {
          if (!cancelled) {
            setFetchStatus('not_found');
            setSaveError('הדוח לא נמצא');
          }
          return;
        }
        if (cancelled) return;
        setSaveError(null);
        setFetchStatus('ok');
        const snap = data.result_snapshot as Record<string, unknown>;
        const patternId = (snap.pattern_id as string) || 'REACTIVE';
        const pattern = MANAGEMENT_PATTERNS[patternId] ?? (ARCHETYPES as Record<string, typeof MANAGEMENT_PATTERNS.CENTRALIZED>)[patternId] ?? MANAGEMENT_PATTERNS.REACTIVE;
        const normalizedScores = (snap.normalized_scores as Record<string, number>) ?? {};
        const topMetric = (snap.top_metric as MetricID) ?? 'Dependency_Index';
        const flagsData = (snap.flags as { id: string; title: string; severity: string }[]) ?? [];
        const flags = flagsData.map((f) => ({ id: f.id, title: f.title, message: '', severity: f.severity as 'High' | 'Medium' }));
        const scorecard = (snap.scorecard as Record<string, string>) ?? {};
        const reportContent: ReportContent = {
          currentState: (snap.current_state as string) ?? '',
          existingAssets: (snap.existing_assets as string[]) ?? [],
          centralGap: (snap.central_gap as string) ?? '',
          directionOfBuild: '',
          recommendations: [],
          constraints: (snap.constraints as string[]) ?? [],
          risksIfUnchanged: (snap.risks_if_unchanged as string[]) ?? [],
          executiveSummary: (snap.executive_summary as string) ?? '',
          executiveIntro: (snap.executive_intro as string) ?? undefined,
          quickWins: (snap.quick_wins as (string | object)[]) ?? [],
          structuralSteps: (snap.structural_steps as (string | object)[]) ?? [],
          bottlenecks: [],
          scorecard: scorecard as Record<MetricID, string>,
          roadmap: []
        };
        const userInfo = (snap.user_info as { name?: string; email?: string } | undefined) ?? { name: data.name ?? '', email: '' };
        if (cancelled) return;
        setResult({
          pattern,
          scaleStage: (snap.scale_stage as string) ?? undefined,
          archetype: pattern,
          flags,
          normalizedScores: normalizedScores as Record<MetricID, number>,
          topMetric,
          userInfo
        });
        setReportData(reportContent);
        const landingSlug = pattern.id.toLowerCase().replace(/_/g, "-");
        redirectTimer = setTimeout(() => navigate(`/landing/${landingSlug}`), 60_000);
        return;
      }

      if (cancelled) return;
      const savedState = localStorage.getItem('diagnosticResult');
      if (!savedState) {
        navigate('/', { replace: true });
        return;
      }
      const state: UserState = JSON.parse(savedState);
      if (!state.leadId) {
        setSaveError('לא ניתן לטעון את הדוח. נסי להתחיל מחדש.');
        setFetchStatus('error');
        return;
      }
      const normalized = normalizeScores(state);
      const scaleStage = inferScale(state);
      const { pattern, secondaryPattern, uncertainty } = determinePattern(normalized, scaleStage);
      const flags = calculateFlags(state, normalized);

      const sortedMetrics = [...diagnosticConfig.metadata.metrics].sort((a, b) => {
        return getRiskScore(b, normalized[b]) - getRiskScore(a, normalized[a]);
      });
      const topMetric = sortedMetrics[0];
      const content = generateReportText(state, normalized, topMetric, pattern, scaleStage);

      if (state.leadId) {
        const completedAt = new Date().toISOString();
        const durationSeconds = (Date.now() - state.startTime) / 1000;
        const flagsData = flags.map((f) => ({ id: f.id, title: f.title, severity: f.severity }));
        const resultSnapshot = {
          pattern_id: pattern.id,
          pattern_name: pattern.name,
          scale_stage: scaleStage,
          scale_stage_label: scaleStage ? SCALE_LABELS[scaleStage] ?? scaleStage : null,
          top_metric: topMetric,
          normalized_scores: normalized,
          scorecard: content.scorecard,
          flags: flagsData,
          secondary_pattern: secondaryPattern ? { id: secondaryPattern.id, name: secondaryPattern.name } : null,
          pattern_uncertainty: uncertainty,
          answers_count: state.history?.length ?? 0,
          question_queue_length: state.questionQueue?.length ?? 0,
          executive_summary: content.executiveSummary,
          executive_intro: content.executiveIntro ?? null,
          current_state: content.currentState,
          central_gap: content.centralGap,
          existing_assets: content.existingAssets,
          risks_if_unchanged: content.risksIfUnchanged,
          quick_wins: content.quickWins ?? [],
          structural_steps: content.structuralSteps ?? [],
          constraints: content.constraints ?? [],
          user_info: state.userInfo
        };
        const reportToken = generateReportToken(32);
        const { data, error } = await supabase
          .from('leads')
          .update({
            completed_at: completedAt,
            duration_seconds: Math.round(durationSeconds),
            result_pattern: pattern.name,
            result_scale_stage: scaleStage ? SCALE_LABELS[scaleStage] ?? scaleStage : null,
            result_top_metric: topMetric,
            result_snapshot: resultSnapshot,
            report_token: reportToken,
            lead_status: 'completed'
          })
          .eq('id', state.leadId)
          .select('report_token')
          .single();
        if (error || !data?.report_token) {
          setSaveError('שמירת הדוח נכשלה. נסי שוב.');
          setFetchStatus('error');
          return;
        }
        triggerSendReportScenario(state.leadId, data.report_token).catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
        navigate(`/result/${data.report_token}`, { replace: true });
      }
    };
    run();
    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [navigate, token]);

  if (saveError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" dir="rtl">
        <p className="text-[18px] text-[var(--qa-text-primary)] font-medium">{saveError}</p>
        <button
          onClick={() => navigate('/')}
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
      {/* Report header + Executive Summary */}
      <div className="mb-4 text-right">
        <div className="rounded-2xl px-6 md:px-8 py-8 md:py-10 shadow-lg overflow-hidden" style={{ background: 'var(--report-hero)' }}>
          <span className="inline-block text-[12px] font-medium tracking-wide text-white/80 uppercase mb-5">
            דוח אבחון ניהולי
          </span>

          <h1 className="text-[28px] md:text-[36px] font-bold leading-[1.3] mb-5 text-white">
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

      {/* החלטה נדרשת , פורמט ניהולי */}
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

      {/* תמונת מצב נוכחית , 3 bullets */}
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

      {/* Profile , דחוס */}
      <div className="mb-4 rounded-xl px-5 py-4 bg-[var(--report-card)] border border-[var(--qa-border)] text-right">
        <h3 className="text-[14px] font-semibold text-[var(--qa-text-secondary)] mb-2">פרופיל תפעולי</h3>
        <p className="text-[14px] text-[var(--qa-text-primary)] leading-[1.6] mb-3 italic">"{result.pattern.oneLiner}"</p>
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
          {Object.entries(reportData.scorecard).map(([metric, level]) => {
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

      {/* עדויות מהאבחון */}
      {reportData.evidence && reportData.evidence.length > 0 && (
        <Section title="עדויות מהאבחון" variant="default">
          <ul className="space-y-3 list-none text-right" dir="rtl">
            {reportData.evidence.map((e, idx) => (
              <li key={idx} className="text-[15px] md:text-[16px] leading-[1.75] text-[var(--qa-text-primary)] pr-4 border-r-2 border-[var(--qa-accent)] italic">
                {e}
              </li>
            ))}
          </ul>
        </Section>
      )}

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

      {/* מה לא לעשות , נספח */}
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
