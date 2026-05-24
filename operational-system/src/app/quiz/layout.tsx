import type { Metadata } from 'next';
import { QuizShell } from '@/components/quiz/QuizShell';

export const metadata: Metadata = {
  title: 'בדיקה חינמית – איפה העסק נשען עלייך?',
  description:
    '6 שאלות שמזהות בדיוק איפה העסק נשען עלייך הכי חזק. דוח קצר ומותאם, חינם, בלי התחייבות.',
  openGraph: {
    title: 'בדיקה חינמית – איפה העסק נשען עלייך?',
    description:
      '6 שאלות שמזהות בדיוק איפה העסק נשען עלייך הכי חזק. דוח קצר ומותאם, חינם, בלי התחייבות.',
    locale: 'he_IL',
    type: 'website',
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <QuizShell>{children}</QuizShell>;
}
