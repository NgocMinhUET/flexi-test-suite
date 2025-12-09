import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Code2,
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Clock,
  Award,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ExamResultItem {
  id: string;
  user_id: string;
  total_points: number;
  earned_points: number;
  percentage: number;
  grade: string | null;
  duration: number | null;
  submitted_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ExamInfo {
  id: string;
  title: string;
  subject: string;
  duration: number;
  total_questions: number;
}

const ExamResults = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [results, setResults] = useState<ExamResultItem[]>([]);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0,
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
    if (id && user && (isAdmin || isTeacher)) {
      fetchData();
    }
  }, [id, user, isAdmin, isTeacher]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch exam info
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, title, subject, duration, total_questions')
        .eq('id', id)
        .maybeSingle();

      if (examError) throw examError;
      if (!examData) {
        toast.error('Không tìm thấy đề thi');
        navigate('/dashboard');
        return;
      }
      setExam(examData);

      // Fetch results
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', id)
        .order('submitted_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Fetch profiles separately
      const userIds = [...new Set((resultsData || []).map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      
      const resultsWithProfiles: ExamResultItem[] = (resultsData || []).map(r => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || null,
      }));
      
      setResults(resultsWithProfiles);

      // Calculate stats
      if (resultsData && resultsData.length > 0) {
        const scores = resultsData.map((r) => Number(r.percentage));
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passCount = scores.filter((s) => s >= 50).length;

        setStats({
          totalSubmissions: resultsData.length,
          avgScore: Math.round(avgScore * 10) / 10,
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores),
          passRate: Math.round((passCount / scores.length) * 100),
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Họ tên', 'Email', 'Điểm', 'Phần trăm', 'Xếp loại', 'Thời gian làm bài', 'Ngày nộp'];
    const rows = results.map((r) => [
      r.profiles?.full_name || 'N/A',
      r.profiles?.email || 'N/A',
      `${r.earned_points}/${r.total_points}`,
      `${r.percentage}%`,
      r.grade || 'N/A',
      r.duration ? `${r.duration} phút` : 'N/A',
      format(new Date(r.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi }),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ket-qua-${exam?.title || 'exam'}.csv`;
    link.click();
    toast.success('Đã xuất file CSV');
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-success text-success-foreground';
    if (percentage >= 70) return 'bg-primary text-primary-foreground';
    if (percentage >= 50) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <span className="text-lg font-bold text-foreground block">{exam?.title}</span>
                  <span className="text-xs text-muted-foreground">{exam?.subject}</span>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Xuất CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.totalSubmissions}</p>
              <p className="text-sm text-muted-foreground">Bài nộp</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.avgScore}%</p>
              <p className="text-sm text-muted-foreground">Điểm TB</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-success">{stats.highestScore}%</p>
              <p className="text-sm text-muted-foreground">Cao nhất</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-destructive">{stats.lowestScore}%</p>
              <p className="text-sm text-muted-foreground">Thấp nhất</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{stats.passRate}%</p>
              <p className="text-sm text-muted-foreground">Tỉ lệ đạt</p>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách kết quả</CardTitle>
            <CardDescription>
              Chi tiết kết quả thi của sinh viên
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có bài nộp nào</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sinh viên</TableHead>
                      <TableHead>Điểm</TableHead>
                      <TableHead>Phần trăm</TableHead>
                      <TableHead>Xếp loại</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Ngày nộp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {result.profiles?.full_name || 'Không có tên'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {result.profiles?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {result.earned_points}/{result.total_points}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getGradeColor(Number(result.percentage))}>
                            {result.percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result.grade || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {result.duration ? `${result.duration} phút` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(result.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ExamResults;
