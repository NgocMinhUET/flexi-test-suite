import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyClasses } from '@/hooks/useClasses';

export default function MyClasses() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: enrolledClasses, isLoading: classesLoading } = useMyClasses();

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'monitor':
        return <Badge className="bg-yellow-500/10 text-yellow-600">Lớp trưởng</Badge>;
      case 'deputy':
        return <Badge className="bg-blue-500/10 text-blue-600">Lớp phó</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
            Lớp học của tôi
          </h1>
          <p className="text-muted-foreground text-sm">
            Các lớp học bạn đang tham gia
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số lớp</p>
                <p className="text-2xl font-bold">{enrolledClasses?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Môn học</p>
                <p className="text-2xl font-bold">
                  {new Set(enrolledClasses?.map(c => c.class.subject_id).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class list */}
      {classesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !enrolledClasses || enrolledClasses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Bạn chưa tham gia lớp nào</h3>
            <p className="text-muted-foreground">
              Liên hệ với giáo viên để được thêm vào lớp học
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrolledClasses.map(enrollment => (
            <Card 
              key={enrollment.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/student-practice-assignments?class=${enrollment.class.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {enrollment.class.code}
                      </Badge>
                      {getRoleBadge(enrollment.role)}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {enrollment.class.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {enrollment.class.subjects && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4" />
                          <span>{enrollment.class.subjects.name}</span>
                        </div>
                      )}
                      {enrollment.class.academic_year && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{enrollment.class.academic_year}</span>
                        </div>
                      )}
                      {enrollment.class.student_count !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>{enrollment.class.student_count} học sinh</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/student-practice-assignments?class=${enrollment.class.id}`);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Xem bài tập
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
