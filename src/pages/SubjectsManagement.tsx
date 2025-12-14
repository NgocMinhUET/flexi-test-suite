import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/hooks/useSubjects';
import { Subject, SubjectFormData, QuestionType } from '@/types/questionBank';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Code2,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Loader2,
  BookOpen,
  FolderTree,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

const defaultFormData: SubjectFormData = {
  code: '',
  name: '',
  description: '',
  taxonomy_config: { levels: ['Chương', 'Bài', 'Mục'] },
  cognitive_levels: ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'],
  question_types: ['MCQ_SINGLE', 'TRUE_FALSE_4', 'SHORT_ANSWER'],
};

export default function SubjectsManagement() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { data: subjects, isLoading } = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>(defaultFormData);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin) {
      toast.error('Chỉ Admin mới có quyền truy cập trang này');
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, navigate]);

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({
        code: subject.code,
        name: subject.name,
        description: subject.description || '',
        taxonomy_config: subject.taxonomy_config,
        cognitive_levels: subject.cognitive_levels,
        question_types: subject.question_types,
      });
    } else {
      setSelectedSubject(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Vui lòng nhập mã và tên môn học');
      return;
    }

    try {
      if (selectedSubject) {
        await updateSubject.mutateAsync({ id: selectedSubject.id, data: formData });
      } else {
        await createSubject.mutateAsync(formData);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;
    try {
      await deleteSubject.mutateAsync(selectedSubject.id);
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredSubjects = subjects?.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
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
                <p className="text-xs text-muted-foreground">Admin</p>
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
          <span className="text-foreground">Quản lý môn học</span>
        </div>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý môn học</h1>
            <p className="text-muted-foreground">Cấu hình các môn học và phân loại nội dung</p>
          </div>
          <Button variant="hero" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm môn học
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm môn học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Subjects Grid */}
        {filteredSubjects?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Chưa có môn học nào</p>
              <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm môn học đầu tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects?.map((subject) => (
              <Card key={subject.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {subject.code}
                      </Badge>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      {subject.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {subject.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>
                      <strong>Phân loại:</strong> {subject.taxonomy_config.levels.join(' → ')}
                    </p>
                    <p>
                      <strong>Mức độ:</strong> {subject.cognitive_levels.length} mức
                    </p>
                    <p>
                      <strong>Loại câu:</strong> {subject.question_types.length} loại
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/admin/subjects/${subject.id}/taxonomy`}>
                        <FolderTree className="w-4 h-4 mr-1" />
                        Phân loại
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(subject)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedSubject(subject);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin cơ bản của môn học
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="code">Mã môn</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="TOAN"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="name">Tên môn học</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Toán học"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả ngắn về môn học..."
                rows={2}
              />
            </div>

            <div>
              <Label>Cấp độ phân loại (taxonomy)</Label>
              <Input
                value={formData.taxonomy_config.levels.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxonomy_config: { levels: e.target.value.split(',').map((s) => s.trim()) },
                  })
                }
                placeholder="Chương, Bài, Mục"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Phân cách bằng dấu phẩy
              </p>
            </div>

            <div>
              <Label>Mức độ nhận thức</Label>
              <Input
                value={formData.cognitive_levels.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cognitive_levels: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                placeholder="Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Phân cách bằng dấu phẩy
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createSubject.isPending || updateSubject.isPending}
            >
              {(createSubject.isPending || updateSubject.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectedSubject ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa môn học "{selectedSubject?.name}"? Hành động này sẽ xóa tất cả
              phân loại và câu hỏi liên quan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
