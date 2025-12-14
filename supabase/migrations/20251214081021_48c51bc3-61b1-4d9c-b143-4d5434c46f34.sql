-- Add UNIQUE constraint to prevent duplicate question codes per subject
ALTER TABLE questions 
ADD CONSTRAINT unique_question_code_per_subject 
UNIQUE (code, subject_id);