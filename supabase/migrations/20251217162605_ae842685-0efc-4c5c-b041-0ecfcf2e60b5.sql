-- ========================================
-- PRACTICE MODE TABLES
-- ========================================

-- Bảng cấu hình practice cho exam
CREATE TABLE public.practice_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  
  -- Cài đặt
  allow_unlimited_attempts BOOLEAN DEFAULT true,
  show_answers_after_submit BOOLEAN DEFAULT true,
  show_explanations BOOLEAN DEFAULT true,
  time_limit_enabled BOOLEAN DEFAULT false,
  time_limit_minutes INTEGER,
  
  -- Ai được phép luyện tập
  is_public BOOLEAN DEFAULT false,
  allowed_users UUID[] DEFAULT '{}',
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(exam_id)
);

-- Lịch sử các lần luyện tập
CREATE TABLE public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  
  -- Kết quả
  score DECIMAL(5,2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  earned_points INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Chi tiết từng câu
  question_results JSONB DEFAULT '[]',
  
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho practice_attempts
CREATE INDEX idx_practice_attempts_user_exam ON public.practice_attempts(user_id, exam_id);
CREATE INDEX idx_practice_attempts_completed ON public.practice_attempts(completed_at DESC);

-- ========================================
-- ADAPTIVE PRACTICE MODE TABLES
-- ========================================

-- Profile kỹ năng của học sinh
CREATE TABLE public.student_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Tổng quan
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date DATE,
  
  -- Thống kê tổng
  total_questions_attempted INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  total_practice_time_minutes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chi tiết kỹ năng theo từng taxonomy node
CREATE TABLE public.skill_masteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  taxonomy_node_id UUID REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  
  -- Mức độ thành thạo (0-100%)
  mastery_level DECIMAL(5,2) DEFAULT 0,
  
  -- Thống kê
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  last_correct_streak INTEGER DEFAULT 0,
  
  -- Spaced repetition
  next_review_date TIMESTAMPTZ,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  
  -- Theo độ khó
  difficulty_stats JSONB DEFAULT '{
    "1": {"attempted": 0, "correct": 0},
    "2": {"attempted": 0, "correct": 0},
    "3": {"attempted": 0, "correct": 0},
    "4": {"attempted": 0, "correct": 0},
    "5": {"attempted": 0, "correct": 0}
  }',
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, taxonomy_node_id)
);

-- Lịch sử câu hỏi đã làm (cho spaced repetition)
CREATE TABLE public.question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  
  times_seen INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  last_result BOOLEAN,
  
  -- Spaced repetition cho câu hỏi cụ thể
  next_review_date TIMESTAMPTZ,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  
  UNIQUE(user_id, question_id)
);

-- Index cho question_history
CREATE INDEX idx_question_history_user ON public.question_history(user_id);
CREATE INDEX idx_question_history_next_review ON public.question_history(user_id, next_review_date);

-- ========================================
-- GAMIFICATION TABLES
-- ========================================

-- Cấu hình XP và Level
CREATE TABLE public.level_configs (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL,
  title VARCHAR(50) NOT NULL,
  badge_icon VARCHAR(100),
  perks JSONB DEFAULT '{}'
);

-- Seed data cho levels
INSERT INTO public.level_configs (level, xp_required, title, badge_icon) VALUES
(1, 0, 'Tân binh', '🌱'),
(2, 100, 'Học viên', '📚'),
(3, 300, 'Sinh viên', '🎓'),
(4, 600, 'Cử nhân', '📜'),
(5, 1000, 'Thạc sĩ', '🎯'),
(6, 1500, 'Tiến sĩ', '🔬'),
(7, 2100, 'Giáo sư', '👨‍🏫'),
(8, 2800, 'Viện sĩ', '🏛️'),
(9, 3600, 'Học giả', '📖'),
(10, 4500, 'Bậc thầy', '👑'),
(11, 5500, 'Huyền thoại', '⭐'),
(12, 6600, 'Thần đồng', '🌟'),
(13, 7800, 'Thiên tài', '💎'),
(14, 9100, 'Siêu nhân', '🦸'),
(15, 10500, 'Vô địch', '🏆'),
(16, 12000, 'Đại sư', '🔮'),
(17, 13600, 'Thánh nhân', '👼'),
(18, 15300, 'Bất tử', '♾️'),
(19, 17100, 'Thượng đế', '⚡'),
(20, 19000, 'Vũ trụ', '🌌');

-- Hệ thống Achievements (Huy hiệu)
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  category VARCHAR(50),
  
  -- Điều kiện đạt được
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  
  -- Phần thưởng
  xp_reward INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  
  rarity VARCHAR(20) DEFAULT 'common',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data cho achievements
