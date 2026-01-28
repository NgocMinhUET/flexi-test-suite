import { QuestionType } from '@/types/exam';

export interface QuestionTypeStat {
  correct: number;
  total: number;
  points: number;
  partial: number;
}

export type QuestionTypeStats = Record<QuestionType, QuestionTypeStat>;

/**
 * Creates a default statistics object for all question types
 */
export function createDefaultByTypeStats(): QuestionTypeStats {
  return {
    'multiple-choice': { correct: 0, total: 0, points: 0, partial: 0 },
    'short-answer': { correct: 0, total: 0, points: 0, partial: 0 },
    'essay': { correct: 0, total: 0, points: 0, partial: 0 },
    'drag-drop': { correct: 0, total: 0, points: 0, partial: 0 },
    'coding': { correct: 0, total: 0, points: 0, partial: 0 },
    // Language exam types
    'listening-mcq': { correct: 0, total: 0, points: 0, partial: 0 },
    'listening-fill': { correct: 0, total: 0, points: 0, partial: 0 },
    'reading-mcq': { correct: 0, total: 0, points: 0, partial: 0 },
    'reading-order': { correct: 0, total: 0, points: 0, partial: 0 },
    'reading-match': { correct: 0, total: 0, points: 0, partial: 0 },
    'writing-sentence': { correct: 0, total: 0, points: 0, partial: 0 },
    'writing-essay': { correct: 0, total: 0, points: 0, partial: 0 },
    'speaking-read': { correct: 0, total: 0, points: 0, partial: 0 },
    'speaking-describe': { correct: 0, total: 0, points: 0, partial: 0 },
    'speaking-answer': { correct: 0, total: 0, points: 0, partial: 0 },
  };
}

/**
 * Question type icons mapping (for display)
 */
export const questionTypeLabels: Record<QuestionType, string> = {
  'multiple-choice': 'Trắc nghiệm',
  'short-answer': 'Tự luận ngắn',
  'essay': 'Tự luận',
  'drag-drop': 'Kéo thả',
  'coding': 'Lập trình',
  // Language exam types
  'listening-mcq': 'Nghe - Chọn đáp án',
  'listening-fill': 'Nghe - Điền từ',
  'reading-mcq': 'Đọc - Chọn đáp án',
  'reading-order': 'Đọc - Sắp xếp',
  'reading-match': 'Đọc - Ghép cặp',
  'writing-sentence': 'Viết - Sắp xếp câu',
  'writing-essay': 'Viết - Bài luận',
  'speaking-read': 'Nói - Đọc to',
  'speaking-describe': 'Nói - Mô tả hình ảnh',
  'speaking-answer': 'Nói - Trả lời câu hỏi',
};

/**
 * Group question types by skill category
 */
export const questionTypeCategories = {
  general: ['multiple-choice', 'short-answer', 'essay', 'drag-drop', 'coding'] as QuestionType[],
  listening: ['listening-mcq', 'listening-fill'] as QuestionType[],
  reading: ['reading-mcq', 'reading-order', 'reading-match'] as QuestionType[],
  writing: ['writing-sentence', 'writing-essay'] as QuestionType[],
  speaking: ['speaking-read', 'speaking-describe', 'speaking-answer'] as QuestionType[],
};

/**
 * Check if a question type is a language exam type
 */
export function isLanguageQuestionType(type: QuestionType): boolean {
  return (
    questionTypeCategories.listening.includes(type) ||
    questionTypeCategories.reading.includes(type) ||
    questionTypeCategories.writing.includes(type) ||
    questionTypeCategories.speaking.includes(type)
  );
}
