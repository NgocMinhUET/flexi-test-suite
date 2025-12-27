export interface PracticeAssignment {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  questions: string[]; // Array of question IDs
  duration: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  show_answers_after_submit: boolean;
  allow_multiple_attempts: boolean;
}

export interface PracticeAssignmentStudent {
  id: string;
  assignment_id: string;
  student_id: string;
  assigned_at: string;
}

export interface PracticeAssignmentAttempt {
  id: string;
  assignment_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  answers: Record<string, any>;
  question_results: QuestionResult[];
  earned_points: number;
  total_points: number;
  percentage: number;
  time_spent_seconds: number;
  analysis: AttemptAnalysis | null;
}

export interface QuestionResult {
  question_id: string;
  is_correct: boolean;
  user_answer: any;
  correct_answer: any;
  points_earned: number;
  points_possible: number;
  time_spent_seconds?: number;
  taxonomy_node_id?: string;
}

export interface AttemptAnalysis {
  strengths: SkillAnalysis[];
  weaknesses: SkillAnalysis[];
  suggested_next_topics: string[];
  overall_performance: 'excellent' | 'good' | 'fair' | 'poor';
  time_efficiency: 'fast' | 'normal' | 'slow';
}

export interface SkillAnalysis {
  taxonomy_node_id: string;
  taxonomy_name: string;
  correct_count: number;
  total_count: number;
  percentage: number;
}

// For creating assignments with full question data
export interface PracticeAssignmentWithDetails extends PracticeAssignment {
  subjects?: {
    id: string;
    name: string;
    code: string;
  };
  student_count?: number;
  attempt_count?: number;
}

export interface AssignedPracticeForStudent {
  id: string;
  assignment: PracticeAssignmentWithDetails;
  assigned_at: string;
  attempts: PracticeAssignmentAttempt[];
  best_percentage: number | null;
  last_attempt_at: string | null;
}
