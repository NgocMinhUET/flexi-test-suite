import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function useAllStudents(enabled = true) {
  return useQuery({
    queryKey: ['all-students'],
    queryFn: async (): Promise<StudentProfile[]> => {
      // Get all users with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = studentRoles?.map(r => r.user_id) || [];

      if (studentIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      return profiles as StudentProfile[];
    },
    enabled,
  });
}
