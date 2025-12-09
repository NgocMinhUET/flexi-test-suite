import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  Clock,
  FileText,
  BookOpen,
  Play,
  CheckCircle,
  Loader2,
  LogOut,
  CalendarClock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AssignedExam {
  id: string;
  exam_id: string;
  start_time: string | null;
  end_time: string | null;
  assigned_at: string;
  exam: {
    id: string;
    title: string;
    subject: string;
    duration: number;
    total_questions: number;
    description: string | null;
  };
  has_submitted: boolean;
}

const StudentExams = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const [assignments, setAssignments] = useState<AssignedExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAssignedExams();
    }
  }, [user]);

  const fetchAssignedExams = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch assignments with exam details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('exam_assignments')
        .select(`
          id,
          exam_id,
          start_time,
          end_time,
          assigned_at,
          exam:exams (
            id,
            title,
            subject,
            duration,
            total_questions,
            description
          )
        `)
        .eq('user_id', user.id);

      if (assignmentsError) throw assignmentsError;

      // Fetch submission status for each exam
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('exam_id')
        .eq('user_id', user.id);

      if (resultsError) throw resultsError;

      const submittedExamIds = new Set((resultsData || []).map(r => r.exam_id));

      const processedAssignments: AssignedExam[] = (assignmentsData || [])
        .filter(a => a.exam)
        .map(a => ({
          id: a.id,
          exam_id: a.exam_id,
          start_time: a.start_time,
          end_time: a.end_time,
          assigned_at: a.assigned_at,
          exam: a.exam as AssignedExam['exam'],
          has_submitted: submittedExamIds.has(a.exam_id),
        }));

      setAssignments(processedAssignments);
    } catch (error) {
      console.error('Error fetching assigned exams:', error);
      toast.error('Lỗi khi tải danh sách bài thi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getExamStatus = (assignment: AssignedExam) => {
    if (assignment.has_submitted) {
      return { label: 'Đã hoàn thành', variant: 'default' as const, canTake: false };
    }

    const now = new Date();
    if (assignment.start_time && new Date(assignment.start_time) > now) {
      return { label: 'Chưa bắt đầu', variant: 'secondary' as const, canTake: false };
    }
    if (assignment.end_time && new Date(assignment.end_time) < now) {
      return { label: 'Đã hết hạn', variant: 'destructive' as const, canTake: false };
    }

    return { label: 'Sẵn sàng', variant: 'outline' as const, canTake: true };
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
                <p className="text-xs text-muted-foreground">Thí sinh</p>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile" title="Hồ sơ cá nhân">
                  <User className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Bài thi của tôi</h1>
          <p className="text-muted-foreground">Các bài thi được gán cho bạn</p>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Bạn chưa được gán bài thi nào</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vui lòng liên hệ giáo viên để được gán bài thi.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => {
              const status = getExamStatus(assignment);
              return (
                <Card key={assignment.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{assignment.exam.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {assignment.exam.subject}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {assignment.exam.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {assignment.exam.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Thời gian: {assignment.exam.duration} phút</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Số câu: {assignment.exam.total_questions} câu</span>
                      </div>
                      {(assignment.start_time || assignment.end_time) && (
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4" />
                          <span>
                            {assignment.start_time && (
                              <>Từ: {format(new Date(assignment.start_time), 'HH:mm dd/MM/yyyy', { locale: vi })}</>
                            )}
                            {assignment.end_time && (
                              <> - Đến: {format(new Date(assignment.end_time), 'HH:mm dd/MM/yyyy', { locale: vi })}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      {assignment.has_submitted ? (
                        <Button variant="outline" className="w-full" asChild>
                          <Link to={`/exam/${assignment.exam_id}/result`}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Xem kết quả
                          </Link>
                        </Button>
                      ) : status.canTake ? (
                        <Button variant="hero" className="w-full" asChild>
                          <Link to={`/exam/${assignment.exam_id}`}>
                            <Play className="w-4 h-4 mr-2" />
                            Bắt đầu làm bài
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          {status.label}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentExams;
