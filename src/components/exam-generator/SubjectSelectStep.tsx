import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText } from 'lucide-react';
import type { QuestionStats } from '@/types/examGeneration';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

interface SubjectSelectStepProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelect: (subjectId: string) => void;
  questionStats?: QuestionStats;
}

export function SubjectSelectStep({
  subjects,
  selectedSubjectId,
  onSelect,
  questionStats,
}: SubjectSelectStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Chọn môn học để bắt đầu tạo đề thi từ ngân hàng câu hỏi
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => (
          <Card
            key={subject.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedSubjectId === subject.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelect(subject.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground">{subject.code}</p>
                  {subject.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {subject.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSubjectId && questionStats && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Thống kê câu hỏi đã xuất bản
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">{questionStats.total}</p>
                <p className="text-sm text-muted-foreground">Tổng câu hỏi</p>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {Object.keys(questionStats.byTaxonomy).length}
                </p>
                <p className="text-sm text-muted-foreground">Phần/Chương</p>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {Object.keys(questionStats.byCognitiveLevel).length}
                </p>
                <p className="text-sm text-muted-foreground">Mức độ nhận thức</p>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {Object.keys(questionStats.byType).length}
                </p>
                <p className="text-sm text-muted-foreground">Loại câu hỏi</p>
              </div>
            </div>

            {questionStats.total === 0 && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                  ⚠️ Chưa có câu hỏi nào được xuất bản cho môn học này. 
                  Vui lòng xuất bản câu hỏi trước khi tạo đề.
                </p>
              </div>
            )}

            {questionStats.total > 0 && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Theo loại câu hỏi:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(questionStats.byType).map(([type, count]) => (
                      <Badge key={type} variant="secondary">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Theo mức độ:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(questionStats.byCognitiveLevel).map(([level, count]) => (
                      <Badge key={level} variant="outline">
                        {level}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
