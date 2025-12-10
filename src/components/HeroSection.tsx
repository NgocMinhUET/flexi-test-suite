import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Sparkles, CheckCircle2 } from "lucide-react";

const HeroSection = () => {
  const features = [
    "Đa dạng hình thức thi",
    "Thi lập trình trực tiếp",
    "Chấm điểm tự động",
    "Phân tích kết quả chi tiết",
  ];

  return (
    <section className="relative min-h-screen flex items-center gradient-hero overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left animate-slide-up">
            <Badge variant="accent" className="mb-6 animate-fade-in">
              <Sparkles className="w-3 h-3 mr-1" />
              Nền tảng thi ExamPro
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Thi trắc nghiệm & <span className="text-gradient">Lập trình</span>
              <br />
              mọi lúc, mọi nơi
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Nền tảng thi toàn diện với đa dạng hình thức: trắc nghiệm, tự luận, kéo thả, và đặc biệt là thi lập trình
              với chấm điểm tự động.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border/50 text-sm font-medium animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {feature}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="xl">
                Bắt đầu ngay
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Link to="/exam/demo">
                <Button variant="glass" size="xl">
                  <Play className="w-5 h-5" />
                  Thử làm bài thi
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">50K+</div>
                <div className="text-sm text-muted-foreground">Học viên</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">1000+</div>
                <div className="text-sm text-muted-foreground">Bài thi</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">99%</div>
                <div className="text-sm text-muted-foreground">Hài lòng</div>
              </div>
            </div>
          </div>

          {/* Right Content - Exam Preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="relative">
              {/* Main Card */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="gradient-primary p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">01</span>
                    </div>
                    <div>
                      <h3 className="text-primary-foreground font-semibold">Câu hỏi trắc nghiệm</h3>
                      <p className="text-primary-foreground/70 text-xs">Thời gian: 02:30</p>
                    </div>
                  </div>
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">1/20</Badge>
                </div>

                {/* Question */}
                <div className="p-6">
                  <p className="text-foreground font-medium mb-4">
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
                            index === 1 ? "border-primary bg-primary" : "border-muted-foreground"
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
                <div className="p-4 border-t border-border/50 flex justify-between">
                  <Button variant="ghost" size="sm">
                    ← Câu trước
                  </Button>
                  <Button variant="default" size="sm">
                    Câu tiếp →
                  </Button>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-success text-success-foreground px-4 py-2 rounded-xl shadow-lg animate-float text-sm font-semibold">
                ✓ Đúng!
              </div>

              <div className="absolute -bottom-4 -left-4 bg-card border border-border px-4 py-3 rounded-xl shadow-lg animate-float delay-500">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-accent">⚡</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Điểm hiện tại</div>
                    <div className="text-foreground font-bold">850 pts</div>
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
