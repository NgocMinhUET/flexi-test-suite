import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Question, Answer, OrderingQuestion } from '@/types/exam';
import { GripVertical, ArrowUpDown, MoveUp, MoveDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OrderingQuestionDisplayProps {
  question: Question;
  currentAnswer?: Answer;
  onAnswer: (answer: Answer) => void;
}

interface SortableItemProps {
  id: string;
  text: string;
  index: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableItem = memo(({ id, text, index, totalItems, onMoveUp, onMoveDown }: SortableItemProps) => {
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
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 transition-all border-2",
        isDragging ? "shadow-lg border-primary bg-primary/5 z-50" : "hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Order Number */}
        <span className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm flex-shrink-0",
          "bg-primary text-primary-foreground"
        )}>
          {index + 1}
        </span>

        {/* Content */}
        <div 
          className="flex-1 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: text }}
        />

        {/* Move Buttons (for accessibility) */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <MoveUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            disabled={index === totalItems - 1}
            onClick={onMoveDown}
          >
            <MoveDown className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
});

SortableItem.displayName = 'SortableItem';

export const OrderingQuestionDisplay = memo(({
  question,
  currentAnswer,
  onAnswer,
}: OrderingQuestionDisplayProps) => {
  const ordering = question.ordering as OrderingQuestion;

  // Parse current order from answer
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

  // Initialize items with saved order or original order
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    if (savedOrder.length > 0) return savedOrder;
    // Shuffle items initially for the student
    const ids = ordering?.items.map(item => item.id) || [];
    return [...ids].sort(() => Math.random() - 0.5);
  });

  // Sync with saved answer when question changes
  useEffect(() => {
    if (savedOrder.length > 0) {
      setOrderedIds(savedOrder);
    } else if (ordering?.items) {
      const ids = ordering.items.map(item => item.id);
      setOrderedIds([...ids].sort(() => Math.random() - 0.5));
    }
  }, [question.id, savedOrder, ordering?.items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save answer
        onAnswer({
          questionId: question.id,
          answer: JSON.stringify(newOrder),
        });

        return newOrder;
      });
    }
  }, [onAnswer, question.id]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setOrderedIds(items => {
      const newOrder = arrayMove(items, index, index - 1);
      onAnswer({
        questionId: question.id,
        answer: JSON.stringify(newOrder),
      });
      return newOrder;
    });
  }, [onAnswer, question.id]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === orderedIds.length - 1) return;
    setOrderedIds(items => {
      const newOrder = arrayMove(items, index, index + 1);
      onAnswer({
        questionId: question.id,
        answer: JSON.stringify(newOrder),
      });
      return newOrder;
    });
  }, [onAnswer, question.id, orderedIds.length]);

  // Get item by id
  const getItemById = useCallback((id: string) => {
    return ordering?.items.find(item => item.id === id);
  }, [ordering?.items]);

  if (!ordering) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
        <span className="text-muted-foreground">Câu hỏi sắp xếp chưa được cấu hình</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <ArrowUpDown className="w-4 h-4" />
        <span>Kéo thả hoặc dùng nút mũi tên để sắp xếp các mục theo thứ tự đúng</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {ordering.items.length} mục cần sắp xếp
        </Badge>
      </div>

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedIds.map((id, index) => {
              const item = getItemById(id);
              if (!item) return null;

              return (
                <SortableItem
                  key={id}
                  id={id}
                  text={item.text}
                  index={index}
                  totalItems={orderedIds.length}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});

OrderingQuestionDisplay.displayName = 'OrderingQuestionDisplay';
