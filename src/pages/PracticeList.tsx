import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeConfigs, usePracticeAttempts } from '@/hooks/usePractice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Clock, 
  RotateCcw,
  History,
  Play,
  ChevronRight,
  Infinity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PracticeList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: practiceConfigs, isLoading } = usePracticeConfigs();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bài luyện tập</h1>
        <p className="text-muted-foreground mt-1">
          Luyện tập không giới hạn, xem đáp án và lời giải chi tiết
        </p>
      </div>

      {practiceConfigs && practiceConfigs.length > 0 ? (
        <div className="grid gap-4">
          {practiceConfigs.map((config: any) => (
            <PracticeExamCard 
              key={config.id} 
              config={config} 
              onStart={() => navigate(`/practice/exam/${config.exam_id}`)}
              onHistory={() => navigate(`/practice/exam/${config.exam_id}/history`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Chưa có bài luyện tập nào</h3>
            <p className="text-muted-foreground">
              Giáo viên sẽ tạo các bài luyện tập để bạn có thể thực hành
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PracticeExamCardProps {
  config: any;
  onStart: () => void;
  onHistory: () => void;
}

function PracticeExamCard({ config, onStart, onHistory }: PracticeExamCardProps) {
  const { data: attempts } = usePracticeAttempts(config.exam_id);
  const exam = config.exams;

  const bestScore = attempts?.length 
    ? Math.max(...attempts.map(a => a.score)) 
    : null;
  const attemptCount = attempts?.length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{exam?.title || 'Bài luyện tập'}</h3>
              <Badge variant="outline">{exam?.subject}</Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{exam?.total_questions || 0} câu</span>
              </div>
              
              {config.time_limit_enabled ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{config.time_limit_minutes} phút</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  <span>Không giới hạn thời gian</span>
                </div>
              )}

              {attemptCount > 0 && (
                <div className="flex items-center gap-1">
                  <RotateCcw className="h-4 w-4" />
                  <span>Đã làm {attemptCount} lần</span>
                </div>
              )}
            </div>

            {bestScore !== null && (
              <div className="mt-3">
                <Badge 
                  variant="secondary"
                  className={cn(
                    bestScore >= 80 && "bg-green-100 text-green-700",
                    bestScore >= 50 && bestScore < 80 && "bg-yellow-100 text-yellow-700",
                    bestScore < 50 && "bg-red-100 text-red-700"
                  )}
                >
                  Điểm cao nhất: {Math.round(bestScore)}%
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={onStart}>
              <Play className="h-4 w-4 mr-2" />
              {attemptCount > 0 ? 'Làm lại' : 'Bắt đầu'}
            </Button>
            
            {attemptCount > 0 && (
              <Button variant="outline" size="sm" onClick={onHistory}>
                <History className="h-4 w-4 mr-2" />
                Lịch sử
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
