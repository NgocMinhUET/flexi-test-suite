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
  // Section info (optional)
  sectionName?: string;
  sectionProgress?: { current: number; total: number };
  // Progress info
  answeredCount?: number;
  totalQuestions?: number;
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
  sectionName,
  sectionProgress,
  answeredCount = 0,
  totalQuestions = 0,
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Title + Progress */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Exam Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-foreground truncate max-w-[200px] lg:max-w-[300px]">
                {title}
              </h1>
              {sectionProgress && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                  Phần {sectionProgress.current}/{sectionProgress.total}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {sectionName || subject}
            </p>
          </div>

          {/* Progress Counter - More prominent with higher contrast */}
          {totalQuestions > 0 && (
            <div className="hidden sm:flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-primary/10 border-2 border-primary/20">
              <span className="text-sm font-medium text-primary/80">Đã làm:</span>
              <span className="text-xl font-bold text-primary">
                {answeredCount}
              </span>
              <span className="text-xl font-bold text-primary/60">/</span>
              <span className="text-xl font-bold text-foreground">
                {totalQuestions}
              </span>
            </div>
          )}
        </div>

        {/* Center: Timer - Most prominent */}
        <div
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xl font-bold transition-all border-2",
            isCritical && "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
            isWarning && !isCritical && "bg-amber-500/10 text-amber-600 border-amber-500/30",
            !isWarning && !isCritical && "bg-primary/10 text-primary border-primary/20"
          )}
        >
          {isCritical ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
          <span className="tabular-nums">{formattedTime}</span>
        </div>

        {/* Right: Save status + Submit */}
        <div className="flex items-center gap-3">
          {/* Auto-save Status - Compact */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all",
                    saveStatus === 'saved' && "text-primary",
                    saveStatus === 'saving' && "text-muted-foreground",
                    saveStatus === 'error' && "text-destructive",
                    saveStatus === 'idle' && "text-muted-foreground"
                  )}
                >
                  {saveStatus === 'saved' && <Check className="w-3.5 h-3.5" />}
                  {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span className="hidden lg:inline">
                    {saveStatus === 'saved' && 'Đã lưu'}
                    {saveStatus === 'saving' && 'Đang lưu...'}
                    {saveStatus === 'error' && 'Lỗi'}
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

          {/* Submit Button */}
          <Button 
            onClick={onSubmit} 
            size="lg" 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Nộp bài</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
