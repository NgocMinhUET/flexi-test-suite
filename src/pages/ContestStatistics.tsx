import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContest } from '@/hooks/useContests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Loader2, TrendingUp, Users, Trophy, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface ExamResult {
  id: string;
  exam_id: string;
  user_id: string;
  percentage: number;
  earned_points: number;
  total_points: number;
  grade: string | null;
  submitted_at: string;
}

export default function ContestStatistics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const { data: contest, isLoading: contestLoading } = useContest(id);

  // Fetch all exam results for this contest's exams
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['contest-results', id, contest?.exams.map(e => e.exam_id)],
    queryFn: async () => {
      if (!contest?.exams.length) return [];
      const examIds = contest.exams.map(e => e.exam_id);
      const { data, error } = await supabase
        .from('exam_results')
        .select('id, exam_id, user_id, percentage, earned_points, total_points, grade, submitted_at')
        .in('exam_id', examIds);
      
      if (error) throw error;
      return (data || []) as ExamResult[];
    },
    enabled: !!contest?.exams.length,
  });

  // Fetch profiles for students
  const { data: profiles } = useQuery({
    queryKey: ['result-profiles', results?.map(r => r.user_id)],
    queryFn: async () => {
      if (!results?.length) return {};
      const userIds = [...new Set(results.map(r => r.user_id))];
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const profileMap: Record<string, { email: string; full_name: string }> = {};
      data?.forEach(p => {
        profileMap[p.id] = { email: p.email || '', full_name: p.full_name || '' };
      });
      return profileMap;
    },
    enabled: !!results?.length,
  });

  // Create exam to variant code mapping
  const examVariantMap = useMemo(() => {
    if (!contest?.exams) return {};
    const map: Record<string, string> = {};
    contest.exams.forEach(e => {
      map[e.exam_id] = e.variant_code;
    });
    return map;
  }, [contest?.exams]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!results?.length) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        byVariant: {} as Record<string, { count: number; average: number; scores: number[] }>,
        distribution: [] as { range: string; count: number }[],
      };
    }

    const scores = results.map(r => r.percentage);
    const totalSubmissions = results.length;
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Group by variant
    const byVariant: Record<string, { count: number; average: number; scores: number[] }> = {};
    results.forEach(r => {
      const variant = examVariantMap[r.exam_id] || 'Unknown';
      if (!byVariant[variant]) {
        byVariant[variant] = { count: 0, average: 0, scores: [] };
      }
      byVariant[variant].count++;
      byVariant[variant].scores.push(r.percentage);
    });

    // Calculate averages per variant
    Object.keys(byVariant).forEach(variant => {
      const variantScores = byVariant[variant].scores;
      byVariant[variant].average = variantScores.reduce((a, b) => a + b, 0) / variantScores.length;
    });

    // Score distribution (0-10%, 10-20%, ..., 90-100%)
    const ranges = [
      { min: 0, max: 10, label: '0-10%' },
      { min: 10, max: 20, label: '10-20%' },
      { min: 20, max: 30, label: '20-30%' },
      { min: 30, max: 40, label: '30-40%' },
      { min: 40, max: 50, label: '40-50%' },
      { min: 50, max: 60, label: '50-60%' },
      { min: 60, max: 70, label: '60-70%' },
      { min: 70, max: 80, label: '70-80%' },
      { min: 80, max: 90, label: '80-90%' },
      { min: 90, max: 101, label: '90-100%' },
    ];

    const distribution = ranges.map(range => ({
      range: range.label,
      count: scores.filter(s => s >= range.min && s < range.max).length,
    }));

    return {
      totalSubmissions,
      averageScore,
      highestScore,
      lowestScore,
      byVariant,
      distribution,
    };
  }, [results, examVariantMap]);

  // Variant comparison chart data
  const variantChartData = useMemo(() => {
    return Object.entries(statistics.byVariant)
      .map(([variant, data]) => ({
        variant,
        average: Math.round(data.average * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => a.variant.localeCompare(b.variant));
  }, [statistics.byVariant]);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isTeacher))) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, isTeacher, navigate]);

  if (authLoading || contestLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isTeacher)) {
    return null;
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Không tìm thấy cuộc thi</div>
      </div>
    );
  }

  const isLoading = resultsLoading;

  const chartConfig = {
    count: {
      label: 'Số lượng',
      color: 'hsl(var(--primary))',
    },
    average: {
      label: 'Điểm TB',
      color: 'hsl(var(--primary))',
    },
  };

  const getBarColor = (index: number) => {
    if (index < 5) return 'hsl(var(--destructive))';
    if (index < 7) return 'hsl(var(--warning, 45 93% 47%))';
    return 'hsl(var(--primary))';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/contests/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Thống kê: {contest.name}</h1>
              </div>
              <p className="text-muted-foreground">{contest.subject}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : results?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Chưa có kết quả nào được nộp trong cuộc thi này.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Bài nộp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalSubmissions}</div>
                  <p className="text-xs text-muted-foreground">
                    / {contest.participant_count} thí sinh
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Điểm trung bình
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {statistics.averageScore.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Điểm cao nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.highestScore.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Điểm thấp nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {statistics.lowestScore.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố điểm</CardTitle>
                  <CardDescription>Số lượng thí sinh theo khoảng điểm</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={statistics.distribution} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="range" 
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statistics.distribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Average by Variant Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Điểm trung bình theo mã đề</CardTitle>
                  <CardDescription>So sánh kết quả giữa các mã đề</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={variantChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="variant" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-md">
                              <p className="font-medium">Mã đề: {data.variant}</p>
                              <p className="text-sm text-muted-foreground">
                                Điểm TB: {data.average}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Số bài: {data.count}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Variant Statistics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Thống kê theo mã đề</CardTitle>
                <CardDescription>Chi tiết kết quả từng mã đề</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đề</TableHead>
                      <TableHead className="text-center">Số bài nộp</TableHead>
                      <TableHead className="text-center">Điểm TB</TableHead>
                      <TableHead className="text-center">Điểm cao nhất</TableHead>
                      <TableHead className="text-center">Điểm thấp nhất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(statistics.byVariant)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([variant, data]) => (
                        <TableRow key={variant}>
                          <TableCell className="font-mono font-medium">{variant}</TableCell>
                          <TableCell className="text-center">{data.count}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{data.average.toFixed(1)}%</Badge>
                          </TableCell>
                          <TableCell className="text-center text-green-600">
                            {Math.max(...data.scores).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center text-destructive">
                            {Math.min(...data.scores).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Individual Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Kết quả chi tiết</CardTitle>
                <CardDescription>Danh sách bài nộp của thí sinh</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thí sinh</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mã đề</TableHead>
                      <TableHead className="text-center">Điểm</TableHead>
                      <TableHead className="text-center">Phần trăm</TableHead>
                      <TableHead>Thời gian nộp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results
                      ?.sort((a, b) => b.percentage - a.percentage)
                      .map((result, index) => {
                        const profile = profiles?.[result.user_id];
                        const variant = examVariantMap[result.exam_id];
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="flex items-center gap-2">
                              {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                              {profile?.full_name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {profile?.email || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">{variant || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {result.earned_points}/{result.total_points}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={result.percentage >= 50 ? 'default' : 'destructive'}
                              >
                                {result.percentage.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(result.submitted_at).toLocaleString('vi-VN')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
