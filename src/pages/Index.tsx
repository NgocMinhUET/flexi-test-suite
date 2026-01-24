import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ExamTypesSection from "@/components/ExamTypesSection";
import FeaturesSection from "@/components/FeaturesSection";
import CodingSection from "@/components/CodingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ExamTypesSection />
        <CodingSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
