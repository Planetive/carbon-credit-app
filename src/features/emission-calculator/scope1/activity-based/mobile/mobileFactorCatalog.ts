/**
 * Dropdown options for EPA mobile combustion.
 * Labels and units come from the four factor sheets. This module does not
 * calculate emissions and does not invent a vehicle or fuel name.
 */

export const MOBILE_DATASET_CODES = [
  "mobile_combustion",
  "on_road_gasoline",
  "on_road_diesel_alt_fuel",
  "non_road_vehicle",
] as const;

export type MobileRoadClass = "on_road" | "non_road";
export type MobileFuelUnit = "gallon" | "liter" | "scf";
export type MobileDistanceUnit = "mile" | "km";

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const GASOLINE_FUELS = new Set(["motor gasoline", "gasoline", "petrol"]);
const BIOGENIC_FUELS = new Set(["biodiesel", "biodiesel (100%)", "ethanol", "ethanol (100%)"]);

const KEY_CO2 = "kg co2 per unit";
const KEY_UNIT = "unit";
const KEY_VEHICLE = "vehicle type";
const KEY_FUEL = "fuel type";
const KEY_YEAR = "model year";
const KEY_CH4_MILE = "ch4 factor (g ch4 / vehicle-mile)";
const KEY_N2O_MILE = "n2o factor (g n2o / vehicle-mile)";
const KEY_CH4_GALLON = "ch4 factor (g ch4 / gallon)";
const KEY_N2O_GALLON = "n2o factor (g n2o / gallon)";

export type YearBand = { start: number; end: number; label: string };

export type MobileFuelChoice = {
  fuel: string;
  units: MobileFuelUnit[];
  factorUnit: "gallon" | "scf";
  yearMode: "none" | "required";
  yearBands: YearBand[];
};

export type MobileFactorSheet = {
  dataset_code: string;
  rows: Record<string, unknown>[];
};

export type MobileFactorCatalog = {
  vehicles: Record<MobileRoadClass, string[]>;
  choices: MobileFuelChoice[];
  fuelsFor: (road: MobileRoadClass, vehicle: string) => MobileFuelChoice[];
  choiceFor: (road: MobileRoadClass, vehicle: string, fuel: string) => MobileFuelChoice | null;
  unsupported: string[];
};

type Indexed = Map<string, { key: string; value: unknown }>;
type YearParse =
  | { kind: "blank" }
  | { kind: "invalid" }
  | { kind: "span"; start: number; end: number; label: string };

type GasGroup = {
  label: string;
  fuelLabel: string | null;
  spans: YearParse[];
};

function normText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function normKey(value: string): string {
  return normText(value.replace(/_/g, " "));
}

function indexRow(row: Record<string, unknown>): Indexed {
  const exact: Indexed = new Map();
  const aliases: Array<[string, string, unknown]> = [];
  for (const [rawKey, value] of Object.entries(row)) {
    if (rawKey.startsWith("_")) continue;
    const norm = normKey(rawKey);
    if (!norm || exact.has(norm)) continue;
    exact.set(norm, { key: rawKey, value });
    if (norm.includes("n20") && !norm.includes("n2o")) {
      aliases.push([norm.replace(/n20/g, "n2o"), rawKey, value]);
    }
  }
  for (const [alias, key, value] of aliases) {
    if (!exact.has(alias)) exact.set(alias, { key, value });
  }
  return exact;
}

function cell(index: Indexed, key: string): unknown {
  return index.get(key)?.value;
}

function displayText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "boolean" || value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function n2oConflict(row: Record<string, unknown>, canonical: string): boolean {
  const found = new Set<number>();
  for (const [rawKey, value] of Object.entries(row)) {
    if (rawKey.startsWith("_")) continue;
    const norm = normKey(rawKey);
    const alias = norm.includes("n20") && !norm.includes("n2o") ? norm.replace(/n20/g, "n2o") : norm;
    if (alias !== canonical) continue;
    const parsed = parseNumber(value);
    if (parsed == null) continue;
    found.add(parsed);
  }
  return found.size > 1;
}

