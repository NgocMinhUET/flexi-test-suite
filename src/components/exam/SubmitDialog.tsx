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
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { QuestionStatus } from '@/types/exam';

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  questionStatuses: QuestionStatus[];
  formattedTime: string;
}

export const SubmitDialog = ({
  open,
  onOpenChange,
  onConfirm,
  questionStatuses,
  formattedTime,
}: SubmitDialogProps) => {
  const totalQuestions = questionStatuses.length;
  const answeredCount = questionStatuses.filter((s) => s === 'answered').length;
  const unansweredCount = questionStatuses.filter((s) => s === 'unanswered').length;
  const flaggedCount = questionStatuses.filter((s) => s === 'flagged').length;

  const hasUnanswered = unansweredCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasUnanswered ? (
              <>
                <AlertTriangle className="w-5 h-5 text-warning" />
                Xác nhận nộp bài
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-success" />
                Nộp bài thi
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {hasUnanswered
                  ? 'Bạn vẫn còn câu hỏi chưa trả lời. Bạn có chắc muốn nộp bài?'
                  : 'Bạn đã hoàn thành tất cả câu hỏi. Xác nhận nộp bài?'}
              </p>

              {/* Stats */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã trả lời:</span>
                  <span className="font-medium text-success">
                    {answeredCount}/{totalQuestions}
                  </span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chưa trả lời:</span>
                    <span className="font-medium text-destructive">{unansweredCount}</span>
                  </div>
                )}
                {flaggedCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Đánh dấu xem lại:</span>
                    <span className="font-medium text-warning">{flaggedCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Thời gian còn lại:
                  </span>
                  <span className="font-mono font-medium">{formattedTime}</span>
                </div>
              </div>

              {hasUnanswered && (
                <p className="text-sm text-warning">
                  ⚠️ Lưu ý: Các câu chưa trả lời sẽ được tính 0 điểm.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tiếp tục làm bài</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Nộp bài</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
