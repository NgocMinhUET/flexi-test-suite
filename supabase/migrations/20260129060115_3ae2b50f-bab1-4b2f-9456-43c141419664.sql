-- =============================================
-- LANGUAGE MODULE - INDEPENDENT DATABASE SCHEMA
-- =============================================

-- Create enum for language question types
CREATE TYPE public.lang_question_type AS ENUM (
  'LISTENING_MCQ',      -- Nghe và chọn đáp án
  'LISTENING_FILL',     -- Nghe và điền từ
  'READING_MCQ',        -- Đọc hiểu trắc nghiệm
  'READING_ORDER',      -- Sắp xếp câu/đoạn
  'READING_MATCH',      -- Ghép cặp (matching)
  'WRITING_SENTENCE',   -- Sắp xếp từ thành câu
  'WRITING_ESSAY',      -- Viết đoạn văn/bài luận
  'SPEAKING_READ',      -- Đọc to (ghi âm)
  'SPEAKING_DESCRIBE',  -- Mô tả hình ảnh (ghi âm)
  'SPEAKING_ANSWER'     -- Trả lời câu hỏi (ghi âm)
);

-- Create enum for language question status
CREATE TYPE public.lang_question_status AS ENUM (
  'draft',
  'review', 
  'approved',
  'published'
);

-- Create enum for language exam status
CREATE TYPE public.lang_exam_status AS ENUM (
  'draft',
  'published',
  'archived'
);

-- =============================================
-- LANGUAGE SUBJECTS (Independent)
-- =============================================
CREATE TABLE public.lang_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Languages',
  -- Language-specific config
  skill_types JSONB DEFAULT '["listening", "reading", "writing", "speaking"]'::JSONB,
  proficiency_levels JSONB DEFAULT '["beginner", "elementary", "intermediate", "upper-intermediate", "advanced"]'::JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- LANGUAGE TAXONOMY (Topic/Lesson structure)
-- =============================================
CREATE TABLE public.lang_taxonomy_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.lang_subjects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.lang_taxonomy_nodes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(subject_id, code)
);

-- =============================================
-- LANGUAGE QUESTIONS
-- =============================================
CREATE TABLE public.lang_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.lang_subjects(id) ON DELETE CASCADE,
  taxonomy_node_id UUID REFERENCES public.lang_taxonomy_nodes(id),
  
  -- Question metadata
  code TEXT,
  question_type public.lang_question_type NOT NULL,
  skill_type TEXT NOT NULL, -- listening, reading, writing, speaking
  proficiency_level TEXT DEFAULT 'intermediate',
  difficulty NUMERIC(3,2) DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
  estimated_time INTEGER DEFAULT 60, -- seconds
  points NUMERIC(5,2) DEFAULT 1,
  
  -- Question content
  content TEXT NOT NULL, -- Main question text/instruction
  content_plain TEXT, -- Plain text for search
  
  -- Media for listening/speaking
  audio_url TEXT,
  audio_duration INTEGER, -- seconds
  audio_transcript TEXT,
  audio_play_count INTEGER DEFAULT 2, -- How many times can play
  
  -- Image for description questions
  image_url TEXT,
  
  -- Answer data (JSONB structure varies by type)
  answer_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  /*
    MCQ: { options: [{id, text, isCorrect}], explanation }
    FILL: { blanks: [{id, correctAnswers: string[], caseSensitive}] }
    MATCH: { leftItems: [{id, text}], rightItems: [{id, text}], correctPairs: [{left, right}] }
    ORDER: { items: [{id, text}], correctOrder: string[] }
    SENTENCE: { words: string[], correctSentence: string, acceptableVariants: string[] }
    ESSAY: { rubric: string, sampleAnswer: string, minWords: number, maxWords: number }
    SPEAKING: { preparationTime: number, recordingTimeLimit: number, rubric: string }
  */
  
  -- Status and workflow
  status public.lang_question_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  labels JSONB DEFAULT '[]'::JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- LANGUAGE EXAMS
-- =============================================
CREATE TABLE public.lang_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.lang_subjects(id) ON DELETE CASCADE,
  
  -- Exam metadata
  title TEXT NOT NULL,
  description TEXT,
  proficiency_level TEXT DEFAULT 'intermediate',
  
  -- Time configuration
  total_duration INTEGER NOT NULL DEFAULT 60, -- minutes
  is_sectioned BOOLEAN DEFAULT false,
  
  -- Sections config (if sectioned)
  sections JSONB DEFAULT '[]'::JSONB,
  /*
    [{
      id: string,
      name: string,
      skill_type: 'listening' | 'reading' | 'writing' | 'speaking',
      duration: number, // minutes
      question_ids: string[]
    }]
  */
  
  -- Questions (flat list if not sectioned)
  questions JSONB NOT NULL DEFAULT '[]'::JSONB,
  /*
    [{
      id: string, -- question ID from lang_questions
      order: number,
      points: number
    }]
  */
  
  total_questions INTEGER DEFAULT 0,
  total_points NUMERIC(6,2) DEFAULT 0,
  
  -- Status
  status public.lang_exam_status NOT NULL DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- LANGUAGE EXAM ASSIGNMENTS