function hasGasFactors(row: Record<string, unknown>, perGallon: boolean): boolean {
  const index = indexRow(row);
  const ch4 = perGallon ? KEY_CH4_GALLON : KEY_CH4_MILE;
  const n2o = perGallon ? KEY_N2O_GALLON : KEY_N2O_MILE;
  if (n2oConflict(row, n2o)) return false;
  return parseNumber(cell(index, ch4)) != null && parseNumber(cell(index, n2o)) != null;
}

export function parseModelYearCell(value: unknown): YearParse {
  if (value == null) return { kind: "blank" };
  if (typeof value === "boolean") return { kind: "invalid" };
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < YEAR_MIN || value > YEAR_MAX) return { kind: "invalid" };
    return { kind: "span", start: value, end: value, label: String(value) };
  }
  const original = String(value).trim();
  const text = original.toLowerCase().replace(/[–—]/g, "-").split(/\s+/).filter(Boolean).join(" ");
  if (!text) return { kind: "blank" };
  const asSpan = (start: number, end: number, label: string): YearParse => {
    if (start < YEAR_MIN || end > YEAR_MAX || end < start) return { kind: "invalid" };
    return { kind: "span", start, end, label };
  };
  if (text.endsWith("+") && /^\d+$/.test(text.slice(0, -1))) {
    return asSpan(Number(text.slice(0, -1)), YEAR_MAX, original);
  }
  if (!text.includes("-") && /^\d+$/.test(text)) {
    return asSpan(Number(text), Number(text), original);
  }
  const [startText, endText] = text.split("-", 2).map((part) => part.trim());
  if (!/^\d+$/.test(startText || "")) return { kind: "invalid" };
  const start = Number(startText);
  if (["present", "later", "onward", "current"].includes(endText || "")) {
    return asSpan(start, YEAR_MAX, original);
  }
  if (/^\d+$/.test(endText || "")) return asSpan(start, Number(endText), original);
  return { kind: "invalid" };
}

function factorUnit(value: unknown): "gallon" | "scf" | null {
  const text = normText(value);
  if (text.includes("scf") || text.includes("cubic foot") || text.includes("cubic feet")) return "scf";
  if (text.includes("gallon")) return "gallon";
  return null;
}

/** Each set is one physical fuel. Names match only inside a single set. */
const FUEL_EQUIVALENCE: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["diesel fuel", "diesel"]),
  new Set(["compressed natural gas (cng)", "compressed natural gas", "cng"]),
  new Set(["diesel equipment", "diesel fuel"]),
  new Set(["biodiesel (100%)", "biodiesel"]),
  new Set(["ethanol (100%)", "ethanol"]),
  new Set(["liquefied natural gas (lng)", "lng"]),
  new Set(["liquefied petroleum gases (lpg)", "lpg"]),
];

export function fuelsEquivalent(left: string, right: string): boolean {
  const first = normText(left);
  const second = normText(right);
  if (!first || !second) return false;
  if (first === second) return true;
  return FUEL_EQUIVALENCE.some((group) => group.has(first) && group.has(second));
}

function matchingCo2Fuel(fuelName: string, fuels: Map<string, Co2Fuel>): Co2Fuel | null {
  const hits: Co2Fuel[] = [];
  for (const [name, fuel] of fuels) {
    if (fuelsEquivalent(fuelName, name)) hits.push(fuel);
  }
  return hits.length === 1 ? hits[0] : null;
}

function fuelClass(name: string): "gasoline" | "biogenic" | "review" | "fossil" {
  if (GASOLINE_FUELS.has(name)) return "gasoline";
  if (BIOGENIC_FUELS.has(name)) return "biogenic";
  if (
    name.includes("%") ||
    ["blend", "gasohol", "renewable", "biomass", "biogas", "b20", "e85"].some((token) => name.includes(token)) ||
    name.includes("bio")
  ) {
    return "review";
  }
  return "fossil";
}

