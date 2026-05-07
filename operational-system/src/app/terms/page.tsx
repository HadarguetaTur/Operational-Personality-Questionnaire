import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'תנאי שימוש – הדר אוטומציות',
  description: 'תנאי השימוש של האתר והשירותים של הדר אוטומציות — תורג׳מן גואטה הדר מזל.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0c1220] text-white" dir="rtl">
      {/* Navbar */}
      <header className="sticky top-0 z-50 h-16 flex items-center px-5 md:px-8 border-b border-white/[0.06] bg-[#0c1220]/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="חזרה לדף הבית">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
              הדר אוטומציות
            </span>
          </Link>
          <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            חזרה לדף הבית
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">תנאי שימוש</h1>
        <p className="text-white/40 text-sm mb-12">עדכון אחרון: מאי 2026</p>

        <div className="prose prose-invert prose-sm md:prose-base max-w-none space-y-10 text-white/75 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. הסכמה לתנאים</h2>
            <p>
              השימוש באתר ובשאלון האבחון של <strong className="text-white">הדר אוטומציות — תורג&apos;מן גואטה הדר מזל</strong> (ח.פ. 204174361) מהווה הסכמה לתנאים המפורטים להלן.
              אם אינך מסכימ/ה לתנאים, אנא הפסק/י את השימוש.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. תיאור השירות</h2>
            <p>
              האתר מציע שאלון אבחון ניהולי חינמי המפיק דוח מותאם אישית, וסשן אפיון תפעולי בתשלום של 30 דקות.
              השירות אינו מחליף ייעוץ משפטי, רואה חשבון או ייעוץ פיננסי מוסמך.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. תנאי הסשן בתשלום</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>התשלום מתבצע מראש דרך עמוד התשלום של Sumit.</li>
              <li>ביטול עד 24 שעות לפני המועד — החזר כספי מלא.</li>
              <li>ביטול פחות מ-24 שעות לפני — לא יינתן החזר, אלא אם מדובר בנסיבות חריגות לפי שיקול דעת הספקית.</li>
              <li>אי-הגעה ללא הודעה מראש — הסשן אינו ניתן לזיכוי.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. קניין רוחני</h2>
            <p>
              כל התוכן באתר — טקסטים, עיצוב, לוגו, שאלון, מתודולוגיות — הוא קניינה הבלעדי של הדר אוטומציות.
              אין להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בכל חלק מהתוכן ללא אישור כתוב מראש.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. הגבלת אחריות</h2>
            <p>
              הדוח וסשן האפיון מבוססים על המידע שמסר המשתמש. הספקית אינה אחראית לתוצאות עסקיות שנבעו מיישום ההמלצות.
              השירות ניתן &quot;כפי שהוא&quot; (as-is) ללא אחריות לתוצאה עסקית ספציפית.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. שימוש מותר</h2>
            <p>
              השאלון והאתר מיועדים לשימוש אישי-עסקי של בעלי עסקים ומנהלים בלבד.
              אסור להשתמש בשירות למטרות בלתי חוקיות, פגיעה בצד שלישי, הפצת ספאם, או ניסיון לפרוץ את המערכת.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. שינויים בתנאים</h2>
            <p>
              הספקית שומרת לעצמה את הזכות לעדכן את תנאי השימוש בכל עת. עדכונים מהותיים יפורסמו בעמוד זה.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. יצירת קשר</h2>
            <p>
              לשאלות בנוגע לתנאים ניתן לפנות אל <strong className="text-white">הדר אוטומציות — תורג&apos;מן גואטה הדר מזל</strong>:{' '}
              מייל:{' '}
              <a href="mailto:cs@hadarturgemanautomations.com" className="text-teal-400 hover:underline">
                cs@hadarturgemanautomations.com
              </a>{' '}
              | טלפון/וואטסאפ:{' '}
              <a href="https://wa.me/972504343547" className="text-teal-400 hover:underline">
                050-434-3547
              </a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-5 md:px-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-4 text-sm text-white/25">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 font-medium">הדר אוטומציות — תורג&apos;מן גואטה הדר מזל</span>
              <span>
                מייל:{' '}
                <a href="mailto:cs@hadarturgemanautomations.com" className="hover:text-white/50 transition-colors">
                  cs@hadarturgemanautomations.com
                </a>
              </span>
              <span>
                טלפון/וואטסאפ:{' '}
                <a href="https://wa.me/972504343547" className="hover:text-white/50 transition-colors">
                  050-434-3547
                </a>
              </span>
            </div>
            <nav className="flex gap-5" aria-label="ניווט תחתון">
              <Link href="/contact" className="hover:text-white/50 transition-colors">יצירת קשר</Link>
              <Link href="/privacy" className="hover:text-white/50 transition-colors">מדיניות פרטיות</Link>
              <Link href="/terms" className="hover:text-white/50 transition-colors">תנאי שימוש</Link>
              <Link href="/" className="hover:text-white/50 transition-colors">דף הבית</Link>
            </nav>
          </div>
          <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} הדר אוטומציות. כל הזכויות שמורות.</p>
        </div>
      </footer>
    </div>
  );
}
