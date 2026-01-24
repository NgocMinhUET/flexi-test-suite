import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  ClipboardList,
  School,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickLinkCard } from '@/components/dashboard/QuickLinkCard';
import { StatSection } from '@/components/dashboard/StatSection';

interface DashboardStats {
  totalExams: number;
  totalSubmissions: number;
  avgScore: number;
  publishedExams: number;
  totalPractice: number;
  practiceAttempts: number;
  practiceAvgScore: number;
  totalContests: number;
  totalContestParticipants: number;
  contestAvgScore: number;
}

const initialStats: DashboardStats = {
  totalExams: 0,
  totalSubmissions: 0,
  avgScore: 0,
  publishedExams: 0,
  totalPractice: 0,
  practiceAttempts: 0,
  practiceAvgScore: 0,
  totalContests: 0,
  totalContestParticipants: 0,
  contestAvgScore: 0,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(initialStats);

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
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .or('mode.is.null,mode.eq.exam')
          .or('source_type.is.null,source_type.eq.standalone'),
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true)
          .or('mode.is.null,mode.eq.exam')
          .or('source_type.is.null,source_type.eq.standalone'),
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('mode', 'practice'),
        supabase
          .from('exam_results')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('exam_results')
          .select('percentage')
          .limit(1000),
        supabase
          .from('contests')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('contest_participants')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('practice_configs')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('practice_attempts')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('practice_attempts')
          .select('score')
          .limit(1000),
      ]);

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
        contestAvgScore: 0,
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
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-primary">Pro</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Quản trị viên' : 'Giáo viên'}
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
            <h1 className="text-3xl font-bold text-foreground">Tổng quan</h1>
            <p className="text-muted-foreground">Thống kê và báo cáo hệ thống</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/users">
                    <Users className="w-4 h-4 mr-2" />
                    Người dùng
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/subjects">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Môn học
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/questions">
                <FileText className="w-4 h-4 mr-2" />
                Ngân hàng câu hỏi
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <section className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <QuickLinkCard
              icon={ClipboardCheck}
              title="Đề thi chính thức"
              description="Tạo và quản lý bài thi"
              variant="primary"
              onClick={() => navigate('/exams?mode=exam')}
            />
            <QuickLinkCard
              icon={GraduationCap}
              title="Bài luyện tập"
              description="Tạo bài tập cho học sinh"
              variant="amber"
              onClick={() => navigate('/exams?mode=practice')}
            />
            <QuickLinkCard
              icon={ClipboardList}
              title="Bài tập được giao"
              description="Giao bài và theo dõi"
              variant="success"
              onClick={() => navigate('/practice-assignments')}
            />
            <QuickLinkCard
              icon={Trophy}
              title="Cuộc thi"
              description="Tổ chức cuộc thi lớn"
              variant="warning"
              onClick={() => navigate('/contests')}
            />
            <QuickLinkCard
              icon={School}
              title="Quản lý lớp học"
              description="Tạo lớp và quản lý"
              variant="primary"
              onClick={() => navigate('/classes')}
            />
          </div>
        </section>

        {/* Exam Stats */}
        <StatSection
          icon={ClipboardCheck}
          title="Đề thi chính thức"
          iconColorClass="text-primary"
          columns={4}
        >
          <StatCard
            icon={FileText}
            value={stats.totalExams}
            label="Tổng số đề thi"
            variant="quantity"
          />
          <StatCard
            icon={CheckCircle}
            value={stats.publishedExams}
            label="Đã công khai"
            variant="published"
          />
          <StatCard
            icon={Users}
            value={stats.totalSubmissions}
            label="Bài nộp"
            variant="submissions"
          />
          <StatCard
            icon={BarChart3}
            value={stats.avgScore}
            label="Điểm trung bình"
            variant="average"
            suffix="%"
            showGauge
            gaugeValue={stats.avgScore}
          />
        </StatSection>

        {/* Practice Stats */}
        <StatSection
          icon={GraduationCap}
          title="Bài luyện tập"
          iconColorClass="text-amber-600"
          columns={3}
        >
          <StatCard
            icon={Target}
            value={stats.totalPractice}
            label="Bài luyện tập"
            variant="quantity"
          />
          <StatCard
            icon={Repeat}
            value={stats.practiceAttempts}
            label="Lượt làm bài"
            variant="submissions"
          />
          <StatCard
            icon={BarChart3}
            value={stats.practiceAvgScore}
            label="Điểm trung bình"
            variant="average"
            suffix="%"
            showGauge
            gaugeValue={stats.practiceAvgScore}
          />
        </StatSection>

        {/* Contest Stats */}
        <StatSection
          icon={Trophy}
          title="Cuộc thi"
          iconColorClass="text-orange-600"
          columns={3}
        >
          <StatCard
            icon={Trophy}
            value={stats.totalContests}
            label="Số cuộc thi"
            variant="quantity"
          />
          <StatCard
            icon={Users}
            value={stats.totalContestParticipants}
            label="Thí sinh tham gia"
            variant="submissions"
          />
          <StatCard
            icon={BarChart3}
            value={stats.contestAvgScore}
            label="Điểm trung bình"
            variant="average"
            suffix="%"
            showGauge
            gaugeValue={stats.contestAvgScore}
          />
        </StatSection>
      </main>
    </div>
  );
};

export default Dashboard;
