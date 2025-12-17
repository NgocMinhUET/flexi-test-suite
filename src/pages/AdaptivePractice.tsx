import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  useSkillProfile, 
  useSkillMasteries, 
  useUserAchievements,
  useDailyChallenges,
  useUserDailyChallenges,
  useLeaderboard,
  useLevelConfigs,
  usePracticeSessions
} from '@/hooks/usePractice';
import { useSubjects } from '@/hooks/useSubjects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Flame, 
  Target, 
  Trophy, 
  Star, 
  BookOpen, 
  Zap, 
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  Play
} from 'lucide-react';
import { SESSION_TYPES, getMasteryLevel, SessionType } from '@/types/practice';
import { cn } from '@/lib/utils';

export default function AdaptivePractice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  const { data: profile, isLoading: profileLoading } = useSkillProfile();
  const { data: masteries, isLoading: masteriesLoading } = useSkillMasteries(selectedSubject || undefined);
  const { data: achievements } = useUserAchievements();
  const { data: dailyChallenges } = useDailyChallenges();
  const { data: userChallenges } = useUserDailyChallenges();
  const { data: leaderboard } = useLeaderboard('weekly_xp');
  const { data: levelConfigs } = useLevelConfigs();
  const { data: recentSessions } = usePracticeSessions(5);
  const { data: subjects } = useSubjects();

  const currentLevelConfig = levelConfigs?.find(l => l.level === profile?.current_level);
  const nextLevelConfig = levelConfigs?.find(l => l.level === (profile?.current_level || 0) + 1);
  const xpForNextLevel = nextLevelConfig?.xp_required || 0;
  const xpProgress = profile ? ((profile.total_xp - (currentLevelConfig?.xp_required || 0)) / 
    (xpForNextLevel - (currentLevelConfig?.xp_required || 0))) * 100 : 0;

  const completedChallenges = userChallenges?.filter(c => c.is_completed).length || 0;
  const totalChallenges = dailyChallenges?.length || 0;

  const userRank = leaderboard?.rankings?.findIndex(r => r.userId === user?.id);

  const startSession = (sessionType: SessionType) => {
    navigate(`/practice/session?type=${sessionType}${selectedSubject ? `&subject=${selectedSubject}` : ''}`);
  };

  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Level & XP Card */}
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{currentLevelConfig?.badge_icon || '🌱'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">Level {profile?.current_level || 1}</span>
                  <Badge variant="secondary">{currentLevelConfig?.title || 'Tân binh'}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">{profile?.total_xp?.toLocaleString() || 0} XP</span>
                </div>
                <div className="mt-2">
                  <Progress value={xpProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile?.total_xp?.toLocaleString() || 0} / {xpForNextLevel.toLocaleString()} XP đến Level {(profile?.current_level || 0) + 1}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-full",
                profile?.current_streak ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
              )}>
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile?.current_streak || 0}</p>
                <p className="text-sm text-muted-foreground">Ngày streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {profile?.total_questions_attempted ? 
                    Math.round((profile.total_correct_answers / profile.total_questions_attempted) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Độ chính xác</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Challenges */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/practice/challenges')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Daily Challenges</p>
                <p className="text-sm text-muted-foreground">{completedChallenges}/{totalChallenges} hoàn thành</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/practice/leaderboard')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Bảng xếp hạng</p>
                <p className="text-sm text-muted-foreground">
                  {userRank !== undefined && userRank >= 0 ? `Hạng #${userRank + 1}` : 'Chưa xếp hạng'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/practice/achievements')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Thành tích</p>
                <p className="text-sm text-muted-foreground">{achievements?.length || 0} huy hiệu</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Practice Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Bắt đầu luyện tập
              </CardTitle>
              <CardDescription>Chọn môn học và bắt đầu luyện tập ngay</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả môn học</SelectItem>
                  {subjects?.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Session Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(SESSION_TYPES) as [SessionType, typeof SESSION_TYPES[SessionType]][]).map(([key, session]) => (
              <Card 
                key={key} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                  key === 'weak_point_focus' && "border-red-200 bg-red-50/50",
                  key === 'challenge' && "border-purple-200 bg-purple-50/50"
                )}
                onClick={() => startSession(key)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{session.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{session.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                      {session.xpMultiplier > 1 && (
                        <Badge variant="secondary" className="mt-2">
                          +{(session.xpMultiplier - 1) * 100}% XP bonus
                        </Badge>
                      )}
                    </div>
                    <Button size="icon" variant="ghost">
                      <Play className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skill Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Kỹ năng của bạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {masteriesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : masteries && masteries.length > 0 ? (
                <div className="space-y-4">
                  {masteries.slice(0, 6).map(mastery => {
                    const level = getMasteryLevel(mastery.mastery_level);
                    return (
                      <div key={mastery.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {mastery.taxonomy_node?.name || 'Unknown'}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                level.color === 'gray' && "border-gray-300 text-gray-600",
                                level.color === 'blue' && "border-blue-300 text-blue-600",
                                level.color === 'green' && "border-green-300 text-green-600",
                                level.color === 'purple' && "border-purple-300 text-purple-600",
                                level.color === 'gold' && "border-yellow-300 text-yellow-600",
                              )}
                            >
                              {level.label}
                            </Badge>
                            <span className="text-sm font-semibold">{Math.round(mastery.mastery_level)}%</span>
                          </div>
                        </div>
                        <Progress 
                          value={mastery.mastery_level} 
                          className={cn(
                            "h-2",
                            mastery.mastery_level < 40 && "[&>div]:bg-red-500",
                            mastery.mastery_level >= 40 && mastery.mastery_level < 70 && "[&>div]:bg-yellow-500",
                            mastery.mastery_level >= 70 && "[&>div]:bg-green-500"
                          )}
                        />
                      </div>
                    );
                  })}
                  {masteries.length > 6 && (
                    <Button variant="link" className="p-0" onClick={() => navigate('/practice/skills')}>
                      Xem tất cả {masteries.length} kỹ năng →
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có dữ liệu kỹ năng</p>
                  <p className="text-sm">Bắt đầu luyện tập để theo dõi tiến độ!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Activity & Achievements */}
        <div className="space-y-6">
          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions && recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map(session => (
                    <div key={session.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="text-2xl">
                        {SESSION_TYPES[session.session_type as SessionType]?.icon || '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {SESSION_TYPES[session.session_type as SessionType]?.name || session.session_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.correct_count}/{session.questions_count} đúng • +{session.xp_earned} XP
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((session.correct_count / session.questions_count) * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Chưa có hoạt động nào</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5" />
                Thành tích gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements && achievements.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {achievements.slice(0, 8).map(ua => (
                    <div 
                      key={ua.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      title={ua.achievement?.description}
                    >
                      <span className="text-xl">{ua.achievement?.icon}</span>
                      <span className="text-xs font-medium">{ua.achievement?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có thành tích</p>
                </div>
              )}
              {achievements && achievements.length > 0 && (
                <Button variant="link" className="p-0 mt-3" onClick={() => navigate('/practice/achievements')}>
                  Xem tất cả →
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