function sheetRows(sheets: MobileFactorSheet[], code: string): Record<string, unknown>[] {
  const matches = sheets.filter((sheet) => normText(sheet.dataset_code) === code);
  if (matches.length !== 1) return [];
  return matches[0].rows || [];
}

function yearOffer(spans: YearParse[]): { yearMode: "none" | "required"; yearBands: YearBand[] } | null {
  const parsed = spans.filter((span) => span.kind !== "invalid");
  if (!parsed.length) return null;
  const undated = parsed.filter((span) => span.kind === "blank");
  const dated = parsed.filter((span): span is Extract<YearParse, { kind: "span" }> => span.kind === "span");
  if (undated.length && dated.length) return null;
  if (!dated.length) return undated.length === 1 ? { yearMode: "none", yearBands: [] } : null;
  const seen = new Set<string>();
  const yearBands: YearBand[] = [];
  for (const span of dated) {
    const key = `${span.start}-${span.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    yearBands.push({ start: span.start, end: span.end, label: span.label });
  }
  return { yearMode: "required", yearBands };
}

type Co2Fuel = { label: string; unit: "gallon" | "scf" };

function co2Fuels(rows: Record<string, unknown>[], unsupported: string[]): Map<string, Co2Fuel> {
  const counts = new Map<string, { label: string; unit: "gallon" | "scf" | null; count: number }>();
  for (const row of rows) {
    const index = indexRow(row);
    const label = displayText(cell(index, KEY_FUEL) ?? row.label);
    const name = normText(label);
    if (!name) continue;
    const unit = factorUnit(cell(index, KEY_UNIT) ?? row.unit);
    const factor = parseNumber(cell(index, KEY_CO2));
    const current = counts.get(name) || { label, unit, count: 0 };
    current.count += 1;
    if (!current.unit && unit) current.unit = unit;
    if (factor == null || !unit) current.unit = current.unit && factor != null ? current.unit : null;
    counts.set(name, current);
  }
  const ready = new Map<string, Co2Fuel>();
  for (const [name, item] of counts) {
    if (fuelClass(name) === "review") {
      unsupported.push(`${item.label} has no documented biogenic fraction and is not offered.`);
      continue;
    }
    if (item.count !== 1 || !item.unit) {
      unsupported.push(`${item.label} does not have one CO2 factor in gallon or scf.`);
      continue;
    }
    ready.set(name, { label: item.label, unit: item.unit });
  }
  return ready;
}

function offerUniqueFuelChoices(
  choices: Array<MobileFuelChoice & { road: MobileRoadClass; vehicle: string }>,
  unsupported: string[],
  road: MobileRoadClass,
  items: Array<{ vehicle: string; fuelLabel: string; fuel: Co2Fuel; spans: YearParse[] }>
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = `${normText(item.vehicle)}\u0000${normText(item.fuel.label)}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const item of items) {
    const key = `${normText(item.vehicle)}\u0000${normText(item.fuel.label)}`;
    if ((counts.get(key) || 0) !== 1) {
      unsupported.push(`${item.vehicle} / ${item.fuelLabel} matches more than one row for ${item.fuel.label}.`);
      continue;
    }
    addChoice(choices, unsupported, road, item.vehicle, item.fuel, item.spans);
  }
}

function addChoice(
  choices: Array<MobileFuelChoice & { road: MobileRoadClass; vehicle: string }>,
  unsupported: string[],
  road: MobileRoadClass,
  vehicle: string,
  fuel: Co2Fuel,
  spans: YearParse[]
) {
  const years = yearOffer(spans);
  if (!years) {
    unsupported.push(`${vehicle} / ${fuel.label} does not have one unambiguous model-year match.`);
    return;
  }
  const units: MobileFuelUnit[] =
    fuel.unit === "scf" ? (road === "non_road" ? [] : ["scf"]) : ["gallon", "liter"];
  if (!units.length) {
    unsupported.push(`${vehicle} / ${fuel.label} is scf and cannot be used for non-road equipment.`);
    return;
  }
  choices.push({
    road,
    vehicle,
    fuel: fuel.label,
    units,
    factorUnit: fuel.unit,
    yearMode: years.yearMode,
    yearBands: years.yearBands,
  });
}

