import React, { useState, useEffect } from "react";
import { LandingCopy } from "../../config/landingCopy";
import { FadeInSection } from "./FadeInSection";

const DEFAULT_PHOTO = "/landing-photo.jpg";

const CheckBullet = () => (
  <svg
    className="w-5 h-5 shrink-0 mt-0.5 text-[var(--landing-primary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export const WhyMeSection: React.FC<{
  copy: LandingCopy;
  photoSrc?: string;
}> = ({ copy, photoSrc = DEFAULT_PHOTO }) => {
  const [photoExists, setPhotoExists] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setPhotoExists(true);
    img.onerror = () => setPhotoExists(false);
    img.src = photoSrc.startsWith("/") ? photoSrc : `/${photoSrc}`;
  }, [photoSrc]);

  const headline = copy.whyMeHeadline;
  const architectPart = "אדריכלית";
  const parts = headline.includes(architectPart) ? headline.split(architectPart) : null;

  return (
    <section className="whyme-section-bg relative py-20 md:py-24 px-6 md:px-8 overflow-hidden">
      <FadeInSection delay={100}>
        <div className="relative z-10 w-full max-w-[var(--max-content)] mx-auto">
          <div className="max-w-4xl mx-auto" dir="rtl">
            <h2
              className="text-2xl md:text-4xl font-extrabold text-white mb-10 text-right headline-bold-hover"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              {parts ? (
                <>
                  {parts[0]}
                  <span className="headline-architect-highlight font-black">{architectPart}</span>
                  {parts[1]}
                </>
              ) : (
                headline
              )}
            </h2>
            <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-start">
              {photoExists && (
                <div className="shrink-0 relative mx-auto md:mx-0">
                  <div className="architect-lines absolute -inset-8 rounded-3xl -z-10" aria-hidden />
                  <div className="photo-halo" aria-hidden />
                  <div className="photo-blob-frame relative overflow-hidden border-2 border-white/10 shadow-2xl">
                    <img
                      src={photoSrc}
                      alt="תמונה אישית"
                      className="w-44 h-44 md:w-52 md:h-52 object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base md:text-[17px] text-white/90 mb-6 leading-relaxed">
                  {copy.whyMeIntro}
                </p>
                <ul className="space-y-4 mb-6">
                  {copy.whyMeProofs.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-3 items-start text-base md:text-[16px] text-white/95"
                    >
                      <CheckBullet />
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-base font-medium text-white/90 leading-relaxed">
                  {copy.whyMeClose}
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
};
