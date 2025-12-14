import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  Plus,
  FileText,
  Users,
  Clock,
  Eye,
  Edit,
  Trash2,
  LogOut,
  Loader2,
  BookOpen,
  CheckCircle,
  XCircle,
  UserPlus,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AssignStudentsDialog } from '@/components/exam/AssignStudentsDialog';
import { ImportStudentsToExamDialog } from '@/components/exam/ImportStudentsToExamDialog';

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number;
  total_questions: number;
  is_published: boolean;
  created_at: string;
}

interface ExamResultSummary {
  exam_id: string;
  exam_title: string;
  total_submissions: number;
  avg_percentage: number;
}

const ExamsManagement = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [resultSummaries, setResultSummaries] = useState<ExamResultSummary[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

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
      fetchData();
    }
  }, [user, isAdmin, isTeacher]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch only standalone exams (exclude contest-generated exams)
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .or('source_type.is.null,source_type.eq.standalone')
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;
      setExams(examsData || []);

      // Fetch exam results summary
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('exam_id, percentage');

      if (resultsError) throw resultsError;

      // Fetch assignment counts
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('exam_assignments')
        .select('exam_id');

      if (assignmentsError) throw assignmentsError;

      const countMap = new Map<string, number>();
      (assignmentsData || []).forEach(a => {
        countMap.set(a.exam_id, (countMap.get(a.exam_id) || 0) + 1);
      });
      setAssignmentCounts(countMap);

      // Calculate summaries
      const summaryMap = new Map<string, { total: number; sum: number }>();
      (resultsData || []).forEach((result) => {
        const current = summaryMap.get(result.exam_id) || { total: 0, sum: 0 };
        summaryMap.set(result.exam_id, {
          total: current.total + 1,
          sum: current.sum + Number(result.percentage),
        });
      });

      const summaries: ExamResultSummary[] = [];
      summaryMap.forEach((value, key) => {
        const exam = examsData?.find((e) => e.id === key);
        if (exam) {
          summaries.push({
            exam_id: key,
            exam_title: exam.title,
            total_submissions: value.total,
            avg_percentage: value.sum / value.total,
          });
        }
      });
      setResultSummaries(summaries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      toast.success('Đã xóa đề thi');
      fetchData();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Lỗi khi xóa đề thi');
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: !exam.is_published })
        .eq('id', exam.id);
      if (error) throw error;
      toast.success(exam.is_published ? 'Đã ẩn đề thi' : 'Đã công khai đề thi');
      fetchData();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Lỗi khi cập nhật');
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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  Exam<span className="text-gradient">Pro</span>
                </span>
              </Link>
            </div>

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
            <h1 className="text-3xl font-bold text-foreground">Quản lý đề thi</h1>
            <p className="text-muted-foreground">Tạo và quản lý các đề thi độc lập</p>
          </div>
          <Button variant="hero" asChild>
            <Link to="/exam/new">
              <Plus className="w-4 h-4 mr-2" />
              Tạo đề thi mới
            </Link>
          </Button>
        </div>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Danh sách đề thi
            </CardTitle>
            <CardDescription>Các đề thi độc lập (không thuộc cuộc thi)</CardDescription>
          </CardHeader>
          <CardContent>
            {exams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có đề thi nào</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/exam/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Tạo đề thi đầu tiên
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => {
                  const summary = resultSummaries.find((s) => s.exam_id === exam.id);
                  const assignedCount = assignmentCounts.get(exam.id) || 0;
                  return (
                    <div
                      key={exam.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{exam.title}</h3>
                          <Badge variant={exam.is_published ? 'default' : 'secondary'}>
                            {exam.is_published ? 'Công khai' : 'Nháp'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {exam.subject}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {exam.duration} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {exam.total_questions} câu
                          </span>
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3.5 h-3.5" />
                            {assignedCount} thí sinh
                          </span>
                          {summary && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {summary.total_submissions} bài nộp ({Math.round(summary.avg_percentage)}% TB)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Gán thí sinh"
                          onClick={() => {
                            setSelectedExam(exam);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Import thí sinh"
                          onClick={() => {
                            setSelectedExam(exam);
                            setImportDialogOpen(true);
                          }}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublish(exam)}
                          title={exam.is_published ? 'Ẩn đề thi' : 'Công khai đề thi'}
                        >
                          {exam.is_published ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/exam/${exam.id}`} title="Xem trước">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/exam/${exam.id}/edit`} title="Chỉnh sửa">
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa đề thi "{exam.title}"? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteExam(exam.id)}>
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      {selectedExam && (
        <>
          <AssignStudentsDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            examId={selectedExam.id}
            examTitle={selectedExam.title}
            onSuccess={fetchData}
          />
          <ImportStudentsToExamDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            examId={selectedExam.id}
            examTitle={selectedExam.title}
            onSuccess={fetchData}
          />
        </>
      )}
    </div>
  );
};

export default ExamsManagement;
