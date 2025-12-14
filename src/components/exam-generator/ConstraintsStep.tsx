import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Shuffle, Target } from 'lucide-react';
import type { MatrixConfig, GenerationConstraints } from '@/types/examGeneration';

interface ConstraintsStepProps {
  matrixConfig: MatrixConfig;
  constraints: GenerationConstraints;
  onMatrixChange: (config: MatrixConfig) => void;
  onConstraintsChange: (constraints: GenerationConstraints) => void;
}

export function ConstraintsStep({
  matrixConfig,
  constraints,
  onMatrixChange,
  onConstraintsChange,
}: ConstraintsStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Cấu hình thời gian và các tùy chọn sinh đề
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{matrixConfig.totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Tổng câu hỏi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{matrixConfig.totalPoints}</p>
            <p className="text-sm text-muted-foreground">Tổng điểm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{matrixConfig.duration}</p>
            <p className="text-sm text-muted-foreground">Phút làm bài</p>
          </CardContent>
        </Card>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Thời gian làm bài (phút)
        </Label>
        <Input
          type="number"
          min={5}
          max={300}
          value={matrixConfig.duration}
          onChange={(e) => onMatrixChange({ ...matrixConfig, duration: parseInt(e.target.value) || 60 })}
          className="max-w-[200px]"
        />
      </div>

      {/* Shuffle Options */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-base">
          <Shuffle className="h-4 w-4" />
          Tùy chọn xáo trộn
        </Label>
        
        <div className="space-y-4 ml-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Xáo trộn thứ tự câu hỏi</p>
              <p className="text-sm text-muted-foreground">
                Mỗi mã đề sẽ có thứ tự câu hỏi khác nhau
              </p>
            </div>
            <Switch
              checked={constraints.allowShuffle}
              onCheckedChange={(checked) => 
                onConstraintsChange({ ...constraints, allowShuffle: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Xáo trộn đáp án (MCQ)</p>
              <p className="text-sm text-muted-foreground">
                Thứ tự các đáp án A, B, C, D sẽ khác nhau giữa các mã đề
              </p>
            </div>
            <Switch
              checked={constraints.shuffleOptions}
              onCheckedChange={(checked) => 
                onConstraintsChange({ ...constraints, shuffleOptions: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Difficulty Range */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Phạm vi độ khó
        </Label>
        
        <div className="ml-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm w-8">{(constraints.minDifficulty * 100).toFixed(0)}%</span>
            <Slider
              value={[constraints.minDifficulty * 100, constraints.maxDifficulty * 100]}
              onValueChange={([min, max]) => 
                onConstraintsChange({
                  ...constraints,
                  minDifficulty: min / 100,
                  maxDifficulty: max / 100,
                })
              }
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-sm w-8">{(constraints.maxDifficulty * 100).toFixed(0)}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Chỉ lấy câu hỏi có độ khó trong khoảng {(constraints.minDifficulty * 100).toFixed(0)}% - {(constraints.maxDifficulty * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
