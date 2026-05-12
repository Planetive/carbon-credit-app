import type { AirPollutantKey } from "./types";

export const POLLUTANT_ROWS: { key: AirPollutantKey; label: string; hint: string }[] = [
  { key: "NOx", label: "NOx", hint: "Nitrogen oxides" },
  { key: "SOx", label: "SOx", hint: "Sulphur oxides" },
  { key: "VOC", label: "VOC", hint: "Volatile organic compounds" },
  { key: "PM10", label: "PM₁₀", hint: "Particulate matter" },
  { key: "H2S", label: "H₂S", hint: "Hydrogen sulphide" },
];

export function formatAnnualMassDisplay(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Not entered";
  return t;
}
