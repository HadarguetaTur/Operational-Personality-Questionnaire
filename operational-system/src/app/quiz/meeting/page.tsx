import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SCOPING_CALL_TITLE,
  SCOPING_CALL_VALUE,
  SCOPING_CALL_PROMISE,
  SCOPING_CALL_TRUST,
} from '@/config/shortQuizResults';
import { getPaymentUrl } from '@/config/landingCopy';
import { AssistantChat } from '@/components/quiz/AssistantChat';
import { PaymentCta } from '@/components/quiz/PaymentCta';

export const metadata: Metadata = {
  title: 'שיחת אסטרטגיה | הדר אוטומציות',
  description:
    'שעה אחת על התהליך שלך, ובסופה מפה כתובה ומתועדפת של מה לסדר ראשון. 350 ש"ח, מקוזז במלואו מהפרויקט.',
};

// The bot's WhatsApp number (ManyChat). NOT Hadar's private line.
const WHATSAPP_NUMBER = '972524759529';
const WHATSAPP_TEXT =
  'היי, עשיתי את הבדיקה ויש לי שאלה על שיחת האסטרטגיה לפני שאני קובעת.';

export default async function MeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; token?: string }>;
}) {
  const { p, token } = await searchParams;
  const paymentUrl = getPaymentUrl(p ?? 'quiz');

  return (
    <div
      className="min-h-screen text-[var(--qa-text-primary)] py-12 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">
        <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.08] text-[#0b5f56] mb-5">
          שיחת אסטרטגיה · 350 ש&quot;ח · מקוזז במלואו מהפרויקט
        </span>

        <h1 className="studio-display text-[30px] md:text-[38px] font-black leading-[1.12] mb-4">
          <span className="qa-gradient-text">שעה אחת, ובסופה יש לך מפה כתובה של מה לסדר בעסק ובאיזה סדר</span>
        </h1>

        <p className="text-[17px] text-[#46544f] leading-relaxed mb-8">
          עברת את הבדיקה, אז את כבר יודעת איפה זה דולף. בשיחת האסטרטגיה אנחנו
          הופכות את זה לתוכנית: עוברות יחד על התהליך שלך, מסמנות מה עולה לך הכי
          הרבה, ואת יוצאת עם מסמך כתוב שנשאר אצלך, גם אם נעצור שם.
        </p>

        <section className="mb-8 p-6 rounded-2xl border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.06] backdrop-blur-sm shadow-[0_0_40px_-20px_rgba(20,184,166,0.35)]">
          <h2 className="text-[16px] font-bold text-[#15302d] mb-4">{SCOPING_CALL_TITLE}</h2>
          <ul className="flex flex-col gap-3">
            {SCOPING_CALL_VALUE.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 items-start text-[15px] text-[#46544f] leading-relaxed"
              >
                <svg className="w-5 h-5 text-[#0e7a6e] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 p-6 rounded-2xl bg-white backdrop-blur-sm border border-[#dce7ea] border-r-[3px] border-r-[#0e7a6e]">
          <h2 className="text-[16px] font-bold text-[#15302d] mb-3">ההבטחה שלי אלייך</h2>
          <p className="text-[15px] text-[#46544f] leading-relaxed mb-3">
            {SCOPING_CALL_TRUST}
          </p>
          <p className="text-[15px] text-[#46544f] leading-relaxed mb-3">
            {SCOPING_CALL_PROMISE.plan}
          </p>
          <p className="text-[15px] text-[#46544f] leading-relaxed">
            {SCOPING_CALL_PROMISE.price}
          </p>
        </section>

        <p className="text-[15px] text-[#7c8884] leading-relaxed mb-8">
          לפני שבונים מערכת, שעה של הבנה משותפת חוסכת בנייה לא נכונה, שעולה
          הרבה יותר בזמן ובכסף.
        </p>

        {/* Primary CTA: pay for the strategy call. Scheduling happens right after payment. */}
        <PaymentCta href={paymentUrl} pattern={p ?? null} />

        <p className="mt-4 text-center text-[14px] text-[#46544f] leading-relaxed">
          מיד אחרי התשלום נתאם את המועד שנוח לך.
        </p>

        {/* Secondary path: questions before paying — WhatsApp bot or the assistant chat. */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-3 w-full min-h-[54px] py-4 px-6 rounded-xl border border-emerald-600/30 bg-emerald-600/10 text-emerald-800 text-[16px] font-semibold hover:border-emerald-600/55 hover:bg-emerald-600/15 hover:text-emerald-900 active:scale-[0.99] transition-all duration-200"
        >
          יש לך שאלה לפני? כתבי לי בוואטסאפ ←
        </a>

        {token && (
          <section className="mt-10">
            <h2 className="text-[15px] font-bold text-[#15302d] mb-1">
              מתלבטת? אפשר לשאול את העוזרת הדיגיטלית שלי
            </h2>
            <p className="text-[14px] text-[#46544f] leading-relaxed mb-4">
              היא מכירה כבר את מה שסיפרת בבדיקה, ותענה לך על כל שאלה על השיחה,
              על התהליך ועל מה מתאים אצלך.
            </p>
            <AssistantChat token={token} />
          </section>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/quiz"
            className="text-[14px] text-[#7c8884] hover:text-[#0e7a6e] transition-colors"
          >
            חזרה לבדיקה
          </Link>
        </div>
      </div>
    </div>
  );
}
