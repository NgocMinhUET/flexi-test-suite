import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Question, QuestionType } from '@/types/exam';
import { stripHtml } from '@/components/ui/rich-text-editor';

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'multiple-choice', label: 'Trắc nghiệm' },
  { value: 'short-answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' },
  { value: 'coding', label: 'Lập trình' },
];

interface CollapsibleQuestionProps {
  question: Question;
  questionIndex: number;
  onTypeChange: (type: QuestionType) => void;
  onPointsChange: (points: number) => void;
  onRemove: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}

const getQuestionStatus = (question: Question): 'complete' | 'incomplete' => {
  // Check if content is filled
  const contentText = stripHtml(question.content || '');
  if (!contentText.trim()) return 'incomplete';

  // For multiple choice, check if options are filled and correct answer is selected
  if (question.type === 'multiple-choice') {
    if (!question.options || question.options.length === 0) return 'incomplete';
    const hasEmptyOption = question.options.some(opt => !stripHtml(opt.text || '').trim());
    if (hasEmptyOption) return 'incomplete';
    if (!question.correctAnswer) return 'incomplete';
  }

  // For short answer, check if correct answer is provided
  if (question.type === 'short-answer') {
    if (!question.correctAnswer || (typeof question.correctAnswer === 'string' && !question.correctAnswer.trim())) {
      return 'incomplete';
    }
  }

  // For coding, check if at least one test case exists
  if (question.type === 'coding') {
    if (!question.coding?.testCases || question.coding.testCases.length === 0) {
      return 'incomplete';
    }
  }

  return 'complete';
};

const getPreviewText = (question: Question): string => {
  const text = stripHtml(question.content || '');
  if (text.length > 60) {
    return text.substring(0, 60) + '...';
  }
  return text || 'Chưa nhập nội dung';
};

export const CollapsibleQuestion = ({
  question,
  questionIndex,
  onTypeChange,
  onPointsChange,
  onRemove,
  children,
  defaultOpen = true,
}: CollapsibleQuestionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const status = getQuestionStatus(question);
  const previewText = getPreviewText(question);
  const typeLabel = questionTypes.find(t => t.value === question.type)?.label || question.type;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        'transition-all duration-200',
        !isOpen && 'hover:border-primary/30'
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none pb-2">
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move flex-shrink-0" />
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-semibold text-foreground">Câu {questionIndex + 1}</span>
                <Badge variant="secondary" className="text-xs">
                  {typeLabel}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {question.points} điểm
                </Badge>
              </div>

              {!isOpen && (
                <span className="text-sm text-muted-foreground truncate flex-1 mx-2">
                  {previewText}
                </span>
              )}

              <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                {status === 'complete' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardHeader className="pt-0 pb-2">
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Loại:</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value: QuestionType) => onTypeChange(value)}
                  >
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Điểm:</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={question.points}
                    onChange={(e) => onPointsChange(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
