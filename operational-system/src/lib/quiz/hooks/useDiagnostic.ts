'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  diagnosticConfig,
  getQuestionQueueAfterContext,
  LAST_STRATEGIC_ID,
} from '@/lib/quiz/config/diagnosticConfig';
import { UserState, Question, AnswerOption, ScaleContext } from '@/lib/quiz/types';
import { updateScores, initialScores } from '@/lib/quiz/engine/scoring';
import { calculateBranches } from '@/lib/quiz/engine/branching';
import { getQuestionMeta } from '@/lib/quiz/config/designSystem';

export type DiagnosticPhase = 'question' | 'exit' | 'interim';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const LOCAL_BACKUP_KEY = 'diagnosticInProgress';

function readStoredUserInfo(): { name: string; email: string } {
  if (typeof window === 'undefined') return { name: '', email: '' };
  try {
    const raw = sessionStorage.getItem('diagnosticUserInfo');
    if (raw) return JSON.parse(raw) as { name: string; email: string };
  } catch {
    /* noop */
  }
  return { name: '', email: '' };
}

function readLeadId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('diagnosticLeadId');
}

export function useDiagnostic() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const leadId = hydrated ? readLeadId() : null;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const [state, setState] = useState<UserState>(() => ({
    answers: {},
    scores: initialScores,
    maxScores: initialScores,
    questionQueue: ['Q1'],
    currentQuestionIndex: 0,
    completed: false,
    history: [],
    startTime: Date.now(),
    userInfo: { name: '', email: '' },
    leadId: undefined,
  }));

  useEffect(() => {
    if (!hydrated) return;
    const id = sessionStorage.getItem('diagnosticLeadId');
    if (!id) {
      router.replace('/quiz');
      return;
    }
    const info = readStoredUserInfo();
    setState((s) => ({
      ...s,
      leadId: id,
      userInfo: info.name || info.email ? info : s.userInfo,
    }));
  }, [hydrated, router]);

  const previousStatesRef = useRef<UserState[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.currentQuestionIndex === 0 && Object.keys(state.answers).length === 0) return;
    try {
      localStorage.setItem(
        LOCAL_BACKUP_KEY,
        JSON.stringify({
          leadId: state.leadId,
          savedAt: Date.now(),
          state,
        }),
      );
    } catch {
      // Storage full or disabled — silently skip; remote save still tries.
    }
  }, [state]);

  useEffect(() => {
    if (leadId && state.leadId === leadId) {
      const supabase = createClient();
      if (!supabase) return;
      supabase
        .from('leads')
        .update({
          started_at: new Date().toISOString(),
          lead_status: 'in_progress',
          last_active_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .then(() => {});
    }
  }, [leadId, state.leadId]);

  useEffect(() => {
    if (!leadId) return;

    const saveProgressOnExit = () => {
      const s = stateRef.current;
      if (s.completed || s.currentQuestionIndex === 0) return;

      const pct = Math.round((s.currentQuestionIndex / s.questionQueue.length) * 100);
      const lastQ = s.questionQueue[s.currentQuestionIndex - 1] ?? s.questionQueue[0];
      const payload = {
        lead_status: 'in_progress',
        last_active_at: new Date().toISOString(),
        drop_off_question: lastQ,
        progress_percent: pct,
        partial_answers: s.answers,
      };

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anonKey) return;
      try {
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        // best-effort – ignore errors during unload
      }
    };

    const handleBeforeUnload = () => saveProgressOnExit();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveProgressOnExit();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leadId]);

  const [phase, setPhase] = useState<DiagnosticPhase>('question');
  const [renderKey, setRenderKey] = useState(0);

  const currentQuestionId = state.questionQueue[state.currentQuestionIndex];

  const findQuestion = useCallback((id: string): Question | undefined => {
    let q = diagnosticConfig.questions.find((item) => item.id === id);
    if (!q) {
      Object.values(diagnosticConfig.branchQuestions).forEach((list) => {
        const found = list.find((item) => item.id === id);
        if (found) q = found;
      });
    }
    return q;
  }, []);

  const currentQuestion = findQuestion(currentQuestionId);
  const prevQuestionId =
    state.currentQuestionIndex > 0 ? state.questionQueue[state.currentQuestionIndex - 1] : null;
  const prevQuestion = prevQuestionId ? findQuestion(prevQuestionId) : null;

  const questionMeta = useMemo(
    () => getQuestionMeta(currentQuestion?.cluster),
    [currentQuestion?.cluster],
  );

  const showTransition = useMemo(() => {
    if (!currentQuestion) return null;
    if (state.currentQuestionIndex === 0) return questionMeta.transitionText ?? null;
    if (prevQuestion?.cluster !== currentQuestion.cluster && currentQuestion.cluster) {
      return questionMeta.transitionText ?? null;
    }
    return null;
  }, [state.currentQuestionIndex, currentQuestion, prevQuestion?.cluster, questionMeta.transitionText]);

  const progressPercent = useMemo(() => {
    if (state.questionQueue.length <= 1) return 0;
    return Math.round((state.currentQuestionIndex / state.questionQueue.length) * 100);
  }, [state.currentQuestionIndex, state.questionQueue.length]);

  const handleAnswer = useCallback(
    (answer: AnswerOption) => {
      if (!currentQuestion) return;

      previousStatesRef.current.push(state);

      setPhase('exit');

      setTimeout(() => {
        const { scores, maxScores } = updateScores(state.scores, state.maxScores, answer);

        const scaleContextFromQ1: ScaleContext | undefined =
          currentQuestion.id === 'Q1'
            ? answer.id === 'Q1_A'
              ? 'solo'
              : answer.id === 'Q1_B'
                ? 'small_team'
                : 'growing_team'
            : state.scaleContext;

        const newState: UserState = {
          ...state,
          answers: { ...state.answers, [currentQuestion.id]: answer.id },
          scores,
          maxScores,
          history: [...state.history, { questionId: currentQuestion.id, answerText: answer.text }],
          ...(scaleContextFromQ1 !== undefined && { scaleContext: scaleContextFromQ1 }),
        };

        let nextQueue = [...state.questionQueue];
        if (currentQuestion.id === 'Q1' && scaleContextFromQ1) {
          nextQueue = ['Q1', ...getQuestionQueueAfterContext(scaleContextFromQ1)];
        }

        if (currentQuestion.id === LAST_STRATEGIC_ID) {
          const stateForBranching: UserState = {
            ...newState,
            questionQueue: nextQueue,
            currentQuestionIndex: state.currentQuestionIndex,
          };
          const branchIds = calculateBranches(stateForBranching);
          if (branchIds.length > 0) {
            nextQueue = [...nextQueue, ...branchIds];
          }
        }

        const nextIndex = state.currentQuestionIndex + 1;

        if (leadId) {
          const pct = Math.round((nextIndex / nextQueue.length) * 100);
          setSyncStatus('syncing');
          const supabase = createClient();
          if (supabase) {
            supabase
              .from('leads')
              .update({
                lead_status: 'in_progress',
                last_active_at: new Date().toISOString(),
                drop_off_question: currentQuestion.id,
                progress_percent: pct,
                partial_answers: newState.answers,
              })
              .eq('id', leadId)
              .then(({ error: updateError }) => {
                if (updateError) {
                  setSyncStatus('error');
                  return;
                }
                setSyncStatus('synced');
                if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
                syncTimerRef.current = setTimeout(() => setSyncStatus('idle'), 1800);
              });
          }
        }

        if (nextIndex < nextQueue.length) {
          setState({
            ...newState,
            questionQueue: nextQueue,
            currentQuestionIndex: nextIndex,
          });
          setRenderKey((prev) => prev + 1);
          setPhase('question');
        } else {
          setState({ ...newState, completed: true });
          setPhase('interim');
        }
      }, 220);
    },
    [currentQuestion, state, leadId],
  );

  const handleBack = useCallback(() => {
    const prev = previousStatesRef.current.pop();
    if (!prev) return;
    setPhase('exit');
    setTimeout(() => {
      setState(prev);
      setRenderKey((k) => k + 1);
      setPhase('question');
    }, 150);
  }, []);

  const handleContinue = useCallback(() => {
    localStorage.setItem('diagnosticResult', JSON.stringify(state));
    try {
      localStorage.removeItem(LOCAL_BACKUP_KEY);
    } catch {
      /* noop */
    }
    router.push('/quiz/result/new');
  }, [state, router]);

  const canGoBack = state.currentQuestionIndex > 0 && phase === 'question';

  return {
    state,
    phase,
    renderKey,
    currentQuestion,
    questionMeta,
    showTransition,
    progressPercent,
    syncStatus,
    canGoBack,
    handleAnswer,
    handleBack,
    handleContinue,
  };
}
