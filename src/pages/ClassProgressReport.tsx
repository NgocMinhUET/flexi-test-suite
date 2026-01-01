import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Search,
  TrendingUp,
  Users,
  Target,
  Clock,
  Star,
  Flame,
  Trophy,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useClass } from '@/hooks/useClasses';
import { useClassProgress, calculateClassSummary, StudentProgress } from '@/hooks/useClassProgress';
import { cn } from '@/lib/utils';

type SortField = 'name' | 'level' | 'xp' | 'accuracy' | 'streak' | 'sessions' | 'last_active';
type SortDirection = 'asc' | 'desc';

export default function ClassProgressReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const { data: classData, isLoading: classLoading } = useClass(id);
  const { data: progress, isLoading: progressLoading } = useClassProgress(id);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('xp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const summary = useMemo(() => 
    calculateClassSummary(progress || []),
    [progress]
  );

  const filteredAndSortedProgress = useMemo(() => {
    if (!progress) return [];

    let filtered = progress.filter(p => {
      const query = searchQuery.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query)
      );
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '');
          break;
        case 'level':
          comparison = a.current_level - b.current_level;
          break;
        case 'xp':
          comparison = a.total_xp - b.total_xp;
          break;
        case 'accuracy':
          comparison = a.accuracy - b.accuracy;
          break;
        case 'streak':
          comparison = a.current_streak - b.current_streak;
          break;
        case 'sessions':
          comparison = a.sessions_count - b.sessions_count;
          break;
        case 'last_active':
          const aDate = a.last_practice_date || '0';
          const bDate = b.last_practice_date || '0';
          comparison = aDate.localeCompare(bDate);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [progress, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActivityStatus = (lastPractice: string | null): { label: string; className: string } => {
    if (!lastPractice) return { label: 'Chưa luyện tập', className: 'text-muted-foreground' };
    
    const daysDiff = Math.floor((Date.now() - new Date(lastPractice).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return { label: 'Hôm nay', className: 'text-green-600' };
    if (daysDiff === 1) return { label: 'Hôm qua', className: 'text-green-600' };
    if (daysDiff <= 3) return { label: `${daysDiff} ngày trước`, className: 'text-yellow-600' };
    if (daysDiff <= 7) return { label: `${daysDiff} ngày trước`, className: 'text-orange-600' };
    return { label: `${daysDiff} ngày trước`, className: 'text-red-600' };
  };

  if (authLoading || classLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!classData) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Không tìm thấy lớp học</h2>
        <Button onClick={() => navigate('/classes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/classes/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono">
              {classData.code}
            </Badge>
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3 mr-1" />
              Báo cáo tiến độ
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{classData.name}</h1>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Học sinh</p>
                <p className="text-xl font-bold">{summary.total_students}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoạt động</p>
                <p className="text-xl font-bold">{summary.active_students}</p>
                <p className="text-xs text-muted-foreground">7 ngày qua</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng XP</p>
                <p className="text-xl font-bold">{summary.total_xp.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Độ chính xác</p>
                <p className="text-xl font-bold">{Math.round(summary.average_accuracy)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level TB</p>
                <p className="text-xl font-bold">{summary.average_level.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Thời gian</p>
                <p className="text-xl font-bold">{summary.total_practice_time_hours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm học sinh..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortField} onValueChange={(v: SortField) => setSortField(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sắp xếp theo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="xp">XP</SelectItem>
            <SelectItem value="level">Level</SelectItem>
            <SelectItem value="accuracy">Độ chính xác</SelectItem>
            <SelectItem value="streak">Streak</SelectItem>
            <SelectItem value="sessions">Số buổi</SelectItem>
            <SelectItem value="last_active">Hoạt động gần nhất</SelectItem>
            <SelectItem value="name">Tên</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress table */}
      <Card>
        <CardContent className="p-0">
          {progressLoading ? (
            <div className="p-8">
              <Skeleton className="h-64" />
            </div>
          ) : filteredAndSortedProgress.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchQuery ? 'Không tìm thấy học sinh' : 'Chưa có dữ liệu'}
              </p>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Thử thay đổi từ khóa tìm kiếm'
                  : 'Học sinh chưa có hoạt động luyện tập nào'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3"
                      onClick={() => toggleSort('name')}
                    >
                      Học sinh
                      <SortIcon field="name" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('level')}
                    >
                      Level
                      <SortIcon field="level" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('xp')}
                    >
                      XP
                      <SortIcon field="xp" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('accuracy')}
                    >
                      Độ chính xác
                      <SortIcon field="accuracy" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('streak')}
                    >
                      Streak
                      <SortIcon field="streak" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('sessions')}
                    >
                      Buổi học
                      <SortIcon field="sessions" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('last_active')}
                    >
                      Hoạt động
                      <SortIcon field="last_active" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProgress.map((student, index) => {
                  const activityStatus = getActivityStatus(student.last_practice_date);
                  
                  return (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(student.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {student.full_name || 'Chưa có tên'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.total_questions_attempted} câu đã làm
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "font-bold",
                                  student.current_level >= 10 && "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                                )}
                              >
                                Lv.{student.current_level}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{student.total_xp.toLocaleString()} XP tổng</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{student.total_xp.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2 w-full max-w-[100px]">
                            <Progress 
                              value={student.accuracy} 
                              className={cn(
                                "h-2",
                                student.accuracy >= 80 ? "[&>div]:bg-green-500" :
                                student.accuracy >= 60 ? "[&>div]:bg-yellow-500" :
                                "[&>div]:bg-red-500"
                              )}
                            />
                            <span className="text-sm font-medium w-12 text-right">
                              {Math.round(student.accuracy)}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {student.current_streak > 0 && (
                            <Flame className={cn(
                              "h-4 w-4",
                              student.current_streak >= 7 ? "text-orange-500" : "text-muted-foreground"
                            )} />
                          )}
                          <span className={cn(
                            "font-medium",
                            student.current_streak >= 7 && "text-orange-500"
                          )}>
                            {student.current_streak}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{student.sessions_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className={activityStatus.className}>
                          {activityStatus.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
