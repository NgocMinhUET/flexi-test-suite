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

export const QuestionNavigation = ({
  totalQuestions,
  currentQuestion,
  questionStatuses,
  onNavigate,
  onToggleFlag,
}: QuestionNavigationProps) => {
  const answeredCount = questionStatuses.filter((s) => s === 'answered').length;
  const flaggedCount = questionStatuses.filter((s) => s === 'flagged').length;

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
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
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
        {Array.from({ length: totalQuestions }, (_, i) => {
          const status = questionStatuses[i];
          const isCurrent = currentQuestion === i;

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                onToggleFlag(i);
              }}
              className={cn(
                "relative w-10 h-10 rounded-lg font-medium text-sm transition-all",
                "hover:scale-110 hover:shadow-md",
                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                status === 'answered' && "bg-success text-success-foreground",
                status === 'flagged' && "bg-warning text-warning-foreground",
                status === 'unanswered' && "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              title={`Câu ${i + 1} - Click phải để đánh dấu`}
            >
              {i + 1}
              {status === 'flagged' && (
                <Flag className="absolute -top-1 -right-1 w-3 h-3 text-warning" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <button
          onClick={() => {
            const firstUnanswered = questionStatuses.findIndex((s) => s === 'unanswered');
            if (firstUnanswered !== -1) onNavigate(firstUnanswered);
          }}
          className="w-full text-sm text-primary hover:underline flex items-center gap-2"
        >
          <Circle className="w-4 h-4" />
          Đến câu chưa làm
        </button>
        <button
          onClick={() => {
            const firstFlagged = questionStatuses.findIndex((s) => s === 'flagged');
            if (firstFlagged !== -1) onNavigate(firstFlagged);
          }}
          className="w-full text-sm text-warning hover:underline flex items-center gap-2"
        >
          <Flag className="w-4 h-4" />
          Đến câu đánh dấu
        </button>
      </div>
    </aside>
  );
};
