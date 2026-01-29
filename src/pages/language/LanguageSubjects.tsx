import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Plus, 
  Languages, 
  Edit, 
  Trash2, 
  FolderTree 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  useLangSubjects, 
  useCreateLangSubject, 
  useUpdateLangSubject,
  useDeleteLangSubject 
} from '@/hooks/useLangSubjects';
import { SKILL_TYPE_LABELS, PROFICIENCY_LEVEL_LABELS } from '@/types/language';
import type { LangSubject, LangSubjectFormData, SkillType, ProficiencyLevel } from '@/types/language';

const DEFAULT_SKILLS: SkillType[] = ['listening', 'reading', 'writing', 'speaking'];
const DEFAULT_LEVELS: ProficiencyLevel[] = ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced'];

export default function LanguageSubjects() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = useAuth();
  const { data: subjects, isLoading } = useLangSubjects();
  const createSubject = useCreateLangSubject();
  const updateSubject = useUpdateLangSubject();
  const deleteSubject = useDeleteLangSubject();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<LangSubject | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<LangSubjectFormData>({
    code: '',
    name: '',
    description: '',
    icon: 'Languages',
    skill_types: DEFAULT_SKILLS,
    proficiency_levels: DEFAULT_LEVELS,
  });

  const isEducator = isAdmin || isTeacher;

  const handleOpenDialog = (subject?: LangSubject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        code: subject.code,
        name: subject.name,
        description: subject.description || '',
        icon: subject.icon || 'Languages',
        skill_types: subject.skill_types as SkillType[],
        proficiency_levels: subject.proficiency_levels as ProficiencyLevel[],
      });
    } else {
      setEditingSubject(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        icon: 'Languages',
        skill_types: DEFAULT_SKILLS,
        proficiency_levels: DEFAULT_LEVELS,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingSubject) {
      await updateSubject.mutateAsync({ id: editingSubject.id, data: formData });
    } else {
      await createSubject.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteSubjectId) {
      await deleteSubject.mutateAsync(deleteSubjectId);
      setDeleteSubjectId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/language')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Môn học Ngoại ngữ</h1>
              <p className="text-muted-foreground">Quản lý các ngôn ngữ trong hệ thống</p>
            </div>
          </div>
          
          {isEducator && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm môn học
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                  </DialogTitle>
                  <DialogDescription>
                    Điền thông tin môn học ngoại ngữ
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mã môn</Label>
                      <Input
                        placeholder="VD: CN, EN, JP"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tên môn học</Label>
                      <Input
                        placeholder="VD: Tiếng Trung"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      placeholder="Mô tả về môn học..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kỹ năng</Label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(SKILL_TYPE_LABELS) as SkillType[]).map((skill) => (
                        <Badge
                          key={skill}
                          variant={formData.skill_types.includes(skill) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const newSkills = formData.skill_types.includes(skill)
                              ? formData.skill_types.filter(s => s !== skill)
                              : [...formData.skill_types, skill];
                            setFormData({ ...formData, skill_types: newSkills });
                          }}
                        >
                          {SKILL_TYPE_LABELS[skill]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.code || !formData.name || createSubject.isPending || updateSubject.isPending}
                  >
                    {editingSubject ? 'Cập nhật' : 'Tạo'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Subject List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
        ) : subjects?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Languages className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có môn học nào</p>
              {isEducator && (
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm môn học đầu tiên
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects?.map((subject) => (
              <Card key={subject.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Languages className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground">{subject.code}</p>
                      </div>
                    </div>
                    
                    {isEducator && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/language/subjects/${subject.id}/taxonomy`)}
                          title="Quản lý phân loại"
                        >
                          <FolderTree className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(subject)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSubjectId(subject.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {subject.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {subject.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-3">
                    {(subject.skill_types as SkillType[]).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {SKILL_TYPE_LABELS[skill]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteSubjectId} onOpenChange={() => setDeleteSubjectId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn xóa môn học này? Tất cả câu hỏi và bài thi liên quan sẽ bị xóa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
