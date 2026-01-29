import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { OrderAnswerData, OrderItem } from "@/types/language";

interface ReadingOrderEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: OrderAnswerData | null;
  onAnswerDataChange: (data: OrderAnswerData) => void;
  audioUrl?: string;
  onAudioChange: (url?: string, duration?: number) => void;
  audioDuration?: number;
  audioTranscript?: string;
  onAudioTranscriptChange: (transcript: string) => void;
  audioPlayCount: number;
  onAudioPlayCountChange: (count: number) => void;
  imageUrl?: string;
  onImageChange: (url?: string) => void;
}

export function ReadingOrderEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: ReadingOrderEditorProps) {
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (answerData?.items) return answerData.items;
    return [
      { id: '1', text: '' },
      { id: '2', text: '' },
      { id: '3', text: '' },
      { id: '4', text: '' },
    ];
  });
  const [explanation, setExplanation] = useState(answerData?.explanation || '');

  useEffect(() => {
    const correctOrder = items.map(item => item.id);
    onAnswerDataChange({ items, correctOrder, explanation });
  }, [items, explanation]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), text: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 2) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, text: string) => {
    setItems(items.map(item => item.id === id ? { ...item, text } : item));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn / Đoạn văn</CardTitle>
          <CardDescription>Nhập hướng dẫn sắp xếp</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: Put the following sentences in the correct order to form a paragraph..."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Các mục cần sắp xếp</CardTitle>
          <CardDescription>
            Nhập các câu/đoạn văn theo THỨ TỰ ĐÚNG. Khi học sinh làm bài, chúng sẽ được xáo trộn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                >
                  ▲
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                >
                  ▼
                </Button>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="w-6 text-muted-foreground font-medium">{index + 1}.</span>
              <Textarea
                placeholder={`Câu/đoạn ${index + 1}`}
                value={item.text}
                onChange={(e) => updateItem(item.id, e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                disabled={items.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm mục
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giải thích (tùy chọn)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Giải thích thứ tự đúng..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
