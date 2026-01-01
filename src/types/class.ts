// Enrollment status for students
export type EnrollmentStatus = 'active' | 'inactive' | 'dropped' | 'graduated';

// Role within a class for students
export type ClassMemberRole = 'student' | 'monitor' | 'deputy';

// Role for teachers in a class
export type ClassTeacherRole = 'primary' | 'assistant' | 'substitute';

// Assignment scope
export type AssignmentScope = 'class' | 'individual';

// Class entity
export interface Class {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subject_id: string | null;
  academic_year: string | null;
  semester: string | null;
  grade_level: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  max_students: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Class with additional details
export interface ClassWithDetails extends Class {
  subjects?: {
    id: string;
    name: string;
    code: string;
  } | null;
  student_count?: number;
  teacher_count?: number;
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

// Class student enrollment
export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  role: ClassMemberRole;
  enrolled_by: string | null;
  notes: string | null;
}

// Class student with profile details
export interface ClassStudentWithProfile extends ClassStudent {
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

// Class teacher assignment
export interface ClassTeacher {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string | null;
  role: ClassTeacherRole;
  assigned_at: string;
  assigned_by: string | null;
}

// Class teacher with profile details
export interface ClassTeacherWithProfile extends ClassTeacher {
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  subjects?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

// For creating a new class
export interface CreateClassInput {
  code: string;
  name: string;
  description?: string | null;
  subject_id?: string | null;
  academic_year?: string | null;
  semester?: string | null;
  grade_level?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  max_students?: number | null;
}

// For updating a class
export interface UpdateClassInput extends Partial<CreateClassInput> {
  id: string;
}

// For enrolling students
export interface EnrollStudentInput {
  class_id: string;
  student_id: string;
  role?: ClassMemberRole;
  notes?: string | null;
}

// For bulk enrolling students
export interface BulkEnrollInput {
  class_id: string;
  student_ids: string[];
}

// For assigning teachers
export interface AssignTeacherInput {
  class_id: string;
  teacher_id: string;
  subject_id?: string | null;
  role?: ClassTeacherRole;
}

// Student's enrolled class view
export interface StudentEnrolledClass {
  id: string;
  class: ClassWithDetails;
  enrolled_at: string;
  status: EnrollmentStatus;
  role: ClassMemberRole;
}

// Class statistics
export interface ClassStatistics {
  total_students: number;
  active_students: number;
  total_assignments: number;
  completed_assignments: number;
  average_score: number;
}
