import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Shuffle, Target, Layers, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { MatrixConfig, GenerationConstraints, SectionConfig } from '@/types/examGeneration';

interface ConstraintsStepProps {
  matrixConfig: MatrixConfig;
  constraints: GenerationConstraints;
  questionTypes: string[];
  onMatrixChange: (config: MatrixConfig) => void;
  onConstraintsChange: (constraints: GenerationConstraints) => void;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ_SINGLE: 'Trắc nghiệm',
  TRUE_FALSE_4: 'Đúng/Sai',
  SHORT_ANSWER: 'Trả lời ngắn',
  CODING: 'Lập trình',
};

export function ConstraintsStep({
  matrixConfig,
  constraints,
  questionTypes,
  onMatrixChange,
  onConstraintsChange,
}: ConstraintsStepProps) {
  // Calculate total section duration
  const totalSectionDuration = constraints.sectionConfig.reduce((sum, s) => sum + s.duration, 0);

  // Get question types used in matrix
  const usedQuestionTypes = [...new Set(matrixConfig.cells.map(c => c.questionType).filter(Boolean))];

  // Get question types already assigned to sections
  const assignedTypes = constraints.sectionConfig.flatMap(s => s.questionTypes);

  // Check if all used question types are assigned to sections
  const unassignedTypes = usedQuestionTypes.filter(t => !assignedTypes.includes(t));

  const handleAddSection = () => {
    const newSection: SectionConfig = {
      id: crypto.randomUUID(),
      name: `Phần ${constraints.sectionConfig.length + 1}`,
      duration: 30,
      questionTypes: [],
    };
    onConstraintsChange({
      ...constraints,
      sectionConfig: [...constraints.sectionConfig, newSection],
    });
  };

  const handleRemoveSection = (sectionId: string) => {
    onConstraintsChange({
      ...constraints,
      sectionConfig: constraints.sectionConfig.filter(s => s.id !== sectionId),
    });
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<SectionConfig>) => {
    onConstraintsChange({
      ...constraints,
      sectionConfig: constraints.sectionConfig.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  const handleToggleSectionQuestionType = (sectionId: string, questionType: string) => {
    const section = constraints.sectionConfig.find(s => s.id === sectionId);
    if (!section) return;

    const hasType = section.questionTypes.includes(questionType);
    const newTypes = hasType
      ? section.questionTypes.filter(t => t !== questionType)
      : [...section.questionTypes, questionType];

    handleUpdateSection(sectionId, { questionTypes: newTypes });
  };

  const handleToggleSectioned = (checked: boolean) => {
    if (checked && constraints.sectionConfig.length === 0) {
      // Auto-create initial sections based on question types
      const initialSections: SectionConfig[] = [];
      
      // Group: MCQ types in one section
      const mcqTypes: string[] = usedQuestionTypes.filter(t => t === 'MCQ_SINGLE' || t === 'TRUE_FALSE_4');
      if (mcqTypes.length > 0) {
        initialSections.push({
          id: crypto.randomUUID(),
          name: 'Phần 1: Trắc nghiệm',
          duration: 30,
          questionTypes: mcqTypes,
        });
      }

      // Group: Coding in another section
      const hasCodeType = usedQuestionTypes.some(t => t === 'CODING');
      if (hasCodeType) {
        initialSections.push({
          id: crypto.randomUUID(),
          name: 'Phần 2: Lập trình',
          duration: 60,
          questionTypes: ['CODING'],
        });
      }

      // Other types
      const otherTypes = usedQuestionTypes.filter(t => !mcqTypes.includes(t) && t !== 'CODING');
      if (otherTypes.length > 0) {
        initialSections.push({
          id: crypto.randomUUID(),
          name: `Phần ${initialSections.length + 1}: Khác`,
          duration: 30,
          questionTypes: otherTypes,
        });
      }

      // If no question types, create empty section
      if (initialSections.length === 0) {
        initialSections.push({
          id: crypto.randomUUID(),
          name: 'Phần 1',
          duration: 30,
          questionTypes: [],
        });
      }

      onConstraintsChange({
        ...constraints,
        isSectioned: checked,
        sectionConfig: initialSections,
      });
    } else {
      onConstraintsChange({
        ...constraints,
        isSectioned: checked,
      });
    }
  };

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
            <p className="text-3xl font-bold text-primary">
              {constraints.isSectioned ? totalSectionDuration : matrixConfig.duration}
            </p>
            <p className="text-sm text-muted-foreground">Phút làm bài</p>
          </CardContent>
        </Card>
      </div>

      {/* Sectioned Exam Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Chia bài thi theo phần
          </Label>
          <Switch
            checked={constraints.isSectioned}
            onCheckedChange={handleToggleSectioned}
          />
        </div>

        {constraints.isSectioned && (
          <div className="space-y-4 ml-6 border-l-2 border-primary/20 pl-4">
            <p className="text-sm text-muted-foreground">
              Mỗi phần có thời gian riêng. Thí sinh phải hoàn thành từng phần theo thứ tự và không thể quay lại phần đã làm.
            </p>

            {/* Section list */}
            {constraints.sectionConfig.map((section, index) => (
              <Card key={section.id} className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={section.name}
                      onChange={(e) => handleUpdateSection(section.id, { name: e.target.value })}
                      className="flex-1 font-medium"
                      placeholder={`Phần ${index + 1}`}
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={300}
                        value={section.duration}
                        onChange={(e) => handleUpdateSection(section.id, { duration: parseInt(e.target.value) || 30 })}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">phút</span>
                    </div>
                    {constraints.sectionConfig.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSection(section.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Loại câu hỏi trong phần này:</Label>
                    <div className="flex flex-wrap gap-2">
                      {usedQuestionTypes.map((type) => {
                        const isAssignedElsewhere = assignedTypes.includes(type) && !section.questionTypes.includes(type);
                        return (
                          <label
                            key={type}
                            className={`flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer transition-colors ${
                              section.questionTypes.includes(type)
                                ? 'bg-primary/10 border-primary'
                                : isAssignedElsewhere
                                ? 'bg-muted border-muted-foreground/20 opacity-50'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <Checkbox
                              checked={section.questionTypes.includes(type)}
                              disabled={isAssignedElsewhere}
                              onCheckedChange={() => handleToggleSectionQuestionType(section.id, type)}
                            />
                            <span className="text-sm">{QUESTION_TYPE_LABELS[type] || type}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" size="sm" onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm phần
            </Button>

            {/* Warning for unassigned question types */}
            {unassignedTypes.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Loại câu hỏi chưa được gán:</p>
                  <p className="text-muted-foreground">
                    {unassignedTypes.map(t => QUESTION_TYPE_LABELS[t] || t).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Total duration display */}
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-sm font-medium">Tổng thời gian:</span>
              <span className="text-sm font-bold text-primary">{totalSectionDuration} phút</span>
            </div>
          </div>
        )}
      </div>

      {/* Duration (only when not sectioned) */}
      {!constraints.isSectioned && (
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
      )}

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
                {constraints.isSectioned 
                  ? 'Xáo trộn thứ tự câu hỏi trong mỗi phần'
                  : 'Mỗi mã đề sẽ có thứ tự câu hỏi khác nhau'}
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
