-- Add foreign key constraint for user_daily_challenges if missing
-- Note: The unique constraint user_daily_challenges_user_id_challenge_id_key already exists

-- Ensure user_id references auth.users indirectly through handling
ALTER TABLE public.user_daily_challenges
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN challenge_id SET NOT NULL;

-- Add missing RLS policy for inserting user_daily_challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_daily_challenges' 
    AND policyname = 'Users can insert own daily challenge progress'
  ) THEN
    CREATE POLICY "Users can insert own daily challenge progress"
    ON public.user_daily_challenges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Add missing policy for teachers to view user daily challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_daily_challenges' 
    AND policyname = 'Teachers can view all user daily challenges'
  ) THEN
    CREATE POLICY "Teachers can view all user daily challenges"
    ON public.user_daily_challenges
    FOR SELECT
    USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- Add missing INSERT policy for user_achievements to allow users to insert their own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_achievements' 
    AND policyname = 'Users can insert own achievements'
  ) THEN
    CREATE POLICY "Users can insert own achievements"
    ON public.user_achievements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;