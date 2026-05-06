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
      admin_pin: {
        Row: {
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      balances: {
        Row: {
          amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      boxes_rounds: {
        Row: {
          bet: number
          created_at: string
          id: string
          outcomes: number[]
          picks: number[]
          resolved: boolean
          resolved_at: string | null
          target_count: number
          user_id: string
          win: number
        }
        Insert: {
          bet: number
          created_at?: string
          id?: string
          outcomes: number[]
          picks?: number[]
          resolved?: boolean
          resolved_at?: string | null
          target_count: number
          user_id: string
          win?: number
        }
        Update: {
          bet?: number
          created_at?: string
          id?: string
          outcomes?: number[]
          picks?: number[]
          resolved?: boolean
          resolved_at?: string | null
          target_count?: number
          user_id?: string
          win?: number
        }
        Relationships: []
      }
      crash_rounds: {
        Row: {
          bet: number
          cashed_at: number | null
          crash_point: number
          created_at: string
          id: string
          resolved: boolean
          resolved_at: string | null
          user_id: string
          win: number
        }
        Insert: {
          bet: number
          cashed_at?: number | null
          crash_point: number
          created_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          user_id: string
          win?: number
        }
        Update: {
          bet?: number
          cashed_at?: number | null
          crash_point?: number
          created_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          user_id?: string
          win?: number
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          pix_key: string | null
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pix_key?: string | null
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pix_key?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          game: string | null
          id: string
          note: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          game?: string | null
          id?: string
          note?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          game?: string | null
          id?: string
          note?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      horse_bets: {
        Row: {
          bet: number
          horse: number
          joined_at: string
          room_id: string
          user_email: string | null
          user_id: string
          win: number
        }
        Insert: {
          bet: number
          horse: number
          joined_at?: string
          room_id: string
          user_email?: string | null
          user_id: string
          win?: number
        }
        Update: {
          bet?: number
          horse?: number
          joined_at?: string
          room_id?: string
          user_email?: string | null
          user_id?: string
          win?: number
        }
        Relationships: [
          {
            foreignKeyName: "horse_bets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "horse_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_rooms: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          winner: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          winner?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          winner?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      request_messages: {
        Row: {
          attachment_data_url: string | null
          attachment_name: string | null
          created_at: string
          from_role: string
          id: string
          request_id: string
          request_kind: string
          text: string | null
          user_id: string
        }
        Insert: {
          attachment_data_url?: string | null
          attachment_name?: string | null
          created_at?: string
          from_role: string
          id?: string
          request_id: string
          request_kind: string
          text?: string | null
          user_id: string
        }
        Update: {
          attachment_data_url?: string | null
          attachment_name?: string | null
          created_at?: string
          from_role?: string
          id?: string
          request_id?: string
          request_kind?: string
          text?: string | null
          user_id?: string
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
      war_bets: {
        Row: {
          bet: number
          card: number | null
          joined_at: string
          room_id: string
          user_email: string | null
          user_id: string
          win: number
        }
        Insert: {
          bet: number
          card?: number | null
          joined_at?: string
          room_id: string
          user_email?: string | null
          user_id: string
          win?: number
        }
        Update: {
          bet?: number
          card?: number | null
          joined_at?: string
          room_id?: string
          user_email?: string | null
          user_id?: string
          win?: number
        }
        Relationships: [
          {
            foreignKeyName: "war_bets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "war_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      war_rooms: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          winning_card: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          winning_card?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          winning_card?: number | null
        }
        Relationships: []
      }
      withdraw_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          pix_key: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pix_key: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pix_key?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _charge_bet: {
        Args: { _bet: number; _game: string; _uid: string }
        Returns: number
      }
      _credit_win: {
        Args: { _game: string; _note: string; _uid: string; _win: number }
        Returns: number
      }
      _horse_refund: { Args: { _room_id: string }; Returns: undefined }
      _horse_run: { Args: { _room_id: string }; Returns: undefined }
      _play_slot_internal: {
        Args: { _bet: number; _game: string; _uid: string }
        Returns: Json
      }
      _war_refund: { Args: { _room_id: string }; Returns: undefined }
      _war_run: { Args: { _room_id: string }; Returns: undefined }
      _weighted_symbol: { Args: never; Returns: number }
      admin_adjust_balance: {
        Args: { _delta: number; _note?: string; _user_id: string }
        Returns: number
      }
      admin_list_users: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          is_admin: boolean
          name: string
        }[]
      }
      admin_pin_clear: { Args: never; Returns: undefined }
      admin_pin_is_set: { Args: never; Returns: boolean }
      admin_pin_set: { Args: { _pin: string }; Returns: undefined }
      admin_pin_verify: { Args: { _pin: string }; Returns: boolean }
      admin_resolve_deposit: {
        Args: { _approve: boolean; _id: string }
        Returns: undefined
      }
      admin_resolve_withdraw: {
        Args: { _approve: boolean; _id: string }
        Returns: undefined
      }
      admin_set_deposit_pix: {
        Args: { _id: string; _pix: string }
        Returns: undefined
      }
      boxes_pick: { Args: { _index: number; _round_id: string }; Returns: Json }
      boxes_start: { Args: { _bet: number; _target: number }; Returns: Json }
      crash_cashout: {
        Args: { _at_mult: number; _round_id: string }
        Returns: Json
      }
      crash_reveal: { Args: { _round_id: string }; Returns: Json }
      crash_start: { Args: { _bet: number }; Returns: Json }
      game_play: {
        Args: { _bet: number; _game: string; _note?: string; _win: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      horse_join: { Args: { _bet: number; _horse: number }; Returns: Json }
      horse_tick: { Args: never; Returns: undefined }
      play_coin: { Args: { _bet: number; _pick: string }; Returns: Json }
      play_lucky: { Args: { _bet: number }; Returns: Json }
      play_roulette: {
        Args: { _bet: number; _kind: string; _value: string }
        Returns: Json
      }
      play_slots: { Args: { _bet: number }; Returns: Json }
      play_tiger: { Args: { _bet: number }; Returns: Json }
      realtime_topic_uid: { Args: { _topic: string }; Returns: string }
      request_owner: {
        Args: { _kind: string; _request_id: string }
        Returns: string
      }
      srand: { Args: never; Returns: number }
      war_join: { Args: { _bet: number }; Returns: Json }
      war_tick: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
