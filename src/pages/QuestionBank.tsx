import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/hooks/useSubjects';
import { useTaxonomyNodes } from '@/hooks/useTaxonomy';
import { useQuestions, useBulkDeleteQuestions, useApproveQuestion, useRejectQuestion, usePublishQuestion, useBulkSubmitForReview, useBulkApproveQuestions, useBulkPublishQuestions } from '@/hooks/useQuestions';
import { Question, QuestionFilters, QuestionStatus, QuestionType } from '@/types/questionBank';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Code2,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Loader2,
  Search,
  MoreHorizontal,
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Filter,
  Upload,
} from 'lucide-react';
import { ImportQuestionsDialog } from '@/components/question-bank/ImportQuestionsDialog';
import { DuplicateCleanupDialog } from '@/components/question-bank/DuplicateCleanupDialog';
import { useDuplicateQuestions } from '@/hooks/useDuplicateQuestions';
import { toast } from 'sonner';

const statusLabels: Record<QuestionStatus, string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
};

const statusColors: Record<QuestionStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  review: 'outline',
  approved: 'default',
  published: 'default',
};

const questionTypeLabels: Record<QuestionType, string> = {
  MCQ_SINGLE: 'Trắc nghiệm',
  TRUE_FALSE_4: 'Đúng/Sai',
  SHORT_ANSWER: 'Trả lời ngắn',
  CODING: 'Lập trình',
};

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function QuestionBank() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();

  const [filters, setFilters] = useState<QuestionFilters>({ subject_id: '' });
  const { data: taxonomyNodes } = useTaxonomyNodes(filters.subject_id || undefined);
  const { data: questions, isLoading: questionsLoading } = useQuestions(filters);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

  const { data: duplicateGroups } = useDuplicateQuestions(filters.subject_id || undefined);

  const bulkDelete = useBulkDeleteQuestions();
  const bulkSubmitForReview = useBulkSubmitForReview();
  const bulkApprove = useBulkApproveQuestions();
  const bulkPublish = useBulkPublishQuestions();
  const approveQuestion = useApproveQuestion();
  const rejectQuestion = useRejectQuestion();
  const publishQuestion = usePublishQuestion();

  const selectedSubject = subjects?.find((s) => s.id === filters.subject_id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin && !isTeacher) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, authLoading, isAdmin, isTeacher, navigate]);

  // Set default subject
  useEffect(() => {
    if (subjects?.length && !filters.subject_id) {
      setFilters((f) => ({ ...f, subject_id: subjects[0].id }));
    }
  }, [subjects, filters.subject_id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && questions) {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkSubmitForReview = async () => {
    if (selectedIds.size === 0) return;
    const draftIds = questions?.filter(q => selectedIds.has(q.id) && q.status === 'draft').map(q => q.id) || [];
    if (draftIds.length === 0) {
      toast.error('Không có câu hỏi nháp nào được chọn');
      return;
    }
    await bulkSubmitForReview.mutateAsync(draftIds);
    setSelectedIds(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const reviewIds = questions?.filter(q => selectedIds.has(q.id) && q.status === 'review').map(q => q.id) || [];
    if (reviewIds.length === 0) {
      toast.error('Không có câu hỏi chờ duyệt nào được chọn');
      return;
    }
    await bulkApprove.mutateAsync(reviewIds);
    setSelectedIds(new Set());
  };

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return;
    const approvedIds = questions?.filter(q => selectedIds.has(q.id) && q.status === 'approved').map(q => q.id) || [];
    if (approvedIds.length === 0) {
      toast.error('Không có câu hỏi đã duyệt nào được chọn');
      return;
    }
    await bulkPublish.mutateAsync(approvedIds);
    setSelectedIds(new Set());
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    await rejectQuestion.mutateAsync({ id: rejectingId, reason: rejectionReason });
    setRejectDialogOpen(false);
    setRejectingId(null);
    setRejectionReason('');
  };

  const isLoading = authLoading || subjectsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-gradient">Pro</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Admin' : 'Giáo viên'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Ngân hàng câu hỏi</span>
        </div>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ngân hàng câu hỏi</h1>
            <p className="text-muted-foreground">Quản lý và tổ chức câu hỏi theo môn học</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedSubject && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setCleanupDialogOpen(true)}
                  className={duplicateGroups && duplicateGroups.length > 0 ? 'border-destructive/50 text-destructive hover:bg-destructive/10' : ''}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Dọn trùng lặp
                  {duplicateGroups && duplicateGroups.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {duplicateGroups.reduce((sum, g) => sum + g.questions.length - 1, 0)}
                    </Badge>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Excel
                </Button>
              </>
            )}
            <Button variant="hero" asChild>
              <Link to="/questions/new">
                <Plus className="w-4 h-4 mr-2" />
                Thêm câu hỏi
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Subject */}
              <Select
                value={filters.subject_id}
                onValueChange={(value) =>
                  setFilters({ ...filters, subject_id: value, taxonomy_node_id: undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Taxonomy */}
              <Select
                value={filters.taxonomy_node_id || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, taxonomy_node_id: value === 'all' ? undefined : value })
                }
                disabled={!filters.subject_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chương/Bài" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {taxonomyNodes?.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {'  '.repeat(n.level)}{n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Cognitive Level */}
              <Select
                value={filters.cognitive_level || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, cognitive_level: value === 'all' ? undefined : value })
                }
                disabled={!filters.subject_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mức độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {selectedSubject?.cognitive_levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Question Type */}
              <Select
                value={filters.question_type || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    question_type: value === 'all' ? undefined : (value as QuestionType),
                  })
                }
                disabled={!filters.subject_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Loại câu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="MCQ_SINGLE">Trắc nghiệm</SelectItem>
                  <SelectItem value="TRUE_FALSE_4">Đúng/Sai</SelectItem>
                  <SelectItem value="SHORT_ANSWER">Trả lời ngắn</SelectItem>
                </SelectContent>
              </Select>

              {/* Status */}
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === 'all' ? undefined : (value as QuestionStatus),
                  })
                }
                disabled={!filters.subject_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="review">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="published">Đã xuất bản</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nội dung câu hỏi..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
                disabled={!filters.subject_id}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground mr-2">
              Đã chọn {selectedIds.size} câu hỏi
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkSubmitForReview}
              disabled={bulkSubmitForReview.isPending}
            >
              <Send className="w-4 h-4 mr-1" />
              Gửi duyệt
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkApprove.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Duyệt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkPublish}
                  disabled={bulkPublish.isPending}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Xuất bản
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Xóa
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Bỏ chọn
            </Button>
          </div>
        )}

        {/* Questions Table */}
        <Card>
          <CardContent className="p-0">
            {!filters.subject_id ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Vui lòng chọn môn học</p>
              </div>
            ) : questionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : questions?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Không có câu hỏi nào</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/questions/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm câu hỏi đầu tiên
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={questions?.length > 0 && selectedIds.size === questions.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-24">Mã</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="w-32">Chương</TableHead>
                    <TableHead className="w-28">Mức độ</TableHead>
                    <TableHead className="w-28">Loại</TableHead>
                    <TableHead className="w-28">Trạng thái</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions?.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(question.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(question.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {question.code || question.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">
                          {stripHtml(question.content).slice(0, 100)}
                          {stripHtml(question.content).length > 100 && '...'}
                        </p>
                        {question.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Lý do từ chối: {question.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {question.taxonomy_path?.join(' > ') || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{question.cognitive_level || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {questionTypeLabels[question.question_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[question.status]}>
                          {statusLabels[question.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/questions/${question.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Xem chi tiết
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/questions/${question.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                              </Link>
                            </DropdownMenuItem>

                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                {question.status === 'review' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => approveQuestion.mutate(question.id)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2 text-success" />
                                      Duyệt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setRejectingId(question.id);
                                        setRejectDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 mr-2 text-destructive" />
                                      Từ chối
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {question.status === 'approved' && (
                                  <DropdownMenuItem
                                    onClick={() => publishQuestion.mutate(question.id)}
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    Xuất bản
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối câu hỏi</DialogTitle>
            <DialogDescription>
              Nhập lý do từ chối để giáo viên có thể chỉnh sửa
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reason">Lý do</Label>
            <Textarea
              id="reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nội dung chưa rõ ràng, cần bổ sung..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectQuestion.isPending}
            >
              {rejectQuestion.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {selectedSubject && (
        <ImportQuestionsDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          subject={{
            id: selectedSubject.id,
            name: selectedSubject.name,
            code: selectedSubject.code,
            cognitive_levels: selectedSubject.cognitive_levels as string[],
            taxonomy_config: selectedSubject.taxonomy_config as { levels: string[] },
          }}
          taxonomyNodes={taxonomyNodes || []}
        />
      )}

      {/* Duplicate Cleanup Dialog */}
      <DuplicateCleanupDialog
        open={cleanupDialogOpen}
        onOpenChange={setCleanupDialogOpen}
        subjectId={filters.subject_id}
      />
    </div>
  );
}
