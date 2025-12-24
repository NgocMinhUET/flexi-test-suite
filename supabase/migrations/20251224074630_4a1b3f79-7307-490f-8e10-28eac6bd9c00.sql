-- Performance optimization: Add missing indexes for frequently queried columns
-- Based on analysis showing exam_results has 6,518 seq scans vs 90 idx scans

-- Indexes for exam_results table (most critical - 1.36% index usage currently)
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_submitted_at ON exam_results(submitted_at DESC);

-- Indexes for questions table (700+ rows, frequently filtered)
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON questions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_questions_taxonomy_node_id ON questions(taxonomy_node_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_questions_subject_status ON questions(subject_id, status) WHERE deleted_at IS NULL;

-- Indexes for exams table
CREATE INDEX IF NOT EXISTS idx_exams_source_type ON exams(source_type);
CREATE INDEX IF NOT EXISTS idx_exams_mode ON exams(mode);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON exams(is_published);

-- Indexes for exam_assignments table (frequently joined)
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_id ON exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_user_id ON exam_assignments(user_id);

-- Indexes for contest tables
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contests_created_by ON contests(created_by);
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);

-- Indexes for practice tables
CREATE INDEX IF NOT EXISTS idx_practice_attempts_exam_id ON practice_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_id ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_configs_exam_id ON practice_configs(exam_id);

-- Indexes for user-related tables
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Indexes for grading jobs
CREATE INDEX IF NOT EXISTS idx_grading_jobs_user_id ON grading_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_grading_jobs_exam_id ON grading_jobs(exam_id);
CREATE INDEX IF NOT EXISTS idx_grading_jobs_status ON grading_jobs(status);

-- Run ANALYZE to update statistics for query planner
ANALYZE exam_results;
ANALYZE questions;
ANALYZE exams;
ANALYZE exam_assignments;
ANALYZE contest_participants;
ANALYZE contests;
ANALYZE practice_attempts;
ANALYZE practice_configs;