import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AIR_QUALITY_TOPIC_ID, ESG_TOPIC_CARDS, GHG_TOPIC_ID, WASTE_TOPIC_ID, WATER_TOPIC_ID } from "../topics/config";

const WORKSPACE_STORAGE_KEY = "esg_modules_workspace_v1";

const EsgTopicsScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const persistTopicVisit = useCallback((topicId: string) => {
    try {
      const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { focus_topic_ids?: string[] }) : {};
      const ids = new Set(Array.isArray(parsed.focus_topic_ids) ? parsed.focus_topic_ids : []);
      ids.add(topicId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ focus_topic_ids: [...ids] }));
    } catch {
      /* ignore */
    }
  }, []);

  const openTopic = (topicId: string) => {
    persistTopicVisit(topicId);
    if (topicId === GHG_TOPIC_ID) {
      navigate("/emission-calculator");
      return;
    }
    if (topicId === AIR_QUALITY_TOPIC_ID) {
      navigate("/esg-management/air-quality");
      return;
    }
    if (topicId === WATER_TOPIC_ID) {
      navigate("/esg-management/water-management");
      return;
    }
    if (topicId === WASTE_TOPIC_ID) {
      navigate("/esg-management/waste-management");
      return;
    }
  };

  return (
    <div className="min-w-0 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-teal-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">ESG topics</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Four topics are ready to use. Complete boundary setting first if you have not already. More topics are coming
          soon.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="border-2 border-slate-200 text-slate-800" asChild>
            <Link to="/esg-management/boundary-setting">Edit boundary setting & sites</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ESG_TOPIC_CARDS.map((t) => {
          const Icon = t.icon;
          const isLive = t.implementation === "full";
          const isGhg = t.id === GHG_TOPIC_ID;
          return (
            <div
              key={t.id}
              className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-5 transition-all duration-300 flex flex-col gap-3 h-full hover:border-slate-300"
            >
              <button
                type="button"
                onClick={() => {
                  if (!isLive) {
                    toast({ title: "Coming soon", description: `${t.label} will be available in a future release.` });
                    return;
                  }
                  openTopic(t.id);
                }}
                className="text-left flex gap-3 sm:gap-4 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 cursor-pointer"
              >
                <div className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm sm:text-base leading-snug text-slate-800">{t.label}</p>
                    {t.id === WASTE_TOPIC_ID && (
                      <Badge
                        variant="outline"
                        className="border-green-600 text-green-700 bg-green-50 text-[10px]"
                      >
                        GRI 306
                      </Badge>
                    )}
                    {!isLive && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{t.description}</p>
                </div>
              </button>
              {isGhg && isLive && (
                <Link
                  to="/esg-management/ghg/inventory-boundary"
                  className="text-xs font-medium text-slate-600 hover:text-teal-800 underline-offset-2 hover:underline pl-[3.25rem] sm:pl-[3.5rem]"
                >
                  GHG: emission sources & review →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EsgTopicsScreen;
