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
        supabase.from('contest_registrations').select('invite_code_id').in('invite_code_id', codeIds),
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
    mutationFn: async ({ registrationId, contestId }: { registrationId: string; contestId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // 1. Update payment status
      const { data: reg, error: updateError } = await supabase
        .from('contest_registrations')
        .update({
          payment_status: 'paid',
          approved_by: user.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', registrationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Add to contest_participants if not already there
      const registration = reg as ContestRegistration;
      const { error: participantError } = await supabase
        .from('contest_participants')
        .upsert({
          contest_id: contestId,
          user_id: registration.user_id,
        }, { onConflict: 'contest_id,user_id', ignoreDuplicates: true });

      if (participantError) throw participantError;

      // 3. Auto-assign exam if contest already has distributed exams
      const { data: exams } = await supabase
        .from('contest_exams')
        .select('exam_id')
        .eq('contest_id', contestId);

      if (exams && exams.length > 0) {
        // Check if participant already has an assigned exam
        const { data: participant } = await supabase
          .from('contest_participants')
          .select('id, assigned_exam_id')
          .eq('contest_id', contestId)
          .eq('user_id', registration.user_id)
          .single();

        if (participant && !participant.assigned_exam_id) {
          // Get current assignment counts for balanced distribution
          const { data: allParticipants } = await supabase
            .from('contest_participants')
            .select('assigned_exam_id')
            .eq('contest_id', contestId)
            .not('assigned_exam_id', 'is', null);

          const assignmentCounts = new Map<string, number>();
          exams.forEach(e => assignmentCounts.set(e.exam_id, 0));
          (allParticipants || []).forEach(p => {
            if (p.assigned_exam_id) {
              assignmentCounts.set(p.assigned_exam_id, (assignmentCounts.get(p.assigned_exam_id) || 0) + 1);
            }
          });

          // Pick the exam with the fewest assignments
          let selectedExamId = exams[0].exam_id;
          let minCount = Infinity;
          for (const [examId, count] of assignmentCounts.entries()) {
            if (count < minCount) {
              minCount = count;
              selectedExamId = examId;
            }
          }

          await supabase
            .from('contest_participants')
            .update({
              assigned_exam_id: selectedExamId,
              assigned_at: new Date().toISOString(),
            })
            .eq('id', participant.id);
        }
      }
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
      const { error } = await supabase
        .from('contest_registrations')
        .update({ payment_status: 'failed' })
        .eq('id', registrationId);
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
      // 1. Look up the invite code
      const { data: codeData, error: codeError } = await supabase
        .from('organization_contest_codes')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) throw new Error('Mã mời không hợp lệ hoặc đã hết hạn');

      const code = codeData as OrganizationContestCode;

      // 2. Check max registrations
      if (code.max_registrations) {
        const { count } = await supabase
          .from('contest_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('invite_code_id', code.id);

        if (count && count >= code.max_registrations) {
          throw new Error('Mã mời đã đạt giới hạn đăng ký');
        }
      }

      // 3. Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Bạn cần đăng nhập để đăng ký');

      // 4. Check already registered
      const { data: existing } = await supabase
        .from('contest_registrations')
        .select('id')
        .eq('contest_id', code.contest_id)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (existing) throw new Error('Bạn đã đăng ký cuộc thi này rồi');

      // 5. Determine payment method
      const isFree = code.registration_fee === 0;
      const paymentStatus = isFree ? 'free' : 'pending';
      const paymentMethod = isFree ? 'free' : 'bank_transfer';

      // 6. Create registration
      const { data: reg, error: regError } = await supabase
        .from('contest_registrations')
        .insert({
          contest_id: code.contest_id,
          user_id: userData.user.id,
          organization_id: code.organization_id,
          invite_code_id: code.id,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          payment_amount: code.registration_fee,
          currency: code.currency,
        })
        .select()
        .single();

      if (regError) throw regError;

      // 7. If free, auto-add to contest_participants
      if (isFree) {
        await supabase
          .from('contest_participants')
          .upsert({
            contest_id: code.contest_id,
            user_id: userData.user.id,
          }, { onConflict: 'contest_id,user_id', ignoreDuplicates: true });
      }

      return { registration: reg, code, isFree };
    },
    onError: (error) => toast.error(error.message),
  });
};
