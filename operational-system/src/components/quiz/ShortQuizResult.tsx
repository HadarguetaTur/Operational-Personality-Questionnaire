'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatILS } from '@/lib/calculator/roiCalculator';
import type { ROIComponents, AccuracyLevel } from '@/lib/calculator/types';
import { ROI_QUIZ_RESULTS, DISCLAIMER_TEXT } from '@/config/shortQuizResults';
import type { ResultType } from '@/config/shortQuizResults';

const WHATSAPP_NUMBER = '972504343547';

interface RoiData {
  result_type: ResultType;
  accuracy_level: AccuracyLevel;
  confidence_notes: string;
  show_cap_message: boolean;
  lead_score: number;
  components: ROIComponents;
  inputs?: Record<string, string>;
}

interface ResultState {
  status: 'loading' | 'ready' | 'error';
  userName?: string;
  roiData?: RoiData;
  resultType?: ResultType;
}

function AccuracyDots({ level }: { level: AccuracyLevel }) {
  const filled = level === 'גבוהה' ? 4 : level === 'בינונית' ? 2 : 1;
  return (
    <span className="inline-flex gap-1 align-middle">
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

function ComponentRow({
  label,
  low,
  high,
  note,
}: {
  label: string;
  low: number;
  high: number;
  note?: string;
}) {
  return (
    <li className="border-b border-[var(--qa-border-light)] pb-4 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <span className="text-[15px] text-[var(--qa-text-secondary)] font-medium">{label}</span>
        <span className="text-[15px] font-semibold text-[var(--qa-text-primary)] shrink-0">
          {formatILS(low)} – {formatILS(high)}
        </span>
      </div>
      {note && (
        <p className="text-[12px] text-[var(--qa-text-muted)] leading-relaxed">{note}</p>
      )}
    </li>
  );
}

function buildComponentNotes(roi: RoiData) {
  const closeDefault = roi.confidence_notes?.includes('שיעור סגירה') ?? false;
  const atRiskDefault = roi.confidence_notes?.includes('אחוז פניות') ?? false;

  const oppNote = [
    closeDefault ? 'שיעור סגירה: 7% (ברירת מחדל שמרנית)' : '',
    atRiskDefault ? 'פניות בסיכון: 45% (הנחה שמרנית)' : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    timeNote: 'שעות ידניות שבועיות × שווי שעה × 52 שבועות',
    collectionNote: 'שעות גבייה שבועיות × שווי שעה × 52 שבועות',
    oppNote: oppNote || 'פניות × אחוז בסיכון × שיעור סגירה × שווי לקוח × 12',
  };
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
        .select('result_pattern, result_snapshot, roi_data')
        .eq('report_token', token)
        .single();

      if (error || !data) {
        setState({ status: 'error' });
        return;
      }

      const snapshot = data.result_snapshot as Record<string, unknown> | null;
      const userName = (snapshot?.user_name ?? '') as string;
      const roi = data.roi_data as RoiData | null;

      const resultType =
        (roi?.result_type as ResultType | undefined) ??
        (data.result_pattern as ResultType | undefined) ??
        'CENTRALIZED';

      setState({ status: 'ready', userName, roiData: roi ?? undefined, resultType });
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

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6" dir="rtl">
        <p className="text-[var(--qa-text-muted)] text-center">
          לא הצלחנו למצוא את הדוח. נסי שוב מאוחר יותר.
        </p>
      </div>
    );
  }

  const { userName, roiData, resultType } = state;
  const firstName = userName?.split(' ')[0] ?? '';
  const content = ROI_QUIZ_RESULTS[resultType ?? 'CENTRALIZED'] ?? ROI_QUIZ_RESULTS['CENTRALIZED'];

  // ── Fallback: no roi_data (legacy or missing) ─────────────────────────────
  if (!roiData) {
    return (
      <div className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] py-10 px-6 md:px-8" dir="rtl">
        <div className="max-w-[600px] mx-auto text-right">
          {isNew && (
            <div className="mb-8 p-4 rounded-[12px] border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)] text-[14px] text-[var(--qa-text-secondary)]">
              מפת התיקון בדרך אלייך
            </div>
          )}
          <h1 className="text-[28px] font-bold mb-4">{content.headline}</h1>
          <p className="text-[15px] text-[var(--qa-text-secondary)] mb-8">{content.explanation}</p>
          <FixMapSection steps={content.fixSteps} />
          <WhatsAppCTA firstName={firstName} whatsappText={content.whatsappText} />
        </div>
      </div>
    );
  }

  const { components: c, show_cap_message, accuracy_level, confidence_notes } = roiData;
  const notes = buildComponentNotes(roiData);

  return (
    <div
      className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] py-10 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">

        {/* Thank-you banner */}
        {isNew && (
          <div className="mb-8 p-4 rounded-[12px] border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)] text-[14px] text-[var(--qa-text-secondary)] leading-relaxed">
            קיבלנו. מפת התיקון מוכנה, ראי למטה.
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[26px] md:text-[30px] font-bold text-[var(--qa-text-primary)] mb-2 leading-snug">
            {firstName ? `${firstName}, מצאנו איפה הכסף נתקע` : 'מצאנו איפה הכסף נתקע'}
          </h1>
          <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-accent)] mb-4">
            📍 {content.tagline}
          </span>
          <p className="text-[16px] text-[var(--qa-text-secondary)] leading-relaxed">
            {content.explanation}
          </p>
        </div>

        {/* Total range or cap */}
        {show_cap_message ? (
          <div className="mb-6 p-5 rounded-[14px] border border-orange-300/40 bg-orange-50/10">
            <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed">
              ⚠️ זוהתה עלות שנתית גבוהה. כדאי לבצע בדיקה פרטנית לפני הצגת סכום מדויק.
            </p>
          </div>
        ) : (
          <div className="mb-8 p-5 rounded-[14px] border border-[var(--qa-accent)] border-opacity-30 bg-[var(--qa-accent-soft)]">
            <p className="text-[13px] text-[var(--qa-text-muted)] mb-1">עלות שנתית מוערכת</p>
            <p className="text-[30px] md:text-[34px] font-bold text-[var(--qa-text-primary)]">
              {formatILS(c.total_low)} – {formatILS(c.total_high)}
            </p>
            <p className="text-[12px] text-[var(--qa-text-muted)] mt-1">
              טווח המבוסס על גבולות הטווחים שסיפקת
            </p>
          </div>
        )}

        {/* Fix map — 3 action steps */}
        <FixMapSection steps={content.fixSteps} />

        {/* Component breakdown */}
        {!show_cap_message && (
          <section className="mb-6">
            <h2 className="text-[14px] font-semibold text-[var(--qa-text-muted)] uppercase tracking-wide mb-4">
              פירוט רכיבי ההערכה
            </h2>
            <ul className="flex flex-col gap-4">
              <ComponentRow
                label="עלות זמן ידני שנתית"
                low={c.time_cost_low}
                high={c.time_cost_high}
                note={notes.timeNote}
              />
              <ComponentRow
                label="שווי הזדמנויות בסיכון"
                low={c.opportunity_low}
                high={c.opportunity_high}
                note={notes.oppNote}
              />
              <ComponentRow
                label="עלות גבייה ותזכורות"
                low={c.collection_cost_low}
                high={c.collection_cost_high}
                note={notes.collectionNote}
              />
            </ul>
          </section>
        )}

        {/* Efficiency potential */}
        {!show_cap_message && (
          <div className="mb-6 p-4 rounded-[12px] bg-[var(--qa-surface)] border border-[var(--qa-border)]">
            <p className="text-[13px] text-[var(--qa-text-muted)] mb-1">פוטנציאל התייעלות ראשוני</p>
            <p className="text-[20px] font-semibold text-[var(--qa-text-primary)]">
              {formatILS(c.efficiency_low)} – {formatILS(c.efficiency_high)} בשנה
            </p>
            <p className="text-[12px] text-[var(--qa-text-muted)] mt-1">
              זהו טווח הערכה בלבד, בכפוף לבדיקה של התהליך בפועל.
            </p>
          </div>
        )}

        {/* Accuracy level */}
        <div className="mb-6 p-4 rounded-[12px] bg-[var(--qa-surface)] border border-[var(--qa-border)]">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[13px] text-[var(--qa-text-muted)]">רמת דיוק ההערכה:</span>
            <AccuracyDots level={accuracy_level} />
            <span className="text-[13px] font-semibold text-[var(--qa-text-secondary)]">
              {accuracy_level}
            </span>
          </div>
          {confidence_notes && (
            <p className="text-[12px] text-[var(--qa-text-muted)] leading-relaxed">
              {confidence_notes}
            </p>
          )}
          <p className="text-[12px] text-[var(--qa-text-muted)] mt-1">
            {accuracy_level === 'גבוהה'
              ? 'סיפקת נתונים ברורים. ההערכה הכי קרובה שניתן לקבל בלי בדיקה מלאה.'
              : accuracy_level === 'בינונית'
              ? 'חלק מהנתונים הם הנחות. ההערכה כיוונית ומציגה סדר גודל.'
              : 'השתמשנו בברירות מחדל שמרניות. ההערכה היא אינדיקציה ראשונית בלבד.'}
          </p>
        </div>

        {/* Disclaimer */}
        <p className="mb-8 text-[12px] text-[var(--qa-text-muted)] leading-relaxed border-t border-[var(--qa-border-light)] pt-4">
          ⚠️ {DISCLAIMER_TEXT}
        </p>

        {/* CTA */}
        <section className="border-t border-[var(--qa-border-light)] pt-8">
          <p className="text-[15px] md:text-[16px] text-[var(--qa-text-secondary)] leading-relaxed mb-6">
            {content.ctaSoft}
          </p>
          <WhatsAppCTA firstName={firstName} whatsappText={content.whatsappText} />
        </section>
      </div>
    </div>
  );
}

function FixMapSection({ steps }: { steps: string[] }) {
  return (
    <section className="mb-8 p-5 rounded-[14px] border-2 border-[var(--qa-accent)] bg-[var(--qa-accent-soft)]">
      <h2 className="text-[15px] font-bold text-[var(--qa-text-primary)] mb-4 flex items-center gap-2">
        <span className="text-[var(--qa-accent)]">★</span>
        מפת התיקון: 3 צעדים ראשונים
      </h2>
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--qa-accent)] text-white text-[12px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-[15px] text-[var(--qa-text-primary)] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WhatsAppCTA({ whatsappText }: { firstName: string; whatsappText: string }) {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-[12px] bg-[#25D366] text-white text-[17px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all duration-150"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      שיחה על הצעד הראשון בוואטסאפ
    </a>
  );
}
