-- Drop existing restrictive update policies and recreate with soft delete support

-- For teachers: Allow updating deleted_at on their own questions (soft delete)
CREATE POLICY "Teachers can soft delete own questions" 
ON public.questions 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND created_by = auth.uid() 
  AND deleted_at IS NULL
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND created_by = auth.uid()
);