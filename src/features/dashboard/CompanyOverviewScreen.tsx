import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileText,
  Layers3,
  Activity,
  Sparkles,
  Layers,
  Leaf,
  Lightbulb,
  LineChart as LineChartIcon,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import OverviewEmissionsCard, {
  OVERVIEW_EMISSIONS_SCOPE_COLORS,
} from "@/features/dashboard/components/OverviewEmissionsCard";
import OverviewEsgProgressCard from "@/features/dashboard/components/OverviewEsgProgressCard";

const kgToTco2e = (kg = 0) => Math.max(0, Number(kg) || 0) / 1000;

/** Placeholder trend only — historical inventory snapshots are not tracked yet. */
const MOCK_EMISSIONS_TREND = [
  { month: "Dec '23", scope1: 780, scope2: 1180, scope3: 210 },
  { month: "Jan '24", scope1: 800, scope2: 1200, scope3: 220 },
  { month: "Feb '24", scope1: 815, scope2: 1220, scope3: 235 },
  { month: "Mar '24", scope1: 830, scope2: 1250, scope3: 248 },
  { month: "Apr '24", scope1: 838, scope2: 1270, scope3: 260 },
  { month: "May '24", scope1: 842.5, scope2: 1284.3, scope3: 271.2 },
];

export interface CompanyOverviewScreenProps {
  displayName: string;
  organizationName: string;
  projectsCount: number;
  esgScorePercent: number | null;
  esgMaturityLabel: string;
  assessmentStatusLabel: string;
  assessmentProgressPercent?: number;
  impactEnvironmentPercent?: number;
  impactSocialPercent?: number;
  impactGovernancePercent?: number;
  emissionsTracked: boolean;
  scope1Kg?: number;
  scope2Kg?: number;
  scope3Kg?: number;
  monitoringModulesActive?: number;
}

/** Premium welcome hero — visual layers only; layout unchanged */
const HeroContourLines = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    preserveAspectRatio="none"
    viewBox="0 0 1440 400"
    aria-hidden
  >
    <g fill="none" stroke="white" strokeWidth="0.65" opacity="0.038">
      <path d="M-40,88 C180,62 320,118 520,92 S880,48 1120,86 S1360,102 1480,78" />
      <path d="M-60,142 C200,168 380,108 580,132 S920,156 1180,124 S1400,148 1520,118" />
      <path d="M-20,198 C240,172 420,218 640,188 S980,162 1220,204 S1380,188 1500,210" />
      <path d="M0,248 C220,228 460,268 700,242 S1020,218 1280,252 S1420,236 1480,248" />
      <path d="M80,52 C300,78 500,34 720,58 S1040,72 1260,44 S1380,56 1480,38" />
      <path d="M-80,268 C160,288 400,248 620,272 S940,292 1200,258 S1360,278 1520,262" />
      <path d="M-40,320 C280,300 520,340 760,312 S1080,288 1320,328 S1480,308 1520,318" />
      <path d="M0,360 C320,348 560,372 800,352 S1160,336 1440,368" />
    </g>
  </svg>
);

