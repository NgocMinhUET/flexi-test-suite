import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Home,
  FileText,
  Code2,
  MessageSquare,
  List,
  Loader2,
  ArrowLeft,
  Star,
  AlertTriangle,
  MonitorOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ExamResult, QuestionResult, QuestionType, Question, CodingGradingResult, ViolationStats } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CodingResultsDisplay from '@/components/exam/CodingResultsDisplay';

const gradeColors: Record<string, string> = {
  'A+': 'text-success',
  'A': 'text-success',
  'B+': 'text-primary',
  'B': 'text-primary',
  'C+': 'text-warning',
  'C': 'text-warning',
  'D': 'text-orange-500',
  'F': 'text-destructive',
};

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  'multiple-choice': <List className="w-4 h-4" />,
  'short-answer': <MessageSquare className="w-4 h-4" />,
  'essay': <FileText className="w-4 h-4" />,
  'drag-drop': <Target className="w-4 h-4" />,
  'coding': <Code2 className="w-4 h-4" />,
};

const questionTypeLabels: Record<QuestionType, string> = {
  'multiple-choice': 'Trắc nghiệm',
  'short-answer': 'Tự luận ngắn',
  'essay': 'Tự luận',
  'drag-drop': 'Kéo thả',
  'coding': 'Lập trình',
};

interface LocationState {
  result: ExamResult;
  questions: Question[];
}

const ExamResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: examId, resultId } = useParams<{ id?: string; resultId?: string }>();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if we have state from navigation
  const state = location.state as LocationState | null;

  useEffect(() => {
    // If we have state from navigation, use it
    if (state?.result && state?.questions) {
      setResult(state.result);
      setQuestions(state.questions);
      return;
    }

    // Otherwise, fetch from database
    if (!authLoading && user) {
      if (resultId) {
        // Fetch by result ID (for teachers viewing student results)
        fetchResultById();
      } else if (examId) {
        // Fetch by exam ID (for students viewing their own result)
        fetchResultFromDatabase();
      }
    } else if (!authLoading && !user) {
      setError('Vui lòng đăng nhập để xem kết quả');
    }
  }, [state, authLoading, user, examId, resultId]);

  const fetchResultById = async () => {
    if (!user || !resultId) return;

    setIsLoading(true);
    try {
      // Fetch exam result by ID
      const { data: resultData, error: resultError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('id', resultId)
        .maybeSingle();

      if (resultError) throw resultError;

      if (!resultData) {
        setError('Không tìm thấy kết quả thi');
        return;
      }

      // Fetch exam data for questions
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', resultData.exam_id)
        .maybeSingle();

      if (examError) throw examError;

      if (!examData) {
        setError('Không tìm thấy đề thi');
        return;
      }

      // Parse and set data
      const examQuestions = (examData.questions as unknown as Question[]) || [];
      setQuestions(examQuestions);

      const examResult: ExamResult = {
        examId: examData.id,
        examTitle: examData.title,
        subject: examData.subject,
        submittedAt: new Date(resultData.submitted_at),
        duration: resultData.duration || 0,
        totalPoints: Number(resultData.total_points),
        earnedPoints: Number(resultData.earned_points),
        percentage: Number(resultData.percentage),
        grade: resultData.grade || 'F',
        questionResults: (resultData.question_results as unknown as QuestionResult[]) || [],
        violationStats: (resultData.statistics as unknown as { violationStats?: ViolationStats })?.violationStats,
        statistics: (resultData.statistics as unknown as ExamResult['statistics']) || {
          totalQuestions: examData.total_questions,
          correctAnswers: 0,
          incorrectAnswers: 0,
          unanswered: 0,
          partialCredit: 0,
          byType: {
            'multiple-choice': { correct: 0, total: 0, points: 0, partial: 0 },
            'short-answer': { correct: 0, total: 0, points: 0, partial: 0 },
            'essay': { correct: 0, total: 0, points: 0, partial: 0 },
            'drag-drop': { correct: 0, total: 0, points: 0, partial: 0 },
            'coding': { correct: 0, total: 0, points: 0, partial: 0 },
          },
        },
      };

      setResult(examResult);
    } catch (err) {
      console.error('Error fetching result:', err);
      setError('Lỗi khi tải kết quả');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResultFromDatabase = async () => {
    if (!user || !examId) return;

    setIsLoading(true);
    try {
      // Fetch exam result
      const { data: resultData, error: resultError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resultError) throw resultError;

      if (!resultData) {
        setError('Không tìm thấy kết quả thi');
        return;
      }

      // Fetch exam data for questions
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (examError) throw examError;

      if (!examData) {
        setError('Không tìm thấy đề thi');
        return;
      }

      // Parse and set data
      const examQuestions = (examData.questions as unknown as Question[]) || [];
      setQuestions(examQuestions);

      const examResult: ExamResult = {
        examId: examData.id,
        examTitle: examData.title,
        subject: examData.subject,
        submittedAt: new Date(resultData.submitted_at),
        duration: resultData.duration || 0,
        totalPoints: Number(resultData.total_points),
        earnedPoints: Number(resultData.earned_points),
        percentage: Number(resultData.percentage),
        grade: resultData.grade || 'F',
        questionResults: (resultData.question_results as unknown as QuestionResult[]) || [],
        violationStats: (resultData.statistics as unknown as { violationStats?: ViolationStats })?.violationStats,
        statistics: (resultData.statistics as unknown as ExamResult['statistics']) || {
          totalQuestions: examData.total_questions,
          correctAnswers: 0,
          incorrectAnswers: 0,
          unanswered: 0,
          partialCredit: 0,
          byType: {
            'multiple-choice': { correct: 0, total: 0, points: 0, partial: 0 },
            'short-answer': { correct: 0, total: 0, points: 0, partial: 0 },
            'essay': { correct: 0, total: 0, points: 0, partial: 0 },
            'drag-drop': { correct: 0, total: 0, points: 0, partial: 0 },
            'coding': { correct: 0, total: 0, points: 0, partial: 0 },
          },
        },
      };

      setResult(examResult);
    } catch (err) {
      console.error('Error fetching result:', err);
      setError('Lỗi khi tải kết quả');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestion = (questionId: number) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getQuestion = (questionId: number) => {
    return questions.find((q) => q.id === questionId);
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {error || 'Không tìm thấy kết quả'}
          </h1>
          <p className="text-muted-foreground mb-6">
            Vui lòng kiểm tra lại hoặc liên hệ giáo viên.
          </p>
          <Button onClick={() => navigate('/my-exams')} variant="hero">
            Về danh sách bài thi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/my-exams')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{result.examTitle}</h1>
                <p className="text-sm text-muted-foreground">{result.subject}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Score Overview */}
        <Card className="p-8 mb-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Main Score */}
            <div className="md:col-span-1 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className={cn(
                  "text-7xl font-bold",
                  gradeColors[result.grade] || 'text-foreground'
                )}>
                  {result.grade}
                </div>
                <Trophy className={cn(
                  "absolute -top-2 -right-4 w-8 h-8",
                  result.percentage >= 80 ? 'text-warning' : 'text-muted-foreground/30'
                )} />
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground">
                {result.earnedPoints}/{result.totalPoints}
              </div>
              <div className="text-sm text-muted-foreground">điểm</div>
            </div>

            {/* Progress & Stats */}
            <div className="md:col-span-3 space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Tỷ lệ hoàn thành</span>
                  <span className="text-sm font-bold text-primary">{result.percentage.toFixed(1)}%</span>
                </div>
                <Progress value={result.percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-success/10 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                  <div className="text-2xl font-bold text-success">{result.statistics.correctAnswers}</div>
                  <div className="text-xs text-muted-foreground">Đúng</div>
                </div>
                {(result.statistics.partialCredit || 0) > 0 && (
                  <div className="text-center p-4 bg-warning/10 rounded-xl">
                    <Star className="w-6 h-6 text-warning mx-auto mb-2" />
                    <div className="text-2xl font-bold text-warning">{result.statistics.partialCredit}</div>
                    <div className="text-xs text-muted-foreground">Một phần</div>
                  </div>
                )}
                <div className="text-center p-4 bg-destructive/10 rounded-xl">
                  <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                  <div className="text-2xl font-bold text-destructive">{result.statistics.incorrectAnswers}</div>
                  <div className="text-xs text-muted-foreground">Sai</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-xl">
                  <MinusCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <div className="text-2xl font-bold text-muted-foreground">{result.statistics.unanswered}</div>
                  <div className="text-xs text-muted-foreground">Bỏ qua</div>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-xl">
                  <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">{result.duration}</div>
                  <div className="text-xs text-muted-foreground">phút</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Violation Stats */}
        {result.violationStats && (result.violationStats.tabSwitchCount > 0 || result.violationStats.fullscreenExitCount > 0) && (
          <Card className="p-6 mb-8 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Thống kê vi phạm</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-destructive/10 rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <MonitorOff className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">
                    {result.violationStats.fullscreenExitCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Lần thoát toàn màn hình</div>
                </div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">
                    {result.violationStats.tabSwitchCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Lần chuyển tab</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Stats by Type */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Thống kê theo loại câu hỏi</h2>
          <div className="grid md:grid-cols-5 gap-4">
            {(Object.entries(result.statistics.byType) as [QuestionType, { correct: number; total: number; points: number; partial?: number }][])
              .filter(([, stats]) => stats.total > 0)
              .map(([type, stats]) => (
                <div key={type} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    {questionTypeIcons[type]}
                    <span className="text-sm font-medium text-foreground">{questionTypeLabels[type]}</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {stats.correct}{stats.partial ? <span className="text-warning">+{stats.partial}</span> : ''}/{stats.total}
                  </div>
                  <div className="text-xs text-muted-foreground">{Number(stats.points).toFixed(1)} điểm</div>
                </div>
              ))}
          </div>
        </Card>

        {/* Question Review */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Chi tiết từng câu hỏi</h2>
          <div className="space-y-4">
            {result.questionResults.map((qResult, index) => {
              const question = getQuestion(qResult.questionId);
              if (!question) return null;

              const isExpanded = expandedQuestions.has(qResult.questionId);

              return (
                <div
                  key={qResult.questionId}
                  className={cn(
                    "border rounded-xl overflow-hidden transition-colors",
                    qResult.isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  {/* Question Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20"
                    onClick={() => toggleQuestion(qResult.questionId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        qResult.isCorrect 
                          ? "bg-success text-success-foreground" 
                          : "bg-destructive text-destructive-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            {questionTypeIcons[question.type]}
                            {questionTypeLabels[question.type]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {qResult.earnedPoints}/{qResult.maxPoints} điểm
                          </span>
                        </div>
                        <p 
                          className="text-sm text-foreground mt-1 line-clamp-1"
                          dangerouslySetInnerHTML={{ __html: question.content.substring(0, 100) + '...' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {qResult.isCorrect ? (
                        <Badge variant="success">Đúng</Badge>
                      ) : (
                        <Badge variant="destructive">Sai</Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <Separator />
                      
                      {/* Question Content */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Nội dung câu hỏi</h4>
                        <div 
                          className="text-foreground prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: question.content }}
                        />
                      </div>

                      {/* Options for multiple choice */}
                      {question.type === 'multiple-choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((opt) => {
                            const isUserAnswer = qResult.userAnswer === opt.id;
                            const isCorrectAnswer = qResult.correctAnswer === opt.id;

                            return (
                              <div
                                key={opt.id}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  isCorrectAnswer && "border-success bg-success/10",
                                  isUserAnswer && !isCorrectAnswer && "border-destructive bg-destructive/10",
                                  !isUserAnswer && !isCorrectAnswer && "border-border bg-muted/30"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{opt.id.toUpperCase()}.</span>
                                  <span>{opt.text}</span>
                                  {isCorrectAnswer && (
                                    <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                                  )}
                                  {isUserAnswer && !isCorrectAnswer && (
                                    <XCircle className="w-4 h-4 text-destructive ml-auto" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Text answers */}
                      {(question.type === 'short-answer' || question.type === 'essay') && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Câu trả lời của bạn</h4>
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                              <p className="text-foreground whitespace-pre-wrap">
                                {qResult.userAnswer || '(Không trả lời)'}
                              </p>
                            </div>
                          </div>
                          {qResult.correctAnswer && (
                            <div>
                              <h4 className="text-sm font-medium text-success mb-2">Đáp án đúng</h4>
                              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                                <p className="text-foreground whitespace-pre-wrap">{qResult.correctAnswer}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coding results - Enhanced display */}
                      {question.type === 'coding' && qResult.codingResults && (
                        <CodingResultsDisplay 
                          codingResults={qResult.codingResults}
                          userAnswer={qResult.userAnswer as string}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ExamResultPage;
