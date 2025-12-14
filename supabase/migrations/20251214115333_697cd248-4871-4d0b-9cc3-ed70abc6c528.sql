-- Add source classification columns to exams table
ALTER TABLE public.exams 
ADD COLUMN source_type text NOT NULL DEFAULT 'standalone',
ADD COLUMN source_contest_id uuid REFERENCES public.contests(id) ON DELETE SET NULL;

-- Add index for filtering by source_type
CREATE INDEX idx_exams_source_type ON public.exams(source_type);

-- Add index for source_contest_id lookups
CREATE INDEX idx_exams_source_contest_id ON public.exams(source_contest_id) WHERE source_contest_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.exams.source_type IS 'Source of exam: standalone (created manually) or contest (generated for a contest)';
COMMENT ON COLUMN public.exams.source_contest_id IS 'Reference to contest if exam was generated for a contest';