import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { 
  PracticeAssignment, 
  PracticeAssignmentWithDetails,
  PracticeAssignmentAttempt,
  AssignedPracticeForStudent,
  QuestionResult,
  AttemptAnalysis,
  SkillAnalysis
} from '@/types/practiceAssignment';

// ========== ADMIN/TEACHER HOOKS ==========

// Fetch all practice assignments created by the current user or all (admin)
export function usePracticeAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['practice-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_assignments')
        .select(`
          *,
          subjects (id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get student counts and attempt counts for each assignment
      const enrichedData = await Promise.all((data || []).map(async (assignment) => {
        const { count: studentCount } = await supabase
          .from('practice_assignment_students')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id);

        const { count: attemptCount } = await supabase
          .from('practice_assignment_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id);

        return {
          ...assignment,
          student_count: studentCount || 0,
          attempt_count: attemptCount || 0,
        } as PracticeAssignmentWithDetails;
      }));

      return enrichedData;
    },
    enabled: !!user,
  });
}

// Fetch a single assignment with details
export function usePracticeAssignment(id: string) {
  return useQuery({
    queryKey: ['practice-assignment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_assignments')
        .select(`
          *,
          subjects (id, name, code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PracticeAssignmentWithDetails;
    },
    enabled: !!id,
  });
}

