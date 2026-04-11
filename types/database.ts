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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          building_id: string
          created_by: string | null
          expires_at: string | null
          id: string
          published_at: string | null
          target: string | null
          title: string
        }
        Insert: {
          body: string
          building_id: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          target?: string | null
          title: string
        }
        Update: {
          body?: string
          building_id?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string | null
          target?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_owners: {
        Row: {
          apartment_id: string
          id: string
          is_primary: boolean | null
          move_in_date: string | null
          move_out_date: string | null
          profile_id: string
        }
        Insert: {
          apartment_id: string
          id?: string
          is_primary?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          profile_id: string
        }
        Update: {
          apartment_id?: string
          id?: string
          is_primary?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_owners_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string
          created_at: string | null
          floor: number | null
          id: string
          status: string | null
          unit_number: string
          updated_at: string | null
        }
        Insert: {
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id: string
          created_at?: string | null
          floor?: number | null
          id?: string
          status?: string | null
          unit_number: string
          updated_at?: string | null
        }
        Update: {
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string
          created_at?: string | null
          floor?: number | null
          id?: string
          status?: string | null
          unit_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apartments_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          building_id: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          building_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          building_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          space_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          space_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          space_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blackout_dates: {
        Row: {
          date: string
          end_time: string | null
          id: string
          reason: string | null
          space_id: string
          start_time: string | null
        }
        Insert: {
          date: string
          end_time?: string | null
          id?: string
          reason?: string | null
          space_id: string
          start_time?: string | null
        }
        Update: {
          date?: string
          end_time?: string | null
          id?: string
          reason?: string | null
          space_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blackout_dates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          bank_account_info: Json | null
          created_at: string | null
          id: string
          name: string
          payment_deadline_hours: number | null
          timezone: string | null
          total_units: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account_info?: Json | null
          created_at?: string | null
          id?: string
          name: string
          payment_deadline_hours?: number | null
          timezone?: string | null
          total_units?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account_info?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          payment_deadline_hours?: number | null
          timezone?: string | null
          total_units?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          amount: number
          apartment_id: string
          building_id: string
          created_at: string | null
          created_by: string | null
          due_date: string
          fee_type_id: string
          id: string
          notes: string | null
          period_month: number
          period_year: number
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          apartment_id: string
          building_id: string
          created_at?: string | null
          created_by?: string | null
          due_date: string
          fee_type_id: string
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          apartment_id?: string
          building_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string
          fee_type_id?: string
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          building_id: string
          category: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean | null
          mime_type: string | null
          previous_version_id: string | null
          target: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          building_id: string
          category: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          previous_version_id?: string | null
          target?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          building_id?: string
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          previous_version_id?: string | null
          target?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string | null
          id: string
          maintenance_updates: boolean | null
          new_announcements: boolean | null
          new_charges: boolean | null
          overdue_reminders: boolean | null
          updated_at: string | null
          user_id: string
          visitor_checkins: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          maintenance_updates?: boolean | null
          new_announcements?: boolean | null
          new_charges?: boolean | null
          overdue_reminders?: boolean | null
          updated_at?: string | null
          user_id: string
          visitor_checkins?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          maintenance_updates?: boolean | null
          new_announcements?: boolean | null
          new_charges?: boolean | null
          overdue_reminders?: boolean | null
          updated_at?: string | null
          user_id?: string
          visitor_checkins?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          building_id: string
          category: string
          created_at: string | null
          default_amount: number
          description: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          building_id: string
          category: string
          created_at?: string | null
          default_amount: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          building_id?: string
          category?: string
          created_at?: string | null
          default_amount?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      infractions: {
        Row: {
          building_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          occurred_at: string
          profile_id: string
          severity: string
          space_id: string | null
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          occurred_at?: string
          profile_id: string
          severity?: string
          space_id?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          occurred_at?: string
          profile_id?: string
          severity?: string
          space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infractions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_comments: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          request_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          request_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          apartment_id: string | null
          assigned_at: string | null
          assigned_to: string | null
          building_id: string
          category: string
          closed_at: string | null
          created_at: string | null
          description: string
          id: string
          photos: string[] | null
          priority: string
          reference_code: string
          requested_by: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          apartment_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          building_id: string
          category: string
          closed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          photos?: string[] | null
          priority?: string
          reference_code: string
          requested_by: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          apartment_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          building_id?: string
          category?: string
          closed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          photos?: string[] | null
          priority?: string
          reference_code?: string
          requested_by?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          apartment_id: string
          building_id: string
          carrier: string | null
          created_at: string | null
          description: string
          id: string
          notes: string | null
          picked_up_at: string | null
          picked_up_by: string | null
          received_at: string | null
          received_by: string | null
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          apartment_id: string
          building_id: string
          carrier?: string | null
          created_at?: string | null
          description: string
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          picked_up_by?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          apartment_id?: string
          building_id?: string
          carrier?: string | null
          created_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          picked_up_at?: string | null
          picked_up_by?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_picked_up_by_fkey"
            columns: ["picked_up_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          apartment_id: string
          building_id: string
          charge_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          proof_url: string | null
          recorded_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          apartment_id: string
          building_id: string
          charge_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          proof_url?: string | null
          recorded_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          apartment_id?: string
          building_id?: string
          charge_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          proof_url?: string | null
          recorded_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          apartment_id: string | null
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          apartment_id?: string | null
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          apartment_id?: string | null
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          building_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          is_anonymous: boolean | null
          poll_type: string
          starts_at: string
          status: string
          target: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          building_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          is_anonymous?: boolean | null
          poll_type?: string
          starts_at?: string
          status?: string
          target?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          is_anonymous?: boolean | null
          poll_type?: string
          starts_at?: string
          status?: string
          target?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          building_id: string
          created_at: string | null
          email: string
          emergency_contact: Json | null
          full_name: string
          id: string
          is_active: boolean | null
          national_id: string | null
          phone: string | null
          preferred_locale: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          building_id: string
          created_at?: string | null
          email: string
          emergency_contact?: Json | null
          full_name: string
          id: string
          is_active?: boolean | null
          national_id?: string | null
          phone?: string | null
          preferred_locale?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          building_id?: string
          created_at?: string | null
          email?: string
          emergency_contact?: Json | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          national_id?: string | null
          phone?: string | null
          preferred_locale?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      public_spaces: {
        Row: {
          allow_reservations: boolean | null
          building_id: string
          cancellation_hours: number | null
          capacity: number | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          gap_minutes: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          max_advance_days: number | null
          max_duration_hours: number | null
          max_hours_per_day_per_user: number | null
          max_hours_per_month_per_user: number | null
          max_hours_per_week_per_user: number | null
          max_monthly_per_owner: number | null
          min_advance_hours: number | null
          name: string
          photos: string[] | null
          updated_at: string | null
        }
        Insert: {
          allow_reservations?: boolean | null
          building_id: string
          cancellation_hours?: number | null
          capacity?: number | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          gap_minutes?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          max_advance_days?: number | null
          max_duration_hours?: number | null
          max_hours_per_day_per_user?: number | null
          max_hours_per_month_per_user?: number | null
          max_hours_per_week_per_user?: number | null
          max_monthly_per_owner?: number | null
          min_advance_hours?: number | null
          name: string
          photos?: string[] | null
          updated_at?: string | null
        }
        Update: {
          allow_reservations?: boolean | null
          building_id?: string
          cancellation_hours?: number | null
          capacity?: number | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          gap_minutes?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          max_advance_days?: number | null
          max_duration_hours?: number | null
          max_hours_per_day_per_user?: number | null
          max_hours_per_month_per_user?: number | null
          max_hours_per_week_per_user?: number | null
          max_monthly_per_owner?: number | null
          min_advance_hours?: number | null
          name?: string
          photos?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_spaces_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_blackouts: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          reason: string | null
          space_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          reason?: string | null
          space_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          reason?: string | null
          space_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_blackouts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          building_id: string
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          payment_amount: number | null
          payment_deadline: string | null
          payment_proof_url: string | null
          payment_rejected_reason: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          reference_code: string
          space_id: string
          start_time: string
          status: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          building_id: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_deadline?: string | null
          payment_proof_url?: string | null
          payment_rejected_reason?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          reference_code: string
          space_id: string
          start_time: string
          status?: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          building_id?: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_deadline?: string | null
          payment_proof_url?: string | null
          payment_rejected_reason?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          reference_code?: string
          space_id?: string
          start_time?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_activities: {
        Row: {
          building_id: string
          cancelled_by: string | null
          created_at: string | null
          description: string | null
          end_time: string
          id: string
          is_recurring: boolean | null
          recurrence_end_date: string | null
          recurrence_group_id: string | null
          recurrence_pattern: string | null
          space_id: string
          start_time: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          cancelled_by?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          recurrence_end_date?: string | null
          recurrence_group_id?: string | null
          recurrence_pattern?: string | null
          space_id: string
          start_time: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          cancelled_by?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          recurrence_end_date?: string | null
          recurrence_group_id?: string | null
          recurrence_pattern?: string | null
          space_id?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_activities_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_activities_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_activities_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_restrictions: {
        Row: {
          building_id: string
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          infraction_id: string | null
          profile_id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          space_id: string | null
          starts_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          infraction_id?: string | null
          profile_id: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          space_id?: string | null
          starts_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          infraction_id?: string | null
          profile_id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          space_id?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_restrictions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_infraction_id_fkey"
            columns: ["infraction_id"]
            isOneToOne: false
            referencedRelation: "infractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "public_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          access_code: string
          apartment_id: string
          building_id: string
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          created_at: string | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          purpose: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          registered_by: string
          status: string
          updated_at: string | null
          valid_from: string
          valid_until: string
          vehicle_description: string | null
          vehicle_plate: string | null
          visitor_id_number: string | null
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          access_code: string
          apartment_id: string
          building_id: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          purpose?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          registered_by: string
          status?: string
          updated_at?: string | null
          valid_from: string
          valid_until: string
          vehicle_description?: string | null
          vehicle_plate?: string | null
          visitor_id_number?: string | null
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          access_code?: string
          apartment_id?: string
          building_id?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          purpose?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          registered_by?: string
          status?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
          vehicle_description?: string | null
          vehicle_plate?: string | null
          visitor_id_number?: string | null
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_space_availability: {
        Args: {
          p_end: string
          p_exclude_reservation_id?: string
          p_space_id: string
          p_start: string
        }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      generate_maintenance_reference_code: { Args: never; Returns: string }
      generate_reference_code: { Args: never; Returns: string }
      generate_visitor_access_code: { Args: never; Returns: string }
      get_my_building_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_user_space_booked_hours: {
        Args: {
          p_booking_start: string
          p_space_id: string
          p_timezone: string
          p_user_id: string
        }
        Returns: {
          hours_month: number
          hours_today: number
          hours_week: number
        }[]
      }
      has_active_restriction: {
        Args: { p_at?: string; p_profile_id: string; p_space_id: string }
        Returns: boolean
      }
      has_any_buildings: { Args: never; Returns: boolean }
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
