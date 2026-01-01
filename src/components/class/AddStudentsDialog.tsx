import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Users } from 'lucide-react';
import { useAvailableStudents, useBulkEnrollStudents } from '@/hooks/useClasses';

interface AddStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
}

export function AddStudentsDialog({ 
  open, 
  onOpenChange, 
  classId,
  className 
}: AddStudentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  const { data: availableStudents, isLoading } = useAvailableStudents(classId);
  const bulkEnroll = useBulkEnrollStudents();

  const filteredStudents = availableStudents?.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  }) || [];

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) return;

    try {
      await bulkEnroll.mutateAsync({
        class_id: classId,
        student_ids: selectedStudents,
      });
      setSelectedStudents([]);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Thêm học sinh vào {className}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select all */}
          {filteredStudents.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8"
              >
                <Users className="h-4 w-4 mr-2" />
                {selectedStudents.length === filteredStudents.length
                  ? 'Bỏ chọn tất cả'
                  : 'Chọn tất cả'}
              </Button>
              <span className="text-sm text-muted-foreground">
                Đã chọn: {selectedStudents.length}/{filteredStudents.length}
              </span>
            </div>
          )}

          {/* Student list */}
          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Đang tải...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p>Không tìm thấy học sinh</p>
                <p className="text-xs">Tất cả học sinh đã được thêm vào lớp</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedStudents.includes(student.id)
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleToggleStudent(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {student.full_name || 'Chưa có tên'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedStudents.length === 0 || bulkEnroll.isPending}
            >
              {bulkEnroll.isPending 
                ? 'Đang thêm...' 
                : `Thêm ${selectedStudents.length} học sinh`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
