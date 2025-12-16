import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ExamSection } from '@/types/exam';

interface SectionTransitionDialogProps {
  open: boolean;
  currentSection: ExamSection;
  nextSection: ExamSection | null;
  answeredInSection: number;
  totalInSection: number;
  isTimeUp: boolean; // true = automatic transition, false = manual
  onConfirm: () => void;
  onCancel?: () => void; // Only for manual transition
}

export const SectionTransitionDialog = ({
  open,
  currentSection,
  nextSection,
  answeredInSection,
  totalInSection,
  isTimeUp,
  onConfirm,
  onCancel,
}: SectionTransitionDialogProps) => {
  const [countdown, setCountdown] = useState(5);
  const unanswered = totalInSection - answeredInSection;

  // Auto countdown when time is up
  useEffect(() => {
    if (!open || !isTimeUp) return;

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, isTimeUp, onConfirm]);

  const isLastSection = !nextSection;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isTimeUp ? (
              <>
                <Clock className="w-6 h-6 text-destructive" />
                Hết giờ!
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 text-success" />
                Hoàn thành phần thi
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isTimeUp
              ? `Phần "${currentSection.name}" đã hết thời gian`
              : `Bạn sắp hoàn thành phần "${currentSection.name}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Section Progress */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-foreground">Kết quả phần này:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Đã trả lời: <strong>{answeredInSection}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span>Chưa làm: <strong>{unanswered}</strong></span>
              </div>
            </div>
            <Progress value={(answeredInSection / totalInSection) * 100} className="h-2" />
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Lưu ý quan trọng</p>
                <p className="text-muted-foreground mt-1">
                  Bạn sẽ không thể quay lại phần này sau khi chuyển sang phần tiếp theo.
                </p>
              </div>
            </div>
          </div>

          {/* Next section info */}
          {nextSection && (
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Phần tiếp theo:</p>
              <p className="font-semibold text-foreground">{nextSection.name}</p>
              <p className="text-sm text-muted-foreground">
                {nextSection.questionIds.length} câu • {nextSection.duration} phút
              </p>
            </div>
          )}

          {/* Auto countdown for time-up */}
          {isTimeUp && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {isLastSection ? 'Tự động nộp bài sau' : 'Tự động chuyển phần sau'}
              </p>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold">
                {countdown}s
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isTimeUp && onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Xem lại
            </Button>
          )}
          <Button
            variant="hero"
            onClick={onConfirm}
            className="flex-1 gap-2"
          >
            {isLastSection ? 'Nộp bài' : 'Chuyển phần'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