// Fetch assignment with full question data for taking the practice
export function usePracticeAssignmentWithQuestions(id: string) {
  return useQuery({
    queryKey: ['practice-assignment-with-questions', id],
    queryFn: async () => {
      const { data: assignment, error } = await supabase
        .from('practice_assignments')
        .select(`
          *,
          subjects (id, name, code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch full question data
      const questionIds = (assignment.questions || []) as string[];
      
      if (questionIds.length === 0) {
        return {
          ...assignment,
          questionData: [],
        };
      }

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (questionsError) throw questionsError;

      // Sort questions in the same order as questionIds
      const orderedQuestions = questionIds
        .map(qId => questions?.find(q => q.id === qId))
        .filter(Boolean);

      return {
        ...assignment,
        questionData: orderedQuestions,
      };
    },
    enabled: !!id,
  });
}


// Fetch assigned students for an assignment
export function useAssignmentStudents(assignmentId: string) {
  return useQuery({
    queryKey: ['assignment-students', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_assignment_students')
        .select(`
          *,
          profiles:student_id (id, full_name, email)
        `)
        .eq('assignment_id', assignmentId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

// Fetch attempts for an assignment (admin view)
export function useAssignmentAttempts(assignmentId: string) {
  return useQuery({
    queryKey: ['assignment-attempts', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_assignment_attempts')
        .select(`
          *,
          profiles:student_id (id, full_name, email)
        `)
        .eq('assignment_id', assignmentId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

// Create a new practice assignment
export function useCreatePracticeAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      subject_id: string;
      questions: string[];
      duration?: number;
      show_answers_after_submit?: boolean;
      allow_multiple_attempts?: boolean;
      class_id?: string;
      assignment_scope?: 'class' | 'individual';
    }) => {
      const { data: result, error } = await supabase
        .from('practice_assignments')
        .insert({
          title: data.title,
          description: data.description || null,
          subject_id: data.subject_id,
          questions: data.questions,
          duration: data.duration || null,
          show_answers_after_submit: data.show_answers_after_submit ?? true,
          allow_multiple_attempts: data.allow_multiple_attempts ?? true,
          created_by: user?.id,
          class_id: data.class_id || null,
          assignment_scope: data.assignment_scope || 'individual',
        })
        .select()
        .single();

      if (error) throw error;

      // If assignment scope is 'class', auto-enroll all students from the class
      if (data.assignment_scope === 'class' && data.class_id && result) {
        const { data: classStudents } = await supabase
          .from('class_students')
          .select('student_id')
          .eq('class_id', data.class_id)
          .eq('status', 'active');

        if (classStudents && classStudents.length > 0) {
          const enrollments = classStudents.map(cs => ({
            assignment_id: result.id,
            student_id: cs.student_id,
          }));

          await supabase
            .from('practice_assignment_students')
            .insert(enrollments);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-assignments'] });
      toast.success('Đã tạo bài luyện tập');
    },
    onError: (error) => {
      toast.error('Không thể tạo bài luyện tập: ' + error.message);
    },
  });
}

// Update a practice assignment
export function useUpdatePracticeAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PracticeAssignment> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('practice_assignments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['practice-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['practice-assignment', variables.id] });
      toast.success('Đã cập nhật bài luyện tập');
    },
    onError: (error) => {
      toast.error('Không thể cập nhật: ' + error.message);
    },
  });
}

// Delete a practice assignment
export function useDeletePracticeAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('practice_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-assignments'] });
      toast.success('Đã xóa bài luyện tập');
    },
    onError: (error) => {
      toast.error('Không thể xóa: ' + error.message);
    },
  });
}

// Assign students to a practice assignment
export function useAssignStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, studentIds }: { assignmentId: string; studentIds: string[] }) => {
      // Remove existing assignments first to avoid conflicts
      await supabase
        .from('practice_assignment_students')
        .delete()
        .eq('assignment_id', assignmentId)
        .in('student_id', studentIds);

      // Insert new assignments
      const insertData = studentIds.map(studentId => ({
        assignment_id: assignmentId,
        student_id: studentId,
      }));

      const { data, error } = await supabase
        .from('practice_assignment_students')
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-students', variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['practice-assignments'] });
      toast.success('Đã giao bài cho học sinh');
    },
    onError: (error) => {
      toast.error('Không thể giao bài: ' + error.message);
    },
  });
}

// Remove student from assignment
export function useRemoveStudentFromAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, studentId }: { assignmentId: string; studentId: string }) => {
      const { error } = await supabase
        .from('practice_assignment_students')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-students', variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['practice-assignments'] });
    },
  });
}

// ========== STUDENT HOOKS ==========

// Fetch assigned practices for current student
export function useStudentAssignedPractices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-assigned-practices', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get assignments where student is assigned
      const { data: assignedData, error: assignedError } = await supabase
        .from('practice_assignment_students')
        .select(`
          id,
          assigned_at,
          practice_assignments (
            *,
            subjects (id, name, code)
          )
        `)
        .eq('student_id', user.id)
        .order('assigned_at', { ascending: false });

      if (assignedError) throw assignedError;

      // Get attempts for each assignment
      const result: AssignedPracticeForStudent[] = await Promise.all(
        (assignedData || []).map(async (item) => {
          const assignment = item.practice_assignments as unknown as PracticeAssignmentWithDetails;
          
          const { data: attempts } = await supabase
            .from('practice_assignment_attempts')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user.id)
            .order('attempt_number', { ascending: false });

          const typedAttempts = (attempts || []) as unknown as PracticeAssignmentAttempt[];
          const completedAttempts = typedAttempts.filter(a => a.completed_at);
          
          return {
            id: item.id,
            assignment,
            assigned_at: item.assigned_at,
            attempts: typedAttempts,
            best_percentage: completedAttempts.length > 0 
              ? Math.max(...completedAttempts.map(a => a.percentage))
              : null,
            last_attempt_at: completedAttempts[0]?.completed_at || null,
          };
        })
      );

      return result;
    },
    enabled: !!user,
  });
}

// Start a new attempt for an assignment
export function useStartAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get the latest attempt number
      const { data: existingAttempts } = await supabase
        .from('practice_assignment_attempts')
        .select('attempt_number')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const nextAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1;

      const { data, error } = await supabase
        .from('practice_assignment_attempts')
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          attempt_number: nextAttemptNumber,
          answers: {},
          question_results: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-assigned-practices'] });
    },
    onError: (error) => {
      toast.error('Không thể bắt đầu làm bài: ' + error.message);
    },
  });
}

// Submit attempt with results
export function useSubmitAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      answers,
      questionResults,
      timeSpentSeconds,
    }: {
      attemptId: string;
      answers: Record<string, any>;
      questionResults: QuestionResult[];
      timeSpentSeconds: number;
    }) => {
      const earnedPoints = questionResults.reduce((sum, r) => sum + r.points_earned, 0);
      const totalPoints = questionResults.reduce((sum, r) => sum + r.points_possible, 0);
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      // Calculate analysis
      const analysis = calculateAttemptAnalysis(questionResults, timeSpentSeconds);

      const { data, error } = await supabase
        .from('practice_assignment_attempts')
        .update({
          answers,
          question_results: JSON.parse(JSON.stringify(questionResults)) as Json,
          earned_points: earnedPoints,
          total_points: totalPoints,
          percentage,
          time_spent_seconds: timeSpentSeconds,
          completed_at: new Date().toISOString(),
          analysis: JSON.parse(JSON.stringify(analysis)) as Json,
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PracticeAssignmentAttempt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-assigned-practices'] });
      toast.success('Đã nộp bài thành công');
    },
    onError: (error) => {
      toast.error('Không thể nộp bài: ' + error.message);
    },
  });
}

// Get current in-progress attempt
export function useCurrentAttempt(assignmentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-attempt', assignmentId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('practice_assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        ...data,
        question_results: (data.question_results || []) as unknown as QuestionResult[],
        analysis: data.analysis as unknown as AttemptAnalysis | null,
      } as PracticeAssignmentAttempt;
    },
    enabled: !!user && !!assignmentId,
  });
}

// ========== UTILITY FUNCTIONS ==========

function calculateAttemptAnalysis(
  results: QuestionResult[],
  timeSpentSeconds: number
): AttemptAnalysis {
  // Group results by taxonomy node
  const taxonomyStats: Record<string, { correct: number; total: number; name: string }> = {};
  
  results.forEach(r => {
    const nodeId = r.taxonomy_node_id || 'unknown';
    if (!taxonomyStats[nodeId]) {
      taxonomyStats[nodeId] = { correct: 0, total: 0, name: '' };
    }
    taxonomyStats[nodeId].total++;
    if (r.is_correct) {
      taxonomyStats[nodeId].correct++;
    }
  });

  const skills: SkillAnalysis[] = Object.entries(taxonomyStats).map(([nodeId, stats]) => ({
    taxonomy_node_id: nodeId,
    taxonomy_name: stats.name || nodeId,
    correct_count: stats.correct,
    total_count: stats.total,
    percentage: (stats.correct / stats.total) * 100,
  }));

  const strengths = skills.filter(s => s.percentage >= 70).sort((a, b) => b.percentage - a.percentage);
  const weaknesses = skills.filter(s => s.percentage < 70).sort((a, b) => a.percentage - b.percentage);

  const overallPercentage = results.length > 0 
    ? (results.filter(r => r.is_correct).length / results.length) * 100
    : 0;

  let overall_performance: AttemptAnalysis['overall_performance'];
  if (overallPercentage >= 90) overall_performance = 'excellent';
  else if (overallPercentage >= 70) overall_performance = 'good';
  else if (overallPercentage >= 50) overall_performance = 'fair';
  else overall_performance = 'poor';

  const avgTimePerQuestion = results.length > 0 ? timeSpentSeconds / results.length : 0;
  let time_efficiency: AttemptAnalysis['time_efficiency'];
  if (avgTimePerQuestion <= 30) time_efficiency = 'fast';
  else if (avgTimePerQuestion <= 60) time_efficiency = 'normal';
  else time_efficiency = 'slow';

  return {
    strengths,
    weaknesses,
    suggested_next_topics: weaknesses.slice(0, 3).map(w => w.taxonomy_node_id),
    overall_performance,
    time_efficiency,
  };
}
