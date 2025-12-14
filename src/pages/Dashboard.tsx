import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalSubmissions: 0,
    avgScore: 0,
    publishedExams: 0,
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
      // Fetch only standalone exams count
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, is_published')
        .or('source_type.is.null,source_type.eq.standalone');

      if (examsError) throw examsError;

      // Fetch exam results
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('percentage, exam_id');

      if (resultsError) throw resultsError;

      // Fetch contests
      const { data: contestsData, error: contestsError } = await supabase
        .from('contests')
        .select('id');

      if (contestsError) throw contestsError;

      // Fetch contest participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('contest_participants')
        .select('id');

      if (participantsError) throw participantsError;

      // Fetch contest exam IDs
      const { data: contestExamsData, error: contestExamsError } = await supabase
        .from('exams')
        .select('id')
        .eq('source_type', 'contest');

      if (contestExamsError) throw contestExamsError;

      const contestExamIds = new Set(contestExamsData?.map(e => e.id) || []);

      // Calculate stats
      const totalExams = examsData?.length || 0;
      const publishedExams = examsData?.filter((e) => e.is_published).length || 0;
      const totalSubmissions = resultsData?.length || 0;
      const avgScore = resultsData?.length
        ? resultsData.reduce((acc, r) => acc + Number(r.percentage), 0) / resultsData.length
        : 0;

      // Contest stats
      const totalContests = contestsData?.length || 0;
      const totalContestParticipants = participantsData?.length || 0;
      
      // Contest average score (from contest exams only)
      const contestResults = resultsData?.filter(r => contestExamIds.has(r.exam_id)) || [];
      const contestAvgScore = contestResults.length
        ? contestResults.reduce((acc, r) => acc + Number(r.percentage), 0) / contestResults.length
        : 0;

      setStats({
        totalExams,
        totalSubmissions,
        avgScore: Math.round(avgScore * 10) / 10,
        publishedExams,
        totalContests,
        totalContestParticipants,
        contestAvgScore: Math.round(contestAvgScore * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
            <Button variant="outline" asChild>
              <Link to="/exams">
                <FileText className="w-4 h-4 mr-2" />
                Đề thi
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contests">
                <Trophy className="w-4 h-4 mr-2" />
                Cuộc thi
              </Link>
            </Button>
          </div>
        </div>

        {/* Exam Stats */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Đề thi độc lập</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalExams}</p>
                  <p className="text-sm text-muted-foreground">Tổng đề thi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.publishedExams}</p>
                  <p className="text-sm text-muted-foreground">Đã công khai</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSubmissions}</p>
                  <p className="text-sm text-muted-foreground">Bài nộp</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgScore}%</p>
                  <p className="text-sm text-muted-foreground">Điểm TB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contest Stats */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Cuộc thi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalContests}</p>
                  <p className="text-sm text-muted-foreground">Số cuộc thi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalContestParticipants}</p>
                  <p className="text-sm text-muted-foreground">Thí sinh tham gia</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.contestAvgScore}%</p>
                  <p className="text-sm text-muted-foreground">Điểm TB cuộc thi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
