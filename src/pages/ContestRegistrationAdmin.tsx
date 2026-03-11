import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useContestRegistrations, useApproveRegistration, useRejectRegistration, useContestInviteCodes, useCreateInviteCode, useDeleteInviteCode } from '@/hooks/useContestRegistrations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useContest } from '@/hooks/useContests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Check, X, Trash2, Loader2, Copy, Link2, Users, Ticket, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const paymentStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Chờ duyệt', variant: 'secondary' },
  paid: { label: 'Đã thanh toán', variant: 'default' },
  free: { label: 'Miễn phí', variant: 'outline' },
  failed: { label: 'Từ chối', variant: 'destructive' },
  refunded: { label: 'Hoàn tiền', variant: 'destructive' },
};

export default function ContestRegistrationAdmin() {
  const { id: contestId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
  const { data: contest } = useContest(contestId);
  const { data: registrations, isLoading: regLoading } = useContestRegistrations(contestId);
  const { data: inviteCodes, isLoading: codesLoading } = useContestInviteCodes(contestId);
  const { data: organizations } = useOrganizations();
  const approveReg = useApproveRegistration();
  const rejectReg = useRejectRegistration();
  const createCode = useCreateInviteCode();
  const deleteCode = useDeleteInviteCode();

  const [createCodeOpen, setCreateCodeOpen] = useState(false);
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null);
  const [codeForm, setCodeForm] = useState({
    organization_id: '', invite_code: '', registration_fee: '0', max_registrations: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isTeacher))) navigate('/auth');
  }, [authLoading, user, isAdmin, isTeacher, navigate]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleCreateCode = async () => {
    if (!codeForm.organization_id || !codeForm.invite_code || !contestId) return;
    await createCode.mutateAsync({
      organization_id: codeForm.organization_id,
      contest_id: contestId,
      invite_code: codeForm.invite_code.toUpperCase(),
      registration_fee: Number(codeForm.registration_fee) || 0,
      max_registrations: codeForm.max_registrations ? Number(codeForm.max_registrations) : undefined,
    });
    setCreateCodeOpen(false);
    setCodeForm({ organization_id: '', invite_code: '', registration_fee: '0', max_registrations: '' });
  };

  const copyRegistrationLink = (code: string) => {
    const url = `${window.location.origin}/register/contest/${contestId}/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Đã copy link đăng ký');
  };


  const pendingCount = registrations?.filter(r => r.payment_status === 'pending').length || 0;
  const paidCount = registrations?.filter(r => r.payment_status === 'paid' || r.payment_status === 'free').length || 0;
  const totalRevenue = registrations
    ?.filter(r => r.payment_status === 'paid')
    .reduce((sum, r) => sum + Number(r.payment_amount), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/contests/${contestId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Đăng ký & Thanh toán</h1>
            <p className="text-muted-foreground">{contest?.name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng đăng ký</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{registrations?.length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Chờ duyệt</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-warning">{pendingCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Đã thanh toán</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-success">{paidCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Doanh thu</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{totalRevenue.toLocaleString('vi-VN')} VND</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="registrations">
          <TabsList>
            <TabsTrigger value="registrations">
              <Users className="h-4 w-4 mr-2" />
              Đăng ký ({registrations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="codes">
              <Ticket className="h-4 w-4 mr-2" />
              Mã mời ({inviteCodes?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách đăng ký</CardTitle>
                <CardDescription>Duyệt thanh toán chuyển khoản thủ công</CardDescription>
              </CardHeader>
              <CardContent>
                {regLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : registrations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Chưa có đăng ký nào</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Họ tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Minh chứng</TableHead>
                        <TableHead>Ngày ĐK</TableHead>
                        <TableHead className="w-[120px]">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations?.map((reg) => {
                        const status = paymentStatusLabels[reg.payment_status] || { label: reg.payment_status, variant: 'secondary' as const };
                        return (
                          <TableRow key={reg.id}>
                            <TableCell className="font-medium">{(reg as any).user_full_name || '-'}</TableCell>
                            <TableCell>{(reg as any).user_email || '-'}</TableCell>
                            <TableCell>{(reg as any).organization_name || '-'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {Number(reg.payment_amount).toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {reg.bank_transfer_proof ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary"
                                  onClick={() => setProofViewUrl(reg.bank_transfer_proof)}
                                >
                                  <ImageIcon className="h-4 w-4 mr-1" />
                                  Xem
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(reg.registered_at).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              {reg.payment_status === 'pending' && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-success"
                                    onClick={() => approveReg.mutate({ registrationId: reg.id, contestId: contestId! })}
                                    disabled={approveReg.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                    onClick={() => rejectReg.mutate({ registrationId: reg.id })}
                                    disabled={rejectReg.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mã mời theo đơn vị</CardTitle>
                    <CardDescription>Mỗi đơn vị có một mã mời riêng</CardDescription>
                  </div>
                  <Button onClick={() => setCreateCodeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo mã mời
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {codesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : inviteCodes?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Chưa có mã mời nào</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã mời</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead className="text-right">Lệ phí</TableHead>
                        <TableHead className="text-center">Đã ĐK / Tối đa</TableHead>
                        <TableHead className="w-[120px]">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inviteCodes?.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-sm">{code.invite_code}</Badge>
                          </TableCell>
                          <TableCell>{code.organization_name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {code.registration_fee === 0 ? 'Miễn phí' : `${Number(code.registration_fee).toLocaleString('vi-VN')} ${code.currency}`}
                          </TableCell>
                          <TableCell className="text-center">
                            {code.registration_count || 0}{code.max_registrations ? ` / ${code.max_registrations}` : ' / ∞'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyRegistrationLink(code.invite_code)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCode.mutate(code.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Code Dialog */}
      <Dialog open={createCodeOpen} onOpenChange={setCreateCodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo mã mời mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Đơn vị *</Label>
              <Select value={codeForm.organization_id} onValueChange={(v) => setCodeForm(prev => ({ ...prev, organization_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger>
                <SelectContent>
                  {organizations?.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name} ({org.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mã mời *</Label>
              <Input
                value={codeForm.invite_code}
                onChange={(e) => setCodeForm(prev => ({ ...prev, invite_code: e.target.value.toUpperCase() }))}
                placeholder="VD: DHQGHN-2026"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lệ phí (VND)</Label>
                <Input
                  type="number"
                  value={codeForm.registration_fee}
                  onChange={(e) => setCodeForm(prev => ({ ...prev, registration_fee: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Giới hạn ĐK</Label>
                <Input
                  type="number"
                  value={codeForm.max_registrations}
                  onChange={(e) => setCodeForm(prev => ({ ...prev, max_registrations: e.target.value }))}
                  placeholder="Không giới hạn"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCodeOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateCode} disabled={!codeForm.organization_id || !codeForm.invite_code || createCode.isPending}>
              Tạo mã mời
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof View Dialog */}
      <Dialog open={!!proofViewUrl} onOpenChange={() => setProofViewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Minh chứng chuyển khoản</DialogTitle>
          </DialogHeader>
          {proofViewUrl && (
            <img src={proofViewUrl} alt="Minh chứng chuyển khoản" className="w-full rounded-lg max-h-[70vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
