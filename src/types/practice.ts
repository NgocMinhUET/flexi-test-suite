// Practice Mode Types
export interface PracticeConfig {
  id: string;
  exam_id: string;
  allow_unlimited_attempts: boolean;
  show_answers_after_submit: boolean;
  show_explanations: boolean;
  time_limit_enabled: boolean;
  time_limit_minutes: number | null;
  is_public: boolean;
  allowed_users: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  attempt_number: number;
  score: number;
  total_points: number;
  earned_points: number;
  time_spent_seconds: number;
  question_results: PracticeQuestionResult[];
  completed_at: string;
}

export interface PracticeQuestionResult {
  questionId: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  timeSpent: number;
}

// Adaptive Practice Types
export interface StudentSkillProfile {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  total_questions_attempted: number;
  total_correct_answers: number;
  total_practice_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface SkillMastery {
  id: string;
  user_id: string;
  taxonomy_node_id: string;
  mastery_level: number;
  questions_attempted: number;
  questions_correct: number;
  last_correct_streak: number;
  next_review_date: string | null;
  ease_factor: number;
  interval_days: number;
  difficulty_stats: DifficultyStats;
  updated_at: string;
  // Joined fields
  taxonomy_node?: {
    id: string;
    name: string;
    code: string;
    level: number;
    parent_id: string | null;
    subject_id: string;
  };
}

export interface DifficultyStats {
  [key: string]: {
    attempted: number;
    correct: number;
  };
}

export interface QuestionHistory {
  id: string;
  user_id: string;
  question_id: string;
  times_seen: number;
  times_correct: number;
  last_seen_at: string | null;
  last_result: boolean | null;
  next_review_date: string | null;
  ease_factor: number;
}

// Gamification Types
export interface LevelConfig {
  level: number;
  xp_required: number;
  title: string;
  badge_icon: string;
  perks: Record<string, any>;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'quantity' | 'mastery' | 'accuracy' | 'xp' | 'special';
  condition_type: string;
  condition_value: number;
  xp_reward: number;
  is_hidden: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  challenge_type: string;
  target_value: number;
  description: string;
  xp_reward: number;
  bonus_multiplier: number;
  subject_id: string | null;
  created_at: string;
}

export interface UserDailyChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  challenge?: DailyChallenge;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  xpEarned: number;
  questionsCompleted: number;
  accuracy: number;
  streak: number;
}

export interface Leaderboard {
  id: string;
  leaderboard_type: string;
  period_start: string;
  period_end: string;
  subject_id: string | null;
  rankings: LeaderboardEntry[];
  updated_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  session_type: 'daily_practice' | 'weak_point_focus' | 'review' | 'challenge';
  subject_id: string | null;
  questions_count: number;
  correct_count: number;
  xp_earned: number;
  time_spent_seconds: number;
  question_results: PracticeQuestionResult[];
  started_at: string;
  completed_at: string | null;
}

// XP Configuration
export const XP_CONFIG = {
  questionBase: {
    correct: 10,
    incorrect: 2,
    partial: 5
  },
  difficultyMultiplier: {
    1: 0.8,
    2: 1.0,
    3: 1.2,
    4: 1.5,
    5: 2.0
  },
  bonuses: {
    perfectSession: 50,
    streakDay: 20,
    streakMilestone: {
      7: 100,
      30: 500,
      100: 2000,
      365: 10000
    },
    firstTimeCorrect: 5,
    masteryReached: 100,
    speedBonus: 15
  },
  dailyXPCap: 500
} as const;

// Mastery Levels
export const MASTERY_LEVELS = {
  NOVICE: { min: 0, max: 20, label: 'Mới bắt đầu', color: 'gray' },
  BEGINNER: { min: 20, max: 40, label: 'Cơ bản', color: 'blue' },
  INTERMEDIATE: { min: 40, max: 60, label: 'Trung bình', color: 'green' },
  ADVANCED: { min: 60, max: 80, label: 'Nâng cao', color: 'purple' },
  MASTER: { min: 80, max: 95, label: 'Thành thạo', color: 'gold' },
  GRANDMASTER: { min: 95, max: 100, label: 'Bậc thầy', color: 'rainbow' }
} as const;

export type MasteryLevelKey = keyof typeof MASTERY_LEVELS;

export function getMasteryLevel(mastery: number): typeof MASTERY_LEVELS[MasteryLevelKey] {
  if (mastery >= 95) return MASTERY_LEVELS.GRANDMASTER;
  if (mastery >= 80) return MASTERY_LEVELS.MASTER;
  if (mastery >= 60) return MASTERY_LEVELS.ADVANCED;
  if (mastery >= 40) return MASTERY_LEVELS.INTERMEDIATE;
  if (mastery >= 20) return MASTERY_LEVELS.BEGINNER;
  return MASTERY_LEVELS.NOVICE;
}

// Session Types
export const SESSION_TYPES = {
  daily_practice: {
    name: 'Luyện tập hàng ngày',
    description: 'Hệ thống tự chọn câu hỏi tối ưu cho bạn',
    icon: '📚',
    allocation: { weak: 60, reinforce: 25, challenge: 15 },
    xpMultiplier: 1
  },
  weak_point_focus: {
    name: 'Tập trung điểm yếu',
    description: 'Tập trung vào những chủ đề bạn còn yếu',
    icon: '🔴',
    allocation: { weak: 80, reinforce: 15, challenge: 5 },
    xpMultiplier: 1.5
  },
  review: {
    name: 'Ôn tập',
    description: 'Ôn lại kiến thức đã học',
    icon: '📖',
    allocation: { weak: 30, reinforce: 60, challenge: 10 },
    xpMultiplier: 1
  },
  challenge: {
    name: 'Thử thách',
    description: 'Thử sức với những câu hỏi khó',
    icon: '⚡',
    allocation: { weak: 20, reinforce: 30, challenge: 50 },
    xpMultiplier: 2
  }
} as const;

export type SessionType = keyof typeof SESSION_TYPES;
