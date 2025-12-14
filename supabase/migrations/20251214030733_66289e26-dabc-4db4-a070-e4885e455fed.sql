-- =============================================
-- SPRINT 1: CORE FOUNDATION + QUESTION BANK
-- =============================================

-- 1. Create question_status enum
CREATE TYPE question_status AS ENUM ('draft', 'review', 'approved', 'published');

-- 2. Create question_type enum
CREATE TYPE question_type AS ENUM ('MCQ_SINGLE', 'TRUE_FALSE_4', 'SHORT_ANSWER');

-- 3. Create subjects table (Môn học)
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  taxonomy_config JSONB DEFAULT '{"levels": ["Chương", "Bài", "Mục"]}',
  cognitive_levels JSONB DEFAULT '["Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao"]',
  question_types JSONB DEFAULT '["MCQ_SINGLE", "TRUE_FALSE_4", "SHORT_ANSWER"]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- 4. Create taxonomy_nodes table (Cây phân loại nội dung)
CREATE TABLE public.taxonomy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- 5. Create questions table (Ngân hàng câu hỏi)
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  code TEXT,
  
  -- Content
  content TEXT NOT NULL,
  content_plain TEXT,
  
  -- Classification
  taxonomy_node_id UUID REFERENCES public.taxonomy_nodes(id),
  taxonomy_path JSONB DEFAULT '[]',
  cognitive_level TEXT,
  
  -- Question type & answers
  question_type question_type NOT NULL DEFAULT 'MCQ_SINGLE',
  answer_data JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  labels JSONB DEFAULT '[]',
  difficulty NUMERIC(3,2) DEFAULT 0.5,
  estimated_time INTEGER DEFAULT 60,
  allow_shuffle BOOLEAN DEFAULT true,
  
  -- Media
  media JSONB DEFAULT '[]',
  
  -- Question groups
  group_id UUID,
  group_order INTEGER,
  is_group_lead BOOLEAN DEFAULT false,
  
  -- Workflow
  status question_status DEFAULT 'draft' NOT NULL,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- 6. Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Create indexes for performance
CREATE INDEX idx_taxonomy_nodes_subject ON public.taxonomy_nodes(subject_id);
CREATE INDEX idx_taxonomy_nodes_parent ON public.taxonomy_nodes(parent_id);
CREATE INDEX idx_questions_subject ON public.questions(subject_id);
CREATE INDEX idx_questions_taxonomy ON public.questions(taxonomy_node_id);
CREATE INDEX idx_questions_status ON public.questions(status);
CREATE INDEX idx_questions_created_by ON public.questions(created_by);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

-- 8. Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for subjects
CREATE POLICY "Anyone authenticated can view subjects"
ON public.subjects FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admins can insert subjects"
ON public.subjects FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subjects"
ON public.subjects FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subjects"
ON public.subjects FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 10. RLS Policies for taxonomy_nodes
CREATE POLICY "Anyone authenticated can view taxonomy_nodes"
ON public.taxonomy_nodes FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admins can insert taxonomy_nodes"
ON public.taxonomy_nodes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update taxonomy_nodes"
ON public.taxonomy_nodes FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete taxonomy_nodes"
ON public.taxonomy_nodes FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 11. RLS Policies for questions
CREATE POLICY "Admins can view all questions"
ON public.questions FOR SELECT
USING (has_role(auth.uid(), 'admin') AND deleted_at IS NULL);

CREATE POLICY "Teachers can view own questions"
ON public.questions FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Admins can insert questions"
ON public.questions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can insert own questions"
ON public.questions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Admins can update all questions"
ON public.questions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update own draft/rejected questions"
ON public.questions FOR UPDATE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid() AND status IN ('draft', 'review'));

CREATE POLICY "Admins can delete questions"
ON public.questions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete own draft questions"
ON public.questions FOR DELETE
USING (has_role(auth.uid(), 'teacher') AND created_by = auth.uid() AND status = 'draft');

-- 12. RLS Policies for audit_logs (read-only for admins)
CREATE POLICY "Admins can view audit_logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 13. Trigger for updated_at on new tables
CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_taxonomy_nodes_updated_at
BEFORE UPDATE ON public.taxonomy_nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();