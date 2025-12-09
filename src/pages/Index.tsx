import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ExamTypesSection from "@/components/ExamTypesSection";
import CodingSection from "@/components/CodingSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ExamTypesSection />
        <CodingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
