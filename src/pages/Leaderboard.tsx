import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard, useSkillProfile } from '@/hooks/usePractice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trophy, Medal, Crown, Flame, Target, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaderboardEntry } from '@/types/practice';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  
  const { data: weeklyLeaderboard, isLoading: weeklyLoading } = useLeaderboard('weekly_xp');
  const { data: monthlyLeaderboard, isLoading: monthlyLoading } = useLeaderboard('monthly_xp');
  const { data: profile } = useSkillProfile();

  const currentLeaderboard = period === 'weekly' ? weeklyLeaderboard : monthlyLeaderboard;
  const isLoading = period === 'weekly' ? weeklyLoading : monthlyLoading;

  const userRank = currentLeaderboard?.rankings?.findIndex(r => r.userId === user?.id);
  const userEntry = currentLeaderboard?.rankings?.find(r => r.userId === user?.id);

  // Mock data if no leaderboard exists
  const mockRankings: LeaderboardEntry[] = currentLeaderboard?.rankings?.length ? currentLeaderboard.rankings : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/practice')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại
      </Button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Bảng xếp hạng
        </h1>
        <p className="text-muted-foreground mt-1">
          Xem vị trí của bạn so với những học sinh khác
        </p>
      </div>

      {/* User's Position Card */}
      {profile && (
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Vị trí của bạn</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {profile.total_xp.toLocaleString()} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {profile.current_streak} ngày
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {userRank !== undefined && userRank >= 0 ? `#${userRank + 1}` : '--'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {period === 'weekly' ? 'Tuần này' : 'Tháng này'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as 'weekly' | 'monthly')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="weekly">Tuần này</TabsTrigger>
          <TabsTrigger value="monthly">Tháng này</TabsTrigger>
        </TabsList>

        <TabsContent value={period}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : mockRankings.length > 0 ? (
            <div className="space-y-2">
              {/* Top 3 */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {mockRankings.slice(0, 3).map((entry, idx) => (
                  <TopRankCard 
                    key={entry.userId} 
                    entry={entry} 
                    rank={idx + 1}
                    isCurrentUser={entry.userId === user?.id}
                  />
                ))}
              </div>

              {/* Rest of rankings */}
              {mockRankings.slice(3).map((entry, idx) => (
                <RankingRow 
                  key={entry.userId}
                  entry={entry}
                  rank={idx + 4}
                  isCurrentUser={entry.userId === user?.id}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu</h3>
                <p className="text-muted-foreground">
                  Bắt đầu luyện tập để xuất hiện trên bảng xếp hạng!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TopRankCardProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}

function TopRankCard({ entry, rank, isCurrentUser }: TopRankCardProps) {
  const icons = {
    1: <Crown className="h-8 w-8 text-yellow-500" />,
    2: <Medal className="h-7 w-7 text-gray-400" />,
    3: <Medal className="h-6 w-6 text-amber-600" />
  };

  return (
    <Card className={cn(
      "text-center",
      rank === 1 && "border-yellow-300 bg-yellow-50",
      rank === 2 && "border-gray-300 bg-gray-50",
      rank === 3 && "border-amber-300 bg-amber-50",
      isCurrentUser && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        {icons[rank as keyof typeof icons]}
        <Avatar className="h-12 w-12 mx-auto mt-2">
          <AvatarImage src={entry.avatarUrl || undefined} />
          <AvatarFallback>{entry.userName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <p className="font-medium text-sm mt-2 truncate">{entry.userName || 'Ẩn danh'}</p>
        <p className="text-lg font-bold text-primary">{entry.xpEarned.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">XP</p>
      </CardContent>
    </Card>
  );
}

interface RankingRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}

function RankingRow({ entry, rank, isCurrentUser }: RankingRowProps) {
  return (
    <Card className={cn(
      "transition-colors",
      isCurrentUser && "border-primary bg-primary/5"
    )}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-8 text-center font-bold text-muted-foreground">
          #{rank}
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src={entry.avatarUrl || undefined} />
          <AvatarFallback>{entry.userName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{entry.userName || 'Ẩn danh'}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {entry.accuracy}%
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              {entry.streak} ngày
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary">{entry.xpEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">XP</p>
        </div>
      </CardContent>
    </Card>
  );
}