INSERT INTO public.achievements (code, name, description, icon, category, condition_type, condition_value, xp_reward, rarity) VALUES
-- Streak achievements
('streak_3', 'Khởi động', 'Luyện tập 3 ngày liên tiếp', '🔥', 'streak', 'streak_days', 3, 50, 'common'),
('streak_7', 'Kiên trì', 'Luyện tập 7 ngày liên tiếp', '🔥', 'streak', 'streak_days', 7, 100, 'common'),
('streak_14', 'Quyết tâm', 'Luyện tập 14 ngày liên tiếp', '💪', 'streak', 'streak_days', 14, 200, 'rare'),
('streak_30', 'Chiến binh', 'Luyện tập 30 ngày liên tiếp', '⚔️', 'streak', 'streak_days', 30, 500, 'rare'),
('streak_60', 'Bất khuất', 'Luyện tập 60 ngày liên tiếp', '🛡️', 'streak', 'streak_days', 60, 1000, 'epic'),
('streak_100', 'Huyền thoại', 'Luyện tập 100 ngày liên tiếp', '🏆', 'streak', 'streak_days', 100, 2000, 'legendary'),
('streak_365', 'Vĩnh cửu', 'Luyện tập 365 ngày liên tiếp', '👑', 'streak', 'streak_days', 365, 10000, 'legendary'),

-- Quantity achievements
('questions_50', 'Bước đầu', 'Hoàn thành 50 câu hỏi', '📝', 'quantity', 'total_questions', 50, 50, 'common'),
('questions_100', 'Chăm chỉ', 'Hoàn thành 100 câu hỏi', '📚', 'quantity', 'total_questions', 100, 100, 'common'),
('questions_500', 'Cần cù', 'Hoàn thành 500 câu hỏi', '📖', 'quantity', 'total_questions', 500, 300, 'rare'),
('questions_1000', 'Siêng năng', 'Hoàn thành 1,000 câu hỏi', '🎯', 'quantity', 'total_questions', 1000, 500, 'rare'),
('questions_5000', 'Phi thường', 'Hoàn thành 5,000 câu hỏi', '🌟', 'quantity', 'total_questions', 5000, 1500, 'epic'),
('questions_10000', 'Siêu nhân', 'Hoàn thành 10,000 câu hỏi', '🦸', 'quantity', 'total_questions', 10000, 3000, 'legendary'),

-- Mastery achievements
('first_mastery', 'Chuyên gia', 'Đạt mastery 80%+ ở 1 chủ đề', '🎯', 'mastery', 'mastery_count', 1, 200, 'common'),
('mastery_3', 'Toàn diện', 'Đạt mastery 80%+ ở 3 chủ đề', '🏅', 'mastery', 'mastery_count', 3, 400, 'rare'),
('mastery_5', 'Đa tài', 'Đạt mastery 80%+ ở 5 chủ đề', '🌟', 'mastery', 'mastery_count', 5, 700, 'rare'),
('mastery_10', 'Uyên bác', 'Đạt mastery 80%+ ở 10 chủ đề', '💎', 'mastery', 'mastery_count', 10, 1500, 'epic'),

-- Accuracy achievements
('perfect_session', 'Hoàn hảo', 'Hoàn thành 1 session 100% đúng (10+ câu)', '💯', 'accuracy', 'perfect_sessions', 1, 100, 'common'),
('perfect_5', 'Xuất sắc', 'Hoàn thành 5 session 100% đúng', '🎖️', 'accuracy', 'perfect_sessions', 5, 300, 'rare'),
('perfect_10', 'Không sai sót', 'Hoàn thành 10 session 100% đúng', '🏆', 'accuracy', 'perfect_sessions', 10, 600, 'epic'),

-- XP achievements
('xp_1000', 'Tích lũy', 'Đạt 1,000 XP', '⭐', 'xp', 'total_xp', 1000, 50, 'common'),
('xp_5000', 'Giàu có', 'Đạt 5,000 XP', '💰', 'xp', 'total_xp', 5000, 200, 'rare'),
('xp_10000', 'Triệu phú', 'Đạt 10,000 XP', '💎', 'xp', 'total_xp', 10000, 500, 'epic'),

-- Special hidden achievements
('early_bird', 'Chim sớm', 'Luyện tập trước 6h sáng', '🌅', 'special', 'special', 1, 50, 'rare'),
('night_owl', 'Cú đêm', 'Luyện tập sau 11h đêm', '🦉', 'special', 'special', 1, 50, 'rare'),
('comeback_king', 'Quay lại vương giả', 'Quay lại sau 30 ngày không hoạt động', '👊', 'special', 'special', 1, 100, 'rare');

-- Update hidden achievements
UPDATE public.achievements SET is_hidden = true WHERE category = 'special';

