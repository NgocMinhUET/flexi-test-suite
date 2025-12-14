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
          current_question: number | null
          exam_id: string
          flagged_questions: number[] | null
          id: string
          saved_at: string
          user_id: string
          violation_stats: Json | null
        }
        Insert: {
          answers?: Json
          current_question?: number | null
          exam_id: string
          flagged_questions?: number[] | null
          id?: string
          saved_at?: string
          user_id: string
          violation_stats?: Json | null
        }
        Update: {
          answers?: Json
          current_question?: number | null
          exam_id?: string
          flagged_questions?: number[] | null
          id?: string
          saved_at?: string
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
          questions: Json
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
          questions?: Json
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
          questions?: Json
          subject?: string
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
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
          group_id: string | null
          group_order: number | null
          id: string
          is_group_lead: boolean | null
          labels: Json | null
          media: Json | null
          question_type: Database["public"]["Enums"]["question_type"]
          rejection_reason: string | null
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
          group_id?: string | null
          group_order?: number | null
          id?: string
          is_group_lead?: boolean | null
          labels?: Json | null
          media?: Json | null
          question_type?: Database["public"]["Enums"]["question_type"]
          rejection_reason?: string | null
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
          group_id?: string | null
          group_order?: number | null
          id?: string
          is_group_lead?: boolean | null
          labels?: Json | null
          media?: Json | null
          question_type?: Database["public"]["Enums"]["question_type"]
          rejection_reason?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_exam: { Args: { _exam_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      question_status: "draft" | "review" | "approved" | "published"
      question_type: "MCQ_SINGLE" | "TRUE_FALSE_4" | "SHORT_ANSWER" | "CODING"
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
      question_status: ["draft", "review", "approved", "published"],
      question_type: ["MCQ_SINGLE", "TRUE_FALSE_4", "SHORT_ANSWER", "CODING"],
    },
  },
} as const
