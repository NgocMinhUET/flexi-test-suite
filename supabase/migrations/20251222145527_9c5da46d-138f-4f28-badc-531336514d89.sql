-- Performance indexes for exams table
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_mode ON public.exams(mode);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON public.exams(is_published);
CREATE INDEX IF NOT EXISTS idx_exams_source_contest_id ON public.exams(source_contest_id);

-- Performance indexes for questions table
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_taxonomy_node_id ON public.questions(taxonomy_node_id);
CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON public.questions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_questions_cognitive_level ON public.questions(cognitive_level);

-- Performance indexes for exam_results table
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON public.exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_submitted_at ON public.exam_results(submitted_at);

-- Performance indexes for contest_participants table
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON public.contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON public.contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_assigned_exam_id ON public.contest_participants(assigned_exam_id);

-- Performance indexes for contests table
CREATE INDEX IF NOT EXISTS idx_contests_created_by ON public.contests(created_by);
CREATE INDEX IF NOT EXISTS idx_contests_status ON public.contests(status);

-- Performance indexes for exam_assignments table
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_id ON public.exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_user_id ON public.exam_assignments(user_id);

-- Performance indexes for taxonomy_nodes table
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_subject_id ON public.taxonomy_nodes(subject_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_parent_id ON public.taxonomy_nodes(parent_id);

-- Performance indexes for practice_sessions table
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_subject_id ON public.practice_sessions(subject_id);

-- Performance indexes for student_skill_profiles table
CREATE INDEX IF NOT EXISTS idx_student_skill_profiles_user_id ON public.student_skill_profiles(user_id);