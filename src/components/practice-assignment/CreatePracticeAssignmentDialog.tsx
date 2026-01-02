import { useState, useEffect } from 'react';
import { useCreatePracticeAssignment, useCreateAdaptiveAssignment } from '@/hooks/usePracticeAssignments';
import { useQuestions } from '@/hooks/useQuestions';
import { useTaxonomyNodes, useTaxonomyTree } from '@/hooks/useTaxonomy';
import { useClassesForAssignment } from '@/hooks/useClasses';
import { useQuestionStats } from '@/hooks/useQuestionStats';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, BookOpen, CheckCircle2, Users, School, Sparkles, List, Zap, Target, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssignmentScope } from '@/types/class';
import type { MatrixCell } from '@/types/examGeneration';

interface Subject {
  id: string;
  name: string;
  code: string;
  cognitive_levels?: string[];
  question_types?: string[];
}

interface CreatePracticeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
}

type CreationMode = 'auto' | 'manual';
type AutoMode = 'matrix' | 'adaptive' | 'hybrid';

export function CreatePracticeAssignmentDialog({
  open,
  onOpenChange,
  subjects,
}: CreatePracticeAssignmentDialogProps) {
  // Step management
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState<CreationMode>('auto');
  
  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState<number | undefined>();
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>('class');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();

  // Manual mode
  const [taxonomyNodeId, setTaxonomyNodeId] = useState<string | undefined>();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto mode settings
  const [autoMode, setAutoMode] = useState<AutoMode>('hybrid');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficultyRange, setDifficultyRange] = useState<[number, number]>([0.2, 0.8]);
  const [selectedTaxonomyNodes, setSelectedTaxonomyNodes] = useState<string[]>([]);
  const [selectedCognitiveLevels, setSelectedCognitiveLevels] = useState<string[]>([]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['MCQ_SINGLE', 'TRUE_FALSE_4']);

  // Hooks
  const { data: availableClasses } = useClassesForAssignment();
  const createAssignment = useCreatePracticeAssignment();
  const createAdaptiveAssignment = useCreateAdaptiveAssignment();
  const { data: taxonomyNodes } = useTaxonomyNodes(subjectId || undefined);
  const { data: taxonomyTree } = useTaxonomyTree(subjectId || undefined);
  const { data: questionStats, isLoading: statsLoading } = useQuestionStats(subjectId || undefined);
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    subject_id: subjectId,
    taxonomy_node_id: taxonomyNodeId,
    status: 'published',
    search: searchQuery || undefined,
  });

  const questions = questionsData?.data || [];
  const currentSubject = subjects.find(s => s.id === subjectId);
  const cognitiveLevels = (currentSubject?.cognitive_levels as string[]) || ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
  const questionTypes = (currentSubject?.question_types as string[]) || ['MCQ_SINGLE', 'TRUE_FALSE_4', 'SHORT_ANSWER'];

  // Root level taxonomy nodes for selection
  const rootNodes = taxonomyTree?.filter(n => n.level === 0) || [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setCreationMode('auto');
      setTitle('');
      setDescription('');
      setSubjectId('');
      setTaxonomyNodeId(undefined);
      setDuration(undefined);
      setSelectedQuestions([]);
      setSearchQuery('');
      setAssignmentScope('class');
      setSelectedClassId(undefined);
      setAutoMode('hybrid');
      setQuestionCount(10);
      setDifficultyRange([0.2, 0.8]);
      setSelectedTaxonomyNodes([]);
      setSelectedCognitiveLevels([]);
      setSelectedQuestionTypes(['MCQ_SINGLE', 'TRUE_FALSE_4']);
    }
  }, [open]);

  // Set default subject
  useEffect(() => {
    if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  // Manual mode handlers
  const handleSelectQuestion = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedQuestions([...selectedQuestions, id]);
    } else {
      setSelectedQuestions(selectedQuestions.filter(q => q !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  // Toggle selection handlers
  const toggleTaxonomyNode = (nodeId: string) => {
    setSelectedTaxonomyNodes(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  const toggleCognitiveLevel = (level: string) => {
    setSelectedCognitiveLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleQuestionType = (type: string) => {
    setSelectedQuestionTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Calculate available questions for auto mode
  const getAvailableQuestionCount = () => {
    if (!questionStats) return 0;
    
    let count = 0;
    const taxonomyFilter = selectedTaxonomyNodes.length > 0 ? selectedTaxonomyNodes : Object.keys(questionStats.byTaxonomy);
    const cognitiveFilter = selectedCognitiveLevels.length > 0 ? selectedCognitiveLevels : cognitiveLevels;
    const typeFilter = selectedQuestionTypes.length > 0 ? selectedQuestionTypes : questionTypes;

    taxonomyFilter.forEach(taxId => {
      cognitiveFilter.forEach(cog => {
        typeFilter.forEach(type => {
          count += questionStats.matrix[taxId]?.[cog]?.[type] || 0;
        });
      });
    });

    return count;
  };

  const availableCount = getAvailableQuestionCount();

  // Create handlers
  const handleCreateManual = async () => {
    if (!title.trim() || !subjectId || selectedQuestions.length === 0) return;
    if (assignmentScope === 'class' && !selectedClassId) return;

    await createAssignment.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      subject_id: subjectId,
      questions: selectedQuestions,
      duration: duration || undefined,
      show_answers_after_submit: true,
      allow_multiple_attempts: true,
      class_id: assignmentScope === 'class' ? selectedClassId : undefined,
      assignment_scope: assignmentScope,
    });

    onOpenChange(false);
  };

  const handleCreateAuto = async () => {
    if (!title.trim() || !subjectId) return;
    if (assignmentScope === 'class' && !selectedClassId) return;

    await createAdaptiveAssignment.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      subject_id: subjectId,
      question_count: questionCount,
      difficulty_range: difficultyRange,
      taxonomy_node_ids: selectedTaxonomyNodes.length > 0 ? selectedTaxonomyNodes : undefined,
      cognitive_levels: selectedCognitiveLevels.length > 0 ? selectedCognitiveLevels : undefined,
      question_types: selectedQuestionTypes.length > 0 ? selectedQuestionTypes : undefined,
      duration: duration || undefined,
      class_id: assignmentScope === 'class' ? selectedClassId : undefined,
      assignment_scope: assignmentScope,
      auto_mode: autoMode,
    });

    onOpenChange(false);
  };

  const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const isPending = createAssignment.isPending || createAdaptiveAssignment.isPending;

  // Step 1: Basic Info + Mode Selection
  const renderStep1 = () => (
    <div className="space-y-6 py-4">
      {/* Creation Mode Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Chế độ tạo đề</Label>
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setCreationMode('auto')}
            className={cn(
              'p-4 rounded-lg border-2 cursor-pointer transition-all',
              creationMode === 'auto'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'p-2 rounded-lg',
                creationMode === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="font-semibold">Tự động (Khuyến nghị)</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Hệ thống tự chọn câu hỏi phù hợp dựa trên ma trận, độ khó và điểm yếu của học sinh
            </p>
          </div>

          <div
            onClick={() => setCreationMode('manual')}
            className={cn(
              'p-4 rounded-lg border-2 cursor-pointer transition-all',
              creationMode === 'manual'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'p-2 rounded-lg',
                creationMode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <List className="w-5 h-5" />
              </div>
              <div className="font-semibold">Thủ công</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Chọn từng câu hỏi cụ thể cho bài luyện tập
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Tiêu đề *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề bài luyện tập"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả nội dung, yêu cầu..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Môn học *</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn môn học" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Thời gian (phút)</Label>
            <Input
              type="number"
              value={duration || ''}
              onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Không giới hạn"
              min={1}
            />
          </div>
        </div>

        {/* Assignment Scope */}
        <div className="space-y-3">
          <Label>Phạm vi giao bài</Label>
          <RadioGroup
            value={assignmentScope}
            onValueChange={(v) => setAssignmentScope(v as AssignmentScope)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="class" id="class" />
              <Label htmlFor="class" className="flex items-center gap-2 cursor-pointer">
                <School className="w-4 h-4" />
                Giao theo lớp
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer">
                <Users className="w-4 h-4" />
                Chọn từng học sinh
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Class Selection */}
        {assignmentScope === 'class' && (
          <div className="space-y-2">
            <Label>Chọn lớp *</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp để giao bài" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono text-xs mr-2">{c.code}</span>
                    {c.name}
                    {c.subjects && (
                      <span className="text-muted-foreground ml-2">
                        ({c.subjects.name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableClasses?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có lớp nào. Hãy tạo lớp học trước.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Step 2 for Auto mode: Configuration
  const renderAutoStep2 = () => (
    <div className="flex-1 flex flex-col min-h-0 py-4 space-y-6">
      {/* Auto Mode Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Cách thức chọn câu hỏi
        </Label>
        <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => setAutoMode('matrix')}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-all',
              autoMode === 'matrix' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Theo ma trận</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn ngẫu nhiên theo phân loại bạn cấu hình
            </p>
          </div>

          <div
            onClick={() => setAutoMode('adaptive')}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-all',
              autoMode === 'adaptive' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-sm">Thích ứng</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn dựa trên điểm yếu của từng học sinh
            </p>
          </div>

          <div
            onClick={() => setAutoMode('hybrid')}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-all',
              autoMode === 'hybrid' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-sm">Kết hợp</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ma trận + điều chỉnh theo học sinh
            </p>
          </div>
        </div>
      </div>

      {/* Question Count and Difficulty */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Số lượng câu hỏi: {questionCount}</Label>
          <Slider
            value={[questionCount]}
            onValueChange={([v]) => setQuestionCount(v)}
            min={5}
            max={Math.min(50, availableCount || 50)}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Có sẵn: {statsLoading ? '...' : availableCount} câu
          </p>
        </div>

        <div className="space-y-2">
          <Label>Độ khó: {(difficultyRange[0] * 100).toFixed(0)}% - {(difficultyRange[1] * 100).toFixed(0)}%</Label>
          <Slider
            value={difficultyRange}
            onValueChange={(v) => setDifficultyRange(v as [number, number])}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            {difficultyRange[0] <= 0.3 ? 'Dễ' : difficultyRange[0] <= 0.6 ? 'Trung bình' : 'Khó'} → {difficultyRange[1] <= 0.3 ? 'Dễ' : difficultyRange[1] <= 0.6 ? 'Trung bình' : 'Khó'}
          </p>
        </div>
      </div>

      {/* Taxonomy Selection */}
      <div className="space-y-2">
        <Label className="flex items-center justify-between">
          <span>Chương/Phần (để trống = tất cả)</span>
          <span className="text-xs text-muted-foreground">
            {selectedTaxonomyNodes.length > 0 ? `Đã chọn ${selectedTaxonomyNodes.length}` : 'Tất cả'}
          </span>
        </Label>
        <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-24 overflow-y-auto">
          {rootNodes.length > 0 ? rootNodes.map(node => (
            <Badge
              key={node.id}
              variant={selectedTaxonomyNodes.includes(node.id) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleTaxonomyNode(node.id)}
            >
              {node.name}
            </Badge>
          )) : (
            <span className="text-sm text-muted-foreground">Chưa có phân loại</span>
          )}
        </div>
      </div>

      {/* Cognitive Level Selection */}
      <div className="space-y-2">
        <Label className="flex items-center justify-between">
          <span>Mức độ nhận thức (để trống = tất cả)</span>
          <span className="text-xs text-muted-foreground">
            {selectedCognitiveLevels.length > 0 ? `Đã chọn ${selectedCognitiveLevels.length}` : 'Tất cả'}
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {cognitiveLevels.map(level => (
            <Badge
              key={level}
              variant={selectedCognitiveLevels.includes(level) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleCognitiveLevel(level)}
            >
              {level}
            </Badge>
          ))}
        </div>
      </div>

      {/* Question Type Selection */}
      <div className="space-y-2">
        <Label className="flex items-center justify-between">
          <span>Loại câu hỏi *</span>
          <span className="text-xs text-muted-foreground">
            Đã chọn {selectedQuestionTypes.length}
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {questionTypes.map(type => (
            <Badge
              key={type}
              variant={selectedQuestionTypes.includes(type) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleQuestionType(type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Tóm tắt cấu hình
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Số câu:</div>
          <div className="font-medium">{questionCount}</div>
          <div className="text-muted-foreground">Chế độ:</div>
          <div className="font-medium">
            {autoMode === 'matrix' ? 'Theo ma trận' : autoMode === 'adaptive' ? 'Thích ứng' : 'Kết hợp'}
          </div>
          <div className="text-muted-foreground">Độ khó:</div>
          <div className="font-medium">
            {(difficultyRange[0] * 100).toFixed(0)}% - {(difficultyRange[1] * 100).toFixed(0)}%
          </div>
          <div className="text-muted-foreground">Câu hỏi có sẵn:</div>
          <div className={cn("font-medium", availableCount < questionCount && "text-destructive")}>
            {statsLoading ? '...' : availableCount}
            {availableCount < questionCount && ' (không đủ!)'}
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2 for Manual mode: Question Selection (keep existing)
  const renderManualStep2 = () => (
    <div className="flex-1 flex flex-col min-h-0 py-4">
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={taxonomyNodeId || 'all'}
          onValueChange={(v) => setTaxonomyNodeId(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Chương/Bài" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {taxonomyNodes?.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {'  '.repeat(n.level)}{n.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question List */}
      <ScrollArea className="flex-1 border rounded-md">
        {questionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : questions.length > 0 ? (
          <div className="divide-y">
            {/* Select All Header */}
            <div className="p-3 bg-muted/50 sticky top-0">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={questions.length > 0 && selectedQuestions.length === questions.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Chọn tất cả ({questions.length} câu)
                </span>
              </div>
            </div>

            {questions.map((question) => {
              const isSelected = selectedQuestions.includes(question.id);
              return (
                <div
                  key={question.id}
                  className={cn(
                    'p-3 flex items-start gap-3 hover:bg-muted/50 cursor-pointer transition-colors',
                    isSelected && 'bg-primary/5'
                  )}
                  onClick={() => handleSelectQuestion(question.id, !isSelected)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleSelectQuestion(question.id, !!checked)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      {stripHtml(question.content)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {question.question_type}
                      </Badge>
                      {question.cognitive_level && (
                        <Badge variant="secondary" className="text-xs">
                          {question.cognitive_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Không tìm thấy câu hỏi nào</p>
          </div>
        )}
      </ScrollArea>

      {/* Selected Summary */}
      {selectedQuestions.length > 0 && (
        <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="font-medium">
              Đã chọn {selectedQuestions.length} câu hỏi
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedQuestions([])}
          >
            Bỏ chọn tất cả
          </Button>
        </div>
      )}
    </div>
  );

  // Validation
  const canProceedStep1 = title.trim() && subjectId && (assignmentScope === 'individual' || selectedClassId);
  const canCreateManual = selectedQuestions.length > 0;
  const canCreateAuto = questionCount > 0 && selectedQuestionTypes.length > 0 && availableCount >= questionCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Tạo bài luyện tập' : 
              creationMode === 'auto' ? 'Cấu hình tự động' : 'Chọn câu hỏi'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Chọn chế độ tạo đề và nhập thông tin cơ bản'
              : creationMode === 'auto' 
                ? 'Cấu hình tiêu chí để hệ thống tự chọn câu hỏi phù hợp'
                : `Đã chọn ${selectedQuestions.length} câu hỏi`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? renderStep1() : creationMode === 'auto' ? renderAutoStep2() : renderManualStep2()}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Tiếp tục
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button
                onClick={creationMode === 'auto' ? handleCreateAuto : handleCreateManual}
                disabled={
                  isPending || 
                  (creationMode === 'auto' ? !canCreateAuto : !canCreateManual)
                }
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tạo bài luyện tập
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
