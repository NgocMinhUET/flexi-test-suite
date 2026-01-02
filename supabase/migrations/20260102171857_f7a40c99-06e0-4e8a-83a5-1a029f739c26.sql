-- Create security definer function to check practice assignment ownership
CREATE OR REPLACE FUNCTION public.owns_practice_assignment(_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practice_assignments
    WHERE id = _assignment_id
      AND created_by = auth.uid()
  )
$$;

-- Drop existing policies on practice_assignment_students that cause recursion
DROP POLICY IF EXISTS "Teachers can manage own assignment students" ON public.practice_assignment_students;

-- Recreate the policy using the security definer function
CREATE POLICY "Teachers can manage own assignment students"
ON public.practice_assignment_students
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_practice_assignment(assignment_id)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_practice_assignment(assignment_id)
);

-- Also fix practice_assignment_attempts policy that queries practice_assignments
DROP POLICY IF EXISTS "Teachers can view attempts for own assignments" ON public.practice_assignment_attempts;

CREATE POLICY "Teachers can view attempts for own assignments"
ON public.practice_assignment_attempts
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND owns_practice_assignment(assignment_id)
);