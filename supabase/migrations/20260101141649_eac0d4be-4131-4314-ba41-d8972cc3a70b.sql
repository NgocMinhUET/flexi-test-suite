-- Drop old problematic policies for classes
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;

-- Recreate policies without recursive references
-- Admin policy (simple, no recursion)
CREATE POLICY "Admins can manage all classes"
ON public.classes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view classes they created OR are assigned to
CREATE POLICY "Teachers can view own classes"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') 
  AND (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.class_teachers
      WHERE class_teachers.class_id = classes.id 
      AND class_teachers.teacher_id = auth.uid()
    )
  )
);

-- Teachers can create classes (only check created_by, not the teaches_class function)
CREATE POLICY "Teachers can create classes"
ON public.classes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher') 
  AND created_by = auth.uid()
);

-- Teachers can update their own created classes
CREATE POLICY "Teachers can update own classes"
ON public.classes
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher') 
  AND created_by = auth.uid()
);

-- Teachers can delete their own created classes
CREATE POLICY "Teachers can delete own classes"
ON public.classes
FOR DELETE
USING (
  has_role(auth.uid(), 'teacher') 
  AND created_by = auth.uid()
);

-- Students can view classes they are enrolled in
CREATE POLICY "Students can view enrolled classes"
ON public.classes
FOR SELECT
USING (
  has_role(auth.uid(), 'student') 
  AND is_active = true 
  AND deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.class_students
    WHERE class_students.class_id = classes.id 
    AND class_students.student_id = auth.uid()
    AND class_students.status = 'active'
  )
);