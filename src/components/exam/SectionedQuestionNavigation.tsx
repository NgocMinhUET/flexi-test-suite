import { Flag, CheckCircle2, Lock, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionStatus, ExamSection } from '@/types/exam';
import { Button } from '@/components/ui/button';

interface SectionedQuestionNavigationProps {
  sections: ExamSection[];
  currentSectionIndex: number;
  completedSections: Set<number>;
  currentQuestionInSection: number;
  questionStatuses: Map<number, QuestionStatus>;
  formattedTime: string;
  isWarning: boolean;
  isCritical: boolean;
  onNavigate: (questionId: number) => void;
  onToggleFlag: (questionId: number) => void;
  onCompleteSection: () => void;
}

export const SectionedQuestionNavigation = ({
  sections,
  currentSectionIndex,
  completedSections,
  currentQuestionInSection,
  questionStatuses,
  formattedTime,
  isWarning,
  isCritical,
  onNavigate,
  onToggleFlag,
  onCompleteSection,
}: SectionedQuestionNavigationProps) => {
  const currentSection = sections[currentSectionIndex];
  
  const answeredInCurrentSection = currentSection?.questionIds.filter(
    id => questionStatuses.get(id) === 'answered'
  ).length || 0;
  
  const totalInCurrentSection = currentSection?.questionIds.length || 1;
  const progressPercent = totalInCurrentSection > 0 
    ? Math.round((answeredInCurrentSection / totalInCurrentSection) * 100)
    : 0;

  return (
    <aside className="fixed left-4 top-20 w-60 bg-card rounded-xl border border-border shadow-md max-h-[calc(100vh-100px)] overflow-hidden flex flex-col">
      {/* Current Section Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Phần {currentSectionIndex + 1}/{sections.length}
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-mono font-bold",
              isCritical && "text-destructive animate-pulse",
              isWarning && !isCritical && "text-amber-600",
              !isWarning && !isCritical && "text-primary"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {formattedTime}
          </div>
        </div>
        <h3 className="font-semibold text-foreground text-sm line-clamp-1">
          {currentSection?.name}
        </h3>
        
        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-muted-foreground">Tiến độ</span>
            <span className="text-sm font-bold text-primary">
              {answeredInCurrentSection}/{totalInCurrentSection}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercent}%</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sections.map((section, sIndex) => {
          const isCurrentSection = sIndex === currentSectionIndex;
          const isCompleted = completedSections.has(sIndex);
          const isLocked = sIndex > currentSectionIndex;
          
          const answeredCount = section.questionIds.filter(
            id => questionStatuses.get(id) === 'answered'
          ).length;

          return (
            <div
              key={section.id}
              className={cn(
                "rounded-lg border transition-all",
                isCurrentSection && "border-primary/30 bg-primary/5",
                isCompleted && "border-primary/20",
                isLocked && "border-border bg-muted/30 opacity-50"
              )}
            >
              {/* Section Header */}
              <div className="p-2.5 flex items-center gap-2">
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                {isLocked && <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                {isCurrentSection && !isCompleted && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium truncate",
                    isCompleted && "text-primary",
                    isLocked && "text-muted-foreground"
                  )}>
                    {section.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCompleted ? `${answeredCount}/${section.questionIds.length}` :
                     isLocked ? `${section.questionIds.length} câu` :
                     `${answeredCount}/${section.questionIds.length}`}
                  </p>
                </div>
              </div>

              {/* Question Grid - Only for current section */}
              {isCurrentSection && (
                <div className="px-2.5 pb-2.5">
                  <div className="grid grid-cols-5 gap-1.5">
                    {section.questionIds.map((questionId, qIndex) => {
                      const status = questionStatuses.get(questionId) || 'unanswered';
                      const isCurrent = qIndex === currentQuestionInSection;

                      return (
                        <button
                          key={questionId}
                          onClick={() => onNavigate(questionId)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onToggleFlag(questionId);
                          }}
                          className={cn(
                            "relative w-9 h-9 rounded-lg text-xs font-medium transition-all",
                            "hover:scale-105",
                            isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                            status === 'answered' && "bg-primary text-primary-foreground",
                            status === 'flagged' && "bg-amber-500 text-white",
                            status === 'unanswered' && "bg-muted text-muted-foreground"
                          )}
                          title={`Câu ${qIndex + 1}`}
                        >
                          {qIndex + 1}
                          {status === 'flagged' && (
                            <Flag className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete Section Button */}
      <div className="p-3 border-t border-border">
        <Button
          className="w-full gap-2 bg-primary hover:bg-primary/90"
          onClick={onCompleteSection}
        >
          {currentSectionIndex === sections.length - 1 ? 'Nộp bài' : 'Hoàn thành phần'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  );
};
