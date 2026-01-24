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
      color: "bg-primary text-primary-foreground",
      features: ["Một đáp án đúng", "Nhiều đáp án đúng", "Chấm điểm tự động"],
      badge: "Phổ biến nhất",
      badgeColor: "bg-primary/10 text-primary border-primary/20",
    },
    {
      icon: PenLine,
      title: "Điền đáp án",
      description: "Điền từ, số hoặc cụm từ ngắn vào chỗ trống",
      color: "bg-accent text-accent-foreground",
      features: ["Điền số", "Điền từ/cụm từ", "So khớp linh hoạt"],
      badge: "Nhanh",
      badgeColor: "bg-accent/10 text-accent border-accent/20",
    },
    {
      icon: FileText,
      title: "Tự luận",
      description: "Viết đoạn văn, bài luận với AI hỗ trợ chấm điểm",
      color: "bg-warning text-warning-foreground",
      features: ["Viết tự do", "AI chấm điểm", "Rubric đánh giá"],
      badge: "AI Powered",
      badgeColor: "bg-warning/10 text-warning border-warning/20",
    },
    {
      icon: GripHorizontal,
      title: "Kéo thả",
      description: "Kéo và thả để sắp xếp, ghép cặp hoặc phân loại",
      color: "bg-success text-success-foreground",
      features: ["Sắp xếp thứ tự", "Ghép cặp", "Phân loại nhóm"],
      badge: "Tương tác",
      badgeColor: "bg-success/10 text-success border-success/20",
    },
    {
      icon: Code2,
      title: "Lập trình",
      description: "Viết code trực tiếp với môi trường chạy thực và test case",
      color: "bg-primary text-primary-foreground",
      isHighlighted: true,
      features: ["10+ ngôn ngữ", "Chạy code thực", "Auto grading"],
      badge: "Đặc sắc",
      badgeColor: "bg-primary text-primary-foreground",
    },
    {
      icon: Mic,
      title: "Nói & Nghe",
      description: "Ghi âm câu trả lời và nghe hiểu audio/video",
      color: "bg-destructive/80 text-destructive-foreground",
      features: ["Ghi âm trả lời", "Nghe audio", "Xem video"],
      badge: "Sắp ra mắt",
      badgeColor: "bg-muted text-muted-foreground border-border",
    },
  ];

  return (
    <section id="exams" className="section-padding bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Đa dạng hình thức
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mọi hình thức thi bạn cần
          </h2>
          <p className="text-lg text-muted-foreground">
            Từ trắc nghiệm đơn giản đến thi lập trình phức tạp, 
            FlexiTest hỗ trợ tất cả để đáp ứng mọi nhu cầu kiểm tra.
          </p>
        </div>

        {/* Exam Types Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examTypes.map((type, index) => (
            <Card
              key={index}
              className={`group card-hover border-border/50 ${
                type.isHighlighted 
                  ? "border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10" 
                  : ""
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl ${type.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <Badge className={type.badgeColor}>{type.badge}</Badge>
                </div>
                <CardTitle className="text-xl">{type.title}</CardTitle>
                <CardDescription className="text-base">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-5">
                  {type.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all group-hover:text-primary/80">
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
