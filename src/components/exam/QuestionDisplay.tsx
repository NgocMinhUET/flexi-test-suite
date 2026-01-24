import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback } from 'react';
import { Flag, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Question, QuestionStatus, Answer, ProgrammingLanguage } from '@/types/exam';
import { QuestionContentRenderer, OptionContentRenderer, MediaItem } from './QuestionContentRenderer';

// Lazy load CodingEditor - it's heavy with CodeMirror dependencies
const CodingEditor = lazy(() => import('./CodingEditor').then(m => ({ default: m.CodingEditor })));

const CodingEditorLoader = memo(() => (
  <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
));

CodingEditorLoader.displayName = 'CodingEditorLoader';

// Memoized option button to prevent re-renders
const OptionButton = memo(({
  option,
  index,
  isSelected,
  onSelect,
}: {
  option: { id: string; text: string; imageUrl?: string };
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const handleClick = useCallback(() => onSelect(option.id), [onSelect, option.id]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-4 rounded-lg border-2 text-left transition-all min-h-[56px]",
        "hover:border-primary/40 hover:bg-muted/50 active:scale-[0.99]",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg font-semibold text-base flex-shrink-0",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {String.fromCharCode(65 + index)}
        </span>
        <div className="flex-1 pt-1.5">
          <OptionContentRenderer 
            text={option.text} 
            imageUrl={option.imageUrl}
          />
        </div>
      </div>
    </button>
  );
});

OptionButton.displayName = 'OptionButton';

const questionTypeLabels: Record<string, string> = {
  'multiple-choice': 'Trắc nghiệm',
  'short-answer': 'Điền đáp án',
  'essay': 'Tự luận',
  'drag-drop': 'Kéo thả',
  'coding': 'Lập trình',
};

interface QuestionDisplayProps {
  question: Question & { media?: MediaItem[] };
  questionIndex: number;
  totalQuestions: number;
  status: QuestionStatus;
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
  onToggleFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const QuestionDisplay = memo(({
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
  const [codeAnswer, setCodeAnswer] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>(
    question.coding?.defaultLanguage || 'python'
  );

  // Track if user has entered their own code (not just starter code)
  const [hasUserCode, setHasUserCode] = useState(false);

  // Memoized question type label
  const questionTypeLabel = useMemo(() => questionTypeLabels[question.type], [question.type]);

  // Memoized handlers
  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId);
    onAnswer({ questionId: question.id, answer: optionId });
  }, [onAnswer, question.id]);

  const handleTextChange = useCallback((value: string) => {
    setTextAnswer(value);
    if (value.trim()) {
      onAnswer({ questionId: question.id, answer: value });
    }
  }, [onAnswer, question.id]);

  const handleCodeChange = useCallback((code: string) => {
    setCodeAnswer(code);
    setHasUserCode(true);
    onAnswer({ questionId: question.id, answer: code, language: selectedLanguage });
  }, [onAnswer, question.id, selectedLanguage]);

  const handleLanguageChange = useCallback((language: ProgrammingLanguage) => {
    setSelectedLanguage(language);
    const starterCode = question.coding?.starterCode[language] || '';
    setCodeAnswer(starterCode);
    onAnswer({ questionId: question.id, answer: starterCode, language });
  }, [onAnswer, question.id, question.coding?.starterCode]);

  // Sync with current answer when navigating between questions
  useEffect(() => {
    if (currentAnswer) {
      // Restore saved answer
      if (Array.isArray(currentAnswer.answer)) {
        setSelectedOption(currentAnswer.answer[0] || null);
      } else {
        if (question.type === 'multiple-choice') {
          setSelectedOption(currentAnswer.answer);
        } else if (question.type === 'coding') {
          setCodeAnswer(currentAnswer.answer);
          setHasUserCode(true); // User has saved code
          if (currentAnswer.language) {
            setSelectedLanguage(currentAnswer.language);
          }
        } else {
          setTextAnswer(currentAnswer.answer);
        }
      }
    } else {
      // No saved answer - reset to defaults
      setSelectedOption(null);
      setTextAnswer('');
      setHasUserCode(false);
      // Only set starter code if this is a coding question and no user code exists
      if (question.type === 'coding' && question.coding) {
        const defaultLang = question.coding.defaultLanguage;
        setSelectedLanguage(defaultLang);
        setCodeAnswer(question.coding.starterCode[defaultLang] || '');
      } else {
        setCodeAnswer('');
      }
    }
  }, [currentAnswer, question.id, question.type, question.coding]);

  // Reset language when question changes (for coding questions)
  useEffect(() => {
    if (question.coding && !currentAnswer) {
      setSelectedLanguage(question.coding.defaultLanguage);
    }
  }, [question.id, question.coding, currentAnswer]);

  return (
    <div className="ml-60 pt-20 pb-8 px-4 lg:px-6">
      <div className={cn(
        "mx-auto bg-card rounded-xl border border-border shadow-sm p-6 lg:p-8",
        question.type === 'coding' ? 'max-w-[1400px]' : 'max-w-[900px]'
      )}>
        {/* Question Header - Simplified */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              {questionIndex + 1}
            </span>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {questionTypeLabel}
              </span>
              <p className="text-sm text-foreground font-medium">
                {question.points} điểm
              </p>
            </div>
          </div>
          <Button
            variant={status === 'flagged' ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleFlag}
            className={cn(
              "gap-1.5",
              status === 'flagged' && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
            )}
          >
            <Flag className="w-3.5 h-3.5" />
            {status === 'flagged' ? 'Bỏ đánh dấu' : 'Đánh dấu'}
          </Button>
        </div>

        {/* Question Content */}
        <div className="mb-6">
          <QuestionContentRenderer
            content={question.content}
            media={question.media}
            className="text-base lg:text-lg text-foreground leading-relaxed"
          />
        </div>

        {/* Answer Area */}
        <div className="space-y-2.5">
          {question.type === 'multiple-choice' && question.options && (
            <div className="space-y-2.5">
              {question.options.map((option, idx) => (
                <OptionButton
                  key={option.id}
                  option={option}
                  index={idx}
                  isSelected={selectedOption === option.id}
                  onSelect={handleOptionSelect}
                />
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
                "w-full resize-none border-border focus:border-primary",
                question.type === 'essay' ? 'min-h-[280px]' : 'min-h-[70px]'
              )}
            />
          )}

          {question.type === 'coding' && question.coding && (
            <Suspense fallback={<CodingEditorLoader />}>
              <CodingEditor
                codingQuestion={question.coding}
                currentCode={codeAnswer}
                currentLanguage={selectedLanguage}
                onCodeChange={handleCodeChange}
                onLanguageChange={handleLanguageChange}
              />
            </Suspense>
          )}
        </div>

        {/* Navigation - Large touch-friendly buttons */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
          <Button
            variant="outline"
            size="lg"
            onClick={onPrevious}
            disabled={questionIndex === 0}
            className="gap-2 min-w-[140px] min-h-[48px] border-border hover:bg-muted text-base"
          >
            <ChevronLeft className="w-5 h-5" />
            Câu trước
          </Button>

          <span className="text-lg font-bold text-primary">
            {questionIndex + 1}<span className="text-primary/60">/</span>{totalQuestions}
          </span>

          <Button
            size="lg"
            onClick={onNext}
            disabled={questionIndex === totalQuestions - 1}
            className="gap-2 min-w-[140px] min-h-[48px] bg-primary hover:bg-primary/90 text-base"
          >
            Câu tiếp
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

QuestionDisplay.displayName = 'QuestionDisplay';

QuestionDisplay.displayName = 'QuestionDisplay';