import { memo, lazy, Suspense } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import { Question, Answer } from '@/types/exam';

// Lazy load heavy components
const MatchingQuestionDisplay = lazy(() => 
  import('./MatchingQuestionDisplay').then(m => ({ default: m.MatchingQuestionDisplay }))
);
const OrderingQuestionDisplay = lazy(() => 
  import('./OrderingQuestionDisplay').then(m => ({ default: m.OrderingQuestionDisplay }))
);

interface ReadingQuestionDisplayProps {
  question: Question;
  questionType: 'reading-mcq' | 'reading-order' | 'reading-match';
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
  // MCQ specific props
  selectedOption?: string | null;
  onOptionSelect?: (optionId: string) => void;
}

const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-[200px] bg-muted rounded-lg">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

export const ReadingQuestionDisplay = memo(({
  question,
  questionType,
  currentAnswer,
  onAnswer,
}: ReadingQuestionDisplayProps) => {
  // Reading MCQ uses the same UI as regular MCQ - handled by parent
  if (questionType === 'reading-mcq') {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <BookOpen className="w-5 h-5" />
          <span className="font-medium">Đọc hiểu - Trắc nghiệm</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Sử dụng giao diện trắc nghiệm tiêu chuẩn bên trên
        </p>
      </div>
    );
  }

  // Reading Order - reuse OrderingQuestionDisplay
  if (questionType === 'reading-order') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OrderingQuestionDisplay
          question={question}
          currentAnswer={currentAnswer}
          onAnswer={onAnswer}
        />
      </Suspense>
    );
  }

  // Reading Match - reuse MatchingQuestionDisplay
  if (questionType === 'reading-match') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <MatchingQuestionDisplay
          question={question}
          currentAnswer={currentAnswer}
          onAnswer={onAnswer}
        />
      </Suspense>
    );
  }

  return null;
});

ReadingQuestionDisplay.displayName = 'ReadingQuestionDisplay';
