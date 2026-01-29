import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { MCQAnswerData, MCQOption } from "@/types/language";

interface ReadingMCQEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: MCQAnswerData | null;
  onAnswerDataChange: (data: MCQAnswerData) => void;
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

export function ReadingMCQEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: ReadingMCQEditorProps) {
  const [options, setOptions] = useState<MCQOption[]>(() => {
    if (answerData?.options) return answerData.options;
    return [
      { id: '1', text: '', isCorrect: false },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false },
    ];
  });
  const [explanation, setExplanation] = useState(answerData?.explanation || '');

  useEffect(() => {
    onAnswerDataChange({ options, explanation });
  }, [options, explanation]);

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '', isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(o => o.id !== id));
  };

  const updateOption = (id: string, updates: Partial<MCQOption>) => {
    setOptions(options.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const setCorrectAnswer = (id: string) => {
    setOptions(options.map(o => ({ ...o, isCorrect: o.id === id })));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Đoạn văn / Câu hỏi</CardTitle>
          <CardDescription>Nhập đoạn văn đọc hiểu hoặc câu hỏi</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Nhập đoạn văn đọc hiểu hoặc câu hỏi..."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={8}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Các đáp án</CardTitle>
          <CardDescription>Thêm các lựa chọn và đánh dấu đáp án đúng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-3">
              <Checkbox
                checked={option.isCorrect}
                onCheckedChange={() => setCorrectAnswer(option.id)}
              />
              <span className="w-8 text-muted-foreground">{String.fromCharCode(65 + index)}.</span>
              <Input
                placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                value={option.text}
                onChange={(e) => updateOption(option.id, { text: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(option.id)}
                disabled={options.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addOption}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm đáp án
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giải thích (tùy chọn)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Giải thích đáp án đúng..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
