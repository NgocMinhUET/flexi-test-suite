import { useState, memo, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Code2, BookOpen, Trophy, Users, LogOut, LayoutDashboard, FileText, Zap, Target, Award, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Memoized nav item component
const NavItem = memo(({ item, onClick }: { 
  item: { label: string; href: string; icon: React.ElementType; isLink?: boolean }; 
  onClick?: () => void;
}) => {
  const Icon = item.icon;
  const className = "flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors";
  
  if (item.isLink) {
    return (
      <Link to={item.href} className={className} onClick={onClick}>
        <Icon className="w-4 h-4" />
        {item.label}
      </Link>
    );
  }
  
  return (
    <a href={item.href} className={className} onClick={onClick}>
      <Icon className="w-4 h-4" />
      {item.label}
    </a>
  );
});

NavItem.displayName = 'NavItem';

const Header = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading, signOut } = useAuth();

  const isStudent = user && !isAdmin && !isTeacher;

  const publicNavItems = [
    { label: "Bài thi", href: "#exams", icon: BookOpen },
    { label: "Lập trình", href: "#coding", icon: Code2 },
    { label: "Bảng xếp hạng", href: "/leaderboard", icon: Trophy, isLink: true },
    { label: "Cộng đồng", href: "#community", icon: Users },
  ];

  const studentNavItems = [
    { label: "Bài được giao", href: "/my-practice-assignments", icon: ClipboardList, isLink: true },
    { label: "Luyện tập", href: "/practice", icon: BookOpen, isLink: true },
    { label: "Adaptive", href: "/adaptive-practice", icon: Zap, isLink: true },
    { label: "Thành tích", href: "/achievements", icon: Award, isLink: true },
    { label: "Xếp hạng", href: "/leaderboard", icon: Trophy, isLink: true },
  ];

  const navItems = useMemo(() => 
    user ? (isStudent ? studentNavItems : publicNavItems) : publicNavItems,
    [user, isStudent]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setIsMenuOpen(false);
    navigate('/');
  }, [signOut, navigate]);

  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

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
              <NavItem key={item.label} item={item} />
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
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-slide-up">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavItem key={item.label} item={item} onClick={closeMenu} />
              ))}
            </nav>
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
              {isLoading ? (
                <div className="w-full h-10 bg-muted animate-pulse rounded-lg" />
              ) : user ? (
                <>
                  {isStudent && (
                    <Button variant="ghost" className="w-full justify-center" asChild>
                      <Link to="/my-exams" onClick={closeMenu}>
                        <FileText className="w-4 h-4 mr-2" />
                        Bài thi của tôi
                      </Link>
                    </Button>
                  )}
                  {(isAdmin || isTeacher) && (
                    <Button variant="ghost" className="w-full justify-center" asChild>
                      <Link to="/dashboard" onClick={closeMenu}>
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
                    <Link to="/auth" onClick={closeMenu}>Đăng nhập</Link>
                  </Button>
                  <Button variant="hero" className="w-full justify-center" asChild>
                    <Link to="/auth" onClick={closeMenu}>Bắt đầu miễn phí</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
