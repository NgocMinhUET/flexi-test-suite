-- Create grading_jobs table to track background grading status
CREATE TABLE public.grading_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  progress integer DEFAULT 0, -- 0-100
  total_questions integer DEFAULT 0,
  graded_questions integer DEFAULT 0,
  result_data jsonb DEFAULT NULL,
  error_message text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own grading jobs
CREATE POLICY "Users can view own grading jobs"
ON public.grading_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own grading jobs
CREATE POLICY "Users can insert own grading jobs"
ON public.grading_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update grading jobs (for edge function)
CREATE POLICY "Service can update grading jobs"
ON public.grading_jobs FOR UPDATE
USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.grading_jobs;