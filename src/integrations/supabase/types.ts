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
      invite_responses: {
        Row: {
          created_at: string | null
          id: string
          invite_id: string
          responder_name: string | null
          response: string
          suggestion_json: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_id: string
          responder_name?: string | null
          response: string
          suggestion_json?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_id?: string
          responder_name?: string | null
          response?: string
          suggestion_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_responses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          host_name: string | null
          id: string
          intent: string | null
          invitee_count: number | null
          plan_json: Json
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          host_name?: string | null
          id?: string
          intent?: string | null
          invitee_count?: number | null
          plan_json: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          host_name?: string | null
          id?: string
          intent?: string | null
          invitee_count?: number | null
          plan_json?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          delivery_method: string | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          scheduled_for: string
          scheduled_plan_id: string
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_method?: string | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          scheduled_for: string
          scheduled_plan_id: string
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_method?: string | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          scheduled_for?: string
          scheduled_plan_id?: string
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "scheduled_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activities: string[] | null
          cuisines: string[] | null
          default_radius_mi: number | null
          dietary: string[] | null
          dislikes: string[] | null
          energy_level: string | null
          experience_level: string | null
          home_zip: string | null
          nickname: string | null
          notification_email_enabled: boolean | null
          notification_quiet_end: string | null
          notification_quiet_start: string | null
          novelty_preference: string | null
          occasion_type: string | null
          party_size: number | null
          planning_style: string | null
          preferred_date: string | null
          preferred_time: string | null
          price_range: string | null
          profile_picture_url: string | null
          theme_preference: string | null
          time_preference: string | null
          updated_at: string | null
          user_id: string
          vibe: string | null
          voice_notes: string | null
        }
        Insert: {
          activities?: string[] | null
          cuisines?: string[] | null
          default_radius_mi?: number | null
          dietary?: string[] | null
          dislikes?: string[] | null
          energy_level?: string | null
          experience_level?: string | null
          home_zip?: string | null
          nickname?: string | null
          notification_email_enabled?: boolean | null
          notification_quiet_end?: string | null
          notification_quiet_start?: string | null
          novelty_preference?: string | null
          occasion_type?: string | null
          party_size?: number | null
          planning_style?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          price_range?: string | null
          profile_picture_url?: string | null
          theme_preference?: string | null
          time_preference?: string | null
          updated_at?: string | null
          user_id: string
          vibe?: string | null
          voice_notes?: string | null
        }
        Update: {
          activities?: string[] | null
          cuisines?: string[] | null
          default_radius_mi?: number | null
          dietary?: string[] | null
          dislikes?: string[] | null
          energy_level?: string | null
          experience_level?: string | null
          home_zip?: string | null
          nickname?: string | null
          notification_email_enabled?: boolean | null
          notification_quiet_end?: string | null
          notification_quiet_start?: string | null
          novelty_preference?: string | null
          occasion_type?: string | null
          party_size?: number | null
          planning_style?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          price_range?: string | null
          profile_picture_url?: string | null
          theme_preference?: string | null
          time_preference?: string | null
          updated_at?: string | null
          user_id?: string
          vibe?: string | null
          voice_notes?: string | null
        }
        Relationships: []
      }
      saved_plans: {
        Row: {
          activity_category: string | null
          activity_id: string
          activity_name: string
          created_at: string | null
          id: string
          restaurant_cuisine: string | null
          restaurant_id: string
          restaurant_name: string
          search_params: Json | null
          user_id: string
          was_completed: boolean | null
        }
        Insert: {
          activity_category?: string | null
          activity_id: string
          activity_name: string
          created_at?: string | null
          id?: string
          restaurant_cuisine?: string | null
          restaurant_id: string
          restaurant_name: string
          search_params?: Json | null
          user_id: string
          was_completed?: boolean | null
        }
        Update: {
          activity_category?: string | null
          activity_id?: string
          activity_name?: string
          created_at?: string | null
          id?: string
          restaurant_cuisine?: string | null
          restaurant_id?: string
          restaurant_name?: string
          search_params?: Json | null
          user_id?: string
          was_completed?: boolean | null
        }
        Relationships: []
      }
      scheduled_plans: {
        Row: {
          activity_address: string | null
          activity_category: string | null
          activity_hours: Json | null
          activity_id: string
          activity_lat: number | null
          activity_lng: number | null
          activity_name: string
          activity_website: string | null
          availability_status: string | null
          completed_at: string | null
          confirmation_numbers: Json | null
          conflict_warnings: Json | null
          created_at: string | null
          id: string
          rating: number | null
          restaurant_address: string | null
          restaurant_cuisine: string | null
          restaurant_hours: Json | null
          restaurant_id: string
          restaurant_lat: number | null
          restaurant_lng: number | null
          restaurant_name: string
          restaurant_website: string | null
          scheduled_date: string
          scheduled_time: string
          search_mode: string | null
          search_params: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
          weather_forecast: Json | null
        }
        Insert: {
          activity_address?: string | null
          activity_category?: string | null
          activity_hours?: Json | null
          activity_id: string
          activity_lat?: number | null
          activity_lng?: number | null
          activity_name: string
          activity_website?: string | null
          availability_status?: string | null
          completed_at?: string | null
          confirmation_numbers?: Json | null
          conflict_warnings?: Json | null
          created_at?: string | null
          id?: string
          rating?: number | null
          restaurant_address?: string | null
          restaurant_cuisine?: string | null
          restaurant_hours?: Json | null
          restaurant_id: string
          restaurant_lat?: number | null
          restaurant_lng?: number | null
          restaurant_name: string
          restaurant_website?: string | null
          scheduled_date: string
          scheduled_time: string
          search_mode?: string | null
          search_params?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          weather_forecast?: Json | null
        }
        Update: {
          activity_address?: string | null
          activity_category?: string | null
          activity_hours?: Json | null
          activity_id?: string
          activity_lat?: number | null
          activity_lng?: number | null
          activity_name?: string
          activity_website?: string | null
          availability_status?: string | null
          completed_at?: string | null
          confirmation_numbers?: Json | null
          conflict_warnings?: Json | null
          created_at?: string | null
          id?: string
          rating?: number | null
          restaurant_address?: string | null
          restaurant_cuisine?: string | null
          restaurant_hours?: Json | null
          restaurant_id?: string
          restaurant_lat?: number | null
          restaurant_lng?: number | null
          restaurant_name?: string
          restaurant_website?: string | null
          scheduled_date?: string
          scheduled_time?: string
          search_mode?: string | null
          search_params?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          weather_forecast?: Json | null
        }
        Relationships: []
      }
      share_responses: {
        Row: {
          created_at: string | null
          id: string
          responder_name: string | null
          response: string
          share_id: string
          tweak_note: string | null
          tweak_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          responder_name?: string | null
          response: string
          share_id: string
          tweak_note?: string | null
          tweak_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          responder_name?: string | null
          response?: string
          share_id?: string
          tweak_note?: string | null
          tweak_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_responses_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shared_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_plans: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          invitee_count: number | null
          message: string | null
          scheduled_plan_id: string
          sender_name: string | null
          share_context: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          invitee_count?: number | null
          message?: string | null
          scheduled_plan_id: string
          sender_name?: string | null
          share_context?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          invitee_count?: number | null
          message?: string | null
          scheduled_plan_id?: string
          sender_name?: string | null
          share_context?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_plans_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "scheduled_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action_type: string
          activity_category: string | null
          activity_id: string | null
          activity_name: string | null
          created_at: string | null
          id: string
          restaurant_cuisine: string | null
          restaurant_id: string | null
          restaurant_name: string | null
          restaurant_price_level: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          activity_category?: string | null
          activity_id?: string | null
          activity_name?: string | null
          created_at?: string | null
          id?: string
          restaurant_cuisine?: string | null
          restaurant_id?: string | null
          restaurant_name?: string | null
          restaurant_price_level?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          activity_category?: string | null
          activity_id?: string | null
          activity_name?: string | null
          created_at?: string | null
          id?: string
          restaurant_cuisine?: string | null
          restaurant_id?: string | null
          restaurant_name?: string | null
          restaurant_price_level?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          category: string | null
          created_at: string | null
          cuisine: string | null
          id: string
          interaction_type: string
          place_id: string
          place_name: string
          place_type: string
          rating: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          cuisine?: string | null
          id?: string
          interaction_type: string
          place_id: string
          place_name: string
          place_type: string
          rating?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          cuisine?: string | null
          id?: string
          interaction_type?: string
          place_id?: string
          place_name?: string
          place_type?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_invite_creator: { Args: { _invite_id: string }; Returns: boolean }
      is_share_creator: { Args: { _share_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
