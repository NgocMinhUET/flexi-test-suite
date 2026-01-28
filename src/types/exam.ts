// Core question types
export type QuestionType = 
  | 'multiple-choice' 
  | 'short-answer' 
  | 'essay' 
  | 'drag-drop' 
  | 'coding'
  // Language exam question types
  | 'listening-mcq'      // Nghe và chọn đáp án
  | 'listening-fill'     // Nghe và điền từ
  | 'reading-mcq'        // Đọc hiểu trắc nghiệm
  | 'reading-order'      // Sắp xếp câu/đoạn
  | 'reading-match'      // Ghép cặp (matching)
  | 'writing-sentence'   // Sắp xếp từ thành câu
  | 'writing-essay'      // Viết đoạn văn/bài luận
  | 'speaking-read'      // Đọc to (ghi âm)
  | 'speaking-describe'  // Mô tả hình ảnh (ghi âm)
  | 'speaking-answer';   // Trả lời câu hỏi (ghi âm)

export type ProgrammingLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'c' | 'go' | 'rust';

// Section for sectioned exams
export interface ExamSection {
  id: string;
  name: string;           // Name set by exam creator, e.g., "Phần 1: Trắc nghiệm"
  description?: string;   // Optional description
  duration: number;       // Duration in minutes for this section
  questionIds: number[];  // IDs of questions in this section
}

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

// Language exam specific question data
export interface ListeningQuestion {
  audioUrl: string;           // URL file audio
  audioTranscript?: string;   // Transcript (ẩn khi thi)
  playCount: number;          // Số lần được nghe (1-3)
  audioDuration: number;      // Độ dài audio (giây)
}

export interface SpeakingQuestion {
  promptAudioUrl?: string;    // Audio hướng dẫn (nếu có)
  imageUrl?: string;          // Hình ảnh để mô tả
  recordingTimeLimit: number; // Giới hạn thời gian ghi âm (giây)
  preparationTime: number;    // Thời gian chuẩn bị (giây)
}

export interface MatchingItem {
  id: string;
  text: string;
}

export interface MatchingQuestion {
  leftItems: MatchingItem[];   // Cột trái
  rightItems: MatchingItem[];  // Cột phải
  correctPairs: { left: string; right: string }[];
}

export interface OrderingItem {
  id: string;
  text: string;
}

export interface OrderingQuestion {
  items: OrderingItem[];       // Các phần tử cần sắp xếp
  correctOrder: string[];      // Thứ tự đúng (mảng ID)
}

export interface Question {
  id: number;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  points: number;
  coding?: CodingQuestion;
  correctAnswer?: string | string[]; // For grading
  // Language exam specific fields
  listening?: ListeningQuestion;
  speaking?: SpeakingQuestion;
  matching?: MatchingQuestion;
  ordering?: OrderingQuestion;
}

export interface ExamData {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes (total or fallback)
  totalQuestions: number;
  questions: Question[];
  isSectioned?: boolean;      // Whether exam is divided into sections
  sections?: ExamSection[];   // Section definitions (only if isSectioned)
}

export interface Answer {
  questionId: number; // Keep as number to match Question.id
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

export interface ViolationDetail {
  type: 'tab-switch' | 'fullscreen-exit';
  timestamp: number;
  duration?: number; // milliseconds away (if applicable)
}

export interface ViolationStats {
  tabSwitchCount: number;
  fullscreenExitCount: number;
  details?: ViolationDetail[];
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
  violationStats?: ViolationStats;
  statistics: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    partialCredit: number; // New: for partial credit questions
    byType: Record<QuestionType, { correct: number; total: number; points: number; partial?: number }>;
  };
}
