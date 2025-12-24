import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Code2,
  FileText,
  Users,
  BarChart3,
  LogOut,
  Loader2,
  BookOpen,
  CheckCircle,
  Trophy,
  ClipboardCheck,
  GraduationCap,
  Repeat,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

// Memoized stat card component
const StatCard = memo(({ 
  icon: Icon, 
  value, 
  label, 
  colorClass 
}: { 
  icon: React.ElementType; 
  value: string | number; 
  label: string; 
  colorClass: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    // Exam stats
    totalExams: 0,
    totalSubmissions: 0,
    avgScore: 0,
    publishedExams: 0,
    // Practice stats
    totalPractice: 0,
    practiceAttempts: 0,
    practiceAvgScore: 0,
    // Contest stats
    totalContests: 0,
    totalContestParticipants: 0,
    contestAvgScore: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin && !isTeacher) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, authLoading, isAdmin, isTeacher, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isTeacher)) {
      fetchStats();
    }
  }, [user, isAdmin, isTeacher]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Use COUNT() queries instead of loading all data - much more efficient!
      const [
        examCountRes,
        publishedExamCountRes,
        practiceExamCountRes,
        submissionsCountRes,
        avgScoreRes,
        contestsCountRes,
        participantsCountRes,
        practiceConfigsCountRes,
        practiceAttemptsCountRes,
        practiceAvgScoreRes,
      ] = await Promise.all([
        // Count official exams (mode = exam or null, source_type = standalone or null)
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .or('mode.is.null,mode.eq.exam')
          .or('source_type.is.null,source_type.eq.standalone'),
        // Count published official exams
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true)
          .or('mode.is.null,mode.eq.exam')
          .or('source_type.is.null,source_type.eq.standalone'),
        // Count practice mode exams
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('mode', 'practice'),
        // Count submissions
        supabase
          .from('exam_results')
          .select('*', { count: 'exact', head: true }),
        // Get average score (need to fetch percentages for calculation)
        supabase
          .from('exam_results')
          .select('percentage')
          .limit(1000), // Limit for avg calculation
        // Count contests
        supabase
          .from('contests')
          .select('*', { count: 'exact', head: true }),
        // Count contest participants
        supabase
          .from('contest_participants')
          .select('*', { count: 'exact', head: true }),
        // Count practice configs
        supabase
          .from('practice_configs')
          .select('*', { count: 'exact', head: true }),
        // Count practice attempts
        supabase
          .from('practice_attempts')
          .select('*', { count: 'exact', head: true }),
        // Get practice avg score
        supabase
          .from('practice_attempts')
          .select('score')
          .limit(1000),
      ]);

      // Calculate averages from limited data
      const avgScoreData = avgScoreRes.data || [];
      const avgScore = avgScoreData.length
        ? avgScoreData.reduce((acc, r) => acc + Number(r.percentage || 0), 0) / avgScoreData.length
        : 0;

      const practiceScoreData = practiceAvgScoreRes.data || [];
      const practiceAvgScore = practiceScoreData.length
        ? practiceScoreData.reduce((acc, r) => acc + Number(r.score || 0), 0) / practiceScoreData.length
        : 0;

      setStats({
        totalExams: examCountRes.count ?? 0,
        totalSubmissions: submissionsCountRes.count ?? 0,
        avgScore: Math.round(avgScore * 10) / 10,
        publishedExams: publishedExamCountRes.count ?? 0,
        totalPractice: (practiceExamCountRes.count ?? 0) + (practiceConfigsCountRes.count ?? 0),
        practiceAttempts: practiceAttemptsCountRes.count ?? 0,
        practiceAvgScore: Math.round(practiceAvgScore * 10) / 10,
        totalContests: contestsCountRes.count ?? 0,
        totalContestParticipants: participantsCountRes.count ?? 0,
        contestAvgScore: 0, // Simplified - contest avg requires more complex query
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-gradient">Pro</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Admin' : 'Giáo viên'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Thống kê và báo cáo tổng quan</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <>
                <Button variant="outline" asChild>
                  <Link to="/admin/users">
                    <Users className="w-4 h-4 mr-2" />
                    Người dùng
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/admin/subjects">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Môn học
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" asChild>
              <Link to="/questions">
                <FileText className="w-4 h-4 mr-2" />
                Ngân hàng câu hỏi
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/exams?mode=exam')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Đề thi chính thức</CardTitle>
                  <CardDescription>Tạo và quản lý bài thi</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/exams?mode=practice')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-base">Bài luyện tập</CardTitle>
                  <CardDescription>Tạo bài tập cho học sinh</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/contests')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-base">Cuộc thi</CardTitle>
                  <CardDescription>Tổ chức cuộc thi lớn</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Exam Stats */}
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Đề thi chính thức
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={FileText} 
            value={stats.totalExams} 
            label="Tổng đề thi" 
            colorClass="bg-primary/10 text-primary" 
          />
          <StatCard 
            icon={CheckCircle} 
            value={stats.publishedExams} 
            label="Đã công khai" 
            colorClass="bg-success/10 text-success" 
          />
          <StatCard 
            icon={Users} 
            value={stats.totalSubmissions} 
            label="Bài nộp" 
            colorClass="bg-accent/10 text-accent" 
          />
          <StatCard 
            icon={BarChart3} 
            value={`${stats.avgScore}%`} 
            label="Điểm TB" 
            colorClass="bg-warning/10 text-warning" 
          />
        </div>

        {/* Practice Stats */}
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-accent" />
          Bài luyện tập
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard 
            icon={Target} 
            value={stats.totalPractice} 
            label="Bài luyện tập" 
            colorClass="bg-accent/10 text-accent" 
          />
          <StatCard 
            icon={Repeat} 
            value={stats.practiceAttempts} 
            label="Lượt làm bài" 
            colorClass="bg-primary/10 text-primary" 
          />
          <StatCard 
            icon={BarChart3} 
            value={`${stats.practiceAvgScore}%`} 
            label="Điểm TB" 
            colorClass="bg-success/10 text-success" 
          />
        </div>

        {/* Contest Stats */}
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          Cuộc thi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            icon={Trophy} 
            value={stats.totalContests} 
            label="Số cuộc thi" 
            colorClass="bg-primary/10 text-primary" 
          />
          <StatCard 
            icon={Users} 
            value={stats.totalContestParticipants} 
            label="Thí sinh tham gia" 
            colorClass="bg-accent/10 text-accent" 
          />
          <StatCard 
            icon={BarChart3} 
            value={`${stats.contestAvgScore}%`} 
            label="Điểm TB cuộc thi" 
            colorClass="bg-warning/10 text-warning" 
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;