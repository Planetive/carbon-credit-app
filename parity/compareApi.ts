/**
 * Layer 2 — SPA math vs live FastAPI /api/v1/calc/*
 *
 * Usage (PowerShell):
 *   $env:PARITY_BACKEND_URL="http://127.0.0.1:8000"
 *   $env:PARITY_EMAIL="you@example.com"
 *   $env:PARITY_PASSWORD="yourpass"
 *   npm run parity:api
 *
 * Or pass a bearer token:
 *   $env:PARITY_TOKEN="eyJ..."
 *   npm run parity:api
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  approxEqual,
  spaEpaFuel,
  spaEpaRefrigerant,
  spaElectricity,
  spaHeatSteam,
  spaMobileFuel,
  spaNonRoad,
  spaOnRoad,
  spaUkMultiply,
  spaWaste,
} from "./spaMath.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, "cases.json"), "utf8"));

const BASE = (process.env.PARITY_BACKEND_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  ""
);

type Row = {
  suite: string;
  id: string;
  spa: number;
  api: number | null;
  ok: boolean;
  error?: string;
};

async function login(): Promise<string> {
  if (process.env.PARITY_TOKEN) return process.env.PARITY_TOKEN;
  const email = process.env.PARITY_EMAIL;
  const password = process.env.PARITY_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set PARITY_TOKEN or PARITY_EMAIL + PARITY_PASSWORD for API parity"
    );
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { access_token?: string; detail?: unknown };
  if (!res.ok || !data.access_token) {
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function postCalc(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<number> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    emissions_kg?: number;
    emissions?: number;
    detail?: unknown;
  };
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${JSON.stringify(data.detail ?? data)}`);
  }
  const kg = data.emissions_kg ?? data.emissions;
  if (typeof kg !== "number") {
    throw new Error(`${path} missing emissions_kg: ${JSON.stringify(data)}`);
  }
  return kg;
}

async function run(): Promise<void> {
  const token = await login();
  const rows: Row[] = [];

  const push = (
    suite: string,
    id: string,
    spa: number,
    api: number | null,
    error?: string
  ) => {
    rows.push({
      suite,
      id,
      spa,
      api,
      ok: api != null && approxEqual(spa, api),
      error,
    });
  };

  for (const c of cases.uk_fuel) {
    const spa = spaUkMultiply(c.quantity, c.factor);
    try {
      const api = await postCalc(token, "/api/v1/calc/uk/fuel", {
        quantity: c.quantity,
        factor: c.factor,
      });
      push("uk_fuel", c.id, spa, api);
    } catch (e) {
      push("uk_fuel", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.epa_fuel) {
    const spa = spaEpaFuel(c.quantity, c.factor, c.unit);
    try {
      const api = await postCalc(token, "/api/v1/calc/epa/fuel", {
        quantity: c.quantity,
        factor: c.factor,
        unit: c.unit,
      });
      push("epa_fuel", c.id, spa, api);
    } catch (e) {
      push("epa_fuel", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.mobile_fuel) {
    const spa = spaMobileFuel(c.quantity, c.factor, c.input_unit);
    try {
      const api = await postCalc(token, "/api/v1/calc/epa/mobile-fuel", {
        quantity: c.quantity,
        factor: c.factor,
        input_unit: c.input_unit,
      });
      push("mobile_fuel", c.id, spa, api);
    } catch (e) {
      push("mobile_fuel", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.on_road_gasoline) {
    const spa = spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile);
    try {
      const api = await postCalc(token, "/api/v1/calc/epa/on-road-gasoline", {
        distance: c.distance,
        distance_unit: c.distance_unit,
        ch4_g_per_mile: c.ch4_g_per_mile,
        emission_selection: "ch4_only",
      });
      push("on_road_gasoline", c.id, spa, api);
    } catch (e) {
      push("on_road_gasoline", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.on_road_diesel) {
    const spa = spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile);
    try {
      const api = await postCalc(token, "/api/v1/calc/epa/on-road-diesel", {
        distance: c.distance,
        distance_unit: c.distance_unit,
        ch4_g_per_mile: c.ch4_g_per_mile,
        emission_selection: "ch4",
      });
      push("on_road_diesel", c.id, spa, api);
    } catch (e) {
      push("on_road_diesel", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.non_road) {
    const spa = spaNonRoad(c.quantity, c.unit, c.ch4_g_per_gallon);
    try {
      const api = await postCalc(token, "/api/v1/calc/epa/non-road", {
        quantity: c.quantity,
        unit: c.unit,
        ch4_g_per_gallon: c.ch4_g_per_gallon,
        emission_selection: "ch4",
      });
      push("non_road", c.id, spa, api);
    } catch (e) {
      push("non_road", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.heat_steam) {
    const spa = spaHeatSteam(c);
    try {
      const api = await postCalc(token, "/api/v1/calc/heat-steam", {
        quantity: c.quantity,
        gas: c.gas,
        quantity_unit: c.quantity_unit ?? "base",
        co2_factor: c.co2_factor,
        ch4_factor: c.ch4_factor,
        n2o_factor: c.n2o_factor,
        standard: "uk",
      });
      push("heat_steam", c.id, spa, api);
    } catch (e) {
      push("heat_steam", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.waste) {
    const spa = spaWaste(c.volume, c.factor);
    try {
      const api = await postCalc(token, "/api/v1/calc/waste", {
        volume: c.volume,
        disposal_method: c.disposal_method,
        factor: c.factor,
      });
      push("waste", c.id, spa, api);
    } catch (e) {
      push("waste", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.uk_passenger) {
    const spa = spaUkMultiply(c.distance, c.factor);
    try {
      const api = await postCalc(token, "/api/v1/calc/uk/passenger", {
        distance: c.distance,
        factor: c.factor,
      });
      push("uk_passenger", c.id, spa, api);
    } catch (e) {
      push("uk_passenger", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.uk_delivery) {
    const spa = spaUkMultiply(c.distance, c.factor);
    try {
      const api = await postCalc(token, "/api/v1/calc/uk/delivery", {
        distance: c.distance,
        factor: c.factor,
      });
      push("uk_delivery", c.id, spa, api);
    } catch (e) {
      push("uk_delivery", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.uk_refrigerant) {
    const spa = spaUkMultiply(c.quantity, c.factor);
    try {
      const api = await postCalc(token, "/api/v1/calc/uk/refrigerant", {
        quantity: c.quantity,
        factor: c.factor,
      });
      push("uk_refrigerant", c.id, spa, api);
    } catch (e) {
      push("uk_refrigerant", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.electricity) {
    const spa = spaElectricity(c);
    try {
      const api = await postCalc(token, "/api/v1/calc/electricity", {
        total_kwh: c.total_kwh,
        grid_pct: c.grid_pct,
        grid_factor: c.grid_factor,
        other_pct: c.other_pct,
        other_row_emissions_sum: c.other_row_emissions_sum,
      });
      push("electricity", c.id, spa, api);
    } catch (e) {
      push("electricity", c.id, spa, null, String(e));
    }
  }

  for (const c of cases.epa_refrigerant) {
    const spaRes = spaEpaRefrigerant(c);
    const spa = spaRes?.emissions_kg ?? NaN;
    try {
      const api = await postCalc(token, "/api/v1/calc/epa/refrigerant", {
        method: c.method,
        gwp: c.gwp,
        leakage_kg: c.leakage_kg,
        charge_kg: c.charge_kg,
        leakage_rate_percent: c.leakage_rate_percent,
      });
      push("epa_refrigerant", c.id, spa, api);
    } catch (e) {
      push("epa_refrigerant", c.id, spa, null, String(e));
    }
  }

  const failed = rows.filter((r) => !r.ok);
  console.log("\n=== SPA ↔ API parity ===\n");
  console.log(`Backend: ${BASE}`);
  console.log(`Cases: ${rows.length}  OK: ${rows.length - failed.length}  FAIL: ${failed.length}\n`);

  for (const r of rows) {
    const mark = r.ok ? "PASS" : "FAIL";
    const apiStr = r.api == null ? "—" : String(r.api);
    console.log(
      `${mark}  ${r.suite}/${r.id}  spa=${r.spa}  api=${apiStr}${r.error ? `  (${r.error})` : ""}`
    );
  }

  if (failed.length) {
    console.error(`\n${failed.length} parity mismatch(es). Do not change formulas — investigate the port.`);
    process.exit(1);
  }
  console.log("\nAll SPA vs API cases match (approx 1e-9).");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
