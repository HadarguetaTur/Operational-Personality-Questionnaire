'use client';

import React, { useState } from 'react';
import { AnswerOption } from '@/lib/quiz/types';

interface AnswerButtonsProps {
  answers: AnswerOption[];
  onSelect: (answer: AnswerOption) => void;
  disabled: boolean;
}

const SELECTION_DELAY_MS = 180;

export const AnswerButtons: React.FC<AnswerButtonsProps> = ({ answers, onSelect, disabled }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = (answer: AnswerOption) => {
    if (disabled || selectedId) return;
    setSelectedId(answer.id);

    setTimeout(() => {
      onSelect(answer);
    }, SELECTION_DELAY_MS);
  };

  return (
    <div className="flex flex-col gap-3 w-full qa-stagger text-right" role="radiogroup" dir="rtl">
      {answers.map((answer) => {
        const isSelected = selectedId === answer.id;
        const isOther = selectedId !== null && !isSelected;

        return (
          <button
            key={answer.id}
            onClick={() => handleClick(answer)}
            disabled={disabled || selectedId !== null}
            role="radio"
            aria-checked={isSelected}
            className={`
              w-full min-h-[64px] text-right px-6 py-4 rounded-[12px] border
              text-[16px] md:text-[17px] font-normal leading-relaxed
              transition-all duration-200 cursor-pointer
              flex items-center justify-between gap-3
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)]
              ${isSelected
                ? 'border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-text-primary)] qa-answer-selected'
                : isOther
                  ? 'border-[var(--qa-border-light)] bg-[var(--qa-surface)] text-[var(--qa-text-muted)] opacity-50'
                  : disabled
                    ? 'border-[var(--qa-border)] text-[var(--qa-text-muted)] opacity-50 cursor-not-allowed bg-[var(--qa-surface)]'
                    : 'border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] hover:border-[var(--qa-accent)] hover:bg-[var(--qa-accent-hover)] active:scale-[0.99]'
              }
            `}
          >
            <span className="flex-1 text-right">{answer.text}</span>
            {isSelected && (
              <span
                aria-hidden="true"
                className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent)] text-white inline-flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
