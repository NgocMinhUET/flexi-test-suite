import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { QuestionNavigation } from '@/components/exam/QuestionNavigation';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExamData, Question, Answer, QuestionStatus, ExamResult, QuestionResult, QuestionType } from '@/types/exam';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TakeExam = () => {
  const navigate = useNavigate();
  const { id: examId } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  
  const [exam, setExam] = useState<ExamData | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) {
        setError('Không tìm thấy ID bài thi');
        setIsLoadingExam(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .eq('is_published', true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Bài thi không tồn tại hoặc chưa được công khai');
          setIsLoadingExam(false);
          return;
        }

        // Transform database data to ExamData type
        const examData: ExamData = {
          id: data.id,
          title: data.title,
          subject: data.subject,
          duration: data.duration,
          totalQuestions: data.total_questions,
          questions: (data.questions as unknown as Question[]) || [],
        };

        setExam(examData);
        startTimeRef.current = Date.now();
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError('Lỗi khi tải bài thi');
      } finally {
        setIsLoadingExam(false);
      }
    };

    fetchExam();
  }, [examId]);

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C+';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const calculateResults = useCallback((): ExamResult | null => {
    if (!exam) return null;

    const questionResults: QuestionResult[] = [];
    let totalEarned = 0;
    const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);
    
    const byType: Record<QuestionType, { correct: number; total: number; points: number }> = {
      'multiple-choice': { correct: 0, total: 0, points: 0 },
      'short-answer': { correct: 0, total: 0, points: 0 },
      'essay': { correct: 0, total: 0, points: 0 },
      'drag-drop': { correct: 0, total: 0, points: 0 },
      'coding': { correct: 0, total: 0, points: 0 },
    };

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    exam.questions.forEach((question) => {
      const answer = answers.get(question.id);
      const userAnswer = answer?.answer || '';
      let isCorrect = false;
      let earnedPoints = 0;

      byType[question.type].total += 1;

      if (!answer) {
        unansweredCount++;
      } else {
        if (question.type === 'multiple-choice') {
          isCorrect = userAnswer === question.correctAnswer;
          earnedPoints = isCorrect ? question.points : 0;
        } else if (question.type === 'short-answer') {
          const normalizedUser = String(userAnswer).toLowerCase().trim().replace(/\s+/g, '');
          const normalizedCorrect = String(question.correctAnswer || '').toLowerCase().trim().replace(/\s+/g, '');
          isCorrect = normalizedUser === normalizedCorrect;
          earnedPoints = isCorrect ? question.points : 0;
        } else if (question.type === 'essay') {
          earnedPoints = userAnswer ? Math.ceil(question.points * 0.7) : 0;
          isCorrect = earnedPoints > 0;
        } else if (question.type === 'coding') {
          earnedPoints = userAnswer ? Math.ceil(question.points * 0.8) : 0;
          isCorrect = earnedPoints > 0;
        }

        if (isCorrect) {
          correctCount++;
          byType[question.type].correct += 1;
        } else {
          incorrectCount++;
        }

        byType[question.type].points += earnedPoints;
        totalEarned += earnedPoints;
      }

      questionResults.push({
        questionId: question.id,
        isCorrect,
        earnedPoints,
        maxPoints: question.points,
        userAnswer,
        correctAnswer: question.correctAnswer,
        codingResults: question.type === 'coding' && answer ? {
          passedTests: 2,
          totalTests: 3,
          testResults: [],
        } : undefined,
      });
    });

    const percentage = totalPoints > 0 ? (totalEarned / totalPoints) * 100 : 0;
    const durationMs = Date.now() - startTimeRef.current;
    const durationMins = Math.ceil(durationMs / 60000);

    return {
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      submittedAt: new Date(),
      duration: durationMins,
      totalPoints,
      earnedPoints: totalEarned,
      percentage,
      grade: calculateGrade(percentage),
      questionResults,
      statistics: {
        totalQuestions: exam.totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unanswered: unansweredCount,
        byType,
      },
    };
  }, [exam, answers]);

  const saveResultToDatabase = async (result: ExamResult) => {
    if (!user) {
      console.warn('User not logged in, results will not be saved to database');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('exam_results')
        .insert([{
          user_id: user.id,
          exam_id: result.examId,
          total_points: result.totalPoints,
          earned_points: result.earnedPoints,
          percentage: result.percentage,
          grade: result.grade,
          duration: result.duration,
          question_results: JSON.parse(JSON.stringify(result.questionResults)),
          statistics: JSON.parse(JSON.stringify(result.statistics)),
        }]);

      if (insertError) throw insertError;
      console.log('Exam result saved successfully');
    } catch (err) {
      console.error('Error saving exam result:', err);
      toast.error('Lỗi khi lưu kết quả thi');
    }
  };

  const handleTimeUp = useCallback(() => {
    if (!exam) return;
    
    toast.error('Hết thời gian làm bài!', {
      description: 'Bài thi của bạn sẽ được nộp tự động.',
    });
    
    const result = calculateResults();
    if (result) {
      saveResultToDatabase(result);
      setTimeout(() => {
        navigate(`/exam/${exam.id}/result`, {
          state: { result, questions: exam.questions },
        });
      }, 2000);
    }
  }, [navigate, exam, calculateResults]);

  const { formattedTime, isWarning, isCritical } = useExamTimer({
    initialMinutes: exam?.duration || 60,
    onTimeUp: handleTimeUp,
  });

  // Calculate question statuses
  const questionStatuses: QuestionStatus[] = exam?.questions.map((q) => {
    if (flaggedQuestions.has(q.id)) return 'flagged';
    if (answers.has(q.id)) return 'answered';
    return 'unanswered';
  }) || [];

  const handleAnswer = (answer: Answer) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(answer.questionId, answer);
      return newAnswers;
    });
  };

  const handleToggleFlag = (questionIndex: number) => {
    if (!exam) return;
    const questionId = exam.questions[questionIndex].id;
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNavigate = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
  };

  const handleSubmit = () => {
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!exam) return;
    
    setIsSubmitting(true);
    const result = calculateResults();
    
    if (result) {
      await saveResultToDatabase(result);
      
      toast.success('Nộp bài thành công!', {
        description: `Bạn đã trả lời ${answers.size}/${exam.totalQuestions} câu hỏi.`,
      });
      
      navigate(`/exam/${exam.id}/result`, {
        state: { result, questions: exam.questions },
      });
    }
    
    setIsSubmitting(false);
  };

  // Loading state
  if (authLoading || isLoadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải bài thi...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {error || 'Không tìm thấy bài thi'}
          </h1>
          <p className="text-muted-foreground mb-6">
            Vui lòng kiểm tra lại đường dẫn hoặc liên hệ giáo viên.
          </p>
          <Button onClick={() => navigate('/')} variant="hero">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // Auth check - require login for taking exams
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Yêu cầu đăng nhập
          </h1>
          <p className="text-muted-foreground mb-6">
            Bạn cần đăng nhập để làm bài thi này.
          </p>
          <Button onClick={() => navigate('/auth')} variant="hero">
            Đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[currentQuestion];

  if (!currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Bài thi không có câu hỏi nào.</p>
          <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ExamHeader
        title={exam.title}
        subject={exam.subject}
        formattedTime={formattedTime}
        isWarning={isWarning}
        isCritical={isCritical}
        onSubmit={handleSubmit}
      />

      <QuestionNavigation
        totalQuestions={exam.totalQuestions}
        currentQuestion={currentQuestion}
        questionStatuses={questionStatuses}
        onNavigate={handleNavigate}
        onToggleFlag={handleToggleFlag}
      />

      <QuestionDisplay
        question={currentQ}
        questionIndex={currentQuestion}
        totalQuestions={exam.totalQuestions}
        status={questionStatuses[currentQuestion]}
        currentAnswer={answers.get(currentQ.id)}
        onAnswer={handleAnswer}
        onToggleFlag={() => handleToggleFlag(currentQuestion)}
        onPrevious={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
        onNext={() => setCurrentQuestion((prev) => Math.min(exam.totalQuestions - 1, prev + 1))}
      />

      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleConfirmSubmit}
        questionStatuses={questionStatuses}
        formattedTime={formattedTime}
      />
    </div>
  );
};

export default TakeExam;