-- Achievements đã đạt được
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- Daily/Weekly Challenges
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL,
  
  challenge_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  description TEXT NOT NULL,
  
  xp_reward INTEGER DEFAULT 50,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  subject_id UUID REFERENCES public.subjects(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(challenge_date, challenge_type)
);

-- Progress của user với daily challenges
CREATE TABLE public.user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, challenge_id)
);

-- Bảng xếp hạng (được tính toán định kỳ)
CREATE TABLE public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  leaderboard_type VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  subject_id UUID REFERENCES public.subjects(id),
  
  rankings JSONB DEFAULT '[]',
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(leaderboard_type, period_start, period_end, subject_id)
);

-- Practice sessions (cho adaptive mode)
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  session_type VARCHAR(50) NOT NULL, -- 'daily_practice', 'weak_point_focus', 'review', 'challenge'
  subject_id UUID REFERENCES public.subjects(id),
  
  -- Stats
  questions_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Question details
  question_results JSONB DEFAULT '[]',
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for practice_sessions
CREATE INDEX idx_practice_sessions_user ON public.practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_completed ON public.practice_sessions(completed_at DESC);

-- ========================================
-- UPDATE QUESTIONS TABLE
-- ========================================

-- Thêm trường explanation và hints cho câu hỏi
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS hints JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS related_concepts JSONB DEFAULT '[]';

-- ========================================
-- UPDATE EXAMS TABLE
-- ========================================

-- Thêm mode cho exam
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'exam';
-- mode: 'exam' | 'practice' | 'adaptive'

-- ========================================
-- RLS POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE public.practice_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_masteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Practice configs policies
CREATE POLICY "Teachers can manage practice configs for own exams" ON public.practice_configs
FOR ALL USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND created_by = auth.uid())
);

CREATE POLICY "Admins can manage all practice configs" ON public.practice_configs
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view public practice configs" ON public.practice_configs
FOR SELECT USING (
  is_public = true OR 
  auth.uid() = ANY(allowed_users)
);

-- Practice attempts policies
CREATE POLICY "Users can manage own practice attempts" ON public.practice_attempts
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view practice attempts for own exams" ON public.practice_attempts
FOR SELECT USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND created_by = auth.uid())
);

CREATE POLICY "Admins can view all practice attempts" ON public.practice_attempts
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Student skill profiles policies
CREATE POLICY "Users can manage own skill profile" ON public.student_skill_profiles
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all skill profiles" ON public.student_skill_profiles
FOR SELECT USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- Skill masteries policies
CREATE POLICY "Users can manage own skill masteries" ON public.skill_masteries
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all skill masteries" ON public.skill_masteries
FOR SELECT USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- Question history policies
CREATE POLICY "Users can manage own question history" ON public.question_history
FOR ALL USING (auth.uid() = user_id);

-- Level configs - everyone can view
CREATE POLICY "Anyone can view level configs" ON public.level_configs
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Achievements - everyone can view non-hidden
CREATE POLICY "Anyone can view non-hidden achievements" ON public.achievements
FOR SELECT USING (auth.uid() IS NOT NULL AND (is_hidden = false OR EXISTS (
  SELECT 1 FROM public.user_achievements WHERE achievement_id = achievements.id AND user_id = auth.uid()
)));

CREATE POLICY "Admins can manage achievements" ON public.achievements
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User achievements policies
CREATE POLICY "Users can view own achievements" ON public.user_achievements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" ON public.user_achievements
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view all user achievements" ON public.user_achievements
FOR SELECT USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- Daily challenges - everyone can view
CREATE POLICY "Anyone can view daily challenges" ON public.daily_challenges
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage daily challenges" ON public.daily_challenges
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User daily challenges policies
CREATE POLICY "Users can manage own daily challenge progress" ON public.user_daily_challenges
FOR ALL USING (auth.uid() = user_id);

-- Leaderboards - everyone can view
CREATE POLICY "Anyone can view leaderboards" ON public.leaderboards
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage leaderboards" ON public.leaderboards
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Practice sessions policies
CREATE POLICY "Users can manage own practice sessions" ON public.practice_sessions
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all practice sessions" ON public.practice_sessions
FOR SELECT USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to update student level based on XP
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_level INTEGER := 1;
BEGIN
  SELECT COALESCE(MAX(level), 1) INTO calculated_level
  FROM public.level_configs
  WHERE xp_required <= xp;
  
  RETURN calculated_level;
END;
$$;

-- Trigger to auto-update level when XP changes
CREATE OR REPLACE FUNCTION public.update_student_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.current_level := calculate_level_from_xp(NEW.total_xp);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_student_level
BEFORE UPDATE OF total_xp ON public.student_skill_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_student_level();

-- Function to create skill profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_skill_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_skill_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create skill profile for new users
CREATE TRIGGER on_auth_user_created_skill_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_skill_profile();