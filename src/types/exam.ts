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
  weight?: number; // Weight for scoring (default 1)
}

export interface CodingQuestion {
  languages: ProgrammingLanguage[];
  defaultLanguage: ProgrammingLanguage;
  starterCode: Record<ProgrammingLanguage, string>;
  testCases: TestCase[];
  timeLimit?: number; // in seconds
  memoryLimit?: number; // in MB
  scoringMethod?: 'proportional' | 'all-or-nothing' | 'weighted'; // Default: proportional
}

export interface Question {
  id: number;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  points: number;
  coding?: CodingQuestion;
  correctAnswer?: string | string[]; // For grading
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
  expectedOutput?: string;
  input?: string;
  error?: string;
  executionTime?: number;
  isHidden: boolean;
  weight?: number;
}

// Detailed coding grading result
export interface CodingGradingResult {
  passedTests: number;
  totalTests: number;
  visibleTests: {
    passed: number;
    total: number;
  };
  hiddenTests: {
    passed: number;
    total: number;
  };
  earnedPoints: number;
  maxPoints: number;
  testResults: TestResult[];
  scoringMethod: 'proportional' | 'all-or-nothing' | 'weighted';
}

// Exam Result types
export interface QuestionResult {
  questionId: number;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  userAnswer: string | string[];
  correctAnswer?: string | string[];
  codingResults?: CodingGradingResult;
}

export interface ExamResult {
  examId: string;
  examTitle: string;
  subject: string;
  submittedAt: Date;
  duration: number; // time taken in minutes
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  grade: string;
  questionResults: QuestionResult[];
  statistics: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    partialCredit: number; // New: for partial credit questions
    byType: Record<QuestionType, { correct: number; total: number; points: number; partial?: number }>;
  };
}
