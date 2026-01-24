import { GraduationCap, Facebook, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const quickLinks = [
    { label: "Tính năng", href: "#features" },
    { label: "Hình thức thi", href: "#exams" },
    { label: "Thi lập trình", href: "#coding" },
    { label: "Bảng giá", href: "#pricing" },
  ];

  const supportLinks = [
    { label: "Hướng dẫn sử dụng", href: "#" },
    { label: "Câu hỏi thường gặp", href: "#" },
    { label: "Liên hệ hỗ trợ", href: "#" },
    { label: "Điều khoản sử dụng", href: "#" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4">
        {/* Main Footer */}
        <div className="py-12 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Flexi<span className="text-primary">Test</span>
              </span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-md">
              Nền tảng thi trực tuyến toàn diện, hỗ trợ đa dạng hình thức từ trắc nghiệm 
              đến thi lập trình chuyên nghiệp với chấm điểm tự động.
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Youtube"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a 
                href="mailto:support@flexitest.edu.vn" 
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Liên kết nhanh</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Hỗ trợ</h4>
            <ul className="space-y-3">
              {supportLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 FlexiTest. Developed by DoNgocMinh
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật</a>
            <a href="#" className="hover:text-primary transition-colors">Điều khoản dịch vụ</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
