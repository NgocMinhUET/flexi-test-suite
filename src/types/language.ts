// =============================================
// LANGUAGE MODULE - INDEPENDENT TYPES
// =============================================

// Enums
export type LangQuestionType = 
  | 'LISTENING_MCQ'      // Nghe và chọn đáp án
  | 'LISTENING_FILL'     // Nghe và điền từ
  | 'READING_MCQ'        // Đọc hiểu trắc nghiệm
  | 'READING_ORDER'      // Sắp xếp câu/đoạn
  | 'READING_MATCH'      // Ghép cặp (matching)
  | 'WRITING_SENTENCE'   // Sắp xếp từ thành câu
  | 'WRITING_ESSAY'      // Viết đoạn văn/bài luận
  | 'SPEAKING_READ'      // Đọc to (ghi âm)
  | 'SPEAKING_DESCRIBE'  // Mô tả hình ảnh (ghi âm)
  | 'SPEAKING_ANSWER';   // Trả lời câu hỏi (ghi âm)

export type LangQuestionStatus = 'draft' | 'review' | 'approved' | 'published';
export type LangExamStatus = 'draft' | 'published' | 'archived';
export type SkillType = 'listening' | 'reading' | 'writing' | 'speaking';
export type ProficiencyLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper-intermediate' | 'advanced';

// =============================================
// SUBJECT & TAXONOMY
// =============================================

export interface LangMatrixConfig {
  dimensions: string[];
  sections?: {
    name: string;
    skills: SkillType[];
    duration: number;
  }[];
}

export interface LangSubject {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  icon?: string;
  skill_types: SkillType[];
  proficiency_levels: ProficiencyLevel[];
  cognitive_levels: string[];
  matrix_config?: LangMatrixConfig | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LangTaxonomyNode {
  id: string;
  subject_id: string;
  parent_id?: string | null;
  level: number;
  code: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  children?: LangTaxonomyNode[];
}

// =============================================
// ANSWER DATA STRUCTURES
// =============================================

export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQAnswerData {
  options: MCQOption[];
  explanation?: string;
}

export interface FillBlank {
  id: string;
  correctAnswers: string[];
  caseSensitive?: boolean;
}

export interface FillAnswerData {
  blanks: FillBlank[];
  explanation?: string;
}

export interface MatchItem {
  id: string;
  text: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface MatchAnswerData {
  leftItems: MatchItem[];
  rightItems: MatchItem[];
  correctPairs: MatchPair[];
  explanation?: string;
}

export interface OrderItem {
  id: string;
  text: string;
}

export interface OrderAnswerData {
  items: OrderItem[];
  correctOrder: string[];
  explanation?: string;
}

export interface SentenceAnswerData {
  words: string[];
  correctSentence: string;
  acceptableVariants?: string[];
  explanation?: string;
}

export interface EssayAnswerData {
  rubric?: string;
  sampleAnswer?: string;
  minWords?: number;
  maxWords?: number;
}

export interface SpeakingAnswerData {
  preparationTime: number; // seconds
  recordingTimeLimit: number; // seconds
  rubric?: string;
  sampleAnswer?: string;
}

export type LangAnswerData = 
  | MCQAnswerData 
  | FillAnswerData 
  | MatchAnswerData 
  | OrderAnswerData 
  | SentenceAnswerData 
  | EssayAnswerData 
  | SpeakingAnswerData;

// =============================================
// QUESTION
// =============================================

export interface LangQuestion {
  id: string;
  subject_id: string;
  taxonomy_node_id?: string | null;
  
  // Metadata
  code?: string | null;
  question_type: LangQuestionType;
  skill_type: SkillType;
  proficiency_level: ProficiencyLevel;
  cognitive_level?: string | null;
  difficulty: number;
  estimated_time: number;
  points: number;
  
  // Content
  content: string;
  content_plain?: string | null;
  
  // Media
  audio_url?: string | null;
  audio_duration?: number | null;
  audio_transcript?: string | null;
  audio_play_count: number;
  image_url?: string | null;
  
  // Answer
  answer_data: LangAnswerData;
  
  // Status
  status: LangQuestionStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  
  // Meta
  labels: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// =============================================
// EXAM
// =============================================

export interface LangExamSection {
  id: string;
  name: string;
  skill_type: SkillType;
  duration: number; // minutes
  question_ids: string[];
}

export interface LangExamQuestion {
  id: string;
  order: number;
  points: number;
}

export interface LangExam {
  id: string;
  subject_id: string;
  
