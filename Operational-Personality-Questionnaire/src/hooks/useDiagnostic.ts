import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { diagnosticConfig, getQuestionQueueAfterContext, LAST_STRATEGIC_ID } from '../config/diagnosticConfig';
import { UserState, Question, AnswerOption, ScaleContext } from '../types';
import { updateScores, initialScores } from '../engine/scoring';
import { calculateBranches } from '../engine/branching';
import { getQuestionMeta } from '../config/designSystem';
import { supabase } from '../lib/supabase';

export type DiagnosticPhase = 'question' | 'exit' | 'interim';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const LOCAL_BACKUP_KEY = 'diagnosticInProgress';

export function useDiagnostic() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { leadId?: string; userInfo?: { name: string; email: string } } | undefined;
  const leadId = locationState?.leadId ?? sessionStorage.getItem('diagnosticLeadId');
  const userInfoFromLead = locationState?.userInfo;

  const [state, setState] = useState<UserState>(() => ({
    answers: {},
    scores: initialScores,
    maxScores: initialScores,
    questionQueue: ['Q1'],
    currentQuestionIndex: 0,
    completed: false,
    history: [],
    startTime: Date.now(),
    userInfo: userInfoFromLead ?? { name: '', email: '' },
    leadId: leadId ?? undefined
  }));

  // Stack of previous state snapshots for back navigation
  const previousStatesRef = useRef<UserState[]>([]);
  // Sync status visible to UI
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Local backup — best-effort, instant, survives network issues
  useEffect(() => {
    if (state.currentQuestionIndex === 0 && Object.keys(state.answers).length === 0) return;
    try {
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({
        leadId: state.leadId,
        savedAt: Date.now(),
        state
      }));
    } catch {
      // Storage full or disabled — silently skip; remote save still tries.
    }
  }, [state]);

  // Mark lead as in_progress on mount
  useEffect(() => {
    if (leadId && state.leadId === leadId) {
      supabase
        .from('leads')
        .update({
          started_at: new Date().toISOString(),
          lead_status: 'in_progress',
          last_active_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .then(() => {});
    }
  }, [leadId, state.leadId]);

  // Save progress on tab close / visibility change
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
        partial_answers: s.answers
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      try {
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Prefer: 'return=minimal'
          },
          body: JSON.stringify(payload),
          keepalive: true
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
    let q = diagnosticConfig.questions.find(item => item.id === id);
    if (!q) {
      Object.values(diagnosticConfig.branchQuestions).forEach(list => {
        const found = list.find(item => item.id === id);
        if (found) q = found;
      });
    }
    return q;
  }, []);

  const currentQuestion = findQuestion(currentQuestionId);
  const prevQuestionId = state.currentQuestionIndex > 0 ? state.questionQueue[state.currentQuestionIndex - 1] : null;
  const prevQuestion = prevQuestionId ? findQuestion(prevQuestionId) : null;

  const questionMeta = useMemo(
    () => getQuestionMeta(currentQuestion?.cluster),
    [currentQuestion?.cluster]
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

  const handleAnswer = useCallback((answer: AnswerOption) => {
    if (!currentQuestion) return;

    // Snapshot current state before applying the answer, so user can go back
    previousStatesRef.current.push(state);

    setPhase('exit');

    setTimeout(() => {
      const { scores, maxScores } = updateScores(state.scores, state.maxScores, answer);

      const scaleContextFromQ1: ScaleContext | undefined =
        currentQuestion.id === 'Q1'
          ? (answer.id === 'Q1_A' ? 'solo' : answer.id === 'Q1_B' ? 'small_team' : 'growing_team')
          : state.scaleContext;

      const newState: UserState = {
        ...state,
        answers: { ...state.answers, [currentQuestion.id]: answer.id },
        scores,
        maxScores,
        history: [...state.history, { questionId: currentQuestion.id, answerText: answer.text }],
        ...(scaleContextFromQ1 !== undefined && { scaleContext: scaleContextFromQ1 })
      };

      let nextQueue = [...state.questionQueue];
      if (currentQuestion.id === 'Q1' && scaleContextFromQ1) {
        nextQueue = ['Q1', ...getQuestionQueueAfterContext(scaleContextFromQ1)];
      }

      if (currentQuestion.id === LAST_STRATEGIC_ID) {
        const stateForBranching: UserState = {
          ...newState,
          questionQueue: nextQueue,
          currentQuestionIndex: state.currentQuestionIndex
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
        supabase
          .from('leads')
          .update({
            lead_status: 'in_progress',
            last_active_at: new Date().toISOString(),
            drop_off_question: currentQuestion.id,
            progress_percent: pct,
            partial_answers: newState.answers
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

      if (nextIndex < nextQueue.length) {
        setState({
          ...newState,
          questionQueue: nextQueue,
          currentQuestionIndex: nextIndex
        });
        setRenderKey(prev => prev + 1);
        setPhase('question');
      } else {
        setState({ ...newState, completed: true });
        setPhase('interim');
      }
    }, 220);
  }, [currentQuestion, state, leadId, findQuestion]);

  const handleBack = useCallback(() => {
    const prev = previousStatesRef.current.pop();
    if (!prev) return;
    setPhase('exit');
    setTimeout(() => {
      setState(prev);
      setRenderKey(k => k + 1);
      setPhase('question');
    }, 150);
  }, []);

  const handleContinue = useCallback(() => {
    localStorage.setItem('diagnosticResult', JSON.stringify(state));
    // Clear in-progress backup once we're handing off to the report flow
    try { localStorage.removeItem(LOCAL_BACKUP_KEY); } catch { /* noop */ }
    navigate('/result/new');
  }, [state, navigate]);

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
    handleContinue
  };
}
