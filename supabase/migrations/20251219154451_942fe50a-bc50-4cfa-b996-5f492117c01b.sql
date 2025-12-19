-- Add policy for students to view published questions for practice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'questions' 
    AND policyname = 'Students can view published questions'
  ) THEN
    CREATE POLICY "Students can view published questions"
    ON public.questions
    FOR SELECT
    USING (
      status = 'published'::question_status 
      AND deleted_at IS NULL
      AND has_role(auth.uid(), 'student')
    );
  END IF;
END$$;

-- Fix daily_challenges insert policy for service role (edge function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'daily_challenges' 
    AND policyname = 'Service can insert daily challenges'
  ) THEN
    CREATE POLICY "Service can insert daily challenges"
    ON public.daily_challenges
    FOR INSERT
    WITH CHECK (true);
  END IF;
END$$;