import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const epaLines = fs.readFileSync(path.join(root, "src/pages/EmissionResultsEpaIpcc.tsx"), "utf8").split(/\r?\n/);
const helpers = epaLines.slice(10, 247).join("\n");
let chunk = fs.readFileSync(path.join(root, "src/utils/_exportChunk.txt"), "utf8");
chunk = chunk
  .split("\n")
  .map((l) => (l.startsWith("  ") ? l.slice(2) : l))
  .join("\n");

const header = `import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { EpaIpccResultsData, EmissionCategoryTotal } from "@/lib/epaIpccResults";

export type EmissionReportFuelFramework = "uk" | "epa";

export interface FullEmissionReportExportOptions {
  user: User | null;
  results: EpaIpccResultsData;
  isMariUser: boolean;
  fuelFramework: EmissionReportFuelFramework;
  submittedAt?: string;
  fileName?: string;
}

export function mapEmissionResultsPageToCalculatorShape(
  breakdown: { key: string; label: string; value: number }[],
  scope2Breakdown: { key: string; label: string; value: number }[],
  scope3Breakdown: { key: string; label: string; value: number }[]
): EpaIpccResultsData {
  const s1Key: Record<string, string> = {
    epa_mobile: "mobile",
    epa_on_road_gas: "onroad_gas",
    epa_on_road_diesel: "onroad_diesel",
    epa_non_road: "nonroad",
  };
  const scope1: EmissionCategoryTotal[] = breakdown.map((b) => ({
    key: s1Key[b.key] ?? b.key,
    label: b.label,
    value: b.value,
  }));

  const s2Key: Record<string, string> = {
    scope2_electricity: "electricity",
    epa_heat_steam: "heatsteam",
    scope2_heatsteam: "heatsteam",
  };
  const scope2: EmissionCategoryTotal[] = scope2Breakdown.map((b) => ({
    key: s2Key[b.key] ?? b.key,
    label: b.label,
    value: b.value,
  }));

  const s3Key: Record<string, string> = {
    scope3_purchased_goods: "purchased_goods",
    scope3_capital_goods: "capital_goods",
    scope3_fuel_energy: "fuel_energy",
    scope3_upstream_transport: "upstream_transport",
    scope3_waste_generated: "waste",
    scope3_business_travel: "business_travel",
    scope3_employee_commuting: "employee_commuting",
    scope3_investments: "investments",
    scope3_downstream_transport: "downstream_transport",
    scope3_end_of_life: "end_of_life",
    scope3_processing_sold: "processing_sold",
    scope3_use_of_sold: "use_of_sold",
    scope3_facilitated: "facilitated",
  };
  const scope3: EmissionCategoryTotal[] = scope3Breakdown.map((b) => ({
    key: s3Key[b.key] ?? b.key.replace(/^scope3_/, ""),
    label: b.label,
    value: b.value,
  }));

  const t1 = scope1.reduce((s, r) => s + r.value, 0);
  const t2 = scope2.reduce((s, r) => s + r.value, 0);
  const t3 = scope3.reduce((s, r) => s + r.value, 0);
  return {
    scope1,
    scope2,
    scope3,
    totals: { scope1: t1, scope2: t2, scope3: t3, grand: t1 + t2 + t3 },
  };
}

`;

const out = `${header}
${helpers}

export async function exportFullEmissionReportPdf(opts: FullEmissionReportExportOptions): Promise<void> {
  const user = opts.user;
  const results = opts.results;
${chunk
  .split("\n")
  .map((l) => (l.length ? `  ${l}` : l))
  .join("\n")}
}
`;

fs.writeFileSync(path.join(root, "src/utils/fullEmissionReportExport.ts"), out);
console.log("Wrote fullEmissionReportExport.ts");
