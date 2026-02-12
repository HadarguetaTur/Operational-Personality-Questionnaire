import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLandingCopy } from "../config/landingCopy";
import { HeroSection } from "../components/landing/HeroSection";
import { CostSection } from "../components/landing/CostSection";
import { ProcessSection } from "../components/landing/ProcessSection";
import { StepsSection } from "../components/landing/StepsSection";
import { DeliverablesSection } from "../components/landing/DeliverablesSection";
import { WhyMeSection } from "../components/landing/WhyMeSection";
import { FAQAccordion } from "../components/landing/FAQAccordion";
import { FinalCTASection } from "../components/landing/FinalCTASection";
import { StickyMobileCTA } from "../components/landing/StickyMobileCTA";
import { LandingFooter } from "../components/landing/LandingFooter";

const LandingPage: React.FC = () => {
  const { patternId } = useParams<{ patternId: string }>();
  const navigate = useNavigate();
  const copy = patternId ? getLandingCopy(patternId) : null;

  const userName = (() => {
    try {
      const saved = localStorage.getItem("diagnosticResult");
      if (!saved) return null;
      const data = JSON.parse(saved);
      return data?.userInfo?.name?.trim() || null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [patternId]);

  if (!copy) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" dir="rtl">
        <div className="text-center">
          <p className="text-[var(--qa-text-secondary)] mb-4">דף נחיתה לא נמצא</p>
          <button
            onClick={() => navigate("/")}
            className="text-[var(--qa-accent)] font-medium hover:underline"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-[#1e293b]" dir="rtl">
      <HeroSection copy={copy} userName={userName} />
      <CostSection copy={copy} />
      <ProcessSection copy={copy} />
      <StepsSection copy={copy} />
      <DeliverablesSection copy={copy} />
      <WhyMeSection copy={copy} photoSrc="/landing-photo.jpg" />
      <FAQAccordion copy={copy} />
      <FinalCTASection copy={copy} />
      <LandingFooter />

      <StickyMobileCTA copy={copy} />

      <div className="md:hidden h-28" aria-hidden />
    </main>
  );
};

export default LandingPage;
