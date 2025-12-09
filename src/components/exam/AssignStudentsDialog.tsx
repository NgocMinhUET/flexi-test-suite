import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  isAssigned: boolean;
}

interface AssignStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  onSuccess?: () => void;
}

export const AssignStudentsDialog = ({
  open,
  onOpenChange,
  examId,
  examTitle,
  onSuccess,
}: AssignStudentsDialogProps) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open, examId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // Fetch all students (users with student role)
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = (studentRoles || []).map(r => r.user_id);

      if (studentIds.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles for these students
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Fetch current assignments for this exam
      const { data: assignments, error: assignmentsError } = await supabase
        .from('exam_assignments')
        .select('user_id')
        .eq('exam_id', examId);

      if (assignmentsError) throw assignmentsError;

      const assignedIds = new Set((assignments || []).map(a => a.user_id));

      const studentList: Student[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email || '',
        full_name: p.full_name,
        isAssigned: assignedIds.has(p.id),
      }));

      setStudents(studentList);
      setSelectedStudents(new Set(studentList.filter(s => s.isAssigned).map(s => s.id)));
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Lỗi khi tải danh sách sinh viên');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const filtered = filteredStudents;
    const allSelected = filtered.every(s => selectedStudents.has(s.id));
    
    if (allSelected) {
      setSelectedStudents(prev => {
        const newSet = new Set(prev);
        filtered.forEach(s => newSet.delete(s.id));
        return newSet;
      });
    } else {
      setSelectedStudents(prev => {
        const newSet = new Set(prev);
        filtered.forEach(s => newSet.add(s.id));
        return newSet;
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current assignments
      const { data: currentAssignments, error: fetchError } = await supabase
        .from('exam_assignments')
        .select('user_id')
        .eq('exam_id', examId);

      if (fetchError) throw fetchError;

      const currentIds = new Set((currentAssignments || []).map(a => a.user_id));
      
      // Determine additions and deletions
      const toAdd = Array.from(selectedStudents).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !selectedStudents.has(id));

      // Delete removed assignments
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('exam_assignments')
          .delete()
          .eq('exam_id', examId)
          .in('user_id', toRemove);

        if (deleteError) throw deleteError;
      }

      // Add new assignments
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map(userId => ({
          exam_id: examId,
          user_id: userId,
          assigned_by: user?.id,
        }));

        const { error: insertError } = await supabase
          .from('exam_assignments')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      toast.success(`Đã cập nhật ${selectedStudents.size} thí sinh cho bài thi`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Lỗi khi lưu phân công');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    return (
      s.email.toLowerCase().includes(query) ||
      (s.full_name?.toLowerCase() || '').includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gán thí sinh
          </DialogTitle>
          <DialogDescription>
            Chọn thí sinh được phép làm bài thi "{examTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không có sinh viên nào trong hệ thống
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Đã chọn: {selectedStudents.size}/{students.length} sinh viên
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {filteredStudents.every(s => selectedStudents.has(s.id))
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleToggleStudent(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {student.full_name || 'Chưa cập nhật tên'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
