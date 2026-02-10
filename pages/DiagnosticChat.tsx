import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnosticConfig } from '../config/diagnosticConfig';
import { UserState, Question, AnswerOption } from '../types';
import { updateScores } from '../engine/scoring';
import { calculateBranches } from '../engine/branching';
import { initialScores } from '../engine/scoring';
import { ChatBubble } from '../components/ChatBubble';
import { AnswerButtons } from '../components/AnswerButtons';

const DiagnosticChat: React.FC = () => {
  const navigate = useNavigate();
  // We use a ref for the scrollable container instead of a bottom element
  const scrollRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<UserState>({
    answers: {},
    scores: initialScores,
    maxScores: initialScores,
    questionQueue: diagnosticConfig.questions.map(q => q.id),
    currentQuestionIndex: 0,
    completed: false,
    history: [],
    startTime: Date.now(),
    userInfo: { name: '', email: '' }
  });

  const [chatHistory, setChatHistory] = useState<{ id: string; text: string; isUser: boolean }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const currentQuestionId = state.questionQueue[state.currentQuestionIndex];
  
  // Find current question object. Check main list or branch lists.
  const findQuestion = (id: string): Question | undefined => {
    let q = diagnosticConfig.questions.find(q => q.id === id);
    if (!q) {
      Object.values(diagnosticConfig.branchQuestions).forEach(list => {
        const found = list.find(bq => bq.id === id);
        if (found) q = found;
      });
    }
    return q;
  };

  const currentQuestion = findQuestion(currentQuestionId);

  // Initialize first message
  useEffect(() => {
    if (state.currentQuestionIndex === 0 && chatHistory.length === 0 && currentQuestion) {
      setIsTyping(true);
      setTimeout(() => {
        setChatHistory([{ id: 'init', text: currentQuestion.text, isUser: false }]);
        setIsTyping(false);
        setShowAnswers(true);
      }, 600);
    }
  }, [state.currentQuestionIndex, chatHistory.length, currentQuestion]);

  // Auto scroll - Force scroll to bottom whenever content changes
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      // Use a timeout to ensure the DOM has updated (e.g., new bubble added, answers shown)
      setTimeout(() => {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 150);
    }
  }, [chatHistory, isTyping, showAnswers, showLeadForm]);

  const handleAnswer = (answer: AnswerOption) => {
    if (!currentQuestion) return;
    
    setShowAnswers(false);
    
    // Add user bubble
    setChatHistory(prev => [...prev, { id: `ans-${Date.now()}`, text: answer.text, isUser: true }]);

    // Update state
    const { scores, maxScores } = updateScores(state.scores, state.maxScores, answer);
    
    const newState = {
      ...state,
      answers: { ...state.answers, [currentQuestion.id]: answer.id },
      scores,
      maxScores,
      history: [...state.history, { questionId: currentQuestion.id, answerText: answer.text }]
    };

    // Check branching if Layer A is done
    const currentIsLayerA = currentQuestion.layer === "A";
    let nextQueue = [...state.questionQueue];
    
    // If this was the last A question (A5), trigger branching calculation
    if (currentQuestion.id === "A5") {
      const branches = calculateBranches(newState);
      nextQueue = [...nextQueue, ...branches];
    }

    const nextIndex = state.currentQuestionIndex + 1;

    if (nextIndex < nextQueue.length) {
      // Proceed to next
      setState({
        ...newState,
        questionQueue: nextQueue,
        currentQuestionIndex: nextIndex
      });

      // Show typing then next question
      setIsTyping(true);
      setTimeout(() => {
        const nextQId = nextQueue[nextIndex];
        const nextQ = findQuestion(nextQId);
        if (nextQ) {
          setChatHistory(prev => [...prev, { id: `q-${nextQId}`, text: nextQ.text, isUser: false }]);
          setIsTyping(false);
          setShowAnswers(true);
        }
      }, 800);

    } else {
      // Questions Complete -> Show Lead Form
      setState({ ...newState, completed: true });
      setIsTyping(true);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { id: 'pre-lead', text: "תודה רבה! עיבדתי את הנתונים שלך.", isUser: false }]);
        setTimeout(() => {
            setShowLeadForm(true);
            setIsTyping(false);
        }, 800);
      }, 600);
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const finalState = { ...state, userInfo: formData };
    
    // Save and Navigate
    localStorage.setItem('diagnosticResult', JSON.stringify(finalState));
    navigate('/result');
  };

  // Progress Calculation
  const progressPercent = Math.min(100, Math.round(((state.currentQuestionIndex) / state.questionQueue.length) * 100));

  if (!currentQuestion && !state.completed) return <div className="flex items-center justify-center h-full bg-slate-50">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative font-sans">
      
      {/* Modern Progress Bar - Purple Gradient */}
      <div className="bg-slate-100 h-1.5 w-full sticky top-0 z-30">
        <div 
          className="bg-gradient-to-l from-purple-600 to-fuchsia-500 h-1.5 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(147,51,234,0.5)]" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Main Chat Area - Scroll Container */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 hide-scrollbar bg-slate-50/50 scroll-smooth"
      >
        <div className="max-w-3xl mx-auto pt-6 pb-24 space-y-8 flex flex-col">
          {chatHistory.map((msg) => (
             <ChatBubble key={msg.id} text={msg.text} isUser={msg.isUser} />
          ))}
          
          {isTyping && <ChatBubble text="" isUser={false} isTyping />}
          
          {/* Lead Form Embedded in Chat Flow */}
          {showLeadForm && (
            <div className="animate-fade-in-up mt-8 mb-12">
               <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 max-w-md ml-auto mr-auto ring-1 ring-black/5">
                 <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto text-2xl">✨</div>
                 <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">הדוח שלך מוכן</h3>
                 <p className="text-slate-600 mb-8 text-center text-base">שלחי לנו את הפרטים כדי שנוכל להתאים את ההמלצות הסופיות ולשלוח עותק למייל.</p>
                 <form onSubmit={handleLeadSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">שם מלא</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="איך לקרוא לך?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">מייל לקבלת הדוח</label>
                      <input 
                        type="email" 
                        required
                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="your@email.com"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-500/30 active:scale-[0.98] mt-2 text-lg"
                    >
                      הצג תוצאות
                    </button>
                 </form>
               </div>
            </div>
          )}

          {/* Inline Answers - Natural Flow */}
          {showAnswers && !state.completed && !showLeadForm && (
            <div className="animate-fade-in mt-6 mb-8 w-full flex flex-col items-center">
               <div className="w-full max-w-2xl">
                 <div className="text-center text-xs font-medium text-slate-400 mb-4 tracking-wider uppercase">
                   אפשרויות תשובה
                 </div>
                 <AnswerButtons 
                   answers={currentQuestion.answers} 
                   onSelect={handleAnswer} 
                   disabled={isTyping} 
                 />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticChat;