-- Mở rộng ENUM question_type với các loại câu hỏi ngoại ngữ mới
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'LISTENING_MCQ';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'LISTENING_FILL';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'READING_MCQ';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'READING_ORDER';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'READING_MATCH';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'WRITING_SENTENCE';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'WRITING_ESSAY';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'SPEAKING_READ';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'SPEAKING_DESCRIBE';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'SPEAKING_ANSWER';

-- Bảng lưu metadata audio/media cho câu hỏi ngoại ngữ
CREATE TABLE public.language_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio_prompt', 'audio_answer', 'image')),
  storage_path TEXT NOT NULL,
  duration INTEGER, -- duration in seconds (for audio)
  transcript TEXT,  -- transcript for audio (hidden during exam)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.language_media ENABLE ROW LEVEL SECURITY;

-- Policies for language_media
CREATE POLICY "Teachers and admins can manage language media"
ON public.language_media
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.id = language_media.question_id
    AND (q.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Students can view published question media"
ON public.language_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.id = language_media.question_id
    AND q.status = 'published'
  )
);

-- Bảng lưu câu trả lời ghi âm của thí sinh
CREATE TABLE public.speaking_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_result_id UUID REFERENCES public.exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recording_url TEXT NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  transcript TEXT, -- AI transcription
  ai_score NUMERIC(5,2),
  ai_feedback TEXT,
  manual_score NUMERIC(5,2),
  manual_feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.speaking_responses ENABLE ROW LEVEL SECURITY;

-- Policies for speaking_responses
CREATE POLICY "Users can view own speaking responses"
ON public.speaking_responses
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own speaking responses"
ON public.speaking_responses
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view speaking responses for their exams"
ON public.speaking_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_results er
    JOIN public.exams e ON er.exam_id = e.id
    WHERE er.id = speaking_responses.exam_result_id
    AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Teachers can update speaking responses for grading"
ON public.speaking_responses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exam_results er
    JOIN public.exams e ON er.exam_id = e.id
    WHERE er.id = speaking_responses.exam_result_id
    AND e.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all speaking responses"
ON public.speaking_responses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger update updated_at for language_media
CREATE TRIGGER update_language_media_updated_at
BEFORE UPDATE ON public.language_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets for language audio and student recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('language-audio', 'language-audio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-recordings', 'student-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for language-audio bucket (public read, authenticated upload)
CREATE POLICY "Anyone can view language audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'language-audio');

CREATE POLICY "Teachers can upload language audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'language-audio' 
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers can update their language audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'language-audio' 
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers can delete their language audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'language-audio' 
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Storage policies for student-recordings bucket (private)
CREATE POLICY "Students can view own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can view student recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-recordings' 
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);