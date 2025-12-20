import { useState, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, GraduationCap, ArrowRight, Clock, Users, Repeat, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateExamWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExamMode = 'exam' | 'practice' | null;

export const CreateExamWizardDialog = memo(({
  open,
  onOpenChange,
}: CreateExamWizardDialogProps) => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<ExamMode>(null);

  const handleContinue = useCallback(() => {
    if (selectedMode) {
      onOpenChange(false);
      navigate(`/exam/new?mode=${selectedMode}`);
    }
  }, [selectedMode, navigate, onOpenChange]);

  const handleModeSelect = useCallback((mode: ExamMode) => {
    setSelectedMode(mode);
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSelectedMode(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tạo đề mới</DialogTitle>
          <DialogDescription>
            Chọn mục đích sử dụng để cấu hình phù hợp
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Thi chính thức */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedMode === 'exam' 
                ? "ring-2 ring-primary border-primary" 
                : "hover:border-primary/50"
            )}
            onClick={() => handleModeSelect('exam')}
          >
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Thi chính thức</CardTitle>
              <CardDescription>
                Bài thi có chấm điểm, giới hạn thời gian
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Giới hạn thời gian làm bài
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Gán thí sinh cụ thể
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  Chỉ làm 1 lần, lưu kết quả
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Luyện tập */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedMode === 'practice' 
                ? "ring-2 ring-accent border-accent" 
                : "hover:border-accent/50"
            )}
            onClick={() => handleModeSelect('practice')}
          >
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <GraduationCap className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Bài luyện tập</CardTitle>
              <CardDescription>
                Học sinh tự luyện, xem đáp án sau khi nộp
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-accent" />
                  Làm lại không giới hạn
                </li>
                <li className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-accent" />
                  Xem đáp án và giải thích
                </li>
                <li className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-accent" />
                  Công khai hoặc gán riêng
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            variant="hero" 
            onClick={handleContinue}
            disabled={!selectedMode}
            className="gap-2"
          >
            Tiếp tục
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CreateExamWizardDialog.displayName = 'CreateExamWizardDialog';