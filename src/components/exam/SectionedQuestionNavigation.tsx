import { Flag, CheckCircle2, Circle, Lock, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionStatus, ExamSection } from '@/types/exam';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SectionedQuestionNavigationProps {
  sections: ExamSection[];
  currentSectionIndex: number;
  completedSections: Set<number>;
  currentQuestionInSection: number; // Index within current section
  questionStatuses: Map<number, QuestionStatus>; // questionId -> status
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
  
  // Count answered in current section
  const answeredInCurrentSection = currentSection?.questionIds.filter(
    id => questionStatuses.get(id) === 'answered'
  ).length || 0;
  
  const totalInCurrentSection = currentSection?.questionIds.length || 1; // Avoid division by zero
  const progressPercent = totalInCurrentSection > 0 
    ? (answeredInCurrentSection / totalInCurrentSection) * 100 
    : 0;

  return (
    <aside className="fixed left-4 top-24 w-72 bg-card rounded-2xl border border-border shadow-lg max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      {/* Current Section Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Phần {currentSectionIndex + 1}/{sections.length}
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-mono font-semibold",
              isCritical && "bg-destructive/10 text-destructive animate-pulse",
              isWarning && !isCritical && "bg-warning/10 text-warning",
              !isWarning && !isCritical && "bg-primary/10 text-primary"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {formattedTime}
          </div>
        </div>
        <h3 className="font-semibold text-foreground line-clamp-1">
          {currentSection?.name}
        </h3>
        {currentSection?.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {currentSection.description}
          </p>
        )}
        
        {/* Progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tiến độ</span>
            <span className="font-medium text-foreground">
              {answeredInCurrentSection}/{totalInCurrentSection}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* All Sections */}
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
                "rounded-xl border transition-all",
                isCurrentSection && "border-primary bg-primary/5",
                isCompleted && "border-success/50 bg-success/5",
                isLocked && "border-border bg-muted/30 opacity-60"
              )}
            >
              {/* Section Header */}
              <div className="p-3 flex items-center gap-2">
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                {isLocked && <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                {isCurrentSection && !isCompleted && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCompleted && "text-success",
                    isLocked && "text-muted-foreground"
                  )}>
                    {section.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCompleted ? `Đã hoàn thành • ${answeredCount}/${section.questionIds.length}` :
                     isLocked ? `${section.questionIds.length} câu • ${section.duration} phút` :
                     `${answeredCount}/${section.questionIds.length} câu`}
                  </p>
                </div>
              </div>

              {/* Question Grid - Only show for current section */}
              {isCurrentSection && (
                <div className="px-3 pb-3">
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
                            "hover:scale-105 hover:shadow-sm",
                            isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                            status === 'answered' && "bg-success text-success-foreground",
                            status === 'flagged' && "bg-warning text-warning-foreground",
                            status === 'unanswered' && "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                          title={`Câu ${qIndex + 1} - Click phải để đánh dấu`}
                        >
                          {qIndex + 1}
                          {status === 'flagged' && (
                            <Flag className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-warning" />
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
      <div className="p-4 border-t border-border bg-muted/30">
        <Button
          variant="hero"
          className="w-full gap-2"
          onClick={onCompleteSection}
        >
          {currentSectionIndex === sections.length - 1 ? 'Nộp bài' : 'Hoàn thành phần này'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  );
};
