import { supabase } from '@/integrations/supabase/client';
import { QuestionResult } from '@/types/practiceAssignment';
import { calculateSM2Update, calculateQuality } from './useAdaptiveQuestionSelection';
import { XP_CONFIG } from '@/types/practice';

interface QuestionData {
  id: string;
  taxonomy_node_id: string | null;
  difficulty: number | null;
  estimated_time: number | null;
}

/**
 * Calculate XP earned from practice results
 */
export function calculatePracticeXP(
  results: QuestionResult[],
  questions: QuestionData[],
  timeSpentSeconds: number
): number {
  let totalXP = 0;
  const avgTimePerQuestion = timeSpentSeconds / Math.max(results.length, 1);
  
  results.forEach(result => {
    const question = questions.find(q => q.id === result.question_id);
    const difficulty = question?.difficulty || 0.5;
    const difficultyLevel = Math.ceil(difficulty * 5);
    const multiplier = XP_CONFIG.difficultyMultiplier[difficultyLevel as keyof typeof XP_CONFIG.difficultyMultiplier] || 1;
    
    if (result.is_correct) {
      totalXP += XP_CONFIG.questionBase.correct * multiplier;
      
      // Speed bonus for quick correct answers
      const expectedTime = question?.estimated_time || 60;
      if (avgTimePerQuestion < expectedTime * 0.5) {
        totalXP += XP_CONFIG.bonuses.speedBonus;
      }
    } else {
      totalXP += XP_CONFIG.questionBase.incorrect;
    }
  });
  
  // Perfect session bonus
  if (results.length > 0 && results.every(r => r.is_correct)) {
    totalXP += XP_CONFIG.bonuses.perfectSession;
  }
  
  return Math.round(Math.min(totalXP, XP_CONFIG.dailyXPCap));
}

/**
 * Update question history for spaced repetition
 */
