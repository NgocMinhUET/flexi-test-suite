-- Create security definer function to check class ownership (avoids recursion)
CREATE OR REPLACE FUNCTION public.owns_class(_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = _class_id AND created_by = auth.uid()
  )
$$;

-- Drop problematic class_teachers policies
DROP POLICY IF EXISTS "Admins can manage all class_teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "Class owners can manage teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "Students can view class teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "Teachers can view own assignments" ON public.class_teachers;

-- Recreate class_teachers policies using security definer functions
CREATE POLICY "Admins can manage all class_teachers"
ON public.class_teachers
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Class owners can manage teachers"
ON public.class_teachers
FOR ALL
USING (has_role(auth.uid(), 'teacher') AND owns_class(class_id))
WITH CHECK (has_role(auth.uid(), 'teacher') AND owns_class(class_id));

CREATE POLICY "Teachers can view own assignments"
ON public.class_teachers
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') 
  AND (
    teacher_id = auth.uid() 
    OR owns_class(class_id)
  )
);

CREATE POLICY "Students can view class teachers"
ON public.class_teachers
FOR SELECT
USING (has_role(auth.uid(), 'student') AND enrolled_in_class(class_id));

-- Drop and recreate classes policies to ensure no recursion
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

-- Admin policy (no subqueries)
CREATE POLICY "Admins can manage all classes"
ON public.classes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view their own classes or classes they're assigned to (using security definer)
CREATE POLICY "Teachers can view own classes"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') 
  AND (created_by = auth.uid() OR teaches_class(id))
);

-- Teachers can create classes
CREATE POLICY "Teachers can create classes"
ON public.classes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

-- Teachers can update own classes
CREATE POLICY "Teachers can update own classes"
ON public.classes
FOR UPDATE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

-- Teachers can delete own classes  
CREATE POLICY "Teachers can delete own classes"
ON public.classes
FOR DELETE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

-- Students can view enrolled classes (using security definer function)
CREATE POLICY "Students can view enrolled classes"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'student') 
  AND is_active = true 
  AND deleted_at IS NULL 
  AND enrolled_in_class(id)
);