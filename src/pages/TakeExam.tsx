import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { QuestionNavigation } from '@/components/exam/QuestionNavigation';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { useExamTimer } from '@/hooks/useExamTimer';
import { ExamData, Question, Answer, QuestionStatus } from '@/types/exam';

// Mock exam data
const mockExam: ExamData = {
  id: 'exam-001',
  title: 'Kiểm tra Toán học Chương 5',
  subject: 'Toán học 12',
  duration: 45,
  totalQuestions: 10,
  questions: [
    {
      id: 1,
      type: 'multiple-choice',
      content: 'Cho hàm số y = x³ - 3x + 2. Hàm số đồng biến trên khoảng nào?',
      options: [
        { id: 'a', text: '(-∞; -1) và (1; +∞)' },
        { id: 'b', text: '(-1; 1)' },
        { id: 'c', text: '(-∞; +∞)' },
        { id: 'd', text: 'Không tồn tại' },
      ],
      points: 1,
    },
    {
      id: 2,
      type: 'multiple-choice',
      content: 'Tìm giá trị lớn nhất của hàm số f(x) = 2x³ - 3x² - 12x + 5 trên đoạn [-2; 3].',
      options: [
        { id: 'a', text: '12' },
        { id: 'b', text: '5' },
        { id: 'c', text: '-15' },
        { id: 'd', text: '25' },
      ],
      points: 1,
    },
    {
      id: 3,
      type: 'short-answer',
      content: 'Tính đạo hàm của hàm số y = sin²x + cos²x. Kết quả bằng bao nhiêu?',
      points: 1,
    },
    {
      id: 4,
      type: 'multiple-choice',
      content: 'Đường tiệm cận ngang của đồ thị hàm số y = (2x + 1)/(x - 3) là:',
      options: [
        { id: 'a', text: 'y = 2' },
        { id: 'b', text: 'y = 3' },
        { id: 'c', text: 'x = 3' },
        { id: 'd', text: 'y = -1/3' },
      ],
      points: 1,
    },
    {
      id: 5,
      type: 'essay',
      content: 'Trình bày khái niệm giới hạn của hàm số và cho ví dụ minh họa. Giải thích ý nghĩa hình học của giới hạn.',
      points: 3,
    },
    {
      id: 6,
      type: 'multiple-choice',
      content: 'Cho hàm số y = (x² - 1)/(x + 2). Hàm số có bao nhiêu điểm cực trị?',
      options: [
        { id: 'a', text: '0' },
        { id: 'b', text: '1' },
        { id: 'c', text: '2' },
        { id: 'd', text: '3' },
      ],
      points: 1,
    },
    {
      id: 7,
      type: 'coding',
      content: 'Viết chương trình Python tính giai thừa của số n (n nhập từ bàn phím). Yêu cầu sử dụng đệ quy.',
      points: 2,
    },
    {
      id: 8,
      type: 'multiple-choice',
      content: 'Phương trình tiếp tuyến của đồ thị hàm số y = x² tại điểm có hoành độ x = 1 là:',
      options: [
        { id: 'a', text: 'y = 2x - 1' },
        { id: 'b', text: 'y = 2x + 1' },
        { id: 'c', text: 'y = x - 1' },
        { id: 'd', text: 'y = x + 1' },
      ],
      points: 1,
    },
    {
      id: 9,
      type: 'short-answer',
      content: 'Tính ∫(2x + 3)dx. Viết kết quả dưới dạng đơn giản nhất (bỏ qua hằng số C).',
      points: 1,
    },
    {
      id: 10,
      type: 'multiple-choice',
      content: 'Đồ thị hàm số y = x⁴ - 2x² có bao nhiêu điểm uốn?',
      options: [
        { id: 'a', text: '0' },
        { id: 'b', text: '1' },
        { id: 'c', text: '2' },
        { id: 'd', text: '4' },
      ],
      points: 1,
    },
  ],
};

const TakeExam = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const handleTimeUp = useCallback(() => {
    toast.error('Hết thời gian làm bài!', {
      description: 'Bài thi của bạn sẽ được nộp tự động.',
    });
    setTimeout(() => {
      navigate('/');
    }, 2000);
  }, [navigate]);

  const { formattedTime, isWarning, isCritical } = useExamTimer({
    initialMinutes: mockExam.duration,
    onTimeUp: handleTimeUp,
  });

  // Calculate question statuses
  const questionStatuses: QuestionStatus[] = mockExam.questions.map((q) => {
    if (flaggedQuestions.has(q.id)) return 'flagged';
    if (answers.has(q.id)) return 'answered';
    return 'unanswered';
  });

  const handleAnswer = (answer: Answer) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(answer.questionId, answer);
      return newAnswers;
    });
  };

  const handleToggleFlag = (questionIndex: number) => {
    const questionId = mockExam.questions[questionIndex].id;
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

  const handleConfirmSubmit = () => {
    toast.success('Nộp bài thành công!', {
      description: `Bạn đã trả lời ${answers.size}/${mockExam.totalQuestions} câu hỏi.`,
    });
    navigate('/');
  };

  const currentQ = mockExam.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-background">
      <ExamHeader
        title={mockExam.title}
        subject={mockExam.subject}
        formattedTime={formattedTime}
        isWarning={isWarning}
        isCritical={isCritical}
        onSubmit={handleSubmit}
      />

      <QuestionNavigation
        totalQuestions={mockExam.totalQuestions}
        currentQuestion={currentQuestion}
        questionStatuses={questionStatuses}
        onNavigate={handleNavigate}
        onToggleFlag={handleToggleFlag}
      />

      <QuestionDisplay
        question={currentQ}
        questionIndex={currentQuestion}
        totalQuestions={mockExam.totalQuestions}
        status={questionStatuses[currentQuestion]}
        currentAnswer={answers.get(currentQ.id)}
        onAnswer={handleAnswer}
        onToggleFlag={() => handleToggleFlag(currentQuestion)}
        onPrevious={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
        onNext={() => setCurrentQuestion((prev) => Math.min(mockExam.totalQuestions - 1, prev + 1))}
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
