import type { SupabaseClient } from "@supabase/supabase-js";

/** Row shape expected by Investments / Facilitated import dialogs */
export type PortfolioCalculationForScope3 = {
  id: string;
  source: "emission_calculations" | "finance_emission_calculations";
  counterpartyName: string;
  formulaName: string | null;
  formulaId: string | null;
  financedEmissions: number;
  createdAt: string;
};

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Loads completed finance or facilitated portfolio calculations for Scope 3 import
 * (Category 15 investments financed lines & Category 16 facilitated).
 *
 * - `finance_emission_calculations` uses calculation_type `finance_emission` | `facilitated_emission`.
 * - `emission_calculations` aggregate rows use calculation_type `finance` | `facilitated` (see ESGWizard).
 *
 * When granular finance_emission_calculations exist for a counterparty, aggregate emission_calculations
 * for that counterparty are omitted to avoid duplicate totals in the import list.
 */
export async function fetchPortfolioCalculationsForScope3(
  supabase: SupabaseClient,
  userId: string,
  mode: "finance" | "facilitated",
  counterpartyId: string | null,
): Promise<PortfolioCalculationForScope3[]> {
  const ecTypes = mode === "finance" ? ["finance"] : ["facilitated"];
  const fecType = mode === "finance" ? "finance_emission" : "facilitated_emission";

  let fecQ = (supabase as any)
    .from("finance_emission_calculations")
    .select("id, counterparty_id, formula_id, formula_name, financed_emissions, status, created_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("calculation_type", fecType)
    .order("created_at", { ascending: false });

  if (counterpartyId) {
    fecQ = fecQ.eq("counterparty_id", counterpartyId);
  }

  let ecQ = (supabase as any)
    .from("emission_calculations")
    .select("id, counterparty_id, calculation_type, formula_id, financed_emissions, status, created_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("calculation_type", ecTypes)
    .order("created_at", { ascending: false });

  if (counterpartyId) {
    ecQ = ecQ.eq("counterparty_id", counterpartyId);
  }

  const [fecRes, ecRes] = await Promise.all([fecQ, ecQ]);

  if (fecRes.error) throw fecRes.error;
  if (ecRes.error) throw ecRes.error;

  const fecData = (fecRes.data || []) as Array<{
    id: string;
    counterparty_id: string;
    formula_id: string;
    formula_name: string;
    financed_emissions: number;
    created_at: string;
  }>;

  const ecData = (ecRes.data || []) as Array<{
    id: string;
    counterparty_id: string | null;
    formula_id: string;
    financed_emissions: number;
    created_at: string;
  }>;

  const fecCounterpartyIds = new Set(
    fecData.map((r) => r.counterparty_id).filter((id): id is string => Boolean(id)),
  );

  const ecFiltered = ecData.filter((r) => {
    if (!r.counterparty_id) return true;
    return !fecCounterpartyIds.has(r.counterparty_id);
  });

  const cpIds = [
    ...new Set([
      ...fecData.map((r) => r.counterparty_id),
      ...ecFiltered.map((r) => r.counterparty_id).filter((id): id is string => Boolean(id)),
    ]),
  ];

  const nameById = new Map<string, string>();
  if (cpIds.length > 0) {
    const { data: cps, error: cpErr } = await (supabase as any)
      .from("counterparties")
      .select("id, name")
      .in("id", cpIds);
    if (cpErr) throw cpErr;
    (cps || []).forEach((c: { id: string; name: string | null }) => {
      nameById.set(c.id, (c.name && String(c.name).trim()) || "Counterparty");
    });
  }

  const out: PortfolioCalculationForScope3[] = [];

  for (const r of fecData) {
    out.push({
      id: r.id,
      source: "finance_emission_calculations",
      counterpartyName: nameById.get(r.counterparty_id) || "Counterparty",
      formulaName: r.formula_name ? String(r.formula_name) : null,
      formulaId: r.formula_id ? String(r.formula_id) : null,
      financedEmissions: toNumber(r.financed_emissions),
      createdAt: r.created_at || new Date().toISOString(),
    });
  }

  for (const r of ecFiltered) {
    const cpId = r.counterparty_id;
    out.push({
      id: r.id,
      source: "emission_calculations",
      counterpartyName: cpId ? nameById.get(cpId) || "Counterparty" : "Portfolio aggregate",
      formulaName: r.formula_id && r.formula_id !== "aggregate" ? String(r.formula_id) : null,
      formulaId: r.formula_id ? String(r.formula_id) : null,
      financedEmissions: toNumber(r.financed_emissions),
      createdAt: r.created_at || new Date().toISOString(),
    });
  }

  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return out;
}
