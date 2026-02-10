import React from 'react';

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
  isTyping?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ text, isUser, isTyping }) => {
  if (isTyping) {
    return (
      <div className="flex w-full mb-6 animate-fade-in">
        <div className="bg-white border border-gray-100 text-gray-800 p-5 rounded-3xl rounded-tr-sm ml-auto shadow-sm max-w-[80%] flex gap-1.5 items-center justify-center min-h-[3.5rem]">
           <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-pulse"></span>
           <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-pulse delay-150"></span>
           <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-pulse delay-300"></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 animate-fade-in ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div 
        className={`p-5 rounded-3xl max-w-[85%] md:max-w-[70%] text-base md:text-lg leading-relaxed shadow-sm transition-all hover:shadow-md
        ${isUser 
          ? 'bg-purple-600 text-white rounded-br-sm shadow-purple-500/20' 
          : 'bg-white text-slate-800 rounded-tr-sm border border-slate-100 shadow-slate-200/50'
        }`}
      >
        {text}
      </div>
    </div>
  );
};