import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle2, Sparkles, Users, BookOpen, Award } from "lucide-react";

const HeroSection = () => {
  const features = [
    "Đa dạng hình thức thi",
    "Thi lập trình trực tiếp",
    "Chấm điểm tự động",
    "Phân tích kết quả chi tiết",
  ];

  const stats = [
    { value: "50K+", label: "Học viên", icon: Users },
    { value: "1000+", label: "Đề thi", icon: BookOpen },
    { value: "99%", label: "Hài lòng", icon: Award },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background hero-pattern" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 pt-24 pb-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Nền tảng thi trực tuyến #1 Việt Nam
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6 animate-slide-up">
              Nền tảng thi
              <span className="block text-primary mt-2">Trắc nghiệm & Lập trình</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
              Tạo, tổ chức và quản lý bài thi trực tuyến một cách dễ dàng. 
              Hỗ trợ đa dạng hình thức từ trắc nghiệm đến thi lập trình chuyên nghiệp.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8 animate-slide-up" style={{ animationDelay: "150ms" }}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-full border border-border shadow-sm text-sm font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {feature}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-base px-8">
                Bắt đầu miễn phí
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link to="/exam/demo">
                <Button variant="outline" size="lg" className="border-2 text-base px-8">
                  <Play className="w-5 h-5 mr-2" />
                  Xem demo
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 mt-12 animate-slide-up" style={{ animationDelay: "250ms" }}>
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="w-5 h-5 text-primary" />
                    <span className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Exam Preview Card */}
          <div className="relative animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="relative max-w-md mx-auto lg:max-w-none">
              {/* Main Card */}
              <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-primary p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                      <span className="text-primary-foreground font-bold">01</span>
                    </div>
                    <div>
                      <h3 className="text-primary-foreground font-semibold">Câu hỏi trắc nghiệm</h3>
                      <p className="text-primary-foreground/70 text-sm">Thời gian: 02:30</p>
                    </div>
                  </div>
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">1/20</Badge>
                </div>

                {/* Question */}
                <div className="p-6">
                  <p className="text-foreground font-medium mb-5 text-lg">
                    Ngôn ngữ lập trình nào được sử dụng phổ biến nhất cho phát triển web frontend?
                  </p>

                  {/* Options */}
                  <div className="space-y-3">
                    {["Python", "JavaScript", "Java", "C++"].map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          index === 1
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            index === 1 ? "border-primary bg-primary" : "border-muted-foreground/50"
                          }`}
                        >
                          {index === 1 && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className={index === 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-between bg-muted/30">
                  <Button variant="ghost" size="sm">
                    ← Câu trước
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Câu tiếp →
                  </Button>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-3 -right-3 bg-success text-success-foreground px-4 py-2 rounded-xl shadow-lg animate-bounce-subtle text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Chính xác!
              </div>

              <div className="absolute -bottom-3 -left-3 bg-card border border-border px-4 py-3 rounded-xl shadow-lg animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Điểm hiện tại</div>
                    <div className="text-foreground font-bold text-lg">850 pts</div>
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
