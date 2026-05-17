'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { SHORT_QUIZ_QUESTIONS, Q6_TO_RESULT, ShortQuizOption } from '@/config/shortQuizConfig';

type FlowPhase = 'questions' | 'transition' | 'form' | 'confirmation';

const TOTAL_QUESTIONS = SHORT_QUIZ_QUESTIONS.length;
const AUTO_ADVANCE_MS = 320;

function phoneDigitsOnly(v: string) {
  return v.replace(/\D/g, '');
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

  const progress = Math.round(((questionIndex) / TOTAL_QUESTIONS) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)]" dir="rtl">
      {/* Progress */}
      <div className="sticky top-0 z-50 bg-[var(--qa-bg)]">
        <div className="w-full h-1.5 bg-[var(--qa-border-light)] overflow-hidden">
          <div
            className="qa-progress-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="px-6 md:px-8 py-3 text-right">
          <span className="text-[13px] text-[var(--qa-text-muted)]">
            שאלה {questionIndex + 1} מתוך {TOTAL_QUESTIONS}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 max-w-[640px] w-full mx-auto">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-[22px] md:text-[26px] font-semibold leading-snug mb-8 text-right outline-none"
        >
          {question.text}
        </h2>
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
                  w-full min-h-[56px] text-right px-5 py-3.5 rounded-[12px] border
                  text-[15px] md:text-[16px] font-normal leading-relaxed
                  transition-all duration-200 cursor-pointer
                  flex items-center justify-between gap-3
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)]
                  ${isSelected
                    ? 'border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-text-primary)]'
                    : isDimmed
                      ? 'border-[var(--qa-border-light)] bg-[var(--qa-surface)] text-[var(--qa-text-muted)] opacity-40'
                      : 'border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] hover:border-[var(--qa-accent)] hover:bg-[var(--qa-accent-hover)] active:scale-[0.99]'
                  }
                `}
              >
                <span className="flex-1 text-right">{opt.text}</span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent)] text-white inline-flex items-center justify-center"
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
          <p className="mt-4 text-[12px] text-[var(--qa-text-muted)] text-right">
            בחרי תשובה אחת כדי להמשיך
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Transition screen ────────────────────────────────────────────────────────

function TransitionScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] items-center justify-center px-6 md:px-8" dir="rtl">
      <div className="max-w-[560px] w-full text-right">
        <div className="mb-6 inline-block text-[32px]">✓</div>
        <h2 className="text-[26px] md:text-[30px] font-bold leading-snug mb-5 text-[var(--qa-text-primary)]">
          מצאתי את נקודת העומס המרכזית שלך
        </h2>
        <p className="text-[16px] md:text-[17px] text-[var(--qa-text-secondary)] leading-relaxed mb-3">
          יש כאן דפוס מאוד ברור.
        </p>
        <p className="text-[16px] md:text-[17px] text-[var(--qa-text-secondary)] leading-relaxed mb-8">
          תוך רגע אני מסדרת לך דוח קצר ומדויק: מה נופל בין הכיסאות, למה זה מרגיש כל כך כבד, ומה כדאי לסדר קודם כדי להוריד עומס כבר עכשיו.
        </p>
        <p className="text-[13px] text-[var(--qa-text-muted)] mb-8">
          בלי הרצאה ובלי תיאוריה מיותרת — רק סדר פרקטי שמתאים לעסק שירות כמוך.
        </p>
        <button
          onClick={onContinue}
          className="w-full py-4 px-6 rounded-[12px] bg-[var(--qa-accent)] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150"
        >
          תני לי את הדוח הקצר שלי
        </button>
      </div>
    </div>
  );
}

// ─── Lead form ────────────────────────────────────────────────────────────────

interface LeadFormProps {
  onSubmit: (name: string, phone: string, email: string | null) => Promise<void>;
  submitting: boolean;
  error: string;
}

function LeadForm({ onSubmit, submitting, error }: LeadFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const phoneHint = useMemo(() => {
    if (!touched.phone || !phone.trim()) return '';
    const d = phoneDigitsOnly(phone);
    if (d.length < 7 || d.length > 15) return 'נא להזין מספר וואטסאפ תקין.';
    return '';
  }, [phone, touched.phone]);

  const nameHint = useMemo(() => {
    if (!touched.name) return '';
    if (!name.trim()) return 'נא להזין את שמך.';
    return '';
  }, [name, touched.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true });
    if (!name.trim() || phoneDigitsOnly(phone).length < 7) return;
    if (!consent) return;
    const trimmedEmail = email.trim() || null;
    await onSubmit(name.trim(), phone.trim(), trimmedEmail);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] items-center justify-center px-6 md:px-8" dir="rtl">
      <div className="max-w-[480px] w-full text-right">
        <h2 className="text-[24px] md:text-[28px] font-bold mb-2 text-[var(--qa-text-primary)]">
          לאן לשלוח לך את הדוח הקצר?
        </h2>
        <p className="text-[14px] text-[var(--qa-text-muted)] mb-8 leading-relaxed">
          זה אישי וקצר, לא ספאם. אני שולחת לך סיכום ברור + צעד ראשון שמתאים למה שענית.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-[14px] font-medium text-[var(--qa-text-secondary)] mb-1.5">
              שם פרטי
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="איך לפנות אלייך?"
              className="w-full px-4 py-3 rounded-[10px] border border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] text-[15px] placeholder:text-[var(--qa-text-muted)] focus:outline-none focus:border-[var(--qa-accent)] transition-colors"
              dir="rtl"
            />
            {nameHint && <p className="mt-1 text-[12px] text-red-500">{nameHint}</p>}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-[14px] font-medium text-[var(--qa-text-secondary)] mb-1.5">
              וואטסאפ
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="050-0000000"
              className="w-full px-4 py-3 rounded-[10px] border border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] text-[15px] placeholder:text-[var(--qa-text-muted)] focus:outline-none focus:border-[var(--qa-accent)] transition-colors"
              dir="ltr"
            />
            {phoneHint && <p className="mt-1 text-[12px] text-red-500">{phoneHint}</p>}
          </div>

          {/* Email (optional) */}
          <div>
            <label className="block text-[14px] font-medium text-[var(--qa-text-secondary)] mb-1.5">
              מייל <span className="text-[var(--qa-text-muted)] font-normal">(אופציונלי, אם תרצי גם עותק)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-[10px] border border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] text-[15px] placeholder:text-[var(--qa-text-muted)] focus:outline-none focus:border-[var(--qa-accent)] transition-colors"
              dir="ltr"
            />
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 shrink-0 accent-[var(--qa-accent)]"
            />
            <span className="text-[13px] text-[var(--qa-text-muted)] leading-relaxed group-hover:text-[var(--qa-text-secondary)] transition-colors">
              בלחיצה את מאשרת שאפשר לשלוח לך את הדוח והודעת וואטסאפ אחת אישית להמשך.
            </span>
          </label>

          {error && (
            <p className="text-[13px] text-red-500 text-right">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !consent}
            className="w-full py-4 px-6 rounded-[12px] bg-[var(--qa-accent)] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'שומרת...' : 'שלחי לי את הדוח הקצר שלי'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({ reportToken }: { reportToken: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] items-center justify-center px-6 md:px-8" dir="rtl">
      <div className="max-w-[520px] w-full text-right">
        <div className="mb-5 text-[40px]">🎯</div>
        <h2 className="text-[26px] md:text-[30px] font-bold mb-4 text-[var(--qa-text-primary)]">
          הדוח בדרך
        </h2>
        <p className="text-[16px] text-[var(--qa-text-secondary)] leading-relaxed mb-3">
          קיבלתי את הפרטים שלך. אני אשלח לך הודעת וואטסאפ אישית קצרה עם הדוח וצעד ראשון מותאם.
        </p>
        <p className="text-[14px] text-[var(--qa-text-muted)] leading-relaxed mb-8">
          בינתיים, הדוח שלך מוכן לצפייה עכשיו.
        </p>
        <button
          onClick={() => router.push(`/quiz/result/${reportToken}`)}
          className="w-full py-4 px-6 rounded-[12px] bg-[var(--qa-accent)] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150"
        >
          צפייה בדוח הקצר שלי
        </button>
      </div>
    </div>
  );
}

// ─── Main flow orchestrator ───────────────────────────────────────────────────

export default function ShortQuizFlow() {
  const [phase, setPhase] = useState<FlowPhase>('questions');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [resultId, setResultId] = useState<string>('GENERAL');
  const [reportToken, setReportToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    trackEvent('quiz_start');
  }, []);

  const handleAnswer = useCallback(
    (optionId: string) => {
      const newAnswers = [...answers, optionId];
      setAnswers(newAnswers);

      if (currentIndex === TOTAL_QUESTIONS - 1) {
        // Last question → determine result from Q6 answer
        const result = Q6_TO_RESULT[optionId] ?? 'GENERAL';
        setResultId(result);
        setPhase('transition');
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [answers, currentIndex],
  );

  const handleFormSubmit = async (name: string, phone: string, email: string | null) => {
    setSubmitting(true);
    setFormError('');

    const supabase = createClient();
    if (!supabase) {
      setFormError('שגיאה בחיבור — נסי שוב.');
      setSubmitting(false);
      return;
    }

    try {
      const answersJson = SHORT_QUIZ_QUESTIONS.reduce<Record<string, string>>(
        (acc, q, idx) => { acc[q.id] = answers[idx] ?? ''; return acc; },
        {},
      );

      const { data: token, error } = await supabase.rpc('create_short_quiz_lead', {
        p_name: name,
        p_phone: phone,
        p_email: email,
        p_short_result_id: resultId,
        p_answers_json: answersJson,
        p_marketing_consent: true,
      });

      if (error || !token) {
        console.error('create_short_quiz_lead error:', error);
        setFormError('אירעה שגיאה בשמירה. נסי שוב.');
        setSubmitting(false);
        return;
      }

      setReportToken(token as string);
      setPhase('confirmation');
    } catch (err) {
      console.error(err);
      setFormError('אירעה שגיאה בלתי צפויה. נסי שוב.');
      setSubmitting(false);
    }
  };

  if (phase === 'questions') {
    return (
      <QuestionScreen
        key={currentIndex}
        questionIndex={currentIndex}
        onAnswer={handleAnswer}
      />
    );
  }

  if (phase === 'transition') {
    return <TransitionScreen onContinue={() => setPhase('form')} />;
  }

  if (phase === 'form') {
    return (
      <LeadForm
        onSubmit={handleFormSubmit}
        submitting={submitting}
        error={formError}
      />
    );
  }

  return <ConfirmationScreen reportToken={reportToken} />;
}
