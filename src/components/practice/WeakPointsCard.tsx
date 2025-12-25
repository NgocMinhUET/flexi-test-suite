import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkillMasteries } from '@/hooks/usePractice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, TrendingDown, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeakPointsCardProps {
  subjectId?: string;
  limit?: number;
  showPracticeButton?: boolean;
}

export function WeakPointsCard({ subjectId, limit = 5, showPracticeButton = true }: WeakPointsCardProps) {
  const navigate = useNavigate();
  const { data: masteries, isLoading } = useSkillMasteries(subjectId);

  const weakPoints = useMemo(() => {
    if (!masteries) return [];
    
    return masteries
      .filter(m => m.mastery_level < 40 && m.questions_attempted >= 3)
      .sort((a, b) => a.mastery_level - b.mastery_level)
      .slice(0, limit);
  }, [masteries, limit]);

  const startWeakPointPractice = () => {
    navigate(`/practice/session?type=weak_point_focus${subjectId ? `&subject=${subjectId}` : ''}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Điểm yếu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Điểm yếu cần cải thiện
        </CardTitle>
      </CardHeader>
      <CardContent>
        {weakPoints.length > 0 ? (
          <div className="space-y-4">
            {weakPoints.map((skill, index) => {
              const accuracy = skill.questions_attempted > 0 
                ? Math.round((skill.questions_correct / skill.questions_attempted) * 100)
                : 0;
              
              return (
                <div key={skill.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-red-500 mt-0.5">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={skill.taxonomy_node?.name}>
                        {skill.taxonomy_node?.name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress 
                          value={skill.mastery_level} 
                          className="h-1.5 flex-1 [&>div]:bg-red-500"
                        />
                        <span className="text-xs font-semibold text-red-600 w-10 text-right">
                          {Math.round(skill.mastery_level)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {accuracy}% đúng
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {skill.questions_correct}/{skill.questions_attempted} câu
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {showPracticeButton && (
              <Button 
                className="w-full mt-2" 
                variant="destructive"
                onClick={startWeakPointPractice}
              >
                <Play className="h-4 w-4 mr-2" />
                Luyện tập điểm yếu
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-green-700">Tuyệt vời!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bạn không có điểm yếu nào cần cải thiện
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
