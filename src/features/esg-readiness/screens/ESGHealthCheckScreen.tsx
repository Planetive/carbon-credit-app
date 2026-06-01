import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Leaf,
  Save,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  READINESS_PILLARS,
  type PillarId,
  type QuestionId,
  type ReadinessAnswers,
  type ScoreValue,
} from "@/features/esg-readiness/config";
import { computeReadiness, sanitizeReadinessAnswers } from "@/features/esg-readiness/scoring";
import { ESG_READINESS_ASSESSMENT_TYPE } from "@/features/esg-readiness/constants";

const scoreLabels: Record<number, string> = {
  0: "Not in place",
  1: "Ad hoc",
  2: "Early",
  3: "Defined",
  4: "Established",
  5: "Leading",
};

const pillarIcon: Record<PillarId, any> = {
  governance: Shield,
  strategy: Target,
  risk_management: Shield,
  metrics_data: BarChart3,
  climate_metrics: Leaf,
  disclosure: FileText,
};

const ESGHealthCheckScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePillarId, setActivePillarId] = useState<PillarId>("governance");
  const [expandedQuestionId, setExpandedQuestionId] = useState<QuestionId | null>(null);
  const [expandedRubrics, setExpandedRubrics] = useState<Record<QuestionId, boolean>>({} as Record<QuestionId, boolean>);
  const [answers, setAnswers] = useState<ReadinessAnswers>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<"draft" | "submitted" | null>(null);

  const metrics = useMemo(() => computeReadiness(answers), [answers]);
  const activePillar = READINESS_PILLARS.find((pillar) => pillar.id === activePillarId) ?? READINESS_PILLARS[0];

  useEffect(() => {
    const loadAssessment = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("esg_assessments")
          .select("id, readiness_answers, status, assessment_type")
          .eq("user_id", user.id)
          .eq("assessment_type", ESG_READINESS_ASSESSMENT_TYPE)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setAssessmentId((data as any).id);
          setAssessmentStatus(((data as any).status as "draft" | "submitted" | null) ?? null);
          setAnswers(sanitizeReadinessAnswers((data as any).readiness_answers ?? {}));
        }
      } catch (error) {
        console.error("Error loading readiness assessment:", error);
        toast({
          title: "Unable to load assessment",
          description: "Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadAssessment();
  }, [user, toast]);

  useEffect(() => {
    if (!expandedQuestionId && activePillar.questions.length > 0) {
      setExpandedQuestionId(activePillar.questions[0].id);
    }
  }, [activePillar, expandedQuestionId]);

  const updateAnswer = (questionId: QuestionId, score: ScoreValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const persistAssessment = async (status: "draft" | "submitted") => {
    if (!user) return false;
    setSaving(true);
    try {
      if (status === "draft" && assessmentStatus === "submitted") {
        toast({
          title: "Assessment already submitted",
          description: "Draft save is disabled for submitted assessments.",
        });
        return false;
      }

      const readiness = computeReadiness(answers);
      if (status === "submitted" && !readiness.isSubmissionReady) {
        toast({
          title: "Complete all questions before submission",
          description: `Please answer all ${readiness.totalQuestions} questions first.`,
          variant: "destructive",
        });
        return false;
      }

      const payload = {
        user_id: user.id,
        assessment_type: ESG_READINESS_ASSESSMENT_TYPE,
        status,
        readiness_answers: answers,
        total_completion: readiness.completionPercent,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
        readiness_version: 1,
      };

      const result = assessmentId
        ? await supabase
            .from("esg_assessments")
            .update(payload as any)
            .eq("id", assessmentId)
            .eq("user_id", user.id)
            .select("id")
            .single()
        : await supabase.from("esg_assessments").insert(payload as any).select("id").single();

      if (result.error) throw result.error;
      const currentAssessmentId = (result.data as any)?.id ?? assessmentId;
      setAssessmentId(currentAssessmentId);
      setAssessmentStatus(status);

      if (status === "submitted" && currentAssessmentId) {
        const resultSnapshot = computeReadiness(answers);
        const scorePayload = {
          user_id: user.id,
          assessment_id: currentAssessmentId,
          readiness_results: resultSnapshot,
          readiness_overall_score: resultSnapshot.overallReadinessPercent,
          readiness_maturity_band: resultSnapshot.maturityBand,
          readiness_completion_pct: resultSnapshot.completionPercent,
          scored_by: "Automated System",
          scored_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const scoreResult = await supabase.from("esg_scores").upsert(scorePayload as any, { onConflict: "assessment_id" });
        if (scoreResult.error) throw scoreResult.error;
      }

      toast({
        title: status === "draft" ? "Draft saved" : "Assessment submitted",
        description: status === "draft" ? "Your readiness draft has been saved." : "Your readiness results are now available.",
      });
      return true;
    } catch (error) {
      console.error("Error saving readiness assessment:", error);
      toast({
        title: "Save failed",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const ok = await persistAssessment("submitted");
    if (ok) navigate("/esg-results");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading readiness assessment...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-medium text-slate-600">ESG Score</span>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-teal-500/30">
                {Math.round(metrics.completionPercent)}%
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-5 text-xs text-slate-500">
              {READINESS_PILLARS.slice(0, 3).map((pillar) => {
                const answered = pillar.questions.filter((q) => answers[q.id] !== undefined).length;
                const pct = Math.round((answered / pillar.questions.length) * 100);
                return (
                  <div key={pillar.id} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                    <span>{pillar.name.slice(0, 1)}: {pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Health Check Assessment</h1>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-xs font-medium text-teal-700">ESG Assessment</span>
              </div>
            </div>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
              Comprehensive evaluation of your organization&apos;s ISSB/IFRS readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {READINESS_PILLARS.map((pillar) => {
              const answeredInPillar = pillar.questions.filter((q) => answers[q.id] !== undefined).length;
              const pillarPct = Math.round((answeredInPillar / pillar.questions.length) * 100);
              const isActive = activePillarId === pillar.id;
              const Icon = pillarIcon[pillar.id];
              return (
                <button
                  key={pillar.id}
                  onClick={() => {
                    setActivePillarId(pillar.id);
                    setExpandedQuestionId(READINESS_PILLARS.find((p) => p.id === pillar.id)?.questions[0]?.id ?? null);
                  }}
                  className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left ${
                    isActive
                      ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md shadow-teal-500/10 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={`text-2xl font-bold ${isActive ? "text-teal-600" : "text-slate-400"}`}>{pillarPct}%</div>
                  </div>
                  <h3 className="font-semibold mb-1 mt-3 text-slate-800">{pillar.name}</h3>
                  <p className="text-xs text-slate-500">
                    {answeredInPillar}/{pillar.questions.length} answered
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">Weight {Math.round(pillar.weight * 100)}%</span>
                  </div>
                  <Progress value={pillarPct} className="h-1.5 mt-2" />
                </button>
              );
            })}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{activePillar.name} Assessment</h2>
                <p className="text-sm text-slate-500">One score (0-5) per question based on current evidence.</p>
              </div>
              <Badge variant="outline">{activePillar.questions.length} Questions</Badge>
            </div>

            <div className="p-4 space-y-3">
              {activePillar.questions.map((question, index) => {
                const isExpanded = expandedQuestionId === question.id;
                const selectedScore = answers[question.id];
                return (
                  <div key={question.id} className={`rounded-xl border-2 ${isExpanded ? "border-teal-400 bg-teal-50/20" : "border-slate-200 bg-white"}`}>
                    <button
                      onClick={() => setExpandedQuestionId(isExpanded ? null : question.id)}
                      className="w-full px-4 py-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${isExpanded ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{question.id}: {question.text}</p>
                          <p className="text-xs text-slate-500 mt-1">{question.whyItMatters}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {question.redFlag && <Badge variant="destructive">Red flag</Badge>}
                        <span className="text-xs text-slate-500">{selectedScore !== undefined ? `Score ${selectedScore}` : "Not scored"}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {[0, 1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              onClick={() => updateAnswer(question.id, score as ScoreValue)}
                              className={`rounded-lg border px-2 py-2 text-sm transition-all ${
                                selectedScore === score ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                              }`}
                            >
                              <div className="font-semibold">{score}</div>
                              <div className="text-[11px]">{scoreLabels[score]}</div>
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setExpandedRubrics((prev) => ({ ...prev, [question.id]: !prev[question.id] }))}
                          className="text-sm text-teal-700 inline-flex items-center gap-1"
                        >
                          {expandedRubrics[question.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          How to score this
                        </button>

                        {expandedRubrics[question.id] && (
                          <div className="rounded-lg border bg-slate-50 p-3 grid gap-1 text-xs">
                            {[0, 1, 2, 3, 4, 5].map((score) => (
                              <p key={score}>
                                <span className="font-semibold mr-1">{score}:</span>
                                {question.rubric[score as keyof typeof question.rubric]}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              disabled={saving || assessmentStatus === "submitted"}
              onClick={() => persistAssessment("draft")}
              className="h-11"
            >
              <Save className="h-4 w-4 mr-2" />
              {assessmentStatus === "submitted" ? "Draft disabled after submit" : saving ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              disabled={saving || !metrics.isSubmissionReady}
              onClick={handleSubmit}
              className="h-11 bg-teal-600 hover:bg-teal-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Submit Assessment
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {metrics.isSubmissionReady
              ? "All 22 questions answered. Ready to submit."
              : `Complete all 22 questions to submit (${metrics.answeredQuestions}/22 answered).`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ESGHealthCheckScreen;
