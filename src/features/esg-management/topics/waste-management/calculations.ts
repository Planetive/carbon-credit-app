import type { WasteGenerationRow, WasteDivertedRow, WasteDisposalRow } from "./types";

export function calcTotalHazardousGenerated(rows: WasteGenerationRow[]): number {
  return rows.filter((r) => r.category === "hazardous").reduce((sum, r) => sum + (r.quantity || 0), 0);
}

export function calcTotalNonHazardousGenerated(rows: WasteGenerationRow[]): number {
  return rows.filter((r) => r.category === "non_hazardous").reduce((sum, r) => sum + (r.quantity || 0), 0);
}

export function calcTotalWasteGenerated(rows: WasteGenerationRow[]): number {
  return calcTotalHazardousGenerated(rows) + calcTotalNonHazardousGenerated(rows);
}

export function calcTotalWasteDiverted(rows: WasteDivertedRow[]): number {
  return rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
}

export function calcTotalWasteDisposed(rows: WasteDisposalRow[]): number {
  return rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
}

export function calcDiversionRate(diverted: number, generated: number): number {
  return generated > 0 ? (diverted / generated) * 100 : 0;
}

export function calcRecyclingRate(
  divertedRows: WasteDivertedRow[],
  generationRows: WasteGenerationRow[]
): number {
  const totalGenerated = calcTotalWasteGenerated(generationRows);
  if (totalGenerated === 0) return 0;
  const totalRecycled = divertedRows
    .filter((r) => r.method === "Recycling")
    .reduce((sum, r) => sum + (r.quantity || 0), 0);
  return (totalRecycled / totalGenerated) * 100;
}

export function calcHazardousRatio(hazardous: number, generated: number): number {
  return generated > 0 ? (hazardous / generated) * 100 : 0;
}

export function calcWasteIntensity(
  generated: number,
  hydrocarbonProduction: number | null
): number | null {
  if (!hydrocarbonProduction || hydrocarbonProduction <= 0) return null;
  return generated / hydrocarbonProduction;
}

export function formatWasteNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
