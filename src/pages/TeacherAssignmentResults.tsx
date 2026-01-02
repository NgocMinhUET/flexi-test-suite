import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeAssignmentWithQuestions, useAssignmentAttempts } from '@/hooks/usePracticeAssignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Code2,
  LogOut,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { QuestionContentRenderer } from '@/components/exam/QuestionContentRenderer';

interface AttemptWithProfile {
  id: string;
  assignment_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  answers: Record<string, any>;
  question_results: any[];
  earned_points: number;
  total_points: number;
  percentage: number;
  time_spent_seconds: number;
  analysis: any;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export default function TeacherAssignmentResults() {
  const navigate = useNavigate();
  const { id: assignmentId } = useParams<{ id: string }>();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  
  const { data: assignmentData, isLoading: assignmentLoading } = usePracticeAssignmentWithQuestions(assignmentId || '');
  const { data: attempts, isLoading: attemptsLoading } = useAssignmentAttempts(assignmentId || '');
  
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isLoading = authLoading || assignmentLoading || attemptsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isTeacher)) {
    navigate('/auth');
    return null;
  }

  if (!assignmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Không tìm thấy bài luyện tập</h2>
            <Button onClick={() => navigate('/practice-assignments')}>
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typedAttempts = (attempts || []) as unknown as AttemptWithProfile[];
  
  // Calculate statistics
  const uniqueStudents = new Set(typedAttempts.map(a => a.student_id)).size;
  const totalAttempts = typedAttempts.length;
  const avgPercentage = totalAttempts > 0
    ? typedAttempts.reduce((sum, a) => sum + Number(a.percentage), 0) / totalAttempts 
    : 0;
  const avgTimeSeconds = totalAttempts > 0
    ? typedAttempts.reduce((sum, a) => sum + a.time_spent_seconds, 0) / totalAttempts
    : 0;

  // Best attempt per student
  const bestAttemptsByStudent = typedAttempts.reduce((acc, attempt) => {
    const existing = acc.get(attempt.student_id);
    if (!existing || Number(attempt.percentage) > Number(existing.percentage)) {
      acc.set(attempt.student_id, attempt);
    }
    return acc;
  }, new Map<string, AttemptWithProfile>());

  const questions = assignmentData?.questionData || [];

  // Question-level statistics
  const questionStats = questions.map((q, idx) => {
    const results = typedAttempts
      .flatMap(a => a.question_results || [])
      .filter((r: any) => r.question_id === q.id);
    
    const total = results.length;
    const correct = results.filter((r: any) => r.is_correct).length;
    
    return {
      questionId: q.id,
      questionNumber: idx + 1,
      totalAttempts: total,
      correctCount: correct,
      correctRate: total > 0 ? (correct / total) * 100 : 0,
    };
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/practice-assignments" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Quản lý bài luyện tập
          </Link>
          <span>/</span>
          <span className="text-foreground">Kết quả: {assignmentData.title}</span>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{assignmentData.title}</h1>
          <p className="text-muted-foreground">Xem kết quả làm bài của tất cả học sinh</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueStudents}</p>
                <p className="text-sm text-muted-foreground">Học sinh đã làm</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAttempts}</p>
                <p className="text-sm text-muted-foreground">Lượt làm bài</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgPercentage.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Điểm trung bình</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTime(avgTimeSeconds)}</p>
                <p className="text-sm text-muted-foreground">Thời gian TB</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Results Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Kết quả theo học sinh</CardTitle>
                <CardDescription>Hiển thị kết quả tốt nhất của mỗi học sinh</CardDescription>
              </CardHeader>
              <CardContent>
                {bestAttemptsByStudent.size > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Học sinh</TableHead>
                        <TableHead className="text-center">Lượt làm</TableHead>
                        <TableHead className="text-center">Điểm cao nhất</TableHead>
                        <TableHead className="text-center">Thời gian</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(bestAttemptsByStudent.values())
                        .sort((a, b) => Number(b.percentage) - Number(a.percentage))
                        .map((attempt) => {
                          const studentAttempts = typedAttempts.filter(a => a.student_id === attempt.student_id);
                          return (
                            <TableRow key={attempt.student_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{attempt.profiles?.full_name || 'N/A'}</p>
                                  <p className="text-xs text-muted-foreground">{attempt.profiles?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{studentAttempts.length}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={getScoreBadgeVariant(Number(attempt.percentage))}>
                                  {Number(attempt.percentage).toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {formatTime(attempt.time_spent_seconds)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAttempt(attempt);
                                    setDetailsOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Chưa có học sinh làm bài</h3>
                    <p className="text-muted-foreground">
                      Kết quả sẽ hiển thị khi học sinh nộp bài
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Question Statistics */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Thống kê theo câu hỏi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questionStats.length > 0 ? (
                  questionStats.map((stat) => (
                    <div key={stat.questionId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Câu {stat.questionNumber}</span>
                        <span className="text-muted-foreground">
                          {stat.correctCount}/{stat.totalAttempts} đúng
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={stat.correctRate} 
                          className="h-2 flex-1"
                        />
                        <span className={`text-xs font-medium w-12 text-right ${
                          stat.correctRate >= 70 ? 'text-green-500' : 
                          stat.correctRate >= 50 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {stat.correctRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa có dữ liệu thống kê
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Attempts Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tất cả lượt làm bài</CardTitle>
            <CardDescription>Danh sách chi tiết tất cả các lần làm bài</CardDescription>
          </CardHeader>
          <CardContent>
            {typedAttempts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học sinh</TableHead>
                    <TableHead className="text-center">Lần thứ</TableHead>
                    <TableHead className="text-center">Điểm</TableHead>
                    <TableHead className="text-center">Đúng/Tổng</TableHead>
                    <TableHead className="text-center">Thời gian</TableHead>
                    <TableHead>Nộp lúc</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedAttempts.map((attempt) => {
                    const results = attempt.question_results || [];
                    const correctCount = results.filter((r: any) => r.is_correct).length;
                    return (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{attempt.profiles?.full_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{attempt.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">#{attempt.attempt_number}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getScoreBadgeVariant(Number(attempt.percentage))}>
                            {Number(attempt.percentage).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {correctCount}/{results.length}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatTime(attempt.time_spent_seconds)}
                        </TableCell>
                        <TableCell>
                          {attempt.completed_at 
                            ? format(new Date(attempt.completed_at), 'dd/MM/yyyy HH:mm', { locale: vi })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAttempt(attempt);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Chưa có lượt làm bài nào</h3>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Attempt Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết bài làm - {selectedAttempt?.profiles?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAttempt && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {Number(selectedAttempt.percentage).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Điểm số</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">
                      {(selectedAttempt.question_results || []).filter((r: any) => r.is_correct).length}/
                      {(selectedAttempt.question_results || []).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Câu đúng</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{formatTime(selectedAttempt.time_spent_seconds)}</p>
                    <p className="text-sm text-muted-foreground">Thời gian</p>
                  </CardContent>
                </Card>
              </div>

              {/* Question Results */}
              <div className="space-y-4">
                <h3 className="font-semibold">Chi tiết từng câu</h3>
                {(selectedAttempt.question_results || []).map((result: any, idx: number) => {
                  const question = questions.find(q => q.id === result.question_id);
                  if (!question) return null;
                  
                  return (
                    <Card key={result.question_id} className={`border-l-4 ${result.is_correct ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline">Câu {idx + 1}</Badge>
                          <Badge variant={result.is_correct ? 'default' : 'destructive'}>
                            {result.is_correct ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Đúng</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Sai</>
                            )}
                          </Badge>
                        </div>
                        <div className="prose prose-sm max-w-none mb-3">
                          <QuestionContentRenderer content={question.content} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Đáp án của học sinh:</p>
                            <p className="font-medium">{JSON.stringify(result.user_answer)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Đáp án đúng:</p>
                            <p className="font-medium text-green-600">{JSON.stringify(result.correct_answer)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
