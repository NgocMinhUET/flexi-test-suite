import { supabase } from '@/integrations/supabase/client';
import { SkillMastery, SESSION_TYPES, SessionType } from '@/types/practice';

interface QuestionCandidate {
  id: string;
  content: string;
  question_type: string;
  answer_data: any;
  difficulty: number;
  taxonomy_node_id: string;
  explanation?: string;
  hints?: string[];
  estimated_time?: number;
}

// Selection reason types for explainability
export type SelectionReasonType = 
  | 'weak_point'           // Điểm yếu cần cải thiện
  | 'spaced_repetition'    // Đến lúc ôn tập theo SM-2
  | 'difficulty_match'     // Phù hợp với trình độ
  | 'retry_failed'         // Ôn lại câu đã sai
  | 'struggling_topic'     // Chủ đề đang gặp khó khăn
  | 'challenge'            // Thử thách nâng cao
  | 'new_topic'            // Khám phá chủ đề mới
  | 'reinforce';           // Củng cố kiến thức

export interface SelectionReason {
  type: SelectionReasonType;
  label: string;
  description: string;
  priority: number;
}

export interface SelectedQuestion extends QuestionCandidate {
  selectionReasons: SelectionReason[];
  primaryReason: SelectionReason;
}

interface QuestionHistoryRecord {
  question_id: string;
  times_seen: number;
  times_correct: number;
  last_result: boolean | null;
  next_review_date: string | null;
  ease_factor: number;
}

interface SelectionContext {
  userId: string;
  sessionType: SessionType;
  subjectId?: string;
  masteries: SkillMastery[];
  targetDifficulty: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
}

// SM-2 Algorithm constants
const SM2_CONFIG = {
  MIN_EASE_FACTOR: 1.3,
  MAX_EASE_FACTOR: 3.0,
  DEFAULT_EASE_FACTOR: 2.5,
  INITIAL_INTERVAL: 1,
  QUALITY_THRESHOLDS: {
    PERFECT: 5,    // Instant, correct
    GOOD: 4,       // Correct with hesitation
    PASS: 3,       // Correct with difficulty
    FAIL: 2,       // Incorrect, remembered after seeing
    BLACKOUT: 0    // Complete failure
  }
};

// Difficulty adjustment thresholds
const DIFFICULTY_CONFIG = {
  CONSECUTIVE_TO_ADJUST: 3,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 5,
  LEVEL_TO_BASE_DIFFICULTY: {
    // Student level ranges to base difficulty
    '1-5': 1,
    '6-15': 2,
    '16-30': 3,
    '31+': 4
  }
};

/**
 * Get base difficulty target based on student level
 */
export function getBaseDifficulty(studentLevel: number): number {
  if (studentLevel <= 5) return 1;
  if (studentLevel <= 15) return 2;
  if (studentLevel <= 30) return 3;
  return 4;
}

/**
 * Adjust target difficulty based on consecutive performance
 */
export function adjustDifficulty(
  baseDifficulty: number,
  consecutiveCorrect: number,
  consecutiveIncorrect: number
): number {
  let adjustment = 0;
  
  if (consecutiveCorrect >= DIFFICULTY_CONFIG.CONSECUTIVE_TO_ADJUST) {
    adjustment = Math.floor(consecutiveCorrect / DIFFICULTY_CONFIG.CONSECUTIVE_TO_ADJUST);
  } else if (consecutiveIncorrect >= DIFFICULTY_CONFIG.CONSECUTIVE_TO_ADJUST) {
    adjustment = -Math.floor(consecutiveIncorrect / DIFFICULTY_CONFIG.CONSECUTIVE_TO_ADJUST);
  }
  
  return Math.max(
    DIFFICULTY_CONFIG.MIN_DIFFICULTY,
    Math.min(DIFFICULTY_CONFIG.MAX_DIFFICULTY, baseDifficulty + adjustment)
  );
}

/**
 * Calculate SM-2 quality rating based on answer result
 */
