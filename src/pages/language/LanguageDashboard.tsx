import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Headphones, 
  PenTool, 
  Mic,
  Settings,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLangSubjects } from '@/hooks/useLangSubjects';

export default function LanguageDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, roles } = useAuth();
  const { data: subjects, isLoading } = useLangSubjects();

  const isEducator = isAdmin || isTeacher;
  const isStudent = roles.includes('student') && !isEducator;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Thi Ngoại ngữ</h1>
              <p className="text-muted-foreground">
                Hệ thống thi và luyện tập ngoại ngữ độc lập
              </p>
            </div>
          </div>
        </div>

        {/* Skill Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Headphones className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">Nghe</p>
                <p className="text-sm text-muted-foreground">Listening</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary/50 border-secondary">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-secondary">
                <BookOpen className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">Đọc</p>
                <p className="text-sm text-muted-foreground">Reading</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-accent/50 border-accent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-accent">
                <PenTool className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">Viết</p>
                <p className="text-sm text-muted-foreground">Writing</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted border-muted-foreground/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-muted-foreground/20">
                <Mic className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">Nói</p>
                <p className="text-sm text-muted-foreground">Speaking</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Subjects */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/language/subjects')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Môn học Ngoại ngữ
              </CardTitle>
              <CardDescription>
                {isEducator ? 'Quản lý các môn ngoại ngữ' : 'Xem danh sách môn học'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {isLoading ? '...' : subjects?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">môn học</p>
            </CardContent>
          </Card>

          {/* Question Bank - Educators only */}
          {isEducator && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/language/questions')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Ngân hàng câu hỏi
                </CardTitle>
                <CardDescription>
                  Tạo và quản lý câu hỏi ngoại ngữ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo câu hỏi mới
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Exam Management - Educators only */}
          {isEducator && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/language/exams')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Quản lý đề thi
                </CardTitle>
                <CardDescription>
                  Tạo và quản lý bài thi ngoại ngữ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo đề thi mới
                </Button>
              </CardContent>
            </Card>
          )}

          {/* My Exams - Students */}
          {isStudent && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/language/my-exams')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Bài thi của tôi
                </CardTitle>
                <CardDescription>
                  Xem các bài thi được giao
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Xem danh sách
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
