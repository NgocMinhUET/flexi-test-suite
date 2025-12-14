import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContests, useDeleteContest, useUpdateContestStatus } from '@/hooks/useContests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, MoreVertical, Eye, Trash2, Play, CheckCircle } from 'lucide-react';
import { CreateContestDialog } from '@/components/contest/CreateContestDialog';
import type { ContestWithDetails } from '@/types/contest';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Nháp', variant: 'secondary' },
  ready: { label: 'Sẵn sàng', variant: 'outline' },
  active: { label: 'Đang diễn ra', variant: 'default' },
  completed: { label: 'Hoàn thành', variant: 'destructive' },
};

export default function ContestManagement() {
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher } = useAuth();
  const { data: contests, isLoading } = useContests();
  const deleteContest = useDeleteContest();
  const updateStatus = useUpdateContestStatus();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState<ContestWithDetails | null>(null);

  if (!user || (!isAdmin && !isTeacher)) {
    navigate('/auth');
    return null;
  }

  const handleDelete = (contest: ContestWithDetails) => {
    setSelectedContest(contest);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedContest) {
      await deleteContest.mutateAsync(selectedContest.id);
      setDeleteDialogOpen(false);
      setSelectedContest(null);
    }
  };

  const handleActivate = async (contestId: string) => {
    await updateStatus.mutateAsync({ contestId, status: 'active' });
  };

  const handleComplete = async (contestId: string) => {
    await updateStatus.mutateAsync({ contestId, status: 'completed' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Quản lý Cuộc thi</h1>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo cuộc thi
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách cuộc thi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : contests?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có cuộc thi nào. Nhấn "Tạo cuộc thi" để bắt đầu.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên cuộc thi</TableHead>
                    <TableHead>Môn học</TableHead>
                    <TableHead className="text-center">Số đề</TableHead>
                    <TableHead className="text-center">Thí sinh</TableHead>
                    <TableHead className="text-center">Đã phân phối</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests?.map((contest) => {
                    const status = statusLabels[contest.status];
                    return (
                      <TableRow key={contest.id}>
                        <TableCell className="font-medium">{contest.name}</TableCell>
                        <TableCell>{contest.subject}</TableCell>
                        <TableCell className="text-center">{contest.exam_count}</TableCell>
                        <TableCell className="text-center">{contest.participant_count}</TableCell>
                        <TableCell className="text-center">
                          {contest.assigned_count}/{contest.participant_count}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/contests/${contest.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Chi tiết
                              </DropdownMenuItem>
                              {contest.status === 'ready' && (
                                <DropdownMenuItem onClick={() => handleActivate(contest.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Bắt đầu
                                </DropdownMenuItem>
                              )}
                              {contest.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleComplete(contest.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Kết thúc
                                </DropdownMenuItem>
                              )}
                              {contest.status === 'draft' && (
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(contest)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Xóa
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateContestDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa cuộc thi "{selectedContest?.name}"? Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
