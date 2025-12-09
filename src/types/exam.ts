export type QuestionType = 'multiple-choice' | 'short-answer' | 'essay' | 'drag-drop' | 'coding';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: number;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  points: number;
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
}

export type QuestionStatus = 'unanswered' | 'answered' | 'flagged';
