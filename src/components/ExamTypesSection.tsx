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
      description: "Một đáp án hoặc nhiều đáp án đúng với đa dạng lựa chọn",
      color: "bg-primary/10 text-primary",
      features: ["Một đáp án đúng", "Nhiều đáp án đúng", "Chấm điểm tự động"],
      badge: "Phổ biến nhất",
      badgeVariant: "default" as const,
    },
    {
      icon: PenLine,
      title: "Điền đáp án",
      description: "Điền từ, số hoặc cụm từ ngắn vào chỗ trống",
      color: "bg-accent/10 text-accent",
      features: ["Điền số", "Điền từ/cụm từ", "So khớp linh hoạt"],
      badge: "Nhanh",
      badgeVariant: "accent" as const,
    },
    {
      icon: FileText,
      title: "Tự luận",
      description: "Viết đoạn văn, bài luận với AI hỗ trợ chấm điểm",
      color: "bg-warning/10 text-warning",
      features: ["Viết tự do", "AI chấm điểm", "Rubric đánh giá"],
      badge: "AI Powered",
      badgeVariant: "warning" as const,
    },
    {
      icon: GripHorizontal,
      title: "Kéo thả",
      description: "Kéo và thả để sắp xếp, ghép cặp hoặc phân loại",
      color: "bg-success/10 text-success",
      features: ["Sắp xếp thứ tự", "Ghép cặp", "Phân loại nhóm"],
      badge: "Tương tác",
      badgeVariant: "success" as const,
    },
    {
      icon: Code2,
      title: "Lập trình",
      description: "Viết code trực tiếp với môi trường chạy thực và test case",
      color: "gradient-primary text-primary-foreground",
      isHighlighted: true,
      features: ["10+ ngôn ngữ", "Chạy code thực", "Auto grading"],
      badge: "Đặc sắc",
      badgeVariant: "default" as const,
    },
    {
      icon: Mic,
      title: "Nói & Nghe",
      description: "Ghi âm câu trả lời và nghe hiểu audio/video",
      color: "bg-destructive/10 text-destructive",
      features: ["Ghi âm trả lời", "Nghe audio", "Xem video"],
      badge: "Sắp ra mắt",
      badgeVariant: "ghost" as const,
    },
  ];

  return (
    <section id="exams" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            Đa dạng hình thức
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mọi hình thức thi bạn cần
          </h2>
          <p className="text-lg text-muted-foreground">
            Từ trắc nghiệm đơn giản đến thi lập trình phức tạp, 
            ExamPro hỗ trợ tất cả để đáp ứng mọi nhu cầu kiểm tra.
          </p>
        </div>

        {/* Exam Types Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examTypes.map((type, index) => (
            <Card
              key={index}
              variant={type.isHighlighted ? "glow" : "interactive"}
              className={`group ${type.isHighlighted ? "md:col-span-2 lg:col-span-1 border-primary/30" : ""}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-12 h-12 rounded-xl ${type.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <Badge variant={type.badgeVariant}>{type.badge}</Badge>
                </div>
                <CardTitle className="text-xl">{type.title}</CardTitle>
                <CardDescription className="text-base">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {type.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
