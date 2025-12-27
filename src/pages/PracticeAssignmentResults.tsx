import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeAssignmentWithQuestions, useStudentAssignedPractices } from '@/hooks/usePracticeAssignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  BookOpen,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PracticeAssignmentAttempt } from '@/types/practiceAssignment';

const PracticeAssignmentResults = () => {
  const navigate = useNavigate();
  const { id: assignmentId } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: assignmentData, isLoading: assignmentLoading } = usePracticeAssignmentWithQuestions(assignmentId || '');
  const { data: studentAssignments, isLoading: attemptsLoading } = useStudentAssignedPractices();
  
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(0);

  const assignmentInfo = useMemo(() => {
    return studentAssignments?.find(sa => sa.assignment.id === assignmentId);
  }, [studentAssignments, assignmentId]);

  const attempts = assignmentInfo?.attempts || [];
  const currentAttempt = attempts[selectedAttemptIndex];
  const questions = assignmentData?.questionData || [];

  const isLoading = authLoading || assignmentLoading || attemptsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!assignmentData || !assignmentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Không tìm thấy kết quả</h2>
            <Button onClick={() => navigate('/my-practice-assignments')}>
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Chưa có kết quả</h2>
            <p className="text-muted-foreground mb-4">Bạn chưa làm bài luyện tập này</p>
            <Button onClick={() => navigate(`/practice-assignment/${assignmentId}`)}>
              Bắt đầu làm bài
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-500';
    if (percentage >= 70) return 'text-blue-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceLabel = (performance: string) => {
    switch (performance) {
      case 'excellent': return { label: 'Xuất sắc', color: 'bg-green-500' };
      case 'good': return { label: 'Tốt', color: 'bg-blue-500' };
      case 'fair': return { label: 'Khá', color: 'bg-yellow-500' };
      case 'poor': return { label: 'Cần cải thiện', color: 'bg-red-500' };
      default: return { label: 'Không xác định', color: 'bg-gray-500' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/my-practice-assignments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{assignmentData.title}</h1>
            <p className="text-muted-foreground">Kết quả và phân tích</p>
          </div>
          {assignmentData.allow_multiple_attempts && (
            <Button onClick={() => navigate(`/practice-assignment/${assignmentId}`)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm lại
            </Button>
          )}
        </div>

        {/* Attempt Selector */}
        {attempts.length > 1 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Lần làm bài:</span>
                {attempts.map((attempt, idx) => (
                  <Button
                    key={attempt.id}
                    variant={selectedAttemptIndex === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAttemptIndex(idx)}
                  >
                    Lần {attempt.attempt_number} - {Math.round(attempt.percentage)}%
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {currentAttempt && (
          <>
            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className={cn(
                    "text-4xl font-bold mb-2",
                    getPerformanceColor(currentAttempt.percentage)
                  )}>
                    {Math.round(currentAttempt.percentage)}%
                  </div>
                  <p className="text-muted-foreground">Điểm số</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center gap-4 mb-2">
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-2xl font-bold">
                        {currentAttempt.question_results.filter(r => r.is_correct).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-5 w-5" />
                      <span className="text-2xl font-bold">
                        {currentAttempt.question_results.filter(r => !r.is_correct).length}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">Đúng / Sai</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {Math.floor(currentAttempt.time_spent_seconds / 60)}:{(currentAttempt.time_spent_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-muted-foreground">Thời gian làm bài</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  {currentAttempt.analysis && (
                    <>
                      <Badge className={cn(
                        "text-lg px-3 py-1 mb-2",
                        getPerformanceLabel(currentAttempt.analysis.overall_performance).color
                      )}>
                        {getPerformanceLabel(currentAttempt.analysis.overall_performance).label}
                      </Badge>
                      <p className="text-muted-foreground">Đánh giá chung</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="analysis" className="space-y-6">
              <TabsList>
                <TabsTrigger value="analysis">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Phân tích
                </TabsTrigger>
                <TabsTrigger value="questions">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Chi tiết câu hỏi
                </TabsTrigger>
                <TabsTrigger value="suggestions">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Gợi ý
                </TabsTrigger>
              </TabsList>

              {/* Analysis Tab */}
              <TabsContent value="analysis">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="h-5 w-5" />
                        Điểm mạnh
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentAttempt.analysis?.strengths && currentAttempt.analysis.strengths.length > 0 ? (
                        <div className="space-y-4">
                          {currentAttempt.analysis.strengths.map((skill, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{skill.taxonomy_name}</span>
                                <span className="font-semibold text-green-600">
                                  {Math.round(skill.percentage)}%
                                </span>
                              </div>
                              <Progress value={skill.percentage} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {skill.correct_count}/{skill.total_count} câu đúng
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Chưa có dữ liệu điểm mạnh
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Weaknesses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <TrendingDown className="h-5 w-5" />
                        Điểm yếu cần cải thiện
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentAttempt.analysis?.weaknesses && currentAttempt.analysis.weaknesses.length > 0 ? (
                        <div className="space-y-4">
                          {currentAttempt.analysis.weaknesses.map((skill, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{skill.taxonomy_name}</span>
                                <span className="font-semibold text-red-600">
                                  {Math.round(skill.percentage)}%
                                </span>
                              </div>
                              <Progress value={skill.percentage} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {skill.correct_count}/{skill.total_count} câu đúng
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Không có điểm yếu đáng kể
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Questions Detail Tab */}
              <TabsContent value="questions">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {currentAttempt.question_results.map((result, idx) => {
                        const question = questions.find(q => q.id === result.question_id);
                        if (!question) return null;

                        return (
                          <div 
                            key={idx}
                            className={cn(
                              "p-4 rounded-lg border-l-4",
                              result.is_correct 
                                ? "bg-green-50 dark:bg-green-950/20 border-green-500" 
                                : "bg-red-50 dark:bg-red-950/20 border-red-500"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">Câu {idx + 1}</Badge>
                                  {result.is_correct ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-500" />
                                  )}
                                </div>
                                <div 
                                  className="prose dark:prose-invert prose-sm max-w-none mb-3"
                                  dangerouslySetInnerHTML={{ __html: question.content }}
                                />
                                
                                {assignmentData.show_answers_after_submit && (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-start gap-2">
                                      <span className="font-medium min-w-[100px]">Bạn đã chọn:</span>
                                      <span className={result.is_correct ? 'text-green-600' : 'text-red-600'}>
                                        {formatAnswer(result.user_answer, question)}
                                      </span>
                                    </div>
                                    {!result.is_correct && (
                                      <div className="flex items-start gap-2">
                                        <span className="font-medium min-w-[100px]">Đáp án đúng:</span>
                                        <span className="text-green-600">
                                          {formatAnswer(result.correct_answer, question)}
                                        </span>
                                      </div>
                                    )}
                                    {question.explanation && (
                                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                                          Giải thích:
                                        </p>
                                        <p className="text-muted-foreground">{question.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Suggestions Tab */}
              <TabsContent value="suggestions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Gợi ý luyện tập tiếp theo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentAttempt.analysis?.suggested_next_topics && 
                     currentAttempt.analysis.suggested_next_topics.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-muted-foreground">
                          Dựa trên kết quả của bạn, chúng tôi gợi ý bạn nên ôn tập thêm các chủ đề sau:
                        </p>
                        <div className="grid gap-3">
                          {currentAttempt.analysis.suggested_next_topics.map((topic, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary font-semibold">{idx + 1}</span>
                              </div>
                              <span className="font-medium">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <p className="text-lg font-medium mb-2">Tuyệt vời!</p>
                        <p className="text-muted-foreground">
                          Bạn đã làm tốt. Hãy tiếp tục duy trì phong độ này!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to format answers for display
function formatAnswer(answer: any, question: any): string {
  if (!answer) return 'Chưa trả lời';

  if (question.question_type === 'MCQ_SINGLE') {
    const option = (question.answer_data as any)?.options?.find((o: any) => o.id === answer);
    return option ? option.text.replace(/<[^>]*>/g, '') : answer;
  }

  if (question.question_type === 'TRUE_FALSE_4') {
    if (Array.isArray(answer)) {
      return answer.map((a, i) => `(${i + 1}) ${a ? 'Đ' : 'S'}`).join(', ');
    }
  }

  return String(answer);
}

export default PracticeAssignmentResults;
