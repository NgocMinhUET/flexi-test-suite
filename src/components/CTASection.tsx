import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  const benefits = [
    "Miễn phí dùng thử",
    "Không cần thẻ tín dụng",
    "Hỗ trợ 24/7",
  ];

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-primary" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Decorative circles */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            Bắt đầu ngay hôm nay
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Sẵn sàng nâng cấp trải nghiệm thi của bạn?
          </h2>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Tham gia cùng hàng nghìn giáo viên và học sinh đang sử dụng FlexiTest 
            để tạo và làm bài thi hiệu quả hơn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/auth">
              <Button 
                size="lg" 
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl text-base px-8"
              >
                Tạo bài thi đầu tiên
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 text-base px-8"
            >
              Liên hệ tư vấn
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-primary-foreground/80 text-sm">
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
