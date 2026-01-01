import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  Users,
  BookOpen,
  Calendar,
  UserPlus,
  MoreVertical,
  Trash2,
  Edit,
  Search,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { 
  useClass, 
  useClassStudents,
  useRemoveStudent,
  useUpdateEnrollment,
} from '@/hooks/useClasses';
import { AddStudentsDialog } from '@/components/class/AddStudentsDialog';
import { CreateClassDialog } from '@/components/class/CreateClassDialog';
import type { EnrollmentStatus, ClassMemberRole } from '@/types/class';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: classData, isLoading: classLoading } = useClass(id);
  const { data: students, isLoading: studentsLoading } = useClassStudents(id);
  const removeStudent = useRemoveStudent();
  const updateEnrollment = useUpdateEnrollment();

  const [searchQuery, setSearchQuery] = useState('');
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);

  if (authLoading || classLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!classData) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Không tìm thấy lớp học</h2>
        <p className="text-muted-foreground mb-4">Lớp học không tồn tại hoặc bạn không có quyền truy cập</p>
        <Button onClick={() => navigate('/classes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  const filteredStudents = students?.filter(s => {
    const query = searchQuery.toLowerCase();
    return (
      s.profiles?.full_name?.toLowerCase().includes(query) ||
      s.profiles?.email?.toLowerCase().includes(query)
    );
  }) || [];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleStatusChange = async (enrollmentId: string, status: EnrollmentStatus) => {
    await updateEnrollment.mutateAsync({ id: enrollmentId, status });
  };

  const handleRoleChange = async (enrollmentId: string, role: ClassMemberRole) => {
    await updateEnrollment.mutateAsync({ id: enrollmentId, role });
  };

  const confirmRemoveStudent = async () => {
    if (studentToRemove && id) {
      await removeStudent.mutateAsync({ 
        enrollmentId: studentToRemove.id, 
        classId: id 
      });
      setStudentToRemove(null);
    }
  };

  const activeStudents = students?.filter(s => s.status === 'active').length || 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/classes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono">
                {classData.code}
              </Badge>
              {classData.is_active ? (
                <Badge className="bg-green-500/10 text-green-600">Đang hoạt động</Badge>
              ) : (
                <Badge variant="secondary">Ngừng hoạt động</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{classData.name}</h1>
            {classData.description && (
              <p className="text-muted-foreground mt-1">{classData.description}</p>
            )}
          </div>
        </div>
        
        <Button variant="outline" onClick={() => setEditClassOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Chỉnh sửa
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Học sinh</p>
                <p className="text-xl font-bold">{activeStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {classData.subjects && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Môn học</p>
                  <p className="text-lg font-medium">{classData.subjects.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {classData.academic_year && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Năm học</p>
                  <p className="text-lg font-medium">{classData.academic_year}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <ClipboardList className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sĩ số tối đa</p>
                <p className="text-lg font-medium">{classData.max_students || 50}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Danh sách học sinh
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Bài tập
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          {/* Student toolbar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm học sinh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setAddStudentsOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Thêm học sinh
            </Button>
          </div>

          {/* Students table */}
          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="p-8 text-center">
                  <Skeleton className="h-64" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {searchQuery ? 'Không tìm thấy học sinh' : 'Chưa có học sinh trong lớp'}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? 'Thử thay đổi từ khóa tìm kiếm'
                      : 'Bắt đầu bằng cách thêm học sinh vào lớp'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setAddStudentsOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Thêm học sinh
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học sinh</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tham gia</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(enrollment => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={enrollment.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(enrollment.profiles?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {enrollment.profiles?.full_name || 'Chưa có tên'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {enrollment.profiles?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={enrollment.role}
                            onValueChange={(value: ClassMemberRole) => 
                              handleRoleChange(enrollment.id, value)
                            }
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Học sinh</SelectItem>
                              <SelectItem value="monitor">Lớp trưởng</SelectItem>
                              <SelectItem value="deputy">Lớp phó</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={enrollment.status}
                            onValueChange={(value: EnrollmentStatus) => 
                              handleStatusChange(enrollment.id, value)
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Đang học</SelectItem>
                              <SelectItem value="inactive">Tạm nghỉ</SelectItem>
                              <SelectItem value="dropped">Nghỉ học</SelectItem>
                              <SelectItem value="graduated">Đã tốt nghiệp</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy', { locale: vi })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setStudentToRemove({
                                  id: enrollment.id,
                                  name: enrollment.profiles?.full_name || 'học sinh này'
                                })}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa khỏi lớp
                              </DropdownMenuItem>
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
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Bài tập của lớp</span>
                <Button onClick={() => navigate('/practice-assignments', { state: { classId: id } })}>
                  <FileText className="h-4 w-4 mr-2" />
                  Giao bài tập
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Tính năng quản lý bài tập theo lớp sẽ được cập nhật
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddStudentsDialog
        open={addStudentsOpen}
        onOpenChange={setAddStudentsOpen}
        classId={id || ''}
        className={classData.name}
      />

      <CreateClassDialog
        open={editClassOpen}
        onOpenChange={setEditClassOpen}
        editingClass={classData}
      />

      <AlertDialog open={!!studentToRemove} onOpenChange={() => setStudentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa học sinh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {studentToRemove?.name} khỏi lớp? 
              Học sinh vẫn có thể được thêm lại sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveStudent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeStudent.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
