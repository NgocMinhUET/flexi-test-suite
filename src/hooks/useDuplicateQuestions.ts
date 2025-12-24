import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DuplicateGroup {
  content_plain: string;
  questions: {
    id: string;
    code: string;
    content: string;
    status: 'draft' | 'review' | 'approved' | 'published';
    created_at: string;
    cognitive_level: string | null;
    question_type: string;
  }[];
  keepId: string; // ID of question to keep
}

const STATUS_PRIORITY: Record<string, number> = {
  published: 4,
  approved: 3,
  review: 2,
  draft: 1,
};

function selectBestQuestion(questions: DuplicateGroup['questions']): string {
  const sorted = [...questions].sort((a, b) => {
    // First by status priority (higher is better)
    const statusDiff = (STATUS_PRIORITY[b.status] || 0) - (STATUS_PRIORITY[a.status] || 0);
    if (statusDiff !== 0) return statusDiff;
    // Then by created_at (older is better - original)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  return sorted[0].id;
}

export function useDuplicateQuestions(subjectId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ['duplicate-questions', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];

      // Get all questions for this subject
      const { data: questions, error } = await supabase
        .from('questions')
        .select('id, code, content, content_plain, status, created_at, cognitive_level, question_type')
        .eq('subject_id', subjectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!questions) return [];

      // Group by content_plain
      const groups = new Map<string, DuplicateGroup['questions']>();
      
      for (const q of questions) {
        const key = (q.content_plain || '').trim().toLowerCase();
        if (!key) continue;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push({
          id: q.id,
          code: q.code || '',
          content: q.content,
          status: q.status as DuplicateGroup['questions'][0]['status'],
          created_at: q.created_at,
          cognitive_level: q.cognitive_level,
          question_type: q.question_type,
        });
      }

      // Filter to only groups with duplicates (>1 question)
      const duplicateGroups: DuplicateGroup[] = [];
      
      for (const [content_plain, groupQuestions] of groups.entries()) {
        if (groupQuestions.length > 1) {
          duplicateGroups.push({
            content_plain,
            questions: groupQuestions,
            keepId: selectBestQuestion(groupQuestions),
          });
        }
      }

      // Sort by number of duplicates (descending)
      duplicateGroups.sort((a, b) => b.questions.length - a.questions.length);

      return duplicateGroups;
    },
    enabled: !!subjectId && enabled, // Only run when explicitly enabled
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

export function useCleanupDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groups: DuplicateGroup[]) => {
      // Collect all IDs to delete (excluding keepId from each group)
      const idsToDelete: string[] = [];
      
      for (const group of groups) {
        for (const q of group.questions) {
          if (q.id !== group.keepId) {
            idsToDelete.push(q.id);
          }
        }
      }

      if (idsToDelete.length === 0) {
        return { deleted: 0 };
      }

      // Call edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('cleanup-duplicates', {
        body: { questionIds: idsToDelete },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { deleted: data.deleted || idsToDelete.length };
    },
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.deleted} câu hỏi trùng lặp`);
      queryClient.invalidateQueries({ queryKey: ['duplicate-questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (error) => {
      console.error('Cleanup error:', error);
      toast.error('Lỗi khi xóa câu hỏi trùng lặp');
    },
  });
}
