'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  buildAnswerMapFromInputs,
  scoreQuiz,
} from '@/config/shortQuizConfig';
import {
  buildWhereYouAre,
  buildGapNote,
  type ResultType,
} from '@/config/shortQuizResults';
import { ShortQuizResultView } from './ShortQuizResultView';

interface ResultSnapshot {
  user_name?: string;
  answers?: Record<string, string>;
}

interface ResultState {
  status: 'loading' | 'ready' | 'error';
  firstName?: string;
  resultType: ResultType;
  whereYouAre: string[];
  gapNote: string | null;
  isStrong: boolean;
}

export function ShortQuizResult({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const [state, setState] = useState<ResultState>({
    status: 'loading',
    resultType: 'CENTRALIZED',
    whereYouAre: [],
    gapNote: null,
    isStrong: false,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        setState((s) => ({ ...s, status: 'error' }));
        return;
      }
      const { data, error } = await supabase
        .from('leads')
        .select('result_pattern, result_snapshot')
        .eq('report_token', token)
        .single();

      if (error || !data) {
        setState((s) => ({ ...s, status: 'error' }));
        return;
      }

      const snapshot = (data.result_snapshot ?? null) as ResultSnapshot | null;
      const firstName = (snapshot?.user_name ?? '').split(' ')[0];

      const storedType =
        (data.result_pattern as ResultType | undefined) ?? 'CENTRALIZED';

      // Recompute the full picture (gap / strong) from the saved answers.
      // Fall back to the stored archetype when answers are missing (legacy leads).
      const hasAnswers =
        !!snapshot?.answers && Object.keys(snapshot.answers).length >= 5;

      if (!hasAnswers) {
        setState({
          status: 'ready',
          firstName,
          resultType: storedType,
          whereYouAre: buildWhereYouAre({}, storedType),
          gapNote: null,
          isStrong: false,
        });
        return;
      }

      const map = buildAnswerMapFromInputs(snapshot.answers);
      const score = scoreQuiz(map);
      const resultType = score.resultType;
      const whereYouAre = score.isStrong ? [] : buildWhereYouAre(map, resultType);
      const gapNote =
        score.isGap && score.feltPain
          ? buildGapNote(score.feltPain, resultType)
          : null;

      setState({
        status: 'ready',
        firstName,
        resultType,
        whereYouAre,
        gapNote,
        isStrong: score.isStrong,
      });
    }
    load();
  }, [token]);

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
          לא הצלחנו למצוא את התוצאה. נסי שוב מאוחר יותר.
        </p>
      </div>
    );
  }

  return (
    <ShortQuizResultView
      resultType={state.resultType}
      whereYouAre={state.whereYouAre}
      gapNote={state.gapNote}
      isStrong={state.isStrong}
      firstName={state.firstName}
      showBanner={isNew}
      token={token}
    />
  );
}
