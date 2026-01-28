import { memo, useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Question, Answer, MatchingQuestion } from '@/types/exam';
import { Link2, X, ArrowRight, CheckCircle2 } from 'lucide-react';

interface MatchingQuestionDisplayProps {
  question: Question;
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
}

interface MatchPair {
  left: string;
  right: string;
}

export const MatchingQuestionDisplay = memo(({
  question,
  currentAnswer,
  onAnswer,
}: MatchingQuestionDisplayProps) => {
  const matching = question.matching as MatchingQuestion;
  
  // Parse current pairs from answer
  const currentPairs = useMemo((): MatchPair[] => {
    if (!currentAnswer?.answer) return [];
    try {
      if (typeof currentAnswer.answer === 'string') {
        return JSON.parse(currentAnswer.answer);
      }
      return currentAnswer.answer as unknown as MatchPair[];
    } catch {
      return [];
    }
  }, [currentAnswer]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<MatchPair[]>(currentPairs);

  // Get matched items
  const matchedLeftIds = useMemo(() => pairs.map(p => p.left), [pairs]);
  const matchedRightIds = useMemo(() => pairs.map(p => p.right), [pairs]);

  // Handle left item click
  const handleLeftClick = useCallback((itemId: string) => {
    if (matchedLeftIds.includes(itemId)) return; // Already matched
    setSelectedLeft(prev => prev === itemId ? null : itemId);
  }, [matchedLeftIds]);

  // Handle right item click
  const handleRightClick = useCallback((itemId: string) => {
    if (!selectedLeft) return;
    if (matchedRightIds.includes(itemId)) return; // Already matched

    const newPairs = [...pairs, { left: selectedLeft, right: itemId }];
    setPairs(newPairs);
    setSelectedLeft(null);
    
    // Save answer
    onAnswer({
      questionId: question.id,
      answer: JSON.stringify(newPairs),
    });
  }, [selectedLeft, pairs, matchedRightIds, onAnswer, question.id]);

  // Remove a pair
  const handleRemovePair = useCallback((leftId: string) => {
    const newPairs = pairs.filter(p => p.left !== leftId);
    setPairs(newPairs);
    
    onAnswer({
      questionId: question.id,
      answer: JSON.stringify(newPairs),
    });
  }, [pairs, onAnswer, question.id]);

  // Get matching right item for a left item
  const getMatchedRight = useCallback((leftId: string) => {
    const pair = pairs.find(p => p.left === leftId);
    if (!pair) return null;
    return matching?.rightItems.find(r => r.id === pair.right);
  }, [pairs, matching?.rightItems]);

  if (!matching) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
        <span className="text-muted-foreground">Câu hỏi ghép cặp chưa được cấu hình</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Link2 className="w-4 h-4" />
        <span>Click vào một mục bên trái, sau đó click mục tương ứng bên phải để ghép cặp</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {pairs.length}/{matching.leftItems.length} cặp
        </Badge>
      </div>

      {/* Matching Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Cột A</h4>
          {matching.leftItems.map((item, index) => {
            const isMatched = matchedLeftIds.includes(item.id);
            const isSelected = selectedLeft === item.id;
            const matchedRight = getMatchedRight(item.id);

            return (
              <Card
                key={item.id}
                className={cn(
                  "p-4 cursor-pointer transition-all border-2",
                  isMatched && "bg-green-50 dark:bg-green-950/30 border-green-500",
                  isSelected && !isMatched && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  !isMatched && !isSelected && "hover:border-primary/40 hover:bg-muted/50"
                )}
                onClick={() => handleLeftClick(item.id)}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm flex-shrink-0",
                    isMatched ? "bg-green-500 text-white" : 
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                    {matchedRight && (
                      <div className="mt-2 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {matchedRight.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePair(item.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Cột B</h4>
          {matching.rightItems.map((item, index) => {
            const isMatched = matchedRightIds.includes(item.id);
            const canSelect = selectedLeft !== null && !isMatched;

            return (
              <Card
                key={item.id}
                className={cn(
                  "p-4 transition-all border-2",
                  isMatched && "bg-green-50 dark:bg-green-950/30 border-green-500 opacity-60",
                  canSelect && "cursor-pointer hover:border-primary hover:bg-primary/5 ring-2 ring-primary/20",
                  !isMatched && !canSelect && "border-border"
                )}
                onClick={() => canSelect && handleRightClick(item.id)}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm flex-shrink-0",
                    isMatched ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div 
                    className="flex-1 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
});

MatchingQuestionDisplay.displayName = 'MatchingQuestionDisplay';
