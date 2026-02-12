import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const LeadForm: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError('נא להזין איך לקרוא לך.');
      return;
    }
    if (!trimmedEmail) {
      setError('נא להזין לאן לשלוח את התוצאות (אימייל).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('נא להזין כתובת אימייל תקינה.');
      return;
    }
    if (!marketingConsent) {
      setError('נא לאשר קבלת דיוור כדי להמשיך.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('leads')
        .insert({
          name: trimmedName,
          email: trimmedEmail,
          marketing_consent: marketingConsent
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        setError(insertError.message || 'שגיאה בשמירה. נסה שוב.');
        setSubmitting(false);
        return;
      }

      const leadId = data?.id;
      if (leadId) {
        sessionStorage.setItem('diagnosticLeadId', leadId);
        navigate('/diagnostic', {
          state: {
            leadId,
            userInfo: { name: trimmedName, email: trimmedEmail }
          }
        });
      } else {
        setError('שגיאה בשמירה. נסה שוב.');
      }
    } catch {
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="lead-name" className="block text-[15px] font-medium text-[var(--qa-text-primary)] mb-2">
              איך לקרוא לך?
            </label>
            <input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="השם או כינוי"
              className="w-full h-12 px-4 rounded-xl border border-[var(--qa-border)] bg-[var(--qa-bg)] text-[var(--qa-text-primary)] placeholder-[var(--qa-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:border-transparent"
              dir="rtl"
              autoComplete="name"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="lead-email" className="block text-[15px] font-medium text-[var(--qa-text-primary)] mb-2">
              לאן לשלוח את התוצאות?
            </label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="כתובת אימייל"
              className="w-full h-12 px-4 rounded-xl border border-[var(--qa-border)] bg-[var(--qa-bg)] text-[var(--qa-text-primary)] placeholder-[var(--qa-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:border-transparent"
              dir="ltr"
              autoComplete="email"
              disabled={submitting}
            />
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
            <label htmlFor="lead-consent" className="text-[15px] text-[var(--qa-text-secondary)] leading-[1.5] cursor-pointer">
              אני מאשר/ת קבלת דיוור (עדכונים, טיפים והצעות) לכתובת האימייל שסיפקתי.
            </label>
          </div>

          {error && (
            <p className="text-[14px] text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !marketingConsent}
            className="mt-2 w-full h-14 rounded-xl border border-[var(--qa-accent)] bg-[var(--qa-accent)] text-white text-[17px] font-medium transition-colors hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'שומר...' : 'המשך לאבחון'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default LeadForm;
