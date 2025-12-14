export type ContestStatus = 'draft' | 'ready' | 'active' | 'completed';
export type DistributionStatus = 'pending' | 'distributed';

export interface Contest {
  id: string;
  name: string;
  description?: string;
  subject: string;
  start_time?: string;
  end_time?: string;
  status: ContestStatus;
  distribution_status: DistributionStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContestExam {
  id: string;
  contest_id: string;
  exam_id: string;
  variant_code: string;
  created_at: string;
}

export interface ContestParticipant {
  id: string;
  contest_id: string;
  user_id: string;
  assigned_exam_id?: string;
  assigned_at?: string;
  created_at: string;
}

export interface ContestWithDetails extends Contest {
  exams: ContestExam[];
  participants: ContestParticipant[];
  exam_count: number;
  participant_count: number;
  assigned_count: number;
}
