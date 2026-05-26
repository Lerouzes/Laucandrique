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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assembly_evaluations: {
        Row: {
          agenda_sent_on_time: number | null
          answers_clear_confident: number | null
          assembly_date: string
          board_confidence_level: number | null
          client_id: string
          conflict_handled_professionally: number | null
          created_at: string | null
          discussions_on_track: number | null
          duration_reasonable: number | null
          evaluator_id: string | null
          financial_statement_quality: number | null
          followup_tasks_created: number | null
          id: string
          manager_controlled_room: number | null
          manager_id: string
          notes: string | null
          pv_drafted_quickly: number | null
          quorum_respected: number | null
          recommendations: string | null
          resolutions_clear: number | null
          status: string | null
          technical_prep_complete: number | null
          templates_respected: number | null
          voting_controlled: number | null
        }
        Insert: {
          agenda_sent_on_time?: number | null
          answers_clear_confident?: number | null
          assembly_date: string
          board_confidence_level?: number | null
          client_id: string
          conflict_handled_professionally?: number | null
          created_at?: string | null
          discussions_on_track?: number | null
          duration_reasonable?: number | null
          evaluator_id?: string | null
          financial_statement_quality?: number | null
          followup_tasks_created?: number | null
          id?: string
          manager_controlled_room?: number | null
          manager_id: string
          notes?: string | null
          pv_drafted_quickly?: number | null
          quorum_respected?: number | null
          recommendations?: string | null
          resolutions_clear?: number | null
          status?: string | null
          technical_prep_complete?: number | null
          templates_respected?: number | null
          voting_controlled?: number | null
        }
        Update: {
          agenda_sent_on_time?: number | null
          answers_clear_confident?: number | null
          assembly_date?: string
          board_confidence_level?: number | null
          client_id?: string
          conflict_handled_professionally?: number | null
          created_at?: string | null
          discussions_on_track?: number | null
          duration_reasonable?: number | null
          evaluator_id?: string | null
          financial_statement_quality?: number | null
          followup_tasks_created?: number | null
          id?: string
          manager_controlled_room?: number | null
          manager_id?: string
          notes?: string | null
          pv_drafted_quickly?: number | null
          quorum_respected?: number | null
          recommendations?: string | null
          resolutions_clear?: number | null
          status?: string | null
          technical_prep_complete?: number | null
          templates_respected?: number | null
          voting_controlled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_evaluations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_evaluations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_question_configs: {
        Row: {
          created_at: string | null
          description: string
          key: string
        }
        Insert: {
          created_at?: string | null
          description: string
          key: string
        }
        Update: {
          created_at?: string | null
          description?: string
          key?: string
        }
        Relationships: []
      }
      bill_images: {
        Row: {
          bill_id: string
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
        }
        Insert: {
          bill_id: string
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
        }
        Update: {
          bill_id?: string
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_images_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          quantity: number | null
          title: string | null
          total: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          title?: string | null
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          title?: string | null
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          admin_amount: number | null
          admin_percentage: number | null
          bill_date: string
          bill_number: number
          client_id: string
          contractor_id: string | null
          created_at: string | null
          description: string | null
          gst_amount: number | null
          id: string
          notes: string | null
          profit_amount: number | null
          profit_percentage: number | null
          qst_amount: number | null
          quote_id: string | null
          status: string
          subtotal: number | null
          title: string
          total: number | null
        }
        Insert: {
          admin_amount?: number | null
          admin_percentage?: number | null
          bill_date?: string
          bill_number?: number
          client_id: string
          contractor_id?: string | null
          created_at?: string | null
          description?: string | null
          gst_amount?: number | null
          id?: string
          notes?: string | null
          profit_amount?: number | null
          profit_percentage?: number | null
          qst_amount?: number | null
          quote_id?: string | null
          status?: string
          subtotal?: number | null
          title: string
          total?: number | null
        }
        Update: {
          admin_amount?: number | null
          admin_percentage?: number | null
          bill_date?: string
          bill_number?: number
          client_id?: string
          contractor_id?: string | null
          created_at?: string | null
          description?: string | null
          gst_amount?: number | null
          id?: string
          notes?: string | null
          profit_amount?: number | null
          profit_percentage?: number | null
          qst_amount?: number | null
          quote_id?: string | null
          status?: string
          subtotal?: number | null
          title?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          departure_date: string | null
          email: string | null
          full_name: string
          id: string
          manager: string | null
          manager_id: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          departure_date?: string | null
          email?: string | null
          full_name: string
          id?: string
          manager?: string | null
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          departure_date?: string | null
          email?: string | null
          full_name?: string
          id?: string
          manager?: string | null
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          category_id: string | null
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          received_date: string | null
          resolved_date: string | null
          severity: string | null
          status: string | null
          title: string
        }
        Insert: {
          category_id?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          received_date?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category_id?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          received_date?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "complaint_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          color: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          skills: string[]
        }
        Insert: {
          color?: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          skills?: string[]
        }
        Update: {
          color?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          skills?: string[]
        }
        Relationships: []
      }
      contracts: {
        Row: {
          active: boolean | null
          client_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          monthly_fee: number | null
          package_name: string | null
          start_date: string | null
        }
        Insert: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          monthly_fee?: number | null
          package_name?: string | null
          start_date?: string | null
        }
        Update: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          monthly_fee?: number | null
          package_name?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      doors: {
        Row: {
          building_id: string | null
          client_id: string | null
          created_at: string | null
          door_number: string
          id: string
          notes: string | null
        }
        Insert: {
          building_id?: string | null
          client_id?: string | null
          created_at?: string | null
          door_number: string
          id?: string
          notes?: string | null
        }
        Update: {
          building_id?: string | null
          client_id?: string | null
          created_at?: string | null
          door_number?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_syndicates: {
        Row: {
          board_relationship_score: number | null
          client_id: string
          competitor: string | null
          created_at: string | null
          departure_date: string
          financial_issues: boolean | null
          id: string
          major_unresolved_issue: string | null
          manager_id: string | null
          operational_score_before: number | null
          preventable: boolean | null
          reason_category: string
          reason_details: string | null
          root_cause: string | null
        }
        Insert: {
          board_relationship_score?: number | null
          client_id: string
          competitor?: string | null
          created_at?: string | null
          departure_date: string
          financial_issues?: boolean | null
          id?: string
          major_unresolved_issue?: string | null
          manager_id?: string | null
          operational_score_before?: number | null
          preventable?: boolean | null
          reason_category: string
          reason_details?: string | null
          root_cause?: string | null
        }
        Update: {
          board_relationship_score?: number | null
          client_id?: string
          competitor?: string | null
          created_at?: string | null
          departure_date?: string
          financial_issues?: boolean | null
          id?: string
          major_unresolved_issue?: string | null
          manager_id?: string | null
          operational_score_before?: number | null
          preventable?: boolean | null
          reason_category?: string
          reason_details?: string | null
          root_cause?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_syndicates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_syndicates_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_monthly_calls: {
        Row: {
          answered_calls: number
          created_at: string | null
          id: string
          manager_id: string
          total_calls: number
          year_month: string
        }
        Insert: {
          answered_calls: number
          created_at?: string | null
          id?: string
          manager_id: string
          total_calls: number
          year_month: string
        }
        Update: {
          answered_calls?: number
          created_at?: string | null
          id?: string
          manager_id?: string
          total_calls?: number
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_monthly_calls_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_monthly_workload: {
        Row: {
          closed_tasks: number
          communications_received: number
          created_at: string | null
          id: string
          manager_id: string
          open_tasks: number
          year_month: string
        }
        Insert: {
          closed_tasks: number
          communications_received: number
          created_at?: string | null
          id?: string
          manager_id: string
          open_tasks: number
          year_month: string
        }
        Update: {
          closed_tasks?: number
          communications_received?: number
          created_at?: string | null
          id?: string
          manager_id?: string
          open_tasks?: number
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_monthly_workload_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_operational_risks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          manager_id: string
          one_on_one_id: string | null
          resolution_notes: string | null
          resolved_date: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          manager_id: string
          one_on_one_id?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          manager_id?: string
          one_on_one_id?: string | null
          resolution_notes?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_operational_risks_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_operational_risks_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      managers: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "manager_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_assemblies: {
        Row: {
          assembly_evaluation_id: string
          created_at: string | null
          id: string
          manager_notes: string | null
          my_notes: string | null
          one_on_one_id: string
          reviewed: boolean | null
        }
        Insert: {
          assembly_evaluation_id: string
          created_at?: string | null
          id?: string
          manager_notes?: string | null
          my_notes?: string | null
          one_on_one_id: string
          reviewed?: boolean | null
        }
        Update: {
          assembly_evaluation_id?: string
          created_at?: string | null
          id?: string
          manager_notes?: string | null
          my_notes?: string | null
          one_on_one_id?: string
          reviewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_assemblies_assembly_evaluation_id_fkey"
            columns: ["assembly_evaluation_id"]
            isOneToOne: false
            referencedRelation: "assembly_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_assemblies_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_commitments: {
        Row: {
          carried_forward: boolean | null
          commitment_text: string
          completed: boolean | null
          created_at: string | null
          due_date: string | null
          due_next_review: boolean | null
          failure_reason: string | null
          id: string
          notes: string | null
          one_on_one_id: string
          owner: string | null
          status: string | null
          why_not: string | null
        }
        Insert: {
          carried_forward?: boolean | null
          commitment_text: string
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          due_next_review?: boolean | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          one_on_one_id: string
          owner?: string | null
          status?: string | null
          why_not?: string | null
        }
        Update: {
          carried_forward?: boolean | null
          commitment_text?: string
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          due_next_review?: boolean | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          one_on_one_id?: string
          owner?: string | null
          status?: string | null
          why_not?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_commitments_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_complaints: {
        Row: {
          complaint_id: string
          created_at: string | null
          discussion_notes: string | null
          id: string
          manager_notes: string | null
          my_notes: string | null
          one_on_one_id: string
          resolution_plan: string | null
          resolved_in_meeting: boolean | null
          reviewed: boolean | null
        }
        Insert: {
          complaint_id: string
          created_at?: string | null
          discussion_notes?: string | null
          id?: string
          manager_notes?: string | null
          my_notes?: string | null
          one_on_one_id: string
          resolution_plan?: string | null
          resolved_in_meeting?: boolean | null
          reviewed?: boolean | null
        }
        Update: {
          complaint_id?: string
          created_at?: string | null
          discussion_notes?: string | null
          id?: string
          manager_notes?: string | null
          my_notes?: string | null
          one_on_one_id?: string
          resolution_plan?: string | null
          resolved_in_meeting?: boolean | null
          reviewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_complaints_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_complaints_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_syndicate_audits: {
        Row: {
          audit_id: string
          created_at: string | null
          id: string
          manager_notes: string | null
          my_notes: string | null
          one_on_one_id: string
          reviewed: boolean | null
        }
        Insert: {
          audit_id: string
          created_at?: string | null
          id?: string
          manager_notes?: string | null
          my_notes?: string | null
          one_on_one_id: string
          reviewed?: boolean | null
        }
        Update: {
          audit_id?: string
          created_at?: string | null
          id?: string
          manager_notes?: string | null
          my_notes?: string | null
          one_on_one_id?: string
          reviewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_syndicate_audits_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "syndicate_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_syndicate_audits_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_task_email_audits: {
        Row: {
          client_id: string | null
          complexity: string | null
          created_at: string | null
          has_actions: boolean | null
          has_category_selected: boolean | null
          has_followup_date: boolean | null
          has_good_description: boolean | null
          id: string
          one_on_one_id: string
          review_notes: string | null
          task_created_date: string | null
          title: string
          type: string
        }
        Insert: {
          client_id?: string | null
          complexity?: string | null
          created_at?: string | null
          has_actions?: boolean | null
          has_category_selected?: boolean | null
          has_followup_date?: boolean | null
          has_good_description?: boolean | null
          id?: string
          one_on_one_id: string
          review_notes?: string | null
          task_created_date?: string | null
          title: string
          type: string
        }
        Update: {
          client_id?: string | null
          complexity?: string | null
          created_at?: string | null
          has_actions?: boolean | null
          has_category_selected?: boolean | null
          has_followup_date?: boolean | null
          has_good_description?: boolean | null
          id?: string
          one_on_one_id?: string
          review_notes?: string | null
          task_created_date?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_task_email_audits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_task_email_audits_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_ones: {
        Row: {
          agenda_templates_used: number | null
          assemblies_on_time: number | null
          bills_no_notes_over_7d: number | null
          calls_answered: number | null
          calls_total: number | null
          conflict_resolution: string | null
          created_at: string | null
          current_issues: string | null
          difficult_situations: string | null
          emails_over_48h: number | null
          escalation_needed: string | null
          id: string
          late_tasks: number | null
          main_objectives: string | null
          manager_id: string
          meeting_date: string
          meeting_score: number | null
          op_reports_closed: number | null
          operational_blockers: string | null
          organization_notes: string | null
          package_changes: number | null
          prioritization_notes: string | null
          priority_1: string | null
          priority_2: string | null
          priority_3: string | null
          recent_wins: string | null
          status: string | null
          stress_notes: string | null
          support_needed: string | null
          syndicates_lost: number | null
          training_needed: string | null
          training_requested: string | null
          workload_notes: string | null
        }
        Insert: {
          agenda_templates_used?: number | null
          assemblies_on_time?: number | null
          bills_no_notes_over_7d?: number | null
          calls_answered?: number | null
          calls_total?: number | null
          conflict_resolution?: string | null
          created_at?: string | null
          current_issues?: string | null
          difficult_situations?: string | null
          emails_over_48h?: number | null
          escalation_needed?: string | null
          id?: string
          late_tasks?: number | null
          main_objectives?: string | null
          manager_id: string
          meeting_date: string
          meeting_score?: number | null
          op_reports_closed?: number | null
          operational_blockers?: string | null
          organization_notes?: string | null
          package_changes?: number | null
          prioritization_notes?: string | null
          priority_1?: string | null
          priority_2?: string | null
          priority_3?: string | null
          recent_wins?: string | null
          status?: string | null
          stress_notes?: string | null
          support_needed?: string | null
          syndicates_lost?: number | null
          training_needed?: string | null
          training_requested?: string | null
          workload_notes?: string | null
        }
        Update: {
          agenda_templates_used?: number | null
          assemblies_on_time?: number | null
          bills_no_notes_over_7d?: number | null
          calls_answered?: number | null
          calls_total?: number | null
          conflict_resolution?: string | null
          created_at?: string | null
          current_issues?: string | null
          difficult_situations?: string | null
          emails_over_48h?: number | null
          escalation_needed?: string | null
          id?: string
          late_tasks?: number | null
          main_objectives?: string | null
          manager_id?: string
          meeting_date?: string
          meeting_score?: number | null
          op_reports_closed?: number | null
          operational_blockers?: string | null
          organization_notes?: string | null
          package_changes?: number | null
          prioritization_notes?: string | null
          priority_1?: string | null
          priority_2?: string | null
          priority_3?: string | null
          recent_wins?: string | null
          status?: string | null
          stress_notes?: string | null
          support_needed?: string | null
          syndicates_lost?: number | null
          training_needed?: string | null
          training_requested?: string | null
          workload_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_ones_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_change_logs: {
        Row: {
          change_date: string | null
          client_id: string
          created_at: string | null
          id: string
          new_package: string
          notes: string | null
          old_package: string | null
        }
        Insert: {
          change_date?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          new_package: string
          notes?: string | null
          old_package?: string | null
        }
        Update: {
          change_date?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          new_package?: string
          notes?: string | null
          old_package?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_change_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string
          completed_at: string | null
          contractor_id: string | null
          created_at: string | null
          end_date: string | null
          estimated_duration_days: number | null
          id: string
          project_type: string
          quote_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          title: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          contractor_id?: string | null
          created_at?: string | null
          end_date?: string | null
          estimated_duration_days?: number | null
          id?: string
          project_type?: string
          quote_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          title: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          contractor_id?: string | null
          created_at?: string | null
          end_date?: string | null
          estimated_duration_days?: number | null
          id?: string
          project_type?: string
          quote_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_images: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          notes: string | null
          quote_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          notes?: string | null
          quote_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          notes?: string | null
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_images_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_urls: string[]
          notes: string | null
          planning_measurement_source: string | null
          planning_room_id: string | null
          planning_selected_segments: number[] | null
          quantity: number | null
          quote_id: string
          title: string | null
          total: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[]
          notes?: string | null
          planning_measurement_source?: string | null
          planning_room_id?: string | null
          planning_selected_segments?: number[] | null
          quantity?: number | null
          quote_id: string
          title?: string | null
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[]
          notes?: string | null
          planning_measurement_source?: string | null
          planning_room_id?: string | null
          planning_selected_segments?: number[] | null
          quantity?: number | null
          quote_id?: string
          title?: string | null
          total?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_planning_room_id_fkey"
            columns: ["planning_room_id"]
            isOneToOne: false
            referencedRelation: "quote_planning_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_planning_rooms: {
        Row: {
          created_at: string
          description: string | null
          height: number | null
          id: string
          name: string
          points: Json
          quote_id: string
          section_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          name: string
          points?: Json
          quote_id: string
          section_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          name?: string
          points?: Json
          quote_id?: string
          section_id?: string | null
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
          },
        ]
      }
      quote_planning_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          quote_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          quote_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_planning_sections_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          admin_amount: number | null
          admin_percentage: number | null
          approved_at: string | null
          client_id: string
          contractor_id: string | null
          created_at: string | null
          denied_at: string | null
          description: string | null
          estimated_duration_days: number | null
          gst_amount: number | null
          hide_duration: boolean
          id: string
          internal_notes: string | null
          manager_id: string | null
          profit_amount: number | null
          profit_percentage: number | null
          qst_amount: number | null
          quote_number: number
          status: Database["public"]["Enums"]["quote_status"] | null
          subtotal: number | null
          title: string
          total: number | null
          work_types: string[]
        }
        Insert: {
          admin_amount?: number | null
          admin_percentage?: number | null
          approved_at?: string | null
          client_id: string
          contractor_id?: string | null
          created_at?: string | null
          denied_at?: string | null
          description?: string | null
          estimated_duration_days?: number | null
          gst_amount?: number | null
          hide_duration?: boolean
          id?: string
          internal_notes?: string | null
          manager_id?: string | null
          profit_amount?: number | null
          profit_percentage?: number | null
          qst_amount?: number | null
          quote_number?: number
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number | null
          title: string
          total?: number | null
          work_types?: string[]
        }
        Update: {
          admin_amount?: number | null
          admin_percentage?: number | null
          approved_at?: string | null
          client_id?: string
          contractor_id?: string | null
          created_at?: string | null
          denied_at?: string | null
          description?: string | null
          estimated_duration_days?: number | null
          gst_amount?: number | null
          hide_duration?: boolean
          id?: string
          internal_notes?: string | null
          manager_id?: string | null
          profit_amount?: number | null
          profit_percentage?: number | null
          qst_amount?: number | null
          quote_number?: number
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number | null
          title?: string
          total?: number | null
          work_types?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_name: string
          default_admin_percentage: number | null
          default_profit_percentage: number | null
          gst_rate: number | null
          id: string
          logo_url: string | null
          monthly_goal_amount: number | null
          monthly_goal_enabled: boolean | null
          pdf_template_url: string | null
          qst_rate: number | null
          updated_at: string | null
          work_types_options: string[]
        }
        Insert: {
          company_name: string
          default_admin_percentage?: number | null
          default_profit_percentage?: number | null
          gst_rate?: number | null
          id?: string
          logo_url?: string | null
          monthly_goal_amount?: number | null
          monthly_goal_enabled?: boolean | null
          pdf_template_url?: string | null
          qst_rate?: number | null
          updated_at?: string | null
          work_types_options?: string[]
        }
        Update: {
          company_name?: string
          default_admin_percentage?: number | null
          default_profit_percentage?: number | null
          gst_rate?: number | null
          id?: string
          logo_url?: string | null
          monthly_goal_amount?: number | null
          monthly_goal_enabled?: boolean | null
          pdf_template_url?: string | null
          qst_rate?: number | null
          updated_at?: string | null
          work_types_options?: string[]
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      syndicate_audit_answers: {
        Row: {
          audit_id: string
          category: string
          created_at: string | null
          id: string
          note: string | null
          question_key: string
          score: number | null
        }
        Insert: {
          audit_id: string
          category: string
          created_at?: string | null
          id?: string
          note?: string | null
          question_key: string
          score?: number | null
        }
        Update: {
          audit_id?: string
          category?: string
          created_at?: string | null
          id?: string
          note?: string | null
          question_key?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_audit_answers_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "syndicate_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_audits: {
        Row: {
          audit_date: string | null
          audited_by: string | null
          client_id: string
          created_at: string | null
          health_score: number | null
          id: string
          notes: string | null
        }
        Insert: {
          audit_date?: string | null
          audited_by?: string | null
          client_id: string
          created_at?: string | null
          health_score?: number | null
          id?: string
          notes?: string | null
        }
        Update: {
          audit_date?: string | null
          audited_by?: string | null
          client_id?: string
          created_at?: string | null
          health_score?: number | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_audits_audited_by_fkey"
            columns: ["audited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_audits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
      project_status: "unplanned" | "planned" | "in_progress" | "completed"
      quote_status:
        | "draft"
        | "sent"
        | "approved"
        | "denied"
        | "completed"
        | "billed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      project_status: ["unplanned", "planned", "in_progress", "completed"],
      quote_status: [
        "draft",
        "sent",
        "approved",
        "denied",
        "completed",
        "billed",
      ],
    },
  },
} as const