export function calculateQuality(
  isCorrect: boolean,
  timeSpentSeconds: number,
  expectedTimeSeconds: number
): number {
  if (!isCorrect) return SM2_CONFIG.QUALITY_THRESHOLDS.FAIL;
  
  const timeRatio = timeSpentSeconds / expectedTimeSeconds;
  
  if (timeRatio < 0.5) return SM2_CONFIG.QUALITY_THRESHOLDS.PERFECT;
  if (timeRatio < 1.0) return SM2_CONFIG.QUALITY_THRESHOLDS.GOOD;
  return SM2_CONFIG.QUALITY_THRESHOLDS.PASS;
}

/**
 * Calculate new SM-2 parameters after answering
 */
export function calculateSM2Update(
  currentEaseFactor: number,
  currentInterval: number,
  quality: number
): { newEaseFactor: number; newInterval: number; nextReviewDate: Date } {
  // Calculate new ease factor
  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(SM2_CONFIG.MIN_EASE_FACTOR, Math.min(SM2_CONFIG.MAX_EASE_FACTOR, newEaseFactor));
  
  // Calculate new interval
  let newInterval: number;
  if (quality < 3) {
    // Reset on failure
    newInterval = SM2_CONFIG.INITIAL_INTERVAL;
  } else if (currentInterval === 0 || currentInterval === 1) {
    newInterval = 1;
  } else if (currentInterval === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(currentInterval * newEaseFactor);
  }
  
  // Cap interval at 180 days
  newInterval = Math.min(180, newInterval);
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  
  return { newEaseFactor, newInterval, nextReviewDate };
}

/**
 * Calculate mastery using weighted formula
 */
export function calculateWeightedMastery(
  questionsAttempted: number,
  questionsCorrect: number,
  recentResults: boolean[], // Last 10 results
  difficultyStats: Record<string, { attempted: number; correct: number }>
): number {
  if (questionsAttempted < 5) return 0;
  
  // Base accuracy (30%)
  const baseAccuracy = questionsCorrect / questionsAttempted;
  
  // Recent accuracy - last 10 questions (35%)
  const recentCorrect = recentResults.filter(r => r).length;
  const recentAccuracy = recentResults.length > 0 ? recentCorrect / recentResults.length : 0;
  
  // Difficulty-weighted performance (25%)
  let difficultyWeighted = 0;
  let totalWeight = 0;
  Object.entries(difficultyStats).forEach(([diff, stats]) => {
    const weight = parseInt(diff) * 0.5; // Higher difficulty = more weight
    if (stats.attempted > 0) {
      difficultyWeighted += (stats.correct / stats.attempted) * weight;
      totalWeight += weight;
    }
  });
  difficultyWeighted = totalWeight > 0 ? difficultyWeighted / totalWeight : 0;
  
  // Consistency score (10%) - lower variance = higher consistency
  const mean = recentResults.length > 0 ? recentResults.filter(r => r).length / recentResults.length : 0;
  const variance = recentResults.reduce((sum, r) => sum + Math.pow((r ? 1 : 0) - mean, 2), 0) / Math.max(1, recentResults.length);
  const consistencyScore = Math.max(0, 1 - Math.sqrt(variance));
  
  const mastery = (
    baseAccuracy * 0.3 +
    recentAccuracy * 0.35 +
    difficultyWeighted * 0.25 +
    consistencyScore * 0.1
  ) * 100;
  
  return Math.min(100, Math.max(0, mastery));
}

/**
 * Fetch question history for a user
 */
export async function fetchQuestionHistory(
  userId: string,
  questionIds: string[]
): Promise<Map<string, QuestionHistoryRecord>> {
  const { data, error } = await supabase
    .from('question_history')
    .select('question_id, times_seen, times_correct, last_result, next_review_date, ease_factor')
    .eq('user_id', userId)
    .in('question_id', questionIds);
  
  if (error) throw error;
  
  const historyMap = new Map<string, QuestionHistoryRecord>();
  data?.forEach(record => {
    historyMap.set(record.question_id, record as QuestionHistoryRecord);
  });
  
  return historyMap;
}

/**
 * Generate selection reasons for a question
 */
