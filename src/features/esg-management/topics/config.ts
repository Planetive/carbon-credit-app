import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  Cloud,
  Droplets,
  Handshake,
  HeartPulse,
  Leaf,
  LineChart,
  Scale,
  ShieldAlert,
  Trash2,
  Wind,
} from "lucide-react";

export const GHG_TOPIC_ID = "ghg";
export const AIR_QUALITY_TOPIC_ID = "air_quality";
export const WATER_TOPIC_ID = "water_management";
export const WASTE_TOPIC_ID = "waste_management";
export const BIODIVERSITY_TOPIC_ID = "biodiversity";
export const ENVIRONMENTAL_MANAGEMENT_TOPIC_ID = "environmental_management";
export const BUSINESS_ETHICS_TOPIC_ID = "business_ethics";
export const RESERVES_VALUATION_CAPEX_TOPIC_ID = "reserves_valuation_capex";
export const WORKFORCE_HEALTH_SAFETY_TOPIC_ID = "workforce_health_safety";
export const EMERGENCY_MANAGEMENT_TOPIC_ID = "emergency_management";
export const INDIGENOUS_PEOPLES_RIGHTS_TOPIC_ID = "indigenous_peoples_rights";

export type TopicImplementation = "full" | "coming_soon";

export type EsgTopicCard = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  implementation: TopicImplementation;
  framework?: string;
};

/**
 * Fixed order: 11 topic cards.
 * Active: GHG, Air Quality, Water Management, Waste Management. Coming soon: Biodiversity + six other topics below.
 */
export const ESG_TOPIC_CARDS: EsgTopicCard[] = [
  {
    id: GHG_TOPIC_ID,
    label: "Greenhouse Gas Emissions",
    description: "Greenhouse gas emissions and climate-related reporting.",
    icon: Cloud,
    implementation: "full",
  },
  {
    id: AIR_QUALITY_TOPIC_ID,
    label: "Air Quality",
    description: "Air pollutants and how you manage them.",
    icon: Wind,
    implementation: "full",
  },
  {
    id: WATER_TOPIC_ID,
    label: "Water Management",
    description: "Water use, discharges, and stewardship.",
    icon: Droplets,
    implementation: "full",
  },
  {
    id: BIODIVERSITY_TOPIC_ID,
    label: "Biodiversity Impacts",
    description: "Habitats, species, and nature-related impacts.",
    icon: Leaf,
    implementation: "full",
  },
  {
    id: ENVIRONMENTAL_MANAGEMENT_TOPIC_ID,
    label: "Environmental Management of E&P Activities",
    description: "Environmental systems, compliance, and permits.",
    icon: ClipboardCheck,
    implementation: "full",
  },
  {
    id: RESERVES_VALUATION_CAPEX_TOPIC_ID,
    label: "Reserves Valuation & Capital Expenditures",
    description: "Reserves, asset valuation, and investment in operations.",
    icon: LineChart,
    implementation: "full",
  },
  {
    id: WORKFORCE_HEALTH_SAFETY_TOPIC_ID,
    label: "Workforce Health & Safety",
    description: "Health, safety, and wellbeing at work.",
    icon: HeartPulse,
    implementation: "full",
  },
  {
    id: EMERGENCY_MANAGEMENT_TOPIC_ID,
    label: "Emergency Management",
    description: "Preparedness, response, and business continuity.",
    icon: ShieldAlert,
    implementation: "full",
  },
  {
    id: INDIGENOUS_PEOPLES_RIGHTS_TOPIC_ID,
    label: "Indigenous Peoples' Rights",
    description: "Consent, land rights, engagement, and cultural heritage.",
    icon: Handshake,
    implementation: "full",
  },
  {
    id: BUSINESS_ETHICS_TOPIC_ID,
    label: "Business Ethics & Payments Transparency",
    description: "Anti-corruption, integrity, and ethical conduct.",
    icon: Scale,
    implementation: "full",
  },
  {
    id: WASTE_TOPIC_ID,
    label: "Waste Management",
    description: "Track waste generation, diversion and disposal aligned with GRI 306.",
    icon: Trash2,
    implementation: "full",
    framework: "GRI 306",
  },
];

/** @deprecated Use ESG_TOPIC_CARDS */
export const ESG_FOCUS_TOPICS = ESG_TOPIC_CARDS;