const HeroBotanicalLeaf = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 240 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M120 8 C72 48 28 112 36 188 C42 248 78 292 120 312 C162 292 198 248 204 188 C212 112 168 48 120 8 Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M120 40 V280"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M120 72 C92 88 68 118 58 152 M120 100 C148 116 172 146 182 180 M120 140 C96 158 78 188 72 220 M120 168 C144 184 166 214 172 246"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.55"
    />
  </svg>
);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const CompanyOverviewScreen = ({
  displayName,
  organizationName,
  projectsCount,
  esgScorePercent,
  esgMaturityLabel,
  assessmentStatusLabel,
  assessmentProgressPercent = 0,
  impactEnvironmentPercent = 0,
  impactSocialPercent = 0,
  impactGovernancePercent = 0,
  emissionsTracked,
  scope1Kg = 0,
  scope2Kg = 0,
  scope3Kg = 0,
  monitoringModulesActive = 0,
}: CompanyOverviewScreenProps) => {
  const navigate = useNavigate();
  const firstName = displayName?.split(" ")[0] || "Farhan";

  const esgScore = esgScorePercent ?? 0;
  const readinessLabel = esgMaturityLabel || "Not scored";
  const assessmentProgress = Math.min(100, Math.max(0, Math.round(assessmentProgressPercent)));

  const s1 = kgToTco2e(scope1Kg);
  const s2 = kgToTco2e(scope2Kg);
  const s3 = kgToTco2e(scope3Kg);
  const totalEmissions = s1 + s2 + s3;

  const envScore = Math.round(impactEnvironmentPercent);
  const socialScore = Math.round(impactSocialPercent);
  const govScore = Math.round(impactGovernancePercent);

  const donutData = useMemo(
    () =>
      OVERVIEW_EMISSIONS_SCOPE_COLORS.map((palette, index) => {
        const values = [s1, s2, s3];
        const names = ["Scope 1", "Scope 2", "Scope 3"];
        return { name: names[index], value: values[index], color: palette.chart };
      }),
    [s1, s2, s3]
  );

  const quickActions = [
    { label: "New Project", path: "/project-wizard", icon: Plus },
    { label: "Explore", path: "/explore", icon: Compass },
    { label: "Drafts", path: "/drafts", icon: FileText },
    { label: "Run ESG Assessment", path: "/esg-health-check", icon: ClipboardCheck },
    { label: "Invite Team Member", path: "/settings", icon: UserPlus },
  ];

  const orgDisplay = organizationName?.trim() || "Rethink Carbon";

  const emissionScopeRows = useMemo(
    () => [
      {
        label: "Scope 1",
        sub: "Direct emissions",
        value: s1,
      },
      {
        label: "Scope 2",
        sub: "Energy indirect",
        value: s2,
      },
      {
        label: "Scope 3",
        sub: "Other indirect",
        value: s3,
      },
    ],
    [s1, s2, s3]
  );

  const esgImpactAreas = useMemo(
    () => [
      { label: "Environment", pct: envScore, color: "bg-[#1D9E75]", icon: Leaf },
      { label: "Social", pct: socialScore, color: "bg-violet-500", icon: Users },
      { label: "Governance", pct: govScore, color: "bg-sky-500", icon: Building2 },
    ],
    [envScore, socialScore, govScore]
  );

  const aiInsight = useMemo(() => {
    if (totalEmissions <= 0) {
      return {
        body: "No emissions inventory is available yet. Complete your emission calculator to unlock scope-level insights and recommended actions.",
        actions: [
          "Open the emission calculator",
          "Add Scope 1 fuel and facility data",
          "Review Scope 2 electricity inputs",
        ],
      };
    }

    const shares = [
      { label: "Scope 1", value: s1 },
      { label: "Scope 2", value: s2 },
      { label: "Scope 3", value: s3 },
    ].sort((a, b) => b.value - a.value);
    const top = shares[0];
    const topPct = Math.round((top.value / totalEmissions) * 100);

    return {
      body: `${top.label} accounts for about ${topPct}% of your current inventory (${totalEmissions.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })} tCO₂e total). Focus reduction and data-quality efforts on that scope first, then validate supporting evidence for reporting.`,
      actions: [
        `Review ${top.label} category breakdown`,
        "Validate emission factors and activity data",
        "Export results for assurance readiness",
      ],
    };
  }, [s1, s2, s3, totalEmissions]);

  return (
    <div className="w-full space-y-3.5 pb-6">
      {/* Hero — integrated shell (not floating card) */}
      <div
        className="relative overflow-hidden text-white rounded-[14px] border border-white/[0.08] shadow-[0_2px_12px_rgba(29,158,117,0.18)]"
        style={{
          background: "linear-gradient(145deg, #0A4D3E 0%, #1C7A53 42%, #1D9E75 100%)",
        }}
      >
        <HeroContourLines />

        <div
          className="absolute -right-16 top-0 w-[420px] h-[320px] rounded-full blur-[100px] pointer-events-none opacity-[0.45]"
          style={{ background: "radial-gradient(circle, rgba(51, 192, 138, 0.45) 0%, transparent 70%)" }}
        />
        <div
          className="absolute right-[10%] bottom-0 w-[280px] h-[240px] rounded-full blur-[80px] pointer-events-none opacity-[0.35]"
          style={{ background: "radial-gradient(circle, rgba(34, 184, 126, 0.4) 0%, transparent 68%)" }}
        />

        <HeroBotanicalLeaf className="absolute -right-10 -top-14 w-[360px] h-[468px] text-white/[0.06] pointer-events-none hidden md:block" />
        <HeroBotanicalLeaf className="absolute -right-24 bottom-[-88px] w-[440px] h-[572px] text-white/[0.05] pointer-events-none hidden lg:block rotate-[18deg]" />

        <div
          className="absolute -left-24 top-[-20px] w-[480px] h-[260px] rounded-full blur-[90px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(159, 225, 203, 0.28) 0%, rgba(29, 158, 117, 0.12) 45%, transparent 72%)",
          }}
        />
        <div
          className="absolute left-0 top-0 w-[min(480px,70%)] h-[180px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 85% 75% at 20% 40%, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative px-[18px] pt-5 pb-4 flex flex-col">
          <div className="relative max-w-xl z-[1] pb-1">
            <h1 className="text-[38px] leading-[1.15] font-medium tracking-[-0.03em] text-white">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1.5 text-base leading-[1.5] text-[#DFFBEF]/90 font-normal tracking-[-0.01em]">
              Here&apos;s your sustainability overview for today.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-white/[0.12]">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {(
                [
                  { icon: Building2, label: "Organization", value: orgDisplay },
                  { icon: Layers3, label: "Active Projects", value: String(projectsCount || 0) },
                  { icon: Sparkles, label: "ESG Score", value: esgScorePercent != null ? `${Math.round(esgScore)}%` : "—" },
                  {
                    icon: Activity,
                    label: "Monitoring Modules",
                    value: monitoringModulesActive > 0 ? `${monitoringModulesActive} Active` : "None",
                  },
                ] as const
              ).map((stat, index) => (
                <div
                  key={stat.label}
                  className={`group flex items-center gap-2.5 min-w-0 px-3.5 lg:px-4 py-2 transition-all duration-200 ease-out hover:bg-white/[0.06] ${
                    index % 2 === 1 ? "border-l border-white/[0.1]" : ""
                  } ${index >= 2 ? "border-t border-white/[0.1] lg:border-t-0" : ""} ${
                    index > 0 ? "lg:border-l lg:border-white/[0.1]" : ""
                  }`}
                >
                  <stat.icon
                    className="h-[21px] w-[21px] flex-shrink-0 text-[#9FE1CB] transition-colors duration-200 group-hover:text-[#DFFBEF]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="min-w-0 flex flex-col justify-center gap-0.5">
                    <p
                      className="text-[10px] font-medium uppercase text-[#BFE3D3]/90 leading-none truncate"
                      style={{ letterSpacing: "0.14em" }}
                    >
                      {stat.label}
                    </p>
                    <p className="text-[17px] font-medium text-white leading-tight tracking-[-0.02em] truncate">
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Total Projects",
            value: String(projectsCount || 0),
            sub: projectsCount > 0 ? "Active in workspace" : "No projects yet",
            subGreen: projectsCount > 0,
            icon: Layers,
          },
          {
            label: "ESG Score",
            value: esgScorePercent != null ? `${Math.round(esgScore)}%` : "—",
            sub: readinessLabel,
            subGreen: esgScorePercent != null,
            icon: LineChartIcon,
          },
          {
            label: "Emissions Tracked",
            value: emissionsTracked ? "Yes" : "No",
            sub: emissionsTracked ? "Inventory available" : "No emissions data yet",
            subGreen: false,
            icon: Leaf,
          },
          {
            label: "Assessment Status",
            value: assessmentStatusLabel,
            sub:
              assessmentStatusLabel === "Complete"
                ? "Up to date"
                : assessmentStatusLabel === "Draft"
                  ? "In progress"
                  : "Start assessment",
            subGreen: false,
            icon: ClipboardCheck,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_18px_rgba(15,23,42,0.03)] px-5 py-[16px] flex items-center gap-4"
          >
            <div className="h-[45px] w-[45px] shrink-0 rounded-full bg-[#EAF7F1] border border-[#BFE3D3]/50 flex items-center justify-center">
              <kpi.icon className="h-[19px] w-[19px] text-[#1D9E75]" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 mb-0.5">{kpi.label}</p>
              <p className="text-[29px] font-medium text-gray-900 leading-[1.05] tracking-[-0.02em]">{kpi.value}</p>
              <p className={`text-xs font-medium mt-1 ${kpi.subGreen ? "text-[#1D9E75]" : "text-gray-500"}`}>
                {kpi.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Emissions + ESG — 60% / 40% on xl+ */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4 items-stretch">
        <OverviewEmissionsCard
          scopeRows={emissionScopeRows}
          donutData={donutData}
          totalEmissions={totalEmissions}
          onViewFullResults={() => navigate("/emission-results-calculator")}
        />
        <OverviewEsgProgressCard
          esgScore={esgScore}
          readinessLabel={readinessLabel}
          assessmentProgress={assessmentProgress}
          impactAreas={esgImpactAreas}
          onViewAssessment={() => navigate("/esg-health-check")}
        />
      </div>

      {/* Trend + AI + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-sm font-semibold text-gray-900">Emissions Trend</h2>
          <p className="text-xs text-gray-500 mb-4">
            Sample 6-month view (mock data — historical tracking coming soon)
          </p>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_EMISSIONS_TREND} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Line type="monotone" dataKey="scope1" stroke="#1D9E75" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="scope2" stroke="#E8C89A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="scope3" stroke="#4F7FD3" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-[#EAF7F1] flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-[#1D9E75]" strokeWidth={2} aria-hidden />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">AI Insight</h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{aiInsight.body}</p>
          <p className="text-xs font-semibold text-gray-800 mb-2">Recommended actions</p>
          <ul className="space-y-2">
            {aiInsight.actions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-xs text-gray-600">
                <Check className="h-3.5 w-3.5 text-[#1D9E75] mt-0.5 flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Quick Actions</h2>
          <ul className="divide-y divide-gray-50">
            {quickActions.map((action) => (
              <li key={action.label}>
                <button
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between py-3 text-sm text-gray-700 hover:text-[#0A4D3E] transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <action.icon className="h-4 w-4 text-gray-400 group-hover:text-[#1D9E75]" />
                    {action.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#1D9E75]" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Monitoring modules — empty state */}
      <div className="rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] -mt-[8%] overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1D9E75]">
              <Activity className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 leading-snug">
                Active Monitoring Modules
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">Manage your active MRV modules.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/asset-monitoring")}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#1D9E75]/70 bg-white px-4 py-2 text-sm font-medium text-[#0A4D3E] transition-colors hover:bg-[#EAF7F1]"
          >
            View all modules
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate("/asset-monitoring")}
          className="flex w-full flex-col items-center px-6 py-10 text-center transition-colors hover:bg-gray-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/30 focus-visible:ring-inset"
        >
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl border-2 border-dashed border-[#BFE3D3] bg-[#EAF7F1]/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF7F1] text-[#1D9E75]">
              <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
            </div>
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-400">
            Current Status
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">None</p>
        </button>
      </div>
    </div>
  );
};

export default CompanyOverviewScreen;
