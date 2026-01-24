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
      description: "Giám sát webcam, khóa tab và phát hiện copy-paste",
    },
    {
      icon: BarChart3,
      title: "Phân tích chi tiết",
      description: "Báo cáo điểm số và phân tích điểm mạnh/yếu",
    },
    {
      icon: Users,
      title: "Quản lý lớp học",
      description: "Tạo nhóm, giao bài và theo dõi tiến độ học viên",
    },
    {
      icon: Clock,
      title: "Hẹn giờ thông minh",
      description: "Đặt thời gian thi, mở/đóng bài tự động",
    },
    {
      icon: Shuffle,
      title: "Trộn đề tự động",
      description: "Xáo trộn câu hỏi và đáp án cho mỗi thí sinh",
    },
    {
      icon: Lock,
      title: "Kiểm soát truy cập",
      description: "Giới hạn số lần thi, IP và thiết bị",
    },
    {
      icon: Bell,
      title: "Thông báo realtime",
      description: "Nhận thông báo khi có người nộp bài hoặc vi phạm",
    },
    {
      icon: FileDown,
      title: "Xuất báo cáo",
      description: "Export kết quả sang Excel, PDF chi tiết",
    },
  ];

  return (
    <section id="features" className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5">
            Tất cả những gì bạn cần
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Công cụ mạnh mẽ giúp bạn tạo, quản lý và phân tích bài thi một cách chuyên nghiệp.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-7 rounded-2xl bg-card border border-border card-hover"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
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
