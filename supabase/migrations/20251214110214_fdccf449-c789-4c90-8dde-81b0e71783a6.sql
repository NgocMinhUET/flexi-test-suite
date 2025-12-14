-- Update RLS policy for exams to allow students to see exams assigned via contests
DROP POLICY IF EXISTS "Students can view assigned published exams" ON public.exams;

CREATE POLICY "Students can view assigned published exams" 
ON public.exams 
FOR SELECT 
USING (
  is_published = true 
  AND (
    -- Direct exam assignments
    EXISTS (
      SELECT 1 FROM public.exam_assignments
      WHERE exam_assignments.exam_id = exams.id 
      AND exam_assignments.user_id = auth.uid()
    )
    OR
    -- Contest participant assignments
    EXISTS (
      SELECT 1 FROM public.contest_participants
      WHERE contest_participants.assigned_exam_id = exams.id 
      AND contest_participants.user_id = auth.uid()
    )
  )
);