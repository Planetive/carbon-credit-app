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
  iconKey: "agriculture" | "renewable" | "biomass";
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
        id: "solar",
        name: "Solar energy",
        subtitle: "Solar PV Monitoring",
        cardDescription:
          "Track solar generation, inverter performance, and reporting across photovoltaic installations.",
        capabilities: "Track • Analyze • Export",
        status: "preview",
        description:
          "Site-level solar MRV for installed capacity, irradiance-adjusted generation, performance ratio, and export or self-consumption. " +
          "Align meter reads and inverter telemetry with registry and disclosure workflows.",
      },
      {
        id: "bess",
        name: "BESS",
        subtitle: "Battery Energy Storage",
        cardDescription:
          "Monitor charge cycles, round-trip efficiency, and grid services for battery storage assets.",
        capabilities: "Measure • Validate • Report",
        status: "preview",
        description:
          "Battery energy storage MRV for state of charge, round-trip efficiency, cycling, and grid or behind-the-meter services. " +
          "Support availability, degradation, and attributable emissions for hybrid renewable portfolios.",
      },
    ],
  },
  {
    id: "biomass",
    title: "Biomass",
    summary: "Feedstock and conversion monitoring for biomass operations.",
    iconKey: "biomass",
    modules: [
      {
        id: "biomass-core",
        name: "Biomass MRV",
        subtitle: "Feedstock & Conversion",
        cardDescription:
          "Manage feedstock tracking, sustainability data, and conversion monitoring for biomass operations.",
        capabilities: "Monitor • Report • Verify",
        status: "preview",
        description:
          "Monitor feedstock origin, moisture, and sustainability criteria alongside combustion or conversion outputs. " +
          "Reconcile mass–energy balances and emission factors for CHP, bioenergy, and industrial heat applications. " +
          "Package evidence for voluntary and compliance programs without spreadsheet sprawl.",
      },
    ],
  },
];

export const ASSET_MONITORING_UI_MODE_KEY = "asset-monitoring-ui-mode";
