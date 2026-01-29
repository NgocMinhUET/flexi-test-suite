import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AudioUploader } from "@/components/language/AudioUploader";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FillAnswerData, FillBlank } from "@/types/language";

interface ListeningFillEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: FillAnswerData | null;
  onAnswerDataChange: (data: FillAnswerData) => void;
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

export function ListeningFillEditor({
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
}: ListeningFillEditorProps) {
  const [blanks, setBlanks] = useState<FillBlank[]>(() => {
    if (answerData?.blanks) return answerData.blanks;
    return [{ id: '1', correctAnswers: [''], caseSensitive: false }];
  });
  const [explanation, setExplanation] = useState(answerData?.explanation || '');

  useEffect(() => {
    onAnswerDataChange({ blanks, explanation });
  }, [blanks, explanation]);

  const addBlank = () => {
    setBlanks([...blanks, { id: Date.now().toString(), correctAnswers: [''], caseSensitive: false }]);
  };

  const removeBlank = (id: string) => {
    if (blanks.length <= 1) return;
    setBlanks(blanks.filter(b => b.id !== id));
  };

  const updateBlank = (id: string, updates: Partial<FillBlank>) => {
    setBlanks(blanks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateCorrectAnswers = (id: string, value: string) => {
    const answers = value.split(',').map(a => a.trim()).filter(Boolean);
    updateBlank(id, { correctAnswers: answers.length ? answers : [''] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Audio</CardTitle>
          <CardDescription>Upload file audio cho câu hỏi nghe điền từ</CardDescription>
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
          <CardTitle className="flex items-center gap-2">
            Nội dung câu hỏi
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Sử dụng [1], [2], [3]... để đánh dấu vị trí cần điền</p>
                <p className="mt-1">VD: The capital of France is [1] and it has [2] million people.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Sử dụng [1], [2]... để đánh dấu chỗ trống</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: The speaker mentioned that the event will take place on [1] at [2] o'clock."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đáp án các chỗ trống</CardTitle>
          <CardDescription>Nhập đáp án cho mỗi chỗ trống. Phân cách nhiều đáp án đúng bằng dấu phẩy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {blanks.map((blank, index) => (
            <div key={blank.id} className="flex items-center gap-3">
              <span className="w-12 text-muted-foreground font-medium">[{index + 1}]</span>
              <Input
                placeholder="Đáp án (phân cách bằng dấu phẩy nếu có nhiều đáp án)"
                value={blank.correctAnswers.join(', ')}
                onChange={(e) => updateCorrectAnswers(blank.id, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBlank(blank.id)}
                disabled={blanks.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addBlank}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm chỗ trống
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