function generateSelectionReasons(
  question: QuestionCandidate,
  history: QuestionHistoryRecord | undefined,
  context: SelectionContext
): SelectionReason[] {
  const reasons: SelectionReason[] = [];
  const mastery = context.masteries.find(m => m.taxonomy_node_id === question.taxonomy_node_id);
  const masteryLevel = mastery?.mastery_level || 0;

  // Check mastery-based reasons
  if (masteryLevel < 40) {
    reasons.push({
      type: 'weak_point',
      label: 'Điểm yếu',
      description: `Cần cải thiện chủ đề này (${Math.round(masteryLevel)}% thành thạo)`,
      priority: 90
    });
  } else if (masteryLevel < 70) {
    reasons.push({
      type: 'reinforce',
      label: 'Củng cố',
      description: `Củng cố kiến thức (${Math.round(masteryLevel)}% thành thạo)`,
      priority: 60
    });
  } else {
    reasons.push({
      type: 'challenge',
      label: 'Thử thách',
      description: `Nâng cao trình độ (${Math.round(masteryLevel)}% thành thạo)`,
      priority: 40
    });
  }

  // Check spaced repetition
  if (history?.next_review_date) {
    const dueDate = new Date(history.next_review_date);
    const now = new Date();
    const daysDiff = Math.round((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 0) {
      reasons.push({
        type: 'spaced_repetition',
        label: 'Đến lúc ôn tập',
        description: daysDiff === 0 
          ? 'Hôm nay là ngày ôn tập theo lịch' 
          : `Quá hạn ôn tập ${daysDiff} ngày`,
        priority: 95
      });
    }
  } else if (!history) {
    reasons.push({
      type: 'new_topic',
      label: 'Chủ đề mới',
      description: 'Khám phá kiến thức mới',
      priority: 50
    });
  }

  // Check if previously failed
  if (history?.last_result === false) {
    reasons.push({
      type: 'retry_failed',
      label: 'Thử lại',
      description: 'Ôn lại câu hỏi bạn đã trả lời sai trước đó',
      priority: 85
    });
  }

  // Check struggling (low ease factor)
  if (history && history.ease_factor < 2.0) {
    reasons.push({
      type: 'struggling_topic',
      label: 'Cần luyện tập',
      description: 'Bạn đang gặp khó khăn với câu hỏi này',
      priority: 80
    });
  }

  // Check difficulty match
  const difficultyDiff = Math.abs((question.difficulty || 3) - context.targetDifficulty);
  if (difficultyDiff <= 0.5) {
    reasons.push({
      type: 'difficulty_match',
      label: 'Phù hợp trình độ',
      description: `Độ khó phù hợp với trình độ hiện tại của bạn`,
      priority: 55
    });
  }

  // Sort by priority descending
  return reasons.sort((a, b) => b.priority - a.priority);
}

/**
 * Score a question for selection priority
 * Higher score = higher priority for selection
 */
function scoreQuestion(
  question: QuestionCandidate,
  history: QuestionHistoryRecord | undefined,
  context: SelectionContext
): number {
  let score = 100; // Base score
  
  const mastery = context.masteries.find(m => m.taxonomy_node_id === question.taxonomy_node_id);
  const masteryLevel = mastery?.mastery_level || 0;
  
  // 1. Mastery-based allocation according to session type
  const allocation = SESSION_TYPES[context.sessionType].allocation;
  if (masteryLevel < 40) {
    score += allocation.weak; // Weak point bonus
  } else if (masteryLevel < 70) {
    score += allocation.reinforce; // Reinforce bonus
  } else {
    score += allocation.challenge; // Challenge bonus
  }
  
  // 2. Spaced repetition - due questions get high priority
  if (history?.next_review_date) {
    const dueDate = new Date(history.next_review_date);
    const now = new Date();
    const daysDiff = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= 0) {
      // Overdue - high priority
      score += 50 + Math.min(50, daysDiff * 5); // More overdue = higher priority
    } else {
      // Not due yet - lower priority
      score -= 30;
    }
  } else {
    // Never seen - moderate bonus for first-time questions
    score += 20;
  }
  
  // 3. Difficulty matching
  const difficultyDiff = Math.abs((question.difficulty || 3) - context.targetDifficulty);
  score -= difficultyDiff * 15; // Penalty for difficulty mismatch
  
  // 4. Previous failure bonus - questions answered wrong before
  if (history?.last_result === false) {
    score += 25; // Retry recently failed questions
  }
  
  // 5. Low ease factor bonus - struggling questions
  if (history && history.ease_factor < 2.0) {
    score += 20;
  }
  
  // 6. Variety - penalize frequently seen questions
  if (history && history.times_seen > 5) {
    score -= history.times_seen * 2;
  }
  
  return score;
}

