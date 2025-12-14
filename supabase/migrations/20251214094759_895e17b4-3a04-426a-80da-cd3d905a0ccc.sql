-- Create contests table
CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'completed')),
  distribution_status TEXT NOT NULL DEFAULT 'pending' CHECK (distribution_status IN ('pending', 'distributed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contest_exams junction table (links exams to contests)
CREATE TABLE public.contest_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  variant_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contest_id, exam_id),
  UNIQUE(contest_id, variant_code)
);

-- Create contest_participants table (links students to contests)
CREATE TABLE public.contest_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_exam_id UUID REFERENCES public.exams(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

-- Enable RLS
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;

-- Contests policies
CREATE POLICY "Admins can view all contests" ON public.contests
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own contests" ON public.contests
  FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

CREATE POLICY "Students can view active contests they participate in" ON public.contests
  FOR SELECT USING (
    status IN ('active', 'completed') AND 
    EXISTS (
      SELECT 1 FROM public.contest_participants 
      WHERE contest_participants.contest_id = contests.id 
      AND contest_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert contests" ON public.contests
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can insert own contests" ON public.contests
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can update all contests" ON public.contests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can update own contests" ON public.contests
  FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can delete all contests" ON public.contests
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can delete own contests" ON public.contests
  FOR DELETE USING (has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());

-- Contest exams policies
CREATE POLICY "Admins can manage all contest_exams" ON public.contest_exams
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage own contest_exams" ON public.contest_exams
  FOR ALL USING (
    has_role(auth.uid(), 'teacher'::app_role) AND 
    EXISTS (SELECT 1 FROM public.contests WHERE contests.id = contest_exams.contest_id AND contests.created_by = auth.uid())
  );

CREATE POLICY "Students can view their assigned contest_exams" ON public.contest_exams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contest_participants 
      WHERE contest_participants.contest_id = contest_exams.contest_id 
      AND contest_participants.user_id = auth.uid()
      AND contest_participants.assigned_exam_id = contest_exams.exam_id
    )
  );

-- Contest participants policies
CREATE POLICY "Admins can manage all contest_participants" ON public.contest_participants
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage own contest_participants" ON public.contest_participants
  FOR ALL USING (
    has_role(auth.uid(), 'teacher'::app_role) AND 
    EXISTS (SELECT 1 FROM public.contests WHERE contests.id = contest_participants.contest_id AND contests.created_by = auth.uid())
  );

CREATE POLICY "Students can view own participation" ON public.contest_participants
  FOR SELECT USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_contests_updated_at
  BEFORE UPDATE ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();