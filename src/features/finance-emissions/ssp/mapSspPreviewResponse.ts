/**
 * Phase 6C.2 — map backend POST /api/v1/ssp/calculate preview JSON for the Results panel.
 * Never invents financed-emission totals; missing values stay null.
 */

export type SspPreviewStatus = "complete" | "incomplete" | "unsupported" | "error" | string;

export interface SspPreviewScopeBreakdown {
  scope1: number | null;
  scope2: number | null;
  scope3: number | null;
}

export interface SspPreviewLayerRow {
  id: string;
  label: string;
  financedEmissions: number | null;
  factor?: number | null;
  dataQualityScore?: number | null;
  detail?: string | null;
}

export interface SspPreviewViewModel {
  status: SspPreviewStatus;
  code: string | null;
  message: string | null;
  financedEmissions: number | null;
  scopeBreakdown: SspPreviewScopeBreakdown;
  dataQualityScore: number | null;
  iaf: number | null;
  taf: number | null;
  poolFinancedEmissions: number | null;
  layers: {
    collateral: SspPreviewLayerRow[];
    loans: SspPreviewLayerRow[];
    pools: SspPreviewLayerRow[];
    tranches: SspPreviewLayerRow[];
    holdings: SspPreviewLayerRow[];
  };
  factorProvenance: {
    methodologyVersion: string | null;
    pcafRef: string | null;
    emissionsPath: string | null;
    notes: string[];
    warnings: string[];
    collateralMethods: string[];
  };
  isReportable: false;
  includeInPortfolio: false;
  missingOrBlocked: boolean;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

/**
 * Normalize a backend calculate response (or draft overlay) into a panel view-model.
 * Never invents zeros for missing financed emissions.
 */
export function mapSspPreviewResponse(raw: unknown): SspPreviewViewModel {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const status = text(body.status) || "incomplete";
  const scope = (body.scope_breakdown || body.scopeBreakdown || {}) as Record<string, unknown>;
  const collateral = Array.isArray(body.collateral) ? body.collateral : [];
  const loans = Array.isArray(body.loans) ? body.loans : [];
  const pools = Array.isArray(body.pools) ? body.pools : [];
  const tranches = Array.isArray(body.tranches) ? body.tranches : [];
  const holdings = Array.isArray(body.holdings) ? body.holdings : [];
  const notes = Array.isArray(body.notes) ? body.notes.map(String) : [];
  const warnings = Array.isArray(body.warnings) ? body.warnings.map(String) : [];

  const collateralMethods = collateral
    .map((row) => {
      const r = row as Record<string, unknown>;
      return text(r.method) || text((r.provenance as Record<string, unknown> | undefined)?.method);
    })
    .filter((v): v is string => Boolean(v));

  const financed = num(body.financed_emissions ?? body.financedEmissions);
  const missingOrBlocked =
    status !== "complete" || financed == null || body.is_reportable === true;

  return {
    status,
    code: text(body.code),
    message: text(body.message),
    financedEmissions: financed,
    scopeBreakdown: {
      scope1: num(scope.scope1),
      scope2: num(scope.scope2),
      scope3: num(scope.scope3),
    },
    dataQualityScore: num(body.data_quality_score ?? body.dataQualityScore),
    iaf: num(body.iaf),
    taf: num(body.taf),
    poolFinancedEmissions: num(body.pool_financed_emissions ?? body.poolFinancedEmissions),
    layers: {
      collateral: collateral.map((row, i) => {
        const r = row as Record<string, unknown>;
        const caf = num(r.caf);
        const method = text(r.method) || text(r.message);
        const cafBasis = text(r.caf_basis ?? r.cafBasis);
        return {
          id: text(r.collateral_id ?? r.collateralId) || `collateral-${i}`,
          label: text(r.name) || text(r.collateral_type) || `Collateral ${i + 1}`,
          financedEmissions: num(
            r.financed_emissions_tco2e ?? r.absolute_total_tco2e ?? r.absoluteTotalTco2e
          ),
          factor: caf,
          dataQualityScore: num(r.data_quality_score ?? r.dataQualityScore),
          detail: [method, caf != null ? `CAF${cafBasis ? ` (${cafBasis})` : ""}` : null]
            .filter(Boolean)
            .join(" · ") || null,
        };
      }),
      loans: loans.map((row, i) => {
        const r = row as Record<string, unknown>;
        return {
          id: text(r.loan_id ?? r.loanId) || `loan-${i}`,
          label: text(r.name) || text(r.loan_id ?? r.loanId) || `Loan ${i + 1}`,
          financedEmissions: num(r.financed_emissions_tco2e ?? r.financedEmissionsTco2e),
          dataQualityScore: num(r.data_quality_score ?? r.dataQualityScore),
        };
      }),
      pools: pools.map((row, i) => {
        const r = row as Record<string, unknown>;
        const lafRows = Array.isArray(r.laf_rows) ? r.laf_rows : Array.isArray(r.lafRows) ? r.lafRows : [];
        const firstLaf = lafRows[0] as Record<string, unknown> | undefined;
        return {
          id: text(r.pool_id ?? r.poolId) || `pool-${i}`,
          label: text(r.name) || text(r.path) || text(r.pool_id) || `Pool ${i + 1}`,
          financedEmissions: num(r.financed_emissions_tco2e ?? r.financedEmissionsTco2e),
          factor: num(firstLaf?.laf),
          dataQualityScore: num(r.data_quality_score ?? r.dataQualityScore),
          detail: text(r.path) || (firstLaf ? "LAF from loan allocation" : null),
        };
      }),
      tranches: tranches.map((row, i) => {
        const r = row as Record<string, unknown>;
        return {
          id: text(r.tranche_id ?? r.trancheId) || `tranche-${i}`,
          label: text(r.name) || text(r.tranche_id ?? r.trancheId) || `Tranche ${i + 1}`,
          financedEmissions: num(r.financed_emissions_tco2e ?? r.financedEmissionsTco2e),
          factor: num(r.taf),
          detail: "TAF",
        };
      }),
      holdings: holdings.map((row, i) => {
        const r = row as Record<string, unknown>;
        return {
          id: text(r.holding_id ?? r.holdingId) || `holding-${i}`,
          label: text(r.name) || text(r.holding_id ?? r.holdingId) || `Holding ${i + 1}`,
          financedEmissions: num(r.financed_emissions_tco2e ?? r.financedEmissionsTco2e),
          factor: num(r.iaf),
          detail: "IAF",
        };
      }),
    },
    factorProvenance: {
      methodologyVersion: text(body.methodology_version ?? body.methodologyVersion),
      pcafRef: text(body.pcaf_ref ?? body.pcafRef),
      emissionsPath: text(body.emissions_path ?? body.emissionsPath),
      notes,
      warnings,
      collateralMethods,
    },
    isReportable: false,
    includeInPortfolio: false,
    missingOrBlocked,
  };
}
