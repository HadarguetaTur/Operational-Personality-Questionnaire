import type { Metadata } from 'next';
import { QuizShell } from '@/components/quiz/QuizShell';

export const metadata: Metadata = {
  title: 'אבחון ניהולי – Architecture of Scale',
  description:
    'מיפוי דפוס הניהול שלך בכמה דקות. דוח מותאם אישית עם תמונת מצב, חוזקות וסיכוני צמיחה – בחינם.',
  openGraph: {
    title: 'אבחון ניהולי – Architecture of Scale',
    description:
      'מיפוי דפוס הניהול שלך בכמה דקות. דוח מותאם אישית עם תמונת מצב, חוזקות וסיכוני צמיחה – בחינם.',
    locale: 'he_IL',
    type: 'website',
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <QuizShell>{children}</QuizShell>;
}
