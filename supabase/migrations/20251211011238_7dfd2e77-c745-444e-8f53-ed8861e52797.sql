-- Step 1: Create SECURITY DEFINER function to check exam ownership
CREATE OR REPLACE FUNCTION public.owns_exam(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exams
    WHERE id = _exam_id AND created_by = auth.uid()
  )
$$;

-- Step 2: Drop and recreate exam_assignments policies for teachers
DROP POLICY IF EXISTS "Teachers can view assignments for own exams" ON public.exam_assignments;
DROP POLICY IF EXISTS "Teachers can create assignments for own exams" ON public.exam_assignments;
DROP POLICY IF EXISTS "Teachers can update assignments for own exams" ON public.exam_assignments;
DROP POLICY IF EXISTS "Teachers can delete assignments for own exams" ON public.exam_assignments;

CREATE POLICY "Teachers can view assignments for own exams"
ON public.exam_assignments FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND owns_exam(exam_id));

CREATE POLICY "Teachers can create assignments for own exams"
ON public.exam_assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher') AND owns_exam(exam_id));

CREATE POLICY "Teachers can update assignments for own exams"
ON public.exam_assignments FOR UPDATE
USING (has_role(auth.uid(), 'teacher') AND owns_exam(exam_id));

CREATE POLICY "Teachers can delete assignments for own exams"
ON public.exam_assignments FOR DELETE
USING (has_role(auth.uid(), 'teacher') AND owns_exam(exam_id));

-- Step 3: Drop and recreate exam_results policy for teachers
DROP POLICY IF EXISTS "Teachers can view results for own exams" ON public.exam_results;

CREATE POLICY "Teachers can view results for own exams"
ON public.exam_results FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND owns_exam(exam_id));