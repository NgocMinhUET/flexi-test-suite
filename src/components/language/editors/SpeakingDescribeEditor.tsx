import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import type { SpeakingAnswerData } from "@/types/language";

interface SpeakingDescribeEditorProps {
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

export function SpeakingDescribeEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
  imageUrl,
  onImageChange,
}: SpeakingDescribeEditorProps) {
  const [preparationTime, setPreparationTime] = useState(answerData?.preparationTime || 60);
  const [recordingTimeLimit, setRecordingTimeLimit] = useState(answerData?.recordingTimeLimit || 90);
  const [rubric, setRubric] = useState(answerData?.rubric || '');
  const [sampleAnswer, setSampleAnswer] = useState(answerData?.sampleAnswer || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    onAnswerDataChange({ 
      preparationTime, 
      recordingTimeLimit, 
      rubric: rubric || undefined,
      sampleAnswer: sampleAnswer || undefined
    });
  }, [preparationTime, recordingTimeLimit, rubric, sampleAnswer]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Lỗi",
        description: "Chỉ hỗ trợ file hình ảnh",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5242880) { // 5MB
      toast({
        title: "Lỗi",
        description: "File quá lớn. Tối đa 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Chưa đăng nhập");

      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

      onImageChange(urlData.publicUrl);
      toast({ title: "Thành công", description: "Đã upload hình ảnh" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Lỗi upload",
        description: error instanceof Error ? error.message : "Không thể upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hình ảnh cần mô tả</CardTitle>
          <CardDescription>Upload hình ảnh mà học sinh cần mô tả</CardDescription>
        </CardHeader>
        <CardContent>
          {imageUrl ? (
            <div className="relative inline-block">
              <img 
                src={imageUrl} 
                alt="Question image" 
                className="max-w-full max-h-64 rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2"
                onClick={() => onImageChange(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors hover:border-primary/50 hover:bg-muted/30
                ${uploading ? 'pointer-events-none opacity-50' : ''}
              `}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nhấp để chọn hình ảnh</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF (tối đa 5MB)</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn / Câu hỏi gợi ý</CardTitle>
          <CardDescription>Hướng dẫn cho học sinh về cách mô tả</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: Look at the picture and describe what you see. Include details about the people, the place, and what they are doing."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cài đặt thời gian</CardTitle>
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
                onChange={(e) => setPreparationTime(parseInt(e.target.value) || 60)}
              />
            </div>
            <div>
              <Label>Thời gian ghi âm tối đa (giây)</Label>
              <Input
                type="number"
                min={30}
                max={300}
                value={recordingTimeLimit}
                onChange={(e) => setRecordingTimeLimit(parseInt(e.target.value) || 90)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rubric chấm điểm (tùy chọn)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`VD:
- Content (4 điểm): Mô tả đầy đủ chi tiết trong hình
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
          <CardTitle>Bài mẫu / Gợi ý (tùy chọn)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Mô tả mẫu cho hình ảnh này..."
            value={sampleAnswer}
            onChange={(e) => setSampleAnswer(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
