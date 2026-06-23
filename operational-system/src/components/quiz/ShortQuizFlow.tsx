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

type FlowPhase = 'intro' | 'questions' | 'lead';

const AUTO_ADVANCE_MS = 320;

// ─── Intro screen (hero, matches home page) ────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center px-6 md:px-8 py-16 text-center"
      dir="rtl"
    >
      <div className="max-w-[560px] mx-auto">
        <span className="inline-block text-[13px] font-medium tracking-wider text-teal-400 mb-5">
          אבחון קצר לעסק
        </span>
        <h1 className="text-[34px] md:text-[44px] font-extrabold leading-[1.15] tracking-tight mb-5">
          <span className="qa-gradient-text">איפה הכסף נתקע בעסק שלך?</span>
        </h1>
        <p className="text-[17px] md:text-[18px] text-white/70 leading-relaxed mb-3">
          כמה דקות, כמה שאלות, ובסוף תמונה ברורה של המקום שהכי מעכב את העסק שלך.
        </p>
        <p className="text-[14px] text-white/40 mb-9">
          {TOTAL_QUESTIONS} שאלות קצרות · 4 תחומים · תמונה אחת
        </p>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center gap-2.5 min-h-[58px] px-10 rounded-2xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white text-[17px] font-bold tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] transition-all duration-300 hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
        >
          מתחילות
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PhaseProgressBar({ currentIndex }: { currentIndex: number }) {
  const currentQ = SHORT_QUIZ_QUESTIONS[currentIndex];
  const currentPhase = currentQ?.phase ?? 1;
  const phases: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div className="sticky top-0 z-50 bg-[var(--qa-bg)]/80 backdrop-blur-md border-b border-white/[0.06]">
      <div className="flex justify-between px-4 pt-3 pb-1 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <span
            key={p}
            className={`text-[11px] font-medium tracking-wide transition-colors ${
              p === currentPhase
                ? 'text-teal-400'
                : p < currentPhase
                ? 'text-white/55'
                : 'text-white/25'
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
        <span className="text-[12px] text-white/40">
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
    <div className="flex flex-col min-h-screen text-[var(--qa-text-primary)]" dir="rtl">
      <PhaseProgressBar currentIndex={questionIndex} />

      <div key={questionIndex} className="qa-fade-slide flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 max-w-[640px] w-full mx-auto">
        {question.context && (
          <p className="text-[12px] font-medium tracking-wider text-teal-400 mb-2.5 text-right">
            {question.context}
          </p>
        )}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-[23px] md:text-[28px] font-bold leading-snug mb-2 text-right outline-none text-white"
        >
          {question.text}
        </h2>
        {question.microCopy && (
          <p className="text-[13px] text-white/45 mb-6 text-right">
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
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300
                  ${isSelected
                    ? 'border-teal-500 bg-teal-500/[0.08] text-white shadow-[0_0_30px_-12px_rgba(20,184,166,0.6)]'
                    : isDimmed
                      ? 'border-white/[0.04] bg-white/[0.01] text-white/40 opacity-50'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/90 hover:border-teal-500/40 hover:bg-white/[0.05] active:scale-[0.99]'
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
          <p className="mt-5 text-[13px] font-semibold text-teal-400/70 text-right">
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
  const [phase, setPhase] = useState<FlowPhase>('intro');
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

  if (phase === 'intro') {
    return <IntroScreen onStart={() => setPhase('questions')} />;
  }

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
