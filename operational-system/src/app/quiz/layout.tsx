import type { Metadata } from 'next';
import { QuizShell } from '@/components/quiz/QuizShell';

export const metadata: Metadata = {
  title: 'בדיקה חינמית | איפה הכסף נוזל בין פנייה לסגירה?',
  description:
    'בדיקה קצרה שמזהה איפה נושרות פניות וכסף בעסק שלך, ומה הצעד הראשון לסדר. חינם, בלי התחייבות.',
  openGraph: {
    title: 'בדיקה חינמית | איפה הכסף נוזל בין פנייה לסגירה?',
    description:
      'בדיקה קצרה שמזהה איפה נושרות פניות וכסף בעסק שלך, ומה הצעד הראשון לסדר. חינם, בלי התחייבות.',
    locale: 'he_IL',
    type: 'website',
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <QuizShell>{children}</QuizShell>;
}
