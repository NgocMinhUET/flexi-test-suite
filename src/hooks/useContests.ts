import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Contest, ContestExam, ContestParticipant, ContestWithDetails } from '@/types/contest';

// Fetch all contests with counts
export const useContests = () => {
  return useQuery({
    queryKey: ['contests'],
    queryFn: async () => {
      const { data: contests, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get counts for each contest
      const contestsWithCounts = await Promise.all(
        (contests as Contest[]).map(async (contest) => {
          const [examsResult, participantsResult] = await Promise.all([
            supabase
              .from('contest_exams')
              .select('id', { count: 'exact', head: true })
              .eq('contest_id', contest.id),
            supabase
              .from('contest_participants')
              .select('id, assigned_exam_id', { count: 'exact' })
              .eq('contest_id', contest.id),
          ]);

          const participants = participantsResult.data || [];
          const assignedCount = participants.filter(p => p.assigned_exam_id).length;

          return {
            ...contest,
            exams: [],
            participants: [],
            exam_count: examsResult.count || 0,
            participant_count: participantsResult.count || 0,
            assigned_count: assignedCount,
          } as ContestWithDetails;
        })
      );

      return contestsWithCounts;
    },
  });
};

// Fetch single contest with full details
export const useContest = (contestId: string | undefined) => {
  return useQuery({
    queryKey: ['contest', contestId],
    queryFn: async () => {
      if (!contestId) return null;

      const [contestResult, examsResult, participantsResult] = await Promise.all([
        supabase.from('contests').select('*').eq('id', contestId).single(),
        supabase.from('contest_exams').select('*').eq('contest_id', contestId),
        supabase
          .from('contest_participants')
          .select('*')
          .eq('contest_id', contestId),
      ]);

      if (contestResult.error) throw contestResult.error;

      const participants = participantsResult.data || [];
      const assignedCount = participants.filter(p => p.assigned_exam_id).length;

      return {
        ...contestResult.data as Contest,
        exams: (examsResult.data || []) as ContestExam[],
        participants: participants as ContestParticipant[],
        exam_count: examsResult.data?.length || 0,
        participant_count: participants.length,
        assigned_count: assignedCount,
      } as ContestWithDetails;
    },
    enabled: !!contestId,
  });
};

// Create contest
export const useCreateContest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string; 
      subject: string;
      start_time?: string;
      end_time?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: contest, error } = await supabase
        .from('contests')
        .insert({
          ...data,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return contest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Tạo cuộc thi thành công');
    },
    onError: (error) => {
      toast.error('Lỗi khi tạo cuộc thi: ' + error.message);
    },
  });
};

// Add exams to contest
export const useAddExamsToContest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contestId, 
      exams 
    }: { 
      contestId: string; 
      exams: { exam_id: string; variant_code: string }[] 
    }) => {
      const { error } = await supabase
        .from('contest_exams')
        .insert(exams.map(e => ({
          contest_id: contestId,
          exam_id: e.exam_id,
          variant_code: e.variant_code,
        })));

      if (error) throw error;
    },
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Đã thêm đề thi vào cuộc thi');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

