import React, { useState } from 'react';
import { AnswerOption } from '../types';

interface AnswerButtonsProps {
  answers: AnswerOption[];
  onSelect: (answer: AnswerOption) => void;
  disabled: boolean;
}

export const AnswerButtons: React.FC<AnswerButtonsProps> = ({ answers, onSelect, disabled }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = (answer: AnswerOption) => {
    if (disabled || selectedId) return;
    setSelectedId(answer.id);

    // Brief visual feedback, then fire
    setTimeout(() => {
      onSelect(answer);
    }, 350);
  };

  return (
    <div className="flex flex-col gap-3 w-full qa-stagger text-right" dir="rtl">
      {answers.map((answer) => {
        const isSelected = selectedId === answer.id;
        const isOther = selectedId !== null && !isSelected;

        return (
          <button
            key={answer.id}
            onClick={() => handleClick(answer)}
            disabled={disabled || selectedId !== null}
            className={`
              w-full min-h-[64px] text-right px-6 py-4 rounded-[12px] border
              text-[16px] md:text-[17px] font-normal leading-relaxed
              transition-all duration-200 cursor-pointer
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
            {answer.text}
          </button>
        );
      })}
    </div>
  );
};
