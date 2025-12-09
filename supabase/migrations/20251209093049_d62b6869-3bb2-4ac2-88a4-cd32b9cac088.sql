-- Create exam_assignments table
CREATE TABLE public.exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  UNIQUE(exam_id, user_id)
);

-- Enable RLS
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

-- Admin/Teacher can view all assignments
CREATE POLICY "Admins and teachers can view all assignments"
ON public.exam_assignments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Admin/Teacher can create assignments
CREATE POLICY "Admins and teachers can create assignments"
ON public.exam_assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Admin/Teacher can update assignments
CREATE POLICY "Admins and teachers can update assignments"
ON public.exam_assignments FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Admin/Teacher can delete assignments
CREATE POLICY "Admins and teachers can delete assignments"
ON public.exam_assignments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Students can view their own assignments
CREATE POLICY "Students can view their own assignments"
ON public.exam_assignments FOR SELECT
USING (auth.uid() = user_id);

-- Drop the old public exam policy
DROP POLICY IF EXISTS "Anyone can view published exams" ON public.exams;

-- Create new policy: Students see only assigned published exams
CREATE POLICY "Students can view assigned published exams"
ON public.exams FOR SELECT
USING (
  is_published = true 
  AND EXISTS (
    SELECT 1 FROM public.exam_assignments 
    WHERE exam_assignments.exam_id = exams.id 
    AND exam_assignments.user_id = auth.uid()
  )
);