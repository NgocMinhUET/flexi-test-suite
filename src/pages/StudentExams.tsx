import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  AlertCircle,
  BarChart3,
  GraduationCap,
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

interface ExamGroup {
  groupKey: string;
  contestName: string | null;
  organizationName: string | null;
  exams: AssignedExam[];
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
      const { data: directAssignments, error: directError } = await supabase
        .from('exam_assignments')
        .select(`id, exam_id, start_time, end_time, assigned_at, exam:exams (id, title, subject, duration, total_questions, description)`)
        .eq('user_id', user.id);
      if (directError) throw directError;

      const { data: contestAssignments, error: contestError } = await supabase
        .from('contest_participants')
        .select(`id, assigned_exam_id, assigned_at, contest_id, contest:contests (id, name, start_time, end_time, status), exam:exams (id, title, subject, duration, total_questions, description)`)
        .eq('user_id', user.id)
        .not('assigned_exam_id', 'is', null);
      if (contestError) throw contestError;

      const { data: registrations } = await supabase
        .from('contest_registrations')
        .select('contest_id, organization_id')
        .eq('user_id', user.id);

      const orgIds = [...new Set((registrations || []).map(r => r.organization_id))];
      let orgMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        (orgs || []).forEach(o => { orgMap[o.id] = o.name; });
      }
      const contestOrgMap: Record<string, string> = {};
      (registrations || []).forEach(r => { contestOrgMap[r.contest_id] = orgMap[r.organization_id] || ''; });

      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('exam_id')
        .eq('user_id', user.id);
      if (resultsError) throw resultsError;
      const submittedExamIds = new Set((resultsData || []).map(r => r.exam_id));

      const processedDirect: AssignedExam[] = (directAssignments || [])
        .filter(a => a.exam)
        .map(a => ({
          id: a.id, exam_id: a.exam_id, start_time: a.start_time, end_time: a.end_time,
          assigned_at: a.assigned_at, exam: a.exam as AssignedExam['exam'],
          has_submitted: submittedExamIds.has(a.exam_id),
        }));

      const processedContest: AssignedExam[] = (contestAssignments || [])
        .filter(a => a.exam && a.contest && ['active', 'completed'].includes((a.contest as any).status))
        .map(a => ({
          id: a.id, exam_id: a.assigned_exam_id!, start_time: (a.contest as any)?.start_time || null,
          end_time: (a.contest as any)?.end_time || null, assigned_at: a.assigned_at || new Date().toISOString(),
          exam: a.exam as AssignedExam['exam'], has_submitted: submittedExamIds.has(a.assigned_exam_id!),
          contest_name: (a.contest as any)?.name || undefined,
          organization_name: contestOrgMap[a.contest_id] || undefined,
        }));

      const examIdSet = new Set(processedDirect.map(a => a.exam_id));
      const uniqueContest = processedContest.filter(a => !examIdSet.has(a.exam_id));
      setAssignments([...processedDirect, ...uniqueContest]);
    } catch (error) {
      console.error('Error fetching assigned exams:', error);
      toast.error('Lỗi khi tải danh sách bài thi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const getExamStatus = (assignment: AssignedExam) => {
    if (assignment.has_submitted) return { label: 'Đã hoàn thành', variant: 'default' as const, canTake: false, icon: CheckCircle };
    const now = new Date();
    if (assignment.start_time && new Date(assignment.start_time) > now) return { label: 'Chưa bắt đầu', variant: 'secondary' as const, canTake: false, icon: Clock };
    if (assignment.end_time && new Date(assignment.end_time) < now) return { label: 'Đã hết hạn', variant: 'destructive' as const, canTake: false, icon: AlertCircle };
    return { label: 'Sẵn sàng', variant: 'outline' as const, canTake: true, icon: Play };
  };

  // Group exams by contest
  const groupedExams = useMemo(() => {
    const groups: ExamGroup[] = [];
    const directExams = assignments.filter(a => !a.contest_name);
    const contestMap = new Map<string, AssignedExam[]>();

    assignments.filter(a => a.contest_name).forEach(a => {
      const key = `${a.contest_name}||${a.organization_name || ''}`;
      if (!contestMap.has(key)) contestMap.set(key, []);
      contestMap.get(key)!.push(a);
    });

    // Contest groups first
    contestMap.forEach((exams, key) => {
      const [contestName, orgName] = key.split('||');
      groups.push({ groupKey: key, contestName, organizationName: orgName || null, exams });
    });

    // Direct assignments
    if (directExams.length > 0) {
      groups.push({ groupKey: '__direct__', contestName: null, organizationName: null, exams: directExams });
    }

    return groups;
  }, [assignments]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.has_submitted).length;
    const ready = assignments.filter(a => getExamStatus(a).canTake).length;
    return { total, completed, ready, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [assignments]);

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
                <Link to="/profile" title="Hồ sơ cá nhân"><User className="w-5 h-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Page title + Summary stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Bài thi của tôi</h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Tổng bài thi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Đã hoàn thành</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Play className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
                  <p className="text-xs text-muted-foreground">Chờ làm bài</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <Progress value={stats.progress} className="flex-1 h-2" />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{stats.progress}% hoàn thành</span>
            </div>
          )}
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
          <div className="space-y-6">
            {groupedExams.map((group) => (
              <Card key={group.groupKey} className="overflow-hidden border-border/60">
                {/* Group Header */}
                <CardHeader className="pb-0">
                  <div className="flex items-center gap-3">
                    {group.contestName ? (
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5 text-amber-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        {group.contestName || 'Bài thi được giao trực tiếp'}
                      </CardTitle>
                      {group.organizationName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {group.organizationName}
                        </p>
                      )}
                    </div>
                    <Badge variant="ghost" className="shrink-0">
                      {group.exams.length} đề
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Time info for contest */}
                  {group.contestName && group.exams[0]?.start_time && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        {group.exams[0].start_time && format(new Date(group.exams[0].start_time), 'HH:mm dd/MM/yyyy', { locale: vi })}
                        {group.exams[0].end_time && <> — {format(new Date(group.exams[0].end_time), 'HH:mm dd/MM/yyyy', { locale: vi })}</>}
                      </span>
                    </div>
                  )}

                  {/* Exam rows */}
                  <div className="divide-y divide-border/50">
                    {group.exams.map((assignment) => {
                      const status = getExamStatus(assignment);
                      const StatusIcon = status.icon;
                      return (
                        <div key={assignment.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                          {/* Exam info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate text-[15px]">
                              {assignment.exam.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                {assignment.exam.subject}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {assignment.exam.duration} phút
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {assignment.exam.total_questions} câu
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <Badge variant={status.variant} className="shrink-0 gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>

                          {/* Action */}
                          <div className="shrink-0">
                            {assignment.has_submitted ? (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/exam/${assignment.exam_id}/result`}>
                                  <BarChart3 className="w-4 h-4 mr-1.5" />
                                  Kết quả
                                </Link>
                              </Button>
                            ) : status.canTake ? (
                              <Button size="sm" asChild>
                                <Link to={`/exam/${assignment.exam_id}`}>
                                  <Play className="w-4 h-4 mr-1.5" />
                                  Làm bài
                                </Link>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                {status.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentExams;
