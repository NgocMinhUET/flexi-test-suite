// Types for Question Bank module

export type QuestionStatus = 'draft' | 'review' | 'approved' | 'published';
export type QuestionType = 'MCQ_SINGLE' | 'TRUE_FALSE_4' | 'SHORT_ANSWER' | 'CODING';
export type ProgrammingLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'c' | 'go' | 'rust';

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  taxonomy_config: {
    levels: string[];
  };
  cognitive_levels: string[];
  question_types: QuestionType[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface TaxonomyNode {
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
  children?: TaxonomyNode[];
}

export interface MCQOption {
  id: string;
  content: string;
  isCorrect: boolean;
}

export interface TrueFalseStatement {
  id: string;
  content: string;
  isTrue: boolean;
}

export interface MCQAnswerData {
  options: MCQOption[];
  explanation?: string;
}

export interface TrueFalseAnswerData {
  statements: TrueFalseStatement[];
  explanation?: string;
}

export interface ShortAnswerData {
  correctAnswers: string[];
  caseSensitive: boolean;
  explanation?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description?: string;
  weight?: number;
}

export interface CodingAnswerData {
  languages: ProgrammingLanguage[];
  defaultLanguage: ProgrammingLanguage;
  starterCode: Record<ProgrammingLanguage, string>;
  testCases: TestCase[];
  timeLimit?: number;
  memoryLimit?: number;
  scoringMethod?: 'proportional' | 'all-or-nothing' | 'weighted';
  explanation?: string;
}

export type AnswerData = MCQAnswerData | TrueFalseAnswerData | ShortAnswerData | CodingAnswerData;

export interface Question {
  id: string;
  subject_id: string;
  code?: string | null;
  content: string;
  content_plain?: string | null;
  taxonomy_node_id?: string | null;
  taxonomy_path: string[];
  cognitive_level?: string | null;
  question_type: QuestionType;
  answer_data: AnswerData;
  labels: string[];
  difficulty: number;
  estimated_time: number;
  allow_shuffle: boolean;
  media: MediaItem[];
  group_id?: string | null;
  group_order?: number | null;
  is_group_lead: boolean;
  status: QuestionStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MediaItem {
  type: 'image';
  url: string;
  position: 'inline' | 'before' | 'after';
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: string;
}

// Form types
export interface SubjectFormData {
  code: string;
  name: string;
  description?: string;
  taxonomy_config: {
    levels: string[];
  };
  cognitive_levels: string[];
  question_types: QuestionType[];
}

export interface TaxonomyNodeFormData {
  code: string;
  name: string;
  parent_id?: string | null;
}

export interface QuestionFormData {
  subject_id: string;
  code?: string;
  content: string;
  taxonomy_node_id?: string;
  cognitive_level?: string;
  question_type: QuestionType;
  answer_data: AnswerData;
  labels?: string[];
  difficulty?: number;
  estimated_time?: number;
  allow_shuffle?: boolean;
  group_id?: string;
  group_order?: number;
  is_group_lead?: boolean;
}

// Filter types
export interface QuestionFilters {
  subject_id: string;
  taxonomy_node_id?: string;
  cognitive_level?: string;
  question_type?: QuestionType;
  status?: QuestionStatus;
  search?: string;
}
