'use client';

import React, { useEffect, useRef } from 'react';
import { AnswerButtons } from '@/components/quiz/AnswerButtons';
import { useDiagnostic } from '@/lib/quiz/hooks/useDiagnostic';

export default function QuizDiagnosticChat() {
  const {
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
  } = useDiagnostic();

  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the question heading on each new question (a11y)
  useEffect(() => {
    if (phase === 'question' && questionHeadingRef.current) {
      questionHeadingRef.current.focus();
    }
  }, [renderKey, phase]);

  const syncLabel =
    syncStatus === 'syncing' ? 'שומר...' :
    syncStatus === 'synced' ? 'נשמר' :
    syncStatus === 'error' ? 'שמירה נכשלה — תשובותייך נשמרות מקומית' :
    '';

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
            {/* Stage indicator */}
            <div className="mb-6 md:mb-8">
              <span className="inline-block text-[12px] font-medium tracking-wide text-[var(--qa-text-muted)] uppercase">
                שלב {questionMeta.stage} מתוך {questionMeta.totalStages}
              </span>
            </div>

            {/* Transition sentence */}
            {showTransition && (
              <p className="text-[15px] md:text-[16px] text-[var(--qa-text-primary)] font-medium mb-6 md:mb-8 leading-8 border-r-2 border-[var(--qa-accent)] pr-3 max-w-[640px]" dir="rtl">
                {showTransition}
              </p>
            )}

            {/* Question text */}
            <h2
              ref={questionHeadingRef}
              tabIndex={-1}
              className="text-[22px] md:text-[26px] font-medium leading-[1.6] mb-10 md:mb-12 max-w-[640px] focus:outline-none"
            >
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

            {/* Back link */}
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                className="mt-6 inline-flex items-center gap-1.5 text-[14px] text-[var(--qa-text-muted)] hover:text-[var(--qa-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)] rounded px-1 py-0.5"
                aria-label="חזרה לשאלה הקודמת"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                חזרה לשאלה הקודמת
              </button>
            )}

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

      {/* Sync status pill */}
      <div
        className="qa-sync-pill"
        data-visible={syncStatus !== 'idle'}
        data-status={syncStatus}
        role="status"
        aria-live="polite"
      >
        {syncStatus === 'syncing' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
            <circle cx="12" cy="12" r="9" strokeDasharray="40 20" />
          </svg>
        )}
        {syncStatus === 'synced' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {syncStatus === 'error' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
        )}
        <span>{syncLabel}</span>
      </div>
    </div>
  );
}
