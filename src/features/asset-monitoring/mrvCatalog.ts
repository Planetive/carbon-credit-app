export type AssetMonitoringUiMode = "questionnaire" | "catalog";

export type MrvModuleStatus = "preview" | "coming_soon" | "live";

export interface MrvCatalogModule {
  id: string;
  name: string;
  /** Legacy / extended copy; launcher cards use `cardDescription`. */
  description: string;
  subtitle: string;
  cardDescription: string;
  capabilities: string;
  status: MrvModuleStatus;
}

export interface MrvCatalogSection {
  id: string;
  title: string;
  summary?: string;
  iconKey: "agriculture" | "renewable" | "biochar" | "ccus";
  modules: MrvCatalogModule[];
}

export const MRV_CATALOG_SECTIONS: MrvCatalogSection[] = [
  {
    id: "agriculture",
    title: "Agriculture",
    summary: "Sustainable agriculture and controlled environment monitoring.",
    iconKey: "agriculture",
    modules: [
      {
        id: "vert-os",
        name: "Vert-OS",
        subtitle: "Indoor Farming & Hydroponics",
        cardDescription:
          "Monitor indoor farming operations, environmental conditions, and resource consumption for controlled agriculture.",
        capabilities: "Monitor • Report • Verify",
        status: "preview",
        description:
          "Vertical farming and hydroponics MRV for grow rooms—track energy, water–nutrient cycles, yield, and Scope 1–2 footprints across lighting, HVAC, and recirculation systems. " +
          "Connect environmental controllers and sub-meters for audit-ready, per-zone performance. " +
          "Report kg CO₂e per kg produce with immutable data trails for verifiers and buyers.",
      },
    ],
  },
  {
    id: "renewable",
    title: "Renewable energy",
    summary: "Generation and storage monitoring for renewable energy assets.",
    iconKey: "renewable",
    modules: [
      {
        id: "terra",
        name: "Terra",
        subtitle: "Solar PV & Battery Storage",
        cardDescription:
          "Track solar generation, inverter performance, and battery storage—charge cycles, efficiency, and grid services—in one hybrid renewable workspace.",
        capabilities: "Track • Measure • Report",
        status: "preview",
        description:
          "Combined solar and BESS MRV for installed PV capacity, irradiance-adjusted generation, performance ratio, and export or self-consumption, " +
          "alongside battery state of charge, round-trip efficiency, cycling, and grid or behind-the-meter services. " +
          "Align meter reads, inverter telemetry, and storage degradation with registry and disclosure workflows for hybrid renewable portfolios.",
      },
    ],
  },
  {
    id: "biochar",
    title: "BioChar",
    summary: "Feedstock and production monitoring for biochar operations.",
    iconKey: "biochar",
    modules: [
      {
        id: "helios",
        name: "Helios",
        subtitle: "Feedstock & Production",
        cardDescription:
          "Manage feedstock tracking, sustainability data, and production monitoring for biochar operations.",
        capabilities: "Monitor • Report • Verify",
        status: "preview",
        description:
          "Monitor feedstock origin, moisture, and sustainability criteria alongside pyrolysis or conversion outputs. " +
          "Reconcile mass–energy balances and carbon permanence for biochar production and application. " +
          "Package evidence for voluntary and compliance programs without spreadsheet sprawl.",
      },
    ],
  },
  {
    id: "ccus",
    title: "CCUS",
    summary: "Carbon capture, utilization, and storage monitoring for industrial and project assets.",
    iconKey: "ccus",
    modules: [
      {
        id: "sequest",
        name: "Sequest",
        subtitle: "Capture • Transport • Storage",
        cardDescription:
          "Monitor capture rates, transport integrity, and storage permanence for carbon capture, utilization, and storage projects.",
        capabilities: "Monitor • Report • Verify",
        status: "coming_soon",
        description:
          "CCUS MRV for capture facility performance, CO₂ stream composition, pipeline or shipping transport, and geological or utilization sinks. " +
          "Support measurement, reporting, and verification packages for project registries and compliance programs.",
      },
    ],
  },
];

export const ASSET_MONITORING_UI_MODE_KEY = "asset-monitoring-ui-mode";
