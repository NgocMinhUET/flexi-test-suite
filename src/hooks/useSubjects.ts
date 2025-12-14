import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Subject, SubjectFormData } from '@/types/questionBank';
import { toast } from 'sonner';

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as Subject[];
    },
  });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ['subjects', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as Subject | null;
    },
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: SubjectFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Đã tạo môn học');
    },
    onError: (error) => {
      console.error('Error creating subject:', error);
      toast.error('Lỗi khi tạo môn học');
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubjectFormData> }) => {
      const { data: result, error } = await supabase
        .from('subjects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subjects', id] });
      toast.success('Đã cập nhật môn học');
    },
    onError: (error) => {
      console.error('Error updating subject:', error);
      toast.error('Lỗi khi cập nhật môn học');
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('subjects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Đã xóa môn học');
    },
    onError: (error) => {
      console.error('Error deleting subject:', error);
      toast.error('Lỗi khi xóa môn học');
    },
  });
}
