import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { 
  PracticeConfig, 
  PracticeAttempt, 
  StudentSkillProfile,
  SkillMastery,
  Achievement,
  UserAchievement,
  DailyChallenge,
  UserDailyChallenge,
  Leaderboard,
  PracticeSession,
  LevelConfig,
  XP_CONFIG
} from '@/types/practice';

// ==================== PRACTICE MODE HOOKS ====================

export function usePracticeConfigs() {
  return useQuery({
    queryKey: ['practice-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_configs')
        .select(`
          *,
          exams (
            id,
            title,
            subject,
            total_questions,
            duration
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function usePracticeConfig(examId: string | undefined) {
  return useQuery({
    queryKey: ['practice-config', examId],
    queryFn: async () => {
      if (!examId) return null;
      const { data, error } = await supabase
        .from('practice_configs')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PracticeConfig | null;
    },
    enabled: !!examId
  });
}

export function useCreatePracticeConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Partial<PracticeConfig>) => {
      const { data, error } = await supabase
        .from('practice_configs')
        .insert(config)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-configs'] });
    }
  });
}

export function usePracticeAttempts(examId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['practice-attempts', examId, user?.id],
    queryFn: async () => {
      if (!examId || !user?.id) return [];
      const { data, error } = await supabase
        .from('practice_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as PracticeAttempt[];
    },
    enabled: !!examId && !!user?.id
  });
}

export function useSubmitPracticeAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (attempt: Omit<PracticeAttempt, 'id' | 'completed_at'>) => {
      const { data, error } = await supabase
        .from('practice_attempts')
        .insert({
          exam_id: attempt.exam_id,
          user_id: user?.id,
          attempt_number: attempt.attempt_number,
          score: attempt.score,
          total_points: attempt.total_points,
          earned_points: attempt.earned_points,
          time_spent_seconds: attempt.time_spent_seconds,
          question_results: attempt.question_results as unknown as any
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['practice-attempts', variables.exam_id] });
    }
  });
}

// ==================== ADAPTIVE PRACTICE HOOKS ====================

export function useSkillProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['skill-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get existing profile
      let { data, error } = await supabase
        .from('student_skill_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Create profile if not exists
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('student_skill_profiles')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (createError) throw createError;
        data = newProfile;
      }
      
      return data as StudentSkillProfile;
    },
    enabled: !!user?.id
  });
}

export function useUpdateSkillProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<StudentSkillProfile>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('student_skill_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-profile'] });
    }
  });
}

export function useSkillMasteries(subjectId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['skill-masteries', user?.id, subjectId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('skill_masteries')
        .select(`
          *,
          taxonomy_node:taxonomy_nodes (
            id,
            name,
            code,
            level,
            parent_id,
            subject_id
          )
        `)
        .eq('user_id', user.id);
      
      if (subjectId) {
        query = query.eq('taxonomy_node.subject_id', subjectId);
      }
      
      const { data, error } = await query.order('mastery_level', { ascending: false });
      
      if (error) throw error;
      return data as SkillMastery[];
    },
    enabled: !!user?.id
  });
}

export function useUpsertSkillMastery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (mastery: Partial<SkillMastery> & { taxonomy_node_id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('skill_masteries')
        .upsert({
          ...mastery,
          user_id: user.id
        }, {
          onConflict: 'user_id,taxonomy_node_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-masteries'] });
    }
  });
}

// ==================== GAMIFICATION HOOKS ====================

export function useLevelConfigs() {
  return useQuery({
    queryKey: ['level-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_configs')
        .select('*')
        .order('level', { ascending: true });
      
      if (error) throw error;
      return data as LevelConfig[];
    }
  });
}

export function useCurrentLevelConfig(level: number) {
  const { data: levelConfigs } = useLevelConfigs();
  return levelConfigs?.find(l => l.level === level);
}

export function useNextLevelConfig(currentXp: number) {
  const { data: levelConfigs } = useLevelConfigs();
  if (!levelConfigs) return null;
  
  return levelConfigs.find(l => l.xp_required > currentXp);
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: true });
      
      if (error) throw error;
      return data as Achievement[];
    }
  });
}

export function useUserAchievements() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements (*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      
      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!user?.id
  });
}

export function useAwardAchievement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (achievementId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId
        })
        .select(`
          *,
          achievement:achievements (*)
        `)
        .single();
      
      if (error) throw error;
      return data as UserAchievement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['skill-profile'] });
    }
  });
}

export function useDailyChallenges() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['daily-challenges', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', today);
      
      if (error) throw error;
      return data as DailyChallenge[];
    }
  });
}

export function useUserDailyChallenges() {
  const { user } = useAuth();
  const { data: challenges } = useDailyChallenges();
  
  return useQuery({
    queryKey: ['user-daily-challenges', user?.id, challenges?.map(c => c.id)],
    queryFn: async () => {
      if (!user?.id || !challenges?.length) return [];
      
      const challengeIds = challenges.map(c => c.id);
      
      const { data, error } = await supabase
        .from('user_daily_challenges')
        .select(`
          *,
          challenge:daily_challenges (*)
        `)
        .eq('user_id', user.id)
        .in('challenge_id', challengeIds);
      
      if (error) throw error;
      return data as UserDailyChallenge[];
    },
    enabled: !!user?.id && !!challenges?.length
  });
}

export function useUpdateDailyChallengeProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ challengeId, progress }: { challengeId: string; progress: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get challenge to check completion
      const { data: challenge } = await supabase
        .from('daily_challenges')
        .select('target_value')
        .eq('id', challengeId)
        .single();
      
      const isCompleted = progress >= (challenge?.target_value || 0);
      
      const { data, error } = await supabase
        .from('user_daily_challenges')
        .upsert({
          user_id: user.id,
          challenge_id: challengeId,
          current_progress: progress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        }, {
          onConflict: 'user_id,challenge_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-daily-challenges'] });
    }
  });
}

export function useLeaderboard(type: string = 'weekly_xp') {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return useQuery({
    queryKey: ['leaderboard', type, startOfWeek.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('leaderboard_type', type)
        .gte('period_start', startOfWeek.toISOString().split('T')[0])
        .lte('period_end', endOfWeek.toISOString().split('T')[0])
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as Leaderboard | null;
    }
  });
}

// ==================== PRACTICE SESSION HOOKS ====================

export function usePracticeSessions(limit: number = 10) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['practice-sessions', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as unknown as PracticeSession[];
    },
    enabled: !!user?.id
  });
}

export function useCreatePracticeSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (session: Partial<PracticeSession>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          session_type: session.session_type || 'daily_practice',
          subject_id: session.subject_id || null,
          user_id: user.id,
          questions_count: session.questions_count || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as PracticeSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-sessions'] });
    }
  });
}

export function useCompletePracticeSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      results 
    }: { 
      sessionId: string; 
      results: Partial<PracticeSession> 
    }) => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .update({
          correct_count: results.correct_count,
          xp_earned: results.xp_earned,
          time_spent_seconds: results.time_spent_seconds,
          question_results: results.question_results as unknown as any,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as PracticeSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['skill-profile'] });
      queryClient.invalidateQueries({ queryKey: ['skill-masteries'] });
    }
  });
}

// ==================== UTILITY FUNCTIONS ====================

export function calculateXP(
  isCorrect: boolean,
  difficulty: number = 3,
  isFirstTime: boolean = false,
  timeSpentSeconds: number = 0,
  expectedTimeSeconds: number = 60
): number {
  let xp = isCorrect ? XP_CONFIG.questionBase.correct : XP_CONFIG.questionBase.incorrect;
  
  // Apply difficulty multiplier
  const multiplier = XP_CONFIG.difficultyMultiplier[difficulty as keyof typeof XP_CONFIG.difficultyMultiplier] || 1;
  xp *= multiplier;
  
  // First time correct bonus
  if (isCorrect && isFirstTime) {
    xp += XP_CONFIG.bonuses.firstTimeCorrect;
  }
  
  // Speed bonus
  if (isCorrect && timeSpentSeconds < expectedTimeSeconds * 0.5) {
    xp += XP_CONFIG.bonuses.speedBonus;
  }
  
  return Math.round(xp);
}

export function calculateMastery(stats: {
  questionsAttempted: number;
  questionsCorrect: number;
  recentAccuracy: number;
  difficultyWeighted: number;
  consistencyScore: number;
}): number {
  const { questionsAttempted, questionsCorrect, recentAccuracy, difficultyWeighted, consistencyScore } = stats;
  
  if (questionsAttempted < 5) return 0;
  
  const baseAccuracy = questionsCorrect / questionsAttempted;
  
  const mastery = (
    baseAccuracy * 0.3 +
    recentAccuracy * 0.35 +
    difficultyWeighted * 0.25 +
    consistencyScore * 0.1
  ) * 100;
  
  return Math.min(100, Math.max(0, mastery));
}
