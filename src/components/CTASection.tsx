import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  const benefits = [
    "Miễn phí dùng thử",
    "Không cần thẻ tín dụng",
    "Hỗ trợ 24/7",
  ];

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 gradient-hero" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Sẵn sàng nâng cấp trải nghiệm thi?
          </h2>
          
          <p className="text-lg md:text-xl text-white/80 mb-10 leading-relaxed">
            Tham gia cùng hàng nghìn giáo viên và học sinh đang sử dụng FlexiTest 
            để tạo và làm bài thi hiệu quả hơn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/auth">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/95 shadow-xl text-base font-semibold px-8"
              >
                Tạo bài thi đầu tiên
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto border-2 border-white/30 text-white bg-transparent hover:bg-white/10 text-base font-medium px-8"
            >
              Liên hệ tư vấn
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/70 text-sm">
            {benefits.map((benefit, index) => (
              <span key={index} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
