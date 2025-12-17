import { useNavigate } from 'react-router-dom';
import { useAchievements, useUserAchievements } from '@/hooks/usePractice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Lock, Star, Trophy, Flame, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement } from '@/types/practice';

const CATEGORY_INFO = {
  streak: { name: 'Streak', icon: Flame, color: 'text-orange-500' },
  quantity: { name: 'Số lượng', icon: Target, color: 'text-blue-500' },
  mastery: { name: 'Thành thạo', icon: Star, color: 'text-yellow-500' },
  accuracy: { name: 'Chính xác', icon: Trophy, color: 'text-green-500' },
  xp: { name: 'Kinh nghiệm', icon: Zap, color: 'text-purple-500' },
  special: { name: 'Đặc biệt', icon: Star, color: 'text-pink-500' }
};

const RARITY_COLORS = {
  common: 'bg-gray-100 border-gray-300',
  rare: 'bg-blue-50 border-blue-300',
  epic: 'bg-purple-50 border-purple-300',
  legendary: 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400'
};

export default function Achievements() {
  const navigate = useNavigate();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { data: userAchievements, isLoading: userAchievementsLoading } = useUserAchievements();

  const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id));

  const groupedAchievements = achievements?.reduce((acc, achievement) => {
    const category = achievement.category || 'special';
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const totalEarned = userAchievements?.length || 0;
  const totalAchievements = achievements?.filter(a => !a.is_hidden).length || 0;

  if (achievementsLoading || userAchievementsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-12 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate('/practice')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Thành tích</h1>
          <p className="text-muted-foreground">
            Đã mở khóa {totalEarned}/{totalAchievements} thành tích
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">
            {Math.round((totalEarned / totalAchievements) * 100)}%
          </div>
          <Progress value={(totalEarned / totalAchievements) * 100} className="w-32 h-2" />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <TabsTrigger key={key} value={key} className="hidden md:flex">
              <info.icon className={cn("h-4 w-4 mr-1", info.color)} />
              {info.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-8">
            {Object.entries(groupedAchievements || {}).map(([category, categoryAchievements]) => {
              const info = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
              return (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <info.icon className={cn("h-5 w-5", info.color)} />
                    {info.name}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categoryAchievements.map(achievement => (
                      <AchievementCard 
                        key={achievement.id} 
                        achievement={achievement}
                        earned={earnedIds.has(achievement.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {Object.keys(CATEGORY_INFO).map(category => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {groupedAchievements?.[category]?.map(achievement => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement}
                  earned={earnedIds.has(achievement.id)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  earned: boolean;
}

function AchievementCard({ achievement, earned }: AchievementCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      earned ? RARITY_COLORS[achievement.rarity] : "bg-muted/50 opacity-60",
      earned && "hover:shadow-md"
    )}>
      <CardContent className="p-4 text-center">
        {!earned && achievement.is_hidden ? (
          <>
            <Lock className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">???</p>
            <p className="text-xs text-muted-foreground">Thành tích ẩn</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">{achievement.icon}</div>
            <p className="text-sm font-medium line-clamp-1">{achievement.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {achievement.description}
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-xs font-medium">+{achievement.xp_reward} XP</span>
            </div>
          </>
        )}
        
        {earned && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              ✓
            </Badge>
          </div>
        )}
        
        <Badge 
          variant="outline" 
          className={cn(
            "absolute bottom-2 right-2 text-[10px]",
            achievement.rarity === 'legendary' && "border-yellow-500 text-yellow-600",
            achievement.rarity === 'epic' && "border-purple-500 text-purple-600",
            achievement.rarity === 'rare' && "border-blue-500 text-blue-600"
          )}
        >
          {achievement.rarity === 'common' && 'Phổ thông'}
          {achievement.rarity === 'rare' && 'Hiếm'}
          {achievement.rarity === 'epic' && 'Sử thi'}
          {achievement.rarity === 'legendary' && 'Huyền thoại'}
        </Badge>
      </CardContent>
    </Card>
  );
}
