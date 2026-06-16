import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LandingNav } from './landing/LandingNav';
import { HeroSection } from './landing/HeroSection';
import { SocialProofBar } from './landing/SocialProofBar';
import { ProblemSection } from './landing/ProblemSection';
import { DemoSection } from './landing/DemoSection';
import { CaixinhaSection } from './landing/CaixinhaSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { JourneySection } from './landing/JourneySection';
import { CasesSection } from './landing/CasesSection';
import { FaqSection } from './landing/FaqSection';
import { CtaSection } from './landing/CtaSection';
import { LandingFooter } from './landing/LandingFooter';

export function Landing() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <DemoSection />
      <CaixinhaSection />
      <FeaturesSection />
      <JourneySection />
      <CasesSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
