import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { 
  useAchievements, 
  useUserAchievements, 
  useSkillProfile,
  useSkillMasteries,
  useUpdateSkillProfile
} from './usePractice';
import { Achievement } from '@/types/practice';

interface AchievementCheckResult {
  newAchievements: Achievement[];
  totalXPEarned: number;
}

interface SessionStats {
  questionsAnswered: number;
  correctAnswers: number;
  isPerfectSession: boolean;
  timeOfDay: Date;
}

export function useAchievementChecker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: achievements } = useAchievements();
  const { data: userAchievements } = useUserAchievements();
  const { data: profile } = useSkillProfile();
  const { data: masteries } = useSkillMasteries();
  const updateProfile = useUpdateSkillProfile();

  // Get achievements user hasn't earned yet
  const getUnearned = useCallback(() => {
    if (!achievements || !userAchievements) return [];
    const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));
    return achievements.filter(a => !earnedIds.has(a.id));
  }, [achievements, userAchievements]);

  // Award an achievement
  const awardAchievement = useCallback(async (achievementId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId
        });

      if (error) {
        // Already exists - not an error
        if (error.code === '23505') return false;
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
      return true;
    } catch (err) {
      console.error('Failed to award achievement:', err);
      return false;
    }
  }, [user?.id, queryClient]);

  // Count perfect sessions from practice_sessions
  const countPerfectSessions = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    const { data, error } = await supabase
      .from('practice_sessions')
      .select('id, questions_count, correct_count')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null);

    if (error) {
      console.error('Error counting perfect sessions:', error);
      return 0;
    }

    return data?.filter(s => 
      s.questions_count >= 5 && s.correct_count === s.questions_count
    ).length || 0;
  }, [user?.id]);

  // Count topics with 80%+ mastery
  const countMasteredTopics = useCallback((): number => {
    if (!masteries) return 0;
    return masteries.filter(m => m.mastery_level >= 80).length;
  }, [masteries]);

  // Check special time-based achievements
  const checkTimeAchievements = useCallback((timeOfDay: Date): string[] => {
    const hour = timeOfDay.getHours();
    const codes: string[] = [];
    
    if (hour < 6) {
      codes.push('early_bird');
    }
    if (hour >= 23) {
      codes.push('night_owl');
    }
    
    return codes;
  }, []);

  // Main check function - call after session completes
  const checkAchievements = useCallback(async (
    sessionStats?: SessionStats
  ): Promise<AchievementCheckResult> => {
    if (!user?.id || !profile || !achievements) {
      return { newAchievements: [], totalXPEarned: 0 };
    }

    const unearned = getUnearned();
    const newAchievements: Achievement[] = [];
    let totalXPEarned = 0;

    // Get current stats
    const totalQuestions = profile.total_questions_attempted + (sessionStats?.questionsAnswered || 0);
    const currentStreak = profile.current_streak;
    const perfectSessions = await countPerfectSessions();
    const masteredCount = countMasteredTopics();

    for (const achievement of unearned) {
      let shouldAward = false;

      switch (achievement.condition_type) {
        case 'streak_days':
          shouldAward = currentStreak >= achievement.condition_value;
          break;

        case 'total_questions':
          shouldAward = totalQuestions >= achievement.condition_value;
          break;

        case 'perfect_sessions':
          shouldAward = perfectSessions >= achievement.condition_value;
          break;

        case 'mastery_count':
          shouldAward = masteredCount >= achievement.condition_value;
          break;

        case 'special':
          if (sessionStats?.timeOfDay) {
            const timeCodes = checkTimeAchievements(sessionStats.timeOfDay);
            shouldAward = timeCodes.includes(achievement.code);
          }
          
          // Check comeback achievement
          if (achievement.code === 'comeback_king' && profile.last_practice_date) {
            const lastPractice = new Date(profile.last_practice_date);
            const daysSince = Math.floor(
              (Date.now() - lastPractice.getTime()) / (1000 * 60 * 60 * 24)
            );
            shouldAward = daysSince >= 30;
          }
          break;
      }

      if (shouldAward) {
        const awarded = await awardAchievement(achievement.id);
        if (awarded) {
          newAchievements.push(achievement);
          totalXPEarned += achievement.xp_reward;
        }
      }
    }

    // Update profile with bonus XP if any achievements earned
    if (totalXPEarned > 0) {
      await updateProfile.mutateAsync({
        total_xp: profile.total_xp + totalXPEarned
      });
    }

    return { newAchievements, totalXPEarned };
  }, [
    user?.id, 
    profile, 
    achievements, 
    getUnearned, 
    countPerfectSessions, 
    countMasteredTopics,
    checkTimeAchievements,
    awardAchievement,
    updateProfile
  ]);

  return {
    checkAchievements,
    getUnearned
  };
}
