import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LangSubject, LangSubjectFormData } from '@/types/language';

export function useLangSubjects() {
  return useQuery({
    queryKey: ['lang-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lang_subjects')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      
      return data.map(subject => ({
        ...subject,
        skill_types: subject.skill_types as string[],
        proficiency_levels: subject.proficiency_levels as string[],
        cognitive_levels: (subject.cognitive_levels as string[]) || [],
        matrix_config: subject.matrix_config as any,
      })) as LangSubject[];
    },
  });
}

export function useLangSubject(id: string | undefined) {
  return useQuery({
    queryKey: ['lang-subject', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('lang_subjects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        skill_types: data.skill_types as string[],
        proficiency_levels: data.proficiency_levels as string[],
        cognitive_levels: (data.cognitive_levels as string[]) || [],
        matrix_config: data.matrix_config as any,
      } as LangSubject;
    },
    enabled: !!id,
  });
}

export function useCreateLangSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: LangSubjectFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lang_subjects')
        .insert({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          icon: formData.icon || 'Languages',
          skill_types: formData.skill_types as unknown as any,
          proficiency_levels: formData.proficiency_levels as unknown as any,
          cognitive_levels: (formData.cognitive_levels || []) as unknown as any,
          matrix_config: formData.matrix_config as unknown as any,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-subjects'] });
      toast({ title: 'Thành công', description: 'Đã tạo môn học ngoại ngữ mới' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Lỗi', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateLangSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<LangSubjectFormData> }) => {
      const { data, error } = await supabase
        .from('lang_subjects')
        .update({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          skill_types: formData.skill_types as unknown as any,
          proficiency_levels: formData.proficiency_levels as unknown as any,
          cognitive_levels: formData.cognitive_levels as unknown as any,
          matrix_config: formData.matrix_config as unknown as any,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-subjects'] });
      toast({ title: 'Thành công', description: 'Đã cập nhật môn học' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Lỗi', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteLangSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lang_subjects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-subjects'] });
      toast({ title: 'Thành công', description: 'Đã xóa môn học' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Lỗi', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