  title: string;
  description?: string | null;
  proficiency_level: ProficiencyLevel;
  
  total_duration: number; // minutes
  is_sectioned: boolean;
  sections: LangExamSection[];
  questions: LangExamQuestion[];
  
  total_questions: number;
  total_points: number;
  
  status: LangExamStatus;
  is_published: boolean;
  
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// =============================================
// EXAM ASSIGNMENT & RESULTS
// =============================================

export interface LangExamAssignment {
  id: string;
  exam_id: string;
  user_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface LangQuestionResult {
  questionId: string;
  userAnswer: string | string[] | Record<string, string>;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  feedback?: string;
  aiScore?: number;
  manualScore?: number;
}

export interface SkillScore {
  earned: number;
  total: number;
  percentage: number;
}

export interface LangExamResult {
  id: string;
  exam_id: string;
  user_id: string;
  
  total_points: number;
  earned_points: number;
  percentage: number;
  grade?: string | null;
  
  started_at?: string | null;
  submitted_at: string;
  duration?: number | null;
  
  question_results: LangQuestionResult[];
  skill_scores: Record<SkillType, SkillScore>;
  speaking_recordings: string[];
  
  created_at: string;
}

export interface LangExamDraft {
  id: string;
  exam_id: string;
  user_id: string;
  
  answers: Record<string, string | string[] | Record<string, string>>;
  current_section: number;
  current_question: number;
  time_left?: number | null;
  section_times?: Record<string, number> | null;
  
  saved_at: string;
}

// =============================================
// FORM DATA
// =============================================

export interface LangSubjectFormData {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  skill_types: SkillType[];
  proficiency_levels: ProficiencyLevel[];
  cognitive_levels?: string[];
  matrix_config?: LangMatrixConfig;
}

export interface LangQuestionFormData {
  subject_id: string;
  taxonomy_node_id?: string;
  code?: string;
  question_type: LangQuestionType;
  skill_type: SkillType;
  proficiency_level: ProficiencyLevel;
  cognitive_level?: string;
  difficulty: number;
  estimated_time: number;
  points: number;
  content: string;
  audio_url?: string;
  audio_duration?: number;
  audio_transcript?: string;
  audio_play_count?: number;
  image_url?: string;
  answer_data: LangAnswerData;
  labels?: string[];
}

// =============================================
// DISPLAY HELPERS
// =============================================

export const LANG_QUESTION_TYPE_LABELS: Record<LangQuestionType, string> = {
  LISTENING_MCQ: 'Nghe - Trắc nghiệm',
  LISTENING_FILL: 'Nghe - Điền từ',
  READING_MCQ: 'Đọc - Trắc nghiệm',
  READING_ORDER: 'Đọc - Sắp xếp',
  READING_MATCH: 'Đọc - Ghép cặp',
  WRITING_SENTENCE: 'Viết - Sắp xếp câu',
  WRITING_ESSAY: 'Viết - Luận',
  SPEAKING_READ: 'Nói - Đọc to',
  SPEAKING_DESCRIBE: 'Nói - Mô tả',
  SPEAKING_ANSWER: 'Nói - Trả lời',
};

export const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  writing: 'Viết',
  speaking: 'Nói',
};

export const PROFICIENCY_LEVEL_LABELS: Record<ProficiencyLevel, string> = {
  beginner: 'Sơ cấp',
  elementary: 'Cơ bản',
  intermediate: 'Trung cấp',
  'upper-intermediate': 'Trung cao',
  advanced: 'Cao cấp',
};

export const SKILL_TYPE_ICONS: Record<SkillType, string> = {
  listening: 'Headphones',
  reading: 'BookOpen',
  writing: 'PenTool',
  speaking: 'Mic',
};

// Map question type to skill type
export const QUESTION_TYPE_TO_SKILL: Record<LangQuestionType, SkillType> = {
  LISTENING_MCQ: 'listening',
  LISTENING_FILL: 'listening',
  READING_MCQ: 'reading',
  READING_ORDER: 'reading',
  READING_MATCH: 'reading',
  WRITING_SENTENCE: 'writing',
  WRITING_ESSAY: 'writing',
  SPEAKING_READ: 'speaking',
  SPEAKING_DESCRIBE: 'speaking',
  SPEAKING_ANSWER: 'speaking',
};
