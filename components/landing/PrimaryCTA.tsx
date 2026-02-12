import React from "react";

export interface PrimaryCTAProps {
  href: string;
  text: string;
  subtext?: string;
  microcopy?: string;
  size?: "md" | "lg";
  ariaLabel?: string;
  /** "hero" = microcopy לבן על רקע כהה, "default" = טקסט מושתק */
  variant?: "hero" | "default";
  /** אפקט pulse מבריק (רק ל CTA ראשי ב Hero) */
  glow?: boolean;
}

const baseClasses =
  "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 " +
  "bg-[var(--landing-primary)] text-white " +
  "hover:bg-[var(--landing-primary-hover)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-primary)] focus-visible:ring-offset-2 " +
  "active:scale-[0.98] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--landing-primary)] disabled:active:scale-100 " +
  "landing-cta-shine";

const sizeClasses = {
  md: "min-h-[48px] px-8 py-3 text-base",
  lg: "min-h-[56px] px-10 py-4 text-lg",
};

export const PrimaryCTA: React.FC<PrimaryCTAProps> = ({
  href,
  text,
  subtext,
  microcopy,
  size = "lg",
  ariaLabel,
  variant = "default",
  glow = false,
}) => {
  const ctaClasses = `${baseClasses} ${sizeClasses[size]} ${glow ? "landing-cta-pulse" : ""}`;
  const microcopyClass =
    variant === "hero"
      ? "text-white/90 text-sm max-w-md mt-2 leading-relaxed"
      : "text-[var(--qa-text-secondary)] text-sm max-w-md mt-2 leading-relaxed";
  return (
    <div className="flex flex-col items-center gap-1">
      <a
        href={href}
        className={ctaClasses}
        aria-label={ariaLabel ?? text}
      >
        {text}
      </a>
      {subtext && (
        <p className="text-[var(--qa-text-secondary)] text-sm mt-1">{subtext}</p>
      )}
      {microcopy && <p className={microcopyClass}>{microcopy}</p>}
    </div>
  );
};
