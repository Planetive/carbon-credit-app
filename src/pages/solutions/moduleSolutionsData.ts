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
    headline: "Build and manage carbon projects that fit your organisation.",
    subhead:
      "Capture your context, define the initiative, and get matched to real carbon project opportunities.",
    preview: ["My Projects", "Live"],
    previewNote: "Wizard → match → manage",
    challenges: [
      "Hard to turn intent into a concrete project",
      "Generic catalogues that ignore your criteria",
      "No single place to keep drafts and initiatives",
      "Credit registration questions left unanswered",
    ],
    capabilities: [
      ["Project wizard", "Organisation profile and project details in one flow."],
      ["AI matching", "Recommendations from the global project library."],
      ["My Projects", "View, continue and organise every initiative."],
      ["Credit intent", "Flag whether the project should pursue registration."],
    ],
    outcomes: [
      "Clear project drafts",
      "Matched opportunities",
      "Organised portfolio",
      "Faster next steps",
    ],
    stats: [["Workspace", "My Projects"], ["Matching", "AI-assisted"]],
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
    navLabel: "AI Carbon Consultant",
    kicker: "AI CARBON CONSULTANT",
    headline: "From climate goals to ranked recommendations you can act on.",
    subhead:
      "Share targets and constraints — get matched carbon projects with scores, credits and suitability reasoning.",
    preview: ["Top match", "95% fit"],
    previewNote: "Forest conservation · 12,000 tCO2e/yr",
    challenges: [
      "Too many project options, no clear way to compare them",
      "Goals and budget disconnected from opportunity screening",
      "Recommendations that cannot be traced to criteria",
      "Weeks to build a defensible shortlist manually",
    ],
    capabilities: [
      ["Structured goal intake", "Climate target, timeline and investment capacity in one form."],
      ["Global project matching", "Scored against the curated global projects library."],
      ["Match scoring", "Fit percentage and suitability reasons on every card."],
      ["Wizard handoff", "Carry recommendations into the project wizard pre-filled."],
    ],
    outcomes: [
      "Faster project shortlisting",
      "Clearer investment cases",
      "Traceable matching logic",
      "Smoother path to action",
    ],
    stats: [["Advisor", "Live"], ["Matching", "Criteria-based"]],
  },
  markets: {
    key: "markets",
    icon: CircleDollarSign,
    navLabel: "Carbon Markets",
    kicker: "CARBON MARKETS",
    headline: "Credits you can defend, not just buy.",
    subhead:
      "Explore compliance mechanisms and voluntary markets with pricing context and regional filters.",
    preview: ["Markets tracked", "50+"],
    previewNote: "Compliance and voluntary tabs",
    challenges: [
      "Greenwashing risk from opaque sourcing",
      "No pricing context for the region or instrument",
      "Compliance and voluntary markets treated the same",
      "Purchases disconnected from standards vetting",
    ],
    capabilities: [
      ["Markets & Mechanisms", "Searchable compliance and voluntary market tables."],
      ["Regional filters", "Country, region and status filters on live data."],
      ["Pricing context", "Price rates and ranges per instrument."],
      ["Standards alignment", "Verra, Gold Standard and ICVCM screening."],
    ],
    outcomes: [
      "Defensible credit claims",
      "Better price discovery",
      "Clearer market context",
      "Reduced reputational risk",
    ],
    stats: [["Explorer", "Markets & Mechanisms"], ["Coverage", "50+ markets"]],
  },
  portfolio: {
    key: "portfolio",
    icon: PieChart,
    navLabel: "Portfolio Management",
    kicker: "PORTFOLIO MANAGEMENT",
    headline: "Portfolio-level climate intelligence, one view across your entire book.",
    subhead:
      "Track counterparties, financed emissions and scenario analysis from the My Portfolio workspace.",
    preview: ["Counterparties", "4 live"],
    previewNote: "Emissions linked to exposures",
    challenges: [
      "Counterparty data spread across files and teams",
      "Financed emissions disconnected from the book",
      "Stress tests rebuilt manually each cycle",
      "Portfolio reports that take weeks to compile",
    ],
    capabilities: [
      ["Counterparty registry", "Sector, geography, type and exposure in one register."],
      ["Financed emissions", "Outstanding amounts from finance emission calculations."],
      ["Scenario analysis", "Stress-test the book from My Portfolio."],
      ["Portfolio reporting", "Export PDF summaries from the dashboard."],
    ],
    outcomes: [
      "Unified counterparty view",
      "Linked emissions data",
      "Faster risk analysis",
      "Cleaner reporting",
    ],
    stats: [["Workspace", "My Portfolio"], ["Standards", "PCAF"]],
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
