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
  Wind,
} from "lucide-react";

export const GHG_TOPIC_ID = "ghg";
export const AIR_QUALITY_TOPIC_ID = "air_quality";
export const WATER_TOPIC_ID = "water_management";
export const BIODIVERSITY_TOPIC_ID = "biodiversity";
export const BUSINESS_ETHICS_TOPIC_ID = "business_ethics";

export type TopicImplementation = "full" | "coming_soon";

export type EsgTopicCard = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  implementation: TopicImplementation;
};

/**
 * Fixed order: 10 topic cards.
 * Active: GHG, Air Quality, Water Management. Coming soon: Biodiversity + six other topics below.
 */
export const ESG_TOPIC_CARDS: EsgTopicCard[] = [
  {
    id: GHG_TOPIC_ID,
    label: "GHG",
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
    label: "Biodiversity",
    description: "Habitats, species, and nature-related impacts.",
    icon: Leaf,
    implementation: "coming_soon",
  },
  {
    id: "environmental_management",
    label: "Environmental management",
    description: "Environmental systems, compliance, and permits.",
    icon: ClipboardCheck,
    implementation: "coming_soon",
  },
  {
    id: "reserves_valuation_capex",
    label: "Reserves & capital expenditure",
    description: "Reserves, asset valuation, and investment in operations.",
    icon: LineChart,
    implementation: "coming_soon",
  },
  {
    id: "workforce_health_safety",
    label: "Workforce health & safety",
    description: "Health, safety, and wellbeing at work.",
    icon: HeartPulse,
    implementation: "coming_soon",
  },
  {
    id: "emergency_management",
    label: "Emergency management",
    description: "Preparedness, response, and business continuity.",
    icon: ShieldAlert,
    implementation: "coming_soon",
  },
  {
    id: "indigenous_peoples_rights",
    label: "Indigenous peoples' rights",
    description: "Consent, land rights, engagement, and cultural heritage.",
    icon: Handshake,
    implementation: "coming_soon",
  },
  {
    id: BUSINESS_ETHICS_TOPIC_ID,
    label: "Business Ethics",
    description: "Anti-corruption, integrity, and ethical conduct.",
    icon: Scale,
    implementation: "coming_soon",
  },
];

/** @deprecated Use ESG_TOPIC_CARDS */
export const ESG_FOCUS_TOPICS = ESG_TOPIC_CARDS;
