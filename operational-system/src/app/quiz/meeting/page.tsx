import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SCOPING_CALL_TITLE,
  SCOPING_CALL_VALUE,
  SCOPING_CALL_PROMISE,
  SCOPING_CALL_TRUST,
} from '@/config/shortQuizResults';
import { AssistantChat } from '@/components/quiz/AssistantChat';

export const metadata: Metadata = {
  title: 'שיחת היכרות | הדר אוטומציות',
  description:
    'שיחת היכרות קצרה, ללא עלות, להבין איפה הכסף נוזל בין פנייה לסגירה ומה הצעד הנכון לפני שבונים מערכת.',
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
      className="min-h-screen text-[var(--qa-text-primary)] py-12 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">
        <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/[0.08] text-teal-300 mb-5">
          שיחת היכרות, ללא עלות
        </span>

        <h1 className="text-[29px] md:text-[36px] font-extrabold leading-[1.15] tracking-tight mb-4">
          <span className="qa-gradient-text">שיחת היכרות קצרה, להבין איפה הכסף נוזל ומה כדאי לסדר ראשון</span>
        </h1>

        <p className="text-[17px] text-white/70 leading-relaxed mb-8">
          זו לא שיחת מכירה. זו שיחה קצרה שבה אנחנו מסתכלות ביחד על מה שעלה לך
          בבדיקה, מבינות אם ואיך אני יכולה לעזור, ומחליטות מה הדבר הראשון שכדאי
          לסדר. ללא עלות ובלי מחויבות להמשך.
        </p>

        {/* Live assistant chat — the primary way to take the next step */}
        {token && (
          <section className="mb-10">
            <h2 className="text-[15px] font-bold text-white mb-1">
              דברי עכשיו עם העוזרת הדיגיטלית שלי
            </h2>
            <p className="text-[14px] text-white/65 leading-relaxed mb-4">
              היא מכירה כבר את מה שסיפרת בבדיקה. ספרי לה בכמה מילים מה הכי בוער,
              והיא תעזור לך לקבוע את שיחת ההיכרות, כאן ועכשיו.
            </p>
            <AssistantChat token={token} />
          </section>
        )}

        <section className="mb-8 p-6 rounded-2xl border border-teal-500/30 bg-teal-500/[0.04] backdrop-blur-sm shadow-[0_0_40px_-20px_rgba(20,184,166,0.35)]">
          <h2 className="text-[16px] font-bold text-white mb-4">{SCOPING_CALL_TITLE}</h2>
          <ul className="flex flex-col gap-3">
            {SCOPING_CALL_VALUE.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 items-start text-[15px] text-white/80 leading-relaxed"
              >
                <svg className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 p-6 rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] border-r-[3px] border-r-teal-500">
          <h2 className="text-[16px] font-bold text-white mb-3">ההבטחה שלי אלייך</h2>
          <p className="text-[15px] text-white/70 leading-relaxed mb-3">
            {SCOPING_CALL_TRUST}
          </p>
          <p className="text-[15px] text-white/70 leading-relaxed mb-3">
            {SCOPING_CALL_PROMISE.plan}
          </p>
          <p className="text-[15px] text-white/70 leading-relaxed">
            {SCOPING_CALL_PROMISE.price}
          </p>
        </section>

        <p className="text-[15px] text-white/45 leading-relaxed mb-8">
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
          className="flex items-center justify-center gap-3 w-full min-h-[54px] py-4 px-6 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-200 text-[16px] font-semibold hover:border-emerald-300/55 hover:bg-emerald-500/20 hover:text-white active:scale-[0.99] transition-all duration-200"
        >
          מעדיפה וואטסאפ? לקביעת שיחת ההיכרות שם ←
        </a>

        <div className="mt-6 text-center">
          <Link
            href="/quiz"
            className="text-[14px] text-white/45 hover:text-teal-400 transition-colors"
          >
            חזרה לבדיקה
          </Link>
        </div>
      </div>
    </div>
  );
}
