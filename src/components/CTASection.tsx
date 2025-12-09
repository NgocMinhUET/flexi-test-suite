import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
      
      {/* Decorative circles */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Bắt đầu miễn phí, không cần thẻ tín dụng
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
            Sẵn sàng nâng cấp trải nghiệm thi của bạn?
          </h2>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Tham gia cùng hàng nghìn giáo viên và học sinh đang sử dụng ExamPro 
            để tạo và làm bài thi hiệu quả hơn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="xl" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl"
            >
              Tạo bài thi đầu tiên
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="xl"
              className="border-2 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10"
            >
              Liên hệ tư vấn
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-8 mt-12 text-primary-foreground/60 text-sm">
            <span>✓ Miễn phí dùng thử</span>
            <span>✓ Hỗ trợ 24/7</span>
            <span>✓ Bảo mật dữ liệu</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
