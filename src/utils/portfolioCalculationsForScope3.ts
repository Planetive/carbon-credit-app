import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAggregateFormulaId,
  selectImportableFinancedRows,
  type FinancedCalcKind,
  type FinancedCalculationRow,
  type FinancedRowSource,
} from "@/utils/financedEmissionsReporting";

/** Row shape expected by Investments / Facilitated import dialogs */
export type PortfolioCalculationForScope3 = {
  id: string;
  source: FinancedRowSource;
  counterpartyId: string | null;
  counterpartyName: string;
  formulaName: string | null;
  formulaId: string | null;
  financedEmissions: number;
  createdAt: string;
  legacySource?: string | null;
  legacyId?: string | null;
};

/**
 * Link fields for a Category 15 / facilitated import.
 * JWT rows are stored on app.financed_emissions and must not be written into the
 * legacy emission_calculations / finance_emission_calculations foreign keys.
 */
export function scope3ImportLinkPayload(
  row: Pick<PortfolioCalculationForScope3, "id" | "source">,
): Record<string, unknown> {
  if (row.source === "jwt") {
    return { linked_financed_emissions_id: row.id };
  }
  if (row.source === "emission_calculations") {
    return { linked_emission_calculation_id: row.id };
  }
  return { linked_finance_emission_calculation_id: row.id };
}

function counterpartyLabel(
  counterpartyId: string | null,
  nameById: Map<string, string>,
): string {
  if (!counterpartyId) return "Portfolio aggregate";
  return nameById.get(counterpartyId) || "Counterparty";
}

/**
 * Apply the financed-emissions reporting contract to Scope 3 import candidates.
 * Never returns both an aggregate and its component rows for the same counterparty.
 */
export function mapPortfolioCalculationsForScope3(
  rows: FinancedCalculationRow[],
  mode: FinancedCalcKind,
  nameById: Map<string, string>,
): PortfolioCalculationForScope3[] {
  const importable = selectImportableFinancedRows(rows, mode);
  const out = importable.map((row) => {
    const aggregate = isAggregateFormulaId(row.formulaId);
    return {
      id: row.id,
      source: row.source,
      counterpartyId: row.counterpartyId,
      counterpartyName: counterpartyLabel(row.counterpartyId, nameById),
      formulaName: row.formulaName
        ? String(row.formulaName)
        : aggregate
          ? "Portfolio total"
          : row.formulaId
            ? String(row.formulaId)
            : null,
      formulaId: row.formulaId,
      financedEmissions: row.financedEmissions,
      createdAt: row.createdAt || row.updatedAt || new Date().toISOString(),
      legacySource: row.legacySource ?? null,
      legacyId: row.legacyId ?? null,
    };
  });
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

/**
 * Loads completed finance or facilitated portfolio calculations for Scope 3 import
 * (Category 15 investments financed lines & facilitated emissions).
 *
 * Uses the same selection contract as dashboard / company detail: one logical
 * total per counterparty, never aggregate plus components.
 */
export async function loadFinancedReportingRowsSafe(): Promise<FinancedCalculationRow[]> {
  try {
    const { PortfolioClient } = await import("@/integrations/supabase/portfolioClient");
    return await PortfolioClient.listFinancedReportingRows();
  } catch {
    return [];
  }
}

export async function loadScope3FinancedImportContext(
  _supabase: SupabaseClient,
  _userId: string,
  mode: "finance" | "facilitated",
  counterpartyId: string | null,
): Promise<{
  candidates: PortfolioCalculationForScope3[];
  reportingRows: FinancedCalculationRow[];
}> {
  const { PortfolioClient } = await import("@/integrations/supabase/portfolioClient");
  const reportingRows = await PortfolioClient.listFinancedReportingRows();
  const scoped = counterpartyId
    ? reportingRows.filter((row) => row.counterpartyId === counterpartyId)
    : reportingRows;
  const counterparties = await PortfolioClient.getCounterparties();
  const nameById = new Map<string, string>();
  for (const cp of counterparties) {
    nameById.set(cp.id, (cp.name && String(cp.name).trim()) || "Counterparty");
  }
  return {
    candidates: mapPortfolioCalculationsForScope3(scoped, mode, nameById),
    reportingRows,
  };
}

export async function fetchPortfolioCalculationsForScope3(
  supabase: SupabaseClient,
  userId: string,
  mode: "finance" | "facilitated",
  counterpartyId: string | null,
): Promise<PortfolioCalculationForScope3[]> {
  const context = await loadScope3FinancedImportContext(
    supabase,
    userId,
    mode,
    counterpartyId,
  );
  return context.candidates;
}
