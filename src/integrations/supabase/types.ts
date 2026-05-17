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
          display_name: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
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
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          phone: string | null
          subject: string
          message: string
          status: 'new' | 'in_progress' | 'completed' | 'spam'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          phone?: string | null
          subject: string
          message: string
          status?: 'new' | 'in_progress' | 'completed' | 'spam'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          phone?: string | null
          subject?: string
          message?: string
          status?: 'new' | 'in_progress' | 'completed' | 'spam'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      carbon_projects_details: {
        Row: {
          id: number
          project_id: string
          project_name: string
          project_type: string
          methodology: string
          country: string
          region: string
          developer: string
          verifier: string
          registry: string
          status: string
          crediting_period_start: string
          crediting_period_end: string
          total_credits_issued: number
          total_credits_retired: number
          total_credits_available: number
          price_per_credit: number
          project_description: string
          environmental_benefits: string
          social_benefits: string
          economic_benefits: string
          project_website: string
          project_documents: string
          contact_information: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          project_id: string
          project_name: string
          project_type: string
          methodology: string
          country: string
          region: string
          developer: string
          verifier: string
          registry: string
          status: string
          crediting_period_start: string
          crediting_period_end: string
          total_credits_issued: number
          total_credits_retired: number
          total_credits_available: number
          price_per_credit: number
          project_description: string
          environmental_benefits: string
          social_benefits: string
          economic_benefits: string
          project_website: string
          project_documents: string
          contact_information: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          project_id?: string
          project_name?: string
          project_type?: string
          methodology?: string
          country?: string
          region?: string
          developer?: string
          verifier?: string
          registry?: string
          status?: string
          crediting_period_start?: string
          crediting_period_end?: string
          total_credits_issued?: number
          total_credits_retired?: number
          total_credits_available?: number
          price_per_credit?: number
          project_description?: string
          environmental_benefits?: string
          social_benefits?: string
          economic_benefits?: string
          project_website?: string
          project_documents?: string
          contact_information?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_input: {
        Row: {
          id: number
          user_id: string
          project_name: string
          project_type: string
          methodology: string
          country: string
          region: string
          developer: string
          verifier: string
          registry: string
          status: string
          crediting_period_start: string
          crediting_period_end: string
          total_credits_issued: number
          total_credits_retired: number
          total_credits_available: number
          price_per_credit: number
          project_description: string
          environmental_benefits: string
          social_benefits: string
          economic_benefits: string
          project_website: string
          project_documents: string
          contact_information: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          project_name: string
          project_type: string
          methodology: string
          country: string
          region: string
          developer: string
          verifier: string
          registry: string
          status: string
          crediting_period_start: string
          crediting_period_end: string
          total_credits_issued: number
          total_credits_retired: number
          total_credits_available: number
          price_per_credit: number
          project_description: string
          environmental_benefits: string
          social_benefits: string
          economic_benefits: string
          project_website: string
          project_documents: string
          contact_information: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          project_name?: string
          project_type?: string
          methodology?: string
          country?: string
          region?: string
          developer?: string
          verifier?: string
          registry?: string
          status?: string
          crediting_period_start?: string
          crediting_period_end?: string
          total_credits_issued?: number
          total_credits_retired?: number
          total_credits_available?: number
          price_per_credit?: number
          project_description?: string
          environmental_benefits?: string
          social_benefits?: string
          economic_benefits?: string
          project_website?: string
          project_documents?: string
          contact_information?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_input_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ccus_projects: {
        Row: {
          id: number
          project_name: string
          project_type: string
          technology: string
          country: string
          region: string
          developer: string
          status: string
          capacity_mt_co2_per_year: number
          investment_amount: number
          start_date: string
          completion_date: string
          project_description: string
          environmental_benefits: string
          economic_benefits: string
          project_website: string
          project_documents: string
          contact_information: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          project_name: string
          project_type: string
          technology: string
          country: string
          region: string
          developer: string
          status: string
          capacity_mt_co2_per_year: number
          investment_amount: number
          start_date: string
          completion_date: string
          project_description: string
          environmental_benefits: string
          economic_benefits: string
          project_website: string
          project_documents: string
          contact_information: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          project_name?: string
          project_type: string
          technology?: string
          country?: string
          region?: string
          developer?: string
          status?: string
          capacity_mt_co2_per_year?: number
          investment_amount?: number
          start_date?: string
          completion_date?: string
          project_description?: string
          environmental_benefits?: string
          economic_benefits?: string
          project_website?: string
          project_documents?: string
          contact_information?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ccus_policies: {
        Row: {
          id: number
          policy_name: string
          policy_type: string
          country: string
          region: string
          implementing_agency: string
          status: string
          effective_date: string
          end_date: string
          funding_amount: number
          policy_description: string
          objectives: string
          target_sectors: string
          incentives: string
          policy_documents: string
          contact_information: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          policy_name: string
          policy_type: string
          country: string
          region: string
          implementing_agency: string
          status: string
          effective_date: string
          end_date: string
          funding_amount: number
          policy_description: string
          objectives: string
          target_sectors: string
          incentives: string
          policy_documents: string
          contact_information: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          policy_name?: string
          policy_type?: string
          country?: string
          region?: string
          implementing_agency?: string
          status?: string
          effective_date?: string
          end_date?: string
          funding_amount?: number
          policy_description?: string
          objectives?: string
          target_sectors?: string
          incentives?: string
          policy_documents?: string
          contact_information?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ccus_management_strategies: {
        Row: {
          id: number
          strategy_name: string
          strategy_type: string
          organization: string
          country: string
          region: string
          status: string
          implementation_date: string
          target_date: string
          budget_allocation: number
          strategy_description: string
          objectives: string
          key_activities: string
          success_metrics: string
          strategy_documents: string
          contact_information: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          strategy_name: string
          strategy_type: string
          organization: string
          country: string
          region: string
          status: string
          implementation_date: string
          target_date: string
          budget_allocation: number
          strategy_description: string
          objectives: string
          key_activities: string
          success_metrics: string
          strategy_documents: string
          contact_information: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          strategy_name?: string
          strategy_type?: string
          organization?: string
          country?: string
          region?: string
          status?: string
          implementation_date?: string
          target_date?: string
          budget_allocation?: number
          strategy_description?: string
          objectives?: string
          key_activities?: string
          success_metrics?: string
          strategy_documents?: string
          contact_information?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      esg_assessments: {
        Row: {
          id: string
          user_id: string
          assessment_type: string
          readiness_version: number | null
          readiness_answers: Json
          status: 'draft' | 'submitted'
          total_completion: number
          created_at: string
          updated_at: string
          submitted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          assessment_type?: string
          readiness_version?: number | null
          readiness_answers?: Json
          status?: 'draft' | 'submitted'
          total_completion?: number
          created_at?: string
          updated_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          assessment_type?: string
          readiness_version?: number | null
          readiness_answers?: Json
          status?: 'draft' | 'submitted'
          total_completion?: number
          created_at?: string
          updated_at?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esg_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      esg_scores: {
        Row: {
          id: string
          user_id: string
          assessment_id: string
          readiness_overall_score: number | null
          readiness_maturity_band: string | null
          readiness_completion_pct: number | null
          readiness_results: Json | null
          scored_by: string | null
          scored_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assessment_id: string
          readiness_overall_score?: number | null
          readiness_maturity_band?: string | null
          readiness_completion_pct?: number | null
          readiness_results?: Json | null
          scored_by?: string | null
          scored_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assessment_id?: string
          readiness_overall_score?: number | null
          readiness_maturity_band?: string | null
          readiness_completion_pct?: number | null
          readiness_results?: Json | null
          scored_by?: string | null
          scored_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "esg_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esg_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "esg_assessments"
            referencedColumns: ["id"]
          }
        ]
      }
      scope1_fuel_entries: {
        Row: {
          id: string
          user_id: string
          fuel_type_group: string
          fuel: string
          unit: string
          quantity: number
          factor: number
          emissions: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fuel_type_group: string
          fuel: string
          unit: string
          quantity: number
          factor: number
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fuel_type_group?: string
          fuel?: string
          unit?: string
          quantity?: number
          factor?: number
          emissions?: number
          created_at?: string
        }
        Relationships: []
      }
      scope1_refrigerant_entries: {
        Row: {
          id: string
          user_id: string
          refrigerant_type: string
          emission_factor: number
          quantity: number
          emissions: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          refrigerant_type: string
          emission_factor: number
          quantity: number
          emissions: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          refrigerant_type?: string
          emission_factor?: number
          quantity?: number
          emissions?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope1_refrigerant_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scope1_passenger_vehicle_entries: {
        Row: {
          id: string
          user_id: string
          activity: string
          vehicle_type: string
          unit: string
          fuel_type: string | null
          uk_factor_basis: string | null
          distance: number
          emission_factor: number
          emissions: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity: string
          vehicle_type: string
          unit: string
          fuel_type?: string | null
          uk_factor_basis?: string | null
          distance: number
          emission_factor: number
          emissions: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity?: string
          vehicle_type?: string
          unit?: string
          fuel_type?: string | null
          uk_factor_basis?: string | null
          distance?: number
          emission_factor?: number
          emissions?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope1_passenger_vehicle_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scope1_delivery_vehicle_entries: {
        Row: {
          id: string
          user_id: string
          activity: string
          vehicle_type: string
          unit: string
          fuel_type?: string | null
          laden_level?: string | null
          uk_factor_basis?: string | null
          distance: number
          emission_factor: number
          emissions: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity: string
          vehicle_type: string
          unit: string
          fuel_type?: string | null
          laden_level?: string | null
          uk_factor_basis?: string | null
          distance: number
          emission_factor: number
          emissions: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity?: string
          vehicle_type?: string
          unit?: string
          fuel_type?: string | null
          laden_level?: string | null
          uk_factor_basis?: string | null
          distance?: number
          emission_factor?: number
          emissions?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope1_delivery_vehicle_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      counterparties: {
        Row: {
          id: string
          user_id: string
          name: string
          sector: string
          geography: string
          counterparty_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          sector: string
          geography: string
          counterparty_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sector?: string
          geography?: string
          counterparty_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      exposures: {
        Row: {
          id: string
          user_id: string
          counterparty_id: string
          exposure_id: string
          amount_pkr: number
          probability_of_default: number
          loss_given_default: number
          tenor_months: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterparty_id: string
          exposure_id: string
          amount_pkr: number
          probability_of_default: number
          loss_given_default: number
          tenor_months: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counterparty_id?: string
          exposure_id?: string
          amount_pkr?: number
          probability_of_default?: number
          loss_given_default?: number
          tenor_months?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exposures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exposures_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          }
        ]
      }
      counterparty_questionnaires: {
        Row: {
          id: string
          user_id: string
          counterparty_id: string
          corporate_structure: string
          has_emissions: boolean
          scope1_emissions: number | null
          scope2_emissions: number | null
          scope3_emissions: number | null
          verification_status: string
          verifier_name: string | null
          evic: number | null
          total_equity_plus_debt: number | null
          share_price: number | null
          outstanding_shares: number | null
          total_debt: number | null
          minority_interest: number | null
          preferred_stock: number | null
          total_equity: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterparty_id: string
          corporate_structure: string
          has_emissions: boolean
          scope1_emissions?: number | null
          scope2_emissions?: number | null
          scope3_emissions?: number | null
          verification_status: string
          verifier_name?: string | null
          evic?: number | null
          total_equity_plus_debt?: number | null
          share_price?: number | null
          outstanding_shares?: number | null
          total_debt?: number | null
          minority_interest?: number | null
          preferred_stock?: number | null
          total_equity?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counterparty_id?: string
          corporate_structure?: string
          has_emissions?: boolean
          scope1_emissions?: number | null
          scope2_emissions?: number | null
          scope3_emissions?: number | null
          verification_status?: string
          verifier_name?: string | null
          evic?: number | null
          total_equity_plus_debt?: number | null
          share_price?: number | null
          outstanding_shares?: number | null
          total_debt?: number | null
          minority_interest?: number | null
          preferred_stock?: number | null
          total_equity?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_questionnaires_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparty_questionnaires_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          }
        ]
      }
      emission_calculations: {
        Row: {
          id: string
          user_id: string
          counterparty_id: string | null
          exposure_id: string | null
          questionnaire_id: string | null
          calculation_type: string
          company_type: string
          formula_id: string
          inputs: Json
          results: Json
          financed_emissions: number
          attribution_factor: number | null
          data_quality_score: number | null
          evic: number | null
          total_equity_plus_debt: number | null
          status: 'draft' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterparty_id?: string | null
          exposure_id?: string | null
          questionnaire_id?: string | null
          calculation_type: string
          company_type: string
          formula_id: string
          inputs: Json
          results: Json
          financed_emissions: number
          attribution_factor?: number | null
          data_quality_score?: number | null
          evic?: number | null
          total_equity_plus_debt?: number | null
          status: 'draft' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counterparty_id?: string | null
          exposure_id?: string | null
          questionnaire_id?: string | null
          calculation_type?: string
          company_type?: string
          formula_id?: string
          inputs?: Json
          results?: Json
          financed_emissions?: number
          attribution_factor?: number | null
          data_quality_score?: number | null
          evic?: number | null
          total_equity_plus_debt?: number | null
          status?: 'draft' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emission_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_calculations_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_calculations_exposure_id_fkey"
            columns: ["exposure_id"]
            isOneToOne: false
            referencedRelation: "exposures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_calculations_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "counterparty_questionnaires"
            referencedColumns: ["id"]
          }
        ]
      }
      finance_emission_calculations: {
        Row: {
          id: string
          user_id: string
          counterparty_id: string
          outstanding_amount: number
          calculation_type: 'finance_emission' | 'facilitated_emission'
          formula_id: string
          formula_name: string
          company_type: 'listed' | 'unlisted'
          total_assets: number | null
          evic: number | null
          total_equity_plus_debt: number | null
          financed_emissions: number
          attribution_factor: number | null
          data_quality_score: number | null
          status: 'draft' | 'completed' | 'failed'
          share_price: number | null
          outstanding_shares: number | null
          total_debt: number | null
          total_equity: number | null
          minority_interest: number | null
          preferred_stock: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterparty_id: string
          outstanding_amount: number
          calculation_type: 'finance_emission' | 'facilitated_emission'
          formula_id: string
          formula_name: string
          company_type: 'listed' | 'unlisted'
          total_assets?: number | null
          evic?: number | null
          total_equity_plus_debt?: number | null
          financed_emissions: number
          attribution_factor?: number | null
          data_quality_score?: number | null
          status: 'draft' | 'completed' | 'failed'
          share_price?: number | null
          outstanding_shares?: number | null
          total_debt?: number | null
          total_equity?: number | null
          minority_interest?: number | null
          preferred_stock?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counterparty_id?: string
          outstanding_amount?: number
          calculation_type?: 'finance_emission' | 'facilitated_emission'
          formula_id?: string
          formula_name?: string
          company_type?: 'listed' | 'unlisted'
          total_assets?: number | null
          evic?: number | null
          total_equity_plus_debt?: number | null
          financed_emissions?: number
          attribution_factor?: number | null
          data_quality_score?: number | null
          status?: 'draft' | 'completed' | 'failed'
          share_price?: number | null
          outstanding_shares?: number | null
          total_debt?: number | null
          total_equity?: number | null
          minority_interest?: number | null
          preferred_stock?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_emission_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_emission_calculations_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          }
        ]
      }
      scenario_runs: {
        Row: {
          id: string
          user_id: string
          scenario_name: string
          run_date: string
          status: 'running' | 'completed' | 'failed'
          parameters: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scenario_name: string
          run_date: string
          status: 'running' | 'completed' | 'failed'
          parameters: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scenario_name?: string
          run_date?: string
          status?: 'running' | 'completed' | 'failed'
          parameters?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      scenario_results: {
        Row: {
          id: string
          user_id: string
          scenario_run_id: string
          counterparty_id: string
          metrics: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scenario_run_id: string
          counterparty_id: string
          metrics: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scenario_run_id?: string
          counterparty_id?: string
          metrics?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_results_scenario_run_id_fkey"
            columns: ["scenario_run_id"]
            isOneToOne: false
            referencedRelation: "scenario_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_results_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          }
        ]
      }
      // --- Custom Scope 3 tables (manually added for typing) ---
      scope3_upstream_transportation: {
        Row: {
          id: string
          user_id: string
          counterparty_id: string | null
          vehicle_type_id: string
          vehicle_type_name: string | null
          distance: number | null
          weight: number | null
          emission_factor: number | null
          emissions: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counterparty_id?: string | null
          vehicle_type_id: string
          vehicle_type_name?: string | null
          distance: number
          weight: number
          emission_factor?: number | null
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counterparty_id?: string | null
          vehicle_type_id?: string
          vehicle_type_name?: string | null
          distance?: number
          weight?: number
          emission_factor?: number | null
          emissions?: number | null
          created_at?: string
        }
        Relationships: []
      }
      scope3_downstream_transportation: {
        Row: {
          id: string | number
          user_id: string
          counterparty_id: string | null
          vehicle_type_id: string
          vehicle_type_name: string | null
          distance: number | null
          weight: number | null
          emission_factor: number | null
          emissions: number | null
          created_at: string
        }
        Insert: {
          id?: string | number
          user_id: string
          counterparty_id?: string | null
          vehicle_type_id: string
          vehicle_type_name?: string | null
          distance: number
          weight: number
          emission_factor?: number | null
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string | number
          user_id?: string
          counterparty_id?: string | null
          vehicle_type_id?: string
          vehicle_type_name?: string | null
          distance?: number
          weight?: number
          emission_factor?: number | null
          emissions?: number | null
          created_at?: string
        }
        Relationships: []
      }
      scope3_waste_generated: {
        Row: {
          id: string | number
          user_id: string
          counterparty_id: string | null
          material_id: string
          material_name: string | null
          volume: number | null
          disposal_method: string | null
          emission_factor: number | null
          emissions: number | null
          created_at: string
        }
        Insert: {
          id?: string | number
          user_id: string
          counterparty_id?: string | null
          material_id: string
          material_name?: string | null
          volume: number
          disposal_method: string
          emission_factor?: number | null
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string | number
          user_id?: string
          counterparty_id?: string | null
          material_id?: string
          material_name?: string | null
          volume?: number
          disposal_method?: string
          emission_factor?: number | null
          emissions?: number | null
          created_at?: string
        }
        Relationships: []
      }
      scope3_business_travel: {
        Row: {
          id: string | number
          user_id: string
          counterparty_id: string | null
          travel_type_id: string
          distance: number | null
          emissions: number | null
          created_at: string
        }
        Insert: {
          id?: string | number
          user_id: string
          counterparty_id?: string | null
          travel_type_id: string
          distance: number
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string | number
          user_id?: string
          counterparty_id?: string | null
          travel_type_id?: string
          distance?: number
          emissions?: number | null
          created_at?: string
        }
        Relationships: []
      }
      scope3_employee_commuting: {
        Row: {
          id: string | number
          user_id: string
          counterparty_id: string | null
          travel_type_id: string
          distance: number | null
          number_of_employees: number | null
          emissions: number | null
          created_at: string
        }
        Insert: {
          id?: string | number
          user_id: string
          counterparty_id?: string | null
          travel_type_id: string
          distance: number
          number_of_employees: number
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string | number
          user_id?: string
          counterparty_id?: string | null
          travel_type_id?: string
          distance?: number
          number_of_employees?: number
          emissions?: number | null
          created_at?: string
        }
        Relationships: []
      }
      scope3_end_of_life_treatment: {
        Row: {
          id: string | number
          user_id: string
          counterparty_id: string | null
          material_id: string
          material_name: string | null
          volume: number | null
          disposal_method: string | null
          recycle_percentage: number | null
          composition: string | null
          emission_factor: number | null
          emissions: number | null
          created_at: string
        }
        Insert: {
          id?: string | number
          user_id: string
          counterparty_id?: string | null
          material_id: string
          material_name?: string | null
          volume: number
          disposal_method: string
          recycle_percentage?: number | null
          composition?: string | null
          emission_factor?: number | null
          emissions: number
          created_at?: string
        }
        Update: {
          id?: string | number
          user_id?: string
          counterparty_id?: string | null
          material_id?: string
          material_name?: string | null
          volume?: number
          disposal_method?: string
          recycle_percentage?: number | null
          composition?: string | null
          emission_factor?: number | null
          emissions?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_user_portfolio_totals: {
        Row: {
          user_id: string
          total_finance_emissions: number
          total_facilitated_emissions: number
          total_exposure_pkr: number
          total_counterparties: number
          total_exposures: number
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
