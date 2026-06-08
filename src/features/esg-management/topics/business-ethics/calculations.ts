import type { BusinessEthicsAssetData, GovernmentPaymentRow } from "./types";

function parseNum(v: string): number {
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function calcProvedReservesHighRiskPct(data: Pick<BusinessEthicsAssetData, "provedReservesHighRiskMmboe" | "totalProvedReservesMmboe">): number {
  const total = parseNum(data.totalProvedReservesMmboe);
  if (total === 0) return 0;
  return (parseNum(data.provedReservesHighRiskMmboe) / total) * 100;
}

export function calcProbableReservesHighRiskPct(
  data: Pick<BusinessEthicsAssetData, "probableReservesHighRiskMmboe" | "totalProbableReservesMmboe">
): number {
  const total = parseNum(data.totalProbableReservesMmboe);
  if (total === 0) return 0;
  return (parseNum(data.probableReservesHighRiskMmboe) / total) * 100;
}

export function calcTotalGovernmentPaymentsUsd(rows: GovernmentPaymentRow[]): number {
  return rows.reduce((sum, r) => sum + parseNum(r.amountUsd), 0);
}

export function calcWhistleblowerSubstantiationRatePct(
  data: Pick<BusinessEthicsAssetData, "whistleblowerReportsReceived" | "whistleblowerReportsSubstantiated">
): number {
  const received = parseNum(data.whistleblowerReportsReceived);
  if (received === 0) return 0;
  return (parseNum(data.whistleblowerReportsSubstantiated) / received) * 100;
}

export function formatBusinessEthicsNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatBusinessEthicsUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}
