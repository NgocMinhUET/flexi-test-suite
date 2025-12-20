import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ClipboardCheck,
  GraduationCap,
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
import { CreateExamWizardDialog } from '@/components/exam/CreateExamWizardDialog';

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number;
  total_questions: number;
  is_published: boolean;
  created_at: string;
  mode: string | null;
}

interface ExamResultSummary {
  exam_id: string;
  exam_title: string;
  total_submissions: number;
  avg_percentage: number;
}

type ModeFilter = 'all' | 'exam' | 'practice';

// Memoized exam card component
const ExamCard = memo(({
  exam,
  summary,
  assignedCount,
  onTogglePublish,
  onDelete,
  onAssign,
  onImport,
}: {
  exam: Exam;
  summary?: ExamResultSummary;
  assignedCount: number;
  onTogglePublish: (exam: Exam) => void;
  onDelete: (examId: string) => void;
  onAssign: (exam: Exam) => void;
  onImport: (exam: Exam) => void;
}) => {
  const mode = exam.mode || 'exam';
  const isExamMode = mode === 'exam';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-foreground">{exam.title}</h3>
          <Badge variant={isExamMode ? 'default' : 'secondary'} className="gap-1">
            {isExamMode ? (
              <>
                <ClipboardCheck className="w-3 h-3" />
                Thi chính thức
              </>
            ) : (
              <>
                <GraduationCap className="w-3 h-3" />
                Luyện tập
              </>
            )}
          </Badge>
          <Badge variant={exam.is_published ? 'outline' : 'secondary'}>
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
          {isExamMode && (
            <span className="flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" />
              {assignedCount} thí sinh
            </span>
          )}
          {summary && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {summary.total_submissions} bài nộp ({Math.round(summary.avg_percentage)}% TB)
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isExamMode && (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Gán thí sinh"
              onClick={() => onAssign(exam)}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Import thí sinh"
              onClick={() => onImport(exam)}
            >
              <Upload className="w-4 h-4" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onTogglePublish(exam)}
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
              <AlertDialogAction onClick={() => onDelete(exam.id)}>
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

ExamCard.displayName = 'ExamCard';

const ExamsManagement = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [resultSummaries, setResultSummaries] = useState<ExamResultSummary[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [wizardOpen, setWizardOpen] = useState(false);

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
        .select('id, title, subject, duration, total_questions, is_published, created_at, mode')
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

  const handleDeleteExam = useCallback(async (examId: string) => {
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      toast.success('Đã xóa đề thi');
      fetchData();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Lỗi khi xóa đề thi');
    }
  }, []);

  const handleTogglePublish = useCallback(async (exam: Exam) => {
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
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const handleAssign = useCallback((exam: Exam) => {
    setSelectedExam(exam);
    setAssignDialogOpen(true);
  }, []);

  const handleImport = useCallback((exam: Exam) => {
    setSelectedExam(exam);
    setImportDialogOpen(true);
  }, []);

  // Filter exams by mode
  const filteredExams = useMemo(() => {
    if (modeFilter === 'all') return exams;
    return exams.filter(exam => {
      const examMode = exam.mode || 'exam';
      return examMode === modeFilter;
    });
  }, [exams, modeFilter]);

  // Count by mode
  const modeCounts = useMemo(() => {
    const counts = { all: exams.length, exam: 0, practice: 0 };
    exams.forEach(exam => {
      const mode = exam.mode || 'exam';
      if (mode === 'exam') counts.exam++;
      else if (mode === 'practice') counts.practice++;
    });
    return counts;
  }, [exams]);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý đề thi</h1>
            <p className="text-muted-foreground">Tạo và quản lý đề thi chính thức và bài luyện tập</p>
          </div>
          <Button variant="hero" onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo đề mới
          </Button>
        </div>

        {/* Mode Filter Tabs */}
        <Tabs value={modeFilter} onValueChange={(v) => setModeFilter(v as ModeFilter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              Tất cả
              <Badge variant="secondary" className="ml-1">{modeCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="exam" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Thi chính thức
              <Badge variant="secondary" className="ml-1">{modeCounts.exam}</Badge>
            </TabsTrigger>
            <TabsTrigger value="practice" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Luyện tập
              <Badge variant="secondary" className="ml-1">{modeCounts.practice}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Danh sách đề thi
            </CardTitle>
            <CardDescription>
              {modeFilter === 'all' && 'Tất cả đề thi và bài luyện tập'}
              {modeFilter === 'exam' && 'Đề thi chính thức - có chấm điểm, giới hạn lần làm'}
              {modeFilter === 'practice' && 'Bài luyện tập - xem đáp án, làm nhiều lần'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredExams.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {modeFilter === 'all' && 'Chưa có đề thi nào'}
                  {modeFilter === 'exam' && 'Chưa có đề thi chính thức nào'}
                  {modeFilter === 'practice' && 'Chưa có bài luyện tập nào'}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setWizardOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo đề mới
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExams.map((exam) => {
                  const summary = resultSummaries.find((s) => s.exam_id === exam.id);
                  const assignedCount = assignmentCounts.get(exam.id) || 0;
                  return (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      summary={summary}
                      assignedCount={assignedCount}
                      onTogglePublish={handleTogglePublish}
                      onDelete={handleDeleteExam}
                      onAssign={handleAssign}
                      onImport={handleImport}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Wizard Dialog */}
      <CreateExamWizardDialog 
        open={wizardOpen} 
        onOpenChange={setWizardOpen} 
      />

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