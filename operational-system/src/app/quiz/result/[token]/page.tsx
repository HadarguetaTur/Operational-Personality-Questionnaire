import { Suspense } from 'react';
import FinalReport from '@/components/quiz/FinalReport';

function ReportFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" dir="rtl">
      <div className="w-8 h-8 border-2 border-[var(--qa-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function QuizResultPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 md:px-8">
      <Suspense fallback={<ReportFallback />}>
        <FinalReport />
      </Suspense>
    </div>
  );
}
