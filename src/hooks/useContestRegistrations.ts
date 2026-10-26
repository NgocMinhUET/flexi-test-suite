import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ContestRegistration, OrganizationContestCode, OrganizationContestCodeWithDetails } from '@/types/registration';

// ===== Invite Codes =====
export const useContestInviteCodes = (contestId?: string) => {
  return useQuery({
    queryKey: ['contest-invite-codes', contestId],
    queryFn: async () => {
      let query = supabase
        .from('organization_contest_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (contestId) {
        query = query.eq('contest_id', contestId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch org names + contest names + registration counts in parallel
      const codes = data as OrganizationContestCode[];
      if (codes.length === 0) return [] as OrganizationContestCodeWithDetails[];

      const orgIds = [...new Set(codes.map(c => c.organization_id))];
      const contestIds = [...new Set(codes.map(c => c.contest_id))];
      const codeIds = codes.map(c => c.id);

      const [orgsRes, contestsRes, regCountsRes] = await Promise.all([
        supabase.from('organizations').select('id, name').in('id', orgIds),
        supabase.from('contests').select('id, name').in('id', contestIds),
        supabase.from('contest_registrations').select('invite_code_id').in('invite_code_id', codeIds).in('payment_status', ['pending', 'paid', 'free']),
      ]);

      const orgMap: Record<string, string> = {};
      (orgsRes.data || []).forEach(o => { orgMap[o.id] = o.name; });
      const contestMap: Record<string, string> = {};
      (contestsRes.data || []).forEach(c => { contestMap[c.id] = c.name; });
      const regCounts: Record<string, number> = {};
      (regCountsRes.data || []).forEach(r => {
        regCounts[r.invite_code_id] = (regCounts[r.invite_code_id] || 0) + 1;
      });

      return codes.map(c => ({
        ...c,
        organization_name: orgMap[c.organization_id] || '',
        contest_name: contestMap[c.contest_id] || '',
        registration_count: regCounts[c.id] || 0,
      })) as OrganizationContestCodeWithDetails[];
    },
    enabled: contestId !== '',
  });
};

export const useCreateInviteCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      organization_id: string;
      contest_id: string;
      invite_code: string;
      registration_fee: number;
      max_registrations?: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: code, error } = await supabase
        .from('organization_contest_codes')
        .insert({ ...data, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return code;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest-invite-codes'] });
      toast.success('Tạo mã mời thành công');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};

export const useDeleteInviteCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organization_contest_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest-invite-codes'] });
      toast.success('Đã xóa mã mời');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};

// ===== Registrations =====
export const useContestRegistrations = (contestId?: string) => {
  return useQuery({
    queryKey: ['contest-registrations', contestId],
    queryFn: async () => {
      let query = supabase
        .from('contest_registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (contestId) {
        query = query.eq('contest_id', contestId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const registrations = data as ContestRegistration[];
      if (registrations.length === 0) return [];

      // Enrich with user + org info
      const userIds = [...new Set(registrations.map(r => r.user_id))];
      const orgIds = [...new Set(registrations.map(r => r.organization_id))];

      const [profilesRes, orgsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name').in('id', userIds),
        supabase.from('organizations').select('id, name').in('id', orgIds),
      ]);

      const profileMap: Record<string, { email: string; full_name: string }> = {};
      (profilesRes.data || []).forEach(p => {
        profileMap[p.id] = { email: p.email || '', full_name: p.full_name || '' };
      });
      const orgMap: Record<string, string> = {};
      (orgsRes.data || []).forEach(o => { orgMap[o.id] = o.name; });

      return registrations.map(r => ({
        ...r,
        user_email: profileMap[r.user_id]?.email || '',
        user_full_name: profileMap[r.user_id]?.full_name || '',
        organization_name: orgMap[r.organization_id] || '',
      }));
    },
    enabled: contestId !== '',
  });
};

export const useApproveRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationId }: { registrationId: string; contestId: string }) => {
      const { error } = await supabase.rpc('approve_registration', { _registration_id: registrationId });
      if (error) throw error;
    },
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: ['contest-registrations', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Đã duyệt đăng ký');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};

export const useRejectRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationId }: { registrationId: string }) => {
      const { error } = await supabase.rpc('reject_registration', { _registration_id: registrationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contest-registrations'] });
      toast.success('Đã từ chối đăng ký');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};

// ===== Public registration (student self-register) =====
export const useRegisterForContest = () => {
  return useMutation({
    mutationFn: async ({ inviteCode }: { inviteCode: string }) => {
      const { data: reg, error } = await supabase.rpc('register_for_contest', { _invite_code: inviteCode.trim().toUpperCase() });
      if (error) throw new Error(error.message);
      const registration = reg as unknown as ContestRegistration;
      return { registration, isFree: registration.payment_status === 'free' };
    },
    onError: (error) => toast.error(error.message),
  });
};
