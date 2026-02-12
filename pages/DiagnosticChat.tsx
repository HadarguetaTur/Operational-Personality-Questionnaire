import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { diagnosticConfig, getQuestionQueueAfterContext, LAST_STRATEGIC_ID } from '../config/diagnosticConfig';
import { UserState, Question, AnswerOption, ScaleContext } from '../types';
import { updateScores, initialScores } from '../engine/scoring';
import { calculateBranches } from '../engine/branching';
import { AnswerButtons } from '../components/AnswerButtons';
import { getQuestionMeta } from '../config/designSystem';
import { supabase } from '../lib/supabase';

const DiagnosticChat: React.FC = () => {
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

  useEffect(() => {
    if (leadId && state.leadId === leadId) {
      supabase
        .from('leads')
        .update({ started_at: new Date().toISOString() })
        .eq('id', leadId)
        .then(() => {});
    }
  }, [leadId, state.leadId]);

  const [phase, setPhase] = useState<'question' | 'exit' | 'interim'>('question');
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

    // Start exit animation
    setPhase('exit');

    // After exit animation, process and advance
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

      // Adaptive branching: inject deepening questions after last strategic question
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
  }, [currentQuestion, state, findQuestion]);

  const handleContinue = () => {
    localStorage.setItem('diagnosticResult', JSON.stringify(state));
    navigate('/result/new');
  };

  if (!currentQuestion && phase !== 'interim') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative text-right" dir="rtl">
      {/* === Progress Bar === */}
      <div className="sticky top-0 z-50 bg-[var(--qa-bg)]">
        <div className="w-full h-1.5 bg-[var(--qa-border-light)] overflow-hidden">
          <div
            className="qa-progress-fill h-full rounded-full"
            style={{ width: phase === 'interim' ? '100%' : `${progressPercent}%` }}
          />
        </div>
        {phase !== 'interim' && currentQuestion && (
          <div className="flex flex-col gap-1 px-6 md:px-8 py-3 text-right">
            <span className="text-[13px] text-[var(--qa-text-muted)]">
              {questionMeta.progressSmartLabel}
            </span>
            <span className="text-[12px] text-[var(--qa-text-muted)] tabular-nums opacity-80">
              {state.currentQuestionIndex + 1} / {state.questionQueue.length}
            </span>
          </div>
        )}
      </div>

      {/* === Question Area === */}
      {phase !== 'interim' && currentQuestion && (
        <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 md:pb-16 text-right">
          <div
            key={renderKey}
            className={`${phase === 'exit' ? 'qa-question-exit' : 'qa-question-enter'} text-right`}
          >
            {/* Stage indicator - minimal, smart label is in progress bar */}
            <div className="mb-6 md:mb-8">
              <span className="inline-block text-[12px] font-medium tracking-wide text-[var(--qa-text-muted)] uppercase">
                שלב {questionMeta.stage} מתוך {questionMeta.totalStages}
              </span>
            </div>

            {/* Transition sentence (opening or between clusters) */}
            {showTransition && (
              <p className="text-[15px] md:text-[16px] text-[var(--qa-text-primary)] font-medium mb-6 md:mb-8 leading-8 border-r-2 border-[var(--qa-accent)] pr-3 max-w-[640px]" dir="rtl">
                {showTransition}
              </p>
            )}

            {/* Question text */}
            <h2 className="text-[22px] md:text-[26px] font-medium leading-[1.6] mb-10 md:mb-12 max-w-[640px]">
              {currentQuestion.text}
            </h2>

            {/* Answers */}
            <div className="max-w-[600px]">
              <AnswerButtons
                answers={currentQuestion.answers}
                onSelect={handleAnswer}
                disabled={phase === 'exit'}
              />
            </div>

            {/* Microcopy - only on first question */}
            {state.currentQuestionIndex === 0 && (
              <p className="mt-8 text-[13px] text-[var(--qa-text-muted)]">
                אין תשובות נכונות. רק תמונת מצב נוכחית.
              </p>
            )}
          </div>
        </div>
      )}

      {/* === Interim Summary === */}
      {phase === 'interim' && (
        <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 md:pb-16 qa-fade-in text-right">
          <div className="max-w-[560px] text-right">
            <div className="mb-6">
              <span className="inline-block text-[12px] font-medium tracking-wide text-[var(--qa-text-muted)] uppercase">
                סיכום
              </span>
            </div>

            <h2 className="text-[26px] md:text-[32px] font-semibold leading-[1.4] mb-5">
              המיפוי הושלם.
            </h2>

            <p className="text-[17px] md:text-[18px] text-[var(--qa-text-secondary)] leading-[1.8] mb-4">
              הדוח מבוסס על דפוסים שעלו מ {state.questionQueue.length} נקודות בדיקה, לא על שאלה בודדת.
            </p>

            <p className="text-[16px] text-[var(--qa-text-muted)] leading-[1.7] mb-10">
              הדוח הבא מציג תמונת מצב תפעולית, חוזקות קיימות, סיכוני צמיחה וכיוון עבודה מומלץ.
            </p>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full sm:w-auto px-10 h-[52px] rounded-[12px] bg-[var(--qa-accent)] text-white text-[16px] font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
            >
              צפייה בדוח
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticChat;
