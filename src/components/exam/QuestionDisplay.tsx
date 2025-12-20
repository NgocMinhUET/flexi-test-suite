import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback } from 'react';
import { Flag, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Question, QuestionStatus, Answer, ProgrammingLanguage } from '@/types/exam';

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
  option: { id: string; text: string };
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const handleClick = useCallback(() => onSelect(option.id), [onSelect, option.id]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all",
        "hover:border-primary/50 hover:bg-primary/5",
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {String.fromCharCode(65 + index)}
        </span>
        <span 
          className="flex-1 prose prose-sm dark:prose-invert max-w-none [&_p]:my-0"
          dangerouslySetInnerHTML={{ __html: option.text }}
        />
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
    <div className="ml-72 pt-24 pb-8 px-8">
      <Card variant="elevated" className={cn(
        "mx-auto p-8",
        question.type === 'coding' ? 'max-w-6xl' : 'max-w-4xl'
      )}>
        {/* Question Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {questionIndex + 1}
            </span>
            <div>
              <Badge variant="secondary" className="mb-1">
                {questionTypeLabel}
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
          <div 
            className="text-lg text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm"
            dangerouslySetInnerHTML={{ __html: question.content }}
          />
        </div>

        {/* Answer Area */}
        <div className="space-y-3">
          {question.type === 'multiple-choice' && question.options && (
            <div className="space-y-3">
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
                "w-full resize-none",
                question.type === 'essay' ? 'min-h-[300px]' : 'min-h-[80px]'
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
});

QuestionDisplay.displayName = 'QuestionDisplay';