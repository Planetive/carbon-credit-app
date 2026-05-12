import type { WaterAssetData, WaterDisposalPct } from "./types";

const TOLERANCE = 0.02;

/** Parses user numeric fields; non-finite input is treated as 0 (same as existing water logic). */
export function parseWaterNumericInput(s: string): number {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function sumFreshwaterWithdrawnM3PerMonth(data: WaterAssetData): number {
  return data.freshwaterRows.reduce((acc, r) => acc + parseWaterNumericInput(r.volumeM3PerMonth), 0);
}

export function freshwaterConsumedM3PerMonth(data: WaterAssetData): number {
  const w = sumFreshwaterWithdrawnM3PerMonth(data);
  const ret = parseWaterNumericInput(data.returnedDischargedM3PerMonth);
  return Math.max(0, w - ret);
}

export function parseDisposalPct(p: WaterDisposalPct): { injected: number; recycled: number; discharged: number; evaporationPond: number } {
  return {
    injected: parseWaterNumericInput(p.injected),
    recycled: parseWaterNumericInput(p.recycled),
    discharged: parseWaterNumericInput(p.discharged),
    evaporationPond: parseWaterNumericInput(p.evaporationPond),
  };
}

export function disposalPctSum(p: WaterDisposalPct): number {
  const x = parseDisposalPct(p);
  return x.injected + x.recycled + x.discharged + x.evaporationPond;
}

export function disposalPctIsValid(p: WaterDisposalPct): boolean {
  return Math.abs(disposalPctSum(p) - 100) <= TOLERANCE;
}

export function hfDisclosurePercent(hfWells: { disclosureSubmitted: boolean }[]): number | null {
  if (!hfWells.length) return null;
  const yes = hfWells.filter((w) => w.disclosureSubmitted).length;
  return (yes / hfWells.length) * 100;
}

/** Scale monthly m³ by number of months in reporting period. */
export function volumeForPeriodM3(monthlyM3: number, monthsInPeriod: number): number {
  return monthlyM3 * monthsInPeriod;
}

/** Thousand m³ for period. */
export function toThousandM3ForPeriod(monthlyM3: number, monthsInPeriod: number): number {
  return volumeForPeriodM3(monthlyM3, monthsInPeriod) / 1000;
}

export function producedVolumeForPeriod(
  data: WaterAssetData,
  monthsInPeriod: number
): { monthly: number; periodM3: number; periodBbl: number } {
  const g = parseWaterNumericInput(data.producedGenerated);
  if (data.producedUnit === "bbl_month") {
    const periodBbl = g * monthsInPeriod;
    return { monthly: g, periodM3: 0, periodBbl };
  }
  const periodM3 = g * monthsInPeriod;
  return { monthly: g, periodM3, periodBbl: 0 };
}

export function derivedProducedSplitsM3ForPeriod(
  data: WaterAssetData,
  monthsInPeriod: number
): { injected: number; recycled: number; discharged: number; evaporationPond: number; periodM3Total: number } | null {
  const pct = parseDisposalPct(data.disposalPct);
  if (!disposalPctIsValid(data.disposalPct)) {
    return null;
  }
  if (data.producedUnit === "bbl_month") {
    return null;
  }
  const g = parseWaterNumericInput(data.producedGenerated);
  const monthlyTotal = g;
  const periodTotal = monthlyTotal * monthsInPeriod;
  return {
    injected: (periodTotal * pct.injected) / 100,
    recycled: (periodTotal * pct.recycled) / 100,
    discharged: (periodTotal * pct.discharged) / 100,
    evaporationPond: (periodTotal * pct.evaporationPond) / 100,
    periodM3Total: periodTotal,
  };
}

export function derivedProducedSplitsBblForPeriod(
  data: WaterAssetData,
  monthsInPeriod: number
): { injected: number; recycled: number; discharged: number; evaporationPond: number; periodBblTotal: number } | null {
  const pct = parseDisposalPct(data.disposalPct);
  if (!disposalPctIsValid(data.disposalPct)) {
    return null;
  }
  if (data.producedUnit !== "bbl_month") {
    return null;
  }
  const g = parseWaterNumericInput(data.producedGenerated);
  const periodTotal = g * monthsInPeriod;
  return {
    injected: (periodTotal * pct.injected) / 100,
    recycled: (periodTotal * pct.recycled) / 100,
    discharged: (periodTotal * pct.discharged) / 100,
    evaporationPond: (periodTotal * pct.evaporationPond) / 100,
    periodBblTotal: periodTotal,
  };
}