// Add participants to contest (with auto-distribution for active contests)
export const useAddParticipantsToContest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contestId, 
      userIds 
    }: { 
      contestId: string; 
      userIds: string[] 
    }) => {
      // First, get the contest status and exams
      const { data: contest, error: contestError } = await supabase
        .from('contests')
        .select('status')
        .eq('id', contestId)
        .single();

      if (contestError) throw contestError;

      // Insert participants
      const { error } = await supabase
        .from('contest_participants')
        .insert(userIds.map(userId => ({
          contest_id: contestId,
          user_id: userId,
        })));

      if (error) throw error;

      // If contest is active, auto-distribute exams to new participants
      if (contest.status === 'active') {
        // Get contest exams
        const { data: exams, error: examsError } = await supabase
          .from('contest_exams')
          .select('*')
          .eq('contest_id', contestId);

        if (examsError) throw examsError;

        if (exams && exams.length > 0) {
          // Get the newly inserted participants
          const { data: newParticipants, error: participantsError } = await supabase
            .from('contest_participants')
            .select('id, user_id')
            .eq('contest_id', contestId)
            .in('user_id', userIds)
            .is('assigned_exam_id', null);

          if (participantsError) throw participantsError;

          if (newParticipants && newParticipants.length > 0) {
            // Get current assignment counts for balanced distribution
            const { data: allParticipants } = await supabase
              .from('contest_participants')
              .select('assigned_exam_id')
              .eq('contest_id', contestId)
              .not('assigned_exam_id', 'is', null);

            // Count assignments per exam
            const assignmentCounts = new Map<string, number>();
            exams.forEach(e => assignmentCounts.set(e.exam_id, 0));
            (allParticipants || []).forEach(p => {
              if (p.assigned_exam_id) {
                assignmentCounts.set(p.assigned_exam_id, (assignmentCounts.get(p.assigned_exam_id) || 0) + 1);
              }
            });

            // Assign exams with balanced distribution
            const now = new Date().toISOString();
            for (const participant of newParticipants) {
              // Find exam with minimum assignments
              let minCount = Infinity;
              let selectedExamId = exams[0].exam_id;
              
              for (const exam of exams) {
                const count = assignmentCounts.get(exam.exam_id) || 0;
                if (count < minCount) {
                  minCount = count;
                  selectedExamId = exam.exam_id;
                }
              }

              // Update participant with assigned exam
              const { error: updateError } = await supabase
                .from('contest_participants')
                .update({ 
                  assigned_exam_id: selectedExamId,
                  assigned_at: now,
                })
                .eq('id', participant.id);

              if (updateError) throw updateError;

              assignmentCounts.set(selectedExamId, (assignmentCounts.get(selectedExamId) || 0) + 1);
            }
          }
        }
      }

      return { autoDistributed: contest.status === 'active' };
    },
    onSuccess: (result, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      if (result.autoDistributed) {
        toast.success('Đã thêm thí sinh và tự động phân phối đề');
      } else {
        toast.success('Đã thêm thí sinh vào cuộc thi');
      }
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

// Remove participant from contest
export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, participantId }: { contestId: string; participantId: string }) => {
      const { error } = await supabase
        .from('contest_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

// Distribute exams to participants (balanced distribution)
export const useDistributeExams = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contestId: string) => {
      // Get contest exams and participants
      const [examsResult, participantsResult] = await Promise.all([
        supabase.from('contest_exams').select('*').eq('contest_id', contestId),
        supabase.from('contest_participants').select('*').eq('contest_id', contestId).is('assigned_exam_id', null),
      ]);

      if (examsResult.error) throw examsResult.error;
      if (participantsResult.error) throw participantsResult.error;

      const exams = examsResult.data as ContestExam[];
      const unassignedParticipants = participantsResult.data as ContestParticipant[];

      if (exams.length === 0) {
        throw new Error('Cuộc thi chưa có đề thi nào');
      }
      if (unassignedParticipants.length === 0) {
        throw new Error('Không có thí sinh nào cần phân phối');
      }

      // Get current assignment counts for balanced distribution
      const { data: allParticipants } = await supabase
        .from('contest_participants')
        .select('assigned_exam_id')
        .eq('contest_id', contestId)
        .not('assigned_exam_id', 'is', null);

      // Count assignments per exam
      const assignmentCounts = new Map<string, number>();
      exams.forEach(e => assignmentCounts.set(e.exam_id, 0));
      (allParticipants || []).forEach(p => {
        if (p.assigned_exam_id) {
          assignmentCounts.set(p.assigned_exam_id, (assignmentCounts.get(p.assigned_exam_id) || 0) + 1);
        }
      });

      // Assign exams with balanced distribution
      const updates: { id: string; assigned_exam_id: string }[] = [];
      
      for (const participant of unassignedParticipants) {
        // Find exam with minimum assignments
        let minCount = Infinity;
        let selectedExamId = exams[0].exam_id;
        
        for (const exam of exams) {
          const count = assignmentCounts.get(exam.exam_id) || 0;
          if (count < minCount) {
            minCount = count;
            selectedExamId = exam.exam_id;
          }
        }

        updates.push({ id: participant.id, assigned_exam_id: selectedExamId });
        assignmentCounts.set(selectedExamId, (assignmentCounts.get(selectedExamId) || 0) + 1);
      }

      // Update all participants
      const now = new Date().toISOString();
      for (const update of updates) {
        const { error } = await supabase
          .from('contest_participants')
          .update({ 
            assigned_exam_id: update.assigned_exam_id,
            assigned_at: now,
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update contest distribution status
      const { error: contestError } = await supabase
        .from('contests')
        .update({ distribution_status: 'distributed' })
        .eq('id', contestId);

      if (contestError) throw contestError;

      return updates.length;
    },
    onSuccess: (count, contestId) => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success(`Đã phân phối đề cho ${count} thí sinh`);
    },
    onError: (error) => {
      toast.error('Lỗi phân phối: ' + error.message);
    },
  });
};

// Update contest status
export const useUpdateContestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contestId, status }: { contestId: string; status: Contest['status'] }) => {
      const { error } = await supabase
        .from('contests')
        .update({ status })
        .eq('id', contestId);

      if (error) throw error;
    },
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Đã cập nhật trạng thái cuộc thi');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

// Update contest details
export const useUpdateContest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contestId, 
      data 
    }: { 
      contestId: string; 
      data: { 
        name?: string; 
        description?: string; 
        start_time?: string | null;
        end_time?: string | null;
      } 
    }) => {
      const { error } = await supabase
        .from('contests')
        .update(data)
        .eq('id', contestId);

      if (error) throw error;
    },
    onSuccess: (_, { contestId }) => {
      queryClient.invalidateQueries({ queryKey: ['contest', contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Đã cập nhật cuộc thi');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

// Delete contest
export const useDeleteContest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contestId: string) => {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Đã xóa cuộc thi');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};
