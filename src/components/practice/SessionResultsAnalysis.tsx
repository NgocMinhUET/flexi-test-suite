import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target,
  ChevronRight,
  Play,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PracticeQuestionResult } from '@/types/practice';

interface SessionResultsAnalysisProps {
  results: Record<string, PracticeQuestionResult>;
  questions: {
    id: string;
    taxonomy_node_id: string;
    difficulty: number;
  }[];
  taxonomyMap?: Map<string, string>; // taxonomy_node_id -> name
  onPracticeWeakPoints?: () => void;
  subjectId?: string;
}

interface TopicPerformance {
  taxonomyId: string;
  name: string;
  correct: number;
  total: number;
  accuracy: number;
}

export function SessionResultsAnalysis({ 
  results, 
  questions, 
  taxonomyMap,
  onPracticeWeakPoints,
  subjectId
}: SessionResultsAnalysisProps) {
  const navigate = useNavigate();

  // Analyze performance by topic
  const topicAnalysis = useMemo(() => {
    const topicMap = new Map<string, { correct: number; total: number; name: string }>();

    questions.forEach(q => {
      if (!q.taxonomy_node_id) return;
      const result = results[q.id];
      if (!result) return;

      const existing = topicMap.get(q.taxonomy_node_id) || { 
        correct: 0, 
        total: 0, 
        name: taxonomyMap?.get(q.taxonomy_node_id) || 'Chủ đề' 
      };
      
      topicMap.set(q.taxonomy_node_id, {
        correct: existing.correct + (result.isCorrect ? 1 : 0),
        total: existing.total + 1,
        name: existing.name
      });
    });

    const topics: TopicPerformance[] = [];
    topicMap.forEach((value, key) => {
      topics.push({
        taxonomyId: key,
        name: value.name,
        correct: value.correct,
        total: value.total,
        accuracy: Math.round((value.correct / value.total) * 100)
      });
    });

    return topics.sort((a, b) => a.accuracy - b.accuracy);
  }, [results, questions, taxonomyMap]);

  // Analyze performance by difficulty
  const difficultyAnalysis = useMemo(() => {
    const difficultyMap: Record<number, { correct: number; total: number }> = {
      1: { correct: 0, total: 0 },
      2: { correct: 0, total: 0 },
      3: { correct: 0, total: 0 },
      4: { correct: 0, total: 0 },
      5: { correct: 0, total: 0 }
    };

    questions.forEach(q => {
      const result = results[q.id];
      if (!result) return;
      
      const difficulty = Math.round(q.difficulty || 3);
      if (difficultyMap[difficulty]) {
        difficultyMap[difficulty].total += 1;
        if (result.isCorrect) {
          difficultyMap[difficulty].correct += 1;
        }
      }
    });

    return Object.entries(difficultyMap)
      .filter(([_, stats]) => stats.total > 0)
      .map(([level, stats]) => ({
        level: parseInt(level),
        correct: stats.correct,
        total: stats.total,
        accuracy: Math.round((stats.correct / stats.total) * 100)
      }));
  }, [results, questions]);

  const weakTopics = topicAnalysis.filter(t => t.accuracy < 50);
  const strongTopics = topicAnalysis.filter(t => t.accuracy >= 80);

  const handlePracticeWeakPoints = () => {
    if (onPracticeWeakPoints) {
      onPracticeWeakPoints();
    } else {
      navigate(`/practice/session?type=weak_point_focus${subjectId ? `&subject=${subjectId}` : ''}`);
    }
  };

  if (topicAnalysis.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Weak Topics Alert */}
      {weakTopics.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Chủ đề cần cải thiện
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakTopics.slice(0, 3).map(topic => (
              <div key={topic.taxonomyId} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{topic.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress 
                      value={topic.accuracy} 
                      className="h-1.5 w-24 [&>div]:bg-red-500"
                    />
                    <span className="text-xs text-red-600">
                      {topic.correct}/{topic.total} đúng
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="border-red-300 text-red-600">
                  {topic.accuracy}%
                </Badge>
              </div>
            ))}
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full mt-2"
              onClick={handlePracticeWeakPoints}
            >
              <Play className="h-3 w-3 mr-1" />
              Luyện tập ngay
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Strong Topics */}
      {strongTopics.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              Chủ đề làm tốt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {strongTopics.slice(0, 3).map(topic => (
                <Badge 
                  key={topic.taxonomyId} 
                  variant="outline" 
                  className="border-green-300 text-green-700"
                >
                  {topic.name}: {topic.accuracy}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Difficulty Breakdown */}
      {difficultyAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Hiệu suất theo độ khó
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-20">
              {difficultyAnalysis.map(d => (
                <div key={d.level} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={cn(
                      "w-full rounded-t transition-all",
                      d.accuracy >= 70 ? "bg-green-500" : d.accuracy >= 40 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ height: `${Math.max(10, d.accuracy * 0.6)}px` }}
                  />
                  <span className="text-xs font-medium">{d.accuracy}%</span>
                  <span className="text-xs text-muted-foreground">M{d.level}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => navigate('/practice/skills')}
        >
          <Target className="h-3 w-3 mr-1" />
          Xem phân tích chi tiết
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
