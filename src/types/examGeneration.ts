// Types for matrix-based exam generation

export interface MatrixCell {
  taxonomyNodeId: string;
  taxonomyNodeName: string;
  cognitiveLevel: string;
  questionType: string;
  count: number;
  points: number;
  availableCount: number;
}

export interface MatrixConfig {
  cells: MatrixCell[];
  totalQuestions: number;
  totalPoints: number;
  duration: number;
}

export interface SectionConfig {
  id: string;
  name: string;
  duration: number; // minutes
  questionTypes: string[]; // Question types belonging to this section
}

export interface GenerationConstraints {
  allowShuffle: boolean;
  shuffleOptions: boolean;
  minDifficulty: number;
  maxDifficulty: number;
  isSectioned: boolean;
  sectionConfig: SectionConfig[];
}

export interface ExamTemplate {
  id: string;
  name: string;
  subjectId: string;
  description?: string;
  matrixConfig: MatrixConfig;
  constraints: GenerationConstraints;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionMapping {
  bankQuestionId: string;
  examPosition: number;
  optionOrder?: number[]; // For shuffled MCQ options
}

export interface GeneratedExam {
  id: string;
  templateId: string;
  examId: string;
  variantCode: string;
  seed: number;
  questionMapping: QuestionMapping[];
  createdAt: Date;
}

export interface QuestionStats {
  total: number;
  byTaxonomy: Record<string, number>;
  byCognitiveLevel: Record<string, number>;
  byType: Record<string, number>;
  matrix: Record<string, Record<string, Record<string, number>>>; // taxonomy -> cognitive -> type -> count
}

// Seeded random number generator for reproducible shuffling
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Linear congruential generator
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  // Shuffle array in place
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Random sample from array
  sample<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
}
