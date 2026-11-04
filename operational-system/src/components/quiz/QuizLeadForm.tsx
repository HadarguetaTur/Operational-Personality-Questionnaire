'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent, getVisitorId, getSessionId, readUtmParams } from '@/lib/analytics';
import { isTurnstileSiteConfigured, TurnstileWidget } from '@/components/security/TurnstileWidget';
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
  // Unchecked by default — pre-checked marketing consent conflicts with the
  // Israeli spam law's opt-in requirement.
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; name?: boolean; phone?: boolean }>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileMountKey, setTurnstileMountKey] = useState(0);

  const nameHint = useMemo(() => {
    if (!touched.name) return '';
    if (!name.trim()) return 'נא להזין איך לקרוא לך.';
    return '';
  }, [name, touched.name]);

  const phoneHint = useMemo(() => {
    if (!touched.phone || !phone.trim()) return '';
    const digits = phoneDigitsOnly(phone);
    if (digits.length < 7 || digits.length > 15) {
      return 'נא להזין מספר וואטסאפ תקין.';
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
      setError('נא להזין מספר וואטסאפ תקין, כדי שנוכל להמשיך איתך בוואטסאפ.');
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
    if (isTurnstileSiteConfigured() && !turnstileToken) {
      setError('רגע, האימות שאינך רובוט עדיין לא הסתיים. נסי שוב בעוד שנייה.');
      return;
    }

    setSubmitting(true);
    try {
      // The lead is created server-side (rate-limited + Turnstile-verified);
      // the browser no longer talks to the `leads` table directly.
      const utm = readUtmParams();
      const res = await fetch('/api/quiz/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhoneRaw,
          email: trimmedEmailRaw || null,
          resultType,
          answers: answerInputs,
          marketingConsent,
          turnstileToken: turnstileToken ?? undefined,
          attribution: {
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            landing_referrer:
              typeof document !== 'undefined' ? document.referrer || null : null,
            utm_source: utm.utm_source,
            utm_medium: utm.utm_medium,
            utm_campaign: utm.utm_campaign,
            utm_term: utm.utm_term,
            utm_content: utm.utm_content,
          },
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      const token = payload.token;

      if (!res.ok || typeof token !== 'string' || !token) {
        console.error('[QuizLeadForm] /api/quiz/lead failed:', res.status);
        setError(payload.error || 'משהו השתבש ולא הצלחתי לשמור. אל דאגה, התשובות שלך עדיין כאן. נסי שוב בעוד רגע.');
        // Turnstile tokens are single-use — remount so the next attempt gets a fresh one.
        setTurnstileToken(null);
        setTurnstileMountKey((k) => k + 1);
        setSubmitting(false);
        return;
      }

      trackEvent('cta_click', { ctaId: 'quiz_lead_submit', metadata: { result_type: resultType } });

      // Server-side follow-through, best-effort and never blocking the redirect:
      // alert Hadar about the new lead, and email the lead her result link when
      // she left an address. keepalive lets both survive the navigation.
      const followThrough = JSON.stringify({ reportToken: token });
      const fire = (path: string) =>
        fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: followThrough,
          keepalive: true,
        }).catch(() => undefined);
      void fire('/api/quiz/notify-new-lead');
      if (trimmedEmailRaw) void fire('/api/quiz/send-completion-email');
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_name: 'quiz_lead_submit' });
      }

      router.push(`/quiz/result/${token}?new=1`);
    } catch (err) {
      console.error('[QuizLeadForm]', err);
      setError('משהו השתבש ולא הצלחתי לשמור. אל דאגה, התשובות שלך עדיין כאן. נסי שוב בעוד רגע.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen justify-center text-[var(--qa-text-primary)] px-6 md:px-8 py-12"
      dir="rtl"
    >
      <section className="w-full max-w-[480px] mx-auto rounded-2xl border border-[#E6E2F4] bg-white backdrop-blur-sm shadow-[0_0_60px_-20px_rgba(123,97,232,0.18)] p-7 md:p-8">
        <p className="text-[13px] font-medium tracking-wider text-[#5B3FC4] mb-2.5">
          רגע לפני התוצאה
        </p>
        <h1 className="studio-display text-[28px] md:text-[34px] font-black leading-tight mb-3">
          <span className="qa-gradient-text">לאן לשלוח לך את תמונת המצב העסקית?</span>
        </h1>
        <p className="text-[15px] text-[#3D4859] leading-relaxed mb-5">
          ענית על 12 שאלות על העסק שלך. התמונה שלך מוכנה: איפה הכסף שלך נוזל, ומה את מסדרת ראשון.
        </p>

        {/* The report is already being assembled — makes the value tangible
            at the highest-friction moment of the funnel. */}
        <div className="mb-7 rounded-xl border border-[#E6E2F4] bg-[#FAF9FC] p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="studio-dot-live w-2 h-2 rounded-full bg-[#5B3FC4] shrink-0" aria-hidden="true" />
            <p className="text-[13px] font-semibold text-[#4A32A4]">
              תמונת המצב העסקית שלך נבנית עכשיו מהתשובות שלך
            </p>
          </div>
          <div className="space-y-2" aria-hidden="true">
            <div className="studio-shimmer h-2.5 rounded-full w-[85%]" />
            <div className="studio-shimmer h-2.5 rounded-full w-[62%]" />
            <div className="studio-shimmer h-2.5 rounded-full w-[74%]" />
          </div>
        </div>

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
              className={`w-full h-12 px-4 rounded-xl border bg-[#FAF9FC] text-[#0D1B2A] placeholder-[#68707C] focus:outline-none focus:border-[#5B3FC4]/45 focus:ring-2 focus:ring-[#5B3FC4]/20 transition-colors ${nameHint ? 'border-rose-400' : 'border-[#E6E2F4]'}`}
              dir="rtl"
              autoComplete="given-name"
              required
              aria-required="true"
              aria-invalid={!!nameHint}
              disabled={submitting}
            />
            {nameHint && (
              <p className="mt-1.5 text-[13px] text-rose-600" role="alert">{nameHint}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="lead-phone"
              className="block text-[15px] font-medium mb-2"
            >
              הוואטסאפ שלך <span className="text-[var(--qa-text-muted)] text-[13px]">(לכאן נשלחת התוצאה שלך)</span> <span className="text-[var(--qa-accent)]" aria-hidden="true">*</span>
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="050-1234567"
              className={`w-full h-12 px-4 rounded-xl border bg-[#FAF9FC] text-[#0D1B2A] placeholder-[#68707C] focus:outline-none focus:border-[#5B3FC4]/45 focus:ring-2 focus:ring-[#5B3FC4]/20 transition-colors ${phoneHint ? 'border-rose-400' : 'border-[#E6E2F4]'}`}
              dir="ltr"
              autoComplete="tel"
              required
              aria-required="true"
              aria-invalid={!!phoneHint}
              disabled={submitting}
            />
            {phoneHint && (
              <p className="mt-1.5 text-[13px] text-rose-600" role="alert">{phoneHint}</p>
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
              className={`w-full h-12 px-4 rounded-xl border bg-[#FAF9FC] text-[#0D1B2A] placeholder-[#68707C] focus:outline-none focus:border-[#5B3FC4]/45 focus:ring-2 focus:ring-[#5B3FC4]/20 transition-colors ${emailHint ? 'border-rose-400' : 'border-[#E6E2F4]'}`}
              dir="ltr"
              autoComplete="email"
              aria-invalid={!!emailHint}
              disabled={submitting}
            />
            {emailHint && (
              <p className="mt-1.5 text-[13px] text-rose-600" role="alert">{emailHint}</p>
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

          {isTurnstileSiteConfigured() && (
            <TurnstileWidget
              key={turnstileMountKey}
              onToken={setTurnstileToken}
              className="flex justify-center"
            />
          )}

          {error && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-lg border border-rose-400 bg-rose-50 text-[14px] text-rose-600"
            >
              {error}
            </div>
          )}

          {/* Stays enabled before consent on purpose: a click surfaces the
              explanatory error instead of a dead button with no feedback. */}
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="studio-cta-grad studio-cta-shine mt-1 w-full h-14 rounded-xl text-white text-[17px] font-bold tracking-tight disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3FC4] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)]"
          >
            {submitting ? 'רגע, מכינה לך את התמונה...' : 'לתמונת המצב העסקית שלי ←'}
          </button>

          <p className="text-[12px] text-[#68707C] text-center leading-relaxed">
            לא נתקשר בלי שביקשת. הפרטים נשמרים אצל הדר בלבד, משמשים לשליחת התוצאה ולהמשך שתבחרי, ולא מועברים לאף אחד. אפשר לבקש מחיקה בכל עת.
          </p>
        </form>
      </section>
    </div>
  );
}
