'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackEvent, getVisitorId, getSessionId, readUtmParams } from '@/lib/analytics';
import type { ResultType } from '@/lib/calculator/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

interface QuizLeadFormProps {
  /** The archetype chosen by Q10 — stored as result_pattern. */
  resultType: ResultType;
  /** Qualitative answers keyed by question id ({ Q1: optionId, ... }). */
  answerInputs: Record<string, string>;
}

/**
 * Lead capture shown after the 10 questions, before the result.
 * Writes the lead via the create_short_quiz_lead RPC (phone required, email
 * optional) and routes to the saved result page by its report_token.
 */
export function QuizLeadForm({ resultType, answerInputs }: QuizLeadFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [termsConsent, setTermsConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; name?: boolean; phone?: boolean }>({});

  const nameHint = useMemo(() => {
    if (!touched.name) return '';
    if (!name.trim()) return 'נא להזין איך לקרוא לך.';
    return '';
  }, [name, touched.name]);

  const phoneHint = useMemo(() => {
    if (!touched.phone || !phone.trim()) return '';
    const digits = phoneDigitsOnly(phone);
    if (digits.length < 7 || digits.length > 15) {
      return 'נא להזין מספר טלפון תקין.';
    }
    return '';
  }, [phone, touched.phone]);

  const emailHint = useMemo(() => {
    if (!touched.email || !email.trim()) return '';
    if (!EMAIL_REGEX.test(email.trim())) return 'נא להזין כתובת אימייל תקינה.';
    return '';
  }, [email, touched.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({ name: true, email: true, phone: true });

    const trimmedName = name.trim();
    const trimmedEmailRaw = email.trim().toLowerCase();
    const trimmedPhoneRaw = phone.trim();
    const phoneDigits = phoneDigitsOnly(trimmedPhoneRaw);

    if (!trimmedName) {
      setError('נא להזין איך לקרוא לך.');
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError('נא להזין מספר טלפון תקין כדי שנוכל לחזור אלייך.');
      return;
    }
    if (trimmedEmailRaw && !EMAIL_REGEX.test(trimmedEmailRaw)) {
      setError('נא להזין כתובת אימייל תקינה, או להשאיר ריק.');
      return;
    }
    if (!termsConsent) {
      setError('כדי להמשיך צריך לאשר את תנאי השימוש ומדיניות הפרטיות.');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('שגיאה בשמירה. נסי שוב מאוחר יותר.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: token, error: rpcError } = await supabase.rpc('create_short_quiz_lead', {
        p_name: trimmedName,
        p_phone: trimmedPhoneRaw,
        p_email: trimmedEmailRaw || null,
        p_short_result_id: resultType,
        p_answers_json: answerInputs,
        p_marketing_consent: marketingConsent,
      });

      if (rpcError || typeof token !== 'string' || !token) {
        console.error('[QuizLeadForm] create_short_quiz_lead error:', rpcError);
        setError(rpcError?.message || 'שגיאה בשמירה. נסי שוב.');
        setSubmitting(false);
        return;
      }

      trackEvent('cta_click', { ctaId: 'quiz_lead_submit', metadata: { result_type: resultType } });

      // Best-effort attribution — never blocks the redirect.
      try {
        const utm = readUtmParams();
        await supabase
          .from('leads')
          .update({
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            landing_referrer:
              typeof document !== 'undefined' ? document.referrer || null : null,
            utm_source: utm.utm_source,
            utm_medium: utm.utm_medium,
            utm_campaign: utm.utm_campaign,
            utm_term: utm.utm_term,
            utm_content: utm.utm_content,
          })
          .eq('report_token', token);
      } catch {
        // attribution optional
      }

      router.push(`/quiz/result/${token}?new=1`);
    } catch (err) {
      console.error('[QuizLeadForm]', err);
      setError('שגיאה בשמירה. נסי שוב.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen justify-center text-[var(--qa-text-primary)] px-6 md:px-8 py-12"
      dir="rtl"
    >
      <section className="w-full max-w-[480px] mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm shadow-[0_0_60px_-20px_rgba(20,184,166,0.18)] p-7 md:p-8">
        <p className="text-[13px] font-medium tracking-wider text-teal-400 mb-2.5">
          רגע לפני התוצאה
        </p>
        <h1 className="text-[25px] md:text-[29px] font-extrabold leading-snug tracking-tight mb-3">
          <span className="qa-gradient-text">לאן לשלוח לך את התמונה המלאה?</span>
        </h1>
        <p className="text-[15px] text-white/65 leading-relaxed mb-7">
          השאירי פרטים ואראה לך מיד איפה הכסף נוזל אצלך, ומה הצעד הראשון לסדר.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="lead-name"
              className="block text-[15px] font-medium mb-2"
            >
              איך לקרוא לך? <span className="text-[var(--qa-accent)]" aria-hidden="true">*</span>
            </label>
            <input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="השם הפרטי שלך"
              className={`w-full h-12 px-4 rounded-xl border bg-[#0a0f18]/65 text-white placeholder-white/35 focus:outline-none focus:border-teal-500/45 focus:ring-2 focus:ring-teal-400/20 transition-colors ${nameHint ? 'border-rose-400' : 'border-white/[0.08]'}`}
              dir="rtl"
              autoComplete="given-name"
              required
              aria-required="true"
              aria-invalid={!!nameHint}
              disabled={submitting}
            />
            {nameHint && (
              <p className="mt-1.5 text-[13px] text-rose-400" role="alert">{nameHint}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="lead-phone"
              className="block text-[15px] font-medium mb-2"
            >
              טלפון <span className="text-[var(--qa-accent)]" aria-hidden="true">*</span>
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="050-1234567"
              className={`w-full h-12 px-4 rounded-xl border bg-[#0a0f18]/65 text-white placeholder-white/35 focus:outline-none focus:border-teal-500/45 focus:ring-2 focus:ring-teal-400/20 transition-colors ${phoneHint ? 'border-rose-400' : 'border-white/[0.08]'}`}
              dir="ltr"
              autoComplete="tel"
              required
              aria-required="true"
              aria-invalid={!!phoneHint}
              disabled={submitting}
            />
            {phoneHint && (
              <p className="mt-1.5 text-[13px] text-rose-400" role="alert">{phoneHint}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="lead-email"
              className="block text-[15px] font-medium mb-2"
            >
              מייל <span className="text-[var(--qa-text-muted)] text-[13px]">(לא חובה)</span>
            </label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="כתובת אימייל"
              className={`w-full h-12 px-4 rounded-xl border bg-[#0a0f18]/65 text-white placeholder-white/35 focus:outline-none focus:border-teal-500/45 focus:ring-2 focus:ring-teal-400/20 transition-colors ${emailHint ? 'border-rose-400' : 'border-white/[0.08]'}`}
              dir="ltr"
              autoComplete="email"
              aria-invalid={!!emailHint}
              disabled={submitting}
            />
            {emailHint && (
              <p className="mt-1.5 text-[13px] text-rose-400" role="alert">{emailHint}</p>
            )}
          </div>

          <div className="flex gap-3 items-start">
            <input
              id="lead-consent"
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-[var(--qa-border)] text-[var(--qa-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)]"
              disabled={submitting}
            />
            <label
              htmlFor="lead-consent"
              className="flex-1 text-[14px] text-[var(--qa-text-secondary)] leading-[1.5] cursor-pointer"
            >
              אשמח לקבל ממך טיפים ועדכונים. אפשר להסיר בכל רגע.
            </label>
          </div>

          <div className="flex gap-3 items-start">
            <input
              id="lead-terms"
              type="checkbox"
              checked={termsConsent}
              onChange={(e) => setTermsConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-[var(--qa-border)] text-[var(--qa-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)]"
              required
              aria-required="true"
              disabled={submitting}
            />
            <label
              htmlFor="lead-terms"
              className="flex-1 text-[14px] text-[var(--qa-text-secondary)] leading-[1.5] cursor-pointer"
            >
              קראתי ואני מאשרת את{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--qa-accent)] underline underline-offset-2 hover:opacity-80"
              >
                תנאי השימוש
              </a>{' '}
              ואת{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--qa-accent)] underline underline-offset-2 hover:opacity-80"
              >
                מדיניות הפרטיות
              </a>
              . <span className="text-[var(--qa-accent)]" aria-hidden="true">*</span>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-lg border border-rose-400 bg-rose-400/5 text-[14px] text-rose-400"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !termsConsent}
            aria-busy={submitting}
            className="mt-1 w-full h-14 rounded-xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white text-[17px] font-bold tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] transition-all duration-300 hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
          >
            {submitting ? 'רגע, מכינה לך את התמונה...' : 'לתוצאה שלי ←'}
          </button>

          <p className="text-[12px] text-white/40 text-center leading-relaxed">
            לא נתקשר בלי שביקשת. הפרטים נשמרים אצל הדר בלבד, משמשים לשליחת התוצאה ולהמשך שתבחרי, ולא מועברים לאף אחד. אפשר לבקש מחיקה בכל עת.
          </p>
        </form>
      </section>
    </div>
  );
}
