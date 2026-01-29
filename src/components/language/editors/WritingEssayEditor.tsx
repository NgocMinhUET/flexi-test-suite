import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EssayAnswerData } from "@/types/language";

interface WritingEssayEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: EssayAnswerData | null;
  onAnswerDataChange: (data: EssayAnswerData) => void;
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

export function WritingEssayEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: WritingEssayEditorProps) {
  const [rubric, setRubric] = useState(answerData?.rubric || '');
  const [sampleAnswer, setSampleAnswer] = useState(answerData?.sampleAnswer || '');
  const [minWords, setMinWords] = useState(answerData?.minWords || 100);
  const [maxWords, setMaxWords] = useState(answerData?.maxWords || 250);

  useEffect(() => {
    onAnswerDataChange({ 
      rubric: rubric || undefined, 
      sampleAnswer: sampleAnswer || undefined, 
      minWords, 
      maxWords 
    });
  }, [rubric, sampleAnswer, minWords, maxWords]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Đề bài viết luận</CardTitle>
          <CardDescription>Nhập đề bài hoặc chủ đề viết</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: Write a paragraph (100-150 words) about your favorite hobby. Include what the hobby is, why you enjoy it, and how often you do it."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu về độ dài</CardTitle>
          <CardDescription>Số từ tối thiểu và tối đa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Số từ tối thiểu</Label>
              <Input
                type="number"
                min={10}
                max={1000}
                value={minWords}
                onChange={(e) => setMinWords(parseInt(e.target.value) || 100)}
              />
            </div>
            <div>
              <Label>Số từ tối đa</Label>
              <Input
                type="number"
                min={10}
                max={2000}
                value={maxWords}
                onChange={(e) => setMaxWords(parseInt(e.target.value) || 250)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rubric chấm điểm (tùy chọn)</CardTitle>
          <CardDescription>Tiêu chí đánh giá bài viết</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`VD:
- Content (4 điểm): Nội dung đầy đủ, phù hợp với chủ đề
- Organization (3 điểm): Bố cục rõ ràng, logic
- Vocabulary (2 điểm): Từ vựng phong phú, chính xác
- Grammar (1 điểm): Ngữ pháp đúng`}
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bài mẫu (tùy chọn)</CardTitle>
          <CardDescription>Bài viết mẫu để tham khảo khi chấm</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Nhập bài viết mẫu..."
            value={sampleAnswer}
            onChange={(e) => setSampleAnswer(e.target.value)}
            rows={8}
          />
        </CardContent>
      </Card>
    </div>
  );
}
