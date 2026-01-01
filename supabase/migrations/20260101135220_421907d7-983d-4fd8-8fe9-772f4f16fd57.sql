-- =============================================
-- PHASE 1: CLASS MANAGEMENT SYSTEM
-- =============================================

-- Create enum for student enrollment status
CREATE TYPE public.enrollment_status AS ENUM ('active', 'inactive', 'dropped', 'graduated');

-- Create enum for class roles
CREATE TYPE public.class_member_role AS ENUM ('student', 'monitor', 'deputy');

-- Create enum for teacher roles in class
CREATE TYPE public.class_teacher_role AS ENUM ('primary', 'assistant', 'substitute');

-- Create enum for assignment scope
CREATE TYPE public.assignment_scope AS ENUM ('class', 'individual');

-- =============================================
-- TABLE: classes
-- =============================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  academic_year TEXT,
  semester TEXT,
  grade_level TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_students INTEGER DEFAULT 50,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_classes_code ON public.classes(code);
CREATE INDEX idx_classes_subject_id ON public.classes(subject_id);
CREATE INDEX idx_classes_created_by ON public.classes(created_by);
CREATE INDEX idx_classes_is_active ON public.classes(is_active);

-- =============================================
-- TABLE: class_students
-- =============================================
CREATE TABLE public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status enrollment_status NOT NULL DEFAULT 'active',
  role class_member_role NOT NULL DEFAULT 'student',
  enrolled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  UNIQUE(class_id, student_id)
);

-- Enable RLS
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_class_students_class_id ON public.class_students(class_id);
CREATE INDEX idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX idx_class_students_status ON public.class_students(status);

-- =============================================
-- TABLE: class_teachers
-- =============================================
CREATE TABLE public.class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  role class_teacher_role NOT NULL DEFAULT 'primary',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(class_id, teacher_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_class_teachers_class_id ON public.class_teachers(class_id);
CREATE INDEX idx_class_teachers_teacher_id ON public.class_teachers(teacher_id);

-- =============================================
-- UPDATE: practice_assignments - Add class support
-- =============================================
ALTER TABLE public.practice_assignments 
  ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN assignment_scope assignment_scope NOT NULL DEFAULT 'individual';

CREATE INDEX idx_practice_assignments_class_id ON public.practice_assignments(class_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user teaches a class
CREATE OR REPLACE FUNCTION public.teaches_class(_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_teachers
    WHERE class_id = _class_id AND teacher_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = _class_id AND created_by = auth.uid()
  )
$$;

-- Check if user is enrolled in a class
CREATE OR REPLACE FUNCTION public.enrolled_in_class(_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_students
    WHERE class_id = _class_id 
      AND student_id = auth.uid()
      AND status = 'active'
  )
$$;

-- =============================================
-- RLS POLICIES: classes
-- =============================================

-- Admin full access
CREATE POLICY "Admins can manage all classes"
ON public.classes FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view classes they created or teach
CREATE POLICY "Teachers can view own classes"
ON public.classes FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.class_teachers
      WHERE class_id = classes.id AND teacher_id = auth.uid()
    )
  )
);

-- Teachers can create classes
CREATE POLICY "Teachers can create classes"
ON public.classes FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
);

-- Teachers can update own classes
CREATE POLICY "Teachers can update own classes"
ON public.classes FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
);

-- Teachers can delete own classes
CREATE POLICY "Teachers can delete own classes"
ON public.classes FOR DELETE
USING (
  has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
);

-- Students can view active classes they're enrolled in
CREATE POLICY "Students can view enrolled classes"
ON public.classes FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND
  is_active = true AND
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.class_students
    WHERE class_id = classes.id 
      AND student_id = auth.uid()
      AND status = 'active'
  )
);

-- =============================================
-- RLS POLICIES: class_students
-- =============================================

-- Admin full access
CREATE POLICY "Admins can manage all class_students"
ON public.class_students FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can manage students in classes they own/teach
CREATE POLICY "Teachers can manage class students"
ON public.class_students FOR ALL
USING (
  has_role(auth.uid(), 'teacher') AND teaches_class(class_id)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher') AND teaches_class(class_id)
);

-- Students can view their own enrollment
CREATE POLICY "Students can view own enrollment"
ON public.class_students FOR SELECT
USING (student_id = auth.uid());

-- =============================================
-- RLS POLICIES: class_teachers
-- =============================================

-- Admin full access
CREATE POLICY "Admins can manage all class_teachers"
ON public.class_teachers FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view classes they're assigned to
CREATE POLICY "Teachers can view own assignments"
ON public.class_teachers FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_teachers.class_id AND created_by = auth.uid()
    )
  )
);

-- Class owners can manage teachers
CREATE POLICY "Class owners can manage teachers"
ON public.class_teachers FOR ALL
USING (
  has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_teachers.class_id AND created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'teacher') AND
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_teachers.class_id AND created_by = auth.uid()
  )
);

-- Students can view teachers in their classes
CREATE POLICY "Students can view class teachers"
ON public.class_teachers FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND
  enrolled_in_class(class_id)
);

-- =============================================
-- UPDATE RLS: practice_assignments - Add class-based access
-- =============================================

-- Students can view assignments by class
CREATE POLICY "Students can view class assignments"
ON public.practice_assignments FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND
  assignment_scope = 'class' AND
  class_id IS NOT NULL AND
  enrolled_in_class(class_id)
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at for classes
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();