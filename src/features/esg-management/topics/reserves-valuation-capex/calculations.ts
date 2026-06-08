import type { ReservesAssetData, ReservesByCountryRow } from "./types";

const OIL_GJ_PER_BBL = 6.117;
const OIL_TCO2_PER_TJ = 73.3;
const GAS_GJ_PER_BCF = 1_055_056;
const GAS_TCO2_PER_TJ = 56.1;

/** Parses user numeric fields; non-finite input is treated as 0. */
export function parseReservesNumericInput(s: string): number {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * EM-EP-420a.2 — Embedded CO2 in proved reserves (MT CO2e).
 * Oil: Mmbbl × 1,000,000 × 6.117 GJ/bbl ÷ 1000 × 73.3 tCO2/TJ ÷ 1,000,000
 * Gas: Bcf × 1,055,056 GJ/Bcf ÷ 1000 × 56.1 tCO2/TJ ÷ 1,000,000
 */
export function calcEmbeddedCo2MtCo2e(data: ReservesAssetData): number {
  const oilMmbbl = parseReservesNumericInput(data.provedReservesCrudeOilMmbbl);
  const gasBcf = parseReservesNumericInput(data.provedReservesNaturalGasBcf);

  const oilMt =
    ((oilMmbbl * 1_000_000 * OIL_GJ_PER_BBL) / 1000) * OIL_TCO2_PER_TJ / 1_000_000;
  const gasMt =
    ((gasBcf * GAS_GJ_PER_BCF) / 1000) * GAS_TCO2_PER_TJ / 1_000_000;

  return oilMt + gasMt;
}

/**
 * EM-EP-420a.3 — % of proved reserves in carbon-regulated jurisdictions.
 * Sum of provedReserves1P where carbonRegulated = true ÷ total provedReserves1P × 100.
 */
export function calcPctReservesInCarbonRegulatedJurisdictions(rows: ReservesByCountryRow[]): number {
  if (!rows.length) return 0;
  let regulated = 0;
  let total = 0;
  for (const r of rows) {
    const v = parseReservesNumericInput(r.provedReserves1P);
    total += v;
    if (r.carbonRegulated) regulated += v;
  }
  if (total === 0) return 0;
  return (regulated / total) * 100;
}

/** EM-EP-420a.4 — % capex to low-carbon (manual entry pass-through). */
export function getPctCapexLowCarbon(data: ReservesAssetData): number {
  return parseReservesNumericInput(data.pctCapexLowCarbon);
}

export function formatReservesNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
