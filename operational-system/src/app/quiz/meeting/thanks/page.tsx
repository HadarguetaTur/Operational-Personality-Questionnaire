import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'התשלום התקבל | הדר אוטומציות',
  description: 'שיחת האסטרטגיה שלך שולמה. עכשיו מתאמות מועד.',
  robots: { index: false },
};

// The bot's WhatsApp number (ManyChat). NOT Hadar's private line.
const WHATSAPP_NUMBER = '972524759529';
const WHATSAPP_TEXT =
  'היי, שילמתי על שיחת האסטרטגיה ואשמח לתאם מועד.';

/**
 * Sumit success-redirect target. Set this URL as the "success page" of the
 * payment page in Sumit. Purchase + Schedule pixel events fire here, once,
 * on the only page a paying customer can reach.
 */
export default function MeetingThanksPage() {
  return (
    <div
      className="min-h-screen text-[var(--qa-text-primary)] py-16 px-6 md:px-8"
      dir="rtl"
    >
      <div className="max-w-[600px] mx-auto text-right">
        <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.08] text-[#0b5f56] mb-5">
          התשלום התקבל
        </span>

        <h1 className="studio-display text-[30px] md:text-[38px] font-black leading-[1.12] mb-4">
          <span className="qa-gradient-text">מעולה. עכשיו נקבע מתי נדבר.</span>
        </h1>

        <p className="text-[17px] text-[#46544f] leading-relaxed mb-8">
          שיחת האסטרטגיה שלך שולמה, וקיבלת אישור וחשבונית למייל. הצעד האחרון
          הוא לבחור מועד: כתבי לי עכשיו בוואטסאפ ונסגור את הזמן שהכי נוח לך.
          אם לא תספיקי, אני חוזרת אלייך עוד היום.
        </p>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-l from-teal-500 via-teal-500 to-emerald-500 text-white text-[17px] font-bold tracking-tight shadow-[0_10px_40px_-12px_rgba(20,184,166,0.55)] hover:shadow-[0_18px_60px_-12px_rgba(20,184,166,0.7)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] transition-all duration-300"
        >
          לתיאום המועד בוואטסאפ ←
        </a>

        <section className="mt-10 p-6 rounded-2xl bg-white backdrop-blur-sm border border-[#dce7ea] border-r-[3px] border-r-[#0e7a6e]">
          <h2 className="text-[16px] font-bold text-[#15302d] mb-3">מה כדאי להכין לשיחה</h2>
          <ul className="flex flex-col gap-2 text-[15px] text-[#46544f] leading-relaxed list-disc pr-5">
            <li>איך מגיעות אלייך פניות היום, ומה קורה להן אחרי ההודעה הראשונה.</li>
            <li>המקומות שבהם המידע יושב: וואטסאפ, יומן, טבלאות, מה שיש.</li>
            <li>לא צריך להכין מסמכים. מספיק שתדעי לספר איך שבוע רגיל נראה אצלך.</li>
          </ul>
        </section>

        <p className="mt-6 text-[14px] text-[#7c8884] leading-relaxed">
          תזכורת להתחייבות שלי: אם בסוף השיחה תרגישי שלא קיבלת ערך אמיתי, את
          מקבלת את מלוא הסכום בחזרה. ואם נמשיך לפרויקט, ה-350 ש&quot;ח מקוזזים ממנו
          במלואם.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[14px] text-[#7c8884] hover:text-[#0e7a6e] transition-colors"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>

      <Script id="fb-purchase" strategy="afterInteractive">
        {`if(typeof fbq==='function'){fbq('track','Purchase',{content_name:'strategy_call_350',value:350,currency:'ILS'});fbq('track','Schedule',{content_name:'strategy_call_350'});}`}
      </Script>
    </div>
  );
}
