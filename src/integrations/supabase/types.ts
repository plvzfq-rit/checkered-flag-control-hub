export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pit_stops: {
        Row: {
          created_at: string
          fuel_added: number | null
          id: string
          lap_number: number | null
          pit_time: number | null
          session_id: string | null
          tire_change_from: string | null
          tire_change_to: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fuel_added?: number | null
          id?: string
          lap_number?: number | null
          pit_time?: number | null
          session_id?: string | null
          tire_change_from?: string | null
          tire_change_to?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fuel_added?: number | null
          id?: string
          lap_number?: number | null
          pit_time?: number | null
          session_id?: string | null
          tire_change_from?: string | null
          tire_change_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pit_stops_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "race_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          car_number: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          team_name: string | null
          updated_at: string
        }
        Insert: {
          car_number?: number | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          car_number?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      race_sessions: {
        Row: {
          created_at: string
          fuel_load: number | null
          id: string
          lap_time: number | null
          notes: string | null
          sector_1: number | null
          sector_2: number | null
          sector_3: number | null
          session_type: string
          tire_compound: string | null
          track_name: string
          updated_at: string
          user_id: string
          weather_conditions: string | null
        }
        Insert: {
          created_at?: string
          fuel_load?: number | null
          id?: string
          lap_time?: number | null
          notes?: string | null
          sector_1?: number | null
          sector_2?: number | null
          sector_3?: number | null
          session_type: string
          tire_compound?: string | null
          track_name: string
          updated_at?: string
          user_id: string
          weather_conditions?: string | null
        }
        Update: {
          created_at?: string
          fuel_load?: number | null
          id?: string
          lap_time?: number | null
          notes?: string | null
          sector_1?: number | null
          sector_2?: number | null
          sector_3?: number | null
          session_type?: string
          tire_compound?: string | null
          track_name?: string
          updated_at?: string
          user_id?: string
          weather_conditions?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      user_role: "team_principal" | "race_engineer" | "driver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["team_principal", "race_engineer", "driver"],
    },
  },
} as const
