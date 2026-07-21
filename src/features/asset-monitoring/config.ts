export type MrvProfileId =
  | "facility_ghg"
  | "industrial_sensor"
  | "land_nature"
  | "enterprise_multi_asset"
  | "scope3_supplier"
  | "registry_project"
  | "disclosure_corporate"
  | "vert_os";

export type QuestionId =
  | "primary_objective"
  | "asset_types"
  | "site_count"
  | "geography"
  | "monitoring_parameters"
  | "data_sources"
  | "verification_level"
  | "frameworks"
  | "reporting_cadence"
  | "integration_need";

export type SingleAnswer = string;
export type MultiAnswer = string[];

export type MrvQuestionnaireAnswers = Partial<
  Record<QuestionId, SingleAnswer | MultiAnswer>
>;

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface MrvQuestion {
  id: QuestionId;
  title: string;
  subtitle: string;
  type: "single" | "multi";
  options: QuestionOption[];
  minSelections?: number;
}

export interface MrvProfile {
  id: MrvProfileId;
  name: string;
  tagline: string;
  summary: string;
  capabilities: string[];
  dataSources: string[];
  bestFor: string;
}

export const MRV_PROFILES: Record<MrvProfileId, MrvProfile> = {
  facility_ghg: {
    id: "facility_ghg",
    name: "Facility Energy & GHG MRV",
    tagline: "Site-level Scope 1 & 2 with utility and meter evidence",
    summary:
      "Track emissions and energy across buildings and plants using invoices, sub-meters, and periodic reconciliations aligned to GHG Protocol.",
    capabilities: [
      "Asset-level emission factors and boundaries",
      "Energy intensity and year-on-year variance",
      "Audit-ready activity data trails",
    ],
    dataSources: ["Utility invoices", "Sub-meter reads", "ERP energy modules"],
    bestFor: "Single-country operators with a manageable site portfolio",
  },
  industrial_sensor: {
    id: "industrial_sensor",
    name: "Industrial Process & Sensor MRV",
    tagline: "High-frequency monitoring for plants and process emissions",
    summary:
      "Combine IoT, SCADA, and lab data for methane, combustion, CCUS, or hydrogen performance with near real-time exception alerts.",
    capabilities: [
      "Continuous sensor ingestion and QA/QC rules",
      "Process-level KPIs and threshold alerting",
      "Immutable change logs for verifiers",
    ],
    dataSources: ["IoT / SCADA", "Lab certificates", "ERP production data"],
    bestFor: "Manufacturing, oil & gas, chemicals, and heavy industry",
  },
  land_nature: {
    id: "land_nature",
    name: "Land & Nature-Based MRV",
    tagline: "Earth observation plus field plots for land and biomass",
    summary:
      "Monitor land cover, biomass, or blue-carbon indicators with satellite baselines, ground truthing, and geospatial audit packages.",
    capabilities: [
      "Parcel / project boundary management",
      "Remote sensing change detection",
      "Field survey and sample workflows",
    ],
    dataSources: ["Satellite imagery", "Drone surveys", "Field measurements"],
    bestFor: "Forestry, agriculture, mangroves, and restoration portfolios",
  },
  vert_os: {
    id: "vert_os",
    name: "Vert-OS",
    tagline: "Vertical farming & hydroponics MRV",
    summary:
      "Monitor controlled-environment agriculture (CEA) with grow-room energy, water–nutrient cycles, yield, and Scope 1–2 footprints—sensor-ready for racks, HVAC, lighting, and recirculation systems.",
    capabilities: [
      "Per-zone energy, lighting, and climate KPIs",
      "Water use, runoff, and nutrient-load tracking",
      "Yield, waste, and kg CO₂e per kg produce",
    ],
    dataSources: [
      "Environmental controllers & BMS",
      "Sub-metering (HVAC / LED)",
      "IoT pH, EC, flow, and reservoir sensors",
    ],
    bestFor: "Indoor farms, greenhouses with hydroponics, and vertical production operators",
  },
  enterprise_multi_asset: {
    id: "enterprise_multi_asset",
    name: "Enterprise Multi-Asset MRV",
    tagline: "Unified monitoring across diverse sites and regions",
    summary:
      "Roll up heterogeneous assets under one governance model with role-based data ownership, standardized KPIs, and consolidated assurance.",
    capabilities: [
      "Hierarchical asset registry",
      "Cross-region normalization rules",
      "Executive dashboards and drill-down",
    ],
    dataSources: ["Mixed ERP feeds", "Regional utility data", "Manual attestations"],
    bestFor: "Global corporates with 10+ sites and mixed asset classes",
  },
  scope3_supplier: {
    id: "scope3_supplier",
    name: "Scope 3 & Supplier MRV",
    tagline: "Upstream and downstream evidence through suppliers",
    summary:
      "Collect supplier-specific activity data, score data quality, and apply hybrid spend- and activity-based methods for Category 1–15 coverage.",
    capabilities: [
      "Supplier engagement campaigns",
      "Data quality scoring (primary vs secondary)",
      "Category-level roll-ups for reporting",
    ],
    dataSources: ["Supplier portals", "Procurement ERP", "Industry averages"],
    bestFor: "Retail, FMCG, and firms where value-chain emissions dominate",
  },
  registry_project: {
    id: "registry_project",
    name: "Registry-Ready Project MRV",
    tagline: "Verification-grade evidence for credit issuance",
    summary:
      "Structure monitoring plans, baselines, and permanence evidence to satisfy Verra, Gold Standard, or Article 6 independent verification.",
    capabilities: [
      "Monitoring plan templates",
      "Evidence bundles for VVB review",
      "Issuance and retirement traceability",
    ],
    dataSources: ["Project sensors", "Satellite MRV", "Third-party VVB reports"],
    bestFor: "Carbon project developers and credit offtakers",
  },
  disclosure_corporate: {
    id: "disclosure_corporate",
    name: "Disclosure-Aligned Corporate MRV",
    tagline: "Investor-grade metrics mapped to CSRD / ISSB",
    summary:
      "Link operational MRV outputs to disclosure controls, materiality, and assurance workflows expected by investors and regulators.",
    capabilities: [
      "Framework mapping (CSRD, IFRS S2)",
      "Control checkpoints before publish",
      "Assurance readiness packs",
    ],
    dataSources: ["Corporate ESG systems", "Finance data", "Assurance workpapers"],
    bestFor: "Listed companies and firms facing mandatory climate disclosure",
  },
};

