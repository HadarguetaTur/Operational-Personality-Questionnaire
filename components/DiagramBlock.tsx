import React from 'react';

interface DiagramBlockProps {
  title: string;
  ascii: string;
}

export const DiagramBlock: React.FC<DiagramBlockProps> = ({ title, ascii }) => {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center font-mono text-xs md:text-sm whitespace-pre overflow-x-auto text-gray-600">
      <div className="font-bold text-gray-400 mb-2 font-sans tracking-widest">{title}</div>
      {ascii}
    </div>
  );
};