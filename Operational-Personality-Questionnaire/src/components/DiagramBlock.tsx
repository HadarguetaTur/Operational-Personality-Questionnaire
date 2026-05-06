import React from 'react';

interface DiagramBlockProps {
  title: string;
  ascii: string;
}

export const DiagramBlock: React.FC<DiagramBlockProps> = ({ title, ascii }) => {
  return (
    <figure
      className="border border-[var(--qa-border)] rounded-lg p-5 bg-[var(--qa-bg)] font-mono text-xs md:text-sm whitespace-pre overflow-x-auto text-[var(--qa-text-primary)]"
      dir="rtl"
      role="img"
      aria-label={`תרשים סכמטי: ${title}`}
    >
      <figcaption className="font-medium text-[var(--qa-text-secondary)] mb-2 font-sans text-right">{title}</figcaption>
      <div className="text-center" aria-hidden="true">{ascii}</div>
    </figure>
  );
};