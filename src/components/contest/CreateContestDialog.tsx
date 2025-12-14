import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjects } from '@/hooks/useSubjects';
import { useCreateContest } from '@/hooks/useContests';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateContestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContestDialog({ open, onOpenChange }: CreateContestDialogProps) {
  const navigate = useNavigate();
  const { data: subjects } = useSubjects();
  const createContest = useCreateContest();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const selectedSubject = subjects?.find(s => s.id === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !selectedSubject) return;

    const contest = await createContest.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      subject: selectedSubject.name,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
    });

    onOpenChange(false);
    setName('');
    setDescription('');
    setSubjectId('');
    setStartTime('');
    setEndTime('');
    
    navigate(`/contests/${contest.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tạo cuộc thi mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin cơ bản cho cuộc thi. Bạn có thể thêm đề và thí sinh sau.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên cuộc thi *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Kỳ thi giữa kỳ - Lớp 10A1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Môn học *</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả thêm về cuộc thi (không bắt buộc)"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Thời gian bắt đầu</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Thời gian kết thúc</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim() || !subjectId || createContest.isPending}>
              {createContest.isPending ? 'Đang tạo...' : 'Tạo cuộc thi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