/**
 * Main adaptive question selection algorithm
 * Returns questions with selection reasons for explainability
 */
export async function selectAdaptiveQuestions(
  allQuestions: QuestionCandidate[],
  count: number,
  context: SelectionContext
): Promise<SelectedQuestion[]> {
  if (allQuestions.length === 0) return [];
  
  // Fetch history for all questions
  const questionIds = allQuestions.map(q => q.id);
  const historyMap = await fetchQuestionHistory(context.userId, questionIds);
  
  // Adjust difficulty based on consecutive performance
  const adjustedDifficulty = adjustDifficulty(
    context.targetDifficulty,
    context.consecutiveCorrect,
    context.consecutiveIncorrect
  );
  
  const adjustedContext = { ...context, targetDifficulty: adjustedDifficulty };
  
  // Score all questions and generate reasons
  const scoredQuestions = allQuestions.map(q => {
    const history = historyMap.get(q.id);
    const reasons = generateSelectionReasons(q, history, adjustedContext);
    return {
      question: q,
      score: scoreQuestion(q, history, adjustedContext),
      reasons
    };
  });
  
  // Sort by score descending
  scoredQuestions.sort((a, b) => b.score - a.score);
  
  // Select top questions with some randomization in top tier
  const topTier = scoredQuestions.slice(0, Math.min(count * 3, scoredQuestions.length));
  
  // Shuffle top tier to add variety
  for (let i = topTier.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topTier[i], topTier[j]] = [topTier[j], topTier[i]];
  }
  
  // Take required count and attach reasons
  return topTier.slice(0, count).map(sq => ({
    ...sq.question,
    selectionReasons: sq.reasons,
    primaryReason: sq.reasons[0]
  }));
}

/**
 * Update question history after answering
 */
export async function updateQuestionHistory(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  timeSpentSeconds: number,
  expectedTimeSeconds: number
): Promise<void> {
  // Fetch existing history
  const { data: existing } = await supabase
    .from('question_history')
    .select('*')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle();
  
  const quality = calculateQuality(isCorrect, timeSpentSeconds, expectedTimeSeconds);
  const currentEaseFactor = existing?.ease_factor || SM2_CONFIG.DEFAULT_EASE_FACTOR;
  
  // Calculate current interval from last_seen_at and next_review_date
  let currentInterval = 1;
  if (existing?.last_seen_at && existing?.next_review_date) {
    const lastSeen = new Date(existing.last_seen_at);
    const nextReview = new Date(existing.next_review_date);
    currentInterval = Math.max(1, Math.round((nextReview.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)));
  }
  
  const { newEaseFactor, newInterval, nextReviewDate } = calculateSM2Update(
    currentEaseFactor,
    currentInterval,
    quality
  );
  
  const { error } = await supabase
    .from('question_history')
    .upsert({
      user_id: userId,
      question_id: questionId,
      times_seen: (existing?.times_seen || 0) + 1,
      times_correct: (existing?.times_correct || 0) + (isCorrect ? 1 : 0),
      last_seen_at: new Date().toISOString(),
      last_result: isCorrect,
      next_review_date: nextReviewDate.toISOString(),
      ease_factor: newEaseFactor
    }, {
      onConflict: 'user_id,question_id'
    });
  
  if (error) {
    console.error('Error updating question history:', error);
  }
}
