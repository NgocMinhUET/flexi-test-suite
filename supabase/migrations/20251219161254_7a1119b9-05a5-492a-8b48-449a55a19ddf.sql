-- Add indexes for frequently filtered columns to improve query performance

-- Index for questions table - most commonly filtered columns
CREATE INDEX IF NOT EXISTS idx_questions_subject_status_deleted 
ON public.questions (subject_id, status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_questions_taxonomy_node 
ON public.questions (taxonomy_node_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_questions_cognitive_level 
ON public.questions (cognitive_level) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_questions_created_at 
ON public.questions (created_at DESC) WHERE deleted_at IS NULL;

-- Index for exam_results - frequently joined and filtered
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_user 
ON public.exam_results (exam_id, user_id);

CREATE INDEX IF NOT EXISTS idx_exam_results_user_submitted 
ON public.exam_results (user_id, submitted_at DESC);

-- Index for exam_assignments - frequently queried for student access
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_user 
ON public.exam_assignments (exam_id, user_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_user 
ON public.exam_assignments (user_id);

-- Index for exams - filtered by created_by and is_published
CREATE INDEX IF NOT EXISTS idx_exams_created_by_published 
ON public.exams (created_by, is_published);

-- Index for taxonomy_nodes - frequently filtered by subject
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_subject_parent 
ON public.taxonomy_nodes (subject_id, parent_id) WHERE deleted_at IS NULL;

-- Index for practice_sessions - filtered by user and subject
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_subject 
ON public.practice_sessions (user_id, subject_id);

-- Index for skill_masteries - filtered by user
CREATE INDEX IF NOT EXISTS idx_skill_masteries_user 
ON public.skill_masteries (user_id);

-- Index for contest_participants
CREATE INDEX IF NOT EXISTS idx_contest_participants_user 
ON public.contest_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_contest_participants_contest 
ON public.contest_participants (contest_id);