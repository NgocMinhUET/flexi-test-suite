import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Building2,
  Trophy,
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
  contest_name?: string;
  organization_name?: string;
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
      // Fetch direct exam assignments
      const { data: directAssignments, error: directError } = await supabase
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

      if (directError) throw directError;

      // Fetch contest-based assignments
      const { data: contestAssignments, error: contestError } = await supabase
        .from('contest_participants')
        .select(`
          id,
          assigned_exam_id,
          assigned_at,
          contest_id,
          contest:contests (
            id,
            name,
            start_time,
            end_time,
            status
          ),
          exam:exams (
            id,
            title,
            subject,
            duration,
            total_questions,
            description
          )
        `)
        .eq('user_id', user.id)
        .not('assigned_exam_id', 'is', null);

      if (contestError) throw contestError;

      // Fetch registration info (to get organization)
      const { data: registrations } = await supabase
        .from('contest_registrations')
        .select('contest_id, organization_id')
        .eq('user_id', user.id);

      // Fetch organization names
      const orgIds = [...new Set((registrations || []).map(r => r.organization_id))];
      let orgMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        (orgs || []).forEach(o => { orgMap[o.id] = o.name; });
      }

      // Build contest->org map
      const contestOrgMap: Record<string, string> = {};
      (registrations || []).forEach(r => {
        contestOrgMap[r.contest_id] = orgMap[r.organization_id] || '';
      });

      // Fetch submission status
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('exam_id')
        .eq('user_id', user.id);

      if (resultsError) throw resultsError;

      const submittedExamIds = new Set((resultsData || []).map(r => r.exam_id));

      // Process direct assignments
      const processedDirectAssignments: AssignedExam[] = (directAssignments || [])
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

      // Process contest assignments
      const processedContestAssignments: AssignedExam[] = (contestAssignments || [])
        .filter(a => a.exam && a.contest && ['active', 'completed'].includes((a.contest as any).status))
        .map(a => ({
          id: a.id,
          exam_id: a.assigned_exam_id!,
          start_time: (a.contest as any)?.start_time || null,
          end_time: (a.contest as any)?.end_time || null,
          assigned_at: a.assigned_at || new Date().toISOString(),
          exam: a.exam as AssignedExam['exam'],
          has_submitted: submittedExamIds.has(a.assigned_exam_id!),
          contest_name: (a.contest as any)?.name || undefined,
          organization_name: contestOrgMap[a.contest_id] || undefined,
        }));

      // Combine and deduplicate
      const examIdSet = new Set(processedDirectAssignments.map(a => a.exam_id));
      const uniqueContestAssignments = processedContestAssignments.filter(a => !examIdSet.has(a.exam_id));

      setAssignments([...processedDirectAssignments, ...uniqueContestAssignments]);
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
      return { label: 'Đã hoàn thành', variant: 'default' as const, canTake: false, color: 'text-emerald-600' };
    }

    const now = new Date();
    if (assignment.start_time && new Date(assignment.start_time) > now) {
      return { label: 'Chưa bắt đầu', variant: 'secondary' as const, canTake: false, color: 'text-muted-foreground' };
    }
    if (assignment.end_time && new Date(assignment.end_time) < now) {
      return { label: 'Đã hết hạn', variant: 'destructive' as const, canTake: false, color: 'text-destructive' };
    }

    return { label: 'Sẵn sàng', variant: 'outline' as const, canTake: true, color: 'text-primary' };
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-primary">Pro</span>
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Bài thi của tôi</h1>
          <p className="text-muted-foreground mt-1">Các bài thi được gán cho bạn</p>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileText className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Bạn chưa được gán bài thi nào</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vui lòng liên hệ giáo viên hoặc đăng ký qua mã mời để nhận bài thi.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {assignments.map((assignment) => {
              const status = getExamStatus(assignment);
              return (
                <Card key={assignment.id} className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="p-6">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-foreground leading-tight">
                            {assignment.exam.title}
                          </h3>
                        </div>
                        <Badge variant={status.variant} className="shrink-0 text-xs">
                          {status.label}
                        </Badge>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-primary/70" />
                          {assignment.exam.subject}
                        </span>
                        {assignment.contest_name && (
                          <span className="flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            {assignment.contest_name}
                          </span>
                        )}
                        {assignment.organization_name && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-primary/70" />
                            {assignment.organization_name}
                          </span>
                        )}
                      </div>

                      {assignment.exam.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {assignment.exam.description}
                        </p>
                      )}

                      <Separator className="my-4" />

                      {/* Stats row */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>Thời gian: <strong>{assignment.exam.duration} phút</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>Số câu: <strong>{assignment.exam.total_questions} câu</strong></span>
                        </div>
                        {(assignment.start_time || assignment.end_time) && (
                          <div className="flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-primary" />
                            <span>
                              {assignment.start_time && (
                                <>Từ {format(new Date(assignment.start_time), 'HH:mm dd/MM/yyyy', { locale: vi })}</>
                              )}
                              {assignment.end_time && (
                                <> — Đến {format(new Date(assignment.end_time), 'HH:mm dd/MM/yyyy', { locale: vi })}</>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="px-6 pb-5">
                      {assignment.has_submitted ? (
                        <Button variant="outline" className="w-full h-12 text-base" asChild>
                          <Link to={`/exam/${assignment.exam_id}/result`}>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Xem kết quả
                          </Link>
                        </Button>
                      ) : status.canTake ? (
                        <Button className="w-full h-12 text-base" asChild>
                          <Link to={`/exam/${assignment.exam_id}`}>
                            <Play className="w-5 h-5 mr-2" />
                            Bắt đầu làm bài
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full h-12 text-base" disabled>
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
