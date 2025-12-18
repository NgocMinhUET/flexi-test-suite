import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDailyChallenges, useUserDailyChallenges, useUpdateSkillProfile, useSkillProfile } from './usePractice';
import { DailyChallenge } from '@/types/practice';

interface SessionStats {
  questionsAnswered: number;
  correctAnswers: number;
  timeSpentMinutes: number;
  isPerfectSession: boolean;
}

export function useDailyChallengeProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenges } = useDailyChallenges();
  const { data: userChallenges } = useUserDailyChallenges();
  const { data: profile } = useSkillProfile();
  const updateProfile = useUpdateSkillProfile();

  const updateChallengeProgress = useCallback(async (
    challengeId: string, 
    progress: number, 
    targetValue: number
  ) => {
    if (!user?.id) return;

    const isCompleted = progress >= targetValue;

    try {
      const { error } = await supabase
        .from('user_daily_challenges')
        .upsert({
          user_id: user.id,
          challenge_id: challengeId,
          current_progress: Math.min(progress, targetValue),
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        }, {
          onConflict: 'user_id,challenge_id'
        });

      if (error) throw error;

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['user-daily-challenges'] });

      return isCompleted;
    } catch (err) {
      console.error('Failed to update challenge progress:', err);
      return false;
    }
  }, [user?.id, queryClient]);

  const processSessionForChallenges = useCallback(async (stats: SessionStats) => {
    if (!user?.id || !challenges) return { completedChallenges: [], bonusXP: 0 };

    const completedChallenges: DailyChallenge[] = [];
    let bonusXP = 0;

    for (const challenge of challenges) {
      const userProgress = userChallenges?.find(uc => uc.challenge_id === challenge.id);
      
      // Skip already completed challenges
      if (userProgress?.is_completed) continue;

      let currentProgress = userProgress?.current_progress || 0;
      let newProgress = currentProgress;

      switch (challenge.challenge_type) {
        case 'questions_count':
          newProgress = currentProgress + stats.questionsAnswered;
          break;

        case 'accuracy':
          // Only update if session had enough questions and met accuracy threshold
          if (stats.questionsAnswered >= 10) {
            const accuracy = (stats.correctAnswers / stats.questionsAnswered) * 100;
            if (accuracy >= challenge.target_value) {
              newProgress = challenge.target_value; // Mark as complete
            }
          }
          break;

        case 'streak_keep':
          // Will be handled separately when streak is updated
          if (profile?.current_streak && profile.current_streak >= 1) {
            newProgress = 1;
          }
          break;

        case 'time_spent':
          newProgress = currentProgress + stats.timeSpentMinutes;
          break;

        case 'perfect_session':
          if (stats.isPerfectSession && stats.questionsAnswered >= 5) {
            newProgress = currentProgress + 1;
          }
          break;
      }

      if (newProgress > currentProgress) {
        const justCompleted = await updateChallengeProgress(
          challenge.id,
          newProgress,
          challenge.target_value
        );

        if (justCompleted) {
          completedChallenges.push(challenge);
          bonusXP += challenge.xp_reward;
        }
      }
    }

    // Check if all challenges completed for bonus
    const totalCompleted = (userChallenges?.filter(uc => uc.is_completed).length || 0) + completedChallenges.length;
    if (totalCompleted === challenges.length && challenges.length > 0) {
      // All completed bonus - 20% of total XP
      const totalXP = challenges.reduce((sum, c) => sum + c.xp_reward, 0);
      bonusXP += Math.round(totalXP * 0.2);
    }

    // Award XP if any bonus earned
    if (bonusXP > 0 && profile) {
      await updateProfile.mutateAsync({
        total_xp: (profile.total_xp || 0) + bonusXP
      });
    }

    return { completedChallenges, bonusXP };
  }, [user?.id, challenges, userChallenges, profile, updateChallengeProgress, updateProfile]);

  const updateStreakChallenge = useCallback(async () => {
    if (!user?.id || !challenges) return;

    const streakChallenge = challenges.find(c => c.challenge_type === 'streak_keep');
    if (!streakChallenge) return;

    const userProgress = userChallenges?.find(uc => uc.challenge_id === streakChallenge.id);
    if (userProgress?.is_completed) return;

    await updateChallengeProgress(streakChallenge.id, 1, streakChallenge.target_value);
  }, [user?.id, challenges, userChallenges, updateChallengeProgress]);

  return {
    processSessionForChallenges,
    updateStreakChallenge,
    updateChallengeProgress
  };
}
