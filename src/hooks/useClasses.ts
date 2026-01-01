import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  Class,
  ClassWithDetails,
  ClassStudent,
  ClassStudentWithProfile,
  ClassTeacher,
  ClassTeacherWithProfile,
  CreateClassInput,
  UpdateClassInput,
  EnrollStudentInput,
  BulkEnrollInput,
  AssignTeacherInput,
  EnrollmentStatus,
  ClassMemberRole,
  StudentEnrolledClass,
} from '@/types/class';

// =============================================
// CLASSES HOOKS
// =============================================

// Fetch all classes (for teachers/admins)
export function useClasses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['classes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          subjects (id, name, code)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get student counts for each class
      const classIds = data.map(c => c.id);
      const { data: studentCounts } = await supabase
        .from('class_students')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'active');

      const countMap = new Map<string, number>();
      studentCounts?.forEach(s => {
        countMap.set(s.class_id, (countMap.get(s.class_id) || 0) + 1);
      });

      return data.map(c => ({
        ...c,
        student_count: countMap.get(c.id) || 0,
      })) as ClassWithDetails[];
    },
    enabled: !!user,
  });
}

// Fetch single class
export function useClass(classId: string | undefined) {
  return useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      if (!classId) return null;

      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          subjects (id, name, code)
        `)
        .eq('id', classId)
        .maybeSingle();

      if (error) throw error;
      return data as ClassWithDetails | null;
    },
    enabled: !!classId,
  });
}

// Create class
export function useCreateClass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Tạo lớp học thành công!');
    },
    onError: (error: Error) => {
      console.error('Error creating class:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('Mã lớp đã tồn tại, vui lòng chọn mã khác');
      } else {
        toast.error('Không thể tạo lớp học');
      }
    },
  });
}

// Update class
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateClassInput) => {
      const { data, error } = await supabase
        .from('classes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Class;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', data.id] });
      toast.success('Cập nhật lớp học thành công!');
    },
    onError: (error: Error) => {
      console.error('Error updating class:', error);
      toast.error('Không thể cập nhật lớp học');
    },
  });
}

// Delete class (soft delete)
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Xóa lớp học thành công!');
    },
    onError: (error: Error) => {
      console.error('Error deleting class:', error);
      toast.error('Không thể xóa lớp học');
    },
  });
}

// =============================================
// CLASS STUDENTS HOOKS
// =============================================

// Fetch students in a class
export function useClassStudents(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('class_students')
        .select('*')
        .eq('class_id', classId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const studentIds = data.map(s => s.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(s => ({
        ...s,
        profiles: profileMap.get(s.student_id) || null,
      })) as ClassStudentWithProfile[];
    },
    enabled: !!classId,
  });
}

// Enroll a student
export function useEnrollStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: EnrollStudentInput) => {
      const { data, error } = await supabase
        .from('class_students')
        .insert({
          ...input,
          enrolled_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClassStudent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-students', variables.class_id] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Thêm học sinh thành công!');
    },
    onError: (error: Error) => {
      console.error('Error enrolling student:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('Học sinh đã có trong lớp');
      } else {
        toast.error('Không thể thêm học sinh');
      }
    },
  });
}

// Bulk enroll students
export function useBulkEnrollStudents() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ class_id, student_ids }: BulkEnrollInput) => {
      const enrollments = student_ids.map(student_id => ({
        class_id,
        student_id,
        enrolled_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('class_students')
        .upsert(enrollments, { 
          onConflict: 'class_id,student_id',
          ignoreDuplicates: true 
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-students', variables.class_id] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Thêm học sinh thành công!');
    },
    onError: (error: Error) => {
      console.error('Error bulk enrolling students:', error);
      toast.error('Không thể thêm học sinh');
    },
  });
}

// Update student enrollment
export function useUpdateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      role, 
      notes 
    }: { 
      id: string; 
      status?: EnrollmentStatus; 
      role?: ClassMemberRole;
      notes?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (role !== undefined) updateData.role = role;
      if (notes !== undefined) updateData.notes = notes;

      const { data, error } = await supabase
        .from('class_students')
        .update(updateData)
        .eq('id', id)
        .select('*, class_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['class-students', data.class_id] });
      toast.success('Cập nhật thành công!');
    },
    onError: (error: Error) => {
      console.error('Error updating enrollment:', error);
      toast.error('Không thể cập nhật');
    },
  });
}

// Remove student from class
export function useRemoveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, classId }: { enrollmentId: string; classId: string }) => {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;
      return classId;
    },
    onSuccess: (classId) => {
      queryClient.invalidateQueries({ queryKey: ['class-students', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Xóa học sinh khỏi lớp thành công!');
    },
    onError: (error: Error) => {
      console.error('Error removing student:', error);
      toast.error('Không thể xóa học sinh');
    },
  });
}

// =============================================
// CLASS TEACHERS HOOKS
// =============================================

// Fetch teachers in a class
export function useClassTeachers(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-teachers', classId],
    queryFn: async () => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('class_teachers')
        .select('*, subjects (id, name, code)')
        .eq('class_id', classId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const teacherIds = data.map(t => t.teacher_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', teacherIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(t => ({
        ...t,
        profiles: profileMap.get(t.teacher_id) || null,
      })) as ClassTeacherWithProfile[];
    },
    enabled: !!classId,
  });
}

// Assign teacher to class
export function useAssignTeacher() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AssignTeacherInput) => {
      const { data, error } = await supabase
        .from('class_teachers')
        .insert({
          ...input,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClassTeacher;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-teachers', variables.class_id] });
      toast.success('Phân công giáo viên thành công!');
    },
    onError: (error: Error) => {
      console.error('Error assigning teacher:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('Giáo viên đã được phân công');
      } else {
        toast.error('Không thể phân công giáo viên');
      }
    },
  });
}

// Remove teacher from class
export function useRemoveTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, classId }: { assignmentId: string; classId: string }) => {
      const { error } = await supabase
        .from('class_teachers')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      return classId;
    },
    onSuccess: (classId) => {
      queryClient.invalidateQueries({ queryKey: ['class-teachers', classId] });
      toast.success('Xóa phân công thành công!');
    },
    onError: (error: Error) => {
      console.error('Error removing teacher:', error);
      toast.error('Không thể xóa phân công');
    },
  });
}

// =============================================
// STUDENT VIEW HOOKS
// =============================================

// Fetch classes student is enrolled in
export function useMyClasses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('class_students')
        .select(`
          id,
          enrolled_at,
          status,
          role,
          classes (
            *,
            subjects (id, name, code)
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        class: item.classes as ClassWithDetails,
        enrolled_at: item.enrolled_at,
        status: item.status,
        role: item.role,
      })) as StudentEnrolledClass[];
    },
    enabled: !!user?.id,
  });
}

// =============================================
// UTILITY HOOKS
// =============================================

// Fetch available students (not in a specific class)
export function useAvailableStudents(classId: string | undefined) {
  return useQuery({
    queryKey: ['available-students', classId],
    queryFn: async () => {
      // Get all students
      const { data: allStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Filter to only students with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentUserIds = new Set(studentRoles.map(r => r.user_id));
      let availableStudents = allStudents.filter(s => studentUserIds.has(s.id));

      // If classId provided, exclude already enrolled students
      if (classId) {
        const { data: enrolled } = await supabase
          .from('class_students')
          .select('student_id')
          .eq('class_id', classId);

        const enrolledIds = new Set(enrolled?.map(e => e.student_id) || []);
        availableStudents = availableStudents.filter(s => !enrolledIds.has(s.id));
      }

      return availableStudents;
    },
    enabled: true,
  });
}

// Fetch classes for assignment dropdown
export function useClassesForAssignment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['classes-for-assignment', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, code, name, subjects (id, name)')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
