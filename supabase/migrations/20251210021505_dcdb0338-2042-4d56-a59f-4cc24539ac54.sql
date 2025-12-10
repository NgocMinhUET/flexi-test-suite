-- Drop existing teacher/admin policies for exams
DROP POLICY IF EXISTS "Admins and teachers can view all exams" ON public.exams;
DROP POLICY IF EXISTS "Admins and teachers can create exams" ON public.exams;
DROP POLICY IF EXISTS "Admins and teachers can update exams" ON public.exams;
DROP POLICY IF EXISTS "Admins and teachers can delete exams" ON public.exams;

-- Create new policies: Admins see all, Teachers see only their own
CREATE POLICY "Admins can view all exams"
ON public.exams FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view own exams"
ON public.exams FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Admins and teachers can create exams"
ON public.exams FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can update all exams"
ON public.exams FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update own exams"
ON public.exams FOR UPDATE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Admins can delete all exams"
ON public.exams FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete own exams"
ON public.exams FOR DELETE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

-- Update exam_results policies: Teachers can only see results for their own exams
DROP POLICY IF EXISTS "Admins and teachers can view all results" ON public.exam_results;

CREATE POLICY "Admins can view all results"
ON public.exam_results FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view results for own exams"
ON public.exam_results FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_results.exam_id 
    AND exams.created_by = auth.uid()
  )
);

-- Update exam_assignments policies: Teachers can only manage assignments for their own exams
DROP POLICY IF EXISTS "Admins and teachers can view all assignments" ON public.exam_assignments;
DROP POLICY IF EXISTS "Admins and teachers can create assignments" ON public.exam_assignments;
DROP POLICY IF EXISTS "Admins and teachers can update assignments" ON public.exam_assignments;
DROP POLICY IF EXISTS "Admins and teachers can delete assignments" ON public.exam_assignments;

CREATE POLICY "Admins can view all assignments"
ON public.exam_assignments FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view assignments for own exams"
ON public.exam_assignments FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_assignments.exam_id 
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can create any assignments"
ON public.exam_assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can create assignments for own exams"
ON public.exam_assignments FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_id 
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update any assignments"
ON public.exam_assignments FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update assignments for own exams"
ON public.exam_assignments FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_assignments.exam_id 
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete any assignments"
ON public.exam_assignments FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete assignments for own exams"
ON public.exam_assignments FOR DELETE
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_assignments.exam_id 
    AND exams.created_by = auth.uid()
  )
);