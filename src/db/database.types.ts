export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string;
          criteria: Json;
          description: string;
          display_name: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          criteria: Json;
          description: string;
          display_name: string;
          id: string;
          name: string;
        };
        Update: {
          created_at?: string;
          criteria?: Json;
          description?: string;
          display_name?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          current_streak: number;
          display_name: string | null;
          find_note_count: number;
          fretboard_range: number;
          id: string;
          last_activity_date: string | null;
          longest_streak: number;
          mark_chord_count: number;
          name_note_count: number;
          recognize_interval_count: number;
          show_note_names: boolean;
          tutorial_completed_modes: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_streak?: number;
          display_name?: string | null;
          find_note_count?: number;
          fretboard_range?: number;
          id: string;
          last_activity_date?: string | null;
          longest_streak?: number;
          mark_chord_count?: number;
          name_note_count?: number;
          recognize_interval_count?: number;
          show_note_names?: boolean;
          tutorial_completed_modes?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_streak?: number;
          display_name?: string | null;
          find_note_count?: number;
          fretboard_range?: number;
          id?: string;
          last_activity_date?: string | null;
          longest_streak?: number;
          mark_chord_count?: number;
          name_note_count?: number;
          recognize_interval_count?: number;
          show_note_names?: boolean;
          tutorial_completed_modes?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_answers: {
        Row: {
          created_at: string;
          fret_position: number | null;
          id: string;
          is_correct: boolean;
          question_number: number;
          reference_fret_position: number | null;
          reference_string_number: number | null;
          session_id: string;
          string_number: number | null;
          target_chord_type: Database["public"]["Enums"]["chord_type_enum"] | null;
          target_interval: Database["public"]["Enums"]["interval_enum"] | null;
          target_note: Database["public"]["Enums"]["note_enum"] | null;
          target_root_note: Database["public"]["Enums"]["note_enum"] | null;
          time_taken_ms: number | null;
          user_answer_interval: Database["public"]["Enums"]["interval_enum"] | null;
          user_answer_note: Database["public"]["Enums"]["note_enum"] | null;
          user_answer_positions: Json | null;
        };
        Insert: {
          created_at?: string;
          fret_position?: number | null;
          id?: string;
          is_correct: boolean;
          question_number: number;
          reference_fret_position?: number | null;
          reference_string_number?: number | null;
          session_id: string;
          string_number?: number | null;
          target_chord_type?: Database["public"]["Enums"]["chord_type_enum"] | null;
          target_interval?: Database["public"]["Enums"]["interval_enum"] | null;
          target_note?: Database["public"]["Enums"]["note_enum"] | null;
          target_root_note?: Database["public"]["Enums"]["note_enum"] | null;
          time_taken_ms?: number | null;
          user_answer_interval?: Database["public"]["Enums"]["interval_enum"] | null;
          user_answer_note?: Database["public"]["Enums"]["note_enum"] | null;
          user_answer_positions?: Json | null;
        };
        Update: {
          created_at?: string;
          fret_position?: number | null;
          id?: string;
          is_correct?: boolean;
          question_number?: number;
          reference_fret_position?: number | null;
          reference_string_number?: number | null;
          session_id?: string;
          string_number?: number | null;
          target_chord_type?: Database["public"]["Enums"]["chord_type_enum"] | null;
          target_interval?: Database["public"]["Enums"]["interval_enum"] | null;
          target_note?: Database["public"]["Enums"]["note_enum"] | null;
          target_root_note?: Database["public"]["Enums"]["note_enum"] | null;
          time_taken_ms?: number | null;
          user_answer_interval?: Database["public"]["Enums"]["interval_enum"] | null;
          user_answer_note?: Database["public"]["Enums"]["note_enum"] | null;
          user_answer_positions?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "quiz_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          difficulty: Database["public"]["Enums"]["difficulty_enum"];
          id: string;
          quiz_type: Database["public"]["Enums"]["quiz_type_enum"];
          score: number | null;
          started_at: string;
          status: Database["public"]["Enums"]["session_status_enum"];
          time_limit_seconds: number | null;
          time_taken_seconds: number | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          difficulty: Database["public"]["Enums"]["difficulty_enum"];
          id?: string;
          quiz_type: Database["public"]["Enums"]["quiz_type_enum"];
          score?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status_enum"];
          time_limit_seconds?: number | null;
          time_taken_seconds?: number | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty_enum"];
          id?: string;
          quiz_type?: Database["public"]["Enums"]["quiz_type_enum"];
          score?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status_enum"];
          time_limit_seconds?: number | null;
          time_taken_seconds?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          earned_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          earned_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          earned_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      user_error_heatmap: {
        Row: {
          error_count: number | null;
          fret_position: number | null;
          string_number: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: Record<never, never>;
    Enums: {
      chord_type_enum: "major" | "minor" | "diminished" | "augmented";
      difficulty_enum: "easy" | "medium" | "hard";
      interval_enum:
        | "minor_2nd"
        | "major_2nd"
        | "minor_3rd"
        | "major_3rd"
        | "perfect_4th"
        | "tritone"
        | "perfect_5th"
        | "minor_6th"
        | "major_6th"
        | "minor_7th"
        | "major_7th"
        | "octave";
      note_enum: "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
      quiz_type_enum: "find_note" | "name_note" | "mark_chord" | "recognize_interval";
      session_status_enum: "in_progress" | "completed" | "abandoned";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chord_type_enum: ["major", "minor", "diminished", "augmented"],
      difficulty_enum: ["easy", "medium", "hard"],
      interval_enum: [
        "minor_2nd",
        "major_2nd",
        "minor_3rd",
        "major_3rd",
        "perfect_4th",
        "tritone",
        "perfect_5th",
        "minor_6th",
        "major_6th",
        "minor_7th",
        "major_7th",
        "octave",
      ],
      note_enum: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
      quiz_type_enum: ["find_note", "name_note", "mark_chord", "recognize_interval"],
      session_status_enum: ["in_progress", "completed", "abandoned"],
    },
  },
} as const;
