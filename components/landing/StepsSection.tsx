import React, { useRef, useState, useCallback, useEffect } from "react";
import { LandingCopy } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

const TILT_MAX = 8;

const TiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [hoverSupported, setHoverSupported] = useState(false);

  useEffect(() => {
    setHoverSupported(window.matchMedia("(hover: hover)").matches);
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hoverSupported) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateX = -y * TILT_MAX;
      const rotateY = x * TILT_MAX;
      setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    },
    [hoverSupported]
  );
  const handleLeave = useCallback(() => setTransform(""), []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transform: transform || undefined,
        transition: transform ? "transform 0.1s ease-out" : "transform 0.3s ease",
      }}
    >
      {children}
    </div>
  );
};

export const StepsSection: React.FC<{ copy: LandingCopy }> = ({ copy }) => {
  return (
    <section className="steps-section-bg relative py-20 md:py-24 px-6 md:px-8">
      <FadeInSection delay={100}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-4xl mx-auto" dir="rtl">
            <h2
              className="text-2xl md:text-4xl font-extrabold text-white mb-10 text-center headline-bold-hover"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              {copy.callStepsHeadline}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {copy.callSteps.map((step, i) => (
                <TiltCard
                  key={i}
                  className={`step-card-glass rounded-2xl p-6 md:p-7 text-right ${i === 1 ? "md:min-h-[200px]" : ""}`}
                >
                  <span
                    className="step-num-outline block text-6xl md:text-7xl mb-4 font-black"
                    style={{ lineHeight: 0.9 }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <p className="step-text-reveal text-base md:text-[17px] text-white/90 leading-relaxed">
                    {step}
                  </p>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
