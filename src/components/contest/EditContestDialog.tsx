import { useState, useEffect } from 'react';
import { useUpdateContest } from '@/hooks/useContests';
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
import type { Contest } from '@/types/contest';

interface EditContestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contest: Contest;
}

export function EditContestDialog({ open, onOpenChange, contest }: EditContestDialogProps) {
  const updateContest = useUpdateContest();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (open && contest) {
      setName(contest.name);
      setDescription(contest.description || '');
      setStartTime(contest.start_time ? contest.start_time.slice(0, 16) : '');
      setEndTime(contest.end_time ? contest.end_time.slice(0, 16) : '');
    }
  }, [open, contest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await updateContest.mutateAsync({
      contestId: contest.id,
      data: {
        name: name.trim(),
        description: description.trim() || null,
        start_time: startTime || null,
        end_time: endTime || null,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cuộc thi</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cuộc thi
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
              <Label htmlFor="subject">Môn học</Label>
              <Input
                id="subject"
                value={contest.subject}
                disabled
                className="bg-muted"
              />
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
            <Button type="submit" disabled={!name.trim() || updateContest.isPending}>
              {updateContest.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
