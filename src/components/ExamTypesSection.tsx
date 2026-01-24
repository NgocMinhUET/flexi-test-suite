import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  PenLine, 
  FileText, 
  GripHorizontal, 
  Code2, 
  Mic,
  ArrowRight
} from "lucide-react";

const ExamTypesSection = () => {
  const examTypes = [
    {
      icon: CheckSquare,
      title: "Trắc nghiệm",
      description: "Một hoặc nhiều đáp án đúng với chấm điểm tự động",
      features: ["Một đáp án đúng", "Nhiều đáp án đúng", "Chấm điểm tự động"],
      badge: "Phổ biến",
    },
    {
      icon: PenLine,
      title: "Điền đáp án",
      description: "Điền từ, số hoặc cụm từ ngắn vào chỗ trống",
      features: ["Điền số", "Điền từ/cụm từ", "So khớp linh hoạt"],
      badge: null,
    },
    {
      icon: FileText,
      title: "Tự luận",
      description: "Viết đoạn văn, bài luận với AI hỗ trợ chấm điểm",
      features: ["Viết tự do", "AI chấm điểm", "Rubric đánh giá"],
      badge: "AI",
    },
    {
      icon: GripHorizontal,
      title: "Kéo thả",
      description: "Kéo và thả để sắp xếp, ghép cặp hoặc phân loại",
      features: ["Sắp xếp thứ tự", "Ghép cặp", "Phân loại nhóm"],
      badge: null,
    },
    {
      icon: Code2,
      title: "Lập trình",
      description: "Viết code trực tiếp với môi trường chạy thực",
      features: ["10+ ngôn ngữ", "Chạy code thực", "Auto grading"],
      badge: "Đặc sắc",
      isHighlighted: true,
    },
    {
      icon: Mic,
      title: "Nói & Nghe",
      description: "Ghi âm câu trả lời và nghe hiểu audio/video",
      features: ["Ghi âm trả lời", "Nghe audio", "Xem video"],
      badge: "Sắp có",
    },
  ];

  return (
    <section id="exams" className="section-spacing bg-secondary/40">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mọi hình thức thi bạn cần
          </h2>
          <p className="text-lg text-muted-foreground">
            Từ trắc nghiệm đơn giản đến thi lập trình, FlexiTest hỗ trợ tất cả.
          </p>
        </div>

        {/* Exam Types Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {examTypes.map((type, index) => (
            <Card
              key={index}
              className={`group card-interactive ${
                type.isHighlighted 
                  ? "ring-2 ring-primary/20 border-primary/30" 
                  : ""
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <type.icon className="w-6 h-6 text-primary" />
                  </div>
                  {type.badge && (
                    <Badge 
                      variant={type.isHighlighted ? "default" : "secondary"}
                      className={type.isHighlighted ? "" : "bg-secondary text-muted-foreground"}
                    >
                      {type.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl font-semibold">{type.title}</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-6">
                  {type.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all">
                  Tìm hiểu thêm
                  <ArrowRight className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExamTypesSection;
