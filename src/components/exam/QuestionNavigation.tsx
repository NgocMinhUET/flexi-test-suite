import { memo, useMemo, useCallback } from 'react';
import { Flag, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionStatus } from '@/types/exam';

interface QuestionNavigationProps {
  totalQuestions: number;
  currentQuestion: number;
  questionStatuses: QuestionStatus[];
  onNavigate: (questionIndex: number) => void;
  onToggleFlag: (questionIndex: number) => void;
}

// Memoized question button to prevent re-renders
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
        "hover:scale-110 hover:shadow-md",
        isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-card",
        status === 'answered' && "bg-success text-success-foreground",
        status === 'flagged' && "bg-warning text-warning-foreground",
        status === 'unanswered' && "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
      title={`Câu ${index + 1} - Click phải để đánh dấu`}
    >
      {index + 1}
      {status === 'flagged' && (
        <Flag className="absolute -top-1 -right-1 w-3 h-3 text-warning" />
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

  const progressWidth = useMemo(() => 
    `${(answeredCount / totalQuestions) * 100}%`,
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
    <aside className="fixed left-4 top-24 w-64 bg-card rounded-2xl border border-border shadow-lg p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Stats */}
      <div className="mb-4 p-3 bg-muted/50 rounded-xl">
        <h3 className="font-semibold text-foreground mb-2">Tiến độ làm bài</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Đã trả lời:</span>
            <span className="font-medium text-success">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Đánh dấu:</span>
            <span className="font-medium text-warning">{flaggedCount}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-success" />
          <span className="text-muted-foreground">Đã làm</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning" />
          <span className="text-muted-foreground">Đánh dấu</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" />
          <span className="text-muted-foreground">Chưa làm</span>
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2">
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
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <button
          onClick={handleGoToUnanswered}
          className="w-full text-sm text-primary hover:underline flex items-center gap-2"
        >
          <Circle className="w-4 h-4" />
          Đến câu chưa làm
        </button>
        <button
          onClick={handleGoToFlagged}
          className="w-full text-sm text-warning hover:underline flex items-center gap-2"
        >
          <Flag className="w-4 h-4" />
          Đến câu đánh dấu
        </button>
      </div>
    </aside>
  );
});

QuestionNavigation.displayName = 'QuestionNavigation';
