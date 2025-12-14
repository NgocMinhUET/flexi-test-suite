-- Create security definer function to check contest ownership
CREATE OR REPLACE FUNCTION public.owns_contest(_contest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contests
    WHERE id = _contest_id AND created_by = auth.uid()
  )
$$;

-- Drop old problematic policies on contest_exams
DROP POLICY IF EXISTS "Teachers can manage own contest_exams" ON public.contest_exams;

-- Recreate using security definer function
CREATE POLICY "Teachers can manage own contest_exams"
ON public.contest_exams
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_contest(contest_id)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_contest(contest_id)
);

-- Drop old problematic policies on contest_participants
DROP POLICY IF EXISTS "Teachers can manage own contest_participants" ON public.contest_participants;

-- Recreate using security definer function
CREATE POLICY "Teachers can manage own contest_participants"
ON public.contest_participants
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_contest(contest_id)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_contest(contest_id)
);

-- Also fix the students policy on contest_exams that references contest_participants
DROP POLICY IF EXISTS "Students can view their assigned contest_exams" ON public.contest_exams;

-- Create function to check if user is assigned to exam in contest
CREATE OR REPLACE FUNCTION public.is_assigned_contest_exam(_contest_id uuid, _exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contest_participants
    WHERE contest_id = _contest_id 
      AND user_id = auth.uid() 
      AND assigned_exam_id = _exam_id
  )
$$;

CREATE POLICY "Students can view their assigned contest_exams"
ON public.contest_exams
FOR SELECT
USING (is_assigned_contest_exam(contest_id, exam_id));

-- Fix students policy on contests that references contest_participants
DROP POLICY IF EXISTS "Students can view active contests they participate in" ON public.contests;

-- Create function to check if user participates in contest
CREATE OR REPLACE FUNCTION public.participates_in_contest(_contest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contest_participants
    WHERE contest_id = _contest_id 
      AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Students can view active contests they participate in"
ON public.contests
FOR SELECT
USING (
  status IN ('active', 'completed') 
  AND participates_in_contest(id)
);