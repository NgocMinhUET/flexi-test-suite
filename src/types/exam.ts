export type QuestionType = 'multiple-choice' | 'short-answer' | 'essay' | 'drag-drop' | 'coding';

export type ProgrammingLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'c' | 'go' | 'rust';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description?: string;
}

export interface CodingQuestion {
  languages: ProgrammingLanguage[];
  defaultLanguage: ProgrammingLanguage;
  starterCode: Record<ProgrammingLanguage, string>;
  testCases: TestCase[];
  timeLimit?: number; // in seconds
  memoryLimit?: number; // in MB
}

export interface Question {
  id: number;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  points: number;
  coding?: CodingQuestion;
}

export interface ExamData {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  totalQuestions: number;
  questions: Question[];
}

export interface Answer {
  questionId: number;
  answer: string | string[];
  language?: ProgrammingLanguage;
}

export type QuestionStatus = 'unanswered' | 'answered' | 'flagged';

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  error?: string;
  executionTime?: number;
}
