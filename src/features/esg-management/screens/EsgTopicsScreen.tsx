import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AIR_QUALITY_TOPIC_ID,
  ESG_TOPIC_CARDS,
  GHG_TOPIC_ID,
  RESERVES_VALUATION_CAPEX_TOPIC_ID,
  WASTE_TOPIC_ID,
  WATER_TOPIC_ID,
  WORKFORCE_HEALTH_SAFETY_TOPIC_ID,
  INDIGENOUS_PEOPLES_RIGHTS_TOPIC_ID,
  COMMUNITY_RELATIONS_TOPIC_ID,
  BUSINESS_ETHICS_TOPIC_ID,
  BIODIVERSITY_TOPIC_ID,
  ENVIRONMENTAL_MANAGEMENT_TOPIC_ID,
} from "../topics/config";

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
    if (topicId === RESERVES_VALUATION_CAPEX_TOPIC_ID) {
      navigate("/esg-management/reserves-valuation");
      return;
    }
    if (topicId === WORKFORCE_HEALTH_SAFETY_TOPIC_ID) {
      navigate("/esg-management/workforce-health-safety");
      return;
    }
    if (topicId === INDIGENOUS_PEOPLES_RIGHTS_TOPIC_ID) {
      navigate("/esg-management/indigenous-rights");
      return;
    }
    if (topicId === COMMUNITY_RELATIONS_TOPIC_ID) {
      navigate("/esg-management/community-relations");
      return;
    }
    if (topicId === BUSINESS_ETHICS_TOPIC_ID) {
      navigate("/esg-management/business-ethics");
      return;
    }
    if (topicId === BIODIVERSITY_TOPIC_ID) {
      navigate("/esg-management/biodiversity");
      return;
    }
    if (topicId === ENVIRONMENTAL_MANAGEMENT_TOPIC_ID) {
      navigate("/esg-management/environmental-management");
      return;
    }
  };

  return (
    <div className="min-w-0 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            ESG Management
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">ESG topics</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Four topics are ready to use. Complete boundary setting first if you have not already. More topics are
            coming soon.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full shrink-0 border-2 border-slate-200 text-slate-800 sm:w-auto"
          asChild
        >
          <Link to="/esg-management/boundary-setting">Edit boundary & sites</Link>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ESG_TOPIC_CARDS.map((t) => {
          const Icon = t.icon;
          const isLive = t.implementation === "full";
          const isGhg = t.id === GHG_TOPIC_ID;
          return (
            <div
              key={t.id}
              className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-5 transition-all duration-300 flex flex-col gap-3 h-full hover:border-[#BFE3D3] hover:shadow-[0_10px_28px_-12px_rgba(11,77,61,0.18)]"
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
                className="text-left flex gap-3 sm:gap-4 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#1C7A53]/40 cursor-pointer"
              >
                <div className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-[#EAF7F1] text-[#0A4D3E] border border-[#BFE3D3]/50">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base leading-snug text-slate-800">
                    <span className="font-semibold">{t.label}</span>
                    {!isLive && (
                      <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Coming soon
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{t.description}</p>
                </div>
              </button>
              {isGhg && isLive && (
                <Link
                  to="/esg-management/ghg/inventory-boundary"
                  className="text-xs font-medium text-slate-600 hover:text-[#0F6E56] underline-offset-2 hover:underline pl-[3.25rem] sm:pl-[3.5rem]"
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
