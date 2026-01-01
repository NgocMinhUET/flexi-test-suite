import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookOpen, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import type { ClassWithDetails } from '@/types/class';

interface ClassCardProps {
  classData: ClassWithDetails;
  onEdit?: (classData: ClassWithDetails) => void;
  onDelete?: (classId: string) => void;
}

export function ClassCard({ classData, onEdit, onDelete }: ClassCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1" onClick={() => navigate(`/classes/${classData.id}`)}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {classData.code}
              </Badge>
              {classData.is_active ? (
                <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  Đang hoạt động
                </Badge>
              ) : (
                <Badge variant="secondary">Ngừng hoạt động</Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {classData.name}
            </CardTitle>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/classes/${classData.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(classData)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(classData.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa lớp
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent onClick={() => navigate(`/classes/${classData.id}`)}>
        {classData.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {classData.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{classData.student_count || 0} học sinh</span>
          </div>
          
          {classData.subjects && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span>{classData.subjects.name}</span>
            </div>
          )}
          
          {classData.academic_year && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{classData.academic_year}</span>
            </div>
          )}
        </div>
        
        {(classData.grade_level || classData.semester) && (
          <div className="flex gap-2 mt-3">
            {classData.grade_level && (
              <Badge variant="secondary" className="text-xs">
                {classData.grade_level}
              </Badge>
            )}
            {classData.semester && (
              <Badge variant="secondary" className="text-xs">
                {classData.semester}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
