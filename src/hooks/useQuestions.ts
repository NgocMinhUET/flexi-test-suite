import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Question, QuestionFormData, QuestionFilters, QuestionStatus } from '@/types/questionBank';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

// Strip HTML for plain text search
function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function useQuestions(filters: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('subject_id', filters.subject_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.taxonomy_node_id) {
        query = query.eq('taxonomy_node_id', filters.taxonomy_node_id);
      }
      if (filters.cognitive_level) {
        query = query.eq('cognitive_level', filters.cognitive_level);
      }
      if (filters.question_type) {
        query = query.eq('question_type', filters.question_type as any);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('content_plain', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Question[];
    },
    enabled: !!filters.subject_id,
  });
}

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Question | null;
    },
    enabled: !!id,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: QuestionFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const contentPlain = stripHtml(formData.content);

      // Build taxonomy path
      let taxonomyPath: string[] = [];
      if (formData.taxonomy_node_id) {
        const { data: node } = await supabase
          .from('taxonomy_nodes')
          .select('name, parent_id')
          .eq('id', formData.taxonomy_node_id)
          .single();

        if (node) {
          taxonomyPath = [node.name];
          let parentId = node.parent_id;
          while (parentId) {
            const { data: parent } = await supabase
              .from('taxonomy_nodes')
              .select('name, parent_id')
              .eq('id', parentId)
              .single();
            if (parent) {
              taxonomyPath.unshift(parent.name);
              parentId = parent.parent_id;
            } else {
              break;
            }
          }
        }
      }

      const insertData = {
        subject_id: formData.subject_id,
        content: formData.content,
        content_plain: contentPlain,
        taxonomy_node_id: formData.taxonomy_node_id || null,
        taxonomy_path: taxonomyPath as unknown as Json,
        cognitive_level: formData.cognitive_level || null,
        question_type: formData.question_type as string,
        answer_data: formData.answer_data as unknown as Json,
        labels: (formData.labels || []) as unknown as Json,
        difficulty: formData.difficulty ?? 0.5,
        estimated_time: formData.estimated_time ?? 60,
        allow_shuffle: formData.allow_shuffle ?? true,
        is_group_lead: formData.is_group_lead ?? false,
        media: [] as unknown as Json,
        group_id: formData.group_id || null,
        group_order: formData.group_order || null,
        code: formData.code || null,
        status: 'draft' as const,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('questions')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã tạo câu hỏi');
    },
    onError: (error) => {
      console.error('Error creating question:', error);
      toast.error('Lỗi khi tạo câu hỏi');
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuestionFormData> }) => {
      const updateData: Record<string, unknown> = { ...data };

      if (data.content) {
        updateData.content_plain = stripHtml(data.content);
      }

      // Rebuild taxonomy path if taxonomy_node_id changed
      if (data.taxonomy_node_id) {
        let taxonomyPath: string[] = [];
        const { data: node } = await supabase
          .from('taxonomy_nodes')
          .select('name, parent_id')
          .eq('id', data.taxonomy_node_id)
          .single();

        if (node) {
          taxonomyPath = [node.name];
          let parentId = node.parent_id;
          while (parentId) {
            const { data: parent } = await supabase
              .from('taxonomy_nodes')
              .select('name, parent_id')
              .eq('id', parentId)
              .single();
            if (parent) {
              taxonomyPath.unshift(parent.name);
              parentId = parent.parent_id;
            } else {
              break;
            }
          }
        }
        updateData.taxonomy_path = taxonomyPath;
      }

      const { data: result, error } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions', 'detail', id] });
      toast.success('Đã cập nhật câu hỏi');
    },
    onError: (error) => {
      console.error('Error updating question:', error);
      toast.error('Lỗi khi cập nhật câu hỏi');
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('questions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã xóa câu hỏi');
    },
    onError: (error) => {
      console.error('Error deleting question:', error);
      toast.error('Lỗi khi xóa câu hỏi');
    },
  });
}

// Workflow mutations
export function useSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .update({ status: 'review' as QuestionStatus })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã gửi câu hỏi để duyệt');
    },
    onError: (error) => {
      console.error('Error submitting for review:', error);
      toast.error('Lỗi khi gửi duyệt');
    },
  });
}

export function useApproveQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('questions')
        .update({
          status: 'approved' as QuestionStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã duyệt câu hỏi');
    },
    onError: (error) => {
      console.error('Error approving question:', error);
      toast.error('Lỗi khi duyệt câu hỏi');
    },
  });
}

export function useRejectQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('questions')
        .update({
          status: 'draft' as QuestionStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã từ chối câu hỏi');
    },
    onError: (error) => {
      console.error('Error rejecting question:', error);
      toast.error('Lỗi khi từ chối câu hỏi');
    },
  });
}

export function usePublishQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .update({ status: 'published' as QuestionStatus })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã xuất bản câu hỏi');
    },
    onError: (error) => {
      console.error('Error publishing question:', error);
      toast.error('Lỗi khi xuất bản câu hỏi');
    },
  });
}

// Bulk operations
export function useBulkDeleteQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('questions')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Đã xóa các câu hỏi đã chọn');
    },
    onError: (error) => {
      console.error('Error bulk deleting questions:', error);
      toast.error('Lỗi khi xóa câu hỏi');
    },
  });
}

export function useBulkSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      
      const { error } = await supabase
        .from('questions')
        .update({ status: 'review' as QuestionStatus })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success(`Đã gửi ${ids.length} câu hỏi để duyệt`);
    },
    onError: (error) => {
      console.error('Error bulk submitting for review:', error);
      toast.error('Lỗi khi gửi duyệt');
    },
  });
}

export function useBulkApproveQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('questions')
        .update({
          status: 'approved' as QuestionStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success(`Đã duyệt ${ids.length} câu hỏi`);
    },
    onError: (error) => {
      console.error('Error bulk approving questions:', error);
      toast.error('Lỗi khi duyệt câu hỏi');
    },
  });
}

export function useBulkPublishQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      
      const { error } = await supabase
        .from('questions')
        .update({ status: 'published' as QuestionStatus })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success(`Đã xuất bản ${ids.length} câu hỏi`);
    },
    onError: (error) => {
      console.error('Error bulk publishing questions:', error);
      toast.error('Lỗi khi xuất bản câu hỏi');
    },
  });
}
