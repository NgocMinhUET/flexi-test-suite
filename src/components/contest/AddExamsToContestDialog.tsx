import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAddExamsToContest } from '@/hooks/useContests';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddExamsToContestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contestId: string;
  existingExamIds: string[];
}

export function AddExamsToContestDialog({ 
  open, 
  onOpenChange, 
  contestId,
  existingExamIds 
}: AddExamsToContestDialogProps) {
  const addExams = useAddExamsToContest();
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());

  // Fetch available exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ['available-exams-for-contest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, subject, total_questions, duration')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch generated exams to get variant codes
  const { data: generatedExams } = useQuery({
    queryKey: ['generated-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_exams')
        .select('exam_id, variant_code');

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const availableExams = exams?.filter(e => !existingExamIds.includes(e.id)) || [];

  const getVariantCode = (examId: string) => {
    const generated = generatedExams?.find(g => g.exam_id === examId);
    return generated?.variant_code || examId.substring(0, 6).toUpperCase();
  };

  const toggleExam = (examId: string) => {
    const newSet = new Set(selectedExams);
    if (newSet.has(examId)) {
      newSet.delete(examId);
    } else {
      newSet.add(examId);
    }
    setSelectedExams(newSet);
  };

  const handleSubmit = async () => {
    if (selectedExams.size === 0) return;

    const examsToAdd = Array.from(selectedExams).map(examId => ({
      exam_id: examId,
      variant_code: getVariantCode(examId),
    }));

    await addExams.mutateAsync({ contestId, exams: examsToAdd });
    setSelectedExams(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Thêm đề thi vào cuộc thi</DialogTitle>
          <DialogDescription>
            Chọn các đề thi để thêm vào cuộc thi. Mỗi đề sẽ được gán một mã đề riêng.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Đang tải...</div>
        ) : availableExams.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Không có đề thi khả dụng. Hãy tạo đề mới từ trang sinh đề.
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {availableExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => toggleExam(exam.id)}
                >
                  <Checkbox
                    checked={selectedExams.has(exam.id)}
                    onCheckedChange={() => toggleExam(exam.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{exam.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {exam.subject} • {exam.total_questions} câu • {exam.duration} phút
                    </div>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground">
                    {getVariantCode(exam.id)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedExams.size === 0 || addExams.isPending}
          >
            {addExams.isPending ? 'Đang thêm...' : `Thêm ${selectedExams.size} đề`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
