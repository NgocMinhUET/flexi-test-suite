-- Drop the existing student policy
DROP POLICY IF EXISTS "Students can view assigned published exams" ON public.exams;

-- Create updated policy that allows:
-- 1. Published exams assigned via exam_assignments
-- 2. ALL contest exams (regardless of is_published) when assigned via contest_participants
CREATE POLICY "Students can view assigned exams" 
ON public.exams 
FOR SELECT 
USING (
  -- Direct assignments require is_published = true
  ((is_published = true) AND EXISTS (
    SELECT 1 FROM exam_assignments 
    WHERE exam_assignments.exam_id = exams.id 
    AND exam_assignments.user_id = auth.uid()
  ))
  OR
  -- Contest assignments do NOT require is_published
  EXISTS (
    SELECT 1 FROM contest_participants 
    WHERE contest_participants.assigned_exam_id = exams.id 
    AND contest_participants.user_id = auth.uid()
  )
);