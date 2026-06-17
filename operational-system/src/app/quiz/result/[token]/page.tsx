import { Suspense } from 'react';
import { ShortQuizResult } from '@/components/quiz/ShortQuizResult';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" dir="rtl">
      <div className="w-8 h-8 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
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
      <ShortQuizResult token={token} />
    </Suspense>
  );
}
