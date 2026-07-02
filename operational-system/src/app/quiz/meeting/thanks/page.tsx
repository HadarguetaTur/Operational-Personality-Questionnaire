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
        <span className="inline-block text-[13px] font-semibold px-3 py-1 rounded-full border border-[#5B3FC4]/30 bg-[#5B3FC4]/[0.08] text-[#4A32A4] mb-5">
          התשלום התקבל
        </span>

        <h1 className="studio-display text-[30px] md:text-[38px] font-black leading-[1.12] mb-4">
          <span className="qa-gradient-text">מעולה. עכשיו נקבע מתי נדבר.</span>
        </h1>

        <p className="text-[17px] text-[#3D4859] leading-relaxed mb-8">
          שיחת האסטרטגיה שלך שולמה, וקיבלת אישור וחשבונית למייל. הצעד האחרון
          הוא לבחור מועד: כתבי לי עכשיו בוואטסאפ ונסגור את הזמן שהכי נוח לך.
          אם לא תספיקי, אני חוזרת אלייך בהקדם, לרוב עוד באותו יום.
        </p>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="studio-cta-grad studio-cta-shine flex items-center justify-center gap-3 w-full min-h-[56px] py-4 px-6 rounded-2xl text-white text-[17px] font-bold tracking-tight"
        >
          לתיאום המועד בוואטסאפ ←
        </a>

        <section className="mt-10 p-6 rounded-2xl bg-white backdrop-blur-sm border border-[#E6E2F4] border-r-[3px] border-r-[#5B3FC4]">
          <h2 className="text-[16px] font-bold text-[#0D1B2A] mb-3">מה כדאי להכין לשיחה שלנו</h2>
          <ul className="flex flex-col gap-2 text-[15px] text-[#3D4859] leading-relaxed list-disc pr-5">
            <li>איך מגיעות אלייך פניות היום, ומה קורה להן אחרי ההודעה הראשונה.</li>
            <li>המקומות שבהם המידע יושב: וואטסאפ, יומן, טבלאות, מה שיש.</li>
            <li>לא צריך להכין מסמכים. מספיק שתדעי לספר איך שבוע רגיל נראה אצלך.</li>
          </ul>
        </section>

        <p className="mt-6 text-[14px] text-[#68707C] leading-relaxed">
          וההתחייבות שלי אלייך בתוקף: אם בסוף השיחה תרגישי שלא קיבלת ערך
          אמיתי, את מקבלת ממני את מלוא הסכום בחזרה. ואם נמשיך לפרויקט, הסכום
          מקוזז במלואו מהמחיר.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[14px] text-[#68707C] hover:text-[#5B3FC4] transition-colors"
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
