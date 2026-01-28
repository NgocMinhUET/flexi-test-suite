import { memo, useCallback, useState } from 'react';
import { Headphones } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Question, Answer, ListeningQuestion } from '@/types/exam';
import { AudioPlayer } from './AudioPlayer';
import { QuestionContentRenderer } from './QuestionContentRenderer';

// Memoized option button for listening MCQ
const ListeningOptionButton = memo(({
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
          <QuestionContentRenderer content={option.text} />
        </div>
      </div>
    </button>
  );
});

ListeningOptionButton.displayName = 'ListeningOptionButton';

interface ListeningQuestionDisplayProps {
  question: Question;
  questionType: 'listening-mcq' | 'listening-fill';
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
}

export const ListeningQuestionDisplay = memo(({
  question,
  questionType,
  currentAnswer,
  onAnswer,
}: ListeningQuestionDisplayProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    currentAnswer?.answer as string || null
  );
  const [fillAnswer, setFillAnswer] = useState<string>(
    (currentAnswer?.answer as string) || ''
  );
  const [playCount, setPlayCount] = useState(0);

  const listeningData = question.listening as ListeningQuestion | undefined;

  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId);
    onAnswer({ questionId: question.id, answer: optionId });
  }, [onAnswer, question.id]);

  const handleFillChange = useCallback((value: string) => {
    setFillAnswer(value);
    if (value.trim()) {
      onAnswer({ questionId: question.id, answer: value });
    }
  }, [onAnswer, question.id]);

  const handlePlayCountChange = useCallback((count: number) => {
    setPlayCount(count);
  }, []);

  if (!listeningData?.audioUrl) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        Lỗi: Câu hỏi nghe thiếu file audio
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audio Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Headphones className="w-4 h-4" />
          <span>Nghe audio và trả lời câu hỏi</span>
          {listeningData.playCount > 0 && (
            <Badge variant="outline" className="ml-2">
              Tối đa {listeningData.playCount} lần nghe
            </Badge>
          )}
        </div>
        
        <AudioPlayer
          audioUrl={listeningData.audioUrl}
          maxPlayCount={listeningData.playCount}
          audioDuration={listeningData.audioDuration}
          onPlayCountChange={handlePlayCountChange}
        />
      </div>

      {/* Question Content */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <QuestionContentRenderer
          content={question.content}
          className="text-base lg:text-lg text-foreground leading-relaxed"
        />
      </div>

      {/* Answer Section */}
      {questionType === 'listening-mcq' && question.options && (
        <div className="space-y-2.5">
          {question.options.map((option, idx) => (
            <ListeningOptionButton
              key={option.id}
              option={option}
              index={idx}
              isSelected={selectedOption === option.id}
              onSelect={handleOptionSelect}
            />
          ))}
        </div>
      )}

      {questionType === 'listening-fill' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Điền câu trả lời:
          </label>
          <input
            type="text"
            value={fillAnswer}
            onChange={(e) => handleFillChange(e.target.value)}
            placeholder="Nhập câu trả lời..."
            className={cn(
              "w-full p-4 rounded-lg border-2 text-base",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "placeholder:text-muted-foreground/50"
            )}
          />
        </div>
      )}
    </div>
  );
});

ListeningQuestionDisplay.displayName = 'ListeningQuestionDisplay';
