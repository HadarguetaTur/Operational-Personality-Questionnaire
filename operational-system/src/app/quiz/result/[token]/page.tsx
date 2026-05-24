import { Suspense } from 'react';
import { ShortQuizResult } from '@/components/quiz/ShortQuizResult';
import FinalReport from '@/components/quiz/FinalReport';
import { createServiceRoleClient } from '@/lib/supabase/server';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" dir="rtl">
      <div className="w-8 h-8 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

async function ResultRouter({ token }: { token: string }) {
  // Peek at the quiz_type in result_snapshot to decide which renderer to use.
  // Falls back to the legacy FinalReport if quiz_type is not 'short'.
  // Uses service-role client because anon SELECT on leads is blocked by RLS (migration 007).
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('leads')
      .select('result_snapshot')
      .eq('report_token', token)
      .maybeSingle();

    const snapshot = data?.result_snapshot as Record<string, unknown> | null;
    if (snapshot?.quiz_type === 'short' || snapshot?.quiz_type === 'roi_calculator') {
      return <ShortQuizResult token={token} />;
    }
  } catch {
    // If server-side fetch fails, fall through to legacy renderer
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 md:px-8">
      <FinalReport />
    </div>
  );
}

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ type?: string; new?: string }>;
}

export default async function QuizResultPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { type } = await searchParams;

  // Fast path: quiz form always passes ?type=short, skip the DB round-trip
  if (type === 'short') {
    return (
      <Suspense fallback={<Spinner />}>
        <ShortQuizResult token={token} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<Spinner />}>
      <ResultRouter token={token} />
    </Suspense>
  );
}
