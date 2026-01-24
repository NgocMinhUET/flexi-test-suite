import { useState, memo, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap, BookOpen, Trophy, Users, LogOut, LayoutDashboard, FileText, Zap, Award, ClipboardList, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NavItem = memo(({ item, onClick }: { 
  item: { label: string; href: string; icon: React.ElementType; isLink?: boolean }; 
  onClick?: () => void;
}) => {
  const Icon = item.icon;
  const className = "flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors";
  
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
    { label: "Hình thức thi", href: "#exams", icon: BookOpen },
    { label: "Thi lập trình", href: "#coding", icon: Target },
    { label: "Tính năng", href: "#features", icon: Trophy },
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Flexi<span className="text-primary">Test</span>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Đăng nhập</Link>
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md" asChild>
                  <Link to="/auth">Đăng ký miễn phí</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-1">
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
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link to="/my-exams" onClick={closeMenu}>
                        <FileText className="w-4 h-4 mr-2" />
                        Bài thi của tôi
                      </Link>
                    </Button>
                  )}
                  {(isAdmin || isTeacher) && (
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link to="/dashboard" onClick={closeMenu}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive border-destructive/30" 
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link to="/auth" onClick={closeMenu}>Đăng nhập</Link>
                  </Button>
                  <Button className="w-full justify-start bg-primary" asChild>
                    <Link to="/auth" onClick={closeMenu}>Đăng ký miễn phí</Link>
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
