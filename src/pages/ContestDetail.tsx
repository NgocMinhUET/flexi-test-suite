import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  useContest, 
  useDistributeExams, 
  useUpdateContestStatus,
  useRemoveParticipant,
  useDeleteContest
} from '@/hooks/useContests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ArrowLeft, Users, FileText, Shuffle, Play, CheckCircle, Trash2, Loader2, Wand2, BarChart3, Pencil } from 'lucide-react';
import { AddExamsToContestDialog } from '@/components/contest/AddExamsToContestDialog';
import { AddParticipantsDialog } from '@/components/contest/AddParticipantsDialog';
import { GenerateExamsDialog } from '@/components/contest/GenerateExamsDialog';
import { EditContestDialog } from '@/components/contest/EditContestDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Nháp', variant: 'secondary' },
  ready: { label: 'Sẵn sàng', variant: 'outline' },
  active: { label: 'Đang diễn ra', variant: 'default' },
  completed: { label: 'Hoàn thành', variant: 'destructive' },
};

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const { data: contest, isLoading } = useContest(id);
  const distributeExams = useDistributeExams();
  const updateStatus = useUpdateContestStatus();
  const removeParticipant = useRemoveParticipant();
  const deleteContest = useDeleteContest();

  const [addExamsOpen, setAddExamsOpen] = useState(false);
  const [addParticipantsOpen, setAddParticipantsOpen] = useState(false);
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [generateExamsOpen, setGenerateExamsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch profiles for participants
  const { data: profiles } = useQuery({
    queryKey: ['profiles', contest?.participants.map(p => p.user_id)],
    queryFn: async () => {
      if (!contest?.participants.length) return {};
      const userIds = contest.participants.map(p => p.user_id);
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const profileMap: Record<string, { email: string; full_name: string }> = {};
      data?.forEach(p => {
        profileMap[p.id] = { email: p.email || '', full_name: p.full_name || '' };
      });
      return profileMap;
    },
    enabled: !!contest?.participants.length,
  });

  // Fetch exam titles
  const { data: examTitles } = useQuery({
    queryKey: ['exam-titles', contest?.exams.map(e => e.exam_id)],
    queryFn: async () => {
      if (!contest?.exams.length) return {};
      const examIds = contest.exams.map(e => e.exam_id);
      const { data } = await supabase
        .from('exams')
        .select('id, title')
        .in('id', examIds);
      
      const titleMap: Record<string, string> = {};
      data?.forEach(e => {
        titleMap[e.id] = e.title;
      });
      return titleMap;
    },
    enabled: !!contest?.exams.length,
  });

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isTeacher))) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, isTeacher, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isTeacher)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Không tìm thấy cuộc thi</div>
      </div>
    );
  }

  const status = statusLabels[contest.status];
  const canEdit = contest.status === 'draft';
  const canAddParticipants = contest.status !== 'completed'; // Allow adding participants during active contests
  const canDistribute = contest.exam_count > 0 && contest.participant_count > 0;
  const hasUnassigned = contest.assigned_count < contest.participant_count;

  const handleDistribute = async () => {
    await distributeExams.mutateAsync(contest.id);
    setDistributeDialogOpen(false);
  };

  const handleMarkReady = async () => {
    await updateStatus.mutateAsync({ contestId: contest.id, status: 'ready' });
  };

  const handleActivate = async () => {
    await updateStatus.mutateAsync({ contestId: contest.id, status: 'active' });
  };

  const handleDelete = async () => {
    await deleteContest.mutateAsync(contest.id);
    navigate('/contests');
  };

  const getAssignedVariant = (examId: string | undefined) => {
    if (!examId) return null;
    const contestExam = contest.exams.find(e => e.exam_id === examId);
    return contestExam?.variant_code;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contests')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{contest.name}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-muted-foreground">{contest.subject}</p>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Sửa
                </Button>
              )}
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
              <Button variant="outline" onClick={() => navigate(`/contests/${id}/statistics`)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Thống kê
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Số đề thi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contest.exam_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Thí sinh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contest.participant_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Đã phân phối</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contest.assigned_count}/{contest.participant_count}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Phân phối</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={contest.distribution_status === 'distributed' ? 'default' : 'secondary'}>
                {contest.distribution_status === 'distributed' ? 'Đã phân phối' : 'Chưa phân phối'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Action buttons */}
        {canEdit && (
          <div className="flex gap-2 mb-6">
            {canDistribute && hasUnassigned && (
              <Button onClick={() => setDistributeDialogOpen(true)} disabled={distributeExams.isPending}>
                <Shuffle className="h-4 w-4 mr-2" />
                Phân phối đề
              </Button>
            )}
            {contest.distribution_status === 'distributed' && (
              <Button onClick={handleMarkReady} variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Đánh dấu sẵn sàng
              </Button>
            )}
          </div>
        )}

        {contest.status === 'ready' && (
          <div className="flex gap-2 mb-6">
            <Button onClick={handleActivate}>
              <Play className="h-4 w-4 mr-2" />
              Bắt đầu cuộc thi
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="exams">
          <TabsList>
            <TabsTrigger value="exams">
              <FileText className="h-4 w-4 mr-2" />
              Đề thi ({contest.exam_count})
            </TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="h-4 w-4 mr-2" />
              Thí sinh ({contest.participant_count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exams">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Danh sách đề thi</CardTitle>
                    <CardDescription>Các mã đề trong cuộc thi</CardDescription>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button onClick={() => setGenerateExamsOpen(true)} variant="default">
                        <Wand2 className="h-4 w-4 mr-2" />
                        Sinh đề từ ma trận
                      </Button>
                      <Button onClick={() => setAddExamsOpen(true)} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Thêm đề có sẵn
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {contest.exams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có đề thi nào. Thêm đề từ trang sinh đề hoặc đề có sẵn.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đề</TableHead>
                        <TableHead>Tên đề thi</TableHead>
                        <TableHead className="text-center">Số thí sinh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contest.exams.map((exam) => {
                        const assignedCount = contest.participants.filter(
                          p => p.assigned_exam_id === exam.exam_id
                        ).length;
                        return (
                          <TableRow key={exam.id}>
                            <TableCell className="font-mono font-medium">{exam.variant_code}</TableCell>
                            <TableCell>{examTitles?.[exam.exam_id] || 'Đang tải...'}</TableCell>
                            <TableCell className="text-center">{assignedCount}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Danh sách thí sinh</CardTitle>
                    <CardDescription>Thí sinh tham gia cuộc thi</CardDescription>
                  </div>
                  {canAddParticipants && (
                    <Button onClick={() => setAddParticipantsOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Thêm thí sinh
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {contest.participants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có thí sinh nào. Thêm thí sinh hoặc import từ CSV.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Họ tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mã đề được gán</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contest.participants.map((participant) => {
                        const profile = profiles?.[participant.user_id];
                        const variant = getAssignedVariant(participant.assigned_exam_id);
                        return (
                          <TableRow key={participant.id}>
                            <TableCell>{profile?.full_name || 'N/A'}</TableCell>
                            <TableCell>{profile?.email || 'N/A'}</TableCell>
                            <TableCell>
                              {variant ? (
                                <Badge variant="outline" className="font-mono">{variant}</Badge>
                              ) : (
                                <span className="text-muted-foreground">Chưa gán</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {canEdit && !participant.assigned_exam_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeParticipant.mutate({ 
                                    contestId: contest.id, 
                                    participantId: participant.id 
                                  })}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AddExamsToContestDialog
        open={addExamsOpen}
        onOpenChange={setAddExamsOpen}
        contestId={contest.id}
        existingExamIds={contest.exams.map(e => e.exam_id)}
      />

      <AddParticipantsDialog
        open={addParticipantsOpen}
        onOpenChange={setAddParticipantsOpen}
        contestId={contest.id}
        existingUserIds={contest.participants.map(p => p.user_id)}
      />

      <GenerateExamsDialog
        open={generateExamsOpen}
        onOpenChange={setGenerateExamsOpen}
        contestId={contest.id}
        contestSubject={contest.subject}
      />

      <AlertDialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Phân phối đề thi</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống sẽ tự động phân phối {contest.exam_count} mã đề cho{' '}
              {contest.participant_count - contest.assigned_count} thí sinh chưa được gán, 
              đảm bảo số lượng thí sinh mỗi đề cân bằng nhất có thể.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDistribute} disabled={distributeExams.isPending}>
              {distributeExams.isPending ? 'Đang phân phối...' : 'Phân phối'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditContestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contest={contest}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cuộc thi</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa cuộc thi "{contest.name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteContest.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContest.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
