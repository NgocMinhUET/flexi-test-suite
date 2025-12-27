import { useState, useEffect } from 'react';
import { useCreatePracticeAssignment } from '@/hooks/usePracticeAssignments';
import { useQuestions } from '@/hooks/useQuestions';
import { useTaxonomyNodes } from '@/hooks/useTaxonomy';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface CreatePracticeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
}

export function CreatePracticeAssignmentDialog({
  open,
  onOpenChange,
  subjects,
}: CreatePracticeAssignmentDialogProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [taxonomyNodeId, setTaxonomyNodeId] = useState<string | undefined>();
  const [duration, setDuration] = useState<number | undefined>();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const createAssignment = useCreatePracticeAssignment();
  const { data: taxonomyNodes } = useTaxonomyNodes(subjectId || undefined);
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    subject_id: subjectId,
    taxonomy_node_id: taxonomyNodeId,
    status: 'published',
    search: searchQuery || undefined,
  });

  const questions = questionsData?.data || [];

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setStep(1);
      setTitle('');
      setDescription('');
      setSubjectId('');
      setTaxonomyNodeId(undefined);
      setDuration(undefined);
      setSelectedQuestions([]);
      setSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

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

  const handleCreate = async () => {
    if (!title.trim() || !subjectId || selectedQuestions.length === 0) return;

    await createAssignment.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      subject_id: subjectId,
      questions: selectedQuestions,
      duration: duration || undefined,
      show_answers_after_submit: true,
      allow_multiple_attempts: true,
    });

    onOpenChange(false);
  };

  const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Thông tin bài luyện tập' : 'Chọn câu hỏi'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Nhập thông tin cơ bản cho bài luyện tập'
              : `Đã chọn ${selectedQuestions.length} câu hỏi`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
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
                rows={3}
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
          </div>
        ) : (
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
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!title.trim() || !subjectId}
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
                onClick={handleCreate}
                disabled={selectedQuestions.length === 0 || createAssignment.isPending}
              >
                {createAssignment.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Tạo bài luyện tập
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
