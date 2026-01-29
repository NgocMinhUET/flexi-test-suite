import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SpeakingAnswerData } from "@/types/language";

interface SpeakingAnswerEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: SpeakingAnswerData | null;
  onAnswerDataChange: (data: SpeakingAnswerData) => void;
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

export function SpeakingAnswerEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: SpeakingAnswerEditorProps) {
  const [preparationTime, setPreparationTime] = useState(answerData?.preparationTime || 30);
  const [recordingTimeLimit, setRecordingTimeLimit] = useState(answerData?.recordingTimeLimit || 60);
  const [rubric, setRubric] = useState(answerData?.rubric || '');
  const [sampleAnswer, setSampleAnswer] = useState(answerData?.sampleAnswer || '');

  useEffect(() => {
    onAnswerDataChange({ 
      preparationTime, 
      recordingTimeLimit, 
      rubric: rubric || undefined,
      sampleAnswer: sampleAnswer || undefined
    });
  }, [preparationTime, recordingTimeLimit, rubric, sampleAnswer]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Câu hỏi</CardTitle>
          <CardDescription>Nhập câu hỏi mà học sinh cần trả lời bằng giọng nói</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: What do you usually do on weekends? Describe your typical weekend activities."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cài đặt thời gian</CardTitle>
          <CardDescription>Thời gian chuẩn bị và ghi âm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Thời gian chuẩn bị (giây)</Label>
              <Input
                type="number"
                min={0}
                max={300}
                value={preparationTime}
                onChange={(e) => setPreparationTime(parseInt(e.target.value) || 30)}
              />
            </div>
            <div>
              <Label>Thời gian ghi âm tối đa (giây)</Label>
              <Input
                type="number"
                min={30}
                max={300}
                value={recordingTimeLimit}
                onChange={(e) => setRecordingTimeLimit(parseInt(e.target.value) || 60)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rubric chấm điểm (tùy chọn)</CardTitle>
          <CardDescription>Tiêu chí đánh giá câu trả lời</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`VD:
- Content (4 điểm): Trả lời đầy đủ, phù hợp với câu hỏi
- Vocabulary (3 điểm): Từ vựng phong phú, phù hợp
- Grammar (2 điểm): Cấu trúc câu đúng ngữ pháp
- Fluency (1 điểm): Nói trôi chảy, tự nhiên`}
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Câu trả lời mẫu (tùy chọn)</CardTitle>
          <CardDescription>Câu trả lời mẫu để tham khảo khi chấm</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Nhập câu trả lời mẫu..."
            value={sampleAnswer}
            onChange={(e) => setSampleAnswer(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
