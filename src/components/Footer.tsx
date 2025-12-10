import { Code2, Facebook, Youtube, MessageCircle } from "lucide-react";

const Footer = () => {
  // --- DỮ LIỆU CŨ (Đã ẩn để dùng sau này) ---
  /*
  const links = {
    product: [
      { label: "Tính năng", href: "#" },
      { label: "Bảng giá", href: "#" },
      { label: "Thi lập trình", href: "#" },
      { label: "API", href: "#" }
    ],
    resources: [
      { label: "Hướng dẫn", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Cộng đồng", href: "#" },
      { label: "Changelog", href: "#" }
    ],
    company: [
      { label: "Về chúng tôi", href: "#" },
      { label: "Liên hệ", href: "#" },
      { label: "Tuyển dụng", href: "#" },
      { label: "Đối tác", href: "#" }
    ],
    legal: [
      { label: "Điều khoản", href: "#" },
      { label: "Bảo mật", href: "#" },
      { label: "Cookie", href: "#" }
    ]
  };
  */

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        {/* --- PHẦN GIAO DIỆN ĐƠN GIẢN CHO SINH VIÊN --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Tên ứng dụng */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center bg-primary/10">
              <Code2 className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Exam<span className="text-primary">Pro</span>
            </span>
          </div>

          {/* Dòng bản quyền đơn giản */}
          <p className="text-sm text-muted-foreground text-center md:text-right">© 2025 ExamPro. DoNgocMinh</p>
        </div>

        {/* --- PHẦN GIAO DIỆN CŨ (Đã ẩn - Bỏ comment bên dưới để mở rộng) --- */}
        {/* <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mt-8 pt-8 border-t border-border">
          <div className="col-span-2 md:col-span-1">
             <p className="text-sm text-muted-foreground mb-4">Nền tảng thi trực tuyến toàn diện</p>
             <div className="flex gap-3">
               <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"><Facebook className="w-4 h-4"/></a>
               <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"><Youtube className="w-4 h-4"/></a>
               <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"><MessageCircle className="w-4 h-4"/></a>
             </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Sản phẩm</h4>
            <ul className="space-y-2">
              {links.product.map((link, index) => <li key={index}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.label}</a></li>)}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Tài nguyên</h4>
             <ul className="space-y-2">
              {links.resources.map((link, index) => <li key={index}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.label}</a></li>)}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Công ty</h4>
             <ul className="space-y-2">
              {links.company.map((link, index) => <li key={index}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.label}</a></li>)}
            </ul>
          </div>
          
           <div>
            <h4 className="font-semibold text-foreground mb-4">Pháp lý</h4>
             <ul className="space-y-2">
              {links.legal.map((link, index) => <li key={index}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.label}</a></li>)}
            </ul>
          </div>
        </div> 
        */}
      </div>
    </footer>
  );
};

export default Footer;
