import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Code2, BookOpen, Trophy, Users, LogOut, LayoutDashboard, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading, signOut } = useAuth();

  const isStudent = user && !isAdmin && !isTeacher;

  const navItems = [
    { label: "Bài thi", href: "#exams", icon: BookOpen },
    { label: "Lập trình", href: "#coding", icon: Code2 },
    { label: "Bảng xếp hạng", href: "#leaderboard", icon: Trophy },
    { label: "Cộng đồng", href: "#community", icon: Users },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Exam<span className="text-gradient">Pro</span>
            </span>
          </Link>

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
            {isLoading ? (
              <div className="w-20 h-9 bg-muted animate-pulse rounded-lg" />
            ) : user ? (
              <>
                {isStudent && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/my-exams">
                      <FileText className="w-4 h-4 mr-2" />
                      Bài thi của tôi
                    </Link>
                  </Button>
                )}
                {(isAdmin || isTeacher) && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Đăng nhập</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/auth">Bắt đầu miễn phí</Link>
                </Button>
              </>
            )}
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
              {isLoading ? (
                <div className="w-full h-10 bg-muted animate-pulse rounded-lg" />
              ) : user ? (
                <>
                  {isStudent && (
                    <Button variant="ghost" className="w-full justify-center" asChild>
                      <Link to="/my-exams" onClick={() => setIsMenuOpen(false)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Bài thi của tôi
                      </Link>
                    </Button>
                  )}
                  {(isAdmin || isTeacher) && (
                    <Button variant="ghost" className="w-full justify-center" asChild>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full justify-center" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full justify-center" asChild>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Đăng nhập</Link>
                  </Button>
                  <Button variant="hero" className="w-full justify-center" asChild>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Bắt đầu miễn phí</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
