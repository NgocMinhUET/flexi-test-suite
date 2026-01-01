import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentProgress {
  student_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  // Skill profile data
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  total_questions_attempted: number;
  total_correct_answers: number;
  total_practice_time_minutes: number;
  last_practice_date: string | null;
  // Calculated metrics
  accuracy: number;
  sessions_count: number;
  recent_sessions: RecentSession[];
}

export interface RecentSession {
  id: string;
  session_type: string;
  questions_count: number;
  correct_count: number;
  xp_earned: number;
  completed_at: string | null;
}

export interface ClassProgressSummary {
  total_students: number;
  active_students: number; // practiced in last 7 days
  total_xp: number;
  average_accuracy: number;
  average_level: number;
  total_questions_answered: number;
  total_practice_time_hours: number;
}

// Fetch progress for all students in a class
export function useClassProgress(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-progress', classId],
    queryFn: async (): Promise<StudentProgress[]> => {
      if (!classId) return [];

      // Get all active students in the class
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'active');

      if (enrollmentError) throw enrollmentError;
      if (!enrollments || enrollments.length === 0) return [];

      const studentIds = enrollments.map(e => e.student_id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds);

      // Fetch skill profiles
      const { data: skillProfiles } = await supabase
        .from('student_skill_profiles')
        .select('*')
        .in('user_id', studentIds);

      // Fetch recent practice sessions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions } = await supabase
        .from('practice_sessions')
        .select('*')
        .in('user_id', studentIds)
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('started_at', { ascending: false });

      // Build maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const skillProfileMap = new Map(skillProfiles?.map(sp => [sp.user_id, sp]) || []);

      // Group sessions by user
      const sessionsByUser = new Map<string, RecentSession[]>();
      sessions?.forEach(s => {
        if (!s.user_id) return;
        if (!sessionsByUser.has(s.user_id)) {
          sessionsByUser.set(s.user_id, []);
        }
        sessionsByUser.get(s.user_id)!.push({
          id: s.id,
          session_type: s.session_type,
          questions_count: s.questions_count || 0,
          correct_count: s.correct_count || 0,
          xp_earned: s.xp_earned || 0,
          completed_at: s.completed_at,
        });
      });

      // Combine data
      return studentIds.map(studentId => {
        const profile = profileMap.get(studentId);
        const skillProfile = skillProfileMap.get(studentId);
        const recentSessions = sessionsByUser.get(studentId) || [];

        const totalAttempted = skillProfile?.total_questions_attempted || 0;
        const totalCorrect = skillProfile?.total_correct_answers || 0;
        const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

        return {
          student_id: studentId,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          total_xp: skillProfile?.total_xp || 0,
          current_level: skillProfile?.current_level || 1,
          current_streak: skillProfile?.current_streak || 0,
          longest_streak: skillProfile?.longest_streak || 0,
          total_questions_attempted: totalAttempted,
          total_correct_answers: totalCorrect,
          total_practice_time_minutes: skillProfile?.total_practice_time_minutes || 0,
          last_practice_date: skillProfile?.last_practice_date || null,
          accuracy,
          sessions_count: recentSessions.length,
          recent_sessions: recentSessions.slice(0, 5), // Last 5 sessions
        };
      });
    },
    enabled: !!classId,
  });
}

// Calculate summary from progress data
export function calculateClassSummary(progress: StudentProgress[]): ClassProgressSummary {
  if (progress.length === 0) {
    return {
      total_students: 0,
      active_students: 0,
      total_xp: 0,
      average_accuracy: 0,
      average_level: 0,
      total_questions_answered: 0,
      total_practice_time_hours: 0,
    };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const activeStudents = progress.filter(p => 
    p.last_practice_date && p.last_practice_date >= sevenDaysAgoStr
  ).length;

  const totalXp = progress.reduce((sum, p) => sum + p.total_xp, 0);
  const totalQuestions = progress.reduce((sum, p) => sum + p.total_questions_attempted, 0);
  const totalCorrect = progress.reduce((sum, p) => sum + p.total_correct_answers, 0);
  const totalPracticeMinutes = progress.reduce((sum, p) => sum + p.total_practice_time_minutes, 0);
  const avgLevel = progress.reduce((sum, p) => sum + p.current_level, 0) / progress.length;

  return {
    total_students: progress.length,
    active_students: activeStudents,
    total_xp: totalXp,
    average_accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
    average_level: avgLevel,
    total_questions_answered: totalQuestions,
    total_practice_time_hours: Math.round(totalPracticeMinutes / 60),
  };
}
