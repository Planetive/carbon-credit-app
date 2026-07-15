import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Calculator,
  ChartColumnBig,
  CheckCheck,
  CircleDollarSign,
  CloudLightning,
  Leaf,
  PieChart,
  Truck,
} from "lucide-react";

export type SolutionModuleKey =
  | "esg"
  | "accounting"
  | "mrv"
  | "management"
  | "risk"
  | "supplychain"
  | "ai"
  | "markets"
  | "portfolio";

type LabelValue = [label: string, value: string];
type Item = [title: string, body: string];

export type SolutionModule = {
  key: SolutionModuleKey;
  icon: LucideIcon;
  navLabel: string;
  kicker: string;
  headline: string;
  subhead: string;
  preview: LabelValue;
  previewNote: string;
  challenges: string[];
  capabilities: Item[];
  outcomes: string[];
  stats: [LabelValue, LabelValue];
};

export const solutionModuleOrder: SolutionModuleKey[] = [
  "esg",
  "accounting",
  "mrv",
  "management",
  "risk",
  "supplychain",
  "ai",
  "markets",
  "portfolio",
];

export const solutionModules: Record<SolutionModuleKey, SolutionModule> = {
  esg: {
    key: "esg",
    icon: CheckCheck,
    navLabel: "ESG Management",
    kicker: "ESG MANAGEMENT",
    headline: "Built for every stage of your sustainability journey.",
    subhead:
      "Understand what is financially and environmentally material, automate ESG data collection, align with IFRS S1, IFRS S2, SASB, GRI and TCFD, and generate decision-ready insights, not just reports.",
    preview: ["ESG maturity", "Developing"],
    previewNote: "Governance gap identified across 2 pillars",
    challenges: [
      "Fragmented data across teams",
      "Manual reporting cycles",
      "Poor visibility into gaps",
      "Uncertain peer position",
    ],
    capabilities: [
      ["Maturity scoring", "A structured score across governance, strategy, risk and disclosure."],
      ["Peer benchmarking", "See exactly how you compare to sector peers."],
      ["Gap prioritisation", "A ranked list of what to fix first."],
      ["AI recommendations", "Specific next steps generated from your data."],
    ],
    outcomes: [
      "Faster board reporting",
      "Higher investor confidence",
      "Clearer improvement plan",
      "Stronger audit readiness",
    ],
    stats: [["Maturity band", "Developing"], ["Priority gaps", "3 identified"]],
  },
  accounting: {
    key: "accounting",
    icon: Calculator,
    navLabel: "Carbon Accounting",
    kicker: "SCOPE 1, 2 AND 3 ACCOUNTING",
    headline: "Carbon accounting that behaves like enterprise software, not a spreadsheet.",
    subhead:
      "From raw activity data to an audit-ready inventory — mapping, emission factors, scope classification, calculation and disclosure in one connected system.",
    preview: ["Emissions total", "12,400 tCO2e"],
    previewNote: "Every figure traceable to source",
    challenges: [
      "Spreadsheet-based calculations",
      "No audit trail",
      "Inconsistent emission factors",
      "Slow quarter-end close",
    ],
    capabilities: [
      ["Automated ingestion", "Connect bills, ERP data and spend records directly."],
      ["GHG methodology", "Emission factors applied consistently across categories."],
      ["Full data lineage", "Trace any number back to its source."],
      ["Continuous recalculation", "Footprints update as new data arrives."],
    ],
    outcomes: [
      "Audit-ready by default",
      "Faster close cycles",
      "Fewer restatements",
      "Higher data confidence",
    ],
    stats: [["Total footprint", "12,400 tCO2e"], ["Scope 3 share", "55%"]],
  },
  mrv: {
    key: "mrv",
    icon: CheckCheck,
    navLabel: "Digital MRV",
    kicker: "DIGITAL MRV",
    headline: "Digital MRV that transforms climate data into trusted evidence",
    subhead:
      "Continuously capture, validate and secure climate data across the project lifecycle for auditors, investors and registries.",
    preview: ["Verification status", "12 of 14 sites"],
    previewNote: "Verified this reporting cycle",
    challenges: [
      "Manual site visits",
      "Paper-based evidence trails",
      "Inconsistent monitoring",
      "Verification delays",
    ],
    capabilities: [
      ["Continuous monitoring", "Site and sensor data captured on an ongoing basis."],
      ["Standardised reporting", "Output structured to match your methodology."],
      ["Verification-ready evidence", "Every claim backed by a traceable trail."],
      ["Open integrations", "Connects to existing monitoring hardware."],
    ],
    outcomes: [
      "Faster verification cycles",
      "Fewer audit findings",
      "Lower field costs",
      "Higher project credibility",
    ],
    stats: [["Sites verified", "12 of 14"], ["Avg cycle time", "3 weeks"]],
  },
  management: {
    key: "management",
    icon: Leaf,
    navLabel: "Carbon Management",
    kicker: "CARBON MANAGEMENT",
    headline: "Turn a footprint into a programme",
    subhead: "Targets, budgets and tracking that keep decarbonization on schedule.",
    preview: ["Target progress", "58%"],
    previewNote: "On track for 2030 target",
    challenges: [
      "Annual footprint, no follow-through",
      "No internal carbon budgets",
      "Targets set but not tracked",
      "Drift goes unnoticed",
    ],
    capabilities: [
      ["Target setting", "Science-based or custom reduction targets."],
      ["Internal carbon budgets", "Allocate budgets across business units."],
      ["Progress tracking", "See where you stand at any point in the year."],
      ["Early warning", "Flags before you drift off track."],
    ],
    outcomes: [
      "On-track targets",
      "Accountable business units",
      "Earlier course correction",
      "Board-level visibility",
    ],
    stats: [["Target progress", "58%"], ["Budget variance", "-4%"]],
  },
  risk: {
    key: "risk",
    icon: CloudLightning,
    navLabel: "Climate Risk Analysis",
    kicker: "CLIMATE RISK ANALYSIS",
    headline: "Physical and transition risk, modelled properly.",
    subhead:
      "Scenario analysis your board can actually use for decisions, moving beyond compliance to strategic financial resilience.",
    preview: ["Overall exposure", "Elevated"],
    previewNote: "Transition risk drives the rating",
    challenges: [
      "Risk and disclosure treated separately",
      "No financial quantification",
      "Generic scenario templates",
      "Reports too technical for the board",
    ],
    capabilities: [
      ["Physical risk modelling", "Exposure to extreme weather and climate shifts."],
      ["Transition risk modelling", "Policy, market and technology risk."],
      ["Scenario analysis", "1.5 to 4 degree pathways on your asset base."],
      ["Board-ready narrative", "Written for a board pack, not an appendix."],
    ],
    outcomes: [
      "Clearer capital allocation",
      "Stronger regulator readiness",
      "Fewer surprises",
      "Board-level confidence",
    ],
    stats: [["Physical risk", "Moderate"], ["Transition risk", "Elevated"]],
  },
  supplychain: {
    key: "supplychain",
    icon: Truck,
    navLabel: "Supply Chain Intelligence",
    kicker: "SUPPLY CHAIN INTELLIGENCE",
    headline: "Visibility into the emissions you do not control",
    subhead: "Map, engage and track suppliers without chasing spreadsheets.",
    preview: ["Supplier engagement", "84%"],
    previewNote: "Onboarding rate this quarter",
    challenges: [
      "Scope 3 data that never arrives",
      "No supplier accountability",
      "Manual outreach at scale",
      "Hotspots hidden in the data",
    ],
    capabilities: [
      ["Hotspot mapping", "Identify which suppliers drive the most emissions."],
      ["Structured outreach", "Requests suppliers can actually complete."],
      ["Supplier scorecards", "Track engagement and performance over time."],
      ["Collaboration tools", "Work with suppliers on reduction."],
    ],
    outcomes: [
      "Higher response rates",
      "Better scope 3 coverage",
      "Stronger supplier ties",
      "Faster data collection",
    ],
    stats: [["Suppliers engaged", "84%"], ["Data coverage", "3 tiers deep"]],
  },
  ai: {
    key: "ai",
    icon: Bot,
    navLabel: "AI Carbon Strategist",
    kicker: "AI CARBON STRATEGIST",
    headline: "Turn climate data into your next business decision",
    subhead:
      "Analyses your full sustainability dataset and tells you exactly where to act next, with reasoning your board can follow.",
    preview: ["Strategist recommendation", "Heat pump upgrade"],
    previewNote: "Projected 14% reduction at favourable cost per tonne",
    challenges: [
      "Fragmented data across teams",
      "Reporting cycles that take months",
      "Poor visibility into priorities",
      "Supplier engagement gaps",
    ],
    capabilities: [
      ["AI-powered insights", "Automatically identify the highest-impact opportunities."],
      ["Executive reporting", "Generate board-ready reports in minutes."],
      ["Supplier intelligence", "Monitor supplier performance across the chain."],
      ["Climate analytics", "Turn data into a strategic decision."],
    ],
    outcomes: [
      "Faster reporting cycles",
      "Higher data confidence",
      "Clearer prioritisation",
      "Stronger readiness",
    ],
    stats: [["Reduction target", "58%"], ["Top opportunity", "Heat pump upgrade"]],
  },
  markets: {
    key: "markets",
    icon: CircleDollarSign,
    navLabel: "Carbon Markets",
    kicker: "CARBON MARKETS",
    headline: "Credits you can defend, not just buy",
    subhead: "Source, price and track carbon credits with real diligence.",
    preview: ["Portfolio value", "4 project types"],
    previewNote: "Tracked and verified",
    challenges: [
      "Greenwashing risk",
      "Opaque pricing",
      "No portfolio-level tracking",
      "Weak project vetting",
    ],
    capabilities: [
      ["Vetted sourcing", "Project types screened against quality criteria."],
      ["Market pricing context", "Live benchmarks for your category."],
      ["Portfolio tracking", "Every purchase and retirement in one place."],
      ["Standards alignment", "Verra, Gold Standard, ICVCM."],
    ],
    outcomes: [
      "Defensible credit claims",
      "Better price discovery",
      "Full portfolio visibility",
      "Reduced reputational risk",
    ],
    stats: [["Project types", "4"], ["Portfolio status", "Fully tracked"]],
  },
  portfolio: {
    key: "portfolio",
    icon: PieChart,
    navLabel: "Portfolio Management",
    kicker: "PORTFOLIO MANAGEMENT",
    headline: "One view across every entity you manage",
    subhead: "Aggregate, compare and report without losing the detail underneath.",
    preview: ["Portfolio status", "3 entities"],
    previewNote: "1 needs review",
    challenges: [
      "Carbon managed per site in spreadsheets",
      "No cross-entity benchmarking",
      "Group reporting takes weeks",
      "Detail lost when rolling up",
    ],
    capabilities: [
      ["Multi-entity aggregation", "Roll up data from every site or subsidiary."],
      ["Cross-portfolio benchmarking", "Compare performance across holdings."],
      ["Group-level reporting", "Consolidated disclosures at the parent level."],
      ["Drill-down detail", "From summary to a single site in two clicks."],
    ],
    outcomes: [
      "Faster group reporting",
      "Consistent cross-entity data",
      "Easier benchmarking",
      "No detail lost",
    ],
    stats: [["Entities tracked", "3"], ["Needs review", "1"]],
  },
};

export const connectedModules: Array<{ key: SolutionModuleKey; label: string; icon: LucideIcon }> =
  solutionModuleOrder.map((key) => ({
    key,
    label: solutionModules[key].navLabel,
    icon: solutionModules[key].icon,
  }));

export const flowSteps = [
  "Discover",
  "Measure",
  "Analyse",
  "Decide",
  "Act",
  "Monitor",
];
