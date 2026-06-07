'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import {
  SHORT_QUIZ_QUESTIONS,
  TOTAL_QUESTIONS,
  PHASE_NAMES,
  buildAnswerMap,
  ShortQuizOption,
} from '@/config/shortQuizConfig';
import { calcROI, formatILS } from '@/lib/calculator/roiCalculator';
import type { ROIResult } from '@/lib/calculator/types';
import type { ROIInputs } from '@/lib/calculator/types';
import { ROI_QUIZ_RESULTS, DISCLAIMER_TEXT } from '@/config/shortQuizResults';

type FlowPhase = 'questions' | 'result_preview' | 'form';

const AUTO_ADVANCE_MS = 320;

function phoneDigitsOnly(v: string) {
  return v.replace(/\D/g, '');
}

// ─── Build ROI inputs from answer map ────────────────────────────────────────

function buildROIInputs(answers: string[]): ROIInputs {
  const map = buildAnswerMap(answers);

  const q1 = map['Q1'];
  const q2 = map['Q2'];
  const q3 = map['Q3'];
  const q4 = map['Q4'];
  const q5 = map['Q5'];
  const q6 = map['Q6'];
  const q7 = map['Q7'];
  const q8 = map['Q8'];
  const q9 = map['Q9'];
  const q10 = map['Q10'];

  return {
    monthly_inquiries: {
      low: q1?.low ?? 7,
      mid: q1?.mid ?? 7,
      high: q1?.high ?? 7,
    },
    avg_customer_value: {
      low: q2?.low ?? 1000,
      mid: q2?.mid ?? 1000,
      high: q2?.high ?? 1000,
    },
    close_rate: q3?.rate ?? 0.07,
    close_rate_is_default: q3?.isDefault ?? false,
    at_risk_rate: q4?.rate ?? 0.45,
    at_risk_is_default: q4?.isDefault ?? false,
    dispersion_score: q5?.dispersionScore ?? 2,
    weekly_manual_hours: {
      low: q6?.low ?? 2,
      high: q6?.high ?? 3,
    },
    weekly_collection_hours: {
      low: q7?.low ?? 0.5,
      high: q7?.high ?? 1.5,
    },
    hourly_value: {
      low: q8?.low ?? 90,
      mid: q8?.mid ?? 120,
      high: q8?.high ?? 150,
    },
    response_speed: q9?.responseSpeed ?? 'MODERATE',
    primary_pain: q10?.resultType ?? 'CENTRALIZED',
  };
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PhaseProgressBar({ currentIndex }: { currentIndex: number }) {
  const currentQ = SHORT_QUIZ_QUESTIONS[currentIndex];
  const currentPhase = currentQ?.phase ?? 1;
  const phases: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div className="sticky top-0 z-50 bg-[var(--qa-bg)]">
      {/* Phase labels */}
      <div className="flex justify-between px-4 pt-2 pb-1 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <span
            key={p}
            className={`text-[11px] font-medium transition-colors ${
              p === currentPhase
                ? 'text-[var(--qa-accent)]'
                : p < currentPhase
                ? 'text-[var(--qa-text-muted)]'
                : 'text-[var(--qa-border)]'
            }`}
          >
            {PHASE_NAMES[p]}
          </span>
        ))}
      </div>
      {/* Progress segments */}
      <div className="flex gap-1 px-4 pb-3 max-w-[640px] mx-auto">
        {phases.map((p) => (
          <div key={p} className="flex-1 h-1 rounded-full bg-[var(--qa-border-light)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--qa-accent)] transition-all duration-500"
              style={{ width: p < currentPhase ? '100%' : p === currentPhase ? '60%' : '0%' }}
            />
          </div>
        ))}
      </div>
      <div className="px-6 pb-2 text-right max-w-[640px] mx-auto">
        <span className="text-[12px] text-[var(--qa-text-muted)]">
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
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)]" dir="rtl">
      <PhaseProgressBar currentIndex={questionIndex} />

      <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-12 max-w-[640px] w-full mx-auto">
        {question.context && (
          <p className="text-[12px] font-medium text-[var(--qa-accent)] mb-2 text-right opacity-80">
            {question.context}
          </p>
        )}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-[22px] md:text-[26px] font-semibold leading-snug mb-2 text-right outline-none"
        >
          {question.text}
        </h2>
        {question.microCopy && (
          <p className="text-[12px] text-[var(--qa-text-muted)] mb-6 text-right">
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
          <p className="mt-5 text-[13px] font-semibold text-[var(--qa-accent)] text-right opacity-70">
            ← בחרי תשובה אחת כדי להמשיך
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ROI Result Preview ───────────────────────────────────────────────────────

function AccuracyDots({ level }: { level: string }) {
  const filled = level === 'גבוהה' ? 4 : level === 'בינונית' ? 2 : 1;
  return (
    <span className="inline-flex gap-1 mr-1 align-middle">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            i <= filled ? 'bg-[var(--qa-accent)]' : 'bg-[var(--qa-border)]'
          }`}
        />
      ))}
    </span>
  );
}

function ResultPreviewScreen({
  roi,
  onContinue,
}: {
  roi: ROIResult;
  onContinue: () => void;
}) {
  const resultContent = ROI_QUIZ_RESULTS[roi.result_type];
  const { components: c, show_cap_message, accuracy_level, confidence_notes } = roi;

  return (
    <div
      className="flex flex-col min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] py-10 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto w-full text-right">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[13px] font-medium text-[var(--qa-text-muted)] uppercase tracking-wide mb-2">
            {resultContent.headline}
          </p>
          <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-accent)] mb-4">
            📍 {resultContent.tagline}
          </span>
          <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed">
            {resultContent.explanation}
          </p>
        </div>

        {/* Main number or cap message */}
        {show_cap_message ? (
          <div className="mb-6 p-5 rounded-[14px] border border-orange-300/40 bg-orange-50/10">
            <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed">
              ⚠️ זוהתה עלות שנתית גבוהה. כדאי לבצע בדיקה פרטנית לפני הצגת סכום מדויק.
            </p>
          </div>
        ) : (
          <div className="mb-6 p-5 rounded-[14px] border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)]">
            <p className="text-[13px] text-[var(--qa-text-muted)] mb-1">עלות שנתית מוערכת</p>
            <p className="text-[28px] md:text-[32px] font-bold text-[var(--qa-text-primary)]">
              {formatILS(c.total_low)} – {formatILS(c.total_high)}
            </p>
            <p className="text-[12px] text-[var(--qa-text-muted)] mt-1">
              טווח המבוסס על גבולות הטווחים שסיפקת
            </p>
          </div>
        )}

        {/* Efficiency potential */}
        {!show_cap_message && (
          <div className="mb-6 p-4 rounded-[12px] bg-[var(--qa-surface)] border border-[var(--qa-border)]">
            <p className="text-[13px] text-[var(--qa-text-muted)] mb-1">פוטנציאל התייעלות ראשוני</p>
            <p className="text-[18px] font-semibold text-[var(--qa-text-primary)]">
              {formatILS(c.efficiency_low)} – {formatILS(c.efficiency_high)} בשנה
            </p>
            <p className="text-[12px] text-[var(--qa-text-muted)] mt-1">
              זהו טווח הערכה בלבד, בכפוף לבדיקה של התהליך בפועל.
            </p>
          </div>
        )}

        {/* Accuracy */}
        <div className="mb-6 flex items-start gap-2 text-[13px] text-[var(--qa-text-muted)]">
          <span className="shrink-0 mt-0.5">רמת דיוק:</span>
          <span>
            <AccuracyDots level={accuracy_level} />
            <span className="font-medium text-[var(--qa-text-secondary)]">{accuracy_level}</span>
            {confidence_notes && (
              <span className="block mt-0.5 text-[12px]">{confidence_notes}</span>
            )}
          </span>
        </div>

        {/* Disclaimer */}
        <p className="mb-8 text-[12px] text-[var(--qa-text-muted)] leading-relaxed border-t border-[var(--qa-border-light)] pt-4">
          ⚠️ {DISCLAIMER_TEXT}
        </p>

        {/* CTA */}
        <div className="text-center">
          <p className="text-[15px] text-[var(--qa-text-secondary)] mb-4 leading-relaxed">
            ראית איפה כסף נופל בדרך. בואי נבדוק אם אני יכולה לעזור לך לשמור אותו אצלך.
          </p>
          <button
            onClick={onContinue}
            className="w-full py-4 px-6 rounded-[12px] bg-[var(--qa-accent)] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150"
          >
            בדקי אם אפשר לשמור יותר כסף אצלך ←
          </button>
        </div>
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

  const emailHint = useMemo(() => {
    if (!touched.email || !email.trim()) return '';
    if (!/.+@.+\..+/.test(email.trim())) return 'נא להזין כתובת מייל תקינה.';
    return '';
  }, [email, touched.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true });
    if (!name.trim() || phoneDigitsOnly(phone).length < 7) return;
    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) return;
    if (!consent) return;
    await onSubmit(name.trim(), phone.trim(), email.trim());
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--qa-bg)] items-center justify-center px-6 md:px-8" dir="rtl">
      <div className="max-w-[480px] w-full text-right">
        <h2 className="text-[24px] md:text-[28px] font-bold mb-2 text-[var(--qa-text-primary)]">
          בואי נבדוק אם אפשר לשמור יותר כסף אצלך
        </h2>
        <p className="text-[14px] text-[var(--qa-text-muted)] mb-8 leading-relaxed">
          השאירי פרטים ונמשיך לבדוק אם יש כאן תהליך שכדאי לסדר, ומה הצעד הראשון הנכון.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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

          <div>
            <label className="block text-[14px] font-medium text-[var(--qa-text-secondary)] mb-1.5">
              מייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-[10px] border border-[var(--qa-border)] bg-[var(--qa-surface)] text-[var(--qa-text-primary)] text-[15px] placeholder:text-[var(--qa-text-muted)] focus:outline-none focus:border-[var(--qa-accent)] transition-colors"
              dir="ltr"
            />
            {emailHint && <p className="mt-1 text-[12px] text-red-500">{emailHint}</p>}
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 shrink-0 accent-[var(--qa-accent)]"
            />
            <span className="text-[13px] text-[var(--qa-text-muted)] leading-relaxed group-hover:text-[var(--qa-text-secondary)] transition-colors">
              אני אשלח לך הודעת וואטסאפ אחת להמשך בדיקת התאמה. בלי ספאם.
            </span>
          </label>

          {error && <p className="text-[13px] text-red-500 text-right">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !consent}
            className="w-full py-4 px-6 rounded-[12px] bg-[var(--qa-accent)] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'שומרת...' : 'המשיכי לבדיקת התאמה ←'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

export default function ShortQuizFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<FlowPhase>('questions');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [roiResult, setRoiResult] = useState<ROIResult | null>(null);
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
        // Last question answered — calculate ROI and show preview
        const inputs = buildROIInputs(newAnswers);
        const result = calcROI(inputs);
        setRoiResult(result);
        setPhase('result_preview');
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
    if (!supabase || !roiResult) {
      setFormError('שגיאה בחיבור. נסי שוב.');
      setSubmitting(false);
      return;
    }

    try {
      const answersJson = SHORT_QUIZ_QUESTIONS.reduce<Record<string, string>>(
        (acc, q, idx) => {
          acc[q.id] = answers[idx] ?? '';
          return acc;
        },
        {},
      );

      const roiData = {
        result_type: roiResult.result_type,
        accuracy_level: roiResult.accuracy_level,
        confidence_notes: roiResult.confidence_notes,
        show_cap_message: roiResult.show_cap_message,
        lead_score: roiResult.lead_score,
        components: roiResult.components,
        inputs: answersJson,
      };

      const { data: token, error } = await supabase.rpc('create_short_quiz_lead', {
        p_name: name,
        p_phone: phone,
        p_email: email,
        p_short_result_id: roiResult.result_type,
        p_answers_json: answersJson,
        p_marketing_consent: true,
        p_roi_data: roiData,
      });

      if (error || !token) {
        console.error('create_short_quiz_lead error:', error);
        setFormError('אירעה שגיאה בשמירה. נסי שוב.');
        setSubmitting(false);
        return;
      }

      router.push(`/quiz/result/${token as string}?new=1&type=short`);
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

  if (phase === 'result_preview' && roiResult) {
    return (
      <ResultPreviewScreen
        roi={roiResult}
        onContinue={() => setPhase('form')}
      />
    );
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

  return null;
}
