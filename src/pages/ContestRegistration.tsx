import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRegisterForContest } from '@/hooks/useContestRegistrations';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code2, Loader2, CheckCircle, AlertCircle, CreditCard, Building2, Copy, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

export default function ContestRegistration() {
  const { contestId, inviteCode: urlInviteCode } = useParams<{ contestId: string; inviteCode?: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const registerMutation = useRegisterForContest();
  const { uploadImage, isUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedContestId = contestId?.trim() || '';

  const [inviteCode, setInviteCode] = useState(urlInviteCode?.toUpperCase() || '');
  const [step, setStep] = useState<'code' | 'confirm' | 'payment' | 'done'>('code');
  const [codeInfo, setCodeInfo] = useState<any>(null);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [autoLookupDone, setAutoLookupDone] = useState(false);

  // Fetch contest info
  const { data: contest } = useQuery({
    queryKey: ['contest-public', normalizedContestId],
    queryFn: async () => {
      if (!normalizedContestId) return null;
      const { data, error } = await supabase
        .from('contests')
        .select('id, name, description, subject, start_time, end_time, status')
        .eq('id', normalizedContestId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!normalizedContestId,
  });

  // Check if already registered
  const { data: existingReg, isLoading: existingRegLoading } = useQuery({
    queryKey: ['my-registration', normalizedContestId, user?.id],
    queryFn: async () => {
      if (!normalizedContestId || !user?.id) return null;
      const { data } = await supabase
        .from('contest_registrations')
        .select('*, organization:organizations(name)')
        .eq('contest_id', normalizedContestId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!normalizedContestId && !!user?.id,
  });

  // Auto-lookup invite code from URL
  useEffect(() => {
    if (urlInviteCode && !autoLookupDone && user && !existingRegLoading && !existingReg) {
      setAutoLookupDone(true);
      handleLookupCode(urlInviteCode.toUpperCase());
    }
  }, [urlInviteCode, autoLookupDone, user, existingRegLoading, existingReg]);

  // Lookup invite code
  const handleLookupCode = async (code?: string) => {
    const codeToLookup = code || inviteCode.trim().toUpperCase();
    if (!codeToLookup || !normalizedContestId) return;

    const { data, error } = await supabase
      .from('organization_contest_codes')
      .select('*, organization:organizations(name)')
      .eq('invite_code', codeToLookup)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      toast.error('Mã mời không hợp lệ hoặc đã hết hạn');
      return;
    }

    if (String(data.contest_id).trim().toLowerCase() !== normalizedContestId.toLowerCase()) {
      toast.error('Mã mời này thuộc cuộc thi khác');
      return;
    }

    setInviteCode(codeToLookup);
    setCodeInfo(data);
    setStep('confirm');
  };

  const handleRegister = async () => {
    const result = await registerMutation.mutateAsync({ inviteCode: inviteCode.trim().toUpperCase() });
    setRegistrationResult(result);
    if (result.isFree) {
      setStep('done');
      toast.success('Đăng ký thành công! Bạn có thể thi ngay khi cuộc thi bắt đầu.');
    } else {
      setStep('payment');
    }
  };

  const handleUploadProof = async (file: File) => {
    const result = await uploadImage(file);
    if (!result) return;

    setProofUrl(result.url);

    // Update registration with proof
    const regId = registrationResult?.registration?.id;
    if (regId) {
      await supabase
        .from('contest_registrations')
        .update({ bank_transfer_proof: result.url })
        .eq('id', regId);
      toast.success('Đã upload minh chứng chuyển khoản');
    }
  };

  const handleUploadProofExisting = async (file: File) => {
    const result = await uploadImage(file);
    if (!result) return;

    setProofUrl(result.url);

    if (existingReg?.id) {
      await supabase
        .from('contest_registrations')
        .update({ bank_transfer_proof: result.url })
        .eq('id', existingReg.id);
      toast.success('Đã upload minh chứng chuyển khoản');
    }
  };

  const bankInfo = {
    bank: 'Vietcombank',
    account: '0123456789',
    name: 'NGUYEN VAN A',
    content: `THIPRO ${inviteCode.toUpperCase()} ${user?.email || ''}`,
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    const redirectPath = urlInviteCode
      ? `/register/contest/${normalizedContestId}/${urlInviteCode}`
      : `/register/contest/${normalizedContestId}`;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Code2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle>Đăng ký thi</CardTitle>
            <CardDescription>Bạn cần đăng nhập để đăng ký tham gia cuộc thi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate(`/auth?redirect=${encodeURIComponent(redirectPath)}`)}>
              Đăng nhập / Tạo tài khoản
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingReg) {
    // Auto-redirect to exams if already paid/free
    if (existingReg.payment_status === 'paid' || existingReg.payment_status === 'free') {
      navigate('/my-exams', { replace: true });
      return null;
    }

    const paymentLabel: Record<string, string> = {
      pending: 'Chờ thanh toán',
      paid: 'Đã thanh toán',
      free: 'Miễn phí',
      failed: 'Bị từ chối',
      refunded: 'Đã hoàn tiền',
    };
    const paymentVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      paid: 'default',
      free: 'default',
      failed: 'destructive',
      refunded: 'outline',
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-2" />
            <CardTitle>Bạn đã đăng ký</CardTitle>
            <CardDescription>{contest?.name || 'Cuộc thi'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Đơn vị:</span>
              <span className="font-medium">{(existingReg as any).organization?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trạng thái:</span>
              <Badge variant={paymentVariant[existingReg.payment_status] || 'secondary'}>
                {paymentLabel[existingReg.payment_status] || existingReg.payment_status}
              </Badge>
            </div>
            {existingReg.payment_status === 'pending' && (
              <>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Vui lòng chuyển khoản để hoàn tất đăng ký
                  </p>
                  <div className="text-sm space-y-1">
                    <p>Ngân hàng: <strong>{bankInfo.bank}</strong></p>
                    <p>STK: <strong>{bankInfo.account}</strong></p>
                    <p>Tên: <strong>{bankInfo.name}</strong></p>
                    <p>Nội dung CK: <strong>{bankInfo.content}</strong></p>
                    <p>Số tiền: <strong>{Number(existingReg.payment_amount).toLocaleString('vi-VN')} {existingReg.currency}</strong></p>
                  </div>
                </div>

                {/* Upload proof section */}
                <div className="space-y-2">
                  <Label className="text-sm">Upload minh chứng chuyển khoản</Label>
                  {(proofUrl || existingReg.bank_transfer_proof) ? (
                    <div className="space-y-2">
                      <img
                        src={proofUrl || existingReg.bank_transfer_proof || ''}
                        alt="Minh chứng chuyển khoản"
                        className="w-full rounded-lg border max-h-60 object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Thay ảnh khác
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Image className="w-5 h-5 mr-2" />}
                      Chọn ảnh minh chứng
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadProofExisting(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Code2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle>{contest?.name || 'Đăng ký thi'}</CardTitle>
          {contest?.description && <CardDescription>{contest.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {step === 'code' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mã mời (từ đơn vị / trường)</Label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="VD: DHQGHN-2026"
                  className="font-mono text-center text-lg"
                />
              </div>
              <Button className="w-full" onClick={() => handleLookupCode()} disabled={!inviteCode.trim()}>
                Tiếp tục
              </Button>
            </div>
          )}

          {step === 'confirm' && codeInfo && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{(codeInfo as any).organization?.name}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lệ phí:</span>
                  <span className="font-bold text-lg">
                    {codeInfo.registration_fee === 0
                      ? 'Miễn phí'
                      : `${Number(codeInfo.registration_fee).toLocaleString('vi-VN')} ${codeInfo.currency}`
                    }
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('code')}>Quay lại</Button>
                <Button className="flex-1" onClick={handleRegister} disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Xác nhận đăng ký
                </Button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <CreditCard className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="font-medium">Chuyển khoản ngân hàng</p>
                <p className="text-sm text-muted-foreground">Sau khi chuyển khoản, admin sẽ duyệt trong vòng 24h</p>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Ngân hàng:</span>
                  <span className="font-medium">{bankInfo.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span>STK:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium">{bankInfo.account}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(bankInfo.account); toast.success('Đã copy'); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Tên TK:</span>
                  <span className="font-medium">{bankInfo.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Nội dung CK:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium text-xs">{bankInfo.content}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(bankInfo.content); toast.success('Đã copy'); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Số tiền:</span>
                  <span className="text-primary">
                    {Number(codeInfo?.registration_fee || 0).toLocaleString('vi-VN')} {codeInfo?.currency || 'VND'}
                  </span>
                </div>
              </div>

              {/* Upload proof */}
              <div className="space-y-2">
                <Label className="text-sm">Upload minh chứng chuyển khoản (không bắt buộc)</Label>
                {proofUrl ? (
                  <div className="space-y-2">
                    <img src={proofUrl} alt="Minh chứng" className="w-full rounded-lg border max-h-48 object-contain" />
                    <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Thay ảnh khác
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-16 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Image className="w-5 h-5 mr-2" />}
                    Chọn ảnh minh chứng
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadProof(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <Button className="w-full" onClick={() => navigate('/my-exams')}>
                Tôi đã chuyển khoản
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Tài khoản sẽ được kích hoạt sau khi admin xác nhận thanh toán
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto" />
              <p className="font-medium text-lg">Đăng ký thành công!</p>
              <p className="text-muted-foreground">Bạn có thể thi ngay khi cuộc thi bắt đầu</p>
              <Button className="w-full" onClick={() => navigate('/my-exams')}>
                Vào trang thi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
