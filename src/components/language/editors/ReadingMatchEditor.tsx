import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import type { MatchAnswerData, MatchItem, MatchPair } from "@/types/language";

interface ReadingMatchEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: MatchAnswerData | null;
  onAnswerDataChange: (data: MatchAnswerData) => void;
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

export function ReadingMatchEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: ReadingMatchEditorProps) {
  const [leftItems, setLeftItems] = useState<MatchItem[]>(() => {
    if (answerData?.leftItems) return answerData.leftItems;
    return [
      { id: 'L1', text: '' },
      { id: 'L2', text: '' },
      { id: 'L3', text: '' },
    ];
  });
  
  const [rightItems, setRightItems] = useState<MatchItem[]>(() => {
    if (answerData?.rightItems) return answerData.rightItems;
    return [
      { id: 'R1', text: '' },
      { id: 'R2', text: '' },
      { id: 'R3', text: '' },
    ];
  });

  const [correctPairs, setCorrectPairs] = useState<MatchPair[]>(() => {
    if (answerData?.correctPairs) return answerData.correctPairs;
    return [
      { left: 'L1', right: 'R1' },
      { left: 'L2', right: 'R2' },
      { left: 'L3', right: 'R3' },
    ];
  });

  const [explanation, setExplanation] = useState(answerData?.explanation || '');

  useEffect(() => {
    onAnswerDataChange({ leftItems, rightItems, correctPairs, explanation });
  }, [leftItems, rightItems, correctPairs, explanation]);

  const addPair = () => {
    const newLeftId = `L${Date.now()}`;
    const newRightId = `R${Date.now()}`;
    setLeftItems([...leftItems, { id: newLeftId, text: '' }]);
    setRightItems([...rightItems, { id: newRightId, text: '' }]);
    setCorrectPairs([...correctPairs, { left: newLeftId, right: newRightId }]);
  };

  const removePair = (index: number) => {
    if (leftItems.length <= 2) return;
    const leftId = leftItems[index].id;
    const rightId = rightItems[index].id;
    setLeftItems(leftItems.filter((_, i) => i !== index));
    setRightItems(rightItems.filter((_, i) => i !== index));
    setCorrectPairs(correctPairs.filter(p => p.left !== leftId && p.right !== rightId));
  };

  const updateLeftItem = (index: number, text: string) => {
    const updated = [...leftItems];
    updated[index] = { ...updated[index], text };
    setLeftItems(updated);
  };

  const updateRightItem = (index: number, text: string) => {
    const updated = [...rightItems];
    updated[index] = { ...updated[index], text };
    setRightItems(updated);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn / Đoạn văn</CardTitle>
          <CardDescription>Nhập hướng dẫn hoặc đoạn văn liên quan</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: Match the words with their definitions..."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Các cặp ghép</CardTitle>
          <CardDescription>Nhập nội dung cột trái và cột phải. Thứ tự hiện tại là đáp án đúng.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leftItems.map((leftItem, index) => (
            <div key={leftItem.id} className="flex items-center gap-3">
              <span className="w-6 text-muted-foreground font-medium">{index + 1}.</span>
              <Input
                placeholder="Nội dung bên trái"
                value={leftItem.text}
                onChange={(e) => updateLeftItem(index, e.target.value)}
                className="flex-1"
              />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nội dung bên phải"
                value={rightItems[index]?.text || ''}
                onChange={(e) => updateRightItem(index, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePair(index)}
                disabled={leftItems.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addPair}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm cặp ghép
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giải thích (tùy chọn)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Giải thích đáp án..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
