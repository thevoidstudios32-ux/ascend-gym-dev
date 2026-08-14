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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      battle_entries: {
        Row: {
          battles: number
          best_rank: number | null
          category: string
          created_at: string
          description: string | null
          id: string
          losses: number
          media_path: string
          media_type: string
          season: string | null
          status: string
          updated_at: string
          user_id: string
          video_verified: boolean
          wins: number
        }
        Insert: {
          battles?: number
          best_rank?: number | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          losses?: number
          media_path: string
          media_type?: string
          season?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_verified?: boolean
          wins?: number
        }
        Update: {
          battles?: number
          best_rank?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          losses?: number
          media_path?: string
          media_type?: string
          season?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_verified?: boolean
          wins?: number
        }
        Relationships: []
      }
      battle_votes: {
        Row: {
          category: string
          created_at: string
          id: string
          loser_entry_id: string
          season: string | null
          voter_id: string
          winner_entry_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          loser_entry_id: string
          season?: string | null
          voter_id: string
          winner_entry_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          loser_entry_id?: string
          season?: string | null
          voter_id?: string
          winner_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_votes_loser_entry_id_fkey"
            columns: ["loser_entry_id"]
            isOneToOne: false
            referencedRelation: "battle_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_winner_entry_id_fkey"
            columns: ["winner_entry_id"]
            isOneToOne: false
            referencedRelation: "battle_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          arm_cm: number | null
          chest_cm: number | null
          created_at: string
          date: string
          hip_cm: number | null
          id: string
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
        }
        Insert: {
          arm_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hip_cm?: number | null
          id?: string
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
        }
        Update: {
          arm_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hip_cm?: number | null
          id?: string
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          score?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          metric: string
          owner_id: string
          starts_on: string
          title: string
        }
        Insert: {
          created_at?: string
          ends_on?: string
          id?: string
          metric?: string
          owner_id: string
          starts_on?: string
          title: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          metric?: string
          owner_id?: string
          starts_on?: string
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          active: boolean
          admin_only: boolean
          builtin: boolean
          category: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          emoji: string | null
          glow: string | null
          gradient: string | null
          id: string
          image_position: string | null
          image_url: string | null
          kind: string
          name: string
          rarity: string
          slug: string
          sort_order: number
          unlock_label: string | null
          unlock_type: string
          unlock_value: number | null
          updated_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          admin_only?: boolean
          builtin?: boolean
          category?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          emoji?: string | null
          glow?: string | null
          gradient?: string | null
          id?: string
          image_position?: string | null
          image_url?: string | null
          kind: string
          name: string
          rarity?: string
          slug: string
          sort_order?: number
          unlock_label?: string | null
          unlock_type?: string
          unlock_value?: number | null
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          admin_only?: boolean
          builtin?: boolean
          category?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          emoji?: string | null
          glow?: string | null
          gradient?: string | null
          id?: string
          image_position?: string | null
          image_url?: string | null
          kind?: string
          name?: string
          rarity?: string
          slug?: string
          sort_order?: number
          unlock_label?: string | null
          unlock_type?: string
          unlock_value?: number | null
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      custom_workout_versions: {
        Row: {
          created_at: string
          exercises: Json
          focus: string
          id: string
          name: string
          notes: string | null
          reason: string | null
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercises?: Json
          focus?: string
          id?: string
          name: string
          notes?: string | null
          reason?: string | null
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercises?: Json
          focus?: string
          id?: string
          name?: string
          notes?: string | null
          reason?: string | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_workout_versions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "custom_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_workouts: {
        Row: {
          created_at: string
          difficulty: string
          emoji: string
          exercises: Json
          focus: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          emoji?: string
          exercises?: Json
          focus?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          emoji?: string
          exercises?: Json
          focus?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment: Json | null
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment?: Json | null
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment?: Json | null
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          created_at: string
          date: string
          exercise: string
          id: string
          reps: number
          set_index: number
          user_id: string
          weight_kg: number
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          exercise: string
          id?: string
          reps?: number
          set_index?: number
          user_id: string
          weight_kg?: number
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          exercise?: string
          id?: string
          reps?: number
          set_index?: number
          user_id?: string
          weight_kg?: number
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_exercises: {
        Row: {
          created_at: string
          exercise: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          login_at: string
          login_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_at?: string
          login_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_at?: string
          login_date?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          carbs: number
          created_at: string
          date: string
          fat: number
          id: string
          kcal: number
          name: string
          protein: number
          user_id: string
        }
        Insert: {
          carbs?: number
          created_at?: string
          date?: string
          fat?: number
          id?: string
          kcal?: number
          name: string
          protein?: number
          user_id: string
        }
        Update: {
          carbs?: number
          created_at?: string
          date?: string
          fat?: number
          id?: string
          kcal?: number
          name?: string
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_path: string | null
          kind: string
          meta: Json
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          kind?: string
          meta?: Json
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          kind?: string
          meta?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          banner_id: string
          bio: string | null
          created_at: string
          days_per_week: number
          equipment: string[]
          equipped_title_id: string | null
          experience: string
          first_login_at: string | null
          goal: string
          gym: string | null
          height_cm: number | null
          id: string
          injuries: string | null
          is_public: boolean
          last_login_at: string | null
          last_seen_at: string | null
          login_count: number
          name: string
          onboarded: boolean
          training_since: string | null
          updated_at: string
          username: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          weight_kg: number | null
          xp: number
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          banner_id?: string
          bio?: string | null
          created_at?: string
          days_per_week?: number
          equipment?: string[]
          equipped_title_id?: string | null
          experience?: string
          first_login_at?: string | null
          goal?: string
          gym?: string | null
          height_cm?: number | null
          id: string
          injuries?: string | null
          is_public?: boolean
          last_login_at?: string | null
          last_seen_at?: string | null
          login_count?: number
          name?: string
          onboarded?: boolean
          training_since?: string | null
          updated_at?: string
          username?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          weight_kg?: number | null
          xp?: number
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          banner_id?: string
          bio?: string | null
          created_at?: string
          days_per_week?: number
          equipment?: string[]
          equipped_title_id?: string | null
          experience?: string
          first_login_at?: string | null
          goal?: string
          gym?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          is_public?: boolean
          last_login_at?: string | null
          last_seen_at?: string | null
          login_count?: number
          name?: string
          onboarded?: boolean
          training_since?: string | null
          updated_at?: string
          username?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          weight_kg?: number | null
          xp?: number
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          analysis: string | null
          created_at: string
          date: string
          id: string
          path: string
          pose: string
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          date?: string
          id?: string
          path: string
          pose?: string
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          date?: string
          id?: string
          path?: string
          pose?: string
          user_id?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          achieved_on: string
          created_at: string
          exercise: string
          id: string
          reps: number
          user_id: string
          weight_kg: number
        }
        Insert: {
          achieved_on?: string
          created_at?: string
          exercise: string
          id?: string
          reps?: number
          user_id: string
          weight_kg: number
        }
        Update: {
          achieved_on?: string
          created_at?: string
          exercise?: string
          id?: string
          reps?: number
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      stories: {
        Row: {
          bg: string
          content: string | null
          created_at: string
          expires_at: string
          id: string
          kind: string
          location: string | null
          media_path: string | null
          media_type: string | null
          meta: Json
          sticker: string | null
          user_id: string
        }
        Insert: {
          bg?: string
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          location?: string | null
          media_path?: string | null
          media_type?: string | null
          meta?: Json
          sticker?: string | null
          user_id: string
        }
        Update: {
          bg?: string
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          location?: string | null
          media_path?: string | null
          media_type?: string | null
          meta?: Json
          sticker?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          reaction: string | null
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction?: string | null
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
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
      user_titles: {
        Row: {
          created_at: string
          id: string
          reward_shown: boolean
          title_id: string
          unlocked_at: string
          updated_at: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          id?: string
          reward_shown?: boolean
          title_id: string
          unlocked_at?: string
          updated_at?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          id?: string
          reward_shown?: boolean
          title_id?: string
          unlocked_at?: string
          updated_at?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          ml: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          ml?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ml?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories: number
          created_at: string
          date: string
          duration_min: number
          id: string
          kind: string
          title: string
          user_id: string
          xp: number
        }
        Insert: {
          calories?: number
          created_at?: string
          date?: string
          duration_min?: number
          id?: string
          kind?: string
          title?: string
          user_id: string
          xp?: number
        }
        Update: {
          calories?: number
          created_at?: string
          date?: string
          duration_min?: number
          id?: string
          kind?: string
          title?: string
          user_id?: string
          xp?: number
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
      is_verified: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
