'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  buildAnswerMapFromInputs,
} from '@/config/shortQuizConfig';
import { buildWhereYouAre, type ResultType } from '@/config/shortQuizResults';
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
}

export function ShortQuizResult({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const [state, setState] = useState<ResultState>({
    status: 'loading',
    resultType: 'CENTRALIZED',
    whereYouAre: [],
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

      const resultType =
        (data.result_pattern as ResultType | undefined) ?? 'CENTRALIZED';

      const map = buildAnswerMapFromInputs(snapshot?.answers);
      const whereYouAre = buildWhereYouAre(map, resultType);

      setState({ status: 'ready', firstName, resultType, whereYouAre });
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
      firstName={state.firstName}
      showBanner={isNew}
      token={token}
    />
  );
}
