import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Question, Answer, OrderingQuestion } from '@/types/exam';
import { GripVertical, Pencil, Type, FileText } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WritingQuestionDisplayProps {
  question: Question;
  questionType: 'writing-sentence' | 'writing-essay';
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
}

// Word chip for sentence ordering
interface WordChipProps {
  id: string;
  text: string;
}

const WordChip = memo(({ id, text }: WordChipProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing",
        "bg-card hover:bg-muted/50 transition-all select-none",
        isDragging ? "shadow-lg border-primary bg-primary/10 z-50" : "border-border"
      )}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground" />
      <span className="font-medium">{text}</span>
    </div>
  );
});

WordChip.displayName = 'WordChip';

// Sentence Ordering Component
const SentenceOrderingDisplay = memo(({
  question,
  currentAnswer,
  onAnswer,
}: Omit<WritingQuestionDisplayProps, 'questionType'>) => {
  const ordering = question.ordering as OrderingQuestion;

  // Parse saved order
  const savedOrder = useMemo((): string[] => {
    if (!currentAnswer?.answer) return [];
    try {
      if (typeof currentAnswer.answer === 'string') {
        return JSON.parse(currentAnswer.answer);
      }
      return currentAnswer.answer as string[];
    } catch {
      return [];
    }
  }, [currentAnswer]);

  // Initialize with saved or shuffled order
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    if (savedOrder.length > 0) return savedOrder;
    const ids = ordering?.items.map(item => item.id) || [];
    return [...ids].sort(() => Math.random() - 0.5);
  });

  useEffect(() => {
    if (savedOrder.length > 0) {
      setOrderedIds(savedOrder);
    } else if (ordering?.items) {
      const ids = ordering.items.map(item => item.id);
      setOrderedIds([...ids].sort(() => Math.random() - 0.5));
    }
  }, [question.id, savedOrder, ordering?.items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedIds(items => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onAnswer({
          questionId: question.id,
          answer: JSON.stringify(newOrder),
        });
        return newOrder;
      });
    }
  }, [onAnswer, question.id]);

  const getItemById = useCallback((id: string) => {
    return ordering?.items.find(item => item.id === id);
  }, [ordering?.items]);

  // Build current sentence
  const currentSentence = useMemo(() => {
    return orderedIds
      .map(id => getItemById(id)?.text)
      .filter(Boolean)
      .join(' ');
  }, [orderedIds, getItemById]);

  if (!ordering) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
        <span className="text-muted-foreground">Câu hỏi sắp xếp câu chưa được cấu hình</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Type className="w-4 h-4" />
        <span>Kéo thả các từ để sắp xếp thành câu hoàn chỉnh</span>
      </div>

      {/* Word Chips */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg min-h-[80px]">
            {orderedIds.map(id => {
              const item = getItemById(id);
              if (!item) return null;
              return <WordChip key={id} id={id} text={item.text} />;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Preview Sentence */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-2">
          <Badge variant="secondary" className="shrink-0">Câu của bạn</Badge>
          <p className="text-base leading-relaxed">{currentSentence || '...'}</p>
        </div>
      </Card>
    </div>
  );
});

SentenceOrderingDisplay.displayName = 'SentenceOrderingDisplay';

// Essay Writing Component
const EssayWritingDisplay = memo(({
  question,
  currentAnswer,
  onAnswer,
}: Omit<WritingQuestionDisplayProps, 'questionType'>) => {
  const [essay, setEssay] = useState(() => {
    if (typeof currentAnswer?.answer === 'string') return currentAnswer.answer;
    return '';
  });

  useEffect(() => {
    if (typeof currentAnswer?.answer === 'string') {
      setEssay(currentAnswer.answer);
    } else {
      setEssay('');
    }
  }, [currentAnswer, question.id]);

  const handleChange = useCallback((value: string) => {
    setEssay(value);
    onAnswer({
      questionId: question.id,
      answer: value,
    });
  }, [onAnswer, question.id]);

  // Word count
  const wordCount = useMemo(() => {
    return essay.trim() ? essay.trim().split(/\s+/).length : 0;
  }, [essay]);

  // Character count
  const charCount = essay.length;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <FileText className="w-4 h-4" />
        <span>Viết bài luận của bạn trong khung bên dưới</span>
      </div>

      {/* Essay Textarea */}
      <Textarea
        value={essay}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Bắt đầu viết bài luận của bạn tại đây..."
        className="min-h-[300px] resize-y text-base leading-relaxed"
      />

      {/* Statistics */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Badge variant="outline" className="gap-1">
          <Pencil className="w-3 h-3" />
          {wordCount} từ
        </Badge>
        <Badge variant="outline">
          {charCount} ký tự
        </Badge>
      </div>
    </div>
  );
});

EssayWritingDisplay.displayName = 'EssayWritingDisplay';

// Main Component
export const WritingQuestionDisplay = memo(({
  question,
  questionType,
  currentAnswer,
  onAnswer,
}: WritingQuestionDisplayProps) => {
  if (questionType === 'writing-sentence') {
    return (
      <SentenceOrderingDisplay
        question={question}
        currentAnswer={currentAnswer}
        onAnswer={onAnswer}
      />
    );
  }

  return (
    <EssayWritingDisplay
      question={question}
      currentAnswer={currentAnswer}
      onAnswer={onAnswer}
    />
  );
});

WritingQuestionDisplay.displayName = 'WritingQuestionDisplay';
