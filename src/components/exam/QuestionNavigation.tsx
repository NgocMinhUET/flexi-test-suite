import { memo, useMemo, useCallback } from 'react';
import { Flag, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionStatus } from '@/types/exam';

interface QuestionNavigationProps {
  totalQuestions: number;
  currentQuestion: number;
  questionStatuses: QuestionStatus[];
  onNavigate: (questionIndex: number) => void;
  onToggleFlag: (questionIndex: number) => void;
}

// Memoized question button - simplified colors
const QuestionButton = memo(({
  index,
  status,
  isCurrent,
  onNavigate,
  onToggleFlag,
}: {
  index: number;
  status: QuestionStatus;
  isCurrent: boolean;
  onNavigate: (i: number) => void;
  onToggleFlag: (i: number) => void;
}) => {
  const handleClick = useCallback(() => onNavigate(index), [onNavigate, index]);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onToggleFlag(index);
  }, [onToggleFlag, index]);

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={cn(
        "relative w-10 h-10 rounded-lg font-medium text-sm transition-all",
        "hover:scale-105",
        isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-card",
        status === 'answered' && "bg-primary text-primary-foreground",
        status === 'flagged' && "bg-amber-500 text-white",
        status === 'unanswered' && "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
      title={`Câu ${index + 1} - Click phải để đánh dấu`}
    >
      {index + 1}
      {status === 'flagged' && (
        <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 fill-amber-500" />
      )}
    </button>
  );
});

QuestionButton.displayName = 'QuestionButton';

export const QuestionNavigation = memo(({
  totalQuestions,
  currentQuestion,
  questionStatuses,
  onNavigate,
  onToggleFlag,
}: QuestionNavigationProps) => {
  // Memoize computed stats
  const { answeredCount, flaggedCount } = useMemo(() => ({
    answeredCount: questionStatuses.filter((s) => s === 'answered').length,
    flaggedCount: questionStatuses.filter((s) => s === 'flagged').length,
  }), [questionStatuses]);

  const progressPercentage = useMemo(() => 
    Math.round((answeredCount / totalQuestions) * 100),
    [answeredCount, totalQuestions]
  );

  const handleGoToUnanswered = useCallback(() => {
    const firstUnanswered = questionStatuses.findIndex((s) => s === 'unanswered');
    if (firstUnanswered !== -1) onNavigate(firstUnanswered);
  }, [questionStatuses, onNavigate]);

  const handleGoToFlagged = useCallback(() => {
    const firstFlagged = questionStatuses.findIndex((s) => s === 'flagged');
    if (firstFlagged !== -1) onNavigate(firstFlagged);
  }, [questionStatuses, onNavigate]);

  return (
    <aside className="fixed left-4 top-20 w-56 bg-card rounded-xl border border-border shadow-md p-4 max-h-[calc(100vh-100px)] overflow-y-auto">
      {/* Progress - Minimal */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Tiến độ</span>
          <span className="text-lg font-bold text-primary">
            {answeredCount}/{totalQuestions}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercentage}%</p>
      </div>

      {/* Legend - Simplified */}
      <div className="mb-3 flex gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary" />
          <span className="text-muted-foreground">Đã làm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-muted-foreground">Đánh dấu</span>
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <QuestionButton
            key={i}
            index={i}
            status={questionStatuses[i]}
            isCurrent={currentQuestion === i}
            onNavigate={onNavigate}
            onToggleFlag={onToggleFlag}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-4 pt-3 border-t border-border space-y-1.5">
        <button
          onClick={handleGoToUnanswered}
          className="w-full text-xs text-muted-foreground hover:text-primary flex items-center gap-2 py-1"
        >
          <Circle className="w-3.5 h-3.5" />
          Đến câu chưa làm
        </button>
        {flaggedCount > 0 && (
          <button
            onClick={handleGoToFlagged}
            className="w-full text-xs text-amber-600 hover:text-amber-700 flex items-center gap-2 py-1"
          >
            <Flag className="w-3.5 h-3.5" />
            Đến câu đánh dấu ({flaggedCount})
          </button>
        )}
      </div>
    </aside>
  );
});

QuestionNavigation.displayName = 'QuestionNavigation';
