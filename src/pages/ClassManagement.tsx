import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  GraduationCap, 
  ArrowLeft,
  LayoutGrid,
  List
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useClasses, useDeleteClass } from '@/hooks/useClasses';
import { ClassCard } from '@/components/class/ClassCard';
import { CreateClassDialog } from '@/components/class/CreateClassDialog';
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
import type { ClassWithDetails } from '@/types/class';

export default function ClassManagement() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const deleteClass = useDeleteClass();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const filteredClasses = classes?.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);

    return matchesSearch && matchesStatus;
  }) || [];

  const handleEdit = (classData: ClassWithDetails) => {
    setEditingClass(classData);
    setCreateDialogOpen(true);
  };

  const handleDelete = (classId: string) => {
    setClassToDelete(classId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (classToDelete) {
      await deleteClass.mutateAsync(classToDelete);
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Quản lý lớp học
            </h1>
            <p className="text-muted-foreground text-sm">
              Tạo và quản lý các lớp học, thêm học sinh vào lớp
            </p>
          </div>
        </div>
        
        <Button onClick={() => {
          setEditingClass(null);
          setCreateDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo lớp mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc mã lớp..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Tổng số lớp</p>
          <p className="text-2xl font-bold">{classes?.length || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <p className="text-2xl font-bold text-green-600">
            {classes?.filter(c => c.is_active).length || 0}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Tổng học sinh</p>
          <p className="text-2xl font-bold">
            {classes?.reduce((sum, c) => sum + (c.student_count || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Trung bình/lớp</p>
          <p className="text-2xl font-bold">
            {classes?.length 
              ? Math.round(classes.reduce((sum, c) => sum + (c.student_count || 0), 0) / classes.length)
              : 0
            }
          </p>
        </div>
      </div>

      {/* Class list */}
      {classesLoading ? (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || statusFilter !== 'all' 
              ? 'Không tìm thấy lớp học' 
              : 'Chưa có lớp học nào'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Thử thay đổi bộ lọc tìm kiếm'
              : 'Bắt đầu bằng cách tạo lớp học đầu tiên'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo lớp đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredClasses.map(classData => (
            <ClassCard
              key={classData.id}
              classData={classData}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <CreateClassDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingClass(null);
        }}
        editingClass={editingClass}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa lớp học</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lớp học này? Hành động này không thể hoàn tác.
              Tất cả dữ liệu liên quan sẽ bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClass.isPending ? 'Đang xóa...' : 'Xóa lớp'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
