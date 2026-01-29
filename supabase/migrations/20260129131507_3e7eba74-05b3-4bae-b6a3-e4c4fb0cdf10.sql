-- 1. Thêm cognitive_level vào câu hỏi
ALTER TABLE lang_questions 
ADD COLUMN cognitive_level text;

-- 2. Thêm cognitive_levels và matrix_config vào môn học
ALTER TABLE lang_subjects 
ADD COLUMN cognitive_levels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN matrix_config jsonb;