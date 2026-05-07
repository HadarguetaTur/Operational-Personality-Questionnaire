'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackEvent, getVisitorId, getSessionId, readUtmParams } from '@/lib/analytics';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Optional phone: allow digits, spaces, +, hyphen; require 7–15 digits when non-empty. */
function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Quiz lead capture — same Supabase flow as legacy Vite app. */
export function QuizLeadForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; name?: boolean; phone?: boolean }>({});

  useEffect(() => {
    trackEvent('quiz_start');
  }, []);

  const emailHint = useMemo(() => {
    if (!touched.email || !email) return '';
    if (!EMAIL_REGEX.test(email.trim())) return 'נא להזין כתובת אימייל תקינה.';
    return '';
  }, [email, touched.email]);
  const nameHint = useMemo(() => {
    if (!touched.name) return '';
    if (!name.trim()) return 'נא להזין איך לקרוא לך.';
    return '';
  }, [name, touched.name]);

  const phoneHint = useMemo(() => {
    if (!touched.phone || !phone.trim()) return '';
    const digits = phoneDigitsOnly(phone);
    if (digits.length < 7 || digits.length > 15) {
      return 'נא להזין מספר טלפון תקין (7–15 ספרות).';
    }
    return '';
  }, [phone, touched.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({ name: true, email: true, phone: true });
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhoneRaw = phone.trim();
    const phoneDigits = phoneDigitsOnly(trimmedPhoneRaw);
    const trimmedPhone =
      trimmedPhoneRaw === ''
        ? null
        : phoneDigits.length >= 7 && phoneDigits.length <= 15
          ? trimmedPhoneRaw
          : null;
    if (!trimmedName) {
      setError('נא להזין איך לקרוא לך.');
      return;
    }
    if (!trimmedEmail) {
      setError('נא להזין לאן לשלוח את התוצאות (אימייל).');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('נא להזין כתובת אימייל תקינה.');
      return;
    }
    if (!marketingConsent) {
      setError('נא לאשר קבלת דיוור כדי להמשיך.');
      return;
    }
    if (trimmedPhoneRaw !== '' && trimmedPhone === null) {
      setError('נא להזין מספר טלפון תקין (7–15 ספרות) או להשאיר ריק.');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('שגיאה בשמירה — חסרה הגדרת Supabase.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: leadIdNew, error: rpcError } = await supabase.rpc('create_quiz_lead', {
        p_name: trimmedName,
        p_email: trimmedEmail,
        p_marketing_consent: marketingConsent,
        p_phone: trimmedPhone,
      });

      let leadId: string | null = typeof leadIdNew === 'string' ? leadIdNew : null;

      if (rpcError) {
        const msg = rpcError.message ?? '';
        const fallback =
          /function .* does not exist|could not find.*function|PGRST202/i.test(msg) ||
          rpcError.code === 'PGRST202';
        if (!fallback) {
          console.error('Supabase create_quiz_lead error:', rpcError);
          setError(rpcError.message || 'שגיאה בשמירה. נסה שוב.');
          setSubmitting(false);
          return;
        }

        const ins = await supabase
          .from('leads')
          .insert({
            name: trimmedName,
            email: trimmedEmail,
            marketing_consent: marketingConsent,
            phone: trimmedPhone,
          })
          .select('id')
          .single();
        if (ins.error) {
          console.error('Supabase insert error:', ins.error);
          setError(ins.error.message || 'שגיאה בשמירה. נסה שוב.');
          setSubmitting(false);
          return;
        }
        leadId = ins.data?.id ?? null;
      }

      if (leadId) {
        sessionStorage.setItem('diagnosticLeadId', leadId);
        sessionStorage.setItem(
          'diagnosticUserInfo',
          JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
          }),
        );

        try {
          const utm = readUtmParams();
          await supabase
            .from('leads')
            .update({
              visitor_id: getVisitorId(),
              session_id: getSessionId(),
              landing_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
              utm_source: utm.utm_source,
              utm_medium: utm.utm_medium,
              utm_campaign: utm.utm_campaign,
              utm_term: utm.utm_term,
              utm_content: utm.utm_content,
            })
            .eq('id', leadId);
        } catch {
          // attribution optional
        }

        router.push('/quiz/diagnostic');
      } else {
        setError('שגיאה בשמירה. נסה שוב.');
      }
    } catch (err) {
      console.error('[QuizLeadForm]', err);
      setError('שגיאה בשמירה. נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-full py-10 md:py-16 qa-fade-slide">
      <section className="bg-[var(--qa-surface)] border border-[var(--qa-border)] rounded-xl px-6 md:px-8 py-8 md:py-10">
        <p className="text-[13px] md:text-[14px] text-[var(--qa-text-secondary)] opacity-70 mb-2">
          לפני שמתחילים
        </p>
        <h1 className="text-[24px] md:text-[28px] font-semibold leading-tight mb-6">
          איך לקרוא לך ולאן לשלוח את התוצאות
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="lead-name" className="block text-[15px] font-medium text-[var(--qa-text-primary)] mb-2">
              איך לקרוא לך? <span className="text-[var(--qa-accent)]" aria-hidden="true">*</span>
            </label>
            <input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="השם או כינוי"
              className={`w-full h-12 px-4 rounded-xl border bg-[var(--qa-bg)] text-[var(--qa-text-primary)] placeholder-[var(--qa-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:border-transparent transition-colors ${nameHint ? 'border-rose-400' : 'border-[var(--qa-border)]'}`}
              dir="rtl"
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={!!nameHint}
              aria-describedby={nameHint ? 'lead-name-hint' : undefined}
              disabled={submitting}
            />
            {nameHint && (
              <p id="lead-name-hint" className="mt-1.5 text-[13px] text-rose-400" role="alert">{nameHint}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-email" className="block text-[15px] font-medium text-[var(--qa-text-primary)] mb-2">
              לאן לשלוח את התוצאות? <span className="text-[var(--qa-accent)]" aria-hidden="true">*</span>
            </label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="כתובת אימייל"
              className={`w-full h-12 px-4 rounded-xl border bg-[var(--qa-bg)] text-[var(--qa-text-primary)] placeholder-[var(--qa-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:border-transparent transition-colors ${emailHint ? 'border-rose-400' : 'border-[var(--qa-border)]'}`}
              dir="ltr"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={!!emailHint}
              aria-describedby={emailHint ? 'lead-email-hint' : undefined}
              disabled={submitting}
            />
            {emailHint && (
              <p id="lead-email-hint" className="mt-1.5 text-[13px] text-rose-400" role="alert">{emailHint}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-phone" className="block text-[15px] font-medium text-[var(--qa-text-primary)] mb-2">
              מספר טלפון (לא חובה)
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="לדוגמה: 050-1234567"
              className={`w-full h-12 px-4 rounded-xl border bg-[var(--qa-bg)] text-[var(--qa-text-primary)] placeholder-[var(--qa-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:border-transparent transition-colors ${phoneHint ? 'border-rose-400' : 'border-[var(--qa-border)]'}`}
              dir="ltr"
              autoComplete="tel"
              aria-invalid={!!phoneHint}
              aria-describedby={phoneHint ? 'lead-phone-hint' : undefined}
              disabled={submitting}
            />
            {phoneHint && (
              <p id="lead-phone-hint" className="mt-1.5 text-[13px] text-rose-400" role="alert">{phoneHint}</p>
            )}
          </div>

          <div className="flex gap-3 items-start">
            <input
              id="lead-consent"
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-[var(--qa-border)] text-[var(--qa-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)]"
              required
              aria-required="true"
              disabled={submitting}
            />
            <label htmlFor="lead-consent" className="flex-1 text-[15px] text-[var(--qa-text-secondary)] leading-[1.5] cursor-pointer">
              אני מאשר/ת קבלת דיוור (עדכונים, טיפים והצעות) לכתובת האימייל שסיפקתי.
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="flex gap-2 items-start px-3 py-2.5 rounded-lg border border-rose-400 bg-rose-400/5 text-[14px] text-rose-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12" y2="16" />
              </svg>
              <span className="flex-1">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !marketingConsent}
            aria-busy={submitting}
            className="mt-2 w-full h-14 rounded-xl border border-[var(--qa-accent)] bg-[var(--qa-accent)] text-white text-[17px] font-medium transition-colors hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'שומר...' : 'המשך לאבחון'}
          </button>
        </form>
      </section>
    </div>
  );
}
