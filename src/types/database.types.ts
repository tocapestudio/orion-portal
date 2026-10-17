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
  core: {
    Tables: {
      achievements: {
        Row: {
          code: string
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          code: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          code?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      activity_catalog: {
        Row: {
          active: boolean
          category: string | null
          created_by: string | null
          default_config: Json
          description: string | null
          id: string
          manual_fields_schema: Json | null
          migration_batch_id: string | null
          modality_id: string
          name: string
          nature: string | null
          objective: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_by?: string | null
          default_config?: Json
          description?: string | null
          id?: string
          manual_fields_schema?: Json | null
          migration_batch_id?: string | null
          modality_id: string
          name: string
          nature?: string | null
          objective?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_by?: string | null
          default_config?: Json
          description?: string | null
          id?: string
          manual_fields_schema?: Json | null
          migration_batch_id?: string | null
          modality_id?: string
          name?: string
          nature?: string | null
          objective?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_catalog_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          activity_catalog_id: string
          athlete_id: string
          created_by: string | null
          due_date: string | null
          frequency: string | null
          id: string
          instructions: string | null
          objective: string | null
          planned_duration: string | null
          scheduled_date: string | null
          status: string
          training_plan_id: string | null
        }
        Insert: {
          activity_catalog_id: string
          athlete_id: string
          created_by?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          objective?: string | null
          planned_duration?: string | null
          scheduled_date?: string | null
          status?: string
          training_plan_id?: string | null
        }
        Update: {
          activity_catalog_id?: string
          athlete_id?: string
          created_by?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          objective?: string | null
          planned_duration?: string | null
          scheduled_date?: string | null
          status?: string
          training_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_achievements: {
        Row: {
          achievement_id: string
          athlete_id: string
          earned_at: string
        }
        Insert: {
          achievement_id: string
          athlete_id: string
          earned_at?: string
        }
        Update: {
          achievement_id?: string
          athlete_id?: string
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_achievements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_club: {
        Row: {
          athlete_id: string
          club_id: string
          ended_at: string | null
          id: string
          legacy_player_profile_id: string | null
          migration_batch_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          athlete_id: string
          club_id: string
          ended_at?: string | null
          id?: string
          legacy_player_profile_id?: string | null
          migration_batch_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          athlete_id?: string
          club_id?: string
          ended_at?: string | null
          id?: string
          legacy_player_profile_id?: string | null
          migration_batch_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_club_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_club_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_optical_profile: {
        Row: {
          athlete_id: string
          created_at: string
          evaluation_id: string
          observations: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          evaluation_id: string
          observations?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          evaluation_id?: string
          observations?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_optical_profile_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_optical_profile_acuity: {
        Row: {
          athlete_id: string
          correction_type: string
          distance: string
          evaluation_id: string
          laterality: string
          source: string
          source_evaluation_date: string | null
          source_result_measure_id: string | null
          unit: string
          updated_at: string
          updated_by: string | null
          value_numeric: number | null
        }
        Insert: {
          athlete_id: string
          correction_type: string
          distance: string
          evaluation_id: string
          laterality: string
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
        }
        Update: {
          athlete_id?: string
          correction_type?: string
          distance?: string
          evaluation_id?: string
          laterality?: string
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_optical_profile_acuity_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_acuity_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_acuity_source_result_measure_id_fkey"
            columns: ["source_result_measure_id"]
            isOneToOne: false
            referencedRelation: "evaluation_result_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_acuity_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_optical_profile_keratometry: {
        Row: {
          athlete_id: string
          axis_deg: number | null
          evaluation_id: string
          eye: string
          meridian: string
          power_d: number | null
          radius_mm: number | null
          source: string
          source_evaluation_date: string | null
          source_result_measure_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          athlete_id: string
          axis_deg?: number | null
          evaluation_id: string
          eye: string
          meridian: string
          power_d?: number | null
          radius_mm?: number | null
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          athlete_id?: string
          axis_deg?: number | null
          evaluation_id?: string
          eye?: string
          meridian?: string
          power_d?: number | null
          radius_mm?: number | null
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_optical_profile_keratomet_source_result_measure_id_fkey"
            columns: ["source_result_measure_id"]
            isOneToOne: false
            referencedRelation: "evaluation_result_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_keratometry_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_keratometry_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_keratometry_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_optical_profile_pio: {
        Row: {
          athlete_id: string
          evaluation_id: string
          eye: string
          source: string
          source_evaluation_date: string | null
          source_result_measure_id: string | null
          unit: string
          updated_at: string
          updated_by: string | null
          value_numeric: number | null
        }
        Insert: {
          athlete_id: string
          evaluation_id: string
          eye: string
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
        }
        Update: {
          athlete_id?: string
          evaluation_id?: string
          eye?: string
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_optical_profile_pio_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_pio_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_pio_source_result_measure_id_fkey"
            columns: ["source_result_measure_id"]
            isOneToOne: false
            referencedRelation: "evaluation_result_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_pio_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_optical_profile_prism: {
        Row: {
          athlete_id: string
          axis_deg: number | null
          base: string | null
          component: string
          evaluation_id: string
          eye: string
          magnitude_pd: number | null
          source: string
          source_evaluation_date: string | null
          source_result_measure_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          athlete_id: string
          axis_deg?: number | null
          base?: string | null
          component: string
          evaluation_id: string
          eye: string
          magnitude_pd?: number | null
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          athlete_id?: string
          axis_deg?: number | null
          base?: string | null
          component?: string
          evaluation_id?: string
          eye?: string
          magnitude_pd?: number | null
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_optical_profile_prism_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_prism_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_prism_source_result_measure_id_fkey"
            columns: ["source_result_measure_id"]
            isOneToOne: false
            referencedRelation: "evaluation_result_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_prism_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_optical_profile_refraction: {
        Row: {
          add_vi: number | null
          add_vp: number | null
          athlete_id: string
          axis_deg: number | null
          cylinder: number | null
          evaluation_id: string
          eye: string
          source: string
          source_evaluation_date: string | null
          source_result_measure_id: string | null
          sphere: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          add_vi?: number | null
          add_vp?: number | null
          athlete_id: string
          axis_deg?: number | null
          cylinder?: number | null
          evaluation_id: string
          eye: string
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          sphere?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          add_vi?: number | null
          add_vp?: number | null
          athlete_id?: string
          axis_deg?: number | null
          cylinder?: number | null
          evaluation_id?: string
          eye?: string
          source?: string
          source_evaluation_date?: string | null
          source_result_measure_id?: string | null
          sphere?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_optical_profile_refractio_source_result_measure_id_fkey"
            columns: ["source_result_measure_id"]
            isOneToOne: false
            referencedRelation: "evaluation_result_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_refraction_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_refraction_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_optical_profile_refraction_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_professional: {
        Row: {
          athlete_id: string
          ended_at: string | null
          id: string
          internal_code: string | null
          legacy_player_profile_id: string | null
          legacy_user_id: string | null
          migration_batch_id: string | null
          professional_id: string
          started_at: string
          status: string
        }
        Insert: {
          athlete_id: string
          ended_at?: string | null
          id?: string
          internal_code?: string | null
          legacy_player_profile_id?: string | null
          legacy_user_id?: string | null
          migration_batch_id?: string | null
          professional_id: string
          started_at?: string
          status?: string
        }
        Update: {
          athlete_id?: string
          ended_at?: string | null
          id?: string
          internal_code?: string | null
          legacy_player_profile_id?: string | null
          legacy_user_id?: string | null
          migration_batch_id?: string | null
          professional_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_professional_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_professional_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      athlete_programs: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          program_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          program_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_programs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_team: {
        Row: {
          athlete_id: string
          dorsal: number | null
          ended_at: string | null
          id: string
          position: string | null
          started_at: string
          status: string
          team_id: string
        }
        Insert: {
          athlete_id: string
          dorsal?: number | null
          ended_at?: string | null
          id?: string
          position?: string | null
          started_at?: string
          status?: string
          team_id: string
        }
        Update: {
          athlete_id?: string
          dorsal?: number | null
          ended_at?: string | null
          id?: string
          position?: string | null
          started_at?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_team_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_team_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_work_profile: {
        Row: {
          athlete_id: string
          created_at: string
          notes: string | null
          occupation: string | null
          updated_at: string
          visual_needs: string | null
          work_hours: string | null
          work_shift_type: string | null
          workplace: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          notes?: string | null
          occupation?: string | null
          updated_at?: string
          visual_needs?: string | null
          work_hours?: string | null
          work_shift_type?: string | null
          workplace?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          notes?: string | null
          occupation?: string | null
          updated_at?: string
          visual_needs?: string | null
          work_hours?: string | null
          work_shift_type?: string | null
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_work_profile_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          birth_date: string | null
          created_at: string
          dominant_foot: string | null
          dominant_hand: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          legacy_player_profile_id: string | null
          migration_batch_id: string | null
          notes: string | null
          phone: string | null
          pinned_tests: string[]
          privacy_consent: boolean
          privacy_consent_date: string | null
          profile_image: string | null
          short_id: number
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          dominant_foot?: string | null
          dominant_hand?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          legacy_player_profile_id?: string | null
          migration_batch_id?: string | null
          notes?: string | null
          phone?: string | null
          pinned_tests?: string[]
          privacy_consent?: boolean
          privacy_consent_date?: string | null
          profile_image?: string | null
          short_id?: never
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          dominant_foot?: string | null
          dominant_hand?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          legacy_player_profile_id?: string | null
          migration_batch_id?: string | null
          notes?: string | null
          phone?: string | null
          pinned_tests?: string[]
          privacy_consent?: boolean
          privacy_consent_date?: string | null
          profile_image?: string | null
          short_id?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      board_post_media: {
        Row: {
          board_post_id: string
          caption: string | null
          created_at: string
          id: string
          media_type: string
          position: number
          url: string
        }
        Insert: {
          board_post_id: string
          caption?: string | null
          created_at?: string
          id?: string
          media_type: string
          position?: number
          url: string
        }
        Update: {
          board_post_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_post_media_board_post_id_fkey"
            columns: ["board_post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_posts: {
        Row: {
          athlete_id: string
          author_id: string
          body: string
          expires_at: string | null
          id: string
          pinned: boolean
          priority: string
          published_at: string
          status: string
          type: string
        }
        Insert: {
          athlete_id: string
          author_id: string
          body: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          priority?: string
          published_at?: string
          status?: string
          type?: string
        }
        Update: {
          athlete_id?: string
          author_id?: string
          body?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          priority?: string
          published_at?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_posts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calendar_event_notes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          note: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          note: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          note?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          assignment_id: string | null
          athlete_id: string | null
          club_id: string | null
          created_by: string | null
          end_at: string | null
          evaluation_id: string | null
          id: string
          legacy_calendar_event_id: string | null
          location: string | null
          material: string | null
          migration_batch_id: string | null
          notify: boolean
          session_id: string | null
          show_in_my_agenda: boolean
          start_at: string
          status: string
          title: string
          type: string
        }
        Insert: {
          assignment_id?: string | null
          athlete_id?: string | null
          club_id?: string | null
          created_by?: string | null
          end_at?: string | null
          evaluation_id?: string | null
          id?: string
          legacy_calendar_event_id?: string | null
          location?: string | null
          material?: string | null
          migration_batch_id?: string | null
          notify?: boolean
          session_id?: string | null
          show_in_my_agenda?: boolean
          start_at: string
          status?: string
          title: string
          type: string
        }
        Update: {
          assignment_id?: string | null
          athlete_id?: string | null
          club_id?: string | null
          created_by?: string | null
          end_at?: string | null
          evaluation_id?: string | null
          id?: string
          legacy_calendar_event_id?: string | null
          location?: string | null
          material?: string | null
          migration_batch_id?: string | null
          notify?: boolean
          session_id?: string | null
          show_in_my_agenda?: boolean
          start_at?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          athlete_id: string
          body: string
          created_at: string
          id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          body: string
          created_at?: string
          id?: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          body?: string
          created_at?: string
          id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      club_professional: {
        Row: {
          club_id: string
          ended_at: string | null
          id: string
          legacy_user_id: string | null
          migration_batch_id: string | null
          professional_id: string
          role: string | null
          started_at: string
          status: string
        }
        Insert: {
          club_id: string
          ended_at?: string | null
          id?: string
          legacy_user_id?: string | null
          migration_batch_id?: string | null
          professional_id: string
          role?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          club_id?: string
          ended_at?: string | null
          id?: string
          legacy_user_id?: string | null
          migration_batch_id?: string | null
          professional_id?: string
          role?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_professional_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_professional_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      club_sports: {
        Row: {
          club_id: string
          migration_batch_id: string | null
          sport_id: string
        }
        Insert: {
          club_id: string
          migration_batch_id?: string | null
          sport_id: string
        }
        Update: {
          club_id?: string
          migration_batch_id?: string | null
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_sports_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          legacy_club_id: string | null
          logo_url: string | null
          migration_batch_id: string | null
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          legacy_club_id?: string | null
          logo_url?: string | null
          migration_batch_id?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          legacy_club_id?: string | null
          logo_url?: string | null
          migration_batch_id?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      coaches: {
        Row: {
          bio: string | null
          legacy_user_id: string | null
          migration_batch_id: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          legacy_user_id?: string | null
          migration_batch_id?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          legacy_user_id?: string | null
          migration_batch_id?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          participant_ids: string[]
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_ids: string[]
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_ids?: string[]
          type?: string
        }
        Relationships: []
      }
      device_clubs: {
        Row: {
          club_id: string
          device_id: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          club_id: string
          device_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          club_id?: string
          device_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_clubs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_clubs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          auth_user_id: string | null
          config: Json
          credential_ref: string | null
          firmware_version: string | null
          id: string
          last_seen_at: string | null
          location_note: string | null
          modality_id: string
          model: string | null
          registered_at: string
          serial_number: string
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          config?: Json
          credential_ref?: string | null
          firmware_version?: string | null
          id?: string
          last_seen_at?: string | null
          location_note?: string | null
          modality_id: string
          model?: string | null
          registered_at?: string
          serial_number: string
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          config?: Json
          credential_ref?: string | null
          firmware_version?: string | null
          id?: string
          last_seen_at?: string | null
          location_note?: string | null
          modality_id?: string
          model?: string | null
          registered_at?: string
          serial_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_result_measures: {
        Row: {
          axis: string | null
          component: string | null
          correction: string | null
          created_at: string
          distance: string | null
          evaluation_result_id: string
          id: string
          laterality: string | null
          measurement_unit: string | null
          notes: string | null
          sense: string | null
          template_measure_id: string
          value_category: string | null
          value_numeric: number | null
        }
        Insert: {
          axis?: string | null
          component?: string | null
          correction?: string | null
          created_at?: string
          distance?: string | null
          evaluation_result_id: string
          id?: string
          laterality?: string | null
          measurement_unit?: string | null
          notes?: string | null
          sense?: string | null
          template_measure_id: string
          value_category?: string | null
          value_numeric?: number | null
        }
        Update: {
          axis?: string | null
          component?: string | null
          correction?: string | null
          created_at?: string
          distance?: string | null
          evaluation_result_id?: string
          id?: string
          laterality?: string | null
          measurement_unit?: string | null
          notes?: string | null
          sense?: string | null
          template_measure_id?: string
          value_category?: string | null
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_result_measures_evaluation_result_id_fkey"
            columns: ["evaluation_result_id"]
            isOneToOne: false
            referencedRelation: "evaluation_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_result_measures_template_measure_id_fkey"
            columns: ["template_measure_id"]
            isOneToOne: false
            referencedRelation: "evaluation_template_measures"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_results: {
        Row: {
          created_at: string
          custom_percentages: Json | null
          custom_total: number | null
          custom_values: Json | null
          evaluation_id: string
          evaluation_template_id: string
          failure_count: number | null
          id: string
          legacy_test_result_id: string | null
          measurement_unit: string | null
          migration_batch_id: string | null
          notes: string | null
          primary_variable_value: number | null
          rep_average: number | null
          rep_best: number | null
          rep_count: number | null
          rep_worst: number | null
          repetitions: Json | null
          success_count: number | null
          success_rate: number | null
          value_binocular: number | null
          value_od: number | null
          value_os: number | null
        }
        Insert: {
          created_at?: string
          custom_percentages?: Json | null
          custom_total?: number | null
          custom_values?: Json | null
          evaluation_id: string
          evaluation_template_id: string
          failure_count?: number | null
          id?: string
          legacy_test_result_id?: string | null
          measurement_unit?: string | null
          migration_batch_id?: string | null
          notes?: string | null
          primary_variable_value?: number | null
          rep_average?: number | null
          rep_best?: number | null
          rep_count?: number | null
          rep_worst?: number | null
          repetitions?: Json | null
          success_count?: number | null
          success_rate?: number | null
          value_binocular?: number | null
          value_od?: number | null
          value_os?: number | null
        }
        Update: {
          created_at?: string
          custom_percentages?: Json | null
          custom_total?: number | null
          custom_values?: Json | null
          evaluation_id?: string
          evaluation_template_id?: string
          failure_count?: number | null
          id?: string
          legacy_test_result_id?: string | null
          measurement_unit?: string | null
          migration_batch_id?: string | null
          notes?: string | null
          primary_variable_value?: number | null
          rep_average?: number | null
          rep_best?: number | null
          rep_count?: number | null
          rep_worst?: number | null
          repetitions?: Json | null
          success_count?: number | null
          success_rate?: number | null
          value_binocular?: number | null
          value_od?: number | null
          value_os?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_results_evaluation_template_id_fkey"
            columns: ["evaluation_template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_template_measures: {
        Row: {
          allowed_categories: string[] | null
          component_options: string[] | null
          created_at: string
          display_order: number | null
          evaluation_template_id: string
          id: string
          is_primary: boolean
          measurement_unit: string | null
          name: string
          needs_component: boolean
          needs_correction: boolean
          needs_direction: boolean
          needs_distance: boolean
          needs_laterality: boolean
          value_type: string
        }
        Insert: {
          allowed_categories?: string[] | null
          component_options?: string[] | null
          created_at?: string
          display_order?: number | null
          evaluation_template_id: string
          id?: string
          is_primary?: boolean
          measurement_unit?: string | null
          name: string
          needs_component?: boolean
          needs_correction?: boolean
          needs_direction?: boolean
          needs_distance?: boolean
          needs_laterality?: boolean
          value_type: string
        }
        Update: {
          allowed_categories?: string[] | null
          component_options?: string[] | null
          created_at?: string
          display_order?: number | null
          evaluation_template_id?: string
          id?: string
          is_primary?: boolean
          measurement_unit?: string | null
          name?: string
          needs_component?: boolean
          needs_correction?: boolean
          needs_direction?: boolean
          needs_distance?: boolean
          needs_laterality?: boolean
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_template_measures_evaluation_template_id_fkey"
            columns: ["evaluation_template_id"]
            isOneToOne: false
            referencedRelation: "evaluation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          created_at: string
          created_by: string | null
          custom_variables: Json | null
          description: string | null
          has_custom_variables: boolean
          has_repetitions: boolean
          id: string
          is_composite: boolean
          is_default: boolean
          legacy_test_template_id: string | null
          lower_is_better: boolean
          max_value: number | null
          measurement_unit: string | null
          migration_batch_id: string | null
          min_value: number | null
          name: string
          nature: string | null
          normal_range: string | null
          optimal_range_max: number | null
          optimal_range_min: number | null
          repetition_count: number | null
          requires_od_os_binocular: boolean
          test_type: string | null
          track_laterality: boolean
          track_success: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_variables?: Json | null
          description?: string | null
          has_custom_variables?: boolean
          has_repetitions?: boolean
          id?: string
          is_composite?: boolean
          is_default?: boolean
          legacy_test_template_id?: string | null
          lower_is_better?: boolean
          max_value?: number | null
          measurement_unit?: string | null
          migration_batch_id?: string | null
          min_value?: number | null
          name: string
          nature?: string | null
          normal_range?: string | null
          optimal_range_max?: number | null
          optimal_range_min?: number | null
          repetition_count?: number | null
          requires_od_os_binocular?: boolean
          test_type?: string | null
          track_laterality?: boolean
          track_success?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_variables?: Json | null
          description?: string | null
          has_custom_variables?: boolean
          has_repetitions?: boolean
          id?: string
          is_composite?: boolean
          is_default?: boolean
          legacy_test_template_id?: string | null
          lower_is_better?: boolean
          max_value?: number | null
          measurement_unit?: string | null
          migration_batch_id?: string | null
          min_value?: number | null
          name?: string
          nature?: string | null
          normal_range?: string | null
          optimal_range_max?: number | null
          optimal_range_min?: number | null
          repetition_count?: number | null
          requires_od_os_binocular?: boolean
          test_type?: string | null
          track_laterality?: boolean
          track_success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      evaluations: {
        Row: {
          athlete_id: string
          date: string
          id: string
          is_shared_with_athlete: boolean
          is_shared_with_coach: boolean
          migration_batch_id: string | null
          nature: string
          notes: string | null
          professional_id: string
          protocol: string | null
          results: Json | null
          status: string
        }
        Insert: {
          athlete_id: string
          date?: string
          id?: string
          is_shared_with_athlete?: boolean
          is_shared_with_coach?: boolean
          migration_batch_id?: string | null
          nature: string
          notes?: string | null
          professional_id: string
          protocol?: string | null
          results?: Json | null
          status?: string
        }
        Update: {
          athlete_id?: string
          date?: string
          id?: string
          is_shared_with_athlete?: boolean
          is_shared_with_coach?: boolean
          migration_batch_id?: string | null
          nature?: string
          notes?: string | null
          professional_id?: string
          protocol?: string | null
          results?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      goals: {
        Row: {
          athlete_id: string
          created_at: string
          current_progress: number | null
          description: string | null
          evaluation_id: string | null
          goal_type: string
          id: string
          legacy_player_goal_id: string | null
          migration_batch_id: string | null
          professional_id: string
          progress_mode: string
          status: string
          target_date: string | null
          target_metric_key: string | null
          target_value: number | null
          title: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          current_progress?: number | null
          description?: string | null
          evaluation_id?: string | null
          goal_type?: string
          id?: string
          legacy_player_goal_id?: string | null
          migration_batch_id?: string | null
          professional_id: string
          progress_mode?: string
          status?: string
          target_date?: string | null
          target_metric_key?: string | null
          target_value?: number | null
          title: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          current_progress?: number | null
          description?: string | null
          evaluation_id?: string | null
          goal_type?: string
          id?: string
          legacy_player_goal_id?: string | null
          migration_batch_id?: string | null
          professional_id?: string
          progress_mode?: string
          status?: string
          target_date?: string | null
          target_metric_key?: string | null
          target_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invitations: {
        Row: {
          athlete_id: string
          code: string
          created_by: string | null
          expires_at: string | null
          id: string
          revoked_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          athlete_id: string
          code?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          athlete_id?: string
          code?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          id: string
          read_at: string | null
          sender_id: string
          sent_at: string
        }
        Insert: {
          body: string
          conversation_id: string
          id?: string
          read_at?: string | null
          sender_id: string
          sent_at?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          id: string
          label: string
          requires_device: boolean
        }
        Insert: {
          id: string
          label: string
          requires_device?: boolean
        }
        Update: {
          id?: string
          label?: string
          requires_device?: boolean
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          athlete_id: string
          awarded_by: string | null
          created_at: string
          id: string
          points: number
          reason: string | null
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          athlete_id: string
          awarded_by?: string | null
          created_at?: string
          id?: string
          points: number
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          athlete_id?: string
          awarded_by?: string | null
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      prisma_guardian_invitations: {
        Row: {
          code: string
          created_by: string | null
          expires_at: string | null
          guardian_id: string
          id: string
          revoked_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          created_by?: string | null
          expires_at?: string | null
          guardian_id: string
          id?: string
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_by?: string | null
          expires_at?: string | null
          guardian_id?: string
          id?: string
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prisma_guardian_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardian_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardian_invitations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "prisma_guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardian_invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardian_invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prisma_guardian_notes: {
        Row: {
          athlete_id: string
          created_at: string
          guardian_id: string
          id: string
          note: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          guardian_id: string
          id?: string
          note: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          guardian_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "prisma_guardian_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardian_notes_guardian_id_athlete_id_fkey"
            columns: ["guardian_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "prisma_guardians"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "prisma_guardian_notes_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "prisma_guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      prisma_guardians: {
        Row: {
          athlete_id: string
          can_pickup: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary_contact: boolean
          phone: string | null
          relationship: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          athlete_id: string
          can_pickup?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary_contact?: boolean
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          athlete_id?: string
          can_pickup?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary_contact?: boolean
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prisma_guardians_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prisma_professional_notes: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          note: string
          professional_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          note: string
          professional_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          note?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prisma_professional_notes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prisma_professional_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      prisma_profile: {
        Row: {
          athlete_id: string
          consultation_reason: string | null
          created_at: string
          estimated_duration: string | null
          needs_school_coordination: boolean
          nickname: string | null
          plan_notes: string | null
          prior_diagnoses: string | null
          process_status: string
          referral_date: string | null
          referral_reference: string | null
          referred_by: string | null
          reported_symptoms: string | null
          school_contact: string | null
          school_grade: string | null
          school_name: string | null
          school_reported_difficulties: string | null
          session_considerations: string | null
          therapy_frequency: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          consultation_reason?: string | null
          created_at?: string
          estimated_duration?: string | null
          needs_school_coordination?: boolean
          nickname?: string | null
          plan_notes?: string | null
          prior_diagnoses?: string | null
          process_status?: string
          referral_date?: string | null
          referral_reference?: string | null
          referred_by?: string | null
          reported_symptoms?: string | null
          school_contact?: string | null
          school_grade?: string | null
          school_name?: string | null
          school_reported_difficulties?: string | null
          session_considerations?: string | null
          therapy_frequency?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          consultation_reason?: string | null
          created_at?: string
          estimated_duration?: string | null
          needs_school_coordination?: boolean
          nickname?: string | null
          plan_notes?: string | null
          prior_diagnoses?: string | null
          process_status?: string
          referral_date?: string | null
          referral_reference?: string | null
          referred_by?: string | null
          reported_symptoms?: string | null
          school_contact?: string | null
          school_grade?: string | null
          school_name?: string | null
          school_reported_difficulties?: string | null
          session_considerations?: string | null
          therapy_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prisma_profile_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          bio: string | null
          legacy_user_id: string | null
          license_number: string | null
          migration_batch_id: string | null
          organization: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          legacy_user_id?: string | null
          license_number?: string | null
          migration_batch_id?: string | null
          organization?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          legacy_user_id?: string | null
          license_number?: string | null
          migration_batch_id?: string | null
          organization?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          migration_batch_id: string | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          migration_batch_id?: string | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          migration_batch_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          active: boolean
          description: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          description?: string | null
          id: string
          label: string
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      research_dataset: {
        Row: {
          activity_modality: string | null
          age_range: string | null
          created_at: string
          id: string
          metric_type: string | null
          metric_value: number | null
          period_bucket: string | null
          research_subject_id: string
          sex: string | null
          sport: string | null
        }
        Insert: {
          activity_modality?: string | null
          age_range?: string | null
          created_at?: string
          id?: string
          metric_type?: string | null
          metric_value?: number | null
          period_bucket?: string | null
          research_subject_id: string
          sex?: string | null
          sport?: string | null
        }
        Update: {
          activity_modality?: string | null
          age_range?: string | null
          created_at?: string
          id?: string
          metric_type?: string | null
          metric_value?: number | null
          period_bucket?: string | null
          research_subject_id?: string
          sex?: string | null
          sport?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_dataset_research_subject_id_fkey"
            columns: ["research_subject_id"]
            isOneToOne: false
            referencedRelation: "research_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_subjects: {
        Row: {
          athlete_id: string
          id: string
        }
        Insert: {
          athlete_id: string
          id?: string
        }
        Update: {
          athlete_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_subjects_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          accuracy_percent: number | null
          created_by: string | null
          errors_count: number | null
          generated_at: string
          hit: boolean | null
          id: string
          idempotency_key: string | null
          metrics: Json
          migration_batch_id: string | null
          raw_data: Json | null
          reaction_time_ms: number | null
          session_activity_id: string
          source: string
          total_trials: number | null
        }
        Insert: {
          accuracy_percent?: number | null
          created_by?: string | null
          errors_count?: number | null
          generated_at?: string
          hit?: boolean | null
          id?: string
          idempotency_key?: string | null
          metrics?: Json
          migration_batch_id?: string | null
          raw_data?: Json | null
          reaction_time_ms?: number | null
          session_activity_id: string
          source: string
          total_trials?: number | null
        }
        Update: {
          accuracy_percent?: number | null
          created_by?: string | null
          errors_count?: number | null
          generated_at?: string
          hit?: boolean | null
          id?: string
          idempotency_key?: string | null
          metrics?: Json
          migration_batch_id?: string | null
          raw_data?: Json | null
          reaction_time_ms?: number | null
          session_activity_id?: string
          source?: string
          total_trials?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_session_activity_id_fkey"
            columns: ["session_activity_id"]
            isOneToOne: false
            referencedRelation: "session_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          resource: string
          role_id: string
        }
        Insert: {
          action: string
          resource: string
          role_id: string
        }
        Update: {
          action?: string
          resource?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      session_activities: {
        Row: {
          activity_catalog_id: string
          actual_duration: string | null
          assignment_id: string | null
          config_used: Json
          device_id: string | null
          id: string
          idempotency_key: string | null
          migration_batch_id: string | null
          nature: string
          notes: string | null
          order_index: number
          planned_duration: string | null
          rating: number | null
          session_id: string
          status: string
        }
        Insert: {
          activity_catalog_id: string
          actual_duration?: string | null
          assignment_id?: string | null
          config_used?: Json
          device_id?: string | null
          id?: string
          idempotency_key?: string | null
          migration_batch_id?: string | null
          nature: string
          notes?: string | null
          order_index?: number
          planned_duration?: string | null
          rating?: number | null
          session_id: string
          status?: string
        }
        Update: {
          activity_catalog_id?: string
          actual_duration?: string | null
          assignment_id?: string | null
          config_used?: Json
          device_id?: string | null
          id?: string
          idempotency_key?: string | null
          migration_batch_id?: string | null
          nature?: string
          notes?: string | null
          order_index?: number
          planned_duration?: string | null
          rating?: number | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_activities_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activities_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activities_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activities_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_activities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          athlete_id: string
          device_id: string | null
          ended_at: string | null
          id: string
          idempotency_key: string | null
          initiated_by: string
          location: string | null
          migration_batch_id: string | null
          notes: string | null
          professional_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          athlete_id: string
          device_id?: string | null
          ended_at?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_by: string
          location?: string | null
          migration_batch_id?: string | null
          notes?: string | null
          professional_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          athlete_id?: string
          device_id?: string | null
          ended_at?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_by?: string
          location?: string | null
          migration_batch_id?: string | null
          notes?: string | null
          professional_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sports: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_coach: {
        Row: {
          coach_id: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          team_id: string
        }
        Insert: {
          coach_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          team_id: string
        }
        Update: {
          coach_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coach_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_coach_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category: string | null
          club_id: string
          id: string
          league: string | null
          name: string
          sport_id: string
        }
        Insert: {
          category?: string | null
          club_id: string
          id?: string
          league?: string | null
          name: string
          sport_id: string
        }
        Update: {
          category?: string | null
          club_id?: string
          id?: string
          league?: string | null
          name?: string
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          athlete_id: string
          description: string | null
          end_date: string | null
          goal_id: string | null
          id: string
          professional_id: string
          start_date: string | null
          status: string
          title: string
        }
        Insert: {
          athlete_id: string
          description?: string | null
          end_date?: string | null
          goal_id?: string | null
          id?: string
          professional_id: string
          start_date?: string | null
          status?: string
          title: string
        }
        Update: {
          athlete_id?: string
          description?: string | null
          end_date?: string | null
          goal_id?: string | null
          id?: string
          professional_id?: string
          start_date?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          migration_batch_id: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          migration_batch_id?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          migration_batch_id?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      devices_directory: {
        Row: {
          config: Json | null
          firmware_version: string | null
          id: string | null
          last_seen_at: string | null
          modality_id: string | null
          model: string | null
          registered_at: string | null
          serial_number: string | null
          status: string | null
        }
        Insert: {
          config?: Json | null
          firmware_version?: string | null
          id?: string | null
          last_seen_at?: string | null
          modality_id?: string | null
          model?: string | null
          registered_at?: string | null
          serial_number?: string | null
          status?: string | null
        }
        Update: {
          config?: Json | null
          firmware_version?: string | null
          id?: string | null
          last_seen_at?: string | null
          modality_id?: string | null
          model?: string | null
          registered_at?: string | null
          serial_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_directory: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      athlete_id_of_session_activity: {
        Args: { p_id: string }
        Returns: string
      }
      auth_has_role: { Args: { check_role: string }; Returns: boolean }
      board_media_visible_to_self: {
        Args: { object_name: string }
        Returns: boolean
      }
      check_guardian_invitation: {
        Args: { p_code: string }
        Returns: {
          athlete_name: string
          guardian_name: string
          professional_name: string
          status: string
          valid: boolean
        }[]
      }
      check_invitation: {
        Args: { p_code: string }
        Returns: {
          athlete_name: string
          professional_name: string
          status: string
          valid: boolean
        }[]
      }
      current_device_id: { Args: never; Returns: string }
      evaluation_template_measure_has_results: {
        Args: { measure_id: string }
        Returns: boolean
      }
      is_coach_of_athlete: { Args: { p_athlete_id: string }; Returns: boolean }
      is_coach_of_team: { Args: { p_team_id: string }; Returns: boolean }
      is_guardian_of_athlete: {
        Args: { p_athlete_id: string }
        Returns: boolean
      }
      is_professional_of_athlete: {
        Args: { p_athlete_id: string }
        Returns: boolean
      }
      is_professional_of_club: { Args: { p_club_id: string }; Returns: boolean }
      is_self_athlete: { Args: { p_athlete_id: string }; Returns: boolean }
      redeem_guardian_invitation: { Args: { p_code: string }; Returns: string }
      redeem_invitation: { Args: { p_code: string }; Returns: string }
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
  core: {
    Enums: {},
  },
} as const
