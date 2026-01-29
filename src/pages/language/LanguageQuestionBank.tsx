import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLangSubjects } from '@/hooks/useLangSubjects';
import { useLangQuestions, useDeleteLangQuestion, useUpdateLangQuestionStatus } from '@/hooks/useLangQuestions';
import { 
  LANG_QUESTION_TYPE_LABELS, 
  SKILL_TYPE_LABELS,
  PROFICIENCY_LEVEL_LABELS,
  type LangQuestionType,
  type SkillType,
  type LangQuestionStatus 
} from '@/types/language';

const STATUS_COLORS: Record<LangQuestionStatus, string> = {
  draft: 'bg-gray-500',
  review: 'bg-yellow-500',
  approved: 'bg-blue-500',
  published: 'bg-green-500',
};

const STATUS_LABELS: Record<LangQuestionStatus, string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
};

export default function LanguageQuestionBank() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = useAuth();
  
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: subjects } = useLangSubjects();
  const { data: questions, isLoading } = useLangQuestions({
    subject_id: selectedSubject || undefined,
    skill_type: skillFilter !== 'all' ? skillFilter as SkillType : undefined,
    question_type: typeFilter !== 'all' ? typeFilter as LangQuestionType : undefined,
    status: statusFilter !== 'all' ? statusFilter as LangQuestionStatus : undefined,
    search: searchQuery || undefined,
  });

  const deleteQuestion = useDeleteLangQuestion();
  const updateStatus = useUpdateLangQuestionStatus();

  const isEducator = isAdmin || isTeacher;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/language')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Ngân hàng câu hỏi Ngoại ngữ</h1>
              <p className="text-muted-foreground">Quản lý câu hỏi cho các kỹ năng ngôn ngữ</p>
            </div>
          </div>
          
          {isEducator && selectedSubject && (
            <Button onClick={() => navigate(`/language/questions/new?subject=${selectedSubject}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo câu hỏi
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Kỹ năng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kỹ năng</SelectItem>
                  {Object.entries(SKILL_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Loại câu hỏi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {Object.entries(LANG_QUESTION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm câu hỏi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question List */}
        {!selectedSubject ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Vui lòng chọn môn học để xem câu hỏi</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
        ) : questions?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chưa có câu hỏi nào</p>
              {isEducator && (
                <Button className="mt-4" onClick={() => navigate(`/language/questions/new?subject=${selectedSubject}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo câu hỏi đầu tiên
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions?.map((question) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={STATUS_COLORS[question.status]}>
                          {STATUS_LABELS[question.status]}
                        </Badge>
                        <Badge variant="outline">
                          {SKILL_TYPE_LABELS[question.skill_type as SkillType]}
                        </Badge>
                        <Badge variant="secondary">
                          {LANG_QUESTION_TYPE_LABELS[question.question_type as LangQuestionType]}
                        </Badge>
                        {question.proficiency_level && (
                          <Badge variant="outline" className="text-xs">
                            {PROFICIENCY_LEVEL_LABELS[question.proficiency_level as keyof typeof PROFICIENCY_LEVEL_LABELS]}
                          </Badge>
                        )}
                      </div>
                      
                      <div 
                        className="text-sm line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: question.content }}
                      />
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {question.estimated_time}s
                        </span>
                        <span>{question.points} điểm</span>
                        <span>Độ khó: {Math.round(question.difficulty * 100)}%</span>
                      </div>
                    </div>

                    {isEducator && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/language/questions/${question.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          
                          {question.status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: question.id, status: 'review' })}>
                              <Clock className="h-4 w-4 mr-2" />
                              Gửi duyệt
                            </DropdownMenuItem>
                          )}
                          
                          {question.status === 'review' && isAdmin && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: question.id, status: 'approved' })}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Phê duyệt
                            </DropdownMenuItem>
                          )}
                          
                          {question.status === 'approved' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: question.id, status: 'published' })}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Xuất bản
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => deleteQuestion.mutate(question.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