export function buildMobileFactorCatalog(sheets: MobileFactorSheet[]): MobileFactorCatalog {
  const unsupported: string[] = [];
  const loaded = new Set(sheets.map((sheet) => normText(sheet.dataset_code)));
  for (const code of MOBILE_DATASET_CODES) {
    if (!loaded.has(code) || sheetRows(sheets, code).length === 0 && !sheets.some((sheet) => normText(sheet.dataset_code) === code)) {
      unsupported.push(`${code} is not loaded.`);
    }
  }
  const fuels = co2Fuels(sheetRows(sheets, "mobile_combustion"), unsupported);
  const choices: Array<MobileFuelChoice & { road: MobileRoadClass; vehicle: string }> = [];

  const gasolineGroups = new Map<string, GasGroup>();
  for (const row of sheetRows(sheets, "on_road_gasoline")) {
    if (!hasGasFactors(row, false)) continue;
    const index = indexRow(row);
    const label = displayText(cell(index, KEY_VEHICLE) ?? row.category);
    const name = normText(label);
    if (!name) continue;
    const group = gasolineGroups.get(name) || { label, fuelLabel: null, spans: [] };
    group.spans.push(parseModelYearCell(cell(index, KEY_YEAR)));
    gasolineGroups.set(name, group);
  }
  for (const group of gasolineGroups.values()) {
    const gasoline = [...fuels.entries()].filter(([name]) => fuelClass(name) === "gasoline");
    if (!gasoline.length) {
      unsupported.push(`${group.label} has gasoline rows, but no single gasoline CO2 factor is loaded.`);
      continue;
    }
    for (const [, fuel] of gasoline) addChoice(choices, unsupported, "on_road", group.label, fuel, group.spans);
  }

  const dieselGroups = new Map<string, GasGroup>();
  for (const row of sheetRows(sheets, "on_road_diesel_alt_fuel")) {
    if (!hasGasFactors(row, false)) continue;
    const index = indexRow(row);
    const vehicle = displayText(cell(index, KEY_VEHICLE) ?? row.category);
    const fuelLabel = displayText(cell(index, KEY_FUEL) ?? row.label);
    const vehicleName = normText(vehicle);
    const fuelName = normText(fuelLabel);
    if (!vehicleName || !fuelName || fuelClass(fuelName) === "gasoline") continue;
    const key = `${vehicleName}\u0000${fuelName}`;
    const group = dieselGroups.get(key) || { label: vehicle, fuelLabel, spans: [] };
    group.spans.push(parseModelYearCell(cell(index, KEY_YEAR)));
    dieselGroups.set(key, group);
  }
  const dieselResolved: Array<{ vehicle: string; fuelLabel: string; fuel: Co2Fuel; spans: YearParse[] }> = [];
  for (const [key, group] of dieselGroups) {
    const fuelName = key.split("\u0000")[1];
    const fuel = matchingCo2Fuel(fuelName, fuels);
    if (!fuel || fuelClass(fuelName) === "review" || fuelClass(normText(fuel.label)) === "review") {
      unsupported.push(`${group.label} / ${group.fuelLabel} has no single CO2 factor.`);
      continue;
    }
    dieselResolved.push({ vehicle: group.label, fuelLabel: group.fuelLabel || fuel.label, fuel, spans: group.spans });
  }
  offerUniqueFuelChoices(choices, unsupported, "on_road", dieselResolved);

  const nonRoadGroups = new Map<string, { label: string; fuelLabel: string; count: number }>();
  for (const row of sheetRows(sheets, "non_road_vehicle")) {
    if (!hasGasFactors(row, true)) continue;
    const index = indexRow(row);
    const vehicle = displayText(cell(index, KEY_VEHICLE) ?? row.category);
    const fuelLabel = displayText(cell(index, KEY_FUEL) ?? row.label);
    const vehicleName = normText(vehicle);
    const fuelName = normText(fuelLabel);
    if (!vehicleName || !fuelName) continue;
    const key = `${vehicleName}\u0000${fuelName}`;
    const group = nonRoadGroups.get(key) || { label: vehicle, fuelLabel, count: 0 };
    group.count += 1;
    nonRoadGroups.set(key, group);
  }
  const nonRoadResolved: Array<{ vehicle: string; fuelLabel: string; fuel: Co2Fuel; spans: YearParse[] }> = [];
  for (const [key, group] of nonRoadGroups) {
    const fuelName = key.split("\u0000")[1];
    if (group.count !== 1) {
      unsupported.push(`${group.label} / ${group.fuelLabel} matches more than one non-road row.`);
      continue;
    }
    const fuel = matchingCo2Fuel(fuelName, fuels);
    if (!fuel || fuelClass(fuelName) === "review" || fuelClass(normText(fuel.label)) === "review") {
      unsupported.push(`${group.label} / ${group.fuelLabel} has no single CO2 factor.`);
      continue;
    }
    nonRoadResolved.push({
      vehicle: group.label,
      fuelLabel: group.fuelLabel,
      fuel,
      spans: [{ kind: "blank" }],
    });
  }
  offerUniqueFuelChoices(choices, unsupported, "non_road", nonRoadResolved);

  const vehicles: Record<MobileRoadClass, string[]> = { on_road: [], non_road: [] };
  for (const road of ["on_road", "non_road"] as const) {
    vehicles[road] = [...new Set(choices.filter((choice) => choice.road === road).map((choice) => choice.vehicle))].sort(
      (a, b) => a.localeCompare(b)
    );
  }
  const fuelsFor = (road: MobileRoadClass, vehicle: string) =>
    choices
      .filter((choice) => choice.road === road && normText(choice.vehicle) === normText(vehicle))
      .map(({ fuel, units, factorUnit: unit, yearMode, yearBands }) => ({
        fuel,
        units,
        factorUnit: unit,
        yearMode,
        yearBands,
      }))
      .sort((a, b) => a.fuel.localeCompare(b.fuel));
  const choiceFor = (road: MobileRoadClass, vehicle: string, fuel: string) =>
    fuelsFor(road, vehicle).find((choice) => normText(choice.fuel) === normText(fuel)) || null;

  return {
    vehicles,
    choices: choices.map(({ fuel, units, factorUnit: unit, yearMode, yearBands }) => ({
      fuel,
      units,
      factorUnit: unit,
      yearMode,
      yearBands,
    })),
    fuelsFor,
    choiceFor,
    unsupported: [...new Set(unsupported)],
  };
}

export function yearMatchesChoice(yearText: string, choice: MobileFuelChoice): string | null {
  if (choice.yearMode === "none") {
    return yearText.trim() ? "This factor row has no model year. Leave model year empty." : null;
  }
  if (!/^\d+$/.test(yearText.trim())) return "Enter the vehicle model year.";
  const year = Number(yearText.trim());
  if (year < YEAR_MIN || year > YEAR_MAX) return "Enter the vehicle model year.";
  const hits = choice.yearBands.filter((band) => year >= band.start && year <= band.end);
  if (hits.length === 1) return null;
  if (hits.length > 1) return `Model year ${year} matches more than one factor row.`;
  return `Model year ${year} is not in the factor rows for this vehicle and fuel.`;
}

export function formatYearBands(choice: MobileFuelChoice): string {
  if (choice.yearMode === "none") return "No model year on this factor row.";
  return choice.yearBands.map((band) => band.label).join(", ");
}
