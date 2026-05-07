'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  UserState,
  DiagnosticResult,
  ReportContent,
  MetricID,
  ActionItem,
  MaturityLevel,
  ScaleStage,
} from '@/lib/quiz/types';
import { normalizeScores, getRiskScore } from '@/lib/quiz/engine/scoring';
import { determinePattern, MANAGEMENT_PATTERNS } from '@/lib/quiz/engine/patterns';
import { inferScale, SCALE_LABELS } from '@/lib/quiz/engine/scale';
import { calculateFlags } from '@/lib/quiz/engine/flags';
import { generateReportText } from '@/lib/quiz/engine/report';
import { diagnosticConfig } from '@/lib/quiz/config/diagnosticConfig';
import { resultSnapshotSchema, aiDiagnosisSchema } from '@/lib/quiz/schemas';
import type { ValidatedAiDiagnosis } from '@/lib/quiz/schemas';
import { finalizeDiagnostic } from '@/lib/quiz/finalizeDiagnostic';
import { requestAiDiagnosis } from '@/lib/quiz/aiDiagnosis';

export type FetchStatus = 'loading' | 'not_found' | 'error' | 'ok';
export type AiStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export type PdfStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'unconfigured' | null;

interface UseReportResult {
  result: DiagnosticResult | null;
  reportData: ReportContent | null;
  saveError: string | null;
  fetchStatus: FetchStatus;
  emailWarning: boolean;
  aiDiagnosis: ValidatedAiDiagnosis | null;
  aiStatus: AiStatus;
  reportPdfUrl: string | null;
  reportPdfStatus: PdfStatus;
}

