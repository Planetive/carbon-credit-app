import type { SourceCategoryId, SourceCoverageRow } from "./boundaryTypes";

export const SOURCE_CATEGORY_DEFS: { id: SourceCategoryId; label: string; description: string }[] = [
  { id: "A", label: "Stationary combustion", description: "Fixed equipment burning fuel." },
  { id: "B", label: "Flaring", description: "Flare stacks and controlled combustion." },
  { id: "C", label: "Venting", description: "Venting releases (e.g. pneumatics, vents)." },
  { id: "D", label: "Fugitive emissions", description: "Leaks and fugitive sources." },
  { id: "E", label: "Mobile combustion", description: "Vehicles and mobile equipment." },
  {
    id: "F",
    label: "Purchased electricity (Scope 2)",
    description: "Indirect emissions from electricity your organisation buys (Scope 2).",
  },
];

export function defaultCoverageRows(): SourceCoverageRow[] {
  return SOURCE_CATEGORY_DEFS.map((d) => ({
    categoryId: d.id,
    categoryPresent: false,
    coverage: "not_applicable",
    exclusionReason: "",
    dataAvailability: "",
    dataQualityMode: "measured" as const,
  }));
}
