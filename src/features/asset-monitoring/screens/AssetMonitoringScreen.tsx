import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Leaf,
  RefreshCw,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MRV_NEEDS_ASSESSMENT_TYPE } from "@/features/asset-monitoring/constants";
import {
  MRV_PROFILES,
  MRV_QUESTIONS,
  type MrvProfileId,
  type MrvQuestionnaireAnswers,
} from "@/features/asset-monitoring/config";
import {
  computeMrvRecommendation,
  isQuestionnaireComplete,
} from "@/features/asset-monitoring/recommendation";
import AssetMonitoringCatalogView from "@/features/asset-monitoring/screens/AssetMonitoringCatalogView";
import AssetMonitoringModeToggle from "@/features/asset-monitoring/components/AssetMonitoringModeToggle";
import {
  ASSET_MONITORING_UI_MODE_KEY,
  type AssetMonitoringUiMode,
} from "@/features/asset-monitoring/mrvCatalog";

const profileIcons: Record<MrvProfileId, typeof Activity> = {
  facility_ghg: Activity,
  industrial_sensor: Satellite,
  land_nature: Leaf,
  enterprise_multi_asset: ShieldCheck,
  scope3_supplier: RefreshCw,
  registry_project: CheckCircle2,
  disclosure_corporate: Sparkles,
  vert_os: Sprout,
};

function sanitizeAnswers(raw: unknown): MrvQuestionnaireAnswers {
  if (!raw || typeof raw !== "object") return {};
  return raw as MrvQuestionnaireAnswers;
}

function readUiMode(): AssetMonitoringUiMode {
  if (typeof window === "undefined") return "questionnaire";
  return localStorage.getItem(ASSET_MONITORING_UI_MODE_KEY) === "catalog"
    ? "catalog"
    : "questionnaire";
}

const AssetMonitoringScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [uiMode, setUiMode] = useState<AssetMonitoringUiMode>(readUiMode);
  const [loading, setLoading] = useState(uiMode === "questionnaire");
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<MrvQuestionnaireAnswers>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = MRV_QUESTIONS[stepIndex];
  const progressPercent = submitted
    ? 100
    : Math.round(((stepIndex + 1) / MRV_QUESTIONS.length) * 100);

  const recommendation = useMemo(
    () => (submitted ? computeMrvRecommendation(answers) : null),
    [answers, submitted]
  );

  const handleUiModeChange = (mode: AssetMonitoringUiMode) => {
    setUiMode(mode);
    localStorage.setItem(ASSET_MONITORING_UI_MODE_KEY, mode);
    if (mode === "catalog") {
      setLoading(false);
    } else {
      setLoading(true);
    }
  };

  const catalogModeToggle = (
    <AssetMonitoringModeToggle mode={uiMode} onModeChange={handleUiModeChange} />
  );

  const modeToggleBar = (
    <div className="bg-[#F8FAF8]">
      <div className="mx-auto flex max-w-[1280px] justify-end px-6 py-3 md:px-12">
        <AssetMonitoringModeToggle mode={uiMode} onModeChange={handleUiModeChange} />
      </div>
    </div>
  );

  useEffect(() => {
    if (uiMode !== "questionnaire") return;
    const load = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("esg_assessments")
          .select("id, readiness_answers, status")
          .eq("user_id", user.id)
          .eq("assessment_type", MRV_NEEDS_ASSESSMENT_TYPE)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setAssessmentId((data as { id: string }).id);
          const status = (data as { status?: string }).status;
          const stored = sanitizeAnswers((data as { readiness_answers?: unknown }).readiness_answers);
          setAnswers(stored);
          if (status === "submitted" && isQuestionnaireComplete(stored)) {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error("Failed to load MRV questionnaire:", err);
        toast({
          title: "Could not load your MRV profile",
          description: "Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, toast, uiMode]);

  if (uiMode === "catalog") {
    return <AssetMonitoringCatalogView headerAccessory={catalogModeToggle} />;
  }

  const persist = async (nextAnswers: MrvQuestionnaireAnswers, status: "draft" | "submitted") => {
    if (!user) return false;
    setSaving(true);
    try {
      const completion = Math.round(
        (Object.keys(nextAnswers).length / MRV_QUESTIONS.length) * 100
      );
      const payload = {
        user_id: user.id,
        assessment_type: MRV_NEEDS_ASSESSMENT_TYPE,
        status,
        readiness_answers: nextAnswers,
        total_completion: status === "submitted" ? 100 : completion,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
        readiness_version: 1,
      };

      const result = assessmentId
        ? await supabase
            .from("esg_assessments")
            .update(payload as never)
            .eq("id", assessmentId)
            .eq("user_id", user.id)
            .select("id")
            .single()
        : await supabase
            .from("esg_assessments")
            .insert(payload as never)
            .select("id")
            .single();

      if (result.error) throw result.error;
      if (result.data) {
        setAssessmentId((result.data as { id: string }).id);
      }
      return true;
    } catch (err) {
      console.error("Failed to save MRV questionnaire:", err);
      toast({
        title: "Save failed",
        description: "Your answers could not be saved. Try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleMulti = (questionId: typeof currentQuestion.id, value: string) => {
    setAnswers((prev) => {
      const existing = prev[questionId];
      const list = Array.isArray(existing) ? [...existing] : existing ? [existing] : [];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [questionId]: next };
    });
  };

  const setSingle = (questionId: typeof currentQuestion.id, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isStepValid = (): boolean => {
    if (!currentQuestion) return false;
    const value = answers[currentQuestion.id];
    if (currentQuestion.type === "single") {
      return typeof value === "string" && value.length > 0;
    }
    const list = Array.isArray(value) ? value : [];
    const min = currentQuestion.minSelections ?? 1;
    return list.length >= min;
  };

  const handleNext = async () => {
    if (!isStepValid()) {
      toast({
        title: "Select an option to continue",
        description: "Please answer this question before moving on.",
        variant: "destructive",
      });
      return;
    }
    await persist(answers, "draft");
    if (stepIndex < MRV_QUESTIONS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      const complete = isQuestionnaireComplete(answers);
      if (!complete) return;
      const ok = await persist(answers, "submitted");
      if (ok) {
        setSubmitted(true);
        toast({
          title: "MRV pathway ready",
          description: "We matched your needs to the best monitoring approach.",
        });
      }
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const restartQuestionnaire = async () => {
    setAnswers({});
    setStepIndex(0);
    setSubmitted(false);
    await persist({}, "draft");
  };

  if (loading) {
    return (
      <>
        {modeToggleBar}
        <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
          Loading Asset Monitoring…
        </div>
      </>
    );
  }

  if (submitted && recommendation) {
    const primaryProfile = MRV_PROFILES[recommendation.primary];
    const PrimaryIcon = profileIcons[recommendation.primary];

    return (
      <>
        {modeToggleBar}
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <Badge variant="outline" className="mb-3 border-teal-200 text-teal-700 bg-teal-50">
            Asset Monitoring · MRV
          </Badge>
          <h1 className="text-3xl font-bold text-gray-900">Your recommended MRV pathway</h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Based on your questionnaire, this is the best starting configuration. You can explore
            other MRV options below — full monitoring workflows will roll out on this foundation.
          </p>
        </div>

        <Card className="border-teal-200/80 shadow-lg bg-gradient-to-br from-teal-50/80 to-white">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-teal-600 text-white">
                <PrimaryIcon className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-xl">{primaryProfile.name}</CardTitle>
                <CardDescription className="text-base text-teal-800/90 mt-1">
                  {primaryProfile.tagline}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{primaryProfile.summary}</p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              {recommendation.rationale.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              {primaryProfile.capabilities.map((cap) => (
                <Badge key={cap} variant="secondary">
                  {cap}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() =>
                  toast({
                    title: "Coming soon",
                    description: "Monitoring workflows for your recommended MRV path are in development.",
                  })
                }
              >
                Start with recommended MRV
              </Button>
              <Button variant="outline" onClick={restartQuestionnaire}>
                Retake questionnaire
              </Button>
            </div>
          </CardContent>
        </Card>

        {recommendation.secondary.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Also relevant for you</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendation.secondary.map((id) => {
                const profile = MRV_PROFILES[id];
                const Icon = profileIcons[id];
                return (
                  <Card key={id} className="border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-teal-600" />
                        <CardTitle className="text-base">{profile.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{profile.tagline}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">All MRV options</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(MRV_PROFILES) as MrvProfileId[]).map((id) => {
              const profile = MRV_PROFILES[id];
              const Icon = profileIcons[id];
              const isPrimary = id === recommendation.primary;
              return (
                <Card
                  key={id}
                  className={`transition-shadow hover:shadow-md ${
                    isPrimary ? "ring-2 ring-teal-500/40 border-teal-200" : "border-gray-200"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                      {isPrimary && (
                        <Badge className="bg-teal-600 hover:bg-teal-600">Recommended</Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm leading-snug">{profile.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500 mb-2">{profile.bestFor}</p>
                    <p className="text-sm text-gray-600 line-clamp-3">{profile.summary}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        </div>
      </>
    );
  }

  const selected = answers[currentQuestion.id];

  return (
    <>
      {modeToggleBar}
      <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Badge variant="outline" className="mb-3 border-teal-200 text-teal-700 bg-teal-50">
          Asset Monitoring · MRV setup
        </Badge>
        <h1 className="text-3xl font-bold text-gray-900">Find your MRV fit</h1>
        <p className="text-gray-600 mt-2">
          Answer a few questions so we can recommend the right monitoring, reporting, and verification
          (MRV) approach for your assets.
        </p>
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>
              Question {stepIndex + 1} of {MRV_QUESTIONS.length}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      <Card className="shadow-md border-gray-200/80">
        <CardHeader>
          <CardTitle className="text-xl">{currentQuestion.title}</CardTitle>
          <CardDescription>{currentQuestion.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.type === "single" &&
            currentQuestion.options.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSingle(currentQuestion.id, opt.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    active
                      ? "border-teal-500 bg-teal-50/80 ring-1 ring-teal-500/30"
                      : "border-gray-200 hover:border-teal-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-900">{opt.label}</div>
                  {opt.description && (
                    <div className="text-sm text-gray-500 mt-1">{opt.description}</div>
                  )}
                </button>
              );
            })}

          {currentQuestion.type === "multi" &&
            currentQuestion.options.map((opt) => {
              const list = Array.isArray(selected) ? selected : [];
              const active = list.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti(currentQuestion.id, opt.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                    active
                      ? "border-teal-500 bg-teal-50/80 ring-1 ring-teal-500/30"
                      : "border-gray-200 hover:border-teal-200 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-5 w-5 rounded border flex-shrink-0 flex items-center justify-center ${
                      active ? "bg-teal-600 border-teal-600" : "border-gray-300 bg-white"
                    }`}
                  >
                    {active && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{opt.label}</div>
                    {opt.description && (
                      <div className="text-sm text-gray-500 mt-1">{opt.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => (stepIndex === 0 ? navigate("/dashboard") : handleBack())}
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {stepIndex === 0 ? "Dashboard" : "Back"}
        </Button>
        <Button
          className="bg-teal-600 hover:bg-teal-700"
          onClick={handleNext}
          disabled={saving || !isStepValid()}
        >
          {stepIndex === MRV_QUESTIONS.length - 1 ? "See my MRV pathway" : "Continue"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      </div>
    </>
  );
};

export default AssetMonitoringScreen;
