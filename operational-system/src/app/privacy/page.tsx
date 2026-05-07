import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות – Architecture of Scale',
  description: 'מדיניות הפרטיות של האתר והשירותים של Architecture of Scale / הדר אוטומציות.',
};

export default function PrivacyPage() {
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
              Architecture of Scale
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
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">מדיניות פרטיות</h1>
        <p className="text-white/40 text-sm mb-12">עדכון אחרון: מאי 2026</p>

        <div className="prose prose-invert prose-sm md:prose-base max-w-none space-y-10 text-white/75 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. מי אנחנו?</h2>
            <p>
              האתר מופעל על ידי <strong className="text-white">הדר אוטומציות</strong> (ח.פ. 204174361),
              המספקת שירותי ייעוץ תפעולי, בניית אוטומציות ומערכות לניהול עסקים. לפניות:&nbsp;
              <a href="mailto:cs@hadarturgemanautomations.com" className="text-teal-400 hover:underline">
                cs@hadarturgemanautomations.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. אילו נתונים אנו אוספים?</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white">פרטי קשר:</strong> שם ואימייל שמוזנים בטופס הליד לפני האבחון.</li>
              <li><strong className="text-white">נתוני אבחון:</strong> תשובות לשאלון הניהולי, לצורך הפקת הדוח האישי.</li>
              <li><strong className="text-white">נתוני שימוש:</strong> עמודים שנצפו, לחיצות על כפתורי CTA, נתוני UTM — לצורכי אנליטיקה.</li>
              <li><strong className="text-white">מידע טכני:</strong> כתובת IP, סוג דפדפן, מכשיר — נאסף אוטומטית.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. למה אנחנו משתמשים בנתונים?</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>הפקת דוח האבחון האישי ושליחתו למייל.</li>
              <li>יצירת קשר לאחר האבחון לצורך תיאום שיחת אפיון.</li>
              <li>שיפור האתר והשאלון על בסיס נתוני שימוש.</li>
              <li>שליחת תוכן שיווקי רלוונטי — בהסכמה בלבד.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. שיתוף עם צד שלישי</h2>
            <p>
              המידע לא נמכר. ייתכן שנשתף עם ספקי שירות הכרחיים (Supabase לאחסון נתונים, Google לדיוור ואנליטיקה, Cal.com לתיאום פגישות) —
              אך רק במידה הנדרשת לפעילות. כל הספקים עומדים בתקני אבטחת מידע מקובלים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. אחסון ואבטחה</h2>
            <p>
              הנתונים מאוחסנים בשרתים מוגנים של Supabase (EU region). אנו נוקטים באמצעי אבטחה טכניים ארגוניים סבירים להגנה על מידע אישי.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. זכויותיך</h2>
            <p>
              בהתאם לחוק הגנת הפרטיות, יש לך זכות לעיין במידע שנמסר, לתקנו או לבקש את מחיקתו.
              לבקשות: <a href="mailto:cs@hadarturgemanautomations.com" className="text-teal-400 hover:underline">cs@hadarturgemanautomations.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. עוגיות (Cookies)</h2>
            <p>
              האתר עשוי להשתמש ב-cookies לצורכי אנליטיקה ושיפור חוויית המשתמש. ניתן להגדיר את הדפדפן לחסום עוגיות, אך הדבר עלול להשפיע על חלק מהפונקציונליות.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. שינויים במדיניות</h2>
            <p>
              נעדכן עמוד זה בעת כל שינוי מהותי. המשך השימוש לאחר עדכון מהווה הסכמה לגרסה המעודכנת.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-5 md:px-8">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/25">
          <span>&copy; {new Date().getFullYear()} הדר אוטומציות. כל הזכויות שמורות.</span>
          <nav className="flex gap-5" aria-label="ניווט תחתון">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">מדיניות פרטיות</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">תנאי שימוש</Link>
            <Link href="/" className="hover:text-white/50 transition-colors">דף הבית</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
