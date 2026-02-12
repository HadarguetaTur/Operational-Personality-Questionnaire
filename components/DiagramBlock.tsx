import React from 'react';

interface DiagramBlockProps {
  title: string;
  ascii: string;
}

export const DiagramBlock: React.FC<DiagramBlockProps> = ({ title, ascii }) => {
  return (
    <div className="border border-[var(--qa-border)] rounded-lg p-5 bg-[var(--qa-bg)] font-mono text-xs md:text-sm whitespace-pre overflow-x-auto text-[var(--qa-text-primary)]" dir="rtl">
      <div className="font-medium text-[var(--qa-text-secondary)] mb-2 font-sans text-right">{title}</div>
      <div className="text-center">{ascii}</div>
    </div>
  );
};