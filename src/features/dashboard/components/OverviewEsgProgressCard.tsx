import type { LucideIcon } from "lucide-react";
import { Building2, Leaf, Users } from "lucide-react";

const CARD =
  "rounded-[16px] bg-white border border-[rgba(15,23,42,0.06)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_22px_rgba(15,23,42,0.025)] h-full min-h-[268px] grid grid-rows-[auto_1fr] px-4 py-[15px]";

const TRACK = "#E9EEF2";
const EMERALD = "#0F8A70";

const IMPACT_FILL: Record<string, string> = {
  Environment: "#2E8B73",
  Social: "#8B5CF6",
  Governance: "#1D9BF0",
};

function impactFill(label: string, fallback: string) {
  return IMPACT_FILL[label] ?? fallback;
}

export interface EsgImpactArea {
  label: string;
  pct: number;
  color: string;
  icon: LucideIcon;
}

interface OverviewEsgProgressCardProps {
  esgScore: number;
  readinessLabel: string;
  assessmentProgress: number;
  impactAreas: EsgImpactArea[];
  onViewAssessment: () => void;
}

const OverviewEsgProgressCard = ({
  esgScore,
  readinessLabel,
  assessmentProgress,
  impactAreas,
  onViewAssessment,
}: OverviewEsgProgressCardProps) => {
  return (
    <article className={CARD}>
      <header className="grid grid-cols-[1fr_auto] items-baseline gap-2 mb-2">
        <h2 className="text-[20px] font-semibold text-[#0F172A] leading-tight tracking-[-0.02em]">
          ESG Progress
        </h2>
        <button
          type="button"
          onClick={onViewAssessment}
          className="text-[13px] font-medium text-[#0F8A70] hover:text-[#0c7560] transition-colors shrink-0"
        >
          View assessment →
        </button>
      </header>

      <div className="grid grid-cols-[minmax(96px,31%)_1fr] min-h-0 h-full gap-0 items-center">
        <div className="flex flex-col items-center border-r border-slate-100 pr-3.5 self-center">
          <p className="text-[12px] font-medium text-[#64748B] mb-1 w-full text-center leading-tight">
            Readiness Score
          </p>
          <div className="relative w-[96px] h-[96px] shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={TRACK}
                strokeWidth="2.3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={EMERALD}
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeDasharray={`${esgScore}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-1">
              <span className="text-[22px] font-semibold text-[#0F172A] tabular-nums leading-none tracking-[-0.02em]">
                {Math.round(esgScore)}%
              </span>
            </div>
          </div>
          <p className="text-[13px] font-medium text-[#A16207] mt-1 leading-tight">{readinessLabel}</p>
        </div>

        <div className="flex flex-col justify-center pl-3.5 min-w-0 gap-2.5 self-center">
          <div>
            <div className="grid grid-cols-[1fr_auto] items-baseline gap-2 mb-1">
              <span className="text-[12px] font-medium text-[#64748B] leading-tight">
                Assessment progress
              </span>
              <span className="text-[13px] font-semibold text-[#0F172A] tabular-nums">
                {assessmentProgress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: TRACK }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${assessmentProgress}%`, backgroundColor: EMERALD }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#64748B] mb-1.5 leading-tight">Top Impact Areas</p>
            <div className="flex flex-col gap-[9px]">
              {impactAreas.map((area) => {
                const Icon = area.icon;
                const fill = impactFill(area.label, EMERALD);
                return (
                  <div key={area.label} className="min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Icon
                          className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="text-[12px] font-medium text-[#64748B] whitespace-nowrap">
                          {area.label}
                        </span>
                      </span>
                      <span className="text-[13px] font-semibold text-[#0F172A] tabular-nums shrink-0">
                        {area.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden w-full" style={{ backgroundColor: TRACK }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${area.pct}%`, backgroundColor: fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default OverviewEsgProgressCard;

export const defaultEsgImpactIcons = {
  environment: Leaf,
  social: Users,
  governance: Building2,
};
