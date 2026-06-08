import type { TopicFileMeta } from "../shared/fileMeta";

export type BiodiversityAssetData = {
  incidentCount: string;
  incidentNarrative: string;
  empInPlace: "" | "yes" | "no";
  empFilesMeta: TopicFileMeta[];
  envManagementPoliciesNarrative: string;
};

export type BiodiversityStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, BiodiversityAssetData>;
};

export const PROXIMITY_PLACEHOLDER_ROWS = [
  { key: "iucn", label: "Protected areas (IUCN)" },
  { key: "unesco", label: "UNESCO World Heritage Sites" },
  { key: "ramsar", label: "Ramsar wetlands" },
  { key: "kba", label: "Key Biodiversity Areas" },
  { key: "indigenous", label: "Indigenous or community land" },
] as const;
