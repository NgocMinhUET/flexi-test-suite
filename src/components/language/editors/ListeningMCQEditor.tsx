import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AudioUploader } from "@/components/language/AudioUploader";
import { Plus, Trash2 } from "lucide-react";
import type { MCQAnswerData, MCQOption } from "@/types/language";

interface ListeningMCQEditorProps {
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

export function ListeningMCQEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
  audioUrl,
  onAudioChange,
  audioTranscript,
  onAudioTranscriptChange,
  audioPlayCount,
  onAudioPlayCountChange,
}: ListeningMCQEditorProps) {
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
          <CardTitle>File Audio</CardTitle>
          <CardDescription>Upload file audio cho câu hỏi nghe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AudioUploader
            value={audioUrl}
            onChange={onAudioChange}
          />
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Số lần được nghe</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={audioPlayCount}
                onChange={(e) => onAudioPlayCountChange(parseInt(e.target.value) || 2)}
              />
            </div>
          </div>

          <div>
            <Label>Transcript (tùy chọn)</Label>
            <Textarea
              placeholder="Nội dung audio dạng văn bản..."
              value={audioTranscript}
              onChange={(e) => onAudioTranscriptChange(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nội dung câu hỏi</CardTitle>
          <CardDescription>Câu hỏi hiển thị sau khi học sinh nghe audio</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: What is the main topic of the conversation?"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={3}
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
