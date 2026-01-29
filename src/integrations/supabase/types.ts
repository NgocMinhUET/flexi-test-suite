export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string | null
          code: string
          condition_type: string
          condition_value: number
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_hidden: boolean | null
          name: string
          rarity: string | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          code: string
          condition_type: string
          condition_value: number
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_hidden?: boolean | null
          name: string
          rarity?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_hidden?: boolean | null
          name?: string
          rarity?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          enrolled_at: string
          enrolled_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["class_member_role"]
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["class_member_role"]
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["class_member_role"]
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teachers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          class_id: string
          id: string
          role: Database["public"]["Enums"]["class_teacher_role"]
          subject_id: string | null
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          class_id: string
          id?: string
          role?: Database["public"]["Enums"]["class_teacher_role"]
          subject_id?: string | null
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          class_id?: string
          id?: string
          role?: Database["public"]["Enums"]["class_teacher_role"]
          subject_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          grade_level: string | null
          id: string
          is_active: boolean
          max_students: number | null
          name: string
          semester: string | null
          start_date: string | null
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          grade_level?: string | null
          id?: string
          is_active?: boolean
          max_students?: number | null
          name: string
          semester?: string | null
          start_date?: string | null
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          grade_level?: string | null
          id?: string
          is_active?: boolean
          max_students?: number | null
          name?: string
          semester?: string | null
          start_date?: string | null
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_exams: {
        Row: {
          contest_id: string
          created_at: string
          exam_id: string
          id: string
          variant_code: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          exam_id: string
          id?: string
          variant_code: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          exam_id?: string
          id?: string
          variant_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_exams_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_exams_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_participants: {
        Row: {
          assigned_at: string | null
          assigned_exam_id: string | null
          contest_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_exam_id?: string | null
          contest_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_exam_id?: string | null
          contest_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_participants_assigned_exam_id_fkey"
            columns: ["assigned_exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          distribution_status: string
          end_time: string | null
          id: string
          name: string
          start_time: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          distribution_status?: string
          end_time?: string | null
          id?: string
          name: string
          start_time?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          distribution_status?: string
          end_time?: string | null
          id?: string
          name?: string
          start_time?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          bonus_multiplier: number | null
          challenge_date: string
          challenge_type: string
          created_at: string | null
          description: string
          id: string
          subject_id: string | null
          target_value: number
          xp_reward: number | null
        }
        Insert: {
          bonus_multiplier?: number | null
          challenge_date: string
          challenge_type: string
          created_at?: string | null
          description: string
          id?: string
          subject_id?: string | null
          target_value: number
          xp_reward?: number | null
        }
        Update: {
          bonus_multiplier?: number | null
          challenge_date?: string
          challenge_type?: string
          created_at?: string | null
          description?: string
          id?: string
          subject_id?: string | null
          target_value?: number
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          end_time: string | null
          exam_id: string
          id: string
          start_time: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          end_time?: string | null
          exam_id: string
          id?: string
          start_time?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          end_time?: string | null
          exam_id?: string
          id?: string
          start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_drafts: {
        Row: {
          answers: Json
          completed_sections: number[] | null
          current_question: number | null
          current_section: number | null
          exam_id: string
          flagged_questions: number[] | null
          id: string
          saved_at: string
          section_times: Json | null
          time_left: number | null
          user_id: string
          violation_stats: Json | null
        }
        Insert: {
          answers?: Json
          completed_sections?: number[] | null
          current_question?: number | null
          current_section?: number | null
          exam_id: string
          flagged_questions?: number[] | null
          id?: string
          saved_at?: string
          section_times?: Json | null
          time_left?: number | null
          user_id: string
          violation_stats?: Json | null
        }
        Update: {
          answers?: Json
          completed_sections?: number[] | null
          current_question?: number | null
          current_section?: number | null
          exam_id?: string
          flagged_questions?: number[] | null
          id?: string
          saved_at?: string
          section_times?: Json | null
          time_left?: number | null
          user_id?: string
          violation_stats?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_drafts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          duration: number | null
          earned_points: number
          exam_id: string
          grade: string | null
          id: string
          percentage: number
          question_results: Json
          statistics: Json | null
          submitted_at: string
          total_points: number
          user_id: string
        }
        Insert: {
          duration?: number | null
          earned_points?: number
          exam_id: string
          grade?: string | null
          id?: string
          percentage?: number
          question_results?: Json
          statistics?: Json | null
          submitted_at?: string
          total_points?: number
          user_id: string
        }
        Update: {
          duration?: number | null
          earned_points?: number
          exam_id?: string
          grade?: string | null
          id?: string
          percentage?: number
          question_results?: Json
          statistics?: Json | null
          submitted_at?: string
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_templates: {
        Row: {
          constraints: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          matrix_config: Json
          name: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          constraints?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          matrix_config?: Json
          name: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          constraints?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          matrix_config?: Json
          name?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_templates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration: number
          id: string
          is_published: boolean
          is_sectioned: boolean | null
          mode: string | null
          questions: Json
          sections: Json | null
          source_contest_id: string | null
          source_type: string
          subject: string
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_published?: boolean
          is_sectioned?: boolean | null
          mode?: string | null
          questions?: Json
          sections?: Json | null
          source_contest_id?: string | null
          source_type?: string
          subject: string
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_published?: boolean
          is_sectioned?: boolean | null
          mode?: string | null
          questions?: Json
          sections?: Json | null
          source_contest_id?: string | null
          source_type?: string
          subject?: string
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_source_contest_id_fkey"
            columns: ["source_contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_exams: {
        Row: {
          created_at: string
          exam_id: string | null
          id: string
          question_mapping: Json
          seed: number
          template_id: string | null
          variant_code: string
        }
        Insert: {
          created_at?: string
          exam_id?: string | null
          id?: string
          question_mapping?: Json
          seed: number
          template_id?: string | null
          variant_code: string
        }
        Update: {
          created_at?: string
          exam_id?: string | null
          id?: string
          question_mapping?: Json
          seed?: number
          template_id?: string | null
          variant_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_exams_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_exams_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "exam_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          exam_id: string
          graded_questions: number | null
          id: string
          progress: number | null
          result_data: Json | null
          status: string
          total_questions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          exam_id: string
          graded_questions?: number | null
          id?: string
          progress?: number | null
          result_data?: Json | null
          status?: string
          total_questions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          exam_id?: string
          graded_questions?: number | null
          id?: string
          progress?: number | null
          result_data?: Json | null
          status?: string
          total_questions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_jobs_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      lang_exam_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          end_time: string | null
          exam_id: string
          id: string
          start_time: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          end_time?: string | null
          exam_id: string
          id?: string
          start_time?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          end_time?: string | null
          exam_id?: string
          id?: string
          start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lang_exam_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "lang_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      lang_exam_drafts: {
        Row: {
          answers: Json | null
          current_question: number | null
          current_section: number | null
          exam_id: string
          id: string
          saved_at: string
          section_times: Json | null
          time_left: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          current_question?: number | null
          current_section?: number | null
          exam_id: string
          id?: string
          saved_at?: string
          section_times?: Json | null
          time_left?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          current_question?: number | null
          current_section?: number | null
          exam_id?: string
          id?: string
          saved_at?: string
          section_times?: Json | null
          time_left?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lang_exam_drafts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "lang_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      lang_exam_results: {
        Row: {
          created_at: string
          duration: number | null
          earned_points: number | null
          exam_id: string
          grade: string | null
          id: string
          percentage: number | null
          question_results: Json | null
          skill_scores: Json | null
          speaking_recordings: Json | null
          started_at: string | null
          submitted_at: string
          total_points: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          earned_points?: number | null
          exam_id: string
          grade?: string | null
          id?: string
          percentage?: number | null
          question_results?: Json | null
          skill_scores?: Json | null
          speaking_recordings?: Json | null
          started_at?: string | null
          submitted_at?: string
          total_points?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          earned_points?: number | null
          exam_id?: string
          grade?: string | null
          id?: string
          percentage?: number | null
          question_results?: Json | null
          skill_scores?: Json | null
          speaking_recordings?: Json | null
          started_at?: string | null
          submitted_at?: string
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lang_exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "lang_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      lang_exams: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          is_sectioned: boolean | null
          proficiency_level: string | null
          questions: Json
          sections: Json | null
          status: Database["public"]["Enums"]["lang_exam_status"]
          subject_id: string
          title: string
          total_duration: number
          total_points: number | null
          total_questions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          is_sectioned?: boolean | null
          proficiency_level?: string | null
          questions?: Json
          sections?: Json | null
          status?: Database["public"]["Enums"]["lang_exam_status"]
          subject_id: string
          title: string
          total_duration?: number
          total_points?: number | null
          total_questions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          is_sectioned?: boolean | null
          proficiency_level?: string | null
          questions?: Json
          sections?: Json | null
          status?: Database["public"]["Enums"]["lang_exam_status"]
          subject_id?: string
          title?: string
          total_duration?: number
          total_points?: number | null
          total_questions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lang_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "lang_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lang_questions: {
        Row: {
          answer_data: Json
          audio_duration: number | null
          audio_play_count: number | null
          audio_transcript: string | null
          audio_url: string | null
          code: string | null
          cognitive_level: string | null
          content: string
          content_plain: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          difficulty: number | null
          estimated_time: number | null
          id: string
          image_url: string | null
          labels: Json | null
          points: number | null
          proficiency_level: string | null
          question_type: Database["public"]["Enums"]["lang_question_type"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skill_type: string
          status: Database["public"]["Enums"]["lang_question_status"]
          subject_id: string
          taxonomy_node_id: string | null
          updated_at: string
        }
        Insert: {
          answer_data?: Json
          audio_duration?: number | null
          audio_play_count?: number | null
          audio_transcript?: string | null
          audio_url?: string | null
          code?: string | null
          cognitive_level?: string | null
          content: string
          content_plain?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          difficulty?: number | null
          estimated_time?: number | null
          id?: string
          image_url?: string | null
          labels?: Json | null
          points?: number | null
          proficiency_level?: string | null
          question_type: Database["public"]["Enums"]["lang_question_type"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_type: string
          status?: Database["public"]["Enums"]["lang_question_status"]
          subject_id: string
          taxonomy_node_id?: string | null
          updated_at?: string
        }
        Update: {
          answer_data?: Json
          audio_duration?: number | null
          audio_play_count?: number | null
          audio_transcript?: string | null
          audio_url?: string | null
          code?: string | null
          cognitive_level?: string | null
          content?: string
          content_plain?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          difficulty?: number | null
          estimated_time?: number | null
          id?: string
          image_url?: string | null
          labels?: Json | null
          points?: number | null
          proficiency_level?: string | null
          question_type?: Database["public"]["Enums"]["lang_question_type"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill_type?: string
          status?: Database["public"]["Enums"]["lang_question_status"]
          subject_id?: string
          taxonomy_node_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lang_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "lang_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lang_questions_taxonomy_node_id_fkey"
            columns: ["taxonomy_node_id"]
            isOneToOne: false
            referencedRelation: "lang_taxonomy_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      lang_subjects: {
        Row: {
          code: string
          cognitive_levels: Json | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          matrix_config: Json | null
          name: string
          proficiency_levels: Json | null
          skill_types: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          cognitive_levels?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          matrix_config?: Json | null
          name: string
          proficiency_levels?: Json | null
          skill_types?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          cognitive_levels?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          matrix_config?: Json | null
          name?: string
          proficiency_levels?: Json | null
          skill_types?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      lang_taxonomy_nodes: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          level: number
          name: string
          order_index: number | null
          parent_id: string | null
          subject_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level?: number
          name: string
          order_index?: number | null
          parent_id?: string | null
          subject_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level?: number
          name?: string
          order_index?: number | null
          parent_id?: string | null
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lang_taxonomy_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lang_taxonomy_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lang_taxonomy_nodes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "lang_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      language_media: {
        Row: {
          created_at: string | null
          duration: number | null
          id: string
          media_type: string
          question_id: string | null
          storage_path: string
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          id?: string
          media_type: string
          question_id?: string | null
          storage_path: string
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          id?: string
          media_type?: string
          question_id?: string | null
          storage_path?: string
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_media_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          id: string
          leaderboard_type: string
          period_end: string
          period_start: string
          rankings: Json | null
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          leaderboard_type: string
          period_end: string
          period_start: string
          rankings?: Json | null
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          leaderboard_type?: string
          period_end?: string
          period_start?: string
          rankings?: Json | null
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      level_configs: {
        Row: {
          badge_icon: string | null
          level: number
          perks: Json | null
          title: string
          xp_required: number
        }
        Insert: {
          badge_icon?: string | null
          level: number
          perks?: Json | null
          title: string
          xp_required: number
        }
        Update: {
          badge_icon?: string | null
          level?: number
          perks?: Json | null
          title?: string
          xp_required?: number
        }
        Relationships: []
      }
      practice_assignment_attempts: {
        Row: {
          analysis: Json | null
          answers: Json
          assignment_id: string
          attempt_number: number
          completed_at: string | null
          earned_points: number
          id: string
          percentage: number
          question_results: Json
          started_at: string
          student_id: string
          time_spent_seconds: number
          total_points: number
        }
        Insert: {
          analysis?: Json | null
          answers?: Json
          assignment_id: string
          attempt_number?: number
          completed_at?: string | null
          earned_points?: number
          id?: string
          percentage?: number
          question_results?: Json
          started_at?: string
          student_id: string
          time_spent_seconds?: number
          total_points?: number
        }
        Update: {
          analysis?: Json | null
          answers?: Json
          assignment_id?: string
          attempt_number?: number
          completed_at?: string | null
          earned_points?: number
          id?: string
          percentage?: number
          question_results?: Json
          started_at?: string
          student_id?: string
          time_spent_seconds?: number
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_assignment_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "practice_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_assignment_students: {
        Row: {
          assigned_at: string
          assignment_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assignment_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assignment_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_assignment_students_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "practice_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_assignments: {
        Row: {
          allow_multiple_attempts: boolean
          assignment_scope: Database["public"]["Enums"]["assignment_scope"]
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration: number | null
          id: string
          is_active: boolean
          questions: Json
          show_answers_after_submit: boolean
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_attempts?: boolean
          assignment_scope?: Database["public"]["Enums"]["assignment_scope"]
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean
          questions?: Json
          show_answers_after_submit?: boolean
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_attempts?: boolean
          assignment_scope?: Database["public"]["Enums"]["assignment_scope"]
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean
          questions?: Json
          show_answers_after_submit?: boolean
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          attempt_number: number | null
          completed_at: string | null
          earned_points: number | null
          exam_id: string | null
          id: string
          question_results: Json | null
          score: number | null
          time_spent_seconds: number | null
          total_points: number | null
          user_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          completed_at?: string | null
          earned_points?: number | null
          exam_id?: string | null
          id?: string
          question_results?: Json | null
          score?: number | null
          time_spent_seconds?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          completed_at?: string | null
          earned_points?: number | null
          exam_id?: string | null
          id?: string
          question_results?: Json | null
          score?: number | null
          time_spent_seconds?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_configs: {
        Row: {
          allow_unlimited_attempts: boolean | null
          allowed_users: string[] | null
          created_at: string | null
          created_by: string | null
          exam_id: string | null
          id: string
          is_public: boolean | null
          show_answers_after_submit: boolean | null
          show_explanations: boolean | null
          time_limit_enabled: boolean | null
          time_limit_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          allow_unlimited_attempts?: boolean | null
          allowed_users?: string[] | null
          created_at?: string | null
          created_by?: string | null
          exam_id?: string | null
          id?: string
          is_public?: boolean | null
          show_answers_after_submit?: boolean | null
          show_explanations?: boolean | null
          time_limit_enabled?: boolean | null
          time_limit_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_unlimited_attempts?: boolean | null
          allowed_users?: string[] | null
          created_at?: string | null
          created_by?: string | null
          exam_id?: string | null
          id?: string
          is_public?: boolean | null
          show_answers_after_submit?: boolean | null
          show_explanations?: boolean | null
          time_limit_enabled?: boolean | null
          time_limit_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_configs_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          correct_count: number | null
          id: string
          question_results: Json | null
          questions_count: number | null
          session_type: string
          started_at: string | null
          subject_id: string | null
          time_spent_seconds: number | null
          user_id: string | null
          xp_earned: number | null
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number | null
          id?: string
          question_results?: Json | null
          questions_count?: number | null
          session_type: string
          started_at?: string | null
          subject_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Update: {
          completed_at?: string | null
          correct_count?: number | null
          id?: string
          question_results?: Json | null
          questions_count?: number | null
          session_type?: string
          started_at?: string | null
          subject_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_history: {
        Row: {
          ease_factor: number | null
          id: string
          last_result: boolean | null
          last_seen_at: string | null
          next_review_date: string | null
          question_id: string | null
          times_correct: number | null
          times_seen: number | null
          user_id: string | null
        }
        Insert: {
          ease_factor?: number | null
          id?: string
          last_result?: boolean | null
          last_seen_at?: string | null
          next_review_date?: string | null
          question_id?: string | null
          times_correct?: number | null
          times_seen?: number | null
          user_id?: string | null
        }
        Update: {
          ease_factor?: number | null
          id?: string
          last_result?: boolean | null
          last_seen_at?: string | null
          next_review_date?: string | null
          question_id?: string | null
          times_correct?: number | null
          times_seen?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          allow_shuffle: boolean | null
          answer_data: Json
          code: string | null
          cognitive_level: string | null
          content: string
          content_plain: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          difficulty: number | null
          estimated_time: number | null
          explanation: string | null
          group_id: string | null
          group_order: number | null
          hints: Json | null
          id: string
          is_group_lead: boolean | null
          labels: Json | null
          media: Json | null
          question_type: Database["public"]["Enums"]["question_type"]
          rejection_reason: string | null
          related_concepts: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["question_status"]
          subject_id: string
          taxonomy_node_id: string | null
          taxonomy_path: Json | null
          updated_at: string
        }
        Insert: {
          allow_shuffle?: boolean | null
          answer_data?: Json
          code?: string | null
          cognitive_level?: string | null
          content: string
          content_plain?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          difficulty?: number | null
          estimated_time?: number | null
          explanation?: string | null
          group_id?: string | null
          group_order?: number | null
          hints?: Json | null
          id?: string
          is_group_lead?: boolean | null
          labels?: Json | null
          media?: Json | null
          question_type?: Database["public"]["Enums"]["question_type"]
          rejection_reason?: string | null
          related_concepts?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          subject_id: string
          taxonomy_node_id?: string | null
          taxonomy_path?: Json | null
          updated_at?: string
        }
        Update: {
          allow_shuffle?: boolean | null
          answer_data?: Json
          code?: string | null
          cognitive_level?: string | null
          content?: string
          content_plain?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          difficulty?: number | null
          estimated_time?: number | null
          explanation?: string | null
          group_id?: string | null
          group_order?: number | null
          hints?: Json | null
          id?: string
          is_group_lead?: boolean | null
          labels?: Json | null
          media?: Json | null
          question_type?: Database["public"]["Enums"]["question_type"]
          rejection_reason?: string | null
          related_concepts?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          subject_id?: string
          taxonomy_node_id?: string | null
          taxonomy_path?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_taxonomy_node_id_fkey"
            columns: ["taxonomy_node_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_masteries: {
        Row: {
          difficulty_stats: Json | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_correct_streak: number | null
          mastery_level: number | null
          next_review_date: string | null
          questions_attempted: number | null
          questions_correct: number | null
          taxonomy_node_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          difficulty_stats?: Json | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_correct_streak?: number | null
          mastery_level?: number | null
          next_review_date?: string | null
          questions_attempted?: number | null
          questions_correct?: number | null
          taxonomy_node_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          difficulty_stats?: Json | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_correct_streak?: number | null
          mastery_level?: number | null
          next_review_date?: string | null
          questions_attempted?: number | null
          questions_correct?: number | null
          taxonomy_node_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_masteries_taxonomy_node_id_fkey"
            columns: ["taxonomy_node_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_responses: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          created_at: string | null
          duration: number
          exam_result_id: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          manual_feedback: string | null
          manual_score: number | null
          question_id: string
          recording_url: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string | null
          duration: number
          exam_result_id?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_feedback?: string | null
          manual_score?: number | null
          question_id: string
          recording_url: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string | null
          duration?: number
          exam_result_id?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_feedback?: string | null
          manual_score?: number | null
          question_id?: string
          recording_url?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_responses_exam_result_id_fkey"
            columns: ["exam_result_id"]
            isOneToOne: false
            referencedRelation: "exam_results"
            referencedColumns: ["id"]
          },
        ]
      }
      student_skill_profiles: {
        Row: {
          created_at: string | null
          current_level: number | null
          current_streak: number | null
          id: string
          last_practice_date: string | null
          longest_streak: number | null
          total_correct_answers: number | null
          total_practice_time_minutes: number | null
          total_questions_attempted: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          id?: string
          last_practice_date?: string | null
          longest_streak?: number | null
          total_correct_answers?: number | null
          total_practice_time_minutes?: number | null
          total_questions_attempted?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          id?: string
          last_practice_date?: string | null
          longest_streak?: number | null
          total_correct_answers?: number | null
          total_practice_time_minutes?: number | null
          total_questions_attempted?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          cognitive_levels: Json | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          question_types: Json | null
          taxonomy_config: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          cognitive_levels?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          question_types?: Json | null
          taxonomy_config?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          cognitive_levels?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          question_types?: Json | null
          taxonomy_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      taxonomy_nodes: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          level: number
          name: string
          order_index: number | null
          parent_id: string | null
          subject_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level?: number
          name: string
          order_index?: number | null
          parent_id?: string | null
          subject_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level?: number
          name?: string
          order_index?: number | null
          parent_id?: string | null
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_nodes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level_from_xp: { Args: { xp: number }; Returns: number }
      enrolled_in_class: { Args: { _class_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_contest_exam: {
        Args: { _contest_id: string; _exam_id: string }
        Returns: boolean
      }
      owns_class: { Args: { _class_id: string }; Returns: boolean }
      owns_contest: { Args: { _contest_id: string }; Returns: boolean }
      owns_exam: { Args: { _exam_id: string }; Returns: boolean }
      owns_practice_assignment: {
        Args: { _assignment_id: string }
        Returns: boolean
      }
      participates_in_contest: {
        Args: { _contest_id: string }
        Returns: boolean
      }
      soft_delete_questions: {
        Args: { question_ids: string[] }
        Returns: undefined
      }
      teaches_class: { Args: { _class_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      assignment_scope: "class" | "individual"
      class_member_role: "student" | "monitor" | "deputy"
      class_teacher_role: "primary" | "assistant" | "substitute"
      enrollment_status: "active" | "inactive" | "dropped" | "graduated"
      lang_exam_status: "draft" | "published" | "archived"
      lang_question_status: "draft" | "review" | "approved" | "published"
      lang_question_type:
        | "LISTENING_MCQ"
        | "LISTENING_FILL"
        | "READING_MCQ"
        | "READING_ORDER"
        | "READING_MATCH"
        | "WRITING_SENTENCE"
        | "WRITING_ESSAY"
        | "SPEAKING_READ"
        | "SPEAKING_DESCRIBE"
        | "SPEAKING_ANSWER"
      question_status: "draft" | "review" | "approved" | "published"
      question_type:
        | "MCQ_SINGLE"
        | "TRUE_FALSE_4"
        | "SHORT_ANSWER"
        | "CODING"
        | "LISTENING_MCQ"
        | "LISTENING_FILL"
        | "READING_MCQ"
        | "READING_ORDER"
        | "READING_MATCH"
        | "WRITING_SENTENCE"
        | "WRITING_ESSAY"
        | "SPEAKING_READ"
        | "SPEAKING_DESCRIBE"
        | "SPEAKING_ANSWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
      assignment_scope: ["class", "individual"],
      class_member_role: ["student", "monitor", "deputy"],
      class_teacher_role: ["primary", "assistant", "substitute"],
      enrollment_status: ["active", "inactive", "dropped", "graduated"],
      lang_exam_status: ["draft", "published", "archived"],
      lang_question_status: ["draft", "review", "approved", "published"],
      lang_question_type: [
        "LISTENING_MCQ",
        "LISTENING_FILL",
        "READING_MCQ",
        "READING_ORDER",
        "READING_MATCH",
        "WRITING_SENTENCE",
        "WRITING_ESSAY",
        "SPEAKING_READ",
        "SPEAKING_DESCRIBE",
        "SPEAKING_ANSWER",
      ],
      question_status: ["draft", "review", "approved", "published"],
      question_type: [
        "MCQ_SINGLE",
        "TRUE_FALSE_4",
        "SHORT_ANSWER",
        "CODING",
        "LISTENING_MCQ",
        "LISTENING_FILL",
        "READING_MCQ",
        "READING_ORDER",
        "READING_MATCH",
        "WRITING_SENTENCE",
        "WRITING_ESSAY",
        "SPEAKING_READ",
        "SPEAKING_DESCRIBE",
        "SPEAKING_ANSWER",
      ],
    },
  },
} as const
