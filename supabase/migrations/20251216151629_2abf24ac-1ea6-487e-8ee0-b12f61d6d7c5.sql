-- Add sectioned exam support
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS is_sectioned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN exams.is_sectioned IS 'Whether exam is divided into sections with individual timers';
COMMENT ON COLUMN exams.sections IS 'Array of {id, name, description, duration, questionIds}';