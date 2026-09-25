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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_template_definitions: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_template_metrics: {
        Row: {
          active_teams: number
          active_users: number
          created_at: string
          id: string
          note: string
          prototypes_created: number
          prototypes_off_bloom: number
          quarter: string
          template_id: string
          updated_at: string
        }
        Insert: {
          active_teams?: number
          active_users?: number
          created_at?: string
          id?: string
          note?: string
          prototypes_created?: number
          prototypes_off_bloom?: number
          quarter: string
          template_id: string
          updated_at?: string
        }
        Update: {
          active_teams?: number
          active_users?: number
          created_at?: string
          id?: string
          note?: string
          prototypes_created?: number
          prototypes_off_bloom?: number
          quarter?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_template_metrics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_template_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      data_change_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      data_source_configs: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          label: string
          source_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          source_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          source_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      figma_adoption_snapshots: {
        Row: {
          captured_at: string
          component_count: number | null
          components: Json
          components_used: number | null
          created_at: string
          detach_rate: number | null
          detaches: number | null
          documentation_coverage: number | null
          documented_count: number | null
          file_key: string
          file_name: string | null
          id: string
          inserts: number | null
          period_end: string
          period_start: string
          quarter: string
          usages: number | null
        }
        Insert: {
          captured_at?: string
          component_count?: number | null
          components?: Json
          components_used?: number | null
          created_at?: string
          detach_rate?: number | null
          detaches?: number | null
          documentation_coverage?: number | null
          documented_count?: number | null
          file_key: string
          file_name?: string | null
          id?: string
          inserts?: number | null
          period_end: string
          period_start: string
          quarter: string
          usages?: number | null
        }
        Update: {
          captured_at?: string
          component_count?: number | null
          components?: Json
          components_used?: number | null
          created_at?: string
          detach_rate?: number | null
          detaches?: number | null
          documentation_coverage?: number | null
          documented_count?: number | null
          file_key?: string
          file_name?: string | null
          id?: string
          inserts?: number | null
          period_end?: string
          period_start?: string
          quarter?: string
          usages?: number | null
        }
        Relationships: []
      }
      ga4_report_snapshots: {
        Row: {
          created_at: string
          id: string
          properties: Json
          range_end: string | null
          range_start: string | null
          raw_payload: Json
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          properties?: Json
          range_end?: string | null
          range_start?: string | null
          raw_payload?: Json
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          properties?: Json
          range_end?: string | null
          range_start?: string | null
          raw_payload?: Json
          source?: string
        }
        Relationships: []
      }
      manual_dataset_columns: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          key: string
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          key: string
          kind?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          key?: string
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_dataset_columns_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "manual_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_dataset_rows: {
        Row: {
          created_at: string
          data: Json
          dataset_id: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          dataset_id: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          dataset_id?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "manual_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_datasets: {
        Row: {
          archived: boolean
          created_at: string
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      manual_metric_values: {
        Row: {
          created_at: string
          id: string
          metric_id: string
          note: string
          period: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_id: string
          note?: string
          period: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_id?: string
          note?: string
          period?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_metric_values_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "manual_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_metrics: {
        Row: {
          aggregation: string
          archived: boolean
          breakdown_views: Json
          created_at: string
          dataset_id: string | null
          description: string
          filter_columns: Json
          id: string
          name: string
          period_column: string
          slug: string
          sort_order: number
          source_field: string
          source_key: string
          source_type: string
          surface: string
          unit: string
          updated_at: string
          value_column: string
        }
        Insert: {
          aggregation?: string
          archived?: boolean
          breakdown_views?: Json
          created_at?: string
          dataset_id?: string | null
          description?: string
          filter_columns?: Json
          id?: string
          name: string
          period_column?: string
          slug: string
          sort_order?: number
          source_field?: string
          source_key?: string
          source_type?: string
          surface?: string
          unit?: string
          updated_at?: string
          value_column?: string
        }
        Update: {
          aggregation?: string
          archived?: boolean
          breakdown_views?: Json
          created_at?: string
          dataset_id?: string | null
          description?: string
          filter_columns?: Json
          id?: string
          name?: string
          period_column?: string
          slug?: string
          sort_order?: number
          source_field?: string
          source_key?: string
          source_type?: string
          surface?: string
          unit?: string
          updated_at?: string
          value_column?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_metrics_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "manual_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          periodicity: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          periodicity?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          periodicity?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      performance_entries: {
        Row: {
          comment: string
          created_at: string
          delivery_rag: string
          discovery_rag: string
          headcount: string
          id: string
          impact_rag: string
          intended_outcomes: string
          main_deliverables: string
          quarter: string
          sort_order: number
          team: string
          updated_at: string
        }
        Insert: {
          comment?: string
          created_at?: string
          delivery_rag?: string
          discovery_rag?: string
          headcount?: string
          id?: string
          impact_rag?: string
          intended_outcomes?: string
          main_deliverables?: string
          quarter: string
          sort_order?: number
          team?: string
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          delivery_rag?: string
          discovery_rag?: string
          headcount?: string
          id?: string
          impact_rag?: string
          intended_outcomes?: string
          main_deliverables?: string
          quarter?: string
          sort_order?: number
          team?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_credentials: {
        Row: {
          name: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          name: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          name?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          id: string
          message: string
          ran_at: string
          row_count: number | null
          source_key: string
          status: string
          triggered_by: string
        }
        Insert: {
          id?: string
          message?: string
          ran_at?: string
          row_count?: number | null
          source_key: string
          status?: string
          triggered_by?: string
        }
        Update: {
          id?: string
          message?: string
          ran_at?: string
          row_count?: number | null
          source_key?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
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
      admin_exists: { Args: never; Returns: boolean }
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      credential_status: {
        Args: never
        Returns: {
          name: string
          updated_at: string
          updated_by: string
        }[]
      }
      delete_credential: { Args: { _name: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_credential: {
        Args: { _name: string; _value: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
