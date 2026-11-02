/**
 * Scope 3 factor unit helpers for Categories 1, 2, 4, 5, 9, 12.
 * Mirrors backend fastapi_app/ghg_calc/scope3_factor_units.py
 * Refuse missing/ambiguous units. Do not invent factors.
 */

export const KM_PER_MILE = 1.60934;
export const KG_PER_SHORT_TON = 907.18474;
export const KG_PER_METRIC_TONNE = 1000;

/** Verified unit for public.waste / EPA Hub Table 9 style factors. */
export const WASTE_DATASET_FACTOR_UNIT = "MTCO2e/short ton";

function normUnit(unit?: string | null): string {
  return String(unit ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type FreightFactorKind =
  | "short_ton_mile"
  | "vehicle_mile"
  | "tonne_km"
  | "kg_km";

export function classifyFreightFactorUnit(
  factorUnit?: string | null,
): FreightFactorKind | null {
  const u = normUnit(factorUnit);
  if (!u) return null;
  const compact = u.replace(/\s+/g, "").replace(/_/g, "-");
  if (compact.includes("vehicle-mile") || compact.replace(/-/g, "").includes("vehiclemile")) {
    return "vehicle_mile";
  }
  if (
    compact.includes("short-ton-mile") ||
    compact.replace(/-/g, "").includes("shorttonmile") ||
    u.includes("short ton-mile") ||
    u.includes("short ton mile")
  ) {
    return "short_ton_mile";
  }
  if (
    compact.includes("tonne-km") ||
    compact.replace(/-/g, "").includes("tonnekm") ||
    u === "tkm" ||
    u === "t-km"
  ) {
    return "tonne_km";
  }
  if (compact.includes("kg-km") || compact.replace(/-/g, "").includes("kgkm")) {
    return "kg_km";
  }
  return null;
}

export function freightEmissionsKg(opts: {
  distanceKm: number;
  weightKg: number;
  co2Factor: number;
  factorUnit?: string | null;
}): number | null {
  const kind = classifyFreightFactorUnit(opts.factorUnit);
  if (!kind) return null;
  if (!(opts.distanceKm > 0)) return null;

  if (kind === "vehicle_mile") {
    return opts.co2Factor * (opts.distanceKm / KM_PER_MILE);
  }
  if (!(opts.weightKg > 0)) return null;

  if (kind === "short_ton_mile") {
    const miles = opts.distanceKm / KM_PER_MILE;
    const shortTons = opts.weightKg / KG_PER_SHORT_TON;
    return opts.co2Factor * miles * shortTons;
  }
  if (kind === "tonne_km") {
    return opts.co2Factor * opts.distanceKm * (opts.weightKg / KG_PER_METRIC_TONNE);
  }
  if (kind === "kg_km") {
    return opts.co2Factor * opts.distanceKm * opts.weightKg;
  }
  return null;
}

export function wasteEmissionsKg(opts: {
  mass: number;
  massUnit?: string | null;
  factor: number;
  factorUnit?: string | null;
}): number | null {
  if (!(opts.mass > 0)) return null;
  const fu = normUnit(opts.factorUnit);
  const mu = normUnit(opts.massUnit);
  if (!fu || !mu) return null;

  const compact = fu.replace(/[^a-z0-9/]/g, "");
  const isMtPerShort =
    (compact.includes("mtco2e") && compact.includes("shortton")) ||
    (fu.includes("metric ton") && fu.includes("co2") && fu.includes("short ton"));
  const isKgPerKg = compact.includes("kgco2e/kg") || compact.includes("kgco2/kg");
  const isKgPerShort =
    compact.includes("kgco2e/shortton") || compact.includes("kgco2/shortton");

  if (isKgPerKg) {
    if (!["kg", "kilogram", "kilograms"].includes(mu)) return null;
    return opts.mass * opts.factor;
  }

  let shortTons: number;
  if (["kg", "kilogram", "kilograms"].includes(mu)) {
    shortTons = opts.mass / KG_PER_SHORT_TON;
  } else if (
    ["short ton", "short tons", "short-ton", "uston", "us ton", "us tons"].includes(mu)
  ) {
    shortTons = opts.mass;
  } else if (["tonne", "tonnes", "metric ton", "metric tons", "t", "mt"].includes(mu)) {
    shortTons = (opts.mass * KG_PER_METRIC_TONNE) / KG_PER_SHORT_TON;
  } else {
    return null;
  }

  if (isMtPerShort) {
    return shortTons * opts.factor * KG_PER_METRIC_TONNE;
  }
  if (isKgPerShort) {
    return shortTons * opts.factor;
  }
  return null;
}

export type SpendFactorBasis = {
  kind: "kg_per_currency" | "t_per_currency";
  priceYear: number | null;
  currency: string;
};

export function parseSpendFactorBasis(
  factorUnit?: string | null,
): SpendFactorBasis | null {
  const u = normUnit(factorUnit);
  if (!u) return null;
  const yearMatch = u.match(/\b((?:19|20)\d{2})\b/);
  const priceYear = yearMatch ? Number(yearMatch[1]) : null;
  let currency: string | null = null;
  if (/\busd\b|\$|dollar/.test(u)) currency = "usd";
  else if (/\bgbp\b|£|pound/.test(u)) currency = "gbp";
  else if (/\beur\b|€|euro/.test(u)) currency = "eur";
  else if (/\bpkr\b|rupee/.test(u)) currency = "pkr";
  if (!currency) return null;
  const leading = u.split("/")[0] ?? u;
  let kind: SpendFactorBasis["kind"] | null = null;
  if (/\b(tco2e|t co2e|tonne|mtco2e)\b/.test(u) && !leading.includes("kg")) {
    kind = "t_per_currency";
  } else if (u.includes("kg") && u.includes("co2")) {
    kind = "kg_per_currency";
  }
  if (!kind) return null;
  return { kind, priceYear, currency };
}

export function spendEmissionsKg(opts: {
  amount: number;
  emissionFactor: number;
  factorUnit?: string | null;
  /** Must match factor currency — no FX invented. */
  activityCurrency?: string | null;
  /** Must match factor price year — no inflation invented. */
  activityPriceYear?: number | null;
}): number | null {
  if (!(opts.amount > 0)) return null;
  const basis = parseSpendFactorBasis(opts.factorUnit);
  if (!basis) return null;

  const actCur = normUnit(opts.activityCurrency);
  if (!actCur || actCur !== basis.currency) return null;

  if (basis.priceYear != null) {
    if (opts.activityPriceYear == null) return null;
    if (Number(opts.activityPriceYear) !== basis.priceYear) return null;
  }

  const raw = opts.amount * opts.emissionFactor;
  if (basis.kind === "t_per_currency") return raw * KG_PER_METRIC_TONNE;
  return raw;
}

export type TravelDistanceKind =
  | "passenger_mile"
  | "vehicle_mile"
  | "per_mile"
  | "passenger_km"
  | "vehicle_km"
  | "per_km";

export function classifyTravelDistanceUnit(
  factorUnit?: string | null,
): TravelDistanceKind | null {
  const u = normUnit(factorUnit);
  if (!u) return null;
  const compact = u.replace(/\s+/g, "").replace(/_/g, "-");
  if (compact.includes("passenger-mile") || compact.replace(/-/g, "").includes("passengermile")) {
    return "passenger_mile";
  }
  if (compact.includes("vehicle-mile") || compact.replace(/-/g, "").includes("vehiclemile")) {
    return "vehicle_mile";
  }
  if (compact.includes("passenger-km") || compact.replace(/-/g, "").includes("passengerkm")) {
    return "passenger_km";
  }
  if (compact.includes("vehicle-km") || compact.replace(/-/g, "").includes("vehiclekm")) {
    return "vehicle_km";
  }
  if (u.includes("mile") && (u.includes("co2") || u.includes("kg"))) return "per_mile";
  if (
    (u.includes("/km") || compact.endsWith("km")) &&
    !u.includes("mile") &&
    (u.includes("co2") || u.includes("kg"))
  ) {
    return "per_km";
  }
  return null;
}

export function travelDistanceEmissionsKg(opts: {
  distanceKm: number;
  co2Factor: number;
  factorUnit?: string | null;
}): number | null {
  if (!(opts.distanceKm > 0)) return null;
  const kind = classifyTravelDistanceUnit(opts.factorUnit);
  if (!kind) return null;
  if (kind === "passenger_mile" || kind === "vehicle_mile" || kind === "per_mile") {
    return opts.co2Factor * (opts.distanceKm / KM_PER_MILE);
  }
  return opts.co2Factor * opts.distanceKm;
}

export type CommuteDistanceBasis = "annual_total" | "one_way" | "round_trip";

export function annualizeCommutingDistanceKm(opts: {
  distanceKm: number;
  distanceBasis?: CommuteDistanceBasis | string | null;
  workingDaysPerYear?: number | null;
}): number | null {
  if (!(opts.distanceKm > 0)) return null;
  const basis = normUnit(opts.distanceBasis) || "annual_total";
  if (["", "annual", "annual_total", "annual-total", "total"].includes(basis)) {
    return opts.distanceKm;
  }
  if (!(opts.workingDaysPerYear != null && opts.workingDaysPerYear > 0)) return null;
  if (["one_way", "one-way", "oneway"].includes(basis)) {
    return opts.distanceKm * 2 * opts.workingDaysPerYear;
  }
  if (["round_trip", "round-trip", "roundtrip"].includes(basis)) {
    return opts.distanceKm * opts.workingDaysPerYear;
  }
  return null;
}

/** Rejected legacy Scope 2 placeholder grid factors — never use for Scope 3. */
export const REJECTED_SCOPE3_GRID_PLACEHOLDERS = [0.425, 0.4041, 0.17355];

export function isRejectedScope3GridPlaceholder(factor?: number | null): boolean {
  if (factor == null || Number.isNaN(factor)) return false;
  return REJECTED_SCOPE3_GRID_PLACEHOLDERS.some((p) => Math.abs(factor - p) < 1e-9);
}

/**
 * Scope 3 leased/sold electricity: grid share × kWh × verified factor only.
 * Refuses placeholders and other-source × kWh mixing.
 */
export function scope3GridElectricityKg(opts: {
  totalKwh: number;
  gridPct?: number | null;
  gridFactor?: number | null;
  otherPct?: number | null;
  otherRowEmissionsSum?: number | null;
}): number | null {
  if (!(opts.totalKwh > 0)) return null;
  if (opts.otherPct != null && opts.otherPct > 0) return null;
  if (opts.otherRowEmissionsSum != null && opts.otherRowEmissionsSum !== 0) return null;
  const gp = opts.gridPct ?? 0;
  if (!(gp > 0) || opts.gridFactor == null) return null;
  if (isRejectedScope3GridPlaceholder(opts.gridFactor)) return null;
  return Number(((gp / 100) * opts.totalKwh * opts.gridFactor).toFixed(6));
}
