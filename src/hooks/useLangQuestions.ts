import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  LangQuestion, 
  LangQuestionFormData, 
  LangQuestionType,
  LangQuestionStatus,
  SkillType 
} from '@/types/language';

interface LangQuestionFilters {
  subject_id?: string;
  taxonomy_node_id?: string;
  skill_type?: SkillType;
  question_type?: LangQuestionType;
  status?: LangQuestionStatus;
  proficiency_level?: string;
  search?: string;
}

export function useLangQuestions(filters: LangQuestionFilters = {}) {
  return useQuery({
    queryKey: ['lang-questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('lang_questions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.subject_id) {
        query = query.eq('subject_id', filters.subject_id);
      }
      if (filters.taxonomy_node_id) {
        query = query.eq('taxonomy_node_id', filters.taxonomy_node_id);
      }
      if (filters.skill_type) {
        query = query.eq('skill_type', filters.skill_type);
      }
      if (filters.question_type) {
        query = query.eq('question_type', filters.question_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.proficiency_level) {
        query = query.eq('proficiency_level', filters.proficiency_level);
      }
      if (filters.search) {
        query = query.ilike('content_plain', `%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data as LangQuestion[];
    },
    enabled: !!filters.subject_id,
  });
}

export function useLangQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['lang-question', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('lang_questions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as LangQuestion;
    },
    enabled: !!id,
  });
}

export function useCreateLangQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: LangQuestionFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Extract plain text from HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formData.content;
      const contentPlain = tempDiv.textContent || tempDiv.innerText || '';

      const insertData = {
        subject_id: formData.subject_id,
        taxonomy_node_id: formData.taxonomy_node_id,
        code: formData.code,
        question_type: formData.question_type as string,
        skill_type: formData.skill_type,
        proficiency_level: formData.proficiency_level,
        difficulty: formData.difficulty,
        estimated_time: formData.estimated_time,
        points: formData.points,
        content: formData.content,
        content_plain: contentPlain,
        audio_url: formData.audio_url,
        audio_duration: formData.audio_duration,
        audio_transcript: formData.audio_transcript,
        audio_play_count: formData.audio_play_count || 2,
        image_url: formData.image_url,
        answer_data: formData.answer_data as unknown as Record<string, unknown>,
        labels: formData.labels || [],
        created_by: userData.user?.id,
        status: 'draft' as const,
      };

      const { data, error } = await supabase
        .from('lang_questions')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-questions'] });
      toast({ title: 'Thành công', description: 'Đã tạo câu hỏi mới' });
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

export function useUpdateLangQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<LangQuestionFormData> }) => {
      let contentPlain: string | undefined;
      if (formData.content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formData.content;
        contentPlain = tempDiv.textContent || tempDiv.innerText || '';
      }

      const updatePayload: Record<string, unknown> = {};
      if (formData.taxonomy_node_id !== undefined) updatePayload.taxonomy_node_id = formData.taxonomy_node_id;
      if (formData.code !== undefined) updatePayload.code = formData.code;
      if (formData.question_type) updatePayload.question_type = formData.question_type as string;
      if (formData.skill_type) updatePayload.skill_type = formData.skill_type;
      if (formData.proficiency_level) updatePayload.proficiency_level = formData.proficiency_level;
      if (formData.difficulty !== undefined) updatePayload.difficulty = formData.difficulty;
      if (formData.estimated_time !== undefined) updatePayload.estimated_time = formData.estimated_time;
      if (formData.points !== undefined) updatePayload.points = formData.points;
      if (formData.content) {
        updatePayload.content = formData.content;
        updatePayload.content_plain = contentPlain;
      }
      if (formData.audio_url !== undefined) updatePayload.audio_url = formData.audio_url;
      if (formData.audio_duration !== undefined) updatePayload.audio_duration = formData.audio_duration;
      if (formData.audio_transcript !== undefined) updatePayload.audio_transcript = formData.audio_transcript;
      if (formData.audio_play_count !== undefined) updatePayload.audio_play_count = formData.audio_play_count;
      if (formData.image_url !== undefined) updatePayload.image_url = formData.image_url;
      if (formData.answer_data) updatePayload.answer_data = formData.answer_data as unknown as Record<string, unknown>;
      if (formData.labels) updatePayload.labels = formData.labels;

      const { data, error } = await supabase
        .from('lang_questions')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-questions'] });
      toast({ title: 'Thành công', description: 'Đã cập nhật câu hỏi' });
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

export function useUpdateLangQuestionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      rejectionReason 
    }: { 
      id: string; 
      status: LangQuestionStatus; 
      rejectionReason?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'approved' || status === 'published') {
        updateData.reviewed_by = userData.user?.id;
        updateData.reviewed_at = new Date().toISOString();
        updateData.rejection_reason = null;
      }
      
      if (status === 'draft' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('lang_questions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-questions'] });
      toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái câu hỏi' });
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

export function useDeleteLangQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lang_questions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lang-questions'] });
      toast({ title: 'Thành công', description: 'Đã xóa câu hỏi' });
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
