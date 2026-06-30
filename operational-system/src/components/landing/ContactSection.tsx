'use client';

import React, { useState } from 'react';
import { isTurnstileSiteConfigured, TurnstileWidget } from '@/components/security/TurnstileWidget';
import { FadeInSection } from './FadeInSection';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export type ContactSectionVariant = 'home' | 'landing';

const inputBase =
  'w-full rounded-xl px-4 py-3.5 text-[15px] md:text-base transition-colors duration-200 focus:outline-none';

const landingInputClass =
  `${inputBase} text-white placeholder:text-white/28 border border-white/12 bg-black/25 focus:border-[var(--landing-primary)]/55 focus:ring-2 focus:ring-[var(--landing-primary)]/25`;

const homeInputClass =
  `${inputBase} text-[#15302d] placeholder:text-[#9aa6a2] border border-[#dce7ea] bg-[#f6f9fb] focus:border-[#0e7a6e]/55 focus:ring-2 focus:ring-[#0e7a6e]/18`;

const WHATSAPP_URL = 'https://wa.me/972504343547';
const WHATSAPP_DISPLAY = '050-434-3547';
const CAL_BOOKING_URL = 'https://cal.com/הדר-גואטה-0oei5m/פגישת-הטמעה';

interface ContactSectionProps {
  /** `home`: דף הבית (#0c1220, כרטיסיות וגרדיאנט טורקיז). ברירת מחדל: דף נחיתה לפי דפוס */
  variant?: ContactSectionVariant;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ variant = 'landing' }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileMountKey, setTurnstileMountKey] = useState(0);

  const inputClassName = variant === 'home' ? homeInputClass : landingInputClass;
  const labelClass = `block text-sm font-medium mb-2 ${variant === 'home' ? 'text-[#46544f]' : 'text-white/65'}`;
  const reqClass = variant === 'home' ? 'text-[#0d9488]' : 'text-teal-400/90';
  const optClass = variant === 'home' ? 'text-[#9aa6a2]' : 'text-white/35';
  const errorClass =
    variant === 'home'
      ? 'rounded-xl border border-red-300 bg-red-50 px-4 py-3.5 text-red-700 text-sm leading-relaxed'
      : 'rounded-xl border border-red-500/35 bg-red-950/[0.25] px-4 py-3.5 text-red-100/95 text-sm leading-relaxed';
  const submitClass =
    variant === 'home'
      ? 'w-full min-h-[54px] rounded-full studio-cta-grad font-bold text-white text-base hover:-translate-y-[1px] hover:shadow-[0_18px_44px_-12px_rgba(14,122,110,0.6)] active:translate-y-0 active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f9fb] transition-all duration-300'
      : 'w-full min-h-[54px] rounded-xl bg-gradient-to-l from-teal-500 to-emerald-500 font-bold text-white text-base hover:shadow-[0_0_48px_-10px_rgba(20,184,166,0.5)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none disabled:hover:shadow-none disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-all duration-300';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTurnstileSiteConfigured() && (!turnstileToken || turnstileToken.trim() === '')) {
      setFormState('error');
      setErrorMessage('נא לאמת את האבטחה לפני השליחה');
      return;
    }

    setFormState('submitting');
    setErrorMessage(null);

    try {
      const body: Record<string, unknown> = {
        name,
        email,
        phone: phone.trim() || undefined,
        message,
      };
      if (turnstileToken) body.turnstileToken = turnstileToken;

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        setFormState('error');
        setErrorMessage(data.error ?? 'משהו השתבש. נסי שוב.');
        setTurnstileToken(null);
        setTurnstileMountKey((k) => k + 1);
        return;
      }

      setFormState('success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch {
      setFormState('error');
      setErrorMessage('לא ניתן להתחבר לשרת. בדקי את החיבור ונסי שוב.');
      setTurnstileToken(null);
      setTurnstileMountKey((k) => k + 1);
    }
  };

  const sectionClass =
    variant === 'home'
      ? 'relative py-24 md:py-32 px-5 md:px-8 overflow-hidden bg-white border-t border-[#dce7ea] scroll-mt-20'
      : 'faq-section-bg py-20 md:py-24 px-6 md:px-8 relative scroll-mt-20';

  return (
    <section id="contact" className={sectionClass} aria-labelledby="contact-heading">
      {variant === 'home' ? (
        <>
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(720px,90vw)] h-[280px] bg-[#0e7a6e]/[0.06] rounded-full blur-[100px]" />
          </div>
        </>
      ) : null}

      <FadeInSection delay={variant === 'home' ? 80 : 50}>
        <div
          className={`relative z-10 mx-auto ${variant === 'home' ? 'max-w-6xl' : 'w-full max-w-[var(--max-content)]'}`}
        >
          <div dir="rtl">
            {variant === 'home' ? (
              <div className="text-center mb-12 md:mb-14">
                <div className="flex items-center justify-center gap-2.5 mb-4">
                  <span className="h-px w-7 bg-[#0e7a6e]/40" aria-hidden />
                  <span className="text-[#0e7a6e] text-xs font-bold tracking-[0.16em]">יצירת קשר</span>
                  <span className="h-px w-7 bg-[#0e7a6e]/40 sm:hidden" aria-hidden />
                </div>
                <h2 id="contact-heading" className="studio-display text-3xl md:text-5xl text-[#15302d] mb-4 leading-tight">
                  רוצה לדבר לפני שמתחילים?
                </h2>
                <p className="text-[#46544f] text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                  השאירו פרטים ואחזור אליכם בהקדם, שלחו הודעה ישירה בוואטסאפ או קבעו פגישה ביומן.
                </p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`שליחת הודעת וואטסאפ למספר ${WHATSAPP_DISPLAY}`}
                  className="mt-6 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-6 text-sm font-semibold text-emerald-800 transition-all duration-200 hover:border-emerald-600/55 hover:bg-emerald-600/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.14 6.44 2.14 11.9c0 1.75.46 3.45 1.33 4.95L2.05 22l5.29-1.39a9.82 9.82 0 0 0 4.7 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.51 2 12.04 2Zm5.77 14.15c-.24.67-1.38 1.29-1.93 1.37-.49.07-1.12.1-1.8-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.16-4.94-4.35-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36.2 0 .39 0 .57.01.18.01.43-.07.67.51.24.58.84 2.01.91 2.15.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.31.37-.44.5-.14.14-.29.29-.12.58.17.29.75 1.24 1.61 2 .11.1 1.25 1.64 3.02 2.3.43.16.76.25 1.02.32.43.14.82.12 1.13.07.34-.05 1.05-.43 1.2-.84.15-.41.15-.77.1-.84-.05-.07-.19-.12-.4-.22-.22-.1-1.28-.63-1.48-.7-.2-.07-.34-.1-.48.1-.14.2-.55.7-.67.84-.12.14-.24.15-.46.05-.22-.1-.9-.33-1.72-1.06-.64-.57-1.07-1.27-1.19-1.49-.12-.22-.01-.34.09-.44.09-.09.22-.24.32-.36.1-.12.14-.2.22-.34.07-.14.04-.27-.02-.38-.05-.1-.48-1.16-.66-1.59-.17-.42-.35-.36-.48-.36h-.41c-.14 0-.38.05-.58.27-.2.22-.77.75-.77 1.82 0 1.07.79 2.11.9 2.25.1.14 1.55 2.37 3.76 3.33.53.23.94.37 1.26.47.53.17 1.01.15 1.39.09.42-.06 1.28-.52 1.46-1.03.18-.5.18-.93.13-1.03-.06-.1-.2-.15-.42-.25Z" />
                  </svg>
                  שלחו וואטסאפ: {WHATSAPP_DISPLAY}
                </a>
                <a
                  href={CAL_BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="קביעת פגישת הטמעה עם הדר אוטומציות"
                  className="mt-3 inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#dce7ea] bg-[#f6f9fb] px-6 text-sm font-semibold text-[#46544f] transition-all duration-200 hover:border-[#0e7a6e]/40 hover:text-[#15302d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e7a6e]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:mr-3"
                >
                  לקביעת פגישה
                </a>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto text-right mb-8">
                <p className="text-[var(--landing-primary)]/95 text-sm font-semibold mb-2 tracking-wide">יצירת קשר</p>
                <h2
                  id="contact-heading"
                  className="text-2xl md:text-3xl font-bold text-white mb-3"
                  style={{ fontSize: 'var(--text-h2)', lineHeight: 'var(--leading-tight)' }}
                >
                  צור קשר
                </h2>
                <p className="text-white/70 text-[15px] md:text-base leading-relaxed">
                  יש שאלה או רוצים להמשיך בשיחה? מלאו את הטופס ונחזור אליכם.
                </p>
              </div>
            )}

            <div
              className={`mx-auto rounded-3xl border ${
                variant === 'home'
                  ? 'max-w-2xl border-[#dce7ea] bg-[#f6f9fb] shadow-[0_30px_70px_-40px_rgba(21,48,45,0.25)] p-8 md:p-10'
                  : 'max-w-3xl faq-card-glass p-7 md:p-9'
              }`}
            >
              {formState === 'success' ? (
                <div
                  role="status"
                  className={`rounded-xl border px-6 py-8 text-center leading-relaxed ${
                    variant === 'home'
                      ? 'border-[#0e7a6e]/30 bg-[#0e7a6e]/[0.06]'
                      : 'border-[var(--landing-primary)]/35 bg-black/25'
                  }`}
                >
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${variant === 'home' ? 'bg-[#0e7a6e]/12 border border-[#0e7a6e]/30' : 'bg-gradient-to-br from-teal-500/25 to-emerald-600/15 border border-teal-400/30'}`}>
                    <svg className={`w-7 h-7 ${variant === 'home' ? 'text-[#0e7a6e]' : 'text-teal-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className={`font-semibold mb-2 text-lg ${variant === 'home' ? 'text-[#15302d]' : 'text-white'}`}>ההודעה נשלחה בהצלחה</p>
                  <p className={`text-sm ${variant === 'home' ? 'text-[#7c8884]' : 'text-white/55'}`}>ניצור קשר בהקדם.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="contact-name" className={labelClass}>
                        שם מלא <span className={reqClass}>*</span>
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={200}
                        placeholder="השם המלא"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className={labelClass}>
                        אימייל <span className={reqClass}>*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={320}
                        placeholder="האימייל שלך"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className={labelClass}>
                      טלפון <span className={`${optClass} font-normal text-xs mr-1`}>(אופציונלי)</span>
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={50}
                      placeholder=""
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`${inputClassName} md:max-w-md`}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className={labelClass}>
                      הודעה <span className={reqClass}>*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      maxLength={5000}
                      placeholder="מה תרצו לשתף או לשאול?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={`${inputClassName} resize-y min-h-[130px] leading-relaxed`}
                    />
                  </div>

                  {formState === 'error' && errorMessage ? (
                    <div role="alert" className={errorClass}>
                      {errorMessage}
                    </div>
                  ) : null}

                  {isTurnstileSiteConfigured() ? (
                    <div className="flex justify-center sm:justify-start">
                      <TurnstileWidget
                        key={turnstileMountKey}
                        onToken={setTurnstileToken}
                        className="min-h-[65px]"
                      />
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={
                      formState === 'submitting' ||
                      (isTurnstileSiteConfigured() && !turnstileToken)
                    }
                    className={submitClass}
                  >
                    {formState === 'submitting' ? 'שולחים…' : 'שליחת ההודעה'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
