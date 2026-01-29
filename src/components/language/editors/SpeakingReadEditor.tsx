import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SpeakingAnswerData } from "@/types/language";

interface SpeakingReadEditorProps {
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

export function SpeakingReadEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: SpeakingReadEditorProps) {
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
          <CardTitle>Văn bản cần đọc</CardTitle>
          <CardDescription>Nhập đoạn văn bản mà học sinh cần đọc to</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: Good morning, everyone. Today, I would like to talk about the importance of environmental protection. Our planet is facing many challenges, including climate change, pollution, and deforestation..."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={6}
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
          <CardDescription>Tiêu chí đánh giá phát âm</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`VD:
- Pronunciation (4 điểm): Phát âm rõ ràng, chính xác
- Fluency (3 điểm): Đọc trôi chảy, tự nhiên
- Intonation (2 điểm): Ngữ điệu phù hợp
- Speed (1 điểm): Tốc độ đọc phù hợp`}
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ghi chú phát âm (tùy chọn)</CardTitle>
          <CardDescription>Ghi chú cho giáo viên về cách phát âm chuẩn</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ghi chú về các từ khó, trọng âm cần chú ý..."
            value={sampleAnswer}
            onChange={(e) => setSampleAnswer(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
