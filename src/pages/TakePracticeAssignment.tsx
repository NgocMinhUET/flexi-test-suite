import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeAssignmentWithQuestions, useStartAttempt, useSubmitAttempt } from '@/hooks/usePracticeAssignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Clock, 
  ArrowLeft, 
  Flag, 
  ChevronLeft, 
  ChevronRight,
  Send,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuestionResult, AttemptAnalysis, SkillAnalysis } from '@/types/practiceAssignment';
import { QuestionContentRenderer, OptionContentRenderer } from '@/components/exam/QuestionContentRenderer';

interface Answer {
  questionId: string;
  answer: any;
}

const TakePracticeAssignment = () => {
  const navigate = useNavigate();
  const { id: assignmentId } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: assignmentData, isLoading } = usePracticeAssignmentWithQuestions(assignmentId || '');
  const startAttemptMutation = useStartAttempt();
  const submitAttemptMutation = useSubmitAttempt();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Timer effect
  useEffect(() => {
    if (isStarted && !isSubmitting) {
      timerRef.current = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isStarted, isSubmitting]);

  const questions = useMemo(() => assignmentData?.questionData || [], [assignmentData]);

  const handleStartAttempt = async () => {
    if (!assignmentId) return;
    
    try {
      const result = await startAttemptMutation.mutateAsync(assignmentId);
      setAttemptId(result.id);
      setIsStarted(true);
      startTimeRef.current = Date.now();
    } catch (error) {
      console.error('Failed to start attempt:', error);
    }
  };

  const handleAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, answer);
      return newAnswers;
    });
  }, []);

  const toggleFlag = useCallback(() => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  }, [currentQuestion]);

  const calculateResults = useCallback((): { results: QuestionResult[]; analysis: AttemptAnalysis } => {
    const results: QuestionResult[] = [];
    const taxonomyStats: Record<string, { correct: number; total: number; name: string }> = {};

    questions.forEach((question) => {
      const userAnswer = answers.get(question.id);
      const answerData = question.answer_data as any;
      
      let isCorrect = false;
      let correctAnswer: any = null;
      let pointsEarned = 0;
      const pointsPossible = 1; // Default 1 point per question

      // Grade based on question type
      if (question.question_type === 'MCQ_SINGLE') {
        correctAnswer = answerData?.correctOptionId;
        isCorrect = userAnswer === correctAnswer;
        pointsEarned = isCorrect ? pointsPossible : 0;
      } else if (question.question_type === 'TRUE_FALSE_4') {
        correctAnswer = answerData?.statements?.map((s: any) => s.isTrue);
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          const correctCount = userAnswer.reduce((count, ans, idx) => 
            count + (ans === correctAnswer[idx] ? 1 : 0), 0
          );
          pointsEarned = (correctCount / correctAnswer.length) * pointsPossible;
          isCorrect = correctCount === correctAnswer.length;
        }
      } else if (question.question_type === 'SHORT_ANSWER') {
        correctAnswer = answerData?.acceptedAnswers || [];
        const normalizedAnswer = String(userAnswer || '').trim().toLowerCase();
        isCorrect = correctAnswer.some((a: string) => 
          a.trim().toLowerCase() === normalizedAnswer
        );
        pointsEarned = isCorrect ? pointsPossible : 0;
      }

      // Track taxonomy stats
      if (question.taxonomy_node_id) {
        if (!taxonomyStats[question.taxonomy_node_id]) {
          taxonomyStats[question.taxonomy_node_id] = {
            correct: 0,
            total: 0,
            name: (question.taxonomy_path as any)?.[0]?.name || 'Chưa phân loại',
          };
        }
        taxonomyStats[question.taxonomy_node_id].total++;
        if (isCorrect) {
          taxonomyStats[question.taxonomy_node_id].correct++;
        }
      }

      results.push({
        question_id: question.id,
        is_correct: isCorrect,
        user_answer: userAnswer,
        correct_answer: correctAnswer,
        points_earned: pointsEarned,
        points_possible: pointsPossible,
        taxonomy_node_id: question.taxonomy_node_id || undefined,
      });
    });

    // Build analysis
    const skillAnalyses: SkillAnalysis[] = Object.entries(taxonomyStats).map(([nodeId, stats]) => ({
      taxonomy_node_id: nodeId,
      taxonomy_name: stats.name,
      correct_count: stats.correct,
      total_count: stats.total,
      percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }));

    const strengths = skillAnalyses.filter(s => s.percentage >= 70);
    const weaknesses = skillAnalyses.filter(s => s.percentage < 50);

    const totalCorrect = results.filter(r => r.is_correct).length;
    const percentage = questions.length > 0 ? (totalCorrect / questions.length) * 100 : 0;
    
    let overallPerformance: 'excellent' | 'good' | 'fair' | 'poor';
    if (percentage >= 85) overallPerformance = 'excellent';
    else if (percentage >= 70) overallPerformance = 'good';
    else if (percentage >= 50) overallPerformance = 'fair';
    else overallPerformance = 'poor';

    const avgTimePerQuestion = timeSpent / Math.max(questions.length, 1);
    let timeEfficiency: 'fast' | 'normal' | 'slow';
    if (avgTimePerQuestion < 30) timeEfficiency = 'fast';
    else if (avgTimePerQuestion < 60) timeEfficiency = 'normal';
    else timeEfficiency = 'slow';

    const analysis: AttemptAnalysis = {
      strengths,
      weaknesses,
      suggested_next_topics: weaknesses.map(w => w.taxonomy_name),
      overall_performance: overallPerformance,
      time_efficiency: timeEfficiency,
    };

    return { results, analysis };
  }, [questions, answers, timeSpent]);

  const handleSubmit = async () => {
    if (!attemptId) return;
    
    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      const { results, analysis } = calculateResults();
      const earnedPoints = results.reduce((sum, r) => sum + r.points_earned, 0);
      const totalPoints = results.reduce((sum, r) => sum + r.points_possible, 0);

      await submitAttemptMutation.mutateAsync({
        attemptId,
        answers: Object.fromEntries(answers),
        questionResults: results,
        timeSpentSeconds: timeSpent,
      });

      // Navigate to results
      navigate(`/practice-assignment/${assignmentId}/results`);
    } catch (error) {
      console.error('Failed to submit:', error);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading || isLoading) {
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

  if (!assignmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Không tìm thấy bài luyện tập</h2>
            <Button onClick={() => navigate('/my-practice-assignments')}>
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">{assignmentData.title}</h1>
              {assignmentData.description && (
                <p className="text-muted-foreground">{assignmentData.description}</p>
              )}
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Số câu hỏi</span>
                <span className="font-medium">{questions.length} câu</span>
              </div>
              {assignmentData.duration && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Thời gian</span>
                  <span className="font-medium">{assignmentData.duration} phút</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Xem đáp án sau khi nộp</span>
                <span className="font-medium">
                  {assignmentData.show_answers_after_submit ? 'Có' : 'Không'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Làm nhiều lần</span>
                <span className="font-medium">
                  {assignmentData.allow_multiple_attempts ? 'Có' : 'Không'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/my-practice-assignments')}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <Button 
                onClick={handleStartAttempt}
                disabled={startAttemptMutation.isPending}
                className="flex-1"
              >
                {startAttemptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Bắt đầu làm bài
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = answers.size;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg truncate max-w-[200px] md:max-w-none">
              {assignmentData.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(timeSpent)}</span>
            </div>
            
            <Badge variant="secondary">
              {answeredCount}/{questions.length} đã trả lời
            </Badge>
            
            <Button 
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              Nộp bài
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Main Content */}
      <div className="flex pt-16">
        {/* Question Navigation Sidebar */}
        <div className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r p-4 overflow-y-auto hidden lg:block">
          <h3 className="font-semibold mb-3">Danh sách câu hỏi</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, idx) => {
              const isAnswered = answers.has(questions[idx].id);
              const isFlagged = flaggedQuestions.has(idx);
              const isCurrent = idx === currentQuestion;

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestion(idx)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-all relative",
                    isCurrent 
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                      : isAnswered
                        ? "bg-primary/20 text-primary hover:bg-primary/30"
                        : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {idx + 1}
                  {isFlagged && (
                    <Flag className="absolute -top-1 -right-1 h-3 w-3 text-warning" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Display */}
        <div className="lg:ml-64 flex-1 p-4 md:p-8">
          {currentQ && (
            <Card className="max-w-3xl mx-auto">
              <CardContent className="p-6 md:p-8">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">
                      {currentQuestion + 1}
                    </span>
                    <Badge variant="secondary">
                      {currentQ.question_type === 'MCQ_SINGLE' && 'Trắc nghiệm'}
                      {currentQ.question_type === 'TRUE_FALSE_4' && 'Đúng/Sai'}
                      {currentQ.question_type === 'SHORT_ANSWER' && 'Điền đáp án'}
                    </Badge>
                  </div>
                  <Button
                    variant={flaggedQuestions.has(currentQuestion) ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleFlag}
                    className={cn(
                      flaggedQuestions.has(currentQuestion) && 
                      "bg-warning text-warning-foreground hover:bg-warning/90"
                    )}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    {flaggedQuestions.has(currentQuestion) ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                  </Button>
                </div>

                {/* Question Content with Images */}
                <div className="mb-6">
                  <QuestionContentRenderer
                    content={currentQ.content}
                    media={(currentQ as any).media}
                    className="text-lg"
                  />
                </div>

                {/* Answer Options */}
                <div className="space-y-3">
                  {currentQ.question_type === 'MCQ_SINGLE' && (
                    <>
                      {((currentQ.answer_data as any)?.options || []).map((option: any, idx: number) => (
                        <button
                          key={option.id}
                          onClick={() => handleAnswer(currentQ.id, option.id)}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                            "hover:border-primary/50 hover:bg-primary/5",
                            answers.get(currentQ.id) === option.id
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0",
                              answers.get(currentQ.id) === option.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <div className="flex-1">
                              <OptionContentRenderer 
                                text={option.text || option.content} 
                                imageUrl={option.imageUrl}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {currentQ.question_type === 'TRUE_FALSE_4' && (
                    <div className="space-y-3">
                      {((currentQ.answer_data as any)?.statements || []).map((statement: any, idx: number) => {
                        const currentAnswers = answers.get(currentQ.id) || [];
                        const selectedValue = currentAnswers[idx];

                        return (
                          <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border">
                            <div className="flex-1">
                              <OptionContentRenderer text={statement.text || statement.content} />
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant={selectedValue === true ? 'default' : 'outline'}
                                onClick={() => {
                                  const newAnswers = [...(answers.get(currentQ.id) || [])];
                                  newAnswers[idx] = true;
                                  handleAnswer(currentQ.id, newAnswers);
                                }}
                              >
                                Đúng
                              </Button>
                              <Button
                                size="sm"
                                variant={selectedValue === false ? 'default' : 'outline'}
                                onClick={() => {
                                  const newAnswers = [...(answers.get(currentQ.id) || [])];
                                  newAnswers[idx] = false;
                                  handleAnswer(currentQ.id, newAnswers);
                                }}
                              >
                                Sai
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.question_type === 'SHORT_ANSWER' && (
                    <input
                      type="text"
                      value={answers.get(currentQ.id) || ''}
                      onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                      placeholder="Nhập câu trả lời..."
                      className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Câu trước
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    {currentQuestion + 1} / {questions.length}
                  </span>
                  
                  <Button
                    onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentQuestion === questions.length - 1}
                  >
                    Câu tiếp
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nộp bài luyện tập</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Bạn đã trả lời {answeredCount}/{questions.length} câu hỏi.</p>
              {answeredCount < questions.length && (
                <p className="text-warning">
                  Còn {questions.length - answeredCount} câu chưa trả lời!
                </p>
              )}
              <p>Bạn có chắc muốn nộp bài?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Làm tiếp</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Nộp bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakePracticeAssignment;