export function useReport(token: string | undefined): UseReportResult {
  const router = useRouter();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [reportData, setReportData] = useState<ReportContent | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('loading');
  const [emailWarning, setEmailWarning] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<ValidatedAiDiagnosis | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [reportPdfUrl, setReportPdfUrl] = useState<string | null>(null);
  const [reportPdfStatus, setReportPdfStatus] = useState<PdfStatus>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }

    let cancelled = false;

    const fetchExistingReport = async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setFetchStatus('error');
          setSaveError('חסרה הגדרת Supabase. פני אל המפתחת.');
        }
        return;
      }

      const COLUMNS_FULL =
        'id, result_pattern, result_scale_stage, result_top_metric, result_snapshot, created_at, name, ai_diagnosis, ai_diagnosis_meta, report_pdf_url, report_pdf_status';
      const COLUMNS_BASE =
        'id, result_pattern, result_scale_stage, result_top_metric, result_snapshot, created_at, name';

      const isMissingColumnError = (err: { message?: string; code?: string } | null) => {
        if (!err) return false;
        const msg = (err.message ?? '').toLowerCase();
        return /column .* does not exist|could not find the .* column|42703/.test(msg);
      };

      const fetchByToken = async () => {
        const rpc = await supabase.rpc('get_lead_for_report', { p_token: token });

        const rowFromRpc =
          rpc.data !== null &&
          rpc.data !== undefined &&
          typeof rpc.data === 'object'
            ? (rpc.data as Record<string, unknown>)
            : null;

        if (!rpc.error && rowFromRpc && Object.keys(rowFromRpc).length > 0) {
          return {
            data: rowFromRpc as unknown as Record<string, unknown>,
            error: null as typeof rpc.error | null,
          };
        }

        const msg = (rpc.error?.message ?? '').toLowerCase();
        const missingFn =
          /function .* does not exist|could not find.*function|pgrst202/.test(msg) ||
          rpc.error?.code === 'PGRST202';

        if (!missingFn && rpc.error) {
          return { data: null, error: rpc.error };
        }

        if (missingFn) {
          console.warn(
            '[useReport] get_lead_for_report missing — falling back to legacy select.',
          );
        }

        const full = await supabase
          .from('leads')
          .select(COLUMNS_FULL)
          .eq('report_token', token)
          .maybeSingle();
        if (full.error && isMissingColumnError(full.error)) {
          console.warn(
            '[useReport] AI/PDF columns missing — running pre-migration. ' +
              'Run supabase/add_ai_diagnosis.sql and supabase/add_pdf_columns.sql to enable.',
          );
          const base = await supabase
            .from('leads')
            .select(COLUMNS_BASE)
            .eq('report_token', token)
            .maybeSingle();
          return { data: base.data, error: base.error };
        }
        return { data: full.data, error: full.error };
      };

      if (!cancelled) setFetchStatus('loading');
      let { data, error } = await fetchByToken();

      const retryDelays = [800, 1500, 3000];
      for (const delay of retryDelays) {
        if (data?.result_snapshot || error) break;
        await new Promise((r) => setTimeout(r, delay));
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

      const parseResult = resultSnapshotSchema.safeParse(data.result_snapshot);
      if (!parseResult.success) {
        console.error('[useReport] Invalid snapshot data:', parseResult.error.format());
        if (!cancelled) {
          setFetchStatus('error');
          setSaveError('הנתונים שנשמרו אינם תקינים.');
        }
        return;
      }

      const snap = parseResult.data;
      const patternId = snap.pattern_id;
      const pattern = MANAGEMENT_PATTERNS[patternId] ?? MANAGEMENT_PATTERNS.REACTIVE;
      const normalizedScores = snap.normalized_scores;
      const topMetric = snap.top_metric as MetricID;
      const flagsData = snap.flags;
      const flags = flagsData.map((f) => ({
        id: f.id,
        title: f.title,
        message: '',
        severity: f.severity as 'High' | 'Medium',
      }));
      const scorecard = snap.scorecard;

      const reportContent: ReportContent = {
        currentState: snap.current_state,
        existingAssets: snap.existing_assets,
        centralGap: snap.central_gap,
        directionOfBuild: snap.direction_of_build ?? '',
        recommendations: [],
        constraints: snap.constraints,
        risksIfUnchanged: snap.risks_if_unchanged,
        executiveSummary: snap.executive_summary,
        executiveIntro: snap.executive_intro ?? undefined,
        quickWins: snap.quick_wins as (string | ActionItem)[],
        structuralSteps: snap.structural_steps as (string | ActionItem)[],
        bottlenecks: [],
        scorecard: scorecard as unknown as Record<MetricID, MaturityLevel>,
        roadmap: [],
      };

      const userInfo = snap.user_info ?? { name: data.name ?? '', email: '' };

      if (cancelled) return;
      setResult({
        pattern,
        scaleStage: (snap.scale_stage as string as ScaleStage | undefined) ?? undefined,
        archetype: pattern,
        flags,
        normalizedScores: normalizedScores as Record<MetricID, number>,
        topMetric,
        userInfo: { name: userInfo?.name ?? '', email: userInfo?.email ?? '' },
      });
      setReportData(reportContent);

      const pdfRow = data as { report_pdf_url?: string | null; report_pdf_status?: PdfStatus };
      setReportPdfUrl(pdfRow.report_pdf_url ?? null);
      setReportPdfStatus(pdfRow.report_pdf_status ?? null);

      const cachedAi = (data as { ai_diagnosis?: unknown; id?: string }).ai_diagnosis;
      const leadId = (data as { id?: string }).id;
      const cachedParse = cachedAi ? aiDiagnosisSchema.safeParse(cachedAi) : null;
      if (cachedParse?.success) {
        setAiDiagnosis(cachedParse.data);
        setAiStatus('ready');
      } else if (leadId && token) {
        setAiStatus('loading');
        requestAiDiagnosis(leadId, token)
          .then((res) => {
            if (cancelled) return;
            if (res.diagnosis) {
              setAiDiagnosis(res.diagnosis);
              setAiStatus('ready');
            } else {
              if (res.upstreamError || res.parseError) {
                console.warn('[useReport] AI diagnosis unavailable', {
                  upstream: res.upstreamError,
                  parse: res.parseError,
                });
              }
              setAiStatus('unavailable');
            }
          })
          .catch((err) => {
            if (cancelled) return;
            console.warn('[useReport] requestAiDiagnosis threw', err);
            setAiStatus('unavailable');
          });
      } else {
        setAiStatus('unavailable');
      }
    };

    const generateNewReport = async () => {
      if (cancelled) return;
      const savedState = localStorage.getItem('diagnosticResult');
      if (!savedState) {
        console.error('[useReport] generateNewReport: diagnosticResult missing from localStorage');
        setSaveError(
          'לא הצלחנו למצוא את התשובות שלך. אם מילאת את השאלון לאחרונה, נסי לרענן או פני אלינו לתמיכה.',
        );
        setFetchStatus('error');
        return;
      }

      let state: UserState;
      try {
        state = JSON.parse(savedState) as UserState;
      } catch (err) {
        console.error('[useReport] Failed to parse diagnosticResult from localStorage', err);
        setSaveError('הנתונים השמורים פגומים. אנא התחילי שוב את השאלון.');
        setFetchStatus('error');
        return;
      }
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
        history: state.history ?? [],
        executive_summary: content.executiveSummary,
        executive_intro: content.executiveIntro ?? null,
        current_state: content.currentState,
        central_gap: content.centralGap,
        direction_of_build: content.directionOfBuild ?? '',
        existing_assets: content.existingAssets,
        risks_if_unchanged: content.risksIfUnchanged,
        quick_wins: content.quickWins ?? [],
        structural_steps: content.structuralSteps ?? [],
        constraints: content.constraints ?? [],
        user_info: state.userInfo,
      };

      let finalize;
      try {
        finalize = await finalizeDiagnostic({
          leadId: state.leadId,
          snapshot: resultSnapshot,
          result_pattern: pattern.name,
          result_scale_stage: scaleStage ? SCALE_LABELS[scaleStage] ?? scaleStage : null,
          result_top_metric: topMetric,
          duration_seconds: durationSeconds,
        });
      } catch (err) {
        console.error('[useReport] finalize-diagnostic failed', err);
        setSaveError('שמירת הדוח נכשלה. נסי שוב.');
        setFetchStatus('error');
        return;
      }

      if (cancelled) return;
      localStorage.removeItem('diagnosticResult');
      if (finalize.pipelineStatus === 'failed') {
        setEmailWarning(true);
      }
      await new Promise((r) => setTimeout(r, 300));
      router.replace(`/quiz/result/${finalize.reportToken}`);
    };

    const run = async () => {
      if (token !== 'new') {
        await fetchExistingReport();
      } else {
        await generateNewReport();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return {
    result,
    reportData,
    saveError,
    fetchStatus,
    emailWarning,
    aiDiagnosis,
    aiStatus,
    reportPdfUrl,
    reportPdfStatus,
  };
}
