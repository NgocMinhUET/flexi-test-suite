import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Organization } from '@/types/registration';

export const useOrganizations = () => {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Organization[];
    },
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      code: string;
      description?: string;
      contact_email?: string;
      contact_phone?: string;
      address?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: org, error } = await supabase
        .from('organizations')
        .insert({ ...data, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Tạo đơn vị thành công');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      const { error } = await supabase.from('organizations').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Cập nhật thành công');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizations').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Đã xóa đơn vị');
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });
};
