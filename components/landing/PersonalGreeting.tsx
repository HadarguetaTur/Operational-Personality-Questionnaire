import React from "react";

export const PersonalGreeting: React.FC<{ userName: string | null }> = ({ userName }) => {
  return (
    <section className="px-6 md:px-10 pt-8">
      <div className="max-w-[65ch] mx-auto">
        <div className="rounded-2xl shadow-sm border border-[var(--qa-border)] bg-white px-6 py-5">
          {userName ? (
            <p className="text-[17px] md:text-[18px] text-[var(--qa-text-primary)]">
              <span className="font-semibold">שלום {userName},</span>
              <br />
              <span className="text-[var(--qa-text-secondary)]">
                הדוח המלא נשלח אליך במייל. כאן תוכל/י לקבוע שיחת אפיון מותאמת אישית.
              </span>
            </p>
          ) : (
            <p className="text-[16px] md:text-[17px] text-[var(--qa-text-secondary)]">
              הדוח המלא נשלח אליך במייל. כאן תוכל/י לקבוע שיחת אפיון מותאמת אישית.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
