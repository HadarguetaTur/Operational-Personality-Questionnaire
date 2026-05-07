import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'יצירת קשר – הדר אוטומציות',
  description: 'יצירת קשר עם הדר אוטומציות — תורג׳מן גואטה הדר מזל. שירותי אוטומציה עסקית, אבחון תפעולי ובניית תהליכים.',
};

export default function ContactPage() {
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
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">יצירת קשר</h1>
        <p className="text-white/40 text-sm mb-12">נשמח לשמוע מכם</p>

        <div className="prose prose-invert prose-sm md:prose-base max-w-none space-y-10 text-white/75 leading-relaxed">

          <section>
            <p className="text-base md:text-lg text-white/80 leading-relaxed mb-6">
              ניתן ליצור קשר עם <strong className="text-white">הדר אוטומציות — תורג&apos;מן גואטה הדר מזל</strong> באחת מהדרכים הבאות:
            </p>

            <p className="text-white/50 text-sm mb-8">
              הפנייה מיועדת לשאלות לגבי שירותי אוטומציה עסקית, אבחון תפעולי, בניית תהליכים, מערכות ניהול וחיבורי WhatsApp / CRM / טפסים / יומנים וכלים עסקיים נוספים.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Email */}
              <a
                href="mailto:cs@hadarturgemanautomations.com"
                className="group flex flex-col gap-3 p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-teal-500/30 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/40 mb-1">מייל</p>
                  <p className="text-sm font-semibold text-teal-300 group-hover:text-teal-200 transition-colors break-all">
                    cs@hadarturgemanautomations.com
                  </p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/972504343547"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-3 p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-emerald-500/[0.06] hover:border-emerald-500/30 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/40 mb-1">טלפון / וואטסאפ</p>
                  <p className="text-sm font-semibold text-emerald-300 group-hover:text-emerald-200 transition-colors">
                    050-434-3547
                  </p>
                </div>
              </a>

              {/* Website */}
              <a
                href="https://hadarturgemanautomations.com"
                className="group flex flex-col gap-3 p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/50">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/40 mb-1">אתר</p>
                  <p className="text-sm font-semibold text-white/60 group-hover:text-white/80 transition-colors">
                    hadarturgemanautomations.com
                  </p>
                </div>
              </a>
            </div>
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