async function updateQuestionHistories(
  userId: string,
  results: QuestionResult[],
  questions: QuestionData[],
  avgTimePerQuestion: number
): Promise<void> {
  for (const result of results) {
    const question = questions.find(q => q.id === result.question_id);
    const expectedTime = question?.estimated_time || 60;
    
    // Fetch existing history
    const { data: existing } = await supabase
      .from('question_history')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', result.question_id)
      .maybeSingle();
    
    const quality = calculateQuality(result.is_correct, avgTimePerQuestion, expectedTime);
    const currentEaseFactor = existing?.ease_factor || 2.5;
    
    // Calculate current interval
    let currentInterval = 1;
    if (existing?.last_seen_at && existing?.next_review_date) {
      const lastSeen = new Date(existing.last_seen_at);
      const nextReview = new Date(existing.next_review_date);
      currentInterval = Math.max(1, Math.round((nextReview.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    const { newEaseFactor, nextReviewDate } = calculateSM2Update(
      currentEaseFactor,
      currentInterval,
      quality
    );
    
    await supabase
      .from('question_history')
      .upsert({
        user_id: userId,
        question_id: result.question_id,
        times_seen: (existing?.times_seen || 0) + 1,
        times_correct: (existing?.times_correct || 0) + (result.is_correct ? 1 : 0),
        last_seen_at: new Date().toISOString(),
        last_result: result.is_correct,
        next_review_date: nextReviewDate.toISOString(),
        ease_factor: newEaseFactor
      }, {
        onConflict: 'user_id,question_id'
      });
  }
}

/**
 * Update skill masteries based on results
 */
async function updateSkillMasteries(
  userId: string,
  results: QuestionResult[],
  questions: QuestionData[]
): Promise<void> {
  // Group results by taxonomy_node_id
  const taxonomyResults: Map<string, { correct: number; total: number; diffLevel: number }> = new Map();
  
  results.forEach(result => {
    const question = questions.find(q => q.id === result.question_id);
    const taxonomyNodeId = question?.taxonomy_node_id;
    
    if (taxonomyNodeId) {
      const existing = taxonomyResults.get(taxonomyNodeId) || { correct: 0, total: 0, diffLevel: 3 };
      existing.total++;
      if (result.is_correct) existing.correct++;
      existing.diffLevel = Math.ceil((question?.difficulty || 0.5) * 5);
      taxonomyResults.set(taxonomyNodeId, existing);
    }
  });
  
  // Update each taxonomy node's mastery
  for (const [taxonomyNodeId, stats] of taxonomyResults) {
    // Fetch existing mastery
    const { data: existing } = await supabase
      .from('skill_masteries')
      .select('*')
      .eq('user_id', userId)
      .eq('taxonomy_node_id', taxonomyNodeId)
      .maybeSingle();
    
    const newQuestionsAttempted = (existing?.questions_attempted || 0) + stats.total;
    const newQuestionsCorrect = (existing?.questions_correct || 0) + stats.correct;
    
    // Update difficulty stats
    const difficultyStats: Record<string, { attempted: number; correct: number }> = existing?.difficulty_stats as Record<string, { attempted: number; correct: number }> || {
      '1': { attempted: 0, correct: 0 },
      '2': { attempted: 0, correct: 0 },
      '3': { attempted: 0, correct: 0 },
      '4': { attempted: 0, correct: 0 },
      '5': { attempted: 0, correct: 0 }
    };
    
    const diffKey = String(stats.diffLevel);
    if (difficultyStats[diffKey]) {
      difficultyStats[diffKey].attempted += stats.total;
      difficultyStats[diffKey].correct += stats.correct;
    }
    
    // Calculate new mastery level
    let masteryLevel = 0;
    if (newQuestionsAttempted >= 3) {
      // Base accuracy (50% weight)
      const baseAccuracy = newQuestionsCorrect / newQuestionsAttempted;
      
      // Recent accuracy - this session (30% weight)
      const recentAccuracy = stats.correct / stats.total;
      
      // Difficulty-weighted performance (20% weight)
      let difficultyWeighted = 0;
      let totalWeight = 0;
      Object.entries(difficultyStats).forEach(([diff, dStats]) => {
        const weight = parseInt(diff) * 0.5;
        if (dStats.attempted > 0) {
          difficultyWeighted += (dStats.correct / dStats.attempted) * weight;
          totalWeight += weight;
        }
      });
      difficultyWeighted = totalWeight > 0 ? difficultyWeighted / totalWeight : 0;
      
      masteryLevel = (baseAccuracy * 0.5 + recentAccuracy * 0.3 + difficultyWeighted * 0.2) * 100;
      masteryLevel = Math.min(100, Math.max(0, masteryLevel));
    }
    
    // Update streak
    const allCorrectInTopic = stats.correct === stats.total;
    const newStreak = allCorrectInTopic 
      ? (existing?.last_correct_streak || 0) + stats.correct 
      : 0;
    
    await supabase
      .from('skill_masteries')
      .upsert({
        user_id: userId,
        taxonomy_node_id: taxonomyNodeId,
        mastery_level: masteryLevel,
        questions_attempted: newQuestionsAttempted,
        questions_correct: newQuestionsCorrect,
        last_correct_streak: newStreak,
        difficulty_stats: difficultyStats,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,taxonomy_node_id'
      });
  }
}

/**
 * Update student skill profile with XP, stats, and streak
 */
async function updateStudentSkillProfile(
  userId: string,
  results: QuestionResult[],
  xpEarned: number,
  timeSpentSeconds: number
): Promise<void> {
  // Fetch existing profile
  const { data: existing } = await supabase
    .from('student_skill_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  const correctCount = results.filter(r => r.is_correct).length;
  const today = new Date().toISOString().split('T')[0];
  const lastPracticeDate = existing?.last_practice_date;
  
  // Calculate streak
  let newStreak = existing?.current_streak || 0;
  if (lastPracticeDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastPracticeDate === yesterdayStr) {
      newStreak++;
    } else if (lastPracticeDate !== today) {
      newStreak = 1; // Reset streak
    }
  }
  
  const longestStreak = Math.max(existing?.longest_streak || 0, newStreak);
  
  await supabase
    .from('student_skill_profiles')
    .upsert({
      user_id: userId,
      total_xp: (existing?.total_xp || 0) + xpEarned,
      total_questions_attempted: (existing?.total_questions_attempted || 0) + results.length,
      total_correct_answers: (existing?.total_correct_answers || 0) + correctCount,
      total_practice_time_minutes: (existing?.total_practice_time_minutes || 0) + Math.ceil(timeSpentSeconds / 60),
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_practice_date: today,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}

/**
 * Main function to update all adaptive learning data after practice assignment submission
 */
export async function updateAdaptiveLearningData(
  userId: string,
  results: QuestionResult[],
  questions: QuestionData[],
  timeSpentSeconds: number
): Promise<{ xpEarned: number; newMasteries: Map<string, number> }> {
  try {
    const avgTimePerQuestion = timeSpentSeconds / Math.max(results.length, 1);
    
    // Calculate XP
    const xpEarned = calculatePracticeXP(results, questions, timeSpentSeconds);
    
    // Update all adaptive learning tables in parallel where possible
    await Promise.all([
      updateQuestionHistories(userId, results, questions, avgTimePerQuestion),
      updateSkillMasteries(userId, results, questions),
      updateStudentSkillProfile(userId, results, xpEarned, timeSpentSeconds)
    ]);
    
    // Collect updated masteries
    const newMasteries = new Map<string, number>();
    const taxonomyNodeIds = [...new Set(
      results
        .map(r => questions.find(q => q.id === r.question_id)?.taxonomy_node_id)
        .filter(Boolean)
    )] as string[];
    
    if (taxonomyNodeIds.length > 0) {
      const { data: masteries } = await supabase
        .from('skill_masteries')
        .select('taxonomy_node_id, mastery_level')
        .eq('user_id', userId)
        .in('taxonomy_node_id', taxonomyNodeIds);
      
      masteries?.forEach(m => {
        if (m.taxonomy_node_id) {
          newMasteries.set(m.taxonomy_node_id, m.mastery_level || 0);
        }
      });
    }
    
    return { xpEarned, newMasteries };
  } catch (error) {
    console.error('Error updating adaptive learning data:', error);
    throw error;
  }
}
