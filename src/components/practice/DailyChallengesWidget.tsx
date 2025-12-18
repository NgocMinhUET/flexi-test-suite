import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  useDailyChallenges, 
  useUserDailyChallenges,
  useUpdateDailyChallengeProgress 
} from '@/hooks/usePractice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, CheckCircle2, Target, Flame, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyChallengesWidgetProps {
  compact?: boolean;
  className?: string;
}

const CHALLENGE_ICONS: Record<string, React.ReactNode> = {
  questions_count: <Target className="h-5 w-5" />,
  accuracy: <Sparkles className="h-5 w-5" />,
  streak_keep: <Flame className="h-5 w-5" />,
  time_spent: <Clock className="h-5 w-5" />,
  perfect_session: <Trophy className="h-5 w-5" />,
};

export function DailyChallengesWidget({ compact = false, className }: DailyChallengesWidgetProps) {
  const { data: challenges, isLoading: challengesLoading, refetch: refetchChallenges } = useDailyChallenges();
  const { data: userChallenges, isLoading: userLoading } = useUserDailyChallenges();

  // Auto-generate challenges if none exist
  useEffect(() => {
    async function ensureChallengesExist() {
      if (!challengesLoading && (!challenges || challenges.length === 0)) {
        try {
          console.log('No daily challenges found, generating...');
          const { error } = await supabase.functions.invoke('generate-daily-challenges');
          if (error) {
            console.error('Error generating challenges:', error);
          } else {
            // Refetch after generation
            setTimeout(() => refetchChallenges(), 500);
          }
        } catch (err) {
          console.error('Failed to generate challenges:', err);
        }
      }
    }
    ensureChallengesExist();
  }, [challenges, challengesLoading, refetchChallenges]);

  const isLoading = challengesLoading || userLoading;

  const getUserProgress = (challengeId: string) => {
    return userChallenges?.find(uc => uc.challenge_id === challengeId);
  };

  const completedCount = userChallenges?.filter(uc => uc.is_completed).length || 0;
  const totalCount = challenges?.length || 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Đang tạo thử thách hôm nay...</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className={cn(
                "h-5 w-5",
                allCompleted ? "text-yellow-500" : "text-muted-foreground"
              )} />
              <span className="font-medium">Daily Challenges</span>
            </div>
            <Badge variant={allCompleted ? "default" : "outline"}>
              {completedCount}/{totalCount}
            </Badge>
          </div>
          <Progress 
            value={(completedCount / totalCount) * 100} 
            className="h-2"
          />
          {allCompleted && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Tuyệt vời! Đã hoàn thành tất cả!
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className={cn(
              "h-5 w-5",
              allCompleted ? "text-yellow-500" : "text-muted-foreground"
            )} />
            Thử thách hôm nay
          </CardTitle>
          <Badge variant={allCompleted ? "default" : "secondary"}>
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map(challenge => {
          const userProgress = getUserProgress(challenge.id);
          const progress = userProgress?.current_progress || 0;
          const percentage = Math.min((progress / challenge.target_value) * 100, 100);
          const isCompleted = userProgress?.is_completed || false;

          return (
            <div 
              key={challenge.id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                isCompleted 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900" 
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  isCompleted 
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                    : "bg-primary/10 text-primary"
                )}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : CHALLENGE_ICONS[challenge.challenge_type] || <Target className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    isCompleted && "line-through text-muted-foreground"
                  )}>
                    {challenge.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Progress 
                      value={percentage} 
                      className={cn(
                        "h-1.5 flex-1",
                        isCompleted && "[&>div]:bg-green-500"
                      )} 
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {progress}/{challenge.target_value}
                    </span>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs shrink-0",
                    isCompleted && "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400"
                  )}
                >
                  +{challenge.xp_reward} XP
                </Badge>
              </div>
            </div>
          );
        })}

        {allCompleted && (
          <div className="text-center py-3 bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-950/30 dark:to-green-950/30 rounded-lg">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              🎉 Hoàn thành tất cả thử thách hôm nay!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Bonus +{Math.round(challenges.reduce((sum, c) => sum + c.xp_reward, 0) * 0.2)} XP
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
