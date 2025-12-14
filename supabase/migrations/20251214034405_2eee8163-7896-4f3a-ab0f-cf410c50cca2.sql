-- Create exam_templates table for storing matrix configurations
CREATE TABLE public.exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  description TEXT,
  
  -- Matrix configuration
  matrix_config JSONB NOT NULL DEFAULT '{"cells": [], "totalQuestions": 0, "totalPoints": 0, "duration": 60}'::jsonb,
  
  -- Constraints configuration
  constraints JSONB NOT NULL DEFAULT '{"allowShuffle": true, "shuffleOptions": true, "minDifficulty": 0, "maxDifficulty": 1}'::jsonb,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create generated_exams table for storing generated exam variants
CREATE TABLE public.generated_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.exam_templates(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  variant_code TEXT NOT NULL,
  seed INTEGER NOT NULL,
  
  -- Mapping from question bank to exam positions
  question_mapping JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_exams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_templates
CREATE POLICY "Admins can view all templates"
ON public.exam_templates FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view own templates"
ON public.exam_templates FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Admins can insert templates"
ON public.exam_templates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can insert own templates"
ON public.exam_templates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Admins can update all templates"
ON public.exam_templates FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update own templates"
ON public.exam_templates FOR UPDATE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Admins can delete all templates"
ON public.exam_templates FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete own templates"
ON public.exam_templates FOR DELETE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

-- RLS Policies for generated_exams (based on template ownership)
CREATE POLICY "Admins can view all generated exams"
ON public.generated_exams FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view own generated exams"
ON public.generated_exams FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exam_templates 
    WHERE id = template_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins can insert generated exams"
ON public.generated_exams FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can insert own generated exams"
ON public.generated_exams FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exam_templates 
    WHERE id = template_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete all generated exams"
ON public.generated_exams FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete own generated exams"
ON public.generated_exams FOR DELETE
USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (
    SELECT 1 FROM public.exam_templates 
    WHERE id = template_id AND created_by = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_exam_templates_updated_at
BEFORE UPDATE ON public.exam_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_exam_templates_subject_id ON public.exam_templates(subject_id);
CREATE INDEX idx_exam_templates_created_by ON public.exam_templates(created_by);
CREATE INDEX idx_generated_exams_template_id ON public.generated_exams(template_id);
CREATE INDEX idx_generated_exams_exam_id ON public.generated_exams(exam_id);