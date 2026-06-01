import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Lightbulb, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computeReadiness, sanitizeReadinessAnswers, type ReadinessComputation } from "@/features/esg-readiness/scoring";
import { type ReadinessAnswers } from "@/features/esg-readiness/config";
import { ESG_READINESS_ASSESSMENT_TYPE } from "@/features/esg-readiness/constants";

const severityBadgeClass = (severity: string) => {
  if (severity === "Critical") return "bg-red-100 text-red-700";
  if (severity === "High") return "bg-orange-100 text-orange-700";
  if (severity === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

const ESGResultsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<ReadinessComputation | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: assessment, error } = await supabase
          .from("esg_assessments")
          .select("id, readiness_answers, submitted_at, status, assessment_type")
          .eq("user_id", user.id)
          .eq("assessment_type", ESG_READINESS_ASSESSMENT_TYPE)
          .eq("status", "submitted")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!assessment) {
          setResultData(null);
          return;
        }

        const assessmentId = (assessment as any).id as string;
        const answers = sanitizeReadinessAnswers((assessment as any).readiness_answers ?? {}) as ReadinessAnswers;
        setSubmittedAt((assessment as any).submitted_at ?? null);

        const { data: scoreData } = await supabase
          .from("esg_scores")
          .select("readiness_results")
          .eq("assessment_id", assessmentId)
          .single();

        const snapshot = (scoreData as any)?.readiness_results as ReadinessComputation | null;
        setResultData(snapshot ?? computeReadiness(answers));
      } catch (error) {
        console.error("Error loading readiness results:", error);
        setResultData(null);
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [user]);

  const redFlagFinding = useMemo(
    () => resultData?.findings.find((finding) => finding.finding.toLowerCase().includes("red flag")),
    [resultData]
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading readiness results...</div>;
  }

  if (!resultData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fa] px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>No readiness assessment submitted yet.</CardTitle>
            <CardDescription>Complete and submit the readiness assessment to view results.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/esg-health-check")}>Start readiness assessment</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">ESG Assessment Results</h1>
            <p className="text-slate-600 mt-1">
              {submittedAt ? `Completed on ${new Date(submittedAt).toLocaleDateString()}` : "Latest submitted readiness snapshot"}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Overall Readiness Score</CardTitle>
            <CardDescription>Your comprehensive readiness assessment</CardDescription>
          </CardHeader>
          <CardContent className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="flex items-center justify-center">
              <div className="relative h-56 w-56 rounded-full border-[14px] border-teal-500 flex items-center justify-center bg-white">
                <div className="text-center">
                  <p className="text-5xl font-bold text-slate-900">{Math.round(resultData.overallReadinessPercent)}%</p>
                  <Badge className="mt-2">{resultData.maturityBand}</Badge>
                  <p className="text-xs text-slate-500 mt-2">Completion {resultData.completionPercent}%</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {resultData.pillarSummary.map((row) => (
                <div key={row.pillarId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{row.pillar}</span>
                    <span className="font-semibold text-slate-900">{row.pillarPercent}%</span>
                  </div>
                  <Progress value={row.pillarPercent} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top strong pillar</CardTitle>
            </CardHeader>
            <CardContent>{resultData.topStrongPillars.join(", ")}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{resultData.weakestPillars.length > 1 ? "Joint weakest pillars" : "Weakest pillar"}</CardTitle>
            </CardHeader>
            <CardContent>{resultData.weakestPillars.join(", ")}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pillar summary table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Pillar</th>
                  <th className="py-2">Questions</th>
                  <th className="py-2">Possible max</th>
                  <th className="py-2">Actual score</th>
                  <th className="py-2">Pillar %</th>
                  <th className="py-2">Weight</th>
                  <th className="py-2">Weighted contribution</th>
                  <th className="py-2">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {resultData.pillarSummary.map((row) => (
                  <tr key={row.pillarId} className="border-b last:border-b-0">
                    <td className="py-2">{row.pillar}</td>
                    <td className="py-2">{row.questions}</td>
                    <td className="py-2">{row.possibleMax}</td>
                    <td className="py-2">{row.actualScore}</td>
                    <td className="py-2">{row.pillarPercent}%</td>
                    <td className="py-2">{Math.round(row.weight * 100)}%</td>
                    <td className="py-2">{row.weightedContribution}%</td>
                    <td className="py-2">{row.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Red flags
            </CardTitle>
            <CardDescription>
              {resultData.redFlags.length === 0 ? "No red flags triggered." : `${resultData.redFlags.length} red flag(s) triggered.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultData.redFlags.length === 0 ? (
              <div className="text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No red flags triggered.
              </div>
            ) : (
              resultData.redFlags.map((flag) => (
                <div key={flag.questionId} className="border rounded p-3 flex items-center justify-between gap-2">
                  <span className="text-sm">{flag.questionId}: {flag.questionText}</span>
                  <Badge className="bg-red-100 text-red-700">Score {flag.score}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Findings
            </CardTitle>
            <CardDescription>
              {redFlagFinding ? redFlagFinding.finding : "Summary actions based on your submitted readiness responses."}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Finding</th>
                  <th className="py-2">Why it matters</th>
                  <th className="py-2">Recommended immediate action</th>
                  <th className="py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {resultData.findings.map((finding, index) => (
                  <tr key={index} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-3">{finding.finding}</td>
                    <td className="py-2 pr-3">{finding.whyItMatters}</td>
                    <td className="py-2 pr-3">{finding.recommendedImmediateAction}</td>
                    <td className="py-2">
                      <Badge className={severityBadgeClass(finding.severity)}>{finding.severity}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => navigate("/esg-health-check")}>
            <Target className="h-4 w-4 mr-2" />
            Update Assessment
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="bg-teal-600 hover:bg-teal-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ESGResultsScreen;
