import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSkillMasteries, useSkillProfile, usePracticeSessions } from '@/hooks/usePractice';
import { useSubjects } from '@/hooks/useSubjects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Play,
  BarChart3,
  PieChart
} from 'lucide-react';
import { getMasteryLevel, MASTERY_LEVELS } from '@/types/practice';
import { cn } from '@/lib/utils';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface SkillCategory {
  name: string;
  skills: {
    id: string;
    name: string;
    mastery: number;
    attempted: number;
    correct: number;
  }[];
}

export default function SkillsAnalysis() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const { data: profile, isLoading: profileLoading } = useSkillProfile();
  const { data: masteries, isLoading: masteriesLoading } = useSkillMasteries(selectedSubject || undefined);
  const { data: recentSessions } = usePracticeSessions(20);
  const { data: subjects } = useSubjects();

  // Categorize skills by mastery level
  const categorizedSkills = useMemo(() => {
    if (!masteries) return { weak: [], reinforcing: [], strong: [] };

    const weak: typeof masteries = [];
    const reinforcing: typeof masteries = [];
    const strong: typeof masteries = [];

    masteries.forEach(m => {
      if (m.mastery_level < 40) {
        weak.push(m);
      } else if (m.mastery_level < 70) {
        reinforcing.push(m);
      } else {
        strong.push(m);
      }
    });

    return { weak, reinforcing, strong };
  }, [masteries]);

  // Prepare data for radar chart (top 8 skills)
  const radarData = useMemo(() => {
    if (!masteries || masteries.length === 0) return [];
    
    return masteries.slice(0, 8).map(m => ({
      skill: m.taxonomy_node?.name?.substring(0, 15) || 'Unknown',
      mastery: Math.round(m.mastery_level),
      fullMark: 100
    }));
  }, [masteries]);

  // Prepare data for difficulty breakdown
  const difficultyData = useMemo(() => {
    if (!masteries) return [];
    
    const difficultyStats: Record<number, { correct: number; attempted: number }> = {
      1: { correct: 0, attempted: 0 },
      2: { correct: 0, attempted: 0 },
      3: { correct: 0, attempted: 0 },
      4: { correct: 0, attempted: 0 },
      5: { correct: 0, attempted: 0 }
    };

    masteries.forEach(m => {
      if (m.difficulty_stats) {
        const stats = m.difficulty_stats as Record<string, { attempted: number; correct: number }>;
        Object.entries(stats).forEach(([diff, data]) => {
          const level = parseInt(diff);
          if (difficultyStats[level]) {
            difficultyStats[level].correct += data.correct;
            difficultyStats[level].attempted += data.attempted;
          }
        });
      }
    });

    return Object.entries(difficultyStats).map(([level, stats]) => ({
      difficulty: `Mức ${level}`,
      accuracy: stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0,
      total: stats.attempted
    }));
  }, [masteries]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!profile) return null;
    
    const accuracy = profile.total_questions_attempted > 0
      ? (profile.total_correct_answers / profile.total_questions_attempted) * 100
      : 0;

    return {
      totalQuestions: profile.total_questions_attempted,
      correctAnswers: profile.total_correct_answers,
      accuracy: Math.round(accuracy),
      practiceTime: profile.total_practice_time_minutes,
      streak: profile.current_streak
    };
  }, [profile]);

  const startWeakPointPractice = () => {
    navigate(`/practice/session?type=weak_point_focus${selectedSubject ? `&subject=${selectedSubject}` : ''}`);
  };

  if (profileLoading || masteriesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/adaptive-practice')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Phân tích kỹ năng</h1>
            <p className="text-muted-foreground">Xem chi tiết điểm mạnh và điểm yếu của bạn</p>
          </div>
        </div>
        <Select value={selectedSubject || "all"} onValueChange={(v) => setSelectedSubject(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả môn học" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn học</SelectItem>
            {subjects?.map(subject => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{overallStats.totalQuestions}</p>
              <p className="text-sm text-muted-foreground">Câu đã làm</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{overallStats.correctAnswers}</p>
              <p className="text-sm text-muted-foreground">Câu đúng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{overallStats.accuracy}%</p>
              <p className="text-sm text-muted-foreground">Độ chính xác</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{overallStats.practiceTime}</p>
              <p className="text-sm text-muted-foreground">Phút luyện tập</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">{overallStats.streak}</p>
              <p className="text-sm text-muted-foreground">Ngày streak</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Biểu đồ kỹ năng
            </CardTitle>
            <CardDescription>Mức độ thành thạo theo từng chủ đề</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Mastery"
                    dataKey="mastery"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Chưa có dữ liệu kỹ năng</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Độ chính xác theo độ khó
            </CardTitle>
            <CardDescription>Hiệu suất của bạn ở từng mức độ khó</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={difficultyData}>
                <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'accuracy' ? `${value}%` : value,
                    name === 'accuracy' ? 'Độ chính xác' : 'Số câu'
                  ]}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {difficultyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.accuracy >= 70 ? 'hsl(var(--primary))' : entry.accuracy >= 40 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Skills Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weak Points */}
        <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Điểm yếu ({categorizedSkills.weak.length})
            </CardTitle>
            <CardDescription>Cần tập trung cải thiện</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorizedSkills.weak.length > 0 ? (
              <>
                {categorizedSkills.weak.slice(0, 5).map(skill => (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[150px]" title={skill.taxonomy_node?.name}>
                        {skill.taxonomy_node?.name || 'Unknown'}
                      </span>
                      <span className="text-red-600 font-semibold">{Math.round(skill.mastery_level)}%</span>
                    </div>
                    <Progress value={skill.mastery_level} className="h-2 [&>div]:bg-red-500" />
                    <p className="text-xs text-muted-foreground">
                      {skill.questions_correct}/{skill.questions_attempted} câu đúng
                    </p>
                  </div>
                ))}
                {categorizedSkills.weak.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{categorizedSkills.weak.length - 5} kỹ năng khác
                  </p>
                )}
                <Button 
                  className="w-full mt-4" 
                  variant="destructive"
                  onClick={startWeakPointPractice}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Luyện tập điểm yếu
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Không có điểm yếu!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reinforcing */}
        <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <TrendingUp className="h-5 w-5" />
              Cần củng cố ({categorizedSkills.reinforcing.length})
            </CardTitle>
            <CardDescription>Đang tiến bộ, cần duy trì</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorizedSkills.reinforcing.length > 0 ? (
              categorizedSkills.reinforcing.slice(0, 5).map(skill => (
                <div key={skill.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[150px]" title={skill.taxonomy_node?.name}>
                      {skill.taxonomy_node?.name || 'Unknown'}
                    </span>
                    <span className="text-yellow-600 font-semibold">{Math.round(skill.mastery_level)}%</span>
                  </div>
                  <Progress value={skill.mastery_level} className="h-2 [&>div]:bg-yellow-500" />
                  <p className="text-xs text-muted-foreground">
                    {skill.questions_correct}/{skill.questions_attempted} câu đúng
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có dữ liệu</p>
              </div>
            )}
            {categorizedSkills.reinforcing.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{categorizedSkills.reinforcing.length - 5} kỹ năng khác
              </p>
            )}
          </CardContent>
        </Card>

        {/* Strong Points */}
        <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Điểm mạnh ({categorizedSkills.strong.length})
            </CardTitle>
            <CardDescription>Đã thành thạo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorizedSkills.strong.length > 0 ? (
              categorizedSkills.strong.slice(0, 5).map(skill => (
                <div key={skill.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[150px]" title={skill.taxonomy_node?.name}>
                      {skill.taxonomy_node?.name || 'Unknown'}
                    </span>
                    <span className="text-green-600 font-semibold">{Math.round(skill.mastery_level)}%</span>
                  </div>
                  <Progress value={skill.mastery_level} className="h-2 [&>div]:bg-green-500" />
                  <p className="text-xs text-muted-foreground">
                    {skill.questions_correct}/{skill.questions_attempted} câu đúng
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có kỹ năng thành thạo</p>
              </div>
            )}
            {categorizedSkills.strong.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{categorizedSkills.strong.length - 5} kỹ năng khác
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Skills List */}
      {masteries && masteries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tất cả kỹ năng ({masteries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {masteries.map(skill => {
                const level = getMasteryLevel(skill.mastery_level);
                return (
                  <div key={skill.id} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate max-w-[180px]" title={skill.taxonomy_node?.name}>
                        {skill.taxonomy_node?.name || 'Unknown'}
                      </span>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          level.color === 'gray' && "border-gray-300 text-gray-600",
                          level.color === 'blue' && "border-blue-300 text-blue-600",
                          level.color === 'green' && "border-green-300 text-green-600",
                          level.color === 'purple' && "border-purple-300 text-purple-600",
                          level.color === 'gold' && "border-yellow-300 text-yellow-600"
                        )}
                      >
                        {level.label}
                      </Badge>
                    </div>
                    <Progress 
                      value={skill.mastery_level} 
                      className={cn(
                        "h-2 mb-2",
                        skill.mastery_level < 40 && "[&>div]:bg-red-500",
                        skill.mastery_level >= 40 && skill.mastery_level < 70 && "[&>div]:bg-yellow-500",
                        skill.mastery_level >= 70 && "[&>div]:bg-green-500"
                      )}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(skill.mastery_level)}%</span>
                      <span>{skill.questions_correct}/{skill.questions_attempted} đúng</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
