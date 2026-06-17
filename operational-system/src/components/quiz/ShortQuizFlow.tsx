'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import {
  SHORT_QUIZ_QUESTIONS,
  TOTAL_QUESTIONS,
  PHASE_NAMES,
  buildAnswerMap,
  resolveResultType,
  ShortQuizOption,
} from '@/config/shortQuizConfig';
import type { ResultType } from '@/lib/calculator/types';
import { QuizLeadForm } from './QuizLeadForm';

type FlowPhase = 'questions' | 'lead';

const AUTO_ADVANCE_MS = 320;

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PhaseProgressBar({ currentIndex }: { currentIndex: number }) {
  const currentQ = SHORT_QUIZ_QUESTIONS[currentIndex];
  const currentPhase = currentQ?.phase ?? 1;
  const phases: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div className="sticky top-0 z-50 bg-[var(--qa-bg)]">
      <div className="flex justify-between px-4 pt-2 pb-1 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <span
            key={p}
            className={`text-[11px] font-medium transition-colors ${
              p === currentPhase
                ? 'text-[var(--qa-accent)]'
                : p < currentPhase
                ? 'text-[var(--qa-text-muted)]'
                : 'text-[var(--qa-border)]'
            }`}
          >
            {PHASE_NAMES[p]}
          </span>
        ))}
      </div>
      <div className="flex gap-1 px-4 pb-3 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <div key={p} className="flex-1 h-1 rounded-full bg-[var(--qa-border-light)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--qa-accent)] transition-all duration-500"
              style={{ width: p < currentPhase ? '100%' : p === currentPhase ? '60%' : '0%' }}
            />
          </div>
        ))}
      </div>
      <div className="px-6 pb-2 text-right max-w-[640px] mx-auto">
        <span className="text-[12px] text-[var(--qa-text-muted)]">
          שאלה {currentIndex + 1} מתוך {TOTAL_QUESTIONS}
        </span>
      </div>
    </div>
  );
}

// ─── Question screen ──────────────────────────────────────────────────────────

interface QuestionScreenProps {
  questionIndex: number;
  onAnswer: (optionId: string) => void;
}

function QuestionScreen({ questionIndex, onAnswer }: QuestionScreenProps) {
  const question = SHORT_QUIZ_QUESTIONS[questionIndex];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setSelectedId(null);
    headingRef.current?.focus();
  }, [questionIndex]);

  const handleSelect = useCallback(
    (opt: ShortQuizOption) => {
      if (selectedId) return;
      setSelectedId(opt.id);
      setTimeout(() => onAnswer(opt.id), AUTO_ADVANCE_MS);
    },
    [selectedId, onAnswer],
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)]" dir="rtl">
      <PhaseProgressBar currentIndex={questionIndex} />

      <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 max-w-[640px] w-full mx-auto">
        {question.context && (
          <p className="text-[12px] font-medium text-[var(--qa-accent)] mb-2 text-right opacity-80">
            {question.context}
          </p>
        )}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-[22px] md:text-[26px] font-semibold leading-snug mb-2 text-right outline-none"
        >
          {question.text}
        </h2>
        {question.microCopy && (
          <p className="text-[12px] text-[var(--qa-text-muted)] mb-6 text-right">
            {question.microCopy}
          </p>
        )}
        {!question.microCopy && <div className="mb-6" />}
        <div className="flex flex-col gap-3 w-full" role="radiogroup" dir="rtl">
          {question.options.map((opt) => {
            const isSelected = selectedId === opt.id;
            const isDimmed = selectedId !== null && !isSelected;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                disabled={selectedId !== null}
                role="radio"
                aria-checked={isSelected}
                className={`
                  w-full min-h-[56px] text-right px-5 py-3.5 rounded-[12px] border
                  text-[15px] md:text-[16px] font-normal leading-relaxed
                  transition-all duration-200 cursor-pointer
                  flex items-center justify-between gap-3
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)]
                  ${isSelected
                    ? 'border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-text-primary)]'
                    : isDimmed
                      ? 'border-[var(--qa-border-light)] bg-[var(--qa-surface)] text-[var(--qa-text-muted)] opacity-40'
                      : 'border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] hover:border-[var(--qa-accent)] hover:bg-[var(--qa-accent-hover)] active:scale-[0.99]'
                  }
                `}
              >
                <span className="flex-1 text-right">{opt.text}</span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent)] text-white inline-flex items-center justify-center"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedId === null && (
          <p className="mt-5 text-[13px] font-semibold text-[var(--qa-accent)] text-right opacity-70">
            ← בחרי תשובה אחת כדי להמשיך
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

/** Maps the ordered answers array to a { questionId: optionId } record. */
function buildAnswerInputs(answers: string[]): Record<string, string> {
  const inputs: Record<string, string> = {};
  SHORT_QUIZ_QUESTIONS.forEach((q, idx) => {
    const optId = answers[idx];
    if (optId) inputs[q.id] = optId;
  });
  return inputs;
}

export default function ShortQuizFlow() {
  const [phase, setPhase] = useState<FlowPhase>('questions');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [resultType, setResultType] = useState<ResultType>('CENTRALIZED');

  useEffect(() => {
    trackEvent('quiz_start');
  }, []);

  const handleAnswer = useCallback(
    (optionId: string) => {
      const newAnswers = [...answers, optionId];
      setAnswers(newAnswers);

      if (currentIndex === TOTAL_QUESTIONS - 1) {
        const map = buildAnswerMap(newAnswers);
        setResultType(resolveResultType(map));
        setPhase('lead');
        if (typeof window !== 'undefined') window.scrollTo(0, 0);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [answers, currentIndex],
  );

  if (phase === 'lead') {
    return (
      <QuizLeadForm
        resultType={resultType}
        answerInputs={buildAnswerInputs(answers)}
      />
    );
  }

  return (
    <QuestionScreen
      key={currentIndex}
      questionIndex={currentIndex}
      onAnswer={handleAnswer}
    />
  );
}
