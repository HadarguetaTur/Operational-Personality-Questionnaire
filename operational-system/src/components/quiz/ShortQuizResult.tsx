'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SHORT_QUIZ_RESULTS, ShortResultId, ShortResultContent } from '@/config/shortQuizResults';

const WHATSAPP_NUMBER = '972504343547'; // ← עדכני למספר שלך

interface ResultState {
  status: 'loading' | 'ready' | 'error';
  result?: ShortResultContent;
  userName?: string;
}

function CheckIcon() {
  return (
    <svg className="inline shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ShortQuizResult({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const [state, setState] = useState<ResultState>({ status: 'loading' });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        setState({ status: 'error' });
        return;
      }
      const { data, error } = await supabase
        .from('leads')
        .select('result_pattern, result_snapshot')
        .eq('report_token', token)
        .single();

      if (error || !data) {
        setState({ status: 'error' });
        return;
      }

      const snapshot = data.result_snapshot as Record<string, unknown> | null;
      const resultId = (data.result_pattern ?? snapshot?.result_id ?? 'GENERAL') as ShortResultId;
      const userName = (snapshot?.user_name ?? '') as string;
      const result = SHORT_QUIZ_RESULTS[resultId] ?? SHORT_QUIZ_RESULTS['GENERAL'];

      setState({ status: 'ready', result, userName });
    }
    load();
  }, [token]);

  useEffect(() => {
    if (!isNew || state.status !== 'ready') return;
    fetch('/api/quiz/send-completion-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportToken: token }),
    }).catch(() => {});
  }, [isNew, state.status, token]);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="w-7 h-7 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state.status === 'error' || !state.result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6" dir="rtl">
        <p className="text-[var(--qa-text-muted)] text-center">לא הצלחנו למצוא את הדוח. נסי שוב מאוחר יותר.</p>
      </div>
    );
  }

  const { result, userName } = state;
  const firstName = userName?.split(' ')[0] ?? '';

  return (
    <div
      className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] py-10 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">

        {/* Thank-you banner (shown right after form submission) */}
        {isNew && (
          <div className="mb-8 p-4 rounded-[12px] border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)] text-[14px] text-[var(--qa-text-secondary)] leading-relaxed">
            מפת הסדר בדרך אלייך
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          {firstName && (
            <p className="text-[14px] text-[var(--qa-text-muted)] mb-2">
              {firstName}, זאת נקודת העומס המרכזית שעולה מהבדיקה שלך
            </p>
          )}
          <span className="inline-block text-[12px] font-medium uppercase tracking-wide text-[var(--qa-accent)] mb-3 px-3 py-1 rounded-full border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)]">
            {result.tagline}
          </span>
          <h1 className="text-[28px] md:text-[34px] font-bold leading-tight text-[var(--qa-text-primary)] mt-2">
            {result.name}
          </h1>
        </div>

        {/* Emotional mirror */}
        <div className="mb-8 p-5 rounded-[14px] border border-[var(--qa-accent)] border-opacity-20 bg-[var(--qa-accent-soft)]">
          <p className="text-[16px] md:text-[17px] leading-relaxed text-[var(--qa-text-primary)] font-medium">
            {result.emotionalMirror}
          </p>
        </div>

        {/* Daily life */}
        <section className="mb-7">
          <h2 className="text-[15px] font-semibold text-[var(--qa-text-muted)] uppercase tracking-wide mb-4">
            מה כנראה קורה ביום-יום
          </h2>
          <ul className="flex flex-col gap-3">
            {result.dailyLife.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] md:text-[16px] text-[var(--qa-text-secondary)] leading-relaxed">
                <span className="mt-1 text-[var(--qa-accent)]"><CheckIcon /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Costs */}
        <section className="mb-7">
          <h2 className="text-[15px] font-semibold text-[var(--qa-text-muted)] uppercase tracking-wide mb-4">
            מה זה עולה לך
          </h2>
          <ul className="flex flex-col gap-3">
            {result.costs.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] md:text-[16px] text-[var(--qa-text-secondary)] leading-relaxed">
                <span className="mt-1 text-orange-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Fix first */}
        <section className="mb-9 p-5 rounded-[14px] bg-[var(--qa-surface)] border border-[var(--qa-border)]">
          <h2 className="text-[14px] font-semibold text-[var(--qa-text-muted)] uppercase tracking-wide mb-2">
            מה כדאי לסדר קודם
          </h2>
          <p className="text-[16px] md:text-[17px] font-medium text-[var(--qa-text-primary)] leading-relaxed">
            {result.fixFirst}
          </p>
        </section>

        {/* CTA */}
        <section className="border-t border-[var(--qa-border-light)] pt-8">
          <p className="text-[15px] md:text-[16px] text-[var(--qa-text-secondary)] leading-relaxed mb-6">
            {result.ctaSoft}
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('היי, סיימתי את הבדיקה ואשמח לשיחת מיפוי קצרה 🙂')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-[12px] bg-[#25D366] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            שיחת מיפוי קצרה — וואטסאפ
          </a>
        </section>
      </div>
    </div>
  );
}
