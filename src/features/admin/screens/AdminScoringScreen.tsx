import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { adminSupabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { ESG_READINESS_ASSESSMENT_TYPE } from "@/features/esg-readiness/constants";
import type { ReadinessComputation } from "@/features/esg-readiness/scoring";
import { computeReadiness, sanitizeReadinessAnswers } from "@/features/esg-readiness/scoring";
import type { ReadinessAnswers } from "@/features/esg-readiness/config";

const AdminScoringScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requireAuth } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("Unknown Organization");
  const [userName, setUserName] = useState("Unknown User");
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [results, setResults] = useState<ReadinessComputation | null>(null);

  useEffect(() => {
    if (!requireAuth() || !id) return;

    const load = async () => {
      try {
        const { data: assessment, error } = await (adminSupabase as any)
          .from("esg_assessments")
          .select("id, user_id, status, submitted_at, readiness_answers, assessment_type, total_completion")
          .eq("id", id)
          .eq("assessment_type", ESG_READINESS_ASSESSMENT_TYPE)
          .single();

        if (error) throw error;

        setStatus(assessment.status);
        setSubmittedAt(assessment.submitted_at);

        const { data: profile } = await (adminSupabase as any)
          .from("profiles")
          .select("display_name, organization_name")
          .eq("user_id", assessment.user_id)
          .maybeSingle();

        setUserName(profile?.display_name || "Unknown User");
        setOrgName(profile?.organization_name || "Unknown Organization");

        const answers = sanitizeReadinessAnswers(assessment.readiness_answers ?? {}) as ReadinessAnswers;

        const { data: scoreRow } = await (adminSupabase as any)
          .from("esg_scores")
          .select("readiness_results, readiness_overall_score, readiness_maturity_band, scored_at")
          .eq("assessment_id", id)
          .maybeSingle();

        const snapshot = scoreRow?.readiness_results as ReadinessComputation | null;
        setResults(snapshot ?? computeReadiness(answers));
      } catch (e) {
        console.error(e);
        toast({
          title: "Could not load assessment",
          description: "The readiness record may not exist.",
          variant: "destructive",
        });
        navigate("/admin-dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate, requireAuth, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading readiness assessment...</p>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate("/admin-dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to admin
          </Button>
          <Badge variant={status === "submitted" ? "default" : "secondary"}>
            {status === "submitted" ? "Submitted" : "Draft"}
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Readiness assessment</h1>
          <p className="text-gray-600 mt-1">
            {userName} · {orgName}
            {submittedAt ? ` · Submitted ${new Date(submittedAt).toLocaleDateString()}` : ""}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Scores are generated automatically when the user submits. This view is read-only.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1D9E75]" />
              Overall readiness
            </CardTitle>
            <CardDescription>ISSB / IFRS S1–S2 style maturity snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-4xl font-bold text-[#0F6E56]">{results.overallReadinessPercent}%</p>
                <p className="text-sm text-gray-600">Overall readiness</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{results.maturityBand}</p>
                <p className="text-sm text-gray-600">Maturity band</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{results.completionPercent}%</p>
                <p className="text-sm text-gray-600">
                  {results.answeredQuestions}/{results.totalQuestions} questions answered
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pillar breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.pillarSummary.map((pillar) => (
              <div key={pillar.pillarId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{pillar.pillar}</span>
                  <span className="text-gray-600">{pillar.pillarPercent}%</span>
                </div>
                <Progress value={pillar.pillarPercent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {results.findings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key findings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.findings.map((row, i) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-gray-900">{row.finding}</p>
                  <p className="text-sm text-gray-600 mt-1">{row.whyItMatters}</p>
                  <p className="text-sm text-[#0A4D3E] mt-2">{row.recommendedImmediateAction}</p>
                  <Badge className="mt-2" variant="outline">
                    {row.severity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminScoringScreen;
