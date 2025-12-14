import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAddParticipantsToContest } from '@/hooks/useContests';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AddParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contestId: string;
  existingUserIds: string[];
}

export function AddParticipantsDialog({ 
  open, 
  onOpenChange, 
  contestId,
  existingUserIds 
}: AddParticipantsDialogProps) {
  const addParticipants = useAddParticipantsToContest();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [csvEmails, setCsvEmails] = useState('');

  // Fetch students
  const { data: students, isLoading } = useQuery({
    queryKey: ['students-for-contest'],
    queryFn: async () => {
      // Get all users with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = studentRoles.map(r => r.user_id);
      
      if (studentIds.length === 0) return [];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', studentIds);

      if (profilesError) throw profilesError;
      return profiles;
    },
    enabled: open,
  });

  const availableStudents = students?.filter(s => !existingUserIds.includes(s.id)) || [];

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const selectAll = () => {
    setSelectedUsers(new Set(availableStudents.map(s => s.id)));
  };

  const handleManualSubmit = async () => {
    if (selectedUsers.size === 0) return;

    await addParticipants.mutateAsync({ 
      contestId, 
      userIds: Array.from(selectedUsers) 
    });
    setSelectedUsers(new Set());
    onOpenChange(false);
  };

  const handleCsvSubmit = async () => {
    const emails = csvEmails
      .split(/[\n,;]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      toast.error('Vui lòng nhập email thí sinh');
      return;
    }

    // Find user IDs by email
    const matchedStudents = students?.filter(s => 
      s.email && emails.includes(s.email.toLowerCase()) && !existingUserIds.includes(s.id)
    ) || [];

    if (matchedStudents.length === 0) {
      toast.error('Không tìm thấy thí sinh nào khớp với danh sách email');
      return;
    }

    const notFound = emails.filter(email => 
      !students?.some(s => s.email?.toLowerCase() === email)
    );

    if (notFound.length > 0) {
      toast.warning(`Không tìm thấy ${notFound.length} email: ${notFound.slice(0, 3).join(', ')}${notFound.length > 3 ? '...' : ''}`);
    }

    await addParticipants.mutateAsync({ 
      contestId, 
      userIds: matchedStudents.map(s => s.id) 
    });
    setCsvEmails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Thêm thí sinh vào cuộc thi</DialogTitle>
          <DialogDescription>
            Chọn thí sinh từ danh sách hoặc nhập email từ file CSV.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Chọn thủ công</TabsTrigger>
            <TabsTrigger value="csv">Import từ CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Đang tải...</div>
            ) : availableStudents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Không có thí sinh khả dụng hoặc tất cả đã được thêm vào cuộc thi.
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    {availableStudents.length} thí sinh khả dụng
                  </span>
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Chọn tất cả
                  </Button>
                </div>
                <ScrollArea className="h-[300px] pr-4 border rounded-lg">
                  <div className="space-y-1 p-2">
                    {availableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleUser(student.id)}
                      >
                        <Checkbox
                          checked={selectedUsers.has(student.id)}
                          onCheckedChange={() => toggleUser(student.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{student.full_name || 'Chưa có tên'}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleManualSubmit} 
                    disabled={selectedUsers.size === 0 || addParticipants.isPending}
                  >
                    {addParticipants.isPending ? 'Đang thêm...' : `Thêm ${selectedUsers.size} thí sinh`}
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>

          <TabsContent value="csv" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-emails">Danh sách email (mỗi dòng 1 email hoặc phân cách bằng dấu phẩy)</Label>
                <Textarea
                  id="csv-emails"
                  value={csvEmails}
                  onChange={(e) => setCsvEmails(e.target.value)}
                  placeholder="sv1@example.com&#10;sv2@example.com&#10;sv3@example.com"
                  rows={10}
                  className="mt-2 font-mono text-sm"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleCsvSubmit} 
                  disabled={!csvEmails.trim() || addParticipants.isPending}
                >
                  {addParticipants.isPending ? 'Đang thêm...' : 'Import thí sinh'}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
