/**
 * EPA On-Road vehicle tables use a leading "?" for open-ended model years
 * (e.g. "?1980" = 1980 and later). Normalize for display and internal keys.
 */
export function normalizeEpaModelYear(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("?")) {
    const year = s.slice(1).trim();
    return year ? `${year}+` : s.replace(/^\?+/, "");
  }
  return s;
}

/** Sort model years: numeric years ascending, then "YYYY+" by base year. */
export function sortEpaModelYears(years: string[]): string[] {
  const parse = (y: string) => {
    const plus = y.endsWith("+");
    const num = parseInt(plus ? y.slice(0, -1) : y, 10);
    return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
  };
  return [...years].sort((a, b) => parse(a) - parse(b) || a.localeCompare(b));
}