-- =============================================
CREATE TABLE public.lang_exam_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.lang_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  UNIQUE(exam_id, user_id)
);

-- =============================================
-- LANGUAGE EXAM RESULTS
-- =============================================
CREATE TABLE public.lang_exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.lang_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Scoring
  total_points NUMERIC(6,2) DEFAULT 0,
  earned_points NUMERIC(6,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  grade TEXT,
  
  -- Time tracking
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration INTEGER, -- actual time in minutes
  
  -- Detailed results
  question_results JSONB DEFAULT '[]'::JSONB,
  /*
    [{
      questionId: string,
      userAnswer: any,
      isCorrect: boolean,
      earnedPoints: number,
      maxPoints: number,
      feedback?: string, -- for essay/speaking
      aiScore?: number,
      manualScore?: number
    }]
  */
  
  -- By skill breakdown
  skill_scores JSONB DEFAULT '{}'::JSONB,
  /*
    {
      listening: { earned: number, total: number, percentage: number },
      reading: { earned: number, total: number, percentage: number },
      writing: { earned: number, total: number, percentage: number },
      speaking: { earned: number, total: number, percentage: number }
    }
  */
  
  -- Speaking recordings (references)
  speaking_recordings JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- LANGUAGE EXAM DRAFTS (Auto-save)
-- =============================================
CREATE TABLE public.lang_exam_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.lang_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  answers JSONB DEFAULT '{}'::JSONB,
  current_section INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  time_left INTEGER, -- seconds
  section_times JSONB, -- track time per section
  
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(exam_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_lang_questions_subject ON public.lang_questions(subject_id);
CREATE INDEX idx_lang_questions_type ON public.lang_questions(question_type);
CREATE INDEX idx_lang_questions_skill ON public.lang_questions(skill_type);
CREATE INDEX idx_lang_questions_status ON public.lang_questions(status);
CREATE INDEX idx_lang_questions_taxonomy ON public.lang_questions(taxonomy_node_id);

CREATE INDEX idx_lang_exams_subject ON public.lang_exams(subject_id);
CREATE INDEX idx_lang_exams_status ON public.lang_exams(status);

CREATE INDEX idx_lang_exam_results_exam ON public.lang_exam_results(exam_id);
CREATE INDEX idx_lang_exam_results_user ON public.lang_exam_results(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.lang_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lang_taxonomy_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lang_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lang_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lang_exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lang_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lang_exam_drafts ENABLE ROW LEVEL SECURITY;

-- Lang Subjects policies
CREATE POLICY "Anyone can view lang subjects"
  ON public.lang_subjects FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admin/Teacher can manage lang subjects"
  ON public.lang_subjects FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'teacher')
  );

-- Lang Taxonomy policies
CREATE POLICY "Anyone can view lang taxonomy"
  ON public.lang_taxonomy_nodes FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admin/Teacher can manage lang taxonomy"
  ON public.lang_taxonomy_nodes FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'teacher')
  );

-- Lang Questions policies
CREATE POLICY "Teachers see own questions, admin sees all"
  ON public.lang_questions FOR SELECT
  USING (
    deleted_at IS NULL AND (
      has_role(auth.uid(), 'admin') OR
      created_by = auth.uid() OR
      status = 'published'
    )
  );

CREATE POLICY "Teachers can create questions"
  ON public.lang_questions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers can update own questions"
  ON public.lang_questions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    created_by = auth.uid()
  );

CREATE POLICY "Teachers can delete own questions"
  ON public.lang_questions FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    created_by = auth.uid()
  );

-- Lang Exams policies
CREATE POLICY "View published exams or own exams"
  ON public.lang_exams FOR SELECT
  USING (
    deleted_at IS NULL AND (
      has_role(auth.uid(), 'admin') OR
      created_by = auth.uid() OR
      is_published = true
    )
  );

CREATE POLICY "Teachers can create exams"
  ON public.lang_exams FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers can update own exams"
  ON public.lang_exams FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    created_by = auth.uid()
  );

CREATE POLICY "Teachers can delete own exams"
  ON public.lang_exams FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR
    created_by = auth.uid()
  );

-- Lang Exam Assignments policies
CREATE POLICY "Users see own assignments"
  ON public.lang_exam_assignments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'teacher') OR
    user_id = auth.uid()
  );

CREATE POLICY "Teachers can assign exams"
  ON public.lang_exam_assignments FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers can manage assignments"
  ON public.lang_exam_assignments FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'teacher')
  );

-- Lang Exam Results policies
CREATE POLICY "Users see own results, teachers see all"
  ON public.lang_exam_results FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'teacher') OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can insert own results"
  ON public.lang_exam_results FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can update results for grading"
  ON public.lang_exam_results FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'teacher')
  );

-- Lang Exam Drafts policies
CREATE POLICY "Users manage own drafts"
  ON public.lang_exam_drafts FOR ALL
  USING (user_id = auth.uid());

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_lang_subjects_updated_at
  BEFORE UPDATE ON public.lang_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lang_taxonomy_updated_at
  BEFORE UPDATE ON public.lang_taxonomy_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lang_questions_updated_at
  BEFORE UPDATE ON public.lang_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lang_exams_updated_at
  BEFORE UPDATE ON public.lang_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();