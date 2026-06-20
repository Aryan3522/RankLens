import { useEffect } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { CinematicLaptopStage } from "@/components/marketing/CinematicLaptopStage";
import { HowItWorksSection } from "@/components/marketing/sections/HowItWorksSection";
import { PlatformCoverageSection } from "@/components/marketing/sections/PlatformCoverageSection";
import { FeaturesBentoSection } from "@/components/marketing/sections/FeaturesBentoSection";
import { TestimonialsSection } from "@/components/marketing/sections/TestimonialsSection";
import { PricingSection } from "@/components/marketing/sections/PricingSection";
import { AboutFaqSection } from "@/components/marketing/sections/AboutFaqSection";
import { FinalCTASection } from "@/components/marketing/sections/FinalCTASection";
import { FAQS } from "@/components/marketing/data";

/**
 * Premium marketing homepage. Standalone (no AppLayout) — owns its own nav and
 * footer. Injects FAQPage structured data derived from the visible FAQs so AI
 * answer engines can extract the Q&A; the schema can't drift from the rendered
 * content because both read from the single `FAQS` source.
 */
export default function MarketingHome() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-faq-schema", "true");
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <CinematicLaptopStage />
        <HowItWorksSection />
        <PlatformCoverageSection />
        <FeaturesBentoSection />
        <TestimonialsSection />
        <PricingSection />
        <AboutFaqSection />
        <FinalCTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