export const MRV_QUESTIONS: MrvQuestion[] = [
  {
    id: "primary_objective",
    title: "What is your primary reason for monitoring assets?",
    subtitle: "We use this to prioritize the MRV pathway that matches your outcome.",
    type: "single",
    options: [
      { value: "regulatory", label: "Regulatory or mandatory reporting", description: "CSRD, SEC, local EPR, etc." },
      { value: "credits", label: "Carbon credits or project verification", description: "Registry issuance and VVB review" },
      { value: "investors", label: "Investor / lender ESG disclosure", description: "Annual reports, CDP, sustainability bonds" },
      { value: "operations", label: "Operational efficiency and cost control", description: "Energy, waste, and process optimization" },
      { value: "supply_chain", label: "Supply chain transparency", description: "Scope 3 and supplier engagement" },
      { value: "net_zero", label: "Net-zero / science-based target tracking", description: "Progress against SBTi or internal targets" },
    ],
  },
  {
    id: "asset_types",
    title: "Which asset types do you need to monitor?",
    subtitle: "Select all that apply — mixed portfolios often need a hybrid MRV design.",
    type: "multi",
    minSelections: 1,
    options: [
      { value: "office", label: "Offices & commercial buildings" },
      { value: "manufacturing", label: "Manufacturing & industrial plants" },
      { value: "energy", label: "Energy & renewables (generation / grid)" },
      { value: "agriculture", label: "Agriculture & working lands (open field)" },
      { value: "vertical_farming", label: "Vertical farming & hydroponics (controlled environment)" },
      { value: "forestry", label: "Forestry & nature-based areas" },
      { value: "fleet", label: "Fleet & mobile combustion" },
      { value: "logistics", label: "Warehouses & logistics hubs" },
    ],
  },
  {
    id: "site_count",
    title: "How many sites or assets are in scope?",
    subtitle: "Scale influences data collection design and governance.",
    type: "single",
    options: [
      { value: "1", label: "1 site / asset" },
      { value: "2_10", label: "2–10 sites" },
      { value: "11_50", label: "11–50 sites" },
      { value: "51_plus", label: "51 or more sites" },
    ],
  },
  {
    id: "geography",
    title: "Where are these assets located?",
    subtitle: "Geography affects data availability, factors, and assurance approach.",
    type: "single",
    options: [
      { value: "single_country", label: "Single country" },
      { value: "multi_region", label: "Multiple countries, one region" },
      { value: "global", label: "Global footprint" },
    ],
  },
  {
    id: "monitoring_parameters",
    title: "What do you need to measure or verify?",
    subtitle: "Select all parameters that matter for your MRV scope.",
    type: "multi",
    minSelections: 1,
    options: [
      { value: "ghg", label: "GHG emissions (Scope 1–3)" },
      { value: "energy", label: "Energy consumption & intensity" },
      { value: "water", label: "Water withdrawal & discharge" },
      { value: "waste", label: "Waste & circularity" },
      { value: "biodiversity", label: "Biodiversity & land use change" },
      { value: "air", label: "Air quality & pollutants" },
      { value: "methane_process", label: "Methane / fugitive / process emissions" },
      { value: "renewable_output", label: "Renewable generation or avoided emissions" },
    ],
  },
];
