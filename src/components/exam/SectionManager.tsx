import { useState } from 'react';
import { Plus, Trash2, GripVertical, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ExamSection, Question } from '@/types/exam';
import { cn } from '@/lib/utils';

interface SectionManagerProps {
  sections: ExamSection[];
  questions: Question[];
  isSectioned: boolean;
  onSectionedChange: (value: boolean) => void;
  onSectionsChange: (sections: ExamSection[]) => void;
}

export const SectionManager = ({
  sections,
  questions,
  isSectioned,
  onSectionedChange,
  onSectionsChange,
}: SectionManagerProps) => {
  const [draggedQuestion, setDraggedQuestion] = useState<number | null>(null);

  // Initialize sections when enabling sectioned mode
  const handleSectionedToggle = (enabled: boolean) => {
    onSectionedChange(enabled);
    if (enabled && sections.length === 0) {
      // Create one section with all questions
      onSectionsChange([{
        id: `section-${Date.now()}`,
        name: 'Phần 1',
        duration: 30,
        questionIds: questions.map(q => q.id),
      }]);
    }
  };

  const addSection = () => {
    const newSection: ExamSection = {
      id: `section-${Date.now()}`,
      name: `Phần ${sections.length + 1}`,
      duration: 30,
      questionIds: [],
    };
    onSectionsChange([...sections, newSection]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    
    // Move questions to previous section or first section
    const removedSection = sections[index];
    const targetIndex = index > 0 ? index - 1 : 0;
    
    const newSections = sections.filter((_, i) => i !== index);
    if (removedSection.questionIds.length > 0 && newSections.length > 0) {
      newSections[targetIndex] = {
        ...newSections[targetIndex],
        questionIds: [...newSections[targetIndex].questionIds, ...removedSection.questionIds],
      };
    }
    onSectionsChange(newSections);
  };

  const updateSection = (index: number, updates: Partial<ExamSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    onSectionsChange(newSections);
  };

  const moveQuestionToSection = (questionId: number, targetSectionIndex: number) => {
    const newSections = sections.map((section, sIndex) => {
      // Remove from current section
      const filtered = section.questionIds.filter(id => id !== questionId);
      
      // Add to target section
      if (sIndex === targetSectionIndex) {
        return { ...section, questionIds: [...filtered, questionId] };
      }
      
      return { ...section, questionIds: filtered };
    });
    onSectionsChange(newSections);
  };

  const getQuestionById = (id: number) => questions.find(q => q.id === id);

  // Calculate total duration
  const totalDuration = sections.reduce((sum, s) => sum + s.duration, 0);

  // Find unassigned questions
  const assignedIds = new Set(sections.flatMap(s => s.questionIds));
  const unassignedQuestions = questions.filter(q => !assignedIds.has(q.id));

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chia phần thi</CardTitle>
          <div className="flex items-center gap-3">
            <Switch
              checked={isSectioned}
              onCheckedChange={handleSectionedToggle}
            />
            <span className="text-sm text-muted-foreground">
              {isSectioned ? 'Đã bật' : 'Tắt'}
            </span>
          </div>
        </div>
      </CardHeader>

      {isSectioned && (
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-xl text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{sections.length} phần</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Tổng: {totalDuration} phút</span>
            </div>
            {unassignedQuestions.length > 0 && (
              <div className="flex items-center gap-2 text-warning">
                <span>⚠️ {unassignedQuestions.length} câu chưa gán</span>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, sIndex) => (
              <Card key={section.id} className="border-2 border-dashed">
                <CardContent className="pt-4 space-y-4">
                  {/* Section Header */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Tên phần *</Label>
                        <Input
                          value={section.name}
                          onChange={(e) => updateSection(sIndex, { name: e.target.value })}
                          placeholder="Vd: Phần 1: Trắc nghiệm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Thời gian (phút) *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={section.duration}
                          onChange={(e) => updateSection(sIndex, { duration: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mô tả</Label>
                        <Input
                          value={section.description || ''}
                          onChange={(e) => updateSection(sIndex, { description: e.target.value })}
                          placeholder="Mô tả ngắn (tùy chọn)"
                        />
                      </div>
                    </div>
                    {sections.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(sIndex)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Questions in section */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      Câu hỏi trong phần ({section.questionIds.length})
                    </Label>
                    <div
                      className={cn(
                        "min-h-[60px] p-3 rounded-lg border-2 border-dashed transition-colors",
                        draggedQuestion !== null ? "border-primary bg-primary/5" : "border-border"
                      )}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedQuestion !== null) {
                          moveQuestionToSection(draggedQuestion, sIndex);
                          setDraggedQuestion(null);
                        }
                      }}
                    >
                      {section.questionIds.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Kéo thả câu hỏi vào đây
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {section.questionIds.map((qId, qIndex) => {
                            const question = getQuestionById(qId);
                            if (!question) return null;

                            return (
                              <div
                                key={qId}
                                draggable
                                onDragStart={() => setDraggedQuestion(qId)}
                                onDragEnd={() => setDraggedQuestion(null)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing transition-all",
                                  "bg-muted hover:bg-muted/80",
                                  draggedQuestion === qId && "opacity-50"
                                )}
                              >
                                <GripVertical className="w-3 h-3 text-muted-foreground" />
                                <span>Câu {questions.findIndex(q => q.id === qId) + 1}</span>
                                <span className="text-muted-foreground">
                                  ({question.type === 'multiple-choice' ? 'TN' : 
                                    question.type === 'coding' ? 'LT' : 
                                    question.type === 'essay' ? 'TL' : 'TL'})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Unassigned Questions */}
          {unassignedQuestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-warning">
                Câu hỏi chưa gán ({unassignedQuestions.length})
              </Label>
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                <div className="flex flex-wrap gap-2">
                  {unassignedQuestions.map((question) => (
                    <div
                      key={question.id}
                      draggable
                      onDragStart={() => setDraggedQuestion(question.id)}
                      onDragEnd={() => setDraggedQuestion(null)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing",
                        "bg-warning/20 text-warning-foreground hover:bg-warning/30",
                        draggedQuestion === question.id && "opacity-50"
                      )}
                    >
                      <GripVertical className="w-3 h-3" />
                      <span>Câu {questions.findIndex(q => q.id === question.id) + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add Section Button */}
          <Button variant="outline" onClick={addSection} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Thêm phần mới
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
