import fs from "fs";

const path = "src/integrations/supabase/types.ts";
let s = fs.readFileSync(path, "utf8");

const esgAssessments = `      esg_assessments: {
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
      }`;

const esgScores = `      esg_scores: {
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
      }`;

const pattern =
  /      esg_assessments: \{[\s\S]*?      \}\n      esg_scores: \{[\s\S]*?      \}\n      scope1_fuel_entries:/;

if (!pattern.test(s)) {
  console.error("Pattern not found");
  process.exit(1);
}

s = s.replace(pattern, `${esgAssessments}\n${esgScores}\n      scope1_fuel_entries:`);
fs.writeFileSync(path, s);
console.log("Patched esg types");
