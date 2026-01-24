import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  BarChart3, 
  Users, 
  Clock, 
  Shuffle,
  Lock,
  Bell,
  FileDown
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Shield,
      title: "Bảo mật cao",
      description: "Chống gian lận với giám sát webcam, khóa tab và phát hiện copy-paste",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: BarChart3,
      title: "Phân tích chi tiết",
      description: "Báo cáo điểm số, thời gian làm bài và phân tích điểm mạnh/yếu",
      color: "bg-success/10 text-success",
    },
    {
      icon: Users,
      title: "Quản lý lớp học",
      description: "Tạo nhóm, giao bài tập và theo dõi tiến độ học viên dễ dàng",
      color: "bg-accent/10 text-accent",
    },
    {
      icon: Clock,
      title: "Hẹn giờ thông minh",
      description: "Đặt thời gian thi, mở/đóng bài tự động theo lịch định sẵn",
      color: "bg-warning/10 text-warning",
    },
    {
      icon: Shuffle,
      title: "Trộn đề tự động",
      description: "Tự động xáo trộn câu hỏi và đáp án để mỗi thí sinh có đề riêng",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Lock,
      title: "Kiểm soát truy cập",
      description: "Giới hạn số lần thi, IP, thiết bị và yêu cầu mật khẩu",
      color: "bg-destructive/10 text-destructive",
    },
    {
      icon: Bell,
      title: "Thông báo realtime",
      description: "Nhận thông báo khi có người nộp bài, hoàn thành thi hoặc vi phạm",
      color: "bg-success/10 text-success",
    },
    {
      icon: FileDown,
      title: "Xuất báo cáo",
      description: "Export kết quả sang Excel, PDF với đầy đủ thống kê chi tiết",
      color: "bg-accent/10 text-accent",
    },
  ];

  return (
    <section id="features" className="section-padding bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Tính năng nổi bật
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tất cả những gì bạn cần để tổ chức thi
          </h2>
          <p className="text-lg text-muted-foreground">
            Công cụ mạnh mẽ giúp bạn tạo, quản lý và phân tích bài thi 
            một cách hiệu quả và chuyên nghiệp.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border/50 card-hover"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
