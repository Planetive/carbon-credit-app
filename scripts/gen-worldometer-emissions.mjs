import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath =
  "C:/Users/Fahad/.cursor/projects/c-Users-Fahad-Desktop-planetive-resources-Sara-website-carbon-credit-app-main/uploads/co2-emissions-by-country-0.md";
const outPath = path.resolve(
  __dirname,
  "../src/features/finance-emissions/data/worldometerVerifiedEmissions.ts"
);

const text = fs.readFileSync(mdPath, "utf8");
const rows = [];

for (const line of text.split("\n")) {
  if (!line.trim().startsWith("|")) continue;
  const parts = line.split("|").map((s) => s.trim());
  if (!/^\d+$/.test(parts[1] || "")) continue;
  const countryCell = parts[2] || "";
  const cm = countryCell.match(/\[ ([^\]]+) \]/);
  if (!cm) continue;
  const emissionsRaw = (parts[3] || "").replace(/,/g, "");
  if (!/^\d+$/.test(emissionsRaw)) continue;
  rows.push({ countryName: cm[1].trim(), emissionsTons: Number(emissionsRaw) });
}

const body = rows
  .map(
    (r) =>
      `  { countryName: ${JSON.stringify(r.countryName)}, emissionsTons: ${r.emissionsTons} },`
  )
  .join("\n");

const content = `/** Worldometer CO₂ emissions by country (2024). Source: https://www.worldometers.info/co2-emissions/co2-emissions-by-country/ */
export const WORLDOMETER_EMISSIONS_SOURCE_URL =
  "https://www.worldometers.info/co2-emissions/co2-emissions-by-country/";
export const WORLDOMETER_EMISSIONS_YEAR = 2024;

export type WorldometerVerifiedEmission = {
  countryName: string;
  emissionsTons: number;
};

export const WORLDOMETER_VERIFIED_EMISSIONS: WorldometerVerifiedEmission[] = [
${body}
];

export function formatEmissionsMillions(tons: number): string {
  const millions = tons / 1_000_000;
  const rounded =
    millions >= 100 ? Math.round(millions) : Math.round(millions * 10) / 10;
  return \`\${rounded.toLocaleString()} million tCO₂\`;
}

export function findWorldometerEmissions(
  countryName: string
): WorldometerVerifiedEmission | undefined {
  const normalized = countryName.trim().toLowerCase();
  return WORLDOMETER_VERIFIED_EMISSIONS.find(
    (row) => row.countryName.toLowerCase() === normalized
  );
}
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content);
console.log(`Wrote ${rows.length} countries to ${outPath}`);
