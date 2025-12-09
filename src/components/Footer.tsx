import { Code2, Facebook, Youtube, MessageCircle } from "lucide-react";

const Footer = () => {
  const links = {
    product: [
      { label: "Tính năng", href: "#" },
      { label: "Bảng giá", href: "#" },
      { label: "Thi lập trình", href: "#" },
      { label: "API", href: "#" },
    ],
    resources: [
      { label: "Hướng dẫn", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Cộng đồng", href: "#" },
      { label: "Changelog", href: "#" },
    ],
    company: [
      { label: "Về chúng tôi", href: "#" },
      { label: "Liên hệ", href: "#" },
      { label: "Tuyển dụng", href: "#" },
      { label: "Đối tác", href: "#" },
    ],
    legal: [
      { label: "Điều khoản", href: "#" },
      { label: "Bảo mật", href: "#" },
      { label: "Cookie", href: "#" },
    ],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-gradient">Pro</span>
              </span>
            </a>
            <p className="text-sm text-muted-foreground mb-4">
              Nền tảng thi trực tuyến toàn diện cho giáo dục và doanh nghiệp.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Sản phẩm</h4>
            <ul className="space-y-2">
              {links.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Tài nguyên</h4>
            <ul className="space-y-2">
              {links.resources.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Công ty</h4>
            <ul className="space-y-2">
              {links.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Pháp lý</h4>
            <ul className="space-y-2">
              {links.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 ExamPro. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ in Vietnam
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
