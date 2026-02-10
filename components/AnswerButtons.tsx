import React from 'react';
import { AnswerOption } from '../types';

interface AnswerButtonsProps {
  answers: AnswerOption[];
  onSelect: (answer: AnswerOption) => void;
  disabled: boolean;
}

export const AnswerButtons: React.FC<AnswerButtonsProps> = ({ answers, onSelect, disabled }) => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
      {answers.map((answer) => (
        <button
          key={answer.id}
          onClick={() => onSelect(answer)}
          disabled={disabled}
          className={`
            w-full text-right p-5 rounded-2xl border transition-all duration-300 font-medium text-base relative group
            ${disabled 
              ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50' 
              : 'border-slate-100 bg-white/60 hover:bg-purple-50/50 hover:border-purple-200 text-slate-700 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 active:scale-[0.99]'
            }
          `}
        >
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-colors ${disabled ? 'bg-gray-200' : 'bg-purple-200 group-hover:bg-purple-500'}`}></span>
          {answer.text}
        </button>
      ))}
    </div>
  );
};