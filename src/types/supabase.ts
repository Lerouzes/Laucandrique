export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          id: string
          company_name: string
          logo_url: string | null
          default_admin_percentage: number
          default_profit_percentage: number
          gst_rate: number
          qst_rate: number
          work_types_options: string[]
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          logo_url?: string | null
          default_admin_percentage?: number
          default_profit_percentage?: number
          gst_rate?: number
          qst_rate?: number
          work_types_options?: string[]
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          logo_url?: string | null
          default_admin_percentage?: number
          default_profit_percentage?: number
          gst_rate?: number
          qst_rate?: number
          work_types_options?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      managers: {
        Row: { id: string; first_name: string; last_name: string; email: string | null; created_at: string }
        Insert: { id?: string; first_name: string; last_name: string; email?: string | null; created_at?: string }
        Update: { id?: string; first_name?: string; last_name?: string; email?: string | null; created_at?: string }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          full_name: string
          company_name: string | null
          address: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          phone: string | null
          email: string | null
          manager: string | null
          manager_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          company_name?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          manager?: string | null
          manager_id?: string | null
          manager_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          company_name?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          manager?: string | null
          manager_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          client_id: string
          quote_number: number
          title: string
          description: string | null
          internal_notes: string | null
          manager_id: string | null
          status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed'
          estimated_duration_days: number
          work_types: string[]
          hide_duration: boolean
          subtotal: number
          admin_percentage: number
          admin_amount: number
          profit_percentage: number
          profit_amount: number
          gst_amount: number
          qst_amount: number
          total: number
          created_at: string
          approved_at: string | null
          denied_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          quote_number?: number
          title: string
          description?: string | null
          internal_notes?: string | null
          manager_id?: string | null
          status?: 'draft' | 'sent' | 'approved' | 'denied' | 'completed'
          estimated_duration_days?: number
          work_types?: string[]
          hide_duration?: boolean
          subtotal?: number
          admin_percentage?: number
          admin_amount?: number
          profit_percentage?: number
          profit_amount?: number
          gst_amount?: number
          qst_amount?: number
          total?: number
          created_at?: string
          approved_at?: string | null
          denied_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          quote_number?: number
          title?: string
          description?: string | null
          internal_notes?: string | null
          manager_id?: string | null
          status?: 'draft' | 'sent' | 'approved' | 'denied' | 'completed'
          estimated_duration_days?: number
          work_types?: string[]
          hide_duration?: boolean
          subtotal?: number
          admin_percentage?: number
          admin_amount?: number
          profit_percentage?: number
          profit_amount?: number
          gst_amount?: number
          qst_amount?: number
          total?: number
          created_at?: string
          approved_at?: string | null
          denied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          title: string | null
          description: string | null
          quantity: number
          unit: string | null
          unit_cost: number
          total: number
          image_urls: string[]
          notes: string | null
          planning_room_id: string | null
          planning_measurement_source: string | null
          planning_selected_segments: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          title?: string | null
          description?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number
          total?: number
          image_urls?: string[]
          notes?: string | null
          planning_room_id?: string | null
          planning_measurement_source?: string | null
          planning_selected_segments?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          title?: string | null
          description?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number
          total?: number
          image_urls?: string[]
          notes?: string | null
          planning_room_id?: string | null
          planning_measurement_source?: string | null
          planning_selected_segments?: number[] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_planning_room_id_fkey"
            columns: ["planning_room_id"]
            isOneToOne: false
            referencedRelation: "quote_planning_rooms"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_images: {
        Row: {
          id: string
          quote_id: string
          image_url: string
          caption: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          image_url: string
          caption?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          image_url?: string
          caption?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_images_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          quote_id: string
          client_id: string
          quote_number?: number
          title: string
          status: 'unplanned' | 'planned' | 'in_progress' | 'completed'
          estimated_duration_days: number
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          client_id: string
          quote_number?: number
          title: string
          status?: 'unplanned' | 'planned' | 'in_progress' | 'completed'
          estimated_duration_days?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          client_id?: string
          title?: string
          status?: 'unplanned' | 'planned' | 'in_progress' | 'completed'
          estimated_duration_days?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_planning_sections: {
        Row: {
          id: string
          quote_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_planning_sections_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_planning_rooms: {
        Row: {
          id: string
          quote_id: string
          section_id: string | null
          name: string
          description: string | null
          height: number | null
          points: Json
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          section_id?: string | null
          name: string
          description?: string | null
          height?: number | null
          points?: Json
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          section_id?: string | null
          name?: string
          description?: string | null
          height?: number | null
          points?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_planning_rooms_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_planning_rooms_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quote_planning_sections"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      quote_status: 'draft' | 'sent' | 'approved' | 'denied' | 'completed'
      project_status: 'unplanned' | 'planned' | 'in_progress' | 'completed'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
