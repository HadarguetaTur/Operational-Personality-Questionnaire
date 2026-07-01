'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
    <div className="sticky top-0 z-50 bg-[var(--qa-bg)]/80 backdrop-blur-md border-b border-[#dce7ea]">
      <div className="flex justify-between px-4 pt-3 pb-1 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <span
            key={p}
            className={`text-[11px] font-medium tracking-wide transition-colors ${
              p === currentPhase
                ? 'text-[#0e7a6e]'
                : p < currentPhase
                ? 'text-[#7c8884]'
                : 'text-[#aab4b1]'
            }`}
          >
            {PHASE_NAMES[p]}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5 px-4 pb-3 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <div key={p} className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="qa-progress-fill h-full rounded-full"
              style={{ width: p < currentPhase ? '100%' : p === currentPhase ? '60%' : '0%' }}
            />
          </div>
        ))}
      </div>
      <div className="px-6 pb-2.5 text-right max-w-[640px] mx-auto">
        <span className="text-[12px] text-[#7c8884]">
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
  const reduceMotion = useReducedMotion();

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
    <div className="flex flex-col min-h-screen text-[var(--qa-text-primary)]" dir="rtl">
      <PhaseProgressBar currentIndex={questionIndex} />

      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -28 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 max-w-[640px] w-full mx-auto"
        >
        {question.context && (
          <p className="text-[12px] font-medium tracking-wider text-[#0e7a6e] mb-2.5 text-right">
            {question.context}
          </p>
        )}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-[23px] md:text-[28px] font-bold leading-snug mb-2 text-right outline-none text-[#15302d]"
        >
          {question.text}
        </h2>
        {question.microCopy && (
          <p className="text-[13px] text-[#7c8884] mb-6 text-right">
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
                  w-full min-h-[58px] text-right px-5 py-3.5 rounded-2xl border backdrop-blur-sm
                  text-[15px] md:text-[16px] font-normal leading-relaxed
                  transition-all duration-200 cursor-pointer
                  flex items-center justify-between gap-3
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e]
                  ${isSelected
                    ? 'border-[#0e7a6e] bg-[#0e7a6e]/[0.08] text-[#15302d] shadow-[0_0_30px_-12px_rgba(20,184,166,0.6)]'
                    : isDimmed
                      ? 'border-[#e6eef0] bg-white text-[#7c8884] opacity-50'
                      : 'border-[#dce7ea] bg-white text-[#15302d] hover:border-[#0e7a6e]/40 hover:bg-[#f1f6f8] active:scale-[0.99]'
                  }
                `}
              >
                <span className="flex-1 text-right">{opt.text}</span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-l from-teal-500 to-emerald-500 text-white inline-flex items-center justify-center"
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
          <p className="mt-5 text-[13px] font-semibold text-[#0e7a6e] text-right">
            ← בחרי תשובה אחת כדי להמשיך
          </p>
        )}
        </motion.div>
      </AnimatePresence>
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

  const quizStartFired = useRef(false);
  useEffect(() => {
    // Guard against React StrictMode's double-invoke (mount→unmount→remount in dev),
    // which otherwise fires quiz_start twice ~2ms apart. The ref persists across the
    // remount, so the event is emitted exactly once per real mount.
    if (quizStartFired.current) return;
    quizStartFired.current = true;

    trackEvent('quiz_start');
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', { content_name: 'quiz_start' });
    }
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
      questionIndex={currentIndex}
      onAnswer={handleAnswer}
    />
  );
}
