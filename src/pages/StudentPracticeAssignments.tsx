import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStudentPracticeAssignments } from '@/hooks/usePracticeAssignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  BarChart3,
  Trophy,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const StudentPracticeAssignments = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: assignments, isLoading, refetch } = useStudentPracticeAssignments();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bài luyện tập được giao</h1>
              <p className="text-muted-foreground mt-1">
                Hoàn thành các bài luyện tập để nâng cao kỹ năng
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng bài được giao</p>
                <p className="text-2xl font-bold">{assignments?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
                <p className="text-2xl font-bold">
                  {assignments?.filter(a => a.attempts.some(att => att.completed_at)).length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chưa làm</p>
                <p className="text-2xl font-bold">
                  {assignments?.filter(a => a.attempts.length === 0).length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Điểm TB cao nhất</p>
                <p className="text-2xl font-bold">
                  {assignments && assignments.length > 0
                    ? Math.round(
                        assignments
                          .filter(a => a.best_percentage !== null)
                          .reduce((sum, a) => sum + (a.best_percentage || 0), 0) /
                        Math.max(assignments.filter(a => a.best_percentage !== null).length, 1)
                      )
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assignments && assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((item) => {
              const { assignment, attempts, best_percentage, last_attempt_at } = item;
              const hasAttempts = attempts.length > 0;
              const isCompleted = attempts.some(a => a.completed_at);
              const canRetry = assignment.allow_multiple_attempts || !isCompleted;

              return (
                <Card 
                  key={item.id} 
                  className="hover:shadow-lg transition-shadow border-l-4"
                  style={{
                    borderLeftColor: isCompleted 
                      ? 'hsl(var(--success))' 
                      : hasAttempts 
                        ? 'hsl(var(--warning))' 
                        : 'hsl(var(--primary))'
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {assignment.title}
                          </h3>
                          {assignment.subjects && (
                            <Badge variant="secondary">
                              {assignment.subjects.name}
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Đã hoàn thành
                            </Badge>
                          )}
                        </div>
                        
                        {assignment.description && (
                          <p className="text-muted-foreground mb-3 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {assignment.questions.length} câu hỏi
                          </span>
                          {assignment.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {assignment.duration} phút
                            </span>
                          )}
                          <span>
                            Giao lúc: {format(new Date(item.assigned_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </span>
                          {hasAttempts && (
                            <span>
                              Đã làm: {attempts.length} lần
                            </span>
                          )}
                        </div>

                        {best_percentage !== null && (
                          <div className="mt-3 max-w-md">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Điểm cao nhất</span>
                              <span className="font-semibold">{Math.round(best_percentage)}%</span>
                            </div>
                            <Progress value={best_percentage} className="h-2" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 min-w-[160px]">
                        {canRetry && (
                          <Button 
                            onClick={() => navigate(`/practice-assignment/${assignment.id}`)}
                            className="gap-2"
                          >
                            <PlayCircle className="h-4 w-4" />
                            {hasAttempts ? 'Làm lại' : 'Bắt đầu làm'}
                          </Button>
                        )}
                        
                        {isCompleted && assignment.show_answers_after_submit && (
                          <Button 
                            variant="outline"
                            onClick={() => navigate(`/practice-assignment/${assignment.id}/results`)}
                            className="gap-2"
                          >
                            <BarChart3 className="h-4 w-4" />
                            Xem kết quả
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Chưa có bài luyện tập nào
              </h3>
              <p className="text-muted-foreground">
                Giáo viên chưa giao bài luyện tập cho bạn. Hãy quay lại sau!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentPracticeAssignments;
