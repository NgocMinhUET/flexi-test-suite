import { useState, useEffect } from 'react';
import { Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Question, QuestionStatus, Answer } from '@/types/exam';

interface QuestionDisplayProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  status: QuestionStatus;
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
  onToggleFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const questionTypeLabels: Record<string, string> = {
  'multiple-choice': 'Trắc nghiệm',
  'short-answer': 'Điền đáp án',
  'essay': 'Tự luận',
  'drag-drop': 'Kéo thả',
  'coding': 'Lập trình',
};

export const QuestionDisplay = ({
  question,
  questionIndex,
  totalQuestions,
  status,
  currentAnswer,
  onAnswer,
  onToggleFlag,
  onPrevious,
  onNext,
}: QuestionDisplayProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');

  // Sync with current answer
  useEffect(() => {
    if (currentAnswer) {
      if (Array.isArray(currentAnswer.answer)) {
        setSelectedOption(currentAnswer.answer[0] || null);
      } else {
        if (question.type === 'multiple-choice') {
          setSelectedOption(currentAnswer.answer);
        } else {
          setTextAnswer(currentAnswer.answer);
        }
      }
    } else {
      setSelectedOption(null);
      setTextAnswer('');
    }
  }, [currentAnswer, question.id, question.type]);

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    onAnswer({ questionId: question.id, answer: optionId });
  };

  const handleTextChange = (value: string) => {
    setTextAnswer(value);
    if (value.trim()) {
      onAnswer({ questionId: question.id, answer: value });
    }
  };

  return (
    <div className="ml-72 pt-24 pb-8 px-8">
      <Card variant="elevated" className="max-w-4xl mx-auto p-8">
        {/* Question Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {questionIndex + 1}
            </span>
            <div>
              <Badge variant="secondary" className="mb-1">
                {questionTypeLabels[question.type]}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {question.points} điểm
              </p>
            </div>
          </div>
          <Button
            variant={status === 'flagged' ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleFlag}
            className={cn(
              "gap-2",
              status === 'flagged' && "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            <Flag className="w-4 h-4" />
            {status === 'flagged' ? 'Bỏ đánh dấu' : 'Đánh dấu'}
          </Button>
        </div>

        {/* Question Content */}
        <div className="mb-8">
          <p className="text-lg text-foreground leading-relaxed">{question.content}</p>
        </div>

        {/* Answer Area */}
        <div className="space-y-3">
          {question.type === 'multiple-choice' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    selectedOption === option.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm",
                        selectedOption === option.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{option.text}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(question.type === 'short-answer' || question.type === 'essay') && (
            <Textarea
              value={textAnswer}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                question.type === 'short-answer'
                  ? 'Nhập câu trả lời ngắn...'
                  : 'Viết bài luận của bạn...'
              }
              className={cn(
                "w-full resize-none",
                question.type === 'essay' ? 'min-h-[300px]' : 'min-h-[80px]'
              )}
            />
          )}

          {question.type === 'coding' && (
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="bg-muted px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <span className="text-sm text-muted-foreground ml-2">code.py</span>
              </div>
              <Textarea
                value={textAnswer}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="# Viết code của bạn ở đây..."
                className="min-h-[300px] font-mono text-sm border-0 rounded-none focus-visible:ring-0"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={questionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Câu trước
          </Button>

          <span className="text-sm text-muted-foreground">
            Câu {questionIndex + 1} / {totalQuestions}
          </span>

          <Button
            variant="default"
            onClick={onNext}
            disabled={questionIndex === totalQuestions - 1}
            className="gap-2"
          >
            Câu tiếp
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
