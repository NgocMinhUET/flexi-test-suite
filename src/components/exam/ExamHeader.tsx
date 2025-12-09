import { Clock, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExamHeaderProps {
  title: string;
  subject: string;
  formattedTime: string;
  isWarning: boolean;
  isCritical: boolean;
  onSubmit: () => void;
}

export const ExamHeader = ({
  title,
  subject,
  formattedTime,
  isWarning,
  isCritical,
  onSubmit,
}: ExamHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Exam Info */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground line-clamp-1">{title}</h1>
            <p className="text-sm text-muted-foreground">{subject}</p>
          </div>
        </div>

        {/* Timer */}
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-semibold transition-all",
            isCritical && "bg-destructive/10 text-destructive animate-pulse",
            isWarning && !isCritical && "bg-warning/10 text-warning",
            !isWarning && !isCritical && "bg-primary/10 text-primary"
          )}
        >
          {isCritical ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
          <span>{formattedTime}</span>
        </div>

        {/* Submit Button */}
        <Button onClick={onSubmit} variant="hero" size="lg" className="gap-2">
          <LogOut className="w-4 h-4" />
          Nộp bài
        </Button>
      </div>
    </header>
  );
};
