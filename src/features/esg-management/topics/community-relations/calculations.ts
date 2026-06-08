export function parseCommunityInteger(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function calcAvgDaysPerDelay(delayCount: string, delayDays: string): number | null {
  const count = parseCommunityInteger(delayCount);
  const days = parseCommunityInteger(delayDays);
  if (count === 0) return null;
  return days / count;
}

export function formatCommunityNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
