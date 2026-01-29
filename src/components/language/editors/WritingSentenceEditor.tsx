import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SentenceAnswerData } from "@/types/language";

interface WritingSentenceEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  answerData: SentenceAnswerData | null;
  onAnswerDataChange: (data: SentenceAnswerData) => void;
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

export function WritingSentenceEditor({
  content,
  onContentChange,
  answerData,
  onAnswerDataChange,
}: WritingSentenceEditorProps) {
  const [correctSentence, setCorrectSentence] = useState(answerData?.correctSentence || '');
  const [words, setWords] = useState<string[]>(() => {
    if (answerData?.words) return answerData.words;
    return [];
  });
  const [acceptableVariants, setAcceptableVariants] = useState<string[]>(
    answerData?.acceptableVariants || []
  );
  const [newVariant, setNewVariant] = useState('');
  const [explanation, setExplanation] = useState(answerData?.explanation || '');

  useEffect(() => {
    onAnswerDataChange({ 
      words, 
      correctSentence, 
      acceptableVariants: acceptableVariants.length ? acceptableVariants : undefined,
      explanation 
    });
  }, [words, correctSentence, acceptableVariants, explanation]);

  // Auto-generate words from correct sentence
  const generateWords = () => {
    if (!correctSentence.trim()) return;
    const extractedWords = correctSentence
      .replace(/[.,!?;:'"]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(Boolean);
    setWords(extractedWords);
  };

  const addVariant = () => {
    if (newVariant.trim() && !acceptableVariants.includes(newVariant.trim())) {
      setAcceptableVariants([...acceptableVariants, newVariant.trim()]);
      setNewVariant('');
    }
  };

  const removeVariant = (variant: string) => {
    setAcceptableVariants(acceptableVariants.filter(v => v !== variant));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn</CardTitle>
          <CardDescription>Nhập hướng dẫn cho học sinh</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="VD: Arrange the words to make a correct sentence."
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Câu hoàn chỉnh (đáp án)
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Nhập câu hoàn chỉnh, sau đó nhấn "Tạo từ" để tách thành các từ riêng lẻ</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Nhập câu đúng hoàn chỉnh</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="VD: She goes to school every day."
              value={correctSentence}
              onChange={(e) => setCorrectSentence(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={generateWords}>
              Tạo từ
            </Button>
          </div>

          {words.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Các từ sẽ được xáo trộn khi hiển thị:
              </p>
              <div className="flex flex-wrap gap-2">
                {words.map((word, index) => (
                  <Badge key={index} variant="secondary" className="text-base px-3 py-1">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đáp án chấp nhận khác (tùy chọn)</CardTitle>
          <CardDescription>Thêm các cách sắp xếp khác cũng được coi là đúng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="VD: Every day she goes to school."
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
            />
            <Button type="button" variant="outline" onClick={addVariant}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {acceptableVariants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {acceptableVariants.map((variant, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {variant}
                  <button 
                    type="button"
                    onClick={() => removeVariant(variant)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giải thích (tùy chọn)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Giải thích cấu trúc câu..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
