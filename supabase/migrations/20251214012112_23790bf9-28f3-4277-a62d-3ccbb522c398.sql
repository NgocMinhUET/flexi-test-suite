-- Create exam_drafts table for auto-saving exam progress
CREATE TABLE public.exam_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  flagged_questions INTEGER[] DEFAULT '{}',
  current_question INTEGER DEFAULT 0,
  violation_stats JSONB DEFAULT '{"tabSwitchCount": 0, "fullscreenExitCount": 0}',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, user_id)
);

-- Enable RLS
ALTER TABLE public.exam_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own drafts
CREATE POLICY "Users can view their own drafts"
ON public.exam_drafts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own drafts
CREATE POLICY "Users can insert their own drafts"
ON public.exam_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
ON public.exam_drafts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
ON public.exam_drafts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_exam_drafts_user_exam ON public.exam_drafts(user_id, exam_id);