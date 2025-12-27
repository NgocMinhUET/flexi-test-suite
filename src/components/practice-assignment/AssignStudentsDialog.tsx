import { useState, useEffect } from 'react';
import { useAssignStudents, useAssignmentStudents } from '@/hooks/usePracticeAssignments';
import { supabase } from '@/integrations/supabase/client';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Users, CheckCircle2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface AssignStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string | null;
}

interface StudentProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function AssignStudentsDialog({
  open,
  onOpenChange,
  assignmentId,
}: AssignStudentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const assignStudents = useAssignStudents();
  const { data: existingStudents } = useAssignmentStudents(assignmentId || '');

  // Fetch all students
  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      // Get all users with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = studentRoles?.map(r => r.user_id) || [];

      if (studentIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      return profiles as StudentProfile[];
    },
    enabled: open,
  });

  // Initialize selected students from existing assignments
  useEffect(() => {
    if (existingStudents) {
      const ids = existingStudents.map((s: any) => s.student_id);
      setSelectedStudents(ids);
    }
  }, [existingStudents]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedStudents([]);
    }
  }, [open]);

  const filteredStudents = allStudents?.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    );
  }) || [];

  const handleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, id]);
    } else {
      setSelectedStudents(selectedStudents.filter(s => s !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleAssign = async () => {
    if (!assignmentId || selectedStudents.length === 0) return;

    await assignStudents.mutateAsync({
      assignmentId,
      studentIds: selectedStudents,
    });

    onOpenChange(false);
  };

  const existingStudentIds = new Set(existingStudents?.map((s: any) => s.student_id) || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Giao bài cho học sinh</DialogTitle>
          <DialogDescription>
            Chọn học sinh để giao bài luyện tập này
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Student List */}
          <ScrollArea className="flex-1 border rounded-md">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="divide-y">
                {/* Select All Header */}
                <div className="p-3 bg-muted/50 sticky top-0">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudents.length === filteredStudents.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      Chọn tất cả ({filteredStudents.length} học sinh)
                    </span>
                  </div>
                </div>

                {filteredStudents.map((student) => {
                  const isSelected = selectedStudents.includes(student.id);
                  const isAlreadyAssigned = existingStudentIds.has(student.id);

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        'p-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer transition-colors',
                        isSelected && 'bg-primary/5'
                      )}
                      onClick={() => handleSelectStudent(student.id, !isSelected)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectStudent(student.id, !!checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{student.full_name || 'Chưa đặt tên'}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      {isAlreadyAssigned && (
                        <Badge variant="secondary" className="shrink-0">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Đã giao
                        </Badge>
                      )}
                      {isSelected && !isAlreadyAssigned && (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Không tìm thấy học sinh nào</p>
              </div>
            )}
          </ScrollArea>

          {/* Selected Summary */}
          {selectedStudents.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  Đã chọn {selectedStudents.length} học sinh
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudents([])}
              >
                Bỏ chọn tất cả
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedStudents.length === 0 || assignStudents.isPending}
          >
            {assignStudents.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Giao bài ({selectedStudents.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
