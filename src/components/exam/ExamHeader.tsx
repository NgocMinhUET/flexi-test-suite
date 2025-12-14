import { Clock, AlertTriangle, LogOut, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExamHeaderProps {
  title: string;
  subject: string;
  formattedTime: string;
  isWarning: boolean;
  isCritical: boolean;
  onSubmit: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: Date | null;
}

export const ExamHeader = ({
  title,
  subject,
  formattedTime,
  isWarning,
  isCritical,
  onSubmit,
  saveStatus = 'idle',
  lastSavedAt,
}: ExamHeaderProps) => {
  const formatLastSaved = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return 'vừa xong';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} phút trước`;
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

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

        {/* Auto-save Status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  saveStatus === 'saved' && "bg-emerald-500/10 text-emerald-600",
                  saveStatus === 'saving' && "bg-amber-500/10 text-amber-600",
                  saveStatus === 'error' && "bg-destructive/10 text-destructive",
                  saveStatus === 'idle' && "bg-muted text-muted-foreground"
                )}
              >
                {saveStatus === 'saved' && <Check className="w-3.5 h-3.5" />}
                {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">
                  {saveStatus === 'saved' && 'Đã lưu'}
                  {saveStatus === 'saving' && 'Đang lưu...'}
                  {saveStatus === 'error' && 'Lỗi lưu'}
                  {saveStatus === 'idle' && 'Chờ lưu'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {saveStatus === 'saved' && `Tự động lưu: ${formatLastSaved(lastSavedAt || null)}`}
                {saveStatus === 'saving' && 'Đang lưu bài làm...'}
                {saveStatus === 'error' && 'Không thể lưu bài làm'}
                {saveStatus === 'idle' && 'Bài làm sẽ được tự động lưu'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
