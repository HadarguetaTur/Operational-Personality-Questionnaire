import React from 'react';
import { useNavigate } from 'react-router-dom';

const Intro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col justify-center min-h-full py-10 md:py-16 px-6 md:px-8 text-right overflow-hidden" dir="rtl">
      {/* גרפיקות דקורטיביות — עומק ויזואלי */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[var(--qa-accent)]/10 blur-3xl" />
        <div className="absolute bottom-1/4 -left-16 w-64 h-64 rounded-full bg-[var(--qa-accent)]/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[55ch] mx-auto">
        <section className="bg-[var(--qa-surface)]/90 backdrop-blur-sm border border-[var(--qa-border)] rounded-2xl px-6 md:px-10 py-8 md:py-12 text-right shadow-xl shadow-black/20">
          <h1 className="text-[32px] md:text-[40px] font-bold text-[var(--qa-text-primary)] leading-tight mb-3">
            אם הגעתם לכאן, לקוחות זה לא הבעיה שלכם
          </h1>
          <p className="text-[17px] md:text-[18px] text-[var(--qa-accent)] font-medium mb-6">
            אבחון Architecture of Scale (AoS)
          </p>

          <div className="space-y-5 text-[16px] md:text-[17px] text-[var(--qa-text-primary)] leading-[1.75]">
            <p className="text-white/95">
              רוב העסקים לא קורסים בגלל חוסר בלקוחות. הם קורסים כי המבנה שלהם &quot;רעיל&quot; לבעלים.
            </p>
            <p className="text-white/95">
              השאלון הזה ימפה ב <strong className="text-[var(--qa-accent)]">5 דקות</strong> את דפוס הניהול שלך ויגיד לך בדיוק איזה חלק במנגנון שלך יתפרק ראשון כשתנסה/י לגדול.
            </p>
            <p className="text-white/90">
              אין כאן תשובות &quot;טובות&quot; או &quot;רעות&quot;.<br />
              יש תמונת מצב, ועל בסיסה כיוון חכם להמשך.
            </p>
          </div>

          <div className="border-t border-[var(--qa-border)] pt-6 mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-[15px] text-[var(--qa-text-primary)]">
              <span className="text-[var(--qa-accent)]">⏱</span>
              <span>משך האבחון: 5 דקות</span>
            </div>
            <div className="flex items-center gap-2 text-[15px] text-[var(--qa-text-primary)]">
              <span className="text-[var(--qa-accent)]">📄</span>
              <span>בסיום: דוח ניהולי מותאם אישית</span>
            </div>
          </div>
        </section>

        <button
          onClick={() => navigate('/lead-form')}
          className="mt-8 w-full h-14 rounded-xl bg-[var(--qa-accent)] text-white text-[17px] font-semibold transition-all duration-200 hover:bg-[var(--qa-accent-hover)] hover:shadow-lg hover:shadow-[var(--qa-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qa-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qa-bg)] active:scale-[0.99] shadow-lg shadow-[var(--qa-accent)]/25"
        >
          התחל סריקת מערכת (5 דקות)
        </button>

        <p className="text-[14px] text-[var(--qa-text-secondary)] mt-5">
          נתחיל בהבנת ההקשר שבו העסק פועל כיום.
        </p>
      </div>
    </div>
  );
};

export default Intro;
