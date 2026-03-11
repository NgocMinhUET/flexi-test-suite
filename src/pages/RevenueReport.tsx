import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Download, Loader2, DollarSign, Users, Building2, TrendingUp } from 'lucide-react';
import type { ContestRegistration, Organization } from '@/types/registration';

export default function RevenueReport() {
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const [selectedContest, setSelectedContest] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isTeacher))) navigate('/auth');
  }, [authLoading, user, isAdmin, isTeacher, navigate]);

  // Fetch all contests
  const { data: contests } = useQuery({
    queryKey: ['all-contests-for-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contests').select('id, name').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all organizations
  const { data: organizations } = useQuery({
    queryKey: ['all-orgs-for-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data as Organization[];
    },
  });

  // Fetch all registrations
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['all-registrations-for-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contest_registrations')
        .select('*')
        .order('registered_at', { ascending: false });
      if (error) throw error;

      // Enrich
      const regs = data as ContestRegistration[];
      if (regs.length === 0) return [];

      const userIds = [...new Set(regs.map(r => r.user_id))];
      const orgIds = [...new Set(regs.map(r => r.organization_id))];
      const contestIds = [...new Set(regs.map(r => r.contest_id))];

      const [profilesRes, orgsRes, contestsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name').in('id', userIds),
        supabase.from('organizations').select('id, name').in('id', orgIds),
        supabase.from('contests').select('id, name').in('id', contestIds),
      ]);

      const profileMap: Record<string, { email: string; full_name: string }> = {};
      (profilesRes.data || []).forEach(p => { profileMap[p.id] = { email: p.email || '', full_name: p.full_name || '' }; });
      const orgMap: Record<string, string> = {};
      (orgsRes.data || []).forEach(o => { orgMap[o.id] = o.name; });
      const contestMap: Record<string, string> = {};
      (contestsRes.data || []).forEach(c => { contestMap[c.id] = c.name; });

      return regs.map(r => ({
        ...r,
        user_email: profileMap[r.user_id]?.email || '',
        user_full_name: profileMap[r.user_id]?.full_name || '',
        organization_name: orgMap[r.organization_id] || '',
        contest_name: contestMap[r.contest_id] || '',
      }));
    },
  });

  // Filtered data
  const filteredRegs = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter(r => {
      if (selectedContest !== 'all' && r.contest_id !== selectedContest) return false;
      if (selectedOrg !== 'all' && r.organization_id !== selectedOrg) return false;
      return true;
    });
  }, [registrations, selectedContest, selectedOrg]);

  // Stats
  const stats = useMemo(() => {
    const paid = filteredRegs.filter(r => r.payment_status === 'paid');
    const totalRevenue = paid.reduce((sum, r) => sum + Number(r.payment_amount), 0);
    const totalRegs = filteredRegs.length;
    const paidCount = paid.length;
    const pendingCount = filteredRegs.filter(r => r.payment_status === 'pending').length;

    // Per-org breakdown
    const orgBreakdown: Record<string, { name: string; total: number; paid: number; revenue: number }> = {};
    filteredRegs.forEach(r => {
      const orgId = r.organization_id;
      if (!orgBreakdown[orgId]) {
        orgBreakdown[orgId] = { name: (r as any).organization_name || '', total: 0, paid: 0, revenue: 0 };
      }
      orgBreakdown[orgId].total++;
      if (r.payment_status === 'paid') {
        orgBreakdown[orgId].paid++;
        orgBreakdown[orgId].revenue += Number(r.payment_amount);
      }
    });

    return { totalRevenue, totalRegs, paidCount, pendingCount, orgBreakdown };
  }, [filteredRegs]);

  // CSV Export
  const exportCSV = () => {
    const headers = ['Họ tên', 'Email', 'Đơn vị', 'Cuộc thi', 'Số tiền', 'Trạng thái', 'Phương thức', 'Ngày ĐK'];
    const rows = filteredRegs.map(r => [
      (r as any).user_full_name,
      (r as any).user_email,
      (r as any).organization_name,
      (r as any).contest_name,
      r.payment_amount,
      r.payment_status,
      r.payment_method || '',
      new Date(r.registered_at).toLocaleDateString('vi-VN'),
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-doanh-thu-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Báo cáo Doanh thu</h1>
            </div>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="w-64">
            <Select value={selectedContest} onValueChange={setSelectedContest}>
              <SelectTrigger><SelectValue placeholder="Tất cả cuộc thi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả cuộc thi</SelectItem>
                {contests?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger><SelectValue placeholder="Tất cả đơn vị" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả đơn vị</SelectItem>
                {organizations?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng doanh thu</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {stats.totalRevenue.toLocaleString('vi-VN')} <span className="text-sm font-normal">VND</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng đăng ký</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalRegs}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Đã thanh toán</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{stats.paidCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Chờ duyệt</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-warning">{stats.pendingCount}</div></CardContent>
          </Card>
        </div>

        {/* Per-org breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Thống kê theo đơn vị</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.orgBreakdown).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">Chưa có dữ liệu</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead className="text-center">Tổng ĐK</TableHead>
                    <TableHead className="text-center">Đã TT</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.orgBreakdown).map(([orgId, data]) => (
                    <TableRow key={orgId}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className="text-center">{data.total}</TableCell>
                      <TableCell className="text-center">{data.paid}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{data.revenue.toLocaleString('vi-VN')} VND</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detailed list */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết đăng ký</CardTitle>
            <CardDescription>{filteredRegs.length} bản ghi</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : filteredRegs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Cuộc thi</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày ĐK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegs.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{(reg as any).user_full_name}</TableCell>
                        <TableCell>{(reg as any).user_email}</TableCell>
                        <TableCell>{(reg as any).organization_name}</TableCell>
                        <TableCell>{(reg as any).contest_name}</TableCell>
                        <TableCell className="text-right font-mono">{Number(reg.payment_amount).toLocaleString('vi-VN')}</TableCell>
                        <TableCell>
                          <Badge variant={reg.payment_status === 'paid' ? 'default' : reg.payment_status === 'pending' ? 'secondary' : 'destructive'}>
                            {reg.payment_status === 'paid' ? 'Đã TT' : reg.payment_status === 'pending' ? 'Chờ' : reg.payment_status === 'free' ? 'Miễn phí' : reg.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(reg.registered_at).toLocaleDateString('vi-VN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
