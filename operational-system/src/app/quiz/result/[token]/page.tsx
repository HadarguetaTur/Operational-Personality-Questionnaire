import { Suspense } from 'react';
import { ShortQuizResult } from '@/components/quiz/ShortQuizResult';
import FinalReport from '@/components/quiz/FinalReport';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('leads')
      .select('result_snapshot')
      .eq('report_token', token)
      .maybeSingle();

    const snapshot = data?.result_snapshot as Record<string, unknown> | null;
    if (snapshot?.quiz_type === 'short') {
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
}

export default async function QuizResultPage({ params }: PageProps) {
  const { token } = await params;
  return (
    <Suspense fallback={<Spinner />}>
      <ResultRouter token={token} />
    </Suspense>
  );
}
