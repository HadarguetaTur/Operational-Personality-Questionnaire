import React from 'react';
import Link from 'next/link';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="footer-section-bg py-8 md:py-10 px-6 md:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto flex flex-col gap-3 items-center text-center">
        <p className="text-white/70 text-sm font-medium">הדר אוטומציות — תורג&apos;מן גואטה הדר מזל</p>
        <p className="text-white/45 text-xs">
          מייל:{' '}
          <a href="mailto:cs@hadarturgemanautomations.com" className="hover:text-white/70 transition-colors">
            cs@hadarturgemanautomations.com
          </a>
          {' · '}
          טלפון/וואטסאפ:{' '}
          <a href="https://wa.me/972504343547" className="hover:text-white/70 transition-colors">
            050-434-3547
          </a>
        </p>
        <nav className="flex gap-4 text-xs text-white/35" aria-label="ניווט תחתון">
          <Link href="/contact" className="hover:text-white/60 transition-colors">יצירת קשר</Link>
          <Link href="/privacy" className="hover:text-white/60 transition-colors">מדיניות פרטיות</Link>
          <Link href="/terms" className="hover:text-white/60 transition-colors">תנאי שימוש</Link>
        </nav>
        <p className="text-white/20 text-xs">&copy; {new Date().getFullYear()} הדר אוטומציות. כל הזכויות שמורות.</p>
      </div>
    </footer>
  );
};
