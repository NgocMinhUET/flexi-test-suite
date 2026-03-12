import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface PendingRegistration {
  id: string;
  contest_id: string;
  contest_name: string;
  organization_name: string;
  payment_status: string;
  payment_amount: number;
  currency: string;
  registered_at: string;
  contest_start_time?: string | null;
  contest_end_time?: string | null;
  contest_subject?: string;
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
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
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
        .select('contest_id, organization_id, payment_status, payment_amount, currency, registered_at')
        .eq('user_id', user.id);

      const orgIds = [...new Set((registrations || []).map(r => r.organization_id))];
      let orgMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
        (orgs || []).forEach(o => { orgMap[o.id] = o.name; });
      }
      const contestOrgMap: Record<string, string> = {};
      (registrations || []).forEach(r => { contestOrgMap[r.contest_id] = orgMap[r.organization_id] || ''; });

      // Fetch pending/failed registrations (not yet approved)
      const pendingRegs = (registrations || []).filter(r => r.payment_status === 'pending' || r.payment_status === 'failed');
      if (pendingRegs.length > 0) {
        const pendingContestIds = pendingRegs.map(r => r.contest_id);
        const { data: pendingContests } = await supabase
          .from('contests')
          .select('id, name, subject, start_time, end_time')
          .in('id', pendingContestIds);
        const contestInfoMap: Record<string, any> = {};
        (pendingContests || []).forEach(c => { contestInfoMap[c.id] = c; });

        setPendingRegistrations(pendingRegs.map(r => ({
          id: r.contest_id,
          contest_id: r.contest_id,
          contest_name: contestInfoMap[r.contest_id]?.name || 'Cuộc thi',
          organization_name: contestOrgMap[r.contest_id] || '',
          payment_status: r.payment_status,
          payment_amount: Number(r.payment_amount),
          currency: r.currency,
          registered_at: r.registered_at,
          contest_start_time: contestInfoMap[r.contest_id]?.start_time,
          contest_end_time: contestInfoMap[r.contest_id]?.end_time,
          contest_subject: contestInfoMap[r.contest_id]?.subject,
        })));
      } else {
        setPendingRegistrations([]);
      }

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
    if (assignment.has_submitted) return { label: 'Đã nộp', variant: 'default' as const, canTake: false, icon: CheckCircle, color: 'text-success' };
    const now = new Date();
    if (assignment.start_time && new Date(assignment.start_time) > now) return { label: 'Chưa mở', variant: 'secondary' as const, canTake: false, icon: Clock, color: 'text-muted-foreground' };
    if (assignment.end_time && new Date(assignment.end_time) < now) return { label: 'Hết hạn', variant: 'destructive' as const, canTake: false, icon: AlertCircle, color: 'text-destructive' };
    return { label: 'Sẵn sàng', variant: 'outline' as const, canTake: true, icon: Play, color: 'text-primary' };
  };

  const groupedExams = useMemo(() => {
    const groups: ExamGroup[] = [];
    const directExams = assignments.filter(a => !a.contest_name);
    const contestMap = new Map<string, AssignedExam[]>();

    assignments.filter(a => a.contest_name).forEach(a => {
      const key = `${a.contest_name}||${a.organization_name || ''}`;
      if (!contestMap.has(key)) contestMap.set(key, []);
      contestMap.get(key)!.push(a);
    });

    contestMap.forEach((exams, key) => {
      const [contestName, orgName] = key.split('||');
      groups.push({ groupKey: key, contestName, organizationName: orgName || null, exams });
    });

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">
                Exam<span className="text-primary">Pro</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to="/profile"><User className="w-4 h-4" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats row */}
        <div className="flex items-center gap-6 mb-1">
          <h1 className="text-xl font-bold text-foreground">Bài thi của tôi</h1>
          <div className="flex items-center gap-4 ml-auto text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.completed}</span>/{stats.total} hoàn thành
            </span>
            {stats.ready > 0 && (
              <span className="text-primary font-medium">{stats.ready} chờ làm</span>
            )}
          </div>
        </div>
        
        {stats.total > 0 && (
          <Progress value={stats.progress} className="h-1.5 mb-6" />
        )}

        {/* Pending registrations */}
        {pendingRegistrations.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              Đang chờ duyệt
            </h2>
            {pendingRegistrations.map((reg) => (
              <div key={reg.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-accent shrink-0" />
                      <span className="font-medium text-sm text-foreground truncate">{reg.contest_name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {reg.organization_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {reg.organization_name}
                        </span>
                      )}
                      {reg.contest_subject && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {reg.contest_subject}
                        </span>
                      )}
                      {reg.contest_start_time && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          {format(new Date(reg.contest_start_time), 'dd/MM/yyyy', { locale: vi })}
                          {reg.contest_end_time && <> — {format(new Date(reg.contest_end_time), 'dd/MM/yyyy', { locale: vi })}</>}
                        </span>
                      )}
                      <span>
                        Đăng ký: {format(new Date(reg.registered_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </span>
                    </div>
                  </div>
                  <Badge variant={reg.payment_status === 'pending' ? 'secondary' : 'destructive'} className="shrink-0">
                    {reg.payment_status === 'pending' ? 'Chờ thanh toán' : 'Bị từ chối'}
                  </Badge>
                </div>
                {reg.payment_status === 'pending' && reg.payment_amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    Lệ phí: <span className="font-medium text-foreground">{reg.payment_amount.toLocaleString('vi-VN')} {reg.currency}</span> · Vui lòng chuyển khoản và chờ admin xác nhận
                  </p>
                )}
                {reg.payment_status === 'pending' && reg.payment_amount === 0 && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    Miễn phí · Đang chờ admin duyệt đăng ký
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {assignments.length === 0 && pendingRegistrations.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Bạn chưa được gán bài thi nào</p>
          </div>
        ) : assignments.length > 0 ? (
          <div className="space-y-5">
            {groupedExams.map((group) => (
              <section key={group.groupKey}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2.5">
                  {group.contestName ? (
                    <Trophy className="w-4 h-4 text-accent" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-primary" />
                  )}
                  <h2 className="text-sm font-semibold text-foreground">
                    {group.contestName || 'Bài thi trực tiếp'}
                  </h2>
                  {group.organizationName && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {group.organizationName}
                      </span>
                    </>
                  )}
                  {group.contestName && group.exams[0]?.start_time && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        {format(new Date(group.exams[0].start_time), 'dd/MM/yyyy', { locale: vi })}
                        {group.exams[0].end_time && <> — {format(new Date(group.exams[0].end_time), 'dd/MM/yyyy', { locale: vi })}</>}
                      </span>
                    </>
                  )}
                </div>

                {/* Exam table */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Tên đề thi</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Môn</th>
                        <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-20">Thời gian</th>
                        <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-16">Câu hỏi</th>
                        <th className="text-center text-xs font-medium text-muted-foreground px-3 py-2 w-24">Trạng thái</th>
                        <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.exams.map((assignment) => {
                        const status = getExamStatus(assignment);
                        const StatusIcon = status.icon;
                        return (
                          <tr key={assignment.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-sm text-foreground leading-tight line-clamp-1">
                                {assignment.exam.title}
                              </p>
                            </td>
                            <td className="px-3 py-3 hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">{assignment.exam.subject}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs text-muted-foreground">{assignment.exam.duration}′</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs text-muted-foreground">{assignment.exam.total_questions}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${status.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {assignment.has_submitted ? (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                  <Link to={`/exam/${assignment.exam_id}/result`}>
                                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                                    Kết quả
                                  </Link>
                                </Button>
                              ) : status.canTake ? (
                                <Button size="sm" className="h-7 text-xs" asChild>
                                  <Link to={`/exam/${assignment.exam_id}`}>
                                    <Play className="w-3.5 h-3.5 mr-1" />
                                    Làm bài
                                  </Link>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">{status.label}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default StudentExams;
