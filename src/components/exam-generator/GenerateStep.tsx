import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Shuffle, Clock, Target } from 'lucide-react';
import type { MatrixConfig, GenerationConstraints } from '@/types/examGeneration';

interface GenerateStepProps {
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  matrixConfig: MatrixConfig;
  constraints: GenerationConstraints;
  variantCount: number;
  onVariantCountChange: (count: number) => void;
  isGenerating: boolean;
}

export function GenerateStep({
  templateName,
  onTemplateNameChange,
  matrixConfig,
  constraints,
  variantCount,
  onVariantCountChange,
  isGenerating,
}: GenerateStepProps) {
  // Group cells by type for summary
  const cellsByType = matrixConfig.cells.reduce((acc, cell) => {
    if (!acc[cell.questionType]) {
      acc[cell.questionType] = { count: 0, points: 0 };
    }
    acc[cell.questionType].count += cell.count;
    acc[cell.questionType].points += cell.count * cell.points;
    return acc;
  }, {} as Record<string, { count: number; points: number }>);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Xem lại cấu hình và sinh các mã đề
      </p>

      {/* Template Name */}
      <div className="space-y-2">
        <Label htmlFor="templateName">Tên mẫu đề thi</Label>
        <Input
          id="templateName"
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          placeholder="VD: Đề thi Toán HK1 - Lớp 10"
          className="max-w-md"
        />
      </div>

      {/* Variant Count */}
      <div className="space-y-2">
        <Label htmlFor="variantCount">Số lượng mã đề cần sinh</Label>
        <Input
          id="variantCount"
          type="number"
          min={1}
          max={20}
          value={variantCount}
          onChange={(e) => onVariantCountChange(parseInt(e.target.value) || 1)}
          className="max-w-[100px]"
        />
        <p className="text-sm text-muted-foreground">
          Sẽ tạo {variantCount} mã đề: {Array.from({ length: variantCount }, (_, i) => 
            String(i + 1).padStart(3, '0')
          ).join(', ')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{matrixConfig.totalQuestions}</p>
              <p className="text-sm text-muted-foreground">câu/đề</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{matrixConfig.totalPoints}</p>
              <p className="text-sm text-muted-foreground">điểm/đề</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{matrixConfig.duration}</p>
              <p className="text-sm text-muted-foreground">phút</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shuffle className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{variantCount}</p>
              <p className="text-sm text-muted-foreground">mã đề</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Question Distribution */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Phân bổ câu hỏi theo loại</h4>
          <div className="space-y-2">
            {Object.entries(cellsByType).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="font-medium">{type}</span>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{data.count} câu</Badge>
                  <Badge variant="outline">{data.points} điểm</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Constraints Summary */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Cấu hình</h4>
          <div className="flex flex-wrap gap-3">
            <Badge variant={constraints.allowShuffle ? 'default' : 'secondary'}>
              {constraints.allowShuffle ? '✓' : '✗'} Xáo trộn câu hỏi
            </Badge>
            <Badge variant={constraints.shuffleOptions ? 'default' : 'secondary'}>
              {constraints.shuffleOptions ? '✓' : '✗'} Xáo trộn đáp án
            </Badge>
            <Badge variant="outline">
              Độ khó: {(constraints.minDifficulty * 100).toFixed(0)}% - {(constraints.maxDifficulty * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {isGenerating && (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Đang sinh {variantCount} mã đề...</span>
          </div>
        </div>
      )}
    </div>
  );
}
