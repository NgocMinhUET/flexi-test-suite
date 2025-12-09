import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Code2, BookOpen, Trophy, Users } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: "Bài thi", href: "#exams", icon: BookOpen },
    { label: "Lập trình", href: "#coding", icon: Code2 },
    { label: "Bảng xếp hạng", href: "#leaderboard", icon: Trophy },
    { label: "Cộng đồng", href: "#community", icon: Users },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Exam<span className="text-gradient">Pro</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Đăng nhập
            </Button>
            <Button variant="hero" size="sm">
              Bắt đầu miễn phí
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-slide-up">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
              <Button variant="ghost" className="w-full justify-center">
                Đăng nhập
              </Button>
              <Button variant="hero" className="w-full justify-center">
                Bắt đầu miễn phí
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
