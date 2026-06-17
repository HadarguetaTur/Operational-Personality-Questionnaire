import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SCOPING_CALL_TITLE,
  SCOPING_CALL_VALUE,
  SCOPING_CALL_PROMISE,
} from '@/config/shortQuizResults';
import { AssistantChat } from '@/components/quiz/AssistantChat';

export const metadata: Metadata = {
  title: 'שיחת היכרות | הדר אוטומציות',
  description:
    'שיחת היכרות קצרה, בלי עלות, להבין איפה הכסף נוזל בין פנייה לסגירה ומה הצעד הנכון לפני שבונים מערכת.',
};

// The bot's WhatsApp number (ManyChat). NOT Hadar's private line.
const WHATSAPP_NUMBER = '972524759529';
const WHATSAPP_TEXT =
  'היי, עשיתי את הבדיקה ואשמח לקבוע שיחת היכרות קצרה. מתי אפשר?';

export default async function MeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div
      className="min-h-screen bg-[var(--qa-bg)] text-[var(--qa-text-primary)] py-12 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">
        <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[var(--qa-accent)] bg-[var(--qa-accent-soft)] text-[var(--qa-accent)] mb-4">
          שיחת היכרות, בלי עלות
        </span>

        <h1 className="text-[28px] md:text-[34px] font-bold leading-snug mb-4">
          שיחת היכרות קצרה, להבין איפה הכסף נוזל ומה כדאי לסדר ראשון
        </h1>

        <p className="text-[17px] text-[var(--qa-text-secondary)] leading-relaxed mb-8">
          זו לא שיחת מכירה. זו שיחה קצרה שבה אנחנו מסתכלות ביחד על מה שעלה לך
          בבדיקה, מבינות אם ואיך אני יכולה לעזור, ומחליטות מה הדבר הראשון שכדאי
          לסדר. בלי עלות ובלי מחויבות להמשך.
        </p>

        {/* Live assistant chat — the primary way to take the next step */}
        {token && (
          <section className="mb-10">
            <h2 className="text-[15px] font-bold mb-1">
              דברי עכשיו עם העוזרת הדיגיטלית שלי
            </h2>
            <p className="text-[14px] text-[var(--qa-text-secondary)] leading-relaxed mb-4">
              היא מכירה כבר את מה שסיפרת בבדיקה. ספרי לה בכמה מילים מה הכי בוער,
              והיא תעזור לך לקבוע את שיחת ההיכרות, כאן ועכשיו.
            </p>
            <AssistantChat token={token} />
          </section>
        )}

        <section className="mb-8 p-5 rounded-[14px] border-2 border-[var(--qa-accent)] bg-[var(--qa-accent-soft)]">
          <h2 className="text-[16px] font-bold mb-4">{SCOPING_CALL_TITLE}</h2>
          <ul className="flex flex-col gap-3">
            {SCOPING_CALL_VALUE.map((item) => (
              <li
                key={item}
                className="flex gap-2 items-start text-[15px] text-[var(--qa-text-secondary)] leading-relaxed"
              >
                <span className="text-[var(--qa-accent)] font-bold mt-px shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 p-5 rounded-[14px] bg-[var(--qa-surface)] border-r-[3px] border-[var(--qa-accent)] border-t border-b border-l border-[var(--qa-border)]">
          <h2 className="text-[16px] font-bold mb-3">ההבטחה שלי אלייך</h2>
          <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed mb-3">
            {SCOPING_CALL_PROMISE.plan}
          </p>
          <p className="text-[15px] text-[var(--qa-text-secondary)] leading-relaxed">
            {SCOPING_CALL_PROMISE.price}
          </p>
        </section>

        <p className="text-[15px] text-[var(--qa-text-muted)] leading-relaxed mb-8">
          לפני שבונים מערכת, חצי שעה של הבנה משותפת חוסכת בנייה לא נכונה, שעולה
          הרבה יותר בזמן ובכסף.
        </p>

        {/* Secondary path: WhatsApp to the bot. The free intro is booked through
            the chat above or here; payment for the paid scoping comes later, inside
            the call, not as an up-front CTA. */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-[12px] border border-[var(--qa-accent)] text-[var(--qa-accent)] text-[16px] font-semibold hover:bg-[var(--qa-accent-soft)] active:scale-[0.99] transition-all duration-150"
        >
          מעדיפה וואטסאפ? לקביעת שיחת ההיכרות שם ←
        </a>

        <div className="mt-6 text-center">
          <Link
            href="/quiz"
            className="text-[14px] text-[var(--qa-text-muted)] hover:text-[var(--qa-accent)] transition-colors"
          >
            חזרה לבדיקה
          </Link>
        </div>
      </div>
    </div>
  );
}
