export type ReservesProductType = "Crude oil" | "Natural gas" | "NGL";

export type ReservesUnit = "Mmbbl" | "Bcf" | "MMBOE";

export const RESERVES_PRODUCT_TYPES: ReservesProductType[] = ["Crude oil", "Natural gas", "NGL"];

export const RESERVES_UNITS: ReservesUnit[] = ["Mmbbl", "Bcf", "MMBOE"];

export const RESERVES_PRODUCT_TYPE_LABELS: Record<ReservesProductType, string> = {
  "Crude oil": "Crude oil",
  "Natural gas": "Natural gas",
  NGL: "NGL",
};

export type ReservesByCountryRow = {
  id: string;
  country: string;
  productType: ReservesProductType;
  provedReserves1P: string;
  unit: ReservesUnit;
  carbonRegulated: boolean;
};

export type ReservesAssetData = {
  /** RES-01 — Proved reserves crude oil (Mmbbl) */
  provedReservesCrudeOilMmbbl: string;
  /** RES-02 — Proved reserves natural gas (Bcf) */
  provedReservesNaturalGasBcf: string;
  /** RES-03 — Proved reserves NGL (Mmbbl) */
  provedReservesNglMmbbl: string;
  /** RES-04 — Reserves by country */
  reservesByCountry: ReservesByCountryRow[];
  /** RES-05 — Internal carbon price ($/tCO2) */
  internalCarbonPricePerTco2: string;
  /** RES-06 — IEA scenario carbon prices ($/tCO2) */
  ieaStepsPricePerTco2: string;
  ieaApsPricePerTco2: string;
  ieaNzePricePerTco2: string;
  /** RES-07 — % capex allocated to low-carbon */
  pctCapexLowCarbon: string;
  /** RES-08 — TCFD narrative fields */
  tcfdPhysicalRisks: string;
  tcfdTransitionRisks: string;
  tcfdOpportunities: string;
  tcfdStrategyResilience: string;
};

export type ReservesStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, ReservesAssetData>;
};
