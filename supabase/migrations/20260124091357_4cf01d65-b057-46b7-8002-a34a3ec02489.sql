-- Add time_left column to exam_drafts table for non-sectioned exam timer restoration
ALTER TABLE public.exam_drafts 
ADD COLUMN IF NOT EXISTS time_left integer DEFAULT NULL;

-- Add section_times column for sectioned exam timer restoration
ALTER TABLE public.exam_drafts 
ADD COLUMN IF NOT EXISTS section_times jsonb DEFAULT NULL;

-- Add current_section column for sectioned exam state
ALTER TABLE public.exam_drafts 
ADD COLUMN IF NOT EXISTS current_section integer DEFAULT NULL;

-- Add completed_sections column for sectioned exam state
ALTER TABLE public.exam_drafts 
ADD COLUMN IF NOT EXISTS completed_sections integer[] DEFAULT NULL;

COMMENT ON COLUMN public.exam_drafts.time_left IS 'Remaining time in seconds for non-sectioned exams';
COMMENT ON COLUMN public.exam_drafts.section_times IS 'Remaining time per section for sectioned exams';
COMMENT ON COLUMN public.exam_drafts.current_section IS 'Current section index for sectioned exams';
COMMENT ON COLUMN public.exam_drafts.completed_sections IS 'Array of completed section indices';