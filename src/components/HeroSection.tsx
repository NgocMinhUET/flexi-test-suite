import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";

const HeroSection = () => {
  const highlights = [
    "Đa dạng hình thức thi",
    "Chấm điểm tự động",
    "Phân tích kết quả chi tiết",
  ];

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 gradient-hero-light" />
      
      {/* Subtle decorative elements */}
      <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 pt-28 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            <Badge 
              variant="secondary" 
              className="mb-6 px-4 py-1.5 text-sm font-medium border border-primary/20 bg-primary/5 text-primary animate-fade-in"
            >
              Nền tảng thi trực tuyến hàng đầu Việt Nam
            </Badge>

            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6 animate-slide-up"
            >
              Nền tảng thi
              <span className="block text-primary mt-2">Trắc nghiệm & Lập trình</span>
              <span className="block text-2xl md:text-3xl font-medium text-muted-foreground mt-4">
                Chuyên nghiệp & Hiệu quả
              </span>
            </h1>

            <p 
              className="text-lg text-muted-foreground mb-10 leading-relaxed animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              Tạo, tổ chức và quản lý bài thi trực tuyến một cách dễ dàng. 
              Hỗ trợ đa dạng hình thức từ trắc nghiệm đến thi lập trình chuyên nghiệp.
            </p>

            {/* Highlights */}
            <div 
              className="flex flex-wrap gap-6 justify-center lg:justify-start mb-12 animate-slide-up"
              style={{ animationDelay: "150ms" }}
            >
              {highlights.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto px-10 py-6 text-base font-semibold shadow-lg shadow-primary/25">
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/exam/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-10 py-6 text-base font-medium border-2">
                  <Play className="w-5 h-5 mr-2" />
                  Xem demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - Exam Preview Card */}
          <div 
            className="relative animate-fade-in lg:pl-8" 
            style={{ animationDelay: "300ms" }}
          >
            <div className="relative max-w-md mx-auto">
              {/* Main Card */}
              <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
                {/* Header */}
                <div className="gradient-hero p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">01</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Câu hỏi trắc nghiệm</h3>
                      <p className="text-white/70 text-sm">Thời gian: 02:30</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-0 font-medium">1/20</Badge>
                </div>

                {/* Question */}
                <div className="p-6">
                  <p className="text-foreground font-medium mb-6 text-lg leading-relaxed">
                    Ngôn ngữ lập trình nào được sử dụng phổ biến nhất cho phát triển web frontend?
                  </p>

                  {/* Options */}
                  <div className="space-y-3">
                    {["Python", "JavaScript", "Java", "C++"].map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          index === 1
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            index === 1 ? "border-primary bg-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          {index === 1 && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={index === 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-between bg-secondary/30">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    ← Câu trước
                  </Button>
                  <Button size="sm">
                    Câu tiếp →
                  </Button>
                </div>
              </div>

              {/* Floating badge - Using primary color instead of green */}
              <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-2 rounded-xl shadow-lg animate-bounce-soft text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Chính xác!
              </div>

              {/* Score badge - Using primary color scheme */}
              <div className="absolute -bottom-4 -left-4 bg-card border border-border px-5 py-3 rounded-xl shadow-lg animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">A</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Điểm số</div>
                    <div className="text-foreground font-bold text-lg">Xuất sắc</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
